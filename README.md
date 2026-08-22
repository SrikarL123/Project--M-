# BountyFlow 🚀

> **BountyFlow lets a creator turn a plain-English task into a MON-funded Monad bounty, lets one worker submit a proof link, and lets the creator release payment from escrow on approval.**

Built on **Monad Testnet** (Chain ID: 10143) | Hackathon MVP

---

## Problem

Creating and managing crypto bounties is complex — drafting clear scope, funding escrow, verifying work, and releasing payment all require manual coordination across multiple tools. This friction discourages small, quick tasks from being posted as bounties.

## Solution

BountyFlow streamlines the entire bounty lifecycle on Monad:

1. **AI-Assisted Creation** — Describe your task in plain English, and our AI drafts a complete bounty (title, description, skills, reward, deadline). You review and edit before funding.
2. **On-Chain Escrow** — MON is locked in the smart contract when the bounty is created. No trust required.
3. **Simple Lifecycle** — Open → Accept → Submit Proof → Approve & Pay. Five states, no ambiguity.
4. **Trustless Payment** — Creator approves, escrow releases automatically to the worker.

## Features

- ✅ AI-powered bounty drafting from natural language (Qwen 3.6 via Groq)
- ✅ On-chain escrow with MON on Monad Testnet
- ✅ Full bounty lifecycle: Create → Accept → Submit → Approve/Pay → Cancel
- ✅ Role-based actions (creator vs. worker permissions)
- ✅ RESTful API with structured validation
- ✅ CORS-enabled for frontend integration

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────────────┐
│   Frontend   │────▶│   Backend    │────▶│   Groq LLM API     │
│  (React/Vite)│     │  (Flask API) │     │  (qwen/qwen3.6-27b)│
└──────┬───────┘     └──────┬───────┘     └────────────────────┘
       │                    │
       │                    │
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│ Monad Wallet │────▶│ MonadBounty  │
│  (MetaMask)  │     │  Contract    │
└──────────────┘     └──────────────┘
                     Monad Testnet
                     Chain ID: 10143
```

## Testnet Instructions

1. Install [MetaMask](https://metamask.io/) or a compatible browser wallet
2. Add Monad Testnet:
   - **Network Name:** Monad Testnet
   - **RPC URL:** `https://testnet-rpc.monad.xyz`
   - **Chain ID:** `10143`
   - **Currency Symbol:** `MON`
   - **Explorer:** `https://testnet.monadexplorer.com`
3. Get Testnet MON from the [Monad faucet](https://faucet.monad.xyz)

## Local Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- A Groq API key ([console.groq.com](https://console.groq.com))

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
flask --app app run --port 5000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with backend URL and contract address
npm run dev
```

## Environment Variables (by name only)

| Variable | Where | Purpose |
|---|---|---|
| `GROQ_API_KEY` | `backend/.env` | Groq LLM API authentication |
| `VITE_BACKEND_URL` | `frontend/.env` | Backend API base URL |
| `VITE_CONTRACT_ADDRESS` | `frontend/.env` | Deployed MonadBounty contract address |

> ⚠️ **Never commit `.env` files.** Only `.env.example` files with key names belong in Git.

## Deployed Contract

| Item | Value |
|---|---|
| Contract Address | *Pending — Person 1 deployment* |
| Explorer URL | *Pending* |
| Chain | Monad Testnet (10143) |

## Public App URL

*Pending — Person 2 deployment*

## Demo: Five-Step Bounty Lifecycle

1. **Create** — Creator describes task → AI drafts bounty → Creator funds with MON
2. **Accept** — Worker finds open bounty → accepts it (one worker per bounty)
3. **Submit** — Worker completes task → submits proof URL
4. **Approve** — Creator reviews proof → approves → escrow releases MON to worker
5. **Cancel** — Creator can cancel an open bounty before acceptance → MON returned

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check |
| `POST` | `/generate-bounty` | AI-powered bounty draft generation |
| `POST` | `/bounties` | Create a new bounty |
| `GET` | `/bounties` | List bounties (supports `?status=` and `?creator=` filters) |
| `GET` | `/bounties/:id` | Get bounty details |
| `POST` | `/bounties/:id/accept` | Accept an open bounty |
| `POST` | `/bounties/:id/submit` | Submit proof of work |
| `POST` | `/bounties/:id/approve` | Approve and release payment |
| `POST` | `/bounties/:id/cancel` | Cancel an open bounty |

Full API documentation: [`docs/api-docs.md`](docs/api-docs.md)

## Known Limitations

- **Testnet only** — This is a hackathon MVP. Do not use with real MON.
- **Single worker** — Only one worker can accept a bounty (no bidding).
- **No dispute resolution** — Version 1 has no dispute or arbitration mechanism.
- **AI is advisory** — The AI suggests bounty details but the creator always has final authority.
- **No file uploads** — Proof of work is submitted as a URL link only.

## Team

| Role | Person | Responsibility |
|---|---|---|
| Person 1 | Srikar | Smart contract (Solidity, Foundry, Monad deployment) |
| Person 2 | Sandeep | Frontend (React, Vite, wallet integration, UI/UX) |
| Person 3 | Sathvik | AI/Backend (Flask, Groq, API, evidence, README) |

---

> **⚠️ Monad Testnet demo — Testnet MON only.** This is a hackathon project. Do not send real funds.
