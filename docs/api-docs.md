# BountyFlow Backend API Documentation

> **Base URL:** `http://localhost:5000` (dev) — production URL TBD after hosting.

## Response Format

All endpoints return a consistent JSON structure.

**Success:**
```json
{
  "success": true,
  "data": {},
  "message": "Human-readable success message"
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

## Endpoints

### `GET /health`

Health check for hosting and integration diagnostics.

**Response (`200`):**
```json
{
  "success": true,
  "data": { "status": "ok" },
  "message": "Server is running"
}
```

---

### `POST /generate-bounty`

Generate a structured bounty draft from a plain-English task description using AI.

**Request:**
```json
{
  "request": "Analyze my sales CSV and give five insights."
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `request` | string | Yes | 1–1000 characters, not blank |

**Success Response (`200`):**
```json
{
  "success": true,
  "data": {
    "title": "Sales Data Analysis and Insights Report",
    "description": "Analyze the provided sales CSV dataset using Python and Pandas to identify trends and five actionable business insights.",
    "skills": ["Python", "Pandas", "Data Analysis", "Data Visualization"],
    "reward": 1.0,
    "deadline": 48,
    "category": "Data",
    "difficulty": "Medium"
  },
  "message": "Bounty draft generated successfully"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | 8–80 chars |
| `description` | string | 30–500 chars, plain text |
| `skills` | string[] | 1–5 skill tags |
| `reward` | number | Suggested MON reward (0.01–10.0) |
| `deadline` | integer | Suggested deadline in hours (1–168) |
| `category` | string | One of: Frontend, Backend, Design, Data, Content, Smart Contract, DevOps, Mobile, Other |
| `difficulty` | string | One of: Easy, Medium, Hard |

---

### `POST /bounties`

Create a new bounty.

**Request:**
```json
{
  "title": "Build a React Landing Page",
  "description": "Create a modern, responsive landing page with animations and dark mode support.",
  "skills": ["React", "Tailwind"],
  "reward": 5.0,
  "deadline": 24,
  "category": "Frontend",
  "difficulty": "Medium",
  "creator": "0x1234567890abcdef1234567890abcdef12345678"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `title` | string | Yes | 8–80 characters |
| `description` | string | Yes | 30–500 characters |
| `skills` | string[] | No | Up to 5 tags |
| `reward` | number | Yes | Greater than 0 (MON) |
| `deadline` | integer | No | 1–168 hours (default: 48) |
| `category` | string | No | Default: "Other" |
| `difficulty` | string | No | Default: "Medium" |
| `creator` | string | Yes | Valid 0x Ethereum address (42 chars) |

**Success Response (`201`):**
```json
{
  "success": true,
  "data": {
    "id": 0,
    "title": "Build a React Landing Page",
    "description": "...",
    "skills": ["React", "Tailwind"],
    "reward": 5.0,
    "rewardWei": "5000000000000000000",
    "deadline": 24,
    "category": "Frontend",
    "difficulty": "Medium",
    "creator": "0x1234...",
    "worker": null,
    "proofUrl": null,
    "status": 0,
    "statusLabel": "Open",
    "createdAt": 1724312345,
    "updatedAt": 1724312345,
    "transactionHash": "0xa1b2c3..."
  },
  "message": "Bounty created successfully"
}
```

---

### `GET /bounties`

List all bounties, newest first.

**Query Parameters (optional):**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status: Open, Accepted, Submitted, Paid, Cancelled |
| `creator` | string | Filter by creator address |

**Success Response (`200`):**
```json
{
  "success": true,
  "data": [ { "id": 0, "title": "...", ... } ],
  "message": "Found 3 bounties"
}
```

---

### `GET /bounties/:id`

Get a single bounty by ID.

**Success Response (`200`):**
```json
{
  "success": true,
  "data": { "id": 0, "title": "...", "statusLabel": "Open", ... },
  "message": ""
}
```

**Error (`404`):**
```json
{
  "success": false,
  "error": "Bounty 99 not found"
}
```

---

### `POST /bounties/:id/accept`

Worker accepts an open bounty.

**Request:**
```json
{
  "worker": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
}
```

**Rules:**
- Bounty must be `Open`
- Worker cannot be the creator (no self-accept)

---

### `POST /bounties/:id/submit`

Worker submits proof of completed work.

**Request:**
```json
{
  "proofUrl": "https://github.com/user/repo/pull/1",
  "worker": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
}
```

**Rules:**
- Bounty must be `Accepted`
- Only the accepted worker can submit
- proofUrl cannot be empty

---

### `POST /bounties/:id/approve`

Creator approves the submission and releases escrow.

**Request:**
```json
{
  "creator": "0x1234567890abcdef1234567890abcdef12345678"
}
```

**Rules:**
- Bounty must be `Submitted`
- Only the bounty creator can approve

---

### `POST /bounties/:id/cancel`

Creator cancels an open bounty (escrow refunded).

**Request:**
```json
{
  "creator": "0x1234567890abcdef1234567890abcdef12345678"
}
```

**Rules:**
- Bounty must be `Open` (cannot cancel after acceptance)
- Only the bounty creator can cancel

---

## Bounty Lifecycle

```
Open → Accepted → Submitted → Paid
  ↓
Cancelled
```

Only 5 states. No "Disputed", "Expired", "Draft", or "Pending".

---

## Status Codes

| Status | Meaning |
|--------|---------|
| 0 | Open |
| 1 | Accepted |
| 2 | Submitted |
| 3 | Paid |
| 4 | Cancelled |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key for LLM calls (required for `/generate-bounty`) |
| `CONTRACT_ADDRESS` | Deployed MonadBounty contract address (added after Srikar's handoff) |

---

## Integration Notes for Frontend (Sandeep)

1. **AI is optional.** If `/generate-bounty` errors, the manual bounty form must remain fully usable.
2. **All AI fields are editable.** Never auto-submit a bounty from AI output.
3. **Check `success` field** in every response to determine success/failure.
4. **CORS is enabled** — call from any origin during development.
5. **Bounty actions are role-based** — show only the valid next action based on connected wallet + bounty status.
