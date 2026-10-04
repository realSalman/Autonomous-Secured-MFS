# Autonomous SecureAssist MFS

AI-powered customer support platform for mobile financial services (MFS) with integrated fraud detection.

## Quick Start

**Prerequisite:** [Docker Desktop](https://docker.com)

```bash
git clone <repo-url>
cd Autonomous SecureAssist MFS
cp .env.example .env        # add your LLM API key
docker compose up -d         # start everything
```

**Open:** http://localhost:3001

That's it. One command starts: PostgreSQL, Redis, Kafka, (RDA + PAA), the app, and seeds sample data.

## Features

- **AI Support Agent** — LangGraph-powered intent classification + response generation
- **Real-time Fraud Detection** — RDA scoring (ACCEPT / REVIEW / DECLINE)
- **Fraud Dashboard** — Stats, audit log, reason codes, decision overrides
- **Webhook Automation** — Auto-creates tickets when transactions are blocked
- **Admin Dashboard** — Ticket management, AI copilot, conversation panel
- **Customer Portal** — Send money, view transactions, create support tickets

## Environment Variables

Edit `.env` — only the LLM key is required:

| Variable | Required | Description |
|----------|----------|-------------|
| `LLM_PROVIDER` | ✅ | `groq`, `gemini`, or `openrouter` |
| `GROQ_API_KEY` | if groq | Groq API key |
| `GEMINI_API_KEY` | if gemini | Google AI key |
| `OPENROUTER_API_KEY` | if openrouter | OpenRouter key |

## Local Development

For hot-reload (requires Node.js 18+):

```bash
cp .env.example .env
docker compose up postgres -d    # just the database
npm install
npm run seed
npm run dev                      # client:3000 + server:3001
```

## API Endpoints

### Core
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login by phone |
| POST | `/api/transactions/send` | Send money (fraud-scored) |
| GET | `/api/transactions/:phone` | Transaction history |
| POST | `/api/tickets` | Create ticket (AI responds) |
| GET | `/api/tickets` | List tickets |

### Fraud
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/fraud/audit` | Decision audit log |
| GET | `/api/fraud/audit/stats/summary` | Fraud statistics |
| POST | `/api/fraud/override/:auditId` | Override decision |
| GET | `/api/fraud/rules` | List fraud rules |
| GET | `/api/fraud/models` | List model versions |

## Commands

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start everything |
| `docker compose down` | Stop everything |
| `docker compose logs -f app` | Watch app logs |
| `npm run dev` | Local dev (hot-reload) |
