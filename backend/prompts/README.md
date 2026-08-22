# Backend Prompts

This directory holds prompt templates for the AI bounty generation system.

## Current Prompt

The system prompt is defined inline in `backend/services/ai_service.py`.
It instructs the Qwen 3.6 model to act as a bounty drafting assistant that returns
strict JSON output matching the AI-to-form contract.

## Key Design Decisions

- **`/no_think` directive** — Suppresses Qwen 3's reasoning/thinking mode to save tokens
- **Strict JSON schema** — 7 required fields with validation constraints
- **Safety rules** — Model cannot claim to control funds or approve payments
- **Testnet awareness** — Rewards are capped at 0.01–10.0 MON for Testnet realism
