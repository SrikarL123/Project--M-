# BountyFlow — Test Log

> Record of all tests performed. Each entry includes the test, result, and timestamp.

---

## Backend API Tests (Person 3)

### AI Endpoint — `POST /generate-bounty`

| Test Case | Input | Result | Timestamp |
|---|---|---|---|
| Data analysis request | `"Analyze my sales CSV and give five insights."` | ✅ Pass — returned valid JSON with Data category, 24h deadline, 1.0 MON reward | Aug 22, 2026 12:57 PM |
| Design task request | `"Design a landing page for a coffee shop."` | ✅ Pass — returned Design category, 48h deadline, 2.5 MON reward, UI/UX skills | Aug 22, 2026 12:57 PM |
| Content task request | `"Write product descriptions for 20 items."` | ✅ Pass — returned Content category, 48h deadline, 2.5 MON reward, Copywriting skills | Aug 22, 2026 12:59 PM |
| Empty input | `""` | ✅ Pass — returned `"Request cannot be empty"` without calling LLM | Aug 22, 2026 12:59 PM |

**Model:** `qwen/qwen3.6-27b` on Groq  
**Note:** Previous model `llama-3.3-70b-versatile` was deprecated (404). Switched to Qwen 3.6 with `/no_think` directive and robust JSON extraction with retry logic.

### Health Endpoint — `GET /health`

| Test | Result | Timestamp |
|---|---|---|
| Health check | ✅ `{"success":true,"data":{"status":"ok"}}` | Aug 22, 2026 |

### Bounty CRUD Endpoints

| Endpoint | Test | Result | Timestamp |
|---|---|---|---|
| `POST /bounties` | Create bounty with valid data | ✅ Pass | Aug 22, 2026 |
| `GET /bounties` | List all bounties | ✅ Pass | Aug 22, 2026 |
| `GET /bounties` | Filter by `?status=open` | ✅ Pass | Aug 22, 2026 |
| `GET /bounties` | Filter by `?creator=0x...` | ✅ Pass | Aug 22, 2026 |
| `GET /bounties/:id` | Get bounty by ID | ✅ Pass | Aug 22, 2026 |
| `POST /bounties/:id/accept` | Accept open bounty | ✅ Pass | Aug 22, 2026 |
| `POST /bounties/:id/submit` | Submit proof for accepted bounty | ✅ Pass | Aug 22, 2026 |
| `POST /bounties/:id/approve` | Approve submitted bounty (mock) | ✅ Pass | Aug 22, 2026 |
| `POST /bounties/:id/cancel` | Cancel open bounty | ✅ Pass | Aug 22, 2026 |

### Input Validation Tests

| Test | Result |
|---|---|
| Missing required fields | ✅ Returns structured error |
| Empty strings | ✅ Returns structured error |
| Invalid status transitions | ✅ Returns structured error |
| Oversized input (>1000 chars) | ✅ Returns structured error |
| CORS preflight (OPTIONS) | ✅ Correct headers returned |
| Config validation (.env loaded) | ✅ Secrets not hardcoded |

---

## Contract Tests (Person 1 — fill in after testing)

| Category | Required Result | Status |
|---|---|---|
| Creation | Positive reward creates open bounty, records creator, adds escrow | ⬜ Pending |
| Creation rejection | Zero reward or malformed input rejected | ⬜ Pending |
| Acceptance | Second wallet accepts; creator/second worker cannot re-accept | ⬜ Pending |
| Submission | Only accepted worker submits; proof cannot be blank | ⬜ Pending |
| Approval | Only creator approves submitted bounty; worker receives escrow | ⬜ Pending |
| Cancellation | Only creator cancels; only open bounty cancels; escrow returned | ⬜ Pending |
| Invalid transitions | Paid/cancelled bounties cannot be mutated | ⬜ Pending |
| Events | Every action emits the correct event | ⬜ Pending |

---

## Frontend Tests (Person 2 — fill in after testing)

| Test | Expected Result | Status |
|---|---|---|
| Connect wallet (no extension) | Installation explanation shown | ⬜ Pending |
| Connect wallet (wrong network) | Monad Testnet switch prompt | ⬜ Pending |
| Create bounty form validation | Invalid data rejected before wallet | ⬜ Pending |
| Two-wallet lifecycle | Full create → accept → submit → approve → pay | ⬜ Pending |
| Incognito test | App loads, explains Testnet requirement | ⬜ Pending |
