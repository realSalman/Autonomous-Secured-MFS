<div align="center">

# 🛡️ Autonomous SecureAssist MFS

### AI-Powered Customer Support & Fraud Detection for Mobile Financial Services

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Autonomous SecureAssist MFS** is a full-stack platform that combines an intelligent AI support agent with real-time fraud detection to protect and assist customers of mobile financial services (MFS). Every money transfer is scored for fraud in milliseconds, and every support query is handled by an AI agent that understands context, transaction history, and fraud status — creating a seamless, secure financial experience.

---

[Overview](#-overview) •
[Key Features](#-key-features) •
[How It Works](#-how-it-works) •
[Architecture](#-technical-architecture) •
[Quick Start](#-quick-start) •
[API Reference](#-api-reference) •
[Contributing](#-contributing)

</div>

---

## 📖 Overview

### The Problem

Mobile Financial Services — services like bKash, Nagad, M-Pesa, and GCash — have become the primary way millions of people send money, pay bills, and manage finances through their phones. But this convenience comes with two major challenges:

1. **Fraud is rising.** As digital transactions grow, so do scams — unauthorized transfers, account takeovers, and social engineering attacks. Traditional rule-based fraud checks are too slow and too rigid to keep up.

2. **Customer support doesn't scale.** When a transaction is blocked, fails, or goes to the wrong person, customers need fast answers. Human-only support teams create long wait times, inconsistent responses, and high operational costs.

### The Solution

**Autonomous SecureAssist MFS** tackles both problems in a single, unified platform:

- **Every transaction is scored for fraud** before it executes. A machine-learning model analyzes velocity patterns, transaction graphs, amount deviations, and behavioral signals to make a split-second decision: **ACCEPT**, **REVIEW**, or **DECLINE**.

- **Every customer inquiry is handled by an AI agent** that doesn't just generate generic responses — it pulls the customer's real account data, recent transactions, and fraud status, then responds with specific, actionable answers.

- **Human operators remain in control.** An admin dashboard lets support agents review AI suggestions, override fraud decisions, and manage escalations — the AI assists, it doesn't replace.

### Who Is This For?

| User | What They Get |
|------|---------------|
| 🧑‍💼 **MFS Operators & Fintechs** | A production-ready support + fraud platform to integrate into existing mobile money services |
| 🎓 **Researchers & Students** | A reference implementation showing how LangGraph AI agents, XGBoost fraud models, and event-driven architectures work together in a real-world system |
| 👩‍💻 **Developers** | A clean, well-structured full-stack TypeScript codebase demonstrating modern patterns: monorepo workspaces, Drizzle ORM, React SPA with Express API, Kafka event streaming, and Docker orchestration |

---

## ✨ Key Features

### 🤖 AI-Powered Customer Support

- **Intelligent Intent Classification** — Automatically categorizes customer messages into 7 intent classes (payment failure, fraud inquiry, wrong recipient, balance inquiry, account issues, cashout problems, general questions)
- **Context-Aware Responses** — The AI retrieves the customer's profile, last 5 transactions, and knowledge base articles before generating each reply — no hallucinated transaction IDs, no generic answers
- **Fraud-Aware Support** — When a customer asks "why was my transfer blocked?", the AI fetches the actual fraud decision and translates technical reason codes (e.g., `VELOCITY`, `PAGERANK`) into plain language
- **Conversation Memory** — Maintains the last 6 messages of context for natural, multi-turn conversations
- **Multi-LLM Support** — Works with Groq, Google Gemini, or OpenRouter — switch providers with a single environment variable

### 🛡️ Real-Time Fraud Detection

- **Machine Learning Scoring** — Every outgoing transfer is sent to the fraud detection engine (RDA) which returns a fraud probability and a three-tier decision: **ACCEPT** / **REVIEW** / **DECLINE**
- **Multi-Signal Analysis** — The model evaluates velocity patterns, transaction graph topology (via PageRank), amount deviation from account norms, account age, and behavioral features
- **XGBoost + ONNX Runtime** — Production ML model served via ONNX Runtime for sub-100ms inference
- **Kafka Event Streaming** — All fraud events flow through Kafka topics, enabling real-time processing by the Post-Action Analyzer (PAA) for downstream alerts and pattern aggregation
- **Graceful Degradation** — If the fraud service is temporarily unavailable, transactions default to ACCEPT rather than blocking all customers

### 📊 Fraud Operations Dashboard

- **Summary Statistics** — Total decisions, approval/decline/review rates, and fraud trends at a glance
- **Audit Trail** — Complete log of every fraud decision with timestamp, score, reason codes, model version, and audit ID
- **Decision Overrides** — Fraud analysts can override DECLINE decisions with justification, creating a full audit trail
- **Rule Management** — View and manage the fraud detection rules that feed into the scoring model
- **Model Versioning** — Track which model version made each decision for regulatory compliance

### 🎫 Admin Support Console

- **Ticket Queue** — View all open, in-progress, and resolved tickets with real-time status
- **AI Copilot** — For each ticket, the AI suggests a response with reasoning — the agent can accept, edit, or override
- **Conversation Panel** — Full conversation history with the customer, including AI-generated and human-edited responses
- **Webhook Automation** — When the fraud engine blocks a transaction, a support ticket is automatically created so the customer is proactively notified

### 📱 Customer Portal

- **Send Money** — Transfer funds to any phone number with instant fraud screening
- **Transaction History** — Complete record of all sent and received transactions with status indicators
- **Support Tickets** — Create and track support requests with real-time AI responses
- **Profile Management** — View account details and balance information

---

## 🔄 How It Works

### The Customer Experience (Non-Technical)

**Sending Money:**
1. A customer opens the portal and enters a recipient's phone number and amount
2. Behind the scenes, the system checks the transaction against the fraud detection model
3. If the transaction is safe → money is transferred instantly
4. If the transaction is suspicious → it's either flagged for review (money still goes through) or blocked entirely (money stays in the sender's account)
5. If blocked, a support ticket is automatically created and the customer is notified with a plain-language explanation

**Getting Help:**
1. The customer creates a support ticket describing their issue
2. An AI agent reads the message, classifies what type of issue it is, pulls up the customer's account and recent transactions, and generates a personalized response
3. The response appears instantly — but a human support agent also sees it and can step in, edit, or escalate at any time
4. The customer sees a seamless, fast support experience

### The Data Flow (Technical)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CUSTOMER PORTAL                         │
│               React SPA (Vite + React Router)                  │
└──────────────┬──────────────────────┬──────────────────────────┘
               │ Send Money           │ Create Ticket
               ▼                      ▼
┌──────────────────────────┐  ┌────────────────────────────────┐
│    Transaction Route     │  │        Ticket Route            │
│  POST /api/transactions  │  │    POST /api/tickets           │
│         /send            │  │                                │
└──────────┬───────────────┘  └──────────┬─────────────────────┘
           │                              │
           ▼                              ▼
┌──────────────────────┐     ┌─────────────────────────────────┐
│  Ojuri Fraud Scoring │     │     LangGraph AI Agent          │
│                      │     │                                 │
│  ┌────────────────┐  │     │  ┌──────────┐  ┌────────────┐  │
│  │ RDA Service    │  │     │  │ Classify  │→ │ Retrieve   │  │
│  │ (XGBoost/ONNX) │  │     │  │ Intent   │  │ Context    │  │
│  └───────┬────────┘  │     │  └──────────┘  └─────┬──────┘  │
│          │           │     │                      │          │
│          ▼           │     │               ┌──────▼──────┐   │
│  ACCEPT / REVIEW /   │     │               │  Generate   │   │
│  DECLINE             │     │               │  Response   │   │
│          │           │     │               └─────────────┘   │
└──────────┼───────────┘     └─────────────────────────────────┘
           │
     ┌─────┴──────┐
     ▼            ▼
 Execute       Block TX
 Transfer     + Auto-create
              Support Ticket
```

---

## 🏗️ Technical Architecture

### System Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Client** | React 18, TypeScript, Vite, React Router | Single-page application with customer, admin, and fraud dashboard views |
| **API Server** | Express.js, TypeScript, tsx | REST API handling auth, transactions, tickets, and fraud proxy routes |
| **AI Agent** | LangChain/LangGraph, Groq/Gemini/OpenRouter | 3-node state graph: intent classification → context retrieval → response generation |
| **Database** | PostgreSQL 16, Drizzle ORM | Users, transactions (with fraud metadata), tickets, counters |
| **Fraud Engine (RDA)** | Fastify, XGBoost, ONNX Runtime, Knex | Real-time Decision Agent — scores transactions using ML models |
| **Post-Action Analyzer (PAA)** | Node.js, KafkaJS | Consumes fraud events from Kafka for downstream analysis and alerting |
| **Message Broker** | Apache Kafka (Confluent 7.6) | Decouples fraud event producers from consumers; enables replay and auditing |
| **Cache** | Redis 7 | Session/feature caching for the fraud detection pipeline |

### Monorepo Structure

```
Autonomous-Secured-MFS/
├── client/                          # React frontend
│   └── src/
│       ├── pages/
│       │   ├── CustomerPage.tsx     # Customer-facing portal
│       │   ├── AdminPage.tsx        # Support agent console
│       │   └── FraudDashboardPage.tsx # Fraud operations center
│       ├── components/
│       │   ├── customer/            # Login, Dashboard, SendMoney, Profile, CustomerSupport
│       │   ├── admin/               # TicketList, ConversationPanel, AICopilot
│       │   └── shared/              # Reusable UI components
│       ├── api/                     # API client functions
│       └── types/                   # TypeScript interfaces
│
├── server/                          # Express backend
│   └── src/
│       ├── ai/
│       │   ├── graph.ts             # LangGraph state machine (3-node workflow)
│       │   ├── llm.ts               # Multi-provider LLM factory
│       │   ├── knowledge.ts         # Knowledge base with keyword search
│       │   └── tools.ts             # Data retrieval tools (user, transactions, fraud)
│       ├── routes/
│       │   ├── auth.ts              # Phone-based authentication
│       │   ├── transactions.ts      # Send money + fraud scoring integration
│       │   ├── tickets.ts           # Ticket CRUD + AI response generation
│       │   ├── fraud-audit.ts       # Decision audit log + overrides
│       │   ├── fraud-rules.ts       # Fraud rule management proxy
│       │   ├── fraud-models.ts      # Model version tracking proxy
│       │   ├── fraud-training.ts    # Training data management
│       │   └── ojuri-webhooks.ts    # Webhook receiver for fraud events
│       ├── services/
│       │   └── ojuri.ts             # Ojuri RDA client (scoring, admin, health)
│       ├── db/
│       │   ├── schema.ts            # Drizzle ORM schema (users, transactions, tickets)
│       │   ├── connection.ts        # PostgreSQL connection + table init
│       │   └── seed.ts              # Sample data seeder
│       ├── validation/              # Input sanitization (phone, amount)
│       └── types/                   # Shared TypeScript types
│
├── server/fraud_detector/           # Ojuri Fraud Detection Engine
│   ├── src/
│   │   ├── v1/modules/
│   │   │   ├── rda/                 # Real-time Decision Agent
│   │   │   ├── audit-trails/        # Complete decision audit logging
│   │   │   ├── training/            # Model training pipeline
│   │   │   ├── labels/              # Ground-truth labeling
│   │   │   ├── stats/               # Fraud statistics & analytics
│   │   │   ├── admin/               # Admin operations
│   │   │   ├── auth/                # JWT authentication
│   │   │   ├── notifications/       # Alert dispatching
│   │   │   └── health/              # Readiness & liveness probes
│   │   ├── database/                # Knex migrations & seeds
│   │   └── shared/                  # Shared utilities
│   ├── paa-service/                 # Post-Action Analyzer (Kafka consumer)
│   ├── models/                      # Serialized ML models (ONNX)
│   └── data/                        # Training/demo datasets
│
├── docker-compose.yml               # Full-stack orchestration (8 services)
├── Dockerfile                       # Multi-stage build (server + client)
└── .env.example                     # Configuration template
```

### AI Agent Pipeline (LangGraph)

The support agent is built as a 3-node **LangGraph state graph** where each node is an async function that reads from and writes to a shared state annotation:

```
START → [Classify Intent] → [Retrieve Context] → [Generate Response] → END
```

**Node 1 — Classify Intent**
- Sends the customer's message to the LLM with a focused classification prompt
- Returns exactly one of 7 categories: `payment_failure`, `fraud_inquiry`, `wrong_recipient`, `balance_inquiry`, `account_issue`, `cashout`, `general`
- Invalid or unparseable results default to `general`

**Node 2 — Retrieve Context**
- Runs three parallel data lookups:
  - `getUserInfo(phone)` — customer profile and balance from PostgreSQL
  - `getRecentTransactions(phone, 5)` — last 5 transactions
  - `searchKnowledge(intent, message)` — keyword-matched knowledge base articles
- For `fraud_inquiry` intents, additionally fetches `getFraudStatus(phone)` to pull actual fraud decision data

**Node 3 — Generate Response**
- Constructs a detailed system prompt with all retrieved context
- Includes conversation history (last 6 messages) for multi-turn coherence
- Enforces guidelines: reference real transaction IDs, translate fraud reason codes to plain language, never reveal fraud scores, keep responses under 150 words
- Returns the suggested reply plus a list of recommended actions

### Fraud Detection Pipeline

```
Transaction Request
       │
       ▼
┌──────────────────┐    HTTP POST     ┌────────────────────────┐
│  Express Server  │ ──────────────→  │  Ojuri RDA Service     │
│  (ojuri.ts)      │                  │  (Fastify + ONNX)      │
│                  │  ◄────────────   │                        │
│  - Idempotency   │    JSON Response │  - Feature extraction  │
│  - Correlation ID│                  │  - XGBoost inference   │
│  - 5s timeout    │                  │  - Threshold @ 0.65    │
│  - Graceful      │                  │  - Audit trail write   │
│    degradation   │                  │  - Kafka event emit    │
└──────────────────┘                  └────────────────────────┘
                                                │
                                          Kafka Topic
                                                │
                                                ▼
                                      ┌──────────────────┐
                                      │  PAA Service     │
                                      │  (Post-Action    │
                                      │   Analyzer)      │
                                      │                  │
                                      │  - Pattern agg.  │
                                      │  - Alert dispatch│
                                      │  - Graph analysis│
                                      └──────────────────┘
```

**Scoring Request Payload:**
- Transaction metadata (ID, sender, receiver, amount, type, timestamp)
- Customer context (account name, age, authentication status, segment)
- Channel and currency information

**Decision Criteria:**
| Decision | Condition | Effect |
|----------|-----------|--------|
| **ACCEPT** | Fraud probability < threshold | Transaction executes normally |
| **REVIEW** | Probability near threshold | Transaction executes but is flagged for human review within 24 hours |
| **DECLINE** | Probability > threshold | Transaction is blocked; money stays in sender's account; support ticket auto-created |

**Reason Codes Explained:**
| Code | Technical Meaning | Customer-Facing Language |
|------|-------------------|--------------------------|
| `VELOCITY` | Too many transactions in a short window | "Unusual number of transfers in a short time" |
| `PAGERANK` | Recipient has suspicious graph topology | "The recipient has unusual transaction patterns" |
| `AMOUNT_DEVIATION` | Amount far exceeds account norms | "This amount is unusually large for your account" |

### Database Schema

The application uses **PostgreSQL 16** with **Drizzle ORM** for type-safe queries:

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `users` | `phone` (unique), `name`, `balance`, `created_at` | Customer accounts |
| `transactions` | `tx_id` (unique), `sender`, `receiver`, `amount`, `status`, `fraud_score`, `fraud_decision`, `reason_codes`, `model_version` | All transfers with fraud metadata |
| `tickets` | `token` (unique), `phone`, `status`, `category`, `messages` (JSONB) | Support tickets with conversation history |
| `counters` | `name`, `value` | Sequential ID generation |

The fraud engine maintains its own separate database (`fraud_db`) managed via Knex migrations.

### Infrastructure Services

| Service | Port | Image | Role |
|---------|------|-------|------|
| `app` | 3001 | Custom (multi-stage) | Express API + built React client |
| `postgres` | 5433 | `postgres:16-alpine` | Primary data store (app DB + fraud DB) |
| `redis` | 6380 | `redis:7-alpine` | Feature caching for fraud pipeline |
| `kafka` | 9092 | `confluentinc/cp-kafka:7.6.0` | Event streaming for fraud decisions |
| `zookeeper` | 2181 | `confluentinc/cp-zookeeper:7.6.0` | Kafka coordination |
| `rda` | 3002 | Custom (fraud_detector) | Real-time Decision Agent |
| `paa` | — | Custom (paa-service) | Post-Action Analyzer (Kafka consumer) |
| `seed` | — | Custom | One-shot data seeder (exits after run) |
| `fraud-migrate` | — | Custom | One-shot DB migrations (exits after run) |

---

## 🚀 Quick Start

### One-Command Docker Setup

**Prerequisite:** [Docker Desktop](https://docker.com)

```bash
git clone <repo-url>
cd Autonomous-Secured-MFS
cp .env.example .env        # add your LLM API key
docker compose up -d         # start everything
```

**Open:** [http://localhost:3001](http://localhost:3001)

That's it. One command starts: PostgreSQL, Redis, Kafka, the fraud detection engine (RDA + PAA), the application, and seeds sample data.

### Environment Variables

Edit `.env` — only the LLM key is required:

| Variable | Required | Description |
|----------|----------|-------------|
| `LLM_PROVIDER` | ✅ | `groq`, `gemini`, or `openrouter` |
| `GROQ_API_KEY` | if groq | Groq API key |
| `GROQ_MODEL` | No | Groq model name (default: `openai/gpt-oss-20b`) |
| `GEMINI_API_KEY` | if gemini | Google AI key |
| `GEMINI_MODEL` | No | Gemini model name (default: `gemini-2.0-flash`) |
| `OPENROUTER_API_KEY` | if openrouter | OpenRouter key |
| `OPENROUTER_MODEL` | No | OpenRouter model (default: `meta-llama/llama-3.3-70b-instruct`) |
| `POSTGRES_PASSWORD` | No | Database password (default: `password`) |

### Local Development (Hot Reload)

For active development with file watching (requires Node.js 20+):

```bash
cp .env.example .env
docker compose up postgres -d    # just the database
npm install
npm run seed
npm run dev                      # client :3000 + server :3001
```

---

## 📡 API Reference

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Login by phone number |

### Transactions

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/transactions/send` | Send money (fraud-scored before execution) |
| `GET` | `/api/transactions/:phone` | Transaction history for a user |

### Support Tickets

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/tickets` | Create ticket (AI generates response) |
| `GET` | `/api/tickets` | List all tickets |

### Fraud Operations

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/fraud/audit` | Full decision audit log |
| `GET` | `/api/fraud/audit/stats/summary` | Aggregate fraud statistics |
| `POST` | `/api/fraud/override/:auditId` | Override a fraud decision with justification |
| `GET` | `/api/fraud/rules` | List active fraud detection rules |
| `GET` | `/api/fraud/models` | List model versions and metadata |

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/ojuri/webhooks` | Receive fraud event notifications |

### System

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check (includes fraud engine status) |

---

## 🛠️ Commands Reference

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start all services in background |
| `docker compose down` | Stop all services |
| `docker compose down -v` | Stop all services and delete data volumes |
| `docker compose logs -f app` | Watch application logs |
| `docker compose logs -f rda` | Watch fraud engine logs |
| `npm run dev` | Local dev with hot-reload (client + server) |
| `npm run seed` | Seed database with sample data |
| `npm run build` | Build client for production |
| `npm run typecheck` | Run TypeScript checks on all workspaces |

---

## 🧰 Tech Stack Summary

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite 5, React Router 6 |
| **Backend** | Express.js 4, TypeScript, tsx |
| **AI/ML** | LangChain, LangGraph, Groq / Gemini / OpenRouter |
| **Fraud Engine** | Fastify 5, XGBoost, ONNX Runtime, graphology |
| **Database** | PostgreSQL 16, Drizzle ORM, Knex (fraud DB) |
| **Messaging** | Apache Kafka (Confluent 7.6), KafkaJS |
| **Caching** | Redis 7, ioredis |
| **Infrastructure** | Docker, Docker Compose, multi-stage builds, **Vercel** (serverless) |
| **Observability** | prom-client (Prometheus metrics), pino (structured logging) |

---

## 🚀 Deploy to Vercel

This project is configured for one-command deployment to [Vercel](https://vercel.com) with serverless API functions + static frontend.

### Prerequisites

1. A **Vercel account** (free tier works)
2. A **PostgreSQL database** — recommended providers:
   - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (easiest integration)
   - [Neon](https://neon.tech) (generous free tier)
   - [Supabase](https://supabase.com) (free tier available)
   - [Railway](https://railway.app)
3. An **LLM API key** (Groq, Google Gemini, or OpenRouter)

### Deploy Steps

#### 1. Push to GitHub

```bash
git init
git add -A
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

#### 2. Import in Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel auto-detects the `vercel.json` configuration
4. Click **Deploy**

#### 3. Configure Environment Variables

In your Vercel project dashboard → **Settings** → **Environment Variables**, add:

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host:5432/dbname?sslmode=require` |
| `LLM_PROVIDER` | ✅ | `groq`, `gemini`, or `openrouter` |
| `GROQ_API_KEY` | if groq | `gsk_...` |
| `GEMINI_API_KEY` | if gemini | `AI...` |
| `OPENROUTER_API_KEY` | if openrouter | `sk-or-...` |
| `OJURI_ENABLED` | ❌ | `false` (set `true` if you have the fraud service) |
| `SEED_SECRET` | ❌ | Any secret string to protect the seed endpoint |

#### 4. Seed the Database

After your first deployment, seed the database with sample data:

```bash
# If SEED_SECRET is set:
curl -X POST https://YOUR-APP.vercel.app/api/seed \
  -H "Content-Type: application/json" \
  -d '{"secret": "YOUR_SEED_SECRET"}'

# If SEED_SECRET is not set (development only):
curl -X POST https://YOUR-APP.vercel.app/api/seed
```

#### 5. Open Your App

Visit `https://YOUR-APP.vercel.app` — you're live! 🎉

### Vercel Architecture

```
┌─────────────────────────────────────────────────┐
│                   Vercel                         │
│                                                  │
│  ┌──────────────────┐  ┌─────────────────────┐  │
│  │  Static Files     │  │  Serverless Function│  │
│  │  (client/dist)    │  │  (api/index.ts)     │  │
│  │                   │  │                     │  │
│  │  React SPA        │  │  Express API        │  │
│  │  Vite-built       │  │  + LangGraph AI     │  │
│  │                   │  │  + Drizzle ORM      │  │
│  └──────────────────┘  └─────────┬───────────┘  │
│                                   │              │
└───────────────────────────────────┼──────────────┘
                                    │
                           ┌────────▼────────┐
                           │   PostgreSQL     │
                           │  (Neon/Vercel/   │
                           │   Supabase)      │
                           └─────────────────┘
```

- **Frontend**: Vite builds the React client to static files, served from Vercel's CDN
- **API**: Express app runs as a single Vercel serverless function at `/api/*`
- **Database**: Connect to any managed PostgreSQL via `DATABASE_URL`
- **AI**: LangGraph agent runs within the serverless function (stateless per request)

---


---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ❤️ for a safer, smarter financial ecosystem

</div>
