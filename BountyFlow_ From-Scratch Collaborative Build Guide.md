# BountyFlow: From-Scratch Collaborative Build Guide

> **Instructions only.** This guide explains how a three-person team should build the Monad bounty-platform MVP from a blank repository. It does not build, configure, deploy, or modify a project for you.

**Financial-risk note.** A Testnet deployment is the correct hackathon default. Do not deploy to Mainnet, share private keys, or send meaningful MON merely to chase bonus points. A Mainnet deployment is an optional later decision only after the Testnet app is verified, publicly hosted, and independently runnable.

## 1. Start with One Frozen Product Sentence

Before anyone opens an editor, agree on one sentence and paste it at the top of the README, the launch board, and the team chat:

> **BountyFlow lets a creator turn a plain-English task into a MON-funded Monad bounty, lets one worker submit a proof link, and lets the creator release payment from escrow on approval.**

That sentence defines the entire Version 1. The team will not build a marketplace, payments service, token, DAO, social feed, ratings system, dispute system, microtask system, or AI agent network during the first six hours. In particular, do **not** show invented reviews, ratings, testimonials, or user counts. They add legal and judging risk without helping the on-chain demo.

## 2. The One-Hour-First Setup: Repository, Tools, and Agreements

### 2.1 Create a single public monorepo

One repository keeps the README, contract address, deployed site, ABI, and evidence traceable. Do not split the frontend and Solidity into different repositories during a six-hour event.

Use this folder layout:

```text
bountyflow/
├── contracts/                 # Person 1 owns
│   ├── src/
│   │   └── MonadBounty.sol
│   ├── test/
│   ├── script/
│   ├── foundry.toml
│   └── README.md
├── frontend/                  # Person 2 owns
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── lib/
│   │   └── services/
│   └── .env.example
├── backend/                   # Person 3 owns
│   ├── app.py
│   ├── routes/
│   ├── services/
│   ├── prompts/
│   ├── tests/
│   └── requirements.txt
├── shared/
│   └── contract/
│       ├── MonadBounty.abi.json
│       └── deployment.json
├── docs/
│   ├── contract-handoff.md
│   ├── launch-board.md
│   ├── demo-script.md
│   └── test-log.md
├── evidence/
│   └── README.md
├── README.md
├── .gitignore
└── .env.example
```

At the first commit, include only the skeleton folders, README headings, `.gitignore`, `.env.example`, and the three `docs/` files. This makes all handoffs deterministic without forcing anyone to wait.

### 2.2 Set the collaboration rules before building

| Rule | Exact decision |
| --- | --- |
| Default branch | `main` is always the current deployable source. No direct commits. |
| Branch ownership | Person 1 uses `contract/…`; Person 2 uses `web/…`; Person 3 uses `ai-proof/…`. |
| Pull requests | Every PR names its owner, user-visible impact, test performed, and whether a handoff document changed. |
| Authority | The owner of a surface makes the final technical call. The team does not debate a working owner solution for more than five minutes. |
| Integration window | All three pause unrelated work at 1:15 PM, 2:00 PM, 2:45 PM, and 3:15 PM for status gates. |
| Documentation | `docs/launch-board.md` is the only source of truth for final URLs, addresses, screenshots, and social links. |
| Secrets | No private key, seed phrase, API key, password, or host token enters Git, screenshots, chat, or recordings. |

### 2.3 Prepare the tools, without blocking each other

| Person | Install / prepare | Create accounts or browser state | First proof of readiness |
| --- | --- | --- | --- |
| Person 1 | Monad Foundry or a Remix fallback; a browser wallet | Monad Testnet wallet; Testnet faucet funding; explorer account only if needed | One wallet address with Testnet MON and a local test command that runs |
| Person 2 | Node.js, React/Vite, Tailwind CSS, `ethers` v6, browser wallet extension | One creator demo account plus one separate worker demo account | Browser wallet can connect and switch to Monad Testnet |
| Person 3 | Python, virtual environment, Flask, Groq SDK or HTTP client, API key stored locally | AI provider account; chosen public host account; social accounts ready | A local health endpoint responds and an LLM credential is confirmed without exposing it |

Monad Testnet’s current chain ID is **10143** (`0x279F` in hexadecimal), its native symbol is **MON**, and its public explorers include MonadVision and Monadscan. Use the official Testnet page as the source of truth if anything changes on the day. [1]

## 3. The Shared Interface Contract: Freeze It Before Integration

The team needs two agreements: a **Solidity-to-frontend contract** and an **AI-to-form contract**. Write both in `docs/contract-handoff.md` at 12:45 PM. Do not invent fields separately in three places.

### 3.1 On-chain bounty data model

Keep the on-chain model intentionally compact. The human-readable title/description can be emitted or stored as a URI/hash if desired, but the money and permission fields must be on-chain.

| Field | Type concept | Why it exists | Who needs it |
| --- | --- | --- | --- |
| `id` | monotonically increasing number | Stable reference in UI and demo | Everyone |
| `creator` | wallet address | Owns cancellation and approval rights | Contract + frontend |
| `worker` | wallet address or zero address | Records the accepted worker | Contract + frontend |
| `reward` | unsigned integer in wei | Amount held in escrow | Contract + frontend |
| `title` | short string or off-chain reference | Makes the bounty legible | Frontend + README |
| `description` | short string or off-chain reference | Defines scope | Frontend + AI |
| `proofUrl` | string | Worker’s submitted evidence link | Contract + frontend |
| `status` | small enum | Prevents invalid lifecycle transitions | Everyone |

Use exactly five states: `Open`, `Accepted`, `Submitted`, `Paid`, and `Cancelled`. Do not create a sixth “Disputed,” “Expired,” “Pending,” “Completed,” or “Draft” state in Version 1. The browser may have loading/pending transaction UI, but that is not a contract status.

### 3.2 Exact contract actions and permission table

Write the following actions in the handoff document using the final names Person 1 chooses. Person 2 must use these names from the generated ABI; no frontend team member should manually retype an ABI.

| Action | Wallet caller | Required precondition | Result | Test case that must pass |
| --- | --- | --- | --- | --- |
| Create and fund | Creator | A positive `msg.value` is attached | New bounty is `Open`; MON is escrowed | Contract balance increases by reward |
| Accept | Worker | Bounty is `Open`; worker is not creator | Worker is recorded; status becomes `Accepted` | Creator cannot self-accept |
| Submit proof | Accepted worker | Bounty is `Accepted`; proof URL is not empty | Proof stored; status becomes `Submitted` | A different wallet cannot submit |
| Approve and release | Creator | Bounty is `Submitted` | Status becomes `Paid`; escrow transfers to worker | Worker balance increases by reward less any gas paid by worker elsewhere |
| Cancel | Creator | Bounty is `Open` only | Status becomes `Cancelled`; escrow returns to creator | Cancellation fails after acceptance |

The contract must emit one event per state-changing action. Events make the demo, explorer review, and frontend refresh predictable. Suggested event names are `BountyCreated`, `BountyAccepted`, `WorkSubmitted`, `BountyPaid`, and `BountyCancelled`, but freeze the real names at the 12:45 PM checkpoint.

### 3.3 AI-to-form JSON contract

The AI is a convenience layer. It may propose a bounty; it may never choose the final reward, call a wallet, or approve a payment. Person 3 should force structured output with this exact shape:

| Field | Required | Validation on backend | How Person 2 uses it |
| --- | --- | --- | --- |
| `title` | Yes | 8–80 characters | Fills title field |
| `description` | Yes | 30–500 characters; no markdown dependency | Fills task description |
| `skills` | Yes | 1–5 short strings | Displays non-critical tags only |
| `suggestedRewardMon` | Yes | Decimal string inside a safe Testnet display range | Prefills editable reward field; creator must confirm |
| `suggestedDeadlineHours` | Yes | Positive integer, capped at a modest range | Prefills editable deadline text/display |
| `clarifyingQuestion` | Optional | One short question only if input is ambiguous | Shows beneath form, never blocks creation |

Person 3 should test at least three requests: data analysis, design task, and content task. If the output does not reliably validate by **2:00 PM**, remove the AI claim from the final announced feature set and preserve the same manual bounty form. A clean manual flow scores more than a fragile AI feature.

## 4. Person 1: Build the Contract from Scratch

Person 1 owns the money path. Their goal is not clever Solidity; it is a contract whose state machine is obvious, tested, and easy to verify.

### 4.1 Scaffold and configure

1. Create the `contracts/` project with the team’s chosen Solidity toolchain. Prefer Monad Foundry because it runs Monad-native EVM behavior locally and is covered by the official deployment guide. [2]
2. Configure the Testnet RPC URL and chain ID **10143** in the project configuration. Keep provider keys out of source; a public Testnet RPC is sufficient for the hackathon MVP.
3. Create `MonadBounty.sol`, a test file, and a deployment script before writing frontend integration code.
4. Record compiler version, optimizer choice, and constructor arguments in `docs/contract-handoff.md` as soon as they are chosen. These settings are needed later for explorer verification.

Monad differs from Ethereum in several execution details, including transaction charging based on gas limit and reserve-balance behavior. For a simple escrow contract, the practical response is to keep the code small, show transaction-pending and transaction-failed states clearly, and test with adequately funded wallets. [3]

### 4.2 Implement in five vertical slices

Do not write the entire contract and test only at the end. Complete one action and its tests before moving to the next.

| Slice | Build | Test immediately | Do not add yet |
| --- | --- | --- | --- |
| 1 | Bounty storage, ID counter, status enum, create/fund action, creation event | Positive funding succeeds; zero funding fails; bounty fields correct | Deadlines, hashes, fees, admin roles |
| 2 | Accept action and event | Open bounty accepts once; creator self-accept fails; second accept fails | Worker bidding or multiple workers |
| 3 | Submit-proof action and event | Only recorded worker submits; empty link fails; status changes correctly | File uploads or URL verification |
| 4 | Approve/release action and event | Only creator approves; only submitted bounty pays; balance movement correct | Partial payment, fees, automatic release |
| 5 | Cancel/refund action and event | Only creator cancels open bounty; cancellation after accept fails; refund correct | Disputes or emergency admin controls |

For payout/refund safety, structure state changes so the bounty status becomes final before transferring MON, and use a standard re-entrancy guard. Keep external calls limited to the single native-MON transfer in release/refund. Do not add arbitrary callback mechanisms.

### 4.3 Build the test matrix before Testnet deployment

Person 1 should not hand off a contract because it “compiled.” The following row set is the minimum. Put each successful command/test name in `docs/test-log.md`.

| Category | Required result |
| --- | --- |
| Creation | Positive reward creates an open bounty, records creator, and adds escrow value. |
| Creation rejection | Zero reward or malformed required input is rejected. |
| Acceptance | A second wallet accepts an open bounty; creator and second worker cannot accept again. |
| Submission | Only accepted worker submits; submission cannot occur before acceptance; proof cannot be blank. |
| Approval | Only creator approves a submitted bounty; worker receives escrow; status becomes paid. |
| Cancellation | Only creator cancels; only open bounty cancels; creator receives escrow back. |
| Invalid transitions | Paid/cancelled bounties cannot be mutated; accepted bounty cannot be cancelled. |
| Events | Every successful action emits the event the frontend will use or display. |

### 4.4 Testnet deployment and handoff

At 12:45–1:15 PM, deploy the smallest tested contract to Monad Testnet. Use a local encrypted keystore rather than pasting a private key into shell history; this is the approach recommended in Monad’s Foundry guide. [2]

Immediately after deployment, Person 1 must do all of the following before beginning optional work:

1. Copy the deployed address, transaction hash, deployer address, chain ID, ABI path, compiler settings, and source commit into `shared/contract/deployment.json` and `docs/contract-handoff.md`.
2. Export the ABI from the same build that produced the deployment and write it to `shared/contract/MonadBounty.abi.json`.
3. Open the address in the Testnet explorer and confirm the creation transaction points to the expected contract.
4. Send Person 2 one link: the pull request or commit containing the updated ABI, deployment metadata, and handoff document. Do not paste loose ABI blobs in chat.
5. Start source verification on the explorer and record the verified-contract URL once successful.

## 5. Person 2: Build the Elegant Wallet Experience from Scratch

Person 2 owns everything a judge touches. Build against a typed adapter with mock data first, so the interface is demonstrable before the contract deployment handoff arrives.

### 5.1 Scaffold the frontend

1. Create a React + Vite + Tailwind project inside `frontend/`.
2. Install `ethers` v6 for wallet/provider/contract interaction and a compact icon library if desired. Avoid a large wallet toolkit if the team has not used it before.
3. Create the layout first: top navigation, wallet state, main create panel, bounty list, and bounty detail panel. Use a near-black background, violet primary action, restrained cyan success signal, warm white text, rounded panels, and comfortable spacing.
4. Add a visible non-production notice: **“Monad Testnet demo — Testnet MON only.”**

### 5.2 Build the contract adapter before final screens

Create one service module, for example `frontend/src/services/monadBounty.ts`. It is the only frontend location permitted to know the contract address, ABI import, provider, and `ethers` calls. Components call plain adapter methods such as:

| Adapter operation | UI component that calls it | What it returns to the UI |
| --- | --- | --- |
| Connect wallet | Header / wallet button | Address, network status, or actionable error |
| Ensure Monad Testnet | Wallet gate | Correct chain confirmation or switch request |
| Create and fund | Create bounty form | Transaction hash and new bounty ID when confirmed |
| List/read bounties | List and details | Normalized bounty records for display |
| Accept | Bounty detail | Transaction confirmation state |
| Submit proof | Worker proof form | Transaction confirmation state |
| Approve and release | Creator approval panel | Transaction confirmation and explorer link |
| Cancel | Open bounty creator panel | Transaction confirmation and explorer link |

This architecture isolates integration failure. Before Person 1’s handoff, make the adapter return hard-coded mock bounties with the exact same normalized field names. After the handoff, replace adapter internals—not components or UI field names.

### 5.3 Implement user experience in lifecycle order

| Screen/function | Build order | Required user feedback | Acceptance test |
| --- | ---: | --- | --- |
| Wallet header | 1 | Disconnected, wrong network, connecting, connected with shortened address | A new browser sees a clear “Connect wallet” state |
| Create bounty form | 2 | Validates title/description/reward; shows editable AI draft; says “Fund with MON” | Creator can enter valid data without a wallet connected, then is gated before send |
| Create transaction state | 3 | “Confirm in wallet,” “Funding bounty,” “Confirmed,” explorer link, failure text | Real Testnet create/fund works by 2:00 PM |
| Bounty list | 4 | Open/accepted/submitted/paid/cancelled status pill, reward, short title | Refetch/render displays the newly created bounty |
| Bounty detail | 5 | Creator/worker addresses, proof link, next available action only | Screen changes action based on connected address and status |
| Worker accept and proof submit | 6 | One button at a time; proof URL field validates | Worker completes accept then submit using a separate wallet |
| Creator approval/cancel | 7 | Makes irreversible action explicit; offers explorer link after confirmation | Creator pays worker after proof; can cancel only prior to acceptance |

Do not give every user every button. The detail screen should compute the one valid next action from three facts: the bounty’s status, the connected wallet address, and the bounty creator/worker addresses.

### 5.4 Add defensive transaction handling

For every contract write, Person 2 should apply this repeatable routine:

1. Verify an injected wallet exists; otherwise show an installation/use-browser explanation.
2. Verify the network is Monad Testnet; if not, request a switch using chain ID `0x279F`.
3. Validate local form values before opening the wallet.
4. Disable the action after the transaction is sent; do not permit duplicate submits.
5. Wait for confirmation, then re-read the relevant bounty state.
6. Present the final transaction hash as an explorer link.
7. On rejection, wrong network, insufficient Testnet MON, or RPC failure, show an actionable message, not “error.”

For the happy-path demo, do not depend on historical RPC queries or complicated background indexing. Read the known bounty ID and current contract state directly. Monad notes that arbitrary historical state is not generally available on full nodes because of high throughput. [3]

## 6. Person 3: Build the AI/Backend and Submission-Proof System

Person 3’s first priority is a narrow, reliable endpoint and the team’s evidence. The goal is **not** an impressive autonomous agent; the goal is that a common request instantly becomes a form-ready draft.

### 6.1 Scaffold the backend

1. Create the Python virtual environment and install Flask, the LLM client, CORS middleware, validation library, and test tooling inside `backend/`.
2. Create one public health route and one generation route. Do not expose provider secrets to the browser.
3. Put the provider secret in a local ignored environment file; put only key names and blank examples in `.env.example`.
4. Add a README subsection explaining that AI suggestions are editable and do not control funds.

### 6.2 Define the only required endpoint

| Endpoint | Request | Response | Validation requirement |
| --- | --- | --- | --- |
| `POST /generate-bounty` | `{ "request": "plain-English task" }` | The agreed structured JSON draft | Reject blank/oversized input; validate every response field before returning it |
| `GET /health` | No body | `{ "status": "ok" }` | Used only for hosting/integration diagnostics |

The model prompt should tell the model that it is a **bounty drafting assistant**, that it must return one strict JSON object with no surrounding prose, must avoid unrealistic reward claims, and must leave payment authority with the human creator. Backend validation is mandatory even if the model claims to return JSON. If parsing or validation fails, return a friendly error and keep the frontend manual fields intact.

### 6.3 Test the AI in a way that protects the MVP

| Test request | Expected output behavior | Failure response |
| --- | --- | --- |
| “Analyze my sales CSV and give five insights.” | Data-analysis title, concise scope, Python/Pandas-style skills, modest suggested reward | Record prompt failure; do not expose malformed result to UI |
| “Design a landing page for a coffee shop.” | Design-focused title, deliverables, design/tool skills | Ensure it does not produce a pretend portfolio or user testimonial |
| “Write product descriptions for 20 items.” | Content task title, structured scope, realistic deadline suggestion | Ensure response stays within size bounds |
| Empty or nonsensical input | Clear validation message | Do not call expensive model unnecessarily |

At 1:45 PM, Person 3 connects this route to Person 2’s form. The frontend should call the endpoint, show a brief loading state, place valid fields into editable inputs, and keep the manual form fully usable if the endpoint is down. At 2:00 PM, make the irreversible scope decision: either AI is an announced working feature or it disappears from the public feature list.

### 6.4 Own the README, launch board, and proof bundle from the beginning

Person 3 creates `docs/launch-board.md` with this table before work begins:

| Evidence item | Canonical URL/file | Owner | Captured/tested at | Status |
| --- | --- | --- | --- | --- |
| Public repository | Pending | Person 3 | — | Red |
| Live app | Pending | Person 2 | — | Red |
| Testnet contract | Pending | Person 1 | — | Red |
| Verified contract | Pending | Person 1 | — | Red |
| Deployment transaction | Pending | Person 1 | — | Red |
| README independent-run test | Pending | Person 3 | — | Red |
| Announcement post | Pending | Person 3 | — | Red |
| 30+ second demo video | Pending | Person 3 | — | Red |
| Creative ad video | Pending | Person 3 | — | Red |
| Outside-user/waitlist evidence | Pending | Person 3 | — | Red |

The main README should have the following minimum sections: problem, solution, exact feature list, architecture, Testnet instructions, local setup, environment keys by name only, deployed contract address, verified explorer URL, public app URL, five-step demo, known limitations, and team roles. That README is both a 25-point rubric item and a judge’s recovery guide if the team is nervous during the demo.

## 7. The Four Integration Checkpoints

### Checkpoint A — 12:45 PM: Field names and surface area freeze

Person 1 publishes the status enum, exact action/event names, normalized bounty fields, and expected errors. Person 2 confirms the frontend mock adapter uses those field names. Person 3 confirms the AI schema maps only into form fields, never into contract-only values like addresses or status. The team may change wording, but not state transitions or fields without a three-person decision.

### Checkpoint B — 1:15 PM: ABI/address handoff

Person 1 deploys the tested candidate to Testnet and commits the ABI plus deployment metadata. Person 2 imports that shared ABI and plugs the address into the single adapter configuration location. Person 3 updates the launch board. The front end must display the same address that appears on the explorer. If any one of the three locations disagrees, fix it immediately.

### Checkpoint C — 2:00 PM: First live funding transaction

The creator wallet creates and funds a real Testnet bounty through the hosted/local frontend. Person 1 opens the transaction on the explorer. Person 2 confirms the list/detail screen reads the real bounty state. Person 3 records the transaction URL and captures an evidence screenshot. If AI is not stable, remove it now without debate.

### Checkpoint D — 2:45 PM: Full two-wallet walk-through

Using a separate worker wallet, the team performs: create/fund → accept → submit proof URL → approve/release. Then it creates a second bounty and demonstrates cancel-before-acceptance. Both flows must work from the same public app build and current contract address. When this is green, release the 3:15 PM MVP freeze.

## 8. Test Like a Judge, Not Like a Builder

At least one person outside the build team should run the app and README at 3:15–4:00 PM. The team must remain silent unless the reader asks a question. Log every point of confusion in `docs/test-log.md`, fix only critical clarity issues, and rerun the test.

| Judge action | Expected result | Owner if it fails |
| --- | --- | --- |
| Opens public repo | README is understandable and no secret is visible | Person 3 |
| Opens live URL in incognito | App loads and immediately explains Testnet/wallet requirement | Person 2 |
| Connects wallet on wrong network | Clear Monad Testnet switch path appears | Person 2 |
| Creates bounty | Wallet sends MON; contract and UI confirm bounty | Person 1 + Person 2 |
| Opens explorer link | Correct Testnet contract/transaction is visible | Person 1 |
| Uses second wallet | Only valid worker actions appear | Person 2 |
| Submits proof then creator approves | Worker receives escrowed MON | Person 1 + Person 2 |
| Follows README locally | Steps work without developer narration | Person 3 |

## 9. What to Do When Integration Breaks

The purpose of the adapter, mock data, structured handoff, and small contract is to make recovery fast. Declare the failure early and choose the matching path; do not let all three team members debug the same unknown problem.

| Symptom | First diagnosis | Owner | Recovery path |
| --- | --- | --- | --- |
| Frontend renders mock data but cannot call contract | ABI/address/network mismatch | Person 1 checks handoff; Person 2 checks adapter | Compare chain ID, explorer address, ABI source, and payable value conversion; fix only one source of truth |
| Wallet transaction fails before confirmation | Wrong network, no Testnet MON, invalid form type | Person 2 | Switch network, fund from faucet, validate required input; retry with one known small demo bounty |
| Transaction confirms but UI does not update | Read function/normalization/state refresh issue | Person 2 | Re-read the known bounty ID after confirmation; do not rely on event indexer during MVP |
| Payment/release reverts | State/permission logic violation | Person 1 | Reproduce with the two test wallets, inspect current status, and run contract tests; do not patch UI to hide it |
| AI returns invalid result | Model output or backend validation issue | Person 3 | Keep manual form active; retry once with strict structured prompt; remove AI feature claim at 2:00 PM if unreliable |
| Public host is unavailable | Environment/configuration/deploy problem | Person 2 | Deploy the last known-good build to a preselected backup host; retest incognito |

## 10. Definition of Done at 3:15 PM

The MVP is done only when all three answers are **yes**:

| Owner | Completion question | Evidence |
| --- | --- | --- |
| Person 1 | “Does MON enter and leave the contract correctly, only through valid states?” | Tests, Testnet address, creation/release/refund transactions, verified source process underway |
| Person 2 | “Can a new user complete the whole bounty workflow without editing code?” | Two-wallet walkthrough from the public app, incognito test, clear wallet states |
| Person 3 | “Can a plain-English request become a valid editable bounty draft, or have we explicitly removed that claim?” | Validated endpoint test or scoped-out AI, README, launch board, screenshots |

If any answer is no, every team member helps make it yes. No Version 2 begins. Only after all answers are yes should the team add low-risk polish such as a clearer status timeline, a concise product video, or a custom domain. Do **not** add microtasks, ratings, worker dashboards, tokens, or Mainnet while required scoring artifacts are still red.

## 11. Final Scoring Workflow

The rubric in the team brief rewards public proof. Work backward from the 5:45 PM lock rather than from the codebase.

| By when | Required action | Owner | Rubric protected |
| --- | --- | --- | --- |
| **2:45 PM** | Testnet contract exists; create/fund is real | Person 1 | Testnet deployment, live-transaction readiness |
| **3:15 PM** | Function scope frozen; two-wallet lifecycle works | All | All announced functions work |
| **4:00 PM** | Contract source is verified; non-builder follows README | Person 1 + Person 3 | Verified contract, independent run |
| **4:30 PM** | Public repository and hosted URL work in incognito | Person 2 + Person 3 | GitHub, README, hosting |
| **5:00 PM** | Social post, 30+ second demo video, creative ad, and evidence captured | Person 3 | Virality points |
| **5:15 PM** | Final demo rehearsal; browser tabs open for repo, live app, contract, deployment | All | Live demonstration |
| **5:35 PM** | Final submission form checked against launch board | Person 3; all verify | No missing links or stale screenshots |
| **Before 5:45 PM** | Submit all links/evidence | Person 3 | Entire score is eligible |

## 12. Official References

[1] [Monad Testnet Network Information](https://docs.monad.xyz/developer-essentials/testnets)

[2] [Deploy a Smart Contract on Monad using Monad Foundry](https://docs.monad.xyz/guides/deploy-smart-contract/foundry)

[3] [Differences between Monad and Ethereum](https://docs.monad.xyz/developer-essentials/differences)

[4] [Monad Tooling and Infrastructure](https://docs.monad.xyz/tooling-and-infra/)
