# SupportIQ

AI-powered customer support platform for mobile financial services (MFS).

## Architecture

```
Customer sends message
  → Sequential ticket token generated (TKT-0001)
  → Stored with user's phone number
  → LangGraph agent: classify intent → retrieve context → generate response
  → AI responds instantly to customer
  → Admin sees ticket + AI copilot suggestion
  → Agent can edit and send
```

### Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB (Atlas)
- **AI**: LangGraph.js with Groq/Gemini/OpenRouter LLM providers

## Quick Start

### 1. Setup environment

```bash
cp .env.example .env
# Edit .env with your MongoDB URI and API keys
```

### 2. Install & run

```bash
npm install
npm run seed    # Seed database with sample data
npm run dev     # Starts both server (:3001) and client (:3000)
```

### 3. Open in browser

- **Customer Dashboard**: http://localhost:3000/customer
- **Admin Dashboard**: http://localhost:3000/admin

### Demo Accounts

| Phone | Name | Balance |
|-------|------|---------|
| 01712345678 | Rahim Ahmed | ৳15,000 |
| 01812345678 | Karim Hassan | ৳8,500 |
| 01912345678 | Fatima Khan | ৳22,000 |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `GROQ_API_KEY` | Yes (default) | Groq API key |
| `LLM_PROVIDER` | No | `groq` (default), `gemini`, or `openrouter` |
| `GROQ_MODEL` | No | Default: `llama-3.3-70b-versatile` |
| `GEMINI_API_KEY` | If using Gemini | Google AI API key |
| `OPENROUTER_API_KEY` | If using OpenRouter | OpenRouter API key |

## Project Structure

```
SupportIQ/
├── client/                 # React frontend
│   └── src/
│       ├── api/            # API client
│       ├── components/
│       │   ├── admin/      # Admin dashboard components
│       │   ├── customer/   # Customer-facing components
│       │   └── shared/     # Shared UI components
│       ├── pages/          # Page-level components
│       └── types/          # TypeScript types
├── server/                 # Express backend
│   └── src/
│       ├── ai/             # LangGraph agent, LLM, tools, knowledge
│       ├── db/             # MongoDB connection, seed script
│       ├── models/         # Mongoose models
│       ├── routes/         # API routes
│       ├── types/          # Server types
│       └── validation/     # Input validation
└── .env                    # Environment variables
```
