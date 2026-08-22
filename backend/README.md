# BountyFlow Backend

Flask API backend for BountyFlow — an AI-powered Monad bounty platform.

> **Monad Testnet demo — Testnet MON only.** AI suggestions are editable and do not control funds.

## Quick Start

### 1. Install dependencies

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and add your keys:

| Variable | Description | Required |
|----------|-------------|----------|
| `GROQ_API_KEY` | [Groq API key](https://console.groq.com/) for AI bounty generation | Yes (for `/generate-bounty`) |
| `CONTRACT_ADDRESS` | Deployed MonadBounty contract address | No (added after contract deployment) |

### 3. Run the server

```bash
python app.py
```

Server starts at **http://localhost:5000**

### 4. Verify it works

```bash
curl http://localhost:5000/health
```

Expected: `{"success": true, "data": {"status": "ok"}, "message": "Server is running"}`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/generate-bounty` | AI-generate a bounty draft from plain English |
| `POST` | `/bounties` | Create a new bounty |
| `GET` | `/bounties` | List all bounties (supports `?status=` and `?creator=` filters) |
| `GET` | `/bounties/:id` | Get a single bounty |
| `POST` | `/bounties/:id/accept` | Worker accepts an open bounty |
| `POST` | `/bounties/:id/submit` | Worker submits proof of work |
| `POST` | `/bounties/:id/approve` | Creator approves and releases escrow |
| `POST` | `/bounties/:id/cancel` | Creator cancels an open bounty |

Full API documentation with request/response examples: **[docs/api-docs.md](../docs/api-docs.md)**

---

## Example Requests

### Generate a bounty draft with AI

```bash
curl -X POST http://localhost:5000/generate-bounty \
  -H "Content-Type: application/json" \
  -d '{"request": "Build a React landing page for a coffee shop"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Coffee Shop React Landing Page",
    "description": "Create a modern, responsive landing page...",
    "skills": ["React", "Tailwind", "CSS"],
    "reward": 5.0,
    "deadline": 24,
    "category": "Frontend",
    "difficulty": "Medium"
  },
  "message": "Bounty draft generated successfully"
}
```

### Create a bounty

```bash
curl -X POST http://localhost:5000/bounties \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Build a React Landing Page",
    "description": "Create a modern, responsive landing page with dark mode support.",
    "skills": ["React", "Tailwind"],
    "reward": 5.0,
    "deadline": 24,
    "category": "Frontend",
    "difficulty": "Medium",
    "creator": "0x1234567890abcdef1234567890abcdef12345678"
  }'
```

### Full bounty lifecycle

```bash
# 1. Create bounty (creator)
POST /bounties

# 2. Accept bounty (worker)
POST /bounties/0/accept   {"worker": "0xabc..."}

# 3. Submit proof (worker)
POST /bounties/0/submit   {"proofUrl": "https://...", "worker": "0xabc..."}

# 4. Approve & release (creator)
POST /bounties/0/approve  {"creator": "0x123..."}
```

---

## Response Format

All endpoints return a consistent JSON structure:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Human-readable message"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

---

## Bounty Lifecycle

```
Open → Accepted → Submitted → Paid
  ↓
Cancelled
```

Only 5 states. No disputes, drafts, or expiry in v1.

---

## Project Structure

```
backend/
├── app.py                          # Flask entry point
├── routes/
│   ├── health.py                   # GET /health
│   ├── ai.py                       # POST /generate-bounty
│   └── bounty.py                   # Bounty CRUD + lifecycle
├── services/
│   ├── ai_service.py               # Groq LLM integration
│   └── blockchain_service.py       # Monad contract placeholders
├── utils/
│   └── responses.py                # Consistent response helpers
├── models/                         # (reserved for DB models)
├── .env.example                    # Environment variable template
├── .gitignore
└── requirements.txt
```

---

## Tech Stack

- **Python 3.10+** / **Flask** — API framework
- **Groq** (Llama 3.3 70B) — AI bounty generation
- **Web3.py** — Monad Testnet interaction (placeholder, ready for ABI handoff)
- **flask-cors** — Cross-origin support for frontend

---

## Team Integration

| Teammate | What they need from this backend |
|----------|--------------------------------|
| **Sandeep (Frontend)** | Base URL + [API docs](../docs/api-docs.md) — all endpoints are CORS-enabled |
| **Srikar (Contract)** | Share ABI + deployed address → we swap `blockchain_service.py` internals |
