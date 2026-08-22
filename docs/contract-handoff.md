# BountyFlow — Contract Handoff Document

> **Freeze at 12:45 PM.** This document defines the shared interface contract between all three team members. Do not invent fields separately.

---

## 1. On-Chain Bounty Data Model

| Field | Type Concept | Why It Exists | Who Needs It |
|---|---|---|---|
| `id` | Monotonically increasing number | Stable reference in UI and demo | Everyone |
| `creator` | Wallet address | Owns cancellation and approval rights | Contract + Frontend |
| `worker` | Wallet address or zero address | Records the accepted worker | Contract + Frontend |
| `reward` | Unsigned integer in wei | Amount held in escrow | Contract + Frontend |
| `title` | Short string or off-chain reference | Makes the bounty legible | Frontend + README |
| `description` | Short string or off-chain reference | Defines scope | Frontend + AI |
| `proofUrl` | String | Worker's submitted evidence link | Contract + Frontend |
| `status` | Small enum | Prevents invalid lifecycle transitions | Everyone |

### Status Enum (exactly 5 states)
```
Open → Accepted → Submitted → Paid
Open → Cancelled
```

**No sixth state.** No "Disputed", "Expired", "Pending", "Completed", or "Draft".

---

## 2. Contract Actions and Permission Table

| Action | Wallet Caller | Required Precondition | Result | Test Case That Must Pass |
|---|---|---|---|---|
| Create and fund | Creator | Positive `msg.value` attached | New bounty is `Open`; MON escrowed | Contract balance increases by reward |
| Accept | Worker | Bounty is `Open`; worker ≠ creator | Worker recorded; status → `Accepted` | Creator cannot self-accept |
| Submit proof | Accepted worker | Bounty is `Accepted`; proof URL not empty | Proof stored; status → `Submitted` | Different wallet cannot submit |
| Approve and release | Creator | Bounty is `Submitted` | Status → `Paid`; escrow → worker | Worker balance increases by reward |
| Cancel | Creator | Bounty is `Open` only | Status → `Cancelled`; escrow → creator | Cancellation fails after acceptance |

### Events (one per state-changing action)
| Event Name | Emitted By |
|---|---|
| `BountyCreated` | Create and fund |
| `BountyAccepted` | Accept |
| `WorkSubmitted` | Submit proof |
| `BountyPaid` | Approve and release |
| `BountyCancelled` | Cancel |

> **Note:** Final event names are frozen by Person 1 at Checkpoint A (12:45 PM).

---

## 3. AI-to-Form JSON Contract

The AI is a convenience layer. It may propose a bounty; it **never** chooses the final reward, calls a wallet, or approves a payment.

### Response Schema from `POST /generate-bounty`

```json
{
  "title": "string (8-80 chars)",
  "description": "string (30-500 chars, no markdown)",
  "skills": ["1-5 short skill tag strings"],
  "reward": 1.0,
  "deadline": 24,
  "category": "one of: Frontend|Backend|Design|Data|Content|Smart Contract|DevOps|Mobile|Other",
  "difficulty": "one of: Easy|Medium|Hard"
}
```

| Field | Required | Validation on Backend | How Person 2 Uses It |
|---|---|---|---|
| `title` | Yes | 8–80 characters | Fills title field |
| `description` | Yes | 30–500 characters; no markdown | Fills task description |
| `skills` | Yes | 1–5 short strings | Displays non-critical tags |
| `reward` | Yes | Number in 0.01–10.0 MON range | Prefills **editable** reward field; creator must confirm |
| `deadline` | Yes | Integer 1–168 (hours) | Prefills **editable** deadline |
| `category` | Yes | One of 9 valid categories | Prefills category selector |
| `difficulty` | Yes | One of: Easy, Medium, Hard | Prefills difficulty selector |

---

## 4. Deployment Details (Person 1 fills after deploy)

| Item | Value |
|---|---|
| Contract Name | `MonadBounty` |
| Compiler Version | |
| Optimizer | |
| Constructor Arguments | |
| Deployed Address | |
| Deployment Tx Hash | |
| Deployer Address | |
| Chain ID | `10143` (Monad Testnet) |
| ABI Path | `shared/contract/MonadBounty.abi.json` |
| Source Commit | |
