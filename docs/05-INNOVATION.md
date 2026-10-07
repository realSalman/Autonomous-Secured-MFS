# Innovation & Technical Novelty

> **Judge Criticism:** *"Combining fraud scoring and automated support is useful, though the overall approach is fairly conventional."*

This document highlights the unconventional technical decisions and innovations in Autonomous SecureAssist MFS that go beyond standard fraud detection and chatbot implementations.

---

## Table of Contents

- [1. Novel Contribution — Unified Fraud + Support Loop](#1-novel-contribution--unified-fraud--support-loop)
- [2. Graph-Based Fraud Detection with Real-Time Updates](#2-graph-based-fraud-detection-with-real-time-updates)
- [3. Multi-Stage Decision Pipeline](#3-multi-stage-decision-pipeline)
- [4. Model Self-Validation System](#4-model-self-validation-system)
- [5. Shadow Model A/B Infrastructure](#5-shadow-model-ab-infrastructure)
- [6. Feature Catalogue Architecture](#6-feature-catalogue-architecture)
- [7. LangGraph Agent with Live Fraud Context](#7-langgraph-agent-with-live-fraud-context)

---

## 1. Novel Contribution — Unified Fraud + Support Loop

### What's Conventional

Fraud detection and customer support are typically **separate products** from **separate vendors**:

```
Conventional Architecture:
  Transaction → Fraud Vendor API → Block/Allow
  Customer → "Why is my transfer blocked?" → Support Chatbot → "I don't know, please wait"
```

### What's Novel

We close the loop between fraud decisions and customer support in a single system:

```
Our Architecture:
  Transaction → ML Scoring → DECLINE
       │                         │
       │                    ┌────▼─────────────────────┐
       │                    │ Auto-create support ticket │
       │                    │ with fraud context          │
       │                    └────┬─────────────────────┘
       │                         │
       │                    ┌────▼─────────────────────┐
       │                    │ Customer asks "why?"      │
       │                    │        ↓                   │
       │                    │ LangGraph Agent READS:     │
       │                    │ • Actual fraud decision    │
       │                    │ • Actual reason codes      │
       │                    │ • Actual fraud score       │
       │                    │        ↓                   │
       │                    │ Generates personalized     │
       │                    │ explanation with REAL data  │
       │                    └──────────────────────────┘
```

**This means:**
- When a customer asks "why was my transfer blocked?", the AI knows **exactly why** — because it reads the same fraud decision that blocked the transaction
- The AI translates `VELOCITY_1H` into "unusual number of transfers in a short time"
- No separate vendor integration, no data silos, no "please contact another department"
- The support ticket is auto-created BEFORE the customer even contacts support

### Technical Implementation

The webhook handler ([`ojuri-webhooks.ts`](../server/src/routes/ojuri-webhooks.ts)) auto-creates tickets with full fraud context:

```typescript
// On DECLINE or REVIEW, auto-create a support ticket
const messages: IMessage[] = [{
  role: 'ai',
  content: `⚠️ Transaction ${data.transactionId} was blocked by our fraud detection system.
    Amount: ৳${Number(tx.amount).toLocaleString()}
    Fraud Score: ${(data.championScore * 100).toFixed(1)}%
    Reasons: ${reasonSummary}
    This ticket was auto-created for investigation.`,
  timestamp: new Date(),
}];
```

The AI agent then reads this context via `getFraudStatus()` when the customer asks a fraud-related question:

```typescript
// tools.ts — fetches actual fraud decisions for this customer
const flaggedTx = await db.select().from(transactions)
  .where(sql`fraud_decision IS NOT NULL AND fraud_decision != 'ACCEPT'`)
  .limit(5);
// Returns: "• TX-123: ৳50,000 → DECLINE (Reasons: unusual velocity, high amount)"
```

---

## 2. Graph-Based Fraud Detection with Real-Time Updates

### What's Conventional

Most fraud systems use **velocity counters** (how many transactions per time window). Advanced systems add **batch graph analysis** (run overnight on transaction history).

### What's Novel

Our system maintains a **live, incrementally-updated transaction graph** in the Post-Action Analyzer (PAA), computing graph features in near-real-time for every transaction:

```
Every transaction event → PAA:
  1. Add sender ↔ receiver edge to directed graph (graphology)
  2. Update node attributes (firstSeen, lastSeen, totalAmount)
  3. If closing a directed triangle → mark as dirty
  4. Periodically recompute:
     - PageRank (α=0.85, 100 iterations, tolerance 1e-6)
     - Louvain community detection
     - Local clustering coefficients
     - Hub detection (top 0.1% out-degree)
     - BFS shortest-path-to-known-fraud
     - Neighborhood fraud rate
  5. Write updated features to Redis → available for next transaction
```

### Novel Graph Features

| Feature | Innovation |
|---------|-----------|
| `graph_shortest_path_to_fraud` | BFS from sender to any known-fraud node (depth ≤ 4). This catches mule networks: even if the sender looks clean, being 2 hops from a known fraudster is a strong signal. |
| `graph_neighborhood_fraud_rate` | Fraction of sender's 1-hop receivers that have been flagged. Detects accounts used as intermediaries. |
| `graph_is_hub` | Top 0.1% of out-degree with an absolute floor. Money mule accounts typically have very high fan-out. |
| Triangle-triggered recompute | Instead of recomputing on a fixed schedule, the graph detects when a new edge closes a directed triangle (3-cycle) and triggers a recompute — triangles are strong signals in transaction graphs. |

### Adaptive Recompute Strategy

```typescript
private shouldUpdatePagerank(): boolean {
  // Time-based: recompute every N seconds
  if (timeSinceLastUpdate > this.updateInterval) return true;
  // Volume-based: every 100 transactions (with time gate)
  if (this.transactionCount % 100 === 0 && timeSinceLastUpdate >= this.recomputeMinIntervalMs) return true;
  // Triangle-triggered: new triangle formed (with time gate)
  if (this.dirtyTriangleCount > 0 && timeSinceLastUpdate >= this.triangleRecomputeMinIntervalMs) return true;
  return false;
}
```

This adaptive approach avoids both:
- Wasting CPU on recomputes when nothing changed
- Missing structural changes in the graph during high-traffic periods

---

## 3. Multi-Stage Decision Pipeline

### What's Conventional

Most fraud systems: `features → model → threshold → decision`

### What's Novel

Our pipeline has **5 decision stages**, each of which can short-circuit or override:

```
Request → PRE Rules (Request-Only) → Feature Loading → PRE Rules (Full)
    → ML Inference → POST Rules → Final Decision
```

| Stage | Can Produce | Short-Circuit? | Purpose |
|-------|-------------|:--------------:|---------|
| PRE Rules (request-only) | DECLINE | ✅ Yes — skips feature loading | Block sanctioned countries, known fraud accounts. Saves Redis round-trip. |
| Feature Loading | — | No | Redis pipeline for 64-feature vector |
| PRE Rules (with features) | DECLINE | ✅ Yes — skips ML inference | Velocity-based hard rules that don't need ML |
| ML Inference | ACCEPT/REVIEW/DECLINE | No | XGBoost scoring via ONNX |
| POST Rules | Override any decision | No | Business logic overrides (VIP whitelist, etc.) |

**Why this matters:** A sanctioned-country check in PRE rules fires in < 1ms and doesn't waste a Redis + ONNX round-trip. The pipeline separates "can we decide without ML?" from "what does ML think?" from "does business logic override ML?"

The `DecisionSource` enum tracks which stage made the final call:

```typescript
enum DecisionSource {
  ML = 'ML',                        // Model decided
  PRE_RULE = 'PRE_RULE',           // Rule decided before ML
  POST_RULE = 'POST_RULE',         // Rule overrode ML
  BREAKER_FALLBACK = 'BREAKER_FALLBACK',  // Infrastructure issue
}
```

---

## 4. Model Self-Validation System

### What's Conventional

Load model → serve predictions. If the model is broken, you find out from customer complaints.

### What's Novel

On every model load (boot or hot-swap), the system runs **automated model validation probes** before accepting traffic:

#### Calibration Probe

```
1. Build "clearly legit" feature vector:   amount=42.5, account_age=730d, authenticated=true
2. Build "clearly fraud" feature vector:   amount=850K, account_age=1d, VPN=true
3. Score both vectors twice
4. Check DETERMINISM: identical inputs → identical scores (ε < 1e-4)
5. Check DISCRIMINATION: fraud_score - legit_score ≥ 0.15
```

**What this catches:**
- Mock/random fallback masquerading as real inference
- Constant or degenerate models from training failures
- Feature dimension mismatches (model trained on different schema)

#### Context Sensitivity Probe

```
1. Build same transaction with context fields PRESENT (channel, currency, auth, device trust)
2. Build same transaction with context fields ABSENT (bare minimum payload)
3. Score both
4. WARN if gap > 0.50
```

**What this catches:** Models that learned to use `is_authenticated` and `device_is_trusted` as shortcuts — causing bare-payload integrators to get blanket declines.

**Both probes gate the `/readyz` health endpoint.** If either fails, the service reports DOWN and won't receive traffic.

---

## 5. Shadow Model A/B Infrastructure

### What's Conventional

To test a new model, deploy it, watch for problems, roll back if needed.

### What's Novel

The system supports **live shadow model scoring** alongside the champion:

```
                    ┌─────────────┐
                    │  Champion   │ ← Makes the actual decision
      Feature  ──→ │  Sessions   │ → Decision (ACCEPT/REVIEW/DECLINE)
      Vector       │  (pool)     │
                    └─────────────┘
                    
                    ┌─────────────┐
                    │  Shadow     │ ← Observational only, never affects decision
              ──→  │  Sessions   │ → Score recorded in audit trail
                    │  (pool≤2)  │
                    └─────────────┘
```

**Key properties:**
- Shadow scoring is **fire-and-forget** — it never blocks the response
- Shadow scores are recorded in the audit record for offline analysis
- Configurable sample rate (`shadowSampleRate`) — score 10% of traffic, not all
- Shadow pool is smaller (max 2 sessions) to limit memory overhead
- Shadow failures are silently swallowed — they never affect the decision path
- Feature schema validation prevents loading a shadow trained on a different catalogue

This lets operators compare two models on live traffic **without any risk to production**.

---

## 6. Feature Catalogue Architecture

### What's Conventional

Hard-code feature positions in the model and the serving code. Pray they stay in sync.

### What's Novel

The system uses a **declarative feature catalogue** (`feature-catalog.v1.json`) that is the single source of truth for:

1. **Feature ordering** — the catalogue `index` determines the vector position
2. **Feature resolution** — `source` field tells the builder where to get the value (`paa:redis`, `rda:request`, `rda:derived`)
3. **Default values** — catalogue `default` is used when data is missing
4. **Type safety** — `dtype` enforces the correct encoding (float32, uint8, bool)
5. **Reason code mapping** — reason code specs reference features by NAME, not index
6. **Schema versioning** — model metadata declares which catalogue version it was trained against

```json
{
  "version": "v1",
  "input_dimension": 64,
  "features": [
    {
      "index": 0,
      "name": "velocity_1m",
      "category": "velocity",
      "source": "paa:redis",
      "dtype": "float32",
      "default": 0,
      "description": "Sender transactions in the last minute"
    }
  ]
}
```

### Adopter Extension

Operators can extend the catalogue with custom features (indices 64+) via `feature-catalog.adopter.json`. Adopter features support compute-ops (`bool_and`, `bool_or`, custom derivations) that compose on top of base features.

This means:
- The model and serving code can **never** get out of sync on feature ordering
- Adding a new feature is a config change + model retrain, not a code change
- Schema validation at model load prevents misaligned deployments

---

## 7. LangGraph Agent with Live Fraud Context

### What's Conventional

Chatbots: "I'm sorry you're experiencing this. Have you tried logging out and back in?"

### What's Novel

Our LangGraph agent performs **live data retrieval** before generating each response, with **parallel database lookups** and **fraud-specific context injection**:

```typescript
// Node 2 — Retrieve Context (runs 3 lookups in parallel)
const [userInfo, recentTx] = await Promise.all([
  getUserInfo(state.phone),           // Real customer profile
  getRecentTransactions(state.phone, 5),  // Real transaction history
]);

// For fraud inquiries: additionally fetch actual fraud decision data
if (state.intent === 'fraud_inquiry') {
  const fraudStatus = await getFraudStatus(state.phone);
  // Returns the actual DECLINE/REVIEW decisions with reason codes
}
```

**What this enables:**

| Customer Question | Conventional Chatbot | Our Agent |
|-------------------|---------------------|-----------|
| "Why was my transfer blocked?" | "Please contact our fraud team" | "Your transfer of ৳15,000 to 01712345678 was flagged because of unusual transaction velocity. A fraud analyst will review within 24 hours." |
| "What's my balance?" | "Check the app" | "Your current balance is ৳23,450. Your last transaction was ৳5,000 to 01798765432 on Oct 5th." |
| "I sent money to the wrong number" | "File a complaint" | "I see TX-1728289344-a3f1e2 for ৳2,000 sent to 01756789012. Since this was completed 2 hours ago, I'll submit a reversal request — it typically takes 24-48 hours." |

The agent references **real transaction IDs**, **real amounts**, **real balances**, and **real fraud decisions** — not templates or guesses.
