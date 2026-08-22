# BountyFlow — Demo Script

> **30+ second walkthrough** for judges and the demo video.
> Two browser windows, two wallets (Creator + Worker).

---

## Pre-Demo Setup
1. Open the live app in **Browser A** (Creator wallet connected)
2. Open the live app in **Browser B / incognito** (Worker wallet connected)
3. Have the Monad Testnet explorer open in a third tab
4. Ensure both wallets have Testnet MON

---

## Demo Flow (target: 45–60 seconds)

### Act 1: AI-Powered Bounty Creation (Browser A — Creator)
1. **Show the empty dashboard** — "No bounties yet"
2. Click **"Create Bounty"**
3. Type a plain-English request: *"Design a landing page for a coffee shop"*
4. Click **"Generate with AI"** → show the AI filling in fields
5. Review the pre-filled form (title, description, skills, reward, deadline)
6. Optionally adjust the reward amount → emphasize "creator has final control"
7. Click **"Fund Bounty"** → confirm in wallet
8. Show the bounty appearing in the list with `Open` status
9. Copy the explorer link → show the transaction on Monad explorer

### Act 2: Worker Accepts & Submits (Browser B — Worker)
10. **Switch to Browser B** — Worker sees the open bounty
11. Click on the bounty → click **"Accept"** → confirm in wallet
12. Status changes to `Accepted`
13. Worker pastes a proof URL (e.g., a GitHub link or design file)
14. Click **"Submit Proof"** → confirm in wallet
15. Status changes to `Submitted`

### Act 3: Creator Approves & Pays (Browser A — Creator)
16. **Switch back to Browser A** — Creator sees `Submitted` status with proof link
17. Click **"Approve & Release Payment"** → confirm in wallet
18. Status changes to `Paid` — MON transferred to worker
19. Show the explorer transaction confirming the payment

### Bonus: Cancel Flow (if time permits)
20. Create a second bounty
21. Cancel it before anyone accepts → show MON returned

---

## Key Talking Points
- "BountyFlow turns a plain-English task into a MON-funded Monad bounty"
- "AI suggests, but the creator always controls the reward"
- "All payments are escrowed on-chain — trustless"
- "Built on Monad Testnet — chain ID 10143"
- "Full lifecycle: create → accept → submit → approve → pay"
