# AI/ML Technical Depth

> **Judge Criticism:** *"The fraud signals and agent design are relevant, but model details and evaluation results are not clearly demonstrated."*

This document provides complete technical specifications for every AI/ML component in Autonomous SecureAssist MFS, including model architecture, feature engineering, evaluation methodology, and the LangGraph agent pipeline.

---

## Table of Contents

- [1. Fraud Detection Model — XGBoost via ONNX](#1-fraud-detection-model--xgboost-via-onnx)
- [2. Feature Engineering Pipeline](#2-feature-engineering-pipeline)
- [3. Model Inference & Runtime](#3-model-inference--runtime)
- [4. Model Evaluation & Validation](#4-model-evaluation--validation)
- [5. Reason Code Explainability](#5-reason-code-explainability)
- [6. LangGraph AI Support Agent](#6-langgraph-ai-support-agent)
- [7. Model Lifecycle & Hot-Reload](#7-model-lifecycle--hot-reload)

---

## 1. Fraud Detection Model — XGBoost via ONNX

### Model Architecture

| Property | Value |
|----------|-------|
| **Algorithm** | XGBoost (Gradient Boosted Decision Trees) |
| **Serialization** | ONNX format via `onnxmltools` |
| **Model File Size** | 130,723 bytes (~127 KB) |
| **Input Dimension** | 64 features (Float32Array) |
| **Output** | Binary probabilities `[P(legit), P(fraud)]` |
| **Inference Runtime** | ONNX Runtime for Node.js (`onnxruntime-node`) |
| **Target Latency** | Sub-100ms per inference |

### Why XGBoost?

1. **Interpretability** — Tree-based models produce feature importance scores that map directly to reason codes, enabling explainable fraud decisions customers can understand.
2. **Tabular Data Performance** — XGBoost consistently outperforms deep learning on structured/tabular data with mixed feature types (categorical, boolean, continuous).
3. **Low Latency** — Tree traversal is inherently fast; a 127KB ONNX model achieves single-digit millisecond inference, critical for real-time transaction scoring.
4. **Production Maturity** — XGBoost + ONNX Runtime is a battle-tested stack used by major fintech companies for real-time fraud scoring.

### Decision Thresholds

The model outputs a continuous fraud probability `[0.0, 1.0]`. The decision is computed by `bandDecision()` ([`band-decision.ts`](../server/fraud_detector/src/v1/modules/rda/utils/band-decision.ts)):

```typescript
function bandDecision(score: number, threshold: number, reviewThreshold: number | null): MlDecision {
  if (score >= threshold) return Decision.DECLINE;
  if (reviewThreshold !== null && score >= reviewThreshold) return Decision.REVIEW;
  return Decision.ACCEPT;
}
```

| Parameter | Default Value | Description |
|-----------|--------------|-------------|
| `FRAUD_THRESHOLD` (decline) | `0.65` | Scores ≥ 0.65 → DECLINE (block transaction) |
| `reviewThreshold` | Configurable per-segment | Scores between review and decline thresholds → REVIEW (execute but flag) |

### Calibration Support

The model supports **isotonic calibration** ([`calibration.ts`](../server/fraud_detector/src/shared/onnx/calibration.ts)) with three modes:

| Mode | Behavior |
|------|----------|
| `OBSERVE` | Log calibrated scores alongside raw scores without using them for decisions |
| `ENFORCE` | Use calibrated scores for threshold comparison |
| `OFF` | Serve raw model scores only |

Calibration artifacts (breakpoint arrays `xThresholds`, `yProbabilities`) travel with each model version directory and are loaded automatically on model swap.

---

## 2. Feature Engineering Pipeline

### 64-Feature Catalogue

The model consumes a **64-dimensional Float32 vector**, defined in [`feature-catalog.v1.json`](../server/fraud_detector/models/feature-catalog.v1.json). Features are organized into 8 categories:

#### Category Breakdown

| Category | Feature Count | Index Range | Source | Description |
|----------|:---:|:-----------:|--------|-------------|
| **Velocity** | 12 | 0–11 | `paa:redis` | Transaction frequency and amount statistics across 6 time windows (1min → 7days) |
| **Pair** | 6 | 12–17 | `paa:redis` / `rda:derived` | Sender-receiver relationship features (first send, prior count, round-trips) |
| **Graph** | 8 | 18–25 | `paa:redis` | Network topology features from the transaction graph (PageRank, clustering, community) |
| **Transaction** | 8 | 26–33 | `rda:request` / `rda:derived` | Current transaction properties (amount, type, channel, z-score) |
| **Identity** | 6 | 34–39 | `rda:derived` / `rda:request` | Sender identity signals (account age, KYC status, authentication) |
| **Receiver** | 6 | 40–45 | `rda:derived` / `paa:redis` | Receiver risk profile (KYC, same FI, dispute rate, lifetime tx count) |
| **Geographic** | 6 | 46–51 | `rda:derived` | Location-based signals (Haversine distance, IP mismatch, country risk band) |
| **Device** | 6 | 52–57 | `rda:request` / `rda:derived` | Device and session signals (VPN, trusted device, agent-assisted, session duration) |
| **Calendar** | 6 | 58–63 | `rda:derived` / `paa:redis` | Temporal patterns (hour of day, weekend, off-hours, payday window, deviation from norm) |

#### Key Feature Details

**Velocity Features (0–11)** — Computed by the Post-Action Analyzer (PAA) in real-time:
- `velocity_1m` through `velocity_7d`: Transaction counts across 6 sliding windows
- `amount_mean_24h`, `amount_max_24h`: Short-term amount statistics
- `amount_mean_30d`, `amount_std_30d`: Long-term baseline for deviation detection
- `unique_receivers_24h`, `unique_receivers_7d`: Fan-out detection

**Graph Features (18–25)** — Computed by GraphService using the `graphology` library:
- `graph_pagerank`: Centrality score (PageRank with damping α=0.85, 100 iterations, tolerance 1e-6)
- `graph_clustering_coef`: Local clustering coefficient (triangle-based)
- `graph_community_id`: Louvain community detection label
- `graph_shortest_path_to_fraud`: BFS shortest path to any known-fraud node (depth ≤ 4, capped at 99)
- `graph_is_hub`: Top 0.1% of out-degree (money mule indicator)
- `graph_neighborhood_fraud_rate`: Fraction of 1-hop receivers flagged

**Derived Features** — Computed at request time by the feature builder:
- `amount_zscore_vs_sender`: `(amount - mean_30d) / std_30d` — how anomalous is this amount for this sender
- `pair_amount_ratio_to_pair_mean`: Current amount / pair's 30-day mean — pair-specific anomaly
- Geographic features use Haversine distance formula for lat/lng comparisons
- Calendar features use circular mean (atan2-based) for hour deviation from sender's norm

### Feature Resolution Architecture

```
                 ┌─────────────────────────────────────────────┐
                 │              Feature Builder                │
                 │         (feature-builder.ts)                │
                 │                                             │
                 │   For each of 64 catalogue entries:         │
                 │                                             │
                 │   ┌──────────┐  ┌───────────┐  ┌────────┐  │
                 │   │ paa:redis │  │rda:request│  │rda:     │  │
                 │   │          │  │           │  │derived  │  │
                 │   │ Redis    │  │ HTTP POST │  │ Computed│  │
                 │   │ HGETALL  │  │ body      │  │ at      │  │
                 │   │ pipeline │  │ fields    │  │ request │  │
                 │   └────┬─────┘  └─────┬─────┘  └────┬────┘  │
                 │        │              │              │       │
                 │        └──────────────┼──────────────┘       │
                 │                       │                      │
                 │              Float32Array(64)                │
                 └───────────────────────┼──────────────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │  ONNX Runtime    │
                              │  Session Pool    │
                              │  (XGBoost model) │
                              └──────────────────┘
```

### Redis Feature Store

Features are stored in Redis as hash maps, fetched via a single pipelined round-trip ([`feature.service.ts`](../server/fraud_detector/src/v1/modules/rda/services/feature.service.ts)):

```
Pipeline:
  HGETALL features:{senderId}                    → sender velocity + graph features
  HGETALL features:pair:{senderId}:{receiverId}  → pair-specific features
  HGETALL features:{receiverId}                  → recipient_* fields only
```

**Circuit Breaker Protection:** Redis reads are wrapped in an `opossum` circuit breaker. On failure, population-average defaults are used so transactions aren't blocked by infrastructure issues.

---

## 3. Model Inference & Runtime

### ONNX Session Pool

The ONNX Runtime serializes concurrent `session.run()` calls at the session level. To avoid this bottleneck, we maintain a **pool of identical ONNX InferenceSession instances** with round-robin selection ([`onnx.service.ts`](../server/fraud_detector/src/shared/onnx/onnx.service.ts)):

| Parameter | Default | Description |
|-----------|---------|-------------|
| Pool Size | `ceil(CPUs / 2)`, max 8 | Number of parallel ONNX sessions |
| Intra-Op Threads | 1 per session | Tree traversal is single-threaded |
| Execution Mode | Sequential | Optimal for small XGBoost models |
| Graph Optimization | All | ONNX Runtime applies all graph optimizations |

### Inference Pipeline Stages

Every `/v1/predict` request is timed at each stage via Prometheus histograms:

```
┌──────────────────────────────────────────────────────────────┐
│ Stage              │ What Happens                            │
├────────────────────┼─────────────────────────────────────────┤
│ resolve_model      │ Resolve champion/shadow by segment      │
│ pre_rules_req_only │ Evaluate request-only PRE rules         │
│ feature_load       │ Redis pipeline + feature building       │
│ pre_rules          │ Full PRE rule evaluation with features  │
│ inference          │ ONNX session.run() with Float32Array    │
│ reason_codes       │ Top-N feature contribution analysis     │
│ post_rules         │ POST rule evaluation with ML score      │
│ audit_enqueue      │ Write audit record (async or sync)      │
│ shadow_inference   │ Optional shadow model scoring (async)   │
└──────────────────────────────────────────────────────────────┘
```

### Circuit Breaker Protection

Two independent circuit breakers protect the inference path:

| Breaker | Target | Timeout | Error Threshold | Fallback |
|---------|--------|---------|-----------------|----------|
| `redis-features` | Redis feature reads | Configurable | Configurable | Population-average defaults |
| `onnx-inference` | ONNX model inference | Configurable | Configurable | Score = 1.0, `degraded = true` |

The `degraded` flag propagates through the entire decision path so audit logs can distinguish "the model scored 1.0" from "inference never ran."

---

## 4. Model Evaluation & Validation

### Startup Calibration Probe

On every model load (initial boot or hot-swap), the system runs an automated **calibration probe** that validates the model before accepting traffic:

#### Test 1 — Determinism Check
```
Run identical "clearly legit" input twice → scores must match within ε = 1e-4
Run identical "clearly fraud" input twice → scores must match within ε = 1e-4
```
**Purpose:** Catches the failure mode where the ONNX session isn't loaded and the system silently falls back to random mock scores.

#### Test 2 — Discrimination Check
```
Score("clearly legit" vector) vs Score("clearly fraud" vector)
Gap must be ≥ 0.15
```
**Purpose:** Catches models that are constant or near-constant due to training misconfiguration (feature-ordering bugs, label leaks, wrong loss function).

**Probe Vectors:**

| Feature | Legit Vector | Fraud Vector |
|---------|:---:|:---:|
| `amount` | 42.5 | 850,000 |
| `account_age_days` | 730 | 1 |
| `is_authenticated` | 1 | 0 |
| `ip_is_vpn` | 0 | 1 |
| `device_is_trusted` | 1 | 0 |
| `session_to_txn_seconds` | 180 | 1 |

**Failure behavior:** If either test fails, `isReady()` returns `false`, and the `/readyz` health endpoint returns DOWN — the service refuses traffic until a working model is loaded.

### Context Sensitivity Probe

A second probe checks whether the model is over-reliant on optional integration-context fields:

```
Score(same transaction, context fields absent) vs Score(same transaction, context fields present)
Warning if gap > 0.50
```

This warns operators when bare-payload integrators (who send only required fields) would receive near-blanket declines while contextual fraud scores low.

### Shadow Model Scoring

The system supports **shadow model evaluation** for safe model comparison:

- A shadow model (candidate) can be loaded alongside the champion (production)
- Shadow scoring is fire-and-forget: it never affects the decision
- Shadow scores are recorded in the audit trail for offline A/B comparison
- Configurable sample rate (`shadowSampleRate`) controls what fraction of requests get shadow-scored
- Shadow pool is capped at 2 sessions to limit memory overhead

---

## 5. Reason Code Explainability

### Approach

Every fraud decision includes human-readable **reason codes** explaining why the model flagged the transaction. The system uses a lightweight, deterministic **feature-contribution analysis** ([`reason-codes.ts`](../server/fraud_detector/src/shared/onnx/reason-codes.ts)):

```
contribution = weight × tanh((value - baseline) / scale)
```

This is intentionally simpler than SHAP (which runs per-prediction) — on the hot path, every microsecond counts.

### Feature Contribution Specs

| Feature | Code | Baseline | Weight | Description |
|---------|------|:--------:|:------:|-------------|
| `amount` | `AMOUNT_HIGH` | 100 | +0.35 | Transaction amount relative to typical range |
| `velocity_1h` | `VELOCITY_1H` | 1 | +0.30 | Transactions in the last hour above baseline |
| `velocity_24h` | `VELOCITY_24H` | 5 | +0.25 | Transactions in the last 24 hours |
| `graph_pagerank` | `PAGERANK` | 0.001 | -0.20 | Network centrality (higher = more established) |
| `graph_clustering_coef` | `CLUSTERING_COEF` | 0.4 | -0.15 | Peer clustering (higher = more connected) |
| `velocity_7d` | `VELOCITY_7D` | 20 | +0.10 | Transactions in the last 7 days |
| `amount_std_30d` | `STD_AMOUNT_30D` | 50 | +0.10 | Variance of recent amounts |
| `pair_time_since_last_send` | `TIME_SINCE_LAST` | 3600 | +0.10 | Seconds since last send to this receiver |

### Model-Weighted Reason Codes

When the deployed model includes **feature importance metadata** (normalized gain importances from XGBoost), the system automatically replaces the hand-set weight magnitudes while preserving the direction (sign). This means reason codes reflect the actual model's feature importance, not just heuristics:

```typescript
weight = Math.sign(specWeight) × normalizedImportance
```

The `basis` field in each reason code indicates whether it uses `HEURISTIC` (default weights) or `MODEL_WEIGHTED` (from the deployed model's importances).

---

## 6. LangGraph AI Support Agent

### Architecture

The support agent is a 3-node **LangGraph state graph** ([`graph.ts`](../server/src/ai/graph.ts)):

```
START → [classifyNode] → [retrieveNode] → [respondNode] → END
```

Each node reads from and writes to a typed state annotation (`SupportState`).

### Node 1 — Intent Classification

| Property | Detail |
|----------|--------|
| **Input** | Customer message (string) |
| **Output** | One of 7 intent categories |
| **Model** | Same LLM as response generation (Groq / Gemini / OpenRouter) |
| **Temperature** | 0.3 (low for consistent classification) |
| **Fallback** | Defaults to `general` on parse failure or LLM error |

**Intent Taxonomy:**

| Intent | Trigger Examples |
|--------|-----------------|
| `payment_failure` | "My payment failed", "Transaction declined" |
| `fraud_inquiry` | "Why was my transfer blocked?", "Security hold" |
| `wrong_recipient` | "Sent money to wrong number" |
| `balance_inquiry` | "Where is my money?", "Wrong balance" |
| `account_issue` | "Can't login", "Account blocked" |
| `cashout` | "ATM didn't give cash", "Agent problem" |
| `general` | "What are the fees?", "Transaction limits" |

### Node 2 — Context Retrieval (RAG)

Three parallel data lookups are executed simultaneously via `Promise.all`:

```typescript
const [userInfo, recentTx] = await Promise.all([
  getUserInfo(state.phone),           // PostgreSQL: customer profile + balance
  getRecentTransactions(state.phone, 5),  // PostgreSQL: last 5 transactions
]);
const knowledge = searchKnowledge(state.intent, state.message);  // In-memory knowledge base
```

For `fraud_inquiry` intents, an additional lookup fetches actual fraud decision data:
```typescript
const fraudStatus = await getFraudStatus(state.phone);
// Returns: "Flagged/blocked transactions for {phone}:\n• TX-123: ৳50,000 to ... — DECLINE (Reasons: ...)"
```

**Knowledge Base Retrieval** — Two-stage search ([`knowledge.ts`](../server/src/ai/knowledge.ts)):
1. **Exact category match** → Return articles matching the classified intent
2. **Keyword overlap scoring** → Fall back to BM25-style keyword matching, return top 2

### Node 3 — Response Generation

The LLM receives a rich system prompt containing:
- Customer profile (name, phone, balance)
- Last 5 transactions (with IDs, amounts, dates, status)
- Matched knowledge base articles (resolution procedures)
- Conversation history (last 6 messages for multi-turn context)
- Fraud context (if fraud_inquiry: actual decision data, reason codes)

**Generation Constraints:**
- Reference real transaction IDs from the context
- Translate technical fraud codes to plain language
- Never reveal exact fraud scores
- Keep responses under 150 words
- Recommend specific follow-up actions

### Multi-LLM Provider Support

| Provider | Model | Latency Profile |
|----------|-------|:---------------:|
| Groq | `openai/gpt-oss-20b` | Ultra-fast (hardware-optimized inference) |
| Google Gemini | `gemini-2.0-flash` | Fast (optimized Flash model) |
| OpenRouter | `meta-llama/llama-3.3-70b-instruct` | Variable (depends on route) |

All providers use `temperature: 0.3` and `maxTokens: 1024` for consistent, focused responses.

---

## 7. Model Lifecycle & Hot-Reload

### Champion/Shadow Model Registry

The system supports **live model swaps without restart**:

1. **ModelRegistryService** tracks ACTIVE (champion) and SHADOW model versions in the database
2. **OnnxService** subscribes to registry change events via `onActiveChange` / `onShadowChange`
3. On version change:
   - Validate feature schema compatibility (prevents silent column misalignment)
   - Load new ONNX model from `sourceUri`
   - Atomic session pool swap (in-flight requests see old or new, never partial)
   - Re-run calibration probe and context sensitivity probe
   - Load version-specific calibration artifacts and reason-code weights

### Feature Schema Validation

```typescript
if (metadata.feature_schema_version !== loadCatalog().schemaVersion) {
  throw new Error(`Feature schema mismatch: model trained against '${reported}', catalogue is '${expected}'`);
}
```

This prevents loading a model trained against a different feature contract — silently misaligning input columns is a common production failure mode.

### Adopter Feature Extension

The feature catalogue supports extension beyond the base 64 features via `feature-catalog.adopter.json`. Adopter features (indices 64+) use a compute-op executor that supports:
- Custom derived computations
- Boolean composition (`bool_and`, `bool_or`) across prior features
- Lookup tables for categorical encoding
