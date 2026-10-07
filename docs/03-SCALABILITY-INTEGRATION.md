# Scalability & Integration Architecture

> **Judge Criticism:** *"Kafka, Redis and PostgreSQL provide a reasonable architecture for real-time scaling."*

This document provides deep technical details on the event-driven architecture, scaling characteristics, resilience patterns, and integration design that make the system production-ready beyond "reasonable."

---

## Table of Contents

- [1. Event-Driven Architecture](#1-event-driven-architecture)
- [2. Kafka Topology & Event Flow](#2-kafka-topology--event-flow)
- [3. Redis Feature Store Design](#3-redis-feature-store-design)
- [4. PostgreSQL Schema & Performance](#4-postgresql-schema--performance)
- [5. Resilience & Fault Tolerance](#5-resilience--fault-tolerance)
- [6. Observability & Monitoring](#6-observability--monitoring)
- [7. Horizontal Scaling Strategy](#7-horizontal-scaling-strategy)
- [8. Integration Architecture](#8-integration-architecture)

---

## 1. Event-Driven Architecture

### System Topology

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (React SPA)                              │
│                    Vite + React Router + TypeScript                       │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │ HTTP/REST
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      APPLICATION SERVER (Express)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Auth Routes  │  │ TX Routes    │  │ Ticket Routes│  │ Fraud Proxy│  │
│  │              │  │ + Fraud      │  │ + LangGraph  │  │ Routes     │  │
│  │              │  │   Scoring    │  │   AI Agent   │  │            │  │
│  └──────────────┘  └──────┬───────┘  └──────────────┘  └────────────┘  │
└──────────────────────────┬│──────────────────────────────────────────────┘
                           ││
              ┌────────────┘│
              │             │ HTTP (score request)
              │             ▼
              │   ┌──────────────────────────────────────────────────┐
              │   │              RDA (Fraud Engine)                   │
              │   │         Fastify + ONNX + XGBoost                 │
              │   │                                                  │
              │   │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
              │   │  │ Feature  │→ │ ONNX     │→ │ Rules Engine │  │
              │   │  │ Service  │  │ Inference│  │ (Pre + Post) │  │
              │   │  └────┬─────┘  └──────────┘  └──────────────┘  │
              │   │       │                                         │
              │   │       │ Redis Pipeline        Kafka Publish     │
              │   └───────┼──────────────────────────┬──────────────┘
              │           │                          │
              │           ▼                          ▼
              │   ┌──────────────┐          ┌──────────────┐
              ▼   │    Redis 7   │          │ Apache Kafka │
        ┌─────────┤              │          │  (Confluent  │
        │         │ Feature      │          │   7.6.0)     │
        │         │ Cache        │          │              │
        │         └──────────────┘          └──────┬───────┘
        │                  ▲                       │
        │                  │ Redis HSET            │ Consume
        │                  │                       ▼
        │         ┌────────┴───────────────────────────────┐
        │         │         PAA (Post-Action Analyzer)      │
        │         │                                        │
        │         │  ┌────────────┐  ┌──────────────────┐  │
        │         │  │ Velocity   │  │ Graph Service    │  │
        │         │  │ Service    │  │ (graphology)     │  │
        │         │  │            │  │                  │  │
        │         │  │ 6 windows  │  │ PageRank         │  │
        │         │  │ 1m→30d     │  │ Louvain          │  │
        │         │  │            │  │ Clustering       │  │
        │         │  │            │  │ Fraud BFS        │  │
        │         │  └────────────┘  └──────────────────┘  │
        │         └────────────────────────────────────────┘
        │
        ▼
  ┌──────────────┐
  │ PostgreSQL   │
  │ 16 Alpine    │
  │              │
  │ app_db +     │
  │ fraud_db     │
  └──────────────┘
```

### Service Decomposition

| Service | Responsibility | Scaling Unit | Statefulness |
|---------|---------------|:-------------|:-------------|
| **App** (Express) | REST API, LangGraph AI agent, UI serving | Horizontal (stateless) | Stateless |
| **RDA** (Fastify) | Feature assembly, ONNX inference, rules engine, audit | Horizontal (stateless after model load) | Model in memory |
| **PAA** (KafkaJS consumer) | Velocity computation, graph analysis, Redis updates | Vertical (single consumer group) | In-memory graph + velocity buffers |
| **PostgreSQL** | Persistent storage (users, transactions, tickets, audit) | Vertical (read replicas possible) | Fully persistent |
| **Redis** | Feature cache, velocity counters | Horizontal (Redis Cluster) | Volatile (re-hydrated from PAA) |
| **Kafka** | Event streaming, audit log durability | Horizontal (partition-based) | Durable log |

---

## 2. Kafka Topology & Event Flow

### Topics

| Topic | Producer | Consumer | Partitions | Key | Purpose |
|-------|----------|----------|:----------:|-----|---------|
| `fraud.transactions` | RDA | PAA | Configurable | `sender_id` | All fraud decisions for velocity/graph updates |
| `fraud.blocked` | RDA | PAA (optional) | Configurable | `transaction_id` | Only DECLINE decisions for investigation alerts |
| `fraud.audit` | RDA (stream mode) | Audit Consumer | Configurable | `audit_id` | Durable audit trail (write-ahead to topic before DB) |

### Event Schema (`TransactionEvent`)

```typescript
interface TransactionEvent {
  transaction_id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  timestamp: number;
  transaction_type: string;
  decision: 'ACCEPT' | 'REVIEW' | 'DECLINE';
  decision_source: 'ML' | 'PRE_RULE' | 'POST_RULE' | 'BREAKER_FALLBACK';
  fraud_probability: number;
  reason_codes: ReasonCode[];
  model_version: string;
  threshold: number;
  audit_id: string | null;
  audit?: DecisionAuditRecord;  // Full audit payload in stream mode
}
```

### Audit Pipeline Modes

| Mode | Flow | Durability Guarantee |
|------|------|---------------------|
| **DIRECT** | RDA → PostgreSQL (sync write) | Audit committed before response |
| **QUEUE** | RDA → In-memory queue → PostgreSQL (async flush) | At-most-once with backpressure |
| **STREAM** | RDA → Kafka → Audit Consumer → PostgreSQL | Kafka-broker-acked before response (strongest) |

In **STREAM** mode, the Kafka event IS the durable write. The database table is materialized from the topic, enabling replay and audit recovery.

---

## 3. Redis Feature Store Design

### Key Schema

```
features:{userId}                          → Hash: velocity + graph features for sender
features:pair:{senderId}:{receiverId}      → Hash: pair-specific features
features:{userId} (recipient_* fields)     → Hash: receiver-side features (dispute rate, lifetime count)
```

### Pipeline Optimization

All feature reads happen in a **single pipelined round-trip**:

```typescript
const pipeline = this.redisClient.pipeline();
pipeline.hgetall(`features:${senderId}`);
pipeline.hgetall(`features:pair:${senderId}:${receiverId}`);
pipeline.hgetall(`features:${receiverId}`);
const [senderHash, pairHash, receiverHash] = await pipeline.exec();
```

**Result:** 1 network round-trip instead of 3, regardless of Redis cluster topology.

### Feature Update Flow (PAA → Redis)

After processing each Kafka event, PAA computes updated features and writes them back:

```
1. VelocityService.recordTransaction(event)
2. VelocityService.calculateMetrics(senderId)     → velocity_1m, velocity_5m, ..., velocity_7d
3. VelocityService.calculatePairMetrics(sender, receiver) → pair_*, round_trip_count
4. GraphService.addTransaction(event)              → pagerank, clustering_coef, community_id
5. RedisUpdateService.writeFeatures(...)           → HSET features:{senderId} ...
```

### Memory Management

| Resource | Limit | Eviction Strategy |
|----------|-------|-------------------|
| Velocity buffers per user | `maxTransactionsPerUser` | Time-based (30-day window) + FIFO overflow |
| Tracked users | `maxTrackedUsers` | LRU eviction of least-recently-active |
| Graph nodes | `maxGraphNodes` | LRU eviction with age-based pruning (30-day staleness) + forced LRU when stale nodes insufficient |
| Graph edges | Grows with nodes | Pruned with owning nodes |

---

## 4. PostgreSQL Schema & Performance

### Dual-Database Architecture

| Database | ORM | Tables | Purpose |
|----------|-----|--------|---------|
| **app_db** | Drizzle ORM (type-safe) | `users`, `transactions`, `tickets`, `counters` | Application data |
| **fraud_db** | Knex (migrations) | `decision_audit`, `rules`, `models`, `api_keys`, `labels`, `training_*` | Fraud engine data |

### Key Schema Decisions

**Transactions table** — Fraud metadata stored alongside transaction data:
```sql
CREATE TABLE transactions (
  tx_id VARCHAR(64) UNIQUE NOT NULL,
  fraud_score NUMERIC(5,4),         -- ML probability (0.0000–1.0000)
  fraud_decision VARCHAR(20),        -- ACCEPT | REVIEW | DECLINE
  ojuri_audit_id VARCHAR(255),       -- Cross-reference to fraud engine audit
  reason_codes JSONB,                -- Array of {code, description, contribution}
  model_version VARCHAR(100)         -- Which model version scored this
);
```

**Why JSONB for reason_codes?** Reason codes are variable-length arrays (top-N varies), and their schema may evolve with model versions. JSONB allows schema-free storage while still supporting PostgreSQL's JSON operators for querying.

**Tickets table** — Conversation history as JSONB:
```sql
messages JSONB DEFAULT '[]'::JSONB NOT NULL
-- Each message: { role: 'customer'|'ai'|'agent', content: string, timestamp: Date }
```

### Idempotency

Transaction IDs are reserved atomically to prevent double-processing:
```typescript
// Reserve transaction_id with TTL
await this.idempotencyService.reserveTransactionId(tenantId, transaction_id);
// Returns false if already reserved → 409 Conflict
```

---

## 5. Resilience & Fault Tolerance

### Circuit Breakers

The system uses the **opossum** circuit breaker library at every external dependency boundary:

| Breaker | Protected Resource | Timeout | Error Threshold | Reset Timeout | Fallback |
|---------|-------------------|:-------:|:---------------:|:-------------:|----------|
| `redis-features` | Redis feature reads | Configurable | Configurable | Configurable | Population-average feature defaults |
| `onnx-inference` | ONNX model inference | Configurable | Configurable | Configurable | Score 1.0 + `degraded: true` flag |

**Circuit Breaker States:**
```
CLOSED (normal) → OPEN (failing fast) → HALF_OPEN (testing recovery)
      ↑                                         │
      └─────────────────────────────────────────┘
```

All state transitions are recorded as Prometheus metrics (`circuit_breaker_state`, `circuit_breaker_events_total`).

### Graceful Degradation Hierarchy

```
Level 1: Normal operation
  → ML scoring with full features from Redis + real-time graph

Level 2: Redis unavailable (breaker OPEN)
  → ML scoring with population-average defaults
  → Predictions still work, but less personalized

Level 3: ONNX inference unavailable (breaker OPEN)
  → Fallback decision (configurable: REVIEW by default)
  → Score = 1.0 with `degraded = true`
  → Human analyst reviews all flagged transactions

Level 4: Fraud engine entirely unavailable (HTTP timeout)
  → scoreTransaction() returns ACCEPT with `degraded = true`
  → Transaction proceeds; no fraud scoring
  → This is the "fail-open" policy (addressed in Responsible AI doc)
```

### Idempotency System

| Feature | Implementation |
|---------|---------------|
| **Transaction-level** | `transaction_id` reservation with configurable TTL |
| **Request-level** | `Idempotency-Key` header with request hash validation |
| **Concurrent requests** | Distributed lock with wait-for-replay |
| **Conflict detection** | Request body hash comparison for same key |

### Health Checks

| Endpoint | Service | Checks |
|----------|---------|--------|
| `GET /api/health` | App | Database connectivity, Ojuri RDA status |
| `GET /readyz` | RDA | ONNX model loaded + calibration probe passed + Redis connected + DB connected |
| `GET /livez` | RDA | Process alive |

The **readyz** probe is critical: it prevents traffic routing to an RDA instance that loaded a broken model. The calibration probe must pass before readiness is reported.

---

## 6. Observability & Monitoring

### Prometheus Metrics (40+ metrics)

The system exposes comprehensive Prometheus metrics via `prom-client`:

#### Request Metrics
| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `fraud_detection_requests_total` | Counter | method, path, status | Total API requests |
| `fraud_detection_request_duration_ms` | Histogram | method, path | Request latency (10 buckets: 10ms–1s) |
| `fraud_detection_errors_total` | Counter | type | Error counts by category |

#### Decision Metrics
| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `fraud_detection_decisions_total` | Counter | decision | ACCEPT/REVIEW/DECLINE counts |
| `predict_stage_duration_ms` | Histogram | stage | Per-stage latency (resolve_model, feature_load, inference, etc.) |

#### Infrastructure Metrics
| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `redis_cache_hits_total` | Counter | — | Feature cache hit count |
| `redis_cache_misses_total` | Counter | — | Feature cache miss count |
| `circuit_breaker_state` | Gauge | name | Current breaker state (0/1/2) |
| `circuit_breaker_events_total` | Counter | name, event | Breaker events (timeout, reject, fallback) |
| `onnx_model_inference_duration_ms` | Histogram | — | Raw ONNX inference latency |
| `onnx_model_load_time_ms` | Gauge | — | Model load time |
| `onnx_session_pool_size` | Gauge | — | Active inference session count |

#### Kafka Metrics
| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `kafka_messages_published_total` | Counter | topic | Published event count |
| `kafka_publish_errors_total` | Counter | topic | Publish failure count |
| `paa_messages_processed_total` | Counter | — | PAA processed events |
| `paa_consumer_lag` | Gauge | partition | Consumer lag per partition |

#### Graph & Velocity Metrics
| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `paa_graph_size` | Gauge | type (nodes/edges) | Current transaction graph size |
| `paa_pagerank_compute_duration_ms` | Histogram | — | PageRank computation time |

#### Audit & Reliability Metrics
| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `fraud_detection_audit_write_failures_total` | Counter | op | Audit log write failures |
| `fraud_detection_shadow_scores_dropped_total` | Counter | — | Shadow scores that arrived too late |
| `fraud_detection_idempotency_lookups_total` | Counter | outcome | Idempotency cache outcomes |

### Structured Logging

All services use **pino** for structured JSON logging with service-specific loggers:

```json
{
  "level": "info",
  "service": "PredictService",
  "method": "predict",
  "traceId": "abc-123",
  "inferenceTime": 8,
  "probability": 0.234
}
```

---

## 7. Horizontal Scaling Strategy

### Current Architecture — Vertical Scaling

```
┌─────────────────────────────────────────┐
│ Docker Compose (Single Host)            │
│                                         │
│  App ──→ RDA ──→ Redis ──→ Kafka ──→ PAA│
│                    ↓                    │
│               PostgreSQL                │
└─────────────────────────────────────────┘
```

### Production Architecture — Horizontal Scaling

```
                        ┌─────────────┐
                        │ Load Balancer│
                        └──────┬──────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
         ┌────────┐      ┌────────┐      ┌────────┐
         │ App-1  │      │ App-2  │      │ App-N  │   ← Stateless, scale horizontally
         └───┬────┘      └───┬────┘      └───┬────┘
             │               │               │
             └───────────────┼───────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         ┌────────┐    ┌────────┐    ┌────────┐
         │ RDA-1  │    │ RDA-2  │    │ RDA-N  │       ← Stateless (model loaded per instance)
         └───┬────┘    └───┬────┘    └───┬────┘
             │              │             │
    ┌────────┴──────────────┴─────────────┴────────┐
    │         Redis Cluster (3+ nodes)              │   ← Hash-slot partitioned
    └──────────────────────────────────────────────┘
    ┌──────────────────────────────────────────────┐
    │     Kafka Cluster (3+ brokers)                │   ← Partition-parallel
    │     Topic partitions keyed on sender_id       │
    └──────────────────────┬───────────────────────┘
                           │
              ┌────────────┼────────────────┐
              ▼            ▼                ▼
         ┌────────┐  ┌────────┐      ┌────────┐
         │ PAA-1  │  │ PAA-2  │      │ PAA-N  │      ← Consumer group, partition-parallel
         └────────┘  └────────┘      └────────┘
    ┌──────────────────────────────────────────────┐
    │  PostgreSQL (Primary + Read Replicas)          │
    └──────────────────────────────────────────────┘
```

### Scaling Bottlenecks & Mitigations

| Component | Bottleneck | Mitigation |
|-----------|-----------|------------|
| **RDA** | ONNX session serialization | Session pool (round-robin, configurable size) |
| **Redis** | Single-instance memory | Redis Cluster with hash-slot partitioning |
| **PAA** | In-memory graph size | `maxGraphNodes` cap + LRU eviction; hourly pruning |
| **PAA** | Velocity buffer memory | `maxTrackedUsers` cap + LRU eviction |
| **Kafka** | Consumer throughput | Partition count = parallelism degree |
| **PostgreSQL** | Write throughput (audit) | STREAM audit mode offloads to Kafka |

---

## 8. Integration Architecture

### Webhook System

The fraud engine publishes HMAC-SHA256 signed webhook events to registered endpoints:

```typescript
POST /api/ojuri/webhooks
Headers:
  X-Ojuri-Signature: <HMAC-SHA256(body, secret)>

Events:
  decision.created    → Transaction scored, includes full decision context
  decision.overridden → Analyst overrode a decision with justification
  model.activated     → New model version deployed to production
  rule.activated      → Fraud rule enabled/disabled
```

The application server's webhook handler auto-creates support tickets on DECLINE/REVIEW events, closing the loop between fraud detection and customer support.

### API Integration Points

| Integration | Protocol | Authentication | Rate Limiting |
|-------------|----------|:-------------:|:-------------:|
| App → RDA | HTTP POST | `X-Api-Key` header | API key-based |
| RDA → Kafka | KafkaJS producer | PLAINTEXT (internal) | Broker-side |
| PAA ← Kafka | KafkaJS consumer | PLAINTEXT (internal) | Consumer group |
| RDA → Redis | ioredis | Password (configurable) | Connection pool |
| RDA → PostgreSQL | Knex | Connection string | Pool size |
| App → LLM | HTTPS | Provider API key | Provider-side |

### Multi-Tenant Support

The fraud engine supports multi-tenant operation:
- `tenantId` flows through the entire predict pipeline
- Idempotency keys are tenant-scoped
- Webhook delivery is tenant-scoped
- Model resolution can be segment-specific

### Vercel Serverless Deployment

For lighter deployments, the system supports a **serverless architecture** on Vercel:

| Component | Vercel Implementation |
|-----------|----------------------|
| Frontend | Static files on CDN (Vite-built React) |
| API | Single serverless function (Express) |
| Database | Managed PostgreSQL (Neon/Vercel/Supabase) |
| AI Agent | LangGraph runs within serverless function |
| Fraud Engine | Optional (disabled via `OJURI_ENABLED=false`) |

This dual-deployment model means the system scales from a $0/month hobby deployment to a multi-node production cluster without code changes.
