import ABI from "./abi.js";
import { CONTRACT_ADDRESS, BACKEND_URL, MONAD_TESTNET } from "./contract-config.js";
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.15.0/+esm";

let provider = null;
let signer = null;
let contract = null;
let currentAccount = null;

const connectButton = document.getElementById("connectWallet");
const walletStatus = document.getElementById("walletStatus");
const bountyForm = document.getElementById("bountyForm");
const transactionStatus = document.getElementById("transactionStatus");
const bountiesContainer = document.getElementById("bounties");
const refreshButton = document.getElementById("refreshBounties");
const aiGenerateBtn = document.getElementById("aiGenerateBtn");
const aiPromptInput = document.getElementById("aiPrompt");
const aiStatus = document.getElementById("aiStatus");


// ================================
// AI BOUNTY GENERATION
// ================================

async function generateWithAI() {
    if (!aiPromptInput || !aiGenerateBtn) return;

    const prompt = aiPromptInput.value.trim();

    if (!prompt) {
        if (aiStatus) aiStatus.textContent = "Please describe your task first.";
        return;
    }

    aiGenerateBtn.disabled = true;
    aiGenerateBtn.textContent = "⏳ Generating...";
    if (aiStatus) aiStatus.textContent = "AI is drafting your bounty...";

    try {
        const endpoints = BACKEND_URL
            ? [`${BACKEND_URL}/generate-bounty`]
            : [
                "/api/generate_bounty",
                "/api/generate-bounty",
                "/generate-bounty"
              ];

        let response = null;
        let lastError = null;

        for (const endpoint of endpoints) {
            try {
                const res = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        request: prompt
                    })
                });

                if (res.status !== 404) {
                    response = res;
                    break;
                }
            } catch (err) {
                lastError = err;
            }
        }

        if (!response) {
            throw new Error(
                lastError?.message ||
                "AI endpoint not found (HTTP 404). Please ensure the latest code is deployed on Vercel."
            );
        }

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.success) {
            throw new Error(
                result.error ||
                `AI service error (HTTP ${response.status}). If deployed on Vercel, ensure GROQ_API_KEY is configured in Environment Variables.`
            );
        }

        const draft = result.data;

        // Fill form fields with AI response
        if (draft.title) {
            document.getElementById("title").value = draft.title;
        }

        if (draft.description) {
            document.getElementById("description").value = draft.description;
        }

        if (draft.reward) {
            document.getElementById("reward").value = draft.reward;
        }

        // Set deadline to suggested hours from now
        if (draft.deadline) {
            const deadlineDate = new Date(
                Date.now() + draft.deadline * 60 * 60 * 1000
            );
            const iso = deadlineDate.toISOString().slice(0, 16);
            document.getElementById("deadline").value = iso;
        }

        if (aiStatus) {
            aiStatus.textContent =
                `✅ Draft ready! Category: ${draft.category || "Other"} · ` +
                `Difficulty: ${draft.difficulty || "Medium"} · ` +
                `Skills: ${(draft.skills || []).join(", ")}. ` +
                `Review and edit below, then create.`;
        }

    } catch (error) {
        console.error("AI generation error:", error);
        if (aiStatus) {
            aiStatus.textContent =
                `❌ ${error.message || "Could not reach AI service. You can still fill the form manually."}`;
        }
    } finally {
        aiGenerateBtn.disabled = false;
        aiGenerateBtn.textContent = "✨ Generate with AI";
    }
}


// ================================
// CONNECT / CHANGE WALLET
// ================================

async function connectWallet() {
    if (!window.ethereum) {
        alert("Please install MetaMask or another EVM wallet to connect.");
        if (transactionStatus) {
            transactionStatus.textContent = "MetaMask not detected. Please install a Web3 wallet.";
        }
        return;
    }

    try {
        let accounts = [];

        // If wallet is already connected, prompt MetaMask permission popup to pick another account
        if (currentAccount) {
            if (transactionStatus) {
                transactionStatus.textContent = "Select an account in MetaMask...";
            }

            try {
                const permissions = await window.ethereum.request({
                    method: "wallet_requestPermissions",
                    params: [{ eth_accounts: {} }]
                });

                const accountsPermission = permissions.find(
                    (p) => p.parentCapability === "eth_accounts"
                );

                if (accountsPermission && accountsPermission.caveats) {
                    const caveat = accountsPermission.caveats.find(
                        (c) => c.type === "filterResponse"
                    );
                    if (caveat && Array.isArray(caveat.value) && caveat.value.length > 0) {
                        accounts = caveat.value;
                    }
                }
            } catch (permErr) {
                console.log("Permission modal closed or falling back:", permErr);
            }
        }

        // Standard fetch for active accounts if permissions didn't directly return it
        if (!accounts || accounts.length === 0) {
            if (transactionStatus) {
                transactionStatus.textContent = "Connecting to MetaMask...";
            }
            accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
        }

        if (!accounts || accounts.length === 0) {
            throw new Error("No wallet account selected.");
        }

        currentAccount = accounts[0];

        // Switch to Monad Testnet
        await switchToMonad();

        // Create ethers provider & signer
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();

        // Connect contract
        contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            ABI,
            signer
        );

        window.bountyContract = contract;

        if (walletStatus) {
            walletStatus.innerHTML = `Connected: <strong>${shortAddress(currentAccount)}</strong> <span style="font-size:12px; color:#888;">(${currentAccount})</span>`;
        }

        if (connectButton) {
            connectButton.textContent = "Change Wallet";
        }

        if (transactionStatus) {
            transactionStatus.textContent = `Wallet connected: ${shortAddress(currentAccount)}`;
        }

        await loadBounties();

    } catch (error) {
        console.error("Wallet connection error:", error);
        if (transactionStatus) {
            transactionStatus.textContent = getErrorMessage(error);
        }
    }
}


// ================================
// SWITCH TO MONAD TESTNET
// ================================

async function switchToMonad() {
    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [
                {
                    chainId: MONAD_TESTNET.chainId
                }
            ]
        });
    } catch (error) {
        // Chain doesn't exist in MetaMask (error code 4902 or unrecognized chain)
        const isChainMissing =
            error.code === 4902 ||
            error.code === -32603 ||
            (error?.message && error.message.toLowerCase().includes("unrecognized")) ||
            (error?.data?.originalError?.code === 4902);

        if (isChainMissing) {
            await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                    MONAD_TESTNET
                ]
            });
        } else {
            throw error;
        }
    }
}


// ================================
// CREATE BOUNTY (CLIENT / CREATOR)
// ================================

async function createBounty(event) {
    event.preventDefault();

    if (!contract) {
        alert("Connect your wallet first.");
        return;
    }

    try {
        const title = document.getElementById("title").value.trim();
        const description = document.getElementById("description").value.trim();
        const reward = document.getElementById("reward").value.trim();
        const deadlineInput = document.getElementById("deadline").value;

        if (!title || !description || !reward || !deadlineInput) {
            alert("Please fill in all fields.");
            return;
        }

        const deadline = Math.floor(
            new Date(deadlineInput).getTime() / 1000
        );

        if (deadline <= Math.floor(Date.now() / 1000)) {
            alert("Deadline must be in the future.");
            return;
        }

        if (transactionStatus) {
            transactionStatus.textContent = "Confirm bounty creation in MetaMask...";
        }

        const tx = await contract.createBounty(
            title,
            description,
            deadline,
            {
                value: ethers.parseEther(reward)
            }
        );

        if (transactionStatus) {
            transactionStatus.textContent = "Transaction submitted. Waiting for confirmation on Monad...";
        }

        await tx.wait();

        if (transactionStatus) {
            transactionStatus.textContent = "✅ Bounty created & funded on Monad Testnet!";
        }

        bountyForm.reset();
        await loadBounties();

    } catch (error) {
        console.error("Create bounty error:", error);
        if (transactionStatus) {
            transactionStatus.textContent = getErrorMessage(error);
        }
    }
}


// ================================
// LOAD BOUNTIES
// ================================

async function loadBounties() {
    if (!contract) {
        if (bountiesContainer) {
            bountiesContainer.innerHTML = "<p>Connect your wallet to view bounties.</p>";
        }
        return;
    }

    try {
        const count = await contract.getBountyCount();
        const bountyCount = Number(count);

        if (bountyCount === 0) {
            bountiesContainer.innerHTML = "<p>No bounties created yet. Be the first to create one!</p>";
            return;
        }

        bountiesContainer.innerHTML = "";

        for (let i = 0; i < bountyCount; i++) {
            const bounty = await contract.getBounty(i);
            renderBounty(bounty);
        }

    } catch (error) {
        console.error("Load bounties error:", error);
        if (bountiesContainer) {
            bountiesContainer.innerHTML = "<p>Unable to load bounties.</p>";
        }
    }
}


// ================================
// RENDER BOUNTY CARD (ROLE-AWARE)
// ================================

function renderBounty(bounty) {
    const card = document.createElement("div");
    card.className = "bounty-card";

    const id = Number(bounty.id);
    const client = bounty.client;
    const developer = bounty.developer;
    const title = bounty.title;
    const description = bounty.description;
    const reward = ethers.formatEther(bounty.reward);
    const deadline = new Date(Number(bounty.deadline) * 1000).toLocaleString();
    const submission = bounty.submission;
    const status = Number(bounty.status);

    const isClient = currentAccount && client.toLowerCase() === currentAccount.toLowerCase();
    const isDeveloper = currentAccount && developer.toLowerCase() === currentAccount.toLowerCase();
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const hasDeveloper = developer && developer.toLowerCase() !== zeroAddress;

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; gap:10px;">
            <h3 style="margin:0; font-size:18px;">#${id} — ${escapeHTML(title)}</h3>
            <span class="status-badge status-${formatStatus(status).toLowerCase()}">${formatStatus(status)}</span>
        </div>
        <p style="margin-bottom:12px; color:#ccc; line-height:1.5;">${escapeHTML(description)}</p>
        <p><strong>Reward:</strong> <span style="color:#60a5fa; font-weight:bold;">${reward} MON</span></p>
        <p><strong>Creator (Client):</strong> ${shortAddress(client)} ${isClient ? '<span style="color:#22c55e; font-weight:bold; margin-left:6px;">(You)</span>' : ''}</p>
        <p><strong>Worker (Developer):</strong> ${hasDeveloper ? shortAddress(developer) : '<span style="color:#777;">None yet</span>'} ${isDeveloper ? '<span style="color:#a855f7; font-weight:bold; margin-left:6px;">(You)</span>' : ''}</p>
        <p><strong>Deadline:</strong> ${deadline}</p>
        ${
            submission
                ? `<p style="margin-top:10px;"><strong>Proof Submission:</strong> <a href="${escapeHTML(submission)}" target="_blank" rel="noopener noreferrer" style="color:#a855f7; text-decoration:underline;">${escapeHTML(submission)} ↗</a></p>`
                : ""
        }
    `;

    const actionsDiv = document.createElement("div");
    actionsDiv.style.marginTop = "16px";
    actionsDiv.style.display = "flex";
    actionsDiv.style.gap = "10px";
    actionsDiv.style.flexWrap = "wrap";

    // 1. SUBMIT WORK (for any worker wallet who is NOT the creator)
    if (status === 0 && !isClient && currentAccount) {
        const submitButton = document.createElement("button");
        submitButton.textContent = "📥 Submit Work (as Worker)";
        submitButton.style.background = "#7c3aed";
        submitButton.onclick = () => submitWork(id);
        actionsDiv.appendChild(submitButton);
    }

    // 2. APPROVE SUBMISSION (for Creator only when work is submitted)
    if (status === 1 && isClient) {
        const approveButton = document.createElement("button");
        approveButton.textContent = "✅ Approve & Release MON (as Creator)";
        approveButton.style.background = "#16a34a";
        approveButton.onclick = () => approveSubmission(id);
        actionsDiv.appendChild(approveButton);
    }

    // 3. CANCEL BOUNTY (for Creator only when bounty is still open)
    if (status === 0 && isClient) {
        const cancelButton = document.createElement("button");
        cancelButton.textContent = "❌ Cancel Bounty & Refund MON";
        cancelButton.style.background = "#dc2626";
        cancelButton.onclick = () => cancelBounty(id);
        actionsDiv.appendChild(cancelButton);
    }

    if (actionsDiv.children.length > 0) {
        card.appendChild(actionsDiv);
    } else if (status === 1 && !isClient) {
        const notice = document.createElement("p");
        notice.style.color = "#eab308";
        notice.style.fontSize = "13px";
        notice.style.marginTop = "12px";
        notice.textContent = isDeveloper
            ? "⏳ You submitted work! Awaiting creator approval to release MON."
            : "⏳ Work submitted. Awaiting creator approval.";
        card.appendChild(notice);
    } else if (status === 0 && isClient) {
        const notice = document.createElement("p");
        notice.style.color = "#888";
        notice.style.fontSize = "13px";
        notice.style.marginTop = "12px";
        notice.textContent = "💡 Switch to a different wallet in MetaMask to submit work as a worker.";
        card.appendChild(notice);
    }

    bountiesContainer.appendChild(card);
}


// ================================
// SUBMIT WORK (WORKER)
// ================================

async function submitWork(bountyId) {
    const submission = prompt("Enter your proof URL (e.g. GitHub repo, PR, or live demo link):");

    if (!submission || !submission.trim()) {
        return;
    }

    try {
        if (transactionStatus) {
            transactionStatus.textContent = "Confirm submission in MetaMask...";
        }

        const tx = await contract.submitWork(bountyId, submission.trim());

        if (transactionStatus) {
            transactionStatus.textContent = "Submitting work to Monad Testnet...";
        }

        await tx.wait();

        if (transactionStatus) {
            transactionStatus.textContent = "✅ Work submitted successfully on Monad!";
        }

        await loadBounties();

    } catch (error) {
        console.error("Submit work error:", error);
        if (transactionStatus) {
            transactionStatus.textContent = getErrorMessage(error);
        }
    }
}


// ================================
// APPROVE SUBMISSION (CREATOR)
// ================================

async function approveSubmission(bountyId) {
    try {
        if (transactionStatus) {
            transactionStatus.textContent = "Confirm approval in MetaMask...";
        }

        const tx = await contract.approveSubmission(bountyId);

        if (transactionStatus) {
            transactionStatus.textContent = "Releasing escrowed MON to worker...";
        }

        await tx.wait();

        if (transactionStatus) {
            transactionStatus.textContent = "✅ Submission approved! Escrowed MON transferred to worker.";
        }

        await loadBounties();

    } catch (error) {
        console.error("Approve error:", error);
        if (transactionStatus) {
            transactionStatus.textContent = getErrorMessage(error);
        }
    }
}


// ================================
// CANCEL BOUNTY (CREATOR)
// ================================

async function cancelBounty(bountyId) {
    if (!confirm("Are you sure you want to cancel this bounty and refund your escrowed MON?")) {
        return;
    }

    try {
        if (transactionStatus) {
            transactionStatus.textContent = "Confirm cancellation in MetaMask...";
        }

        const tx = await contract.cancelBounty(bountyId);

        if (transactionStatus) {
            transactionStatus.textContent = "Cancelling bounty and refunding escrowed MON...";
        }

        await tx.wait();

        if (transactionStatus) {
            transactionStatus.textContent = "✅ Bounty cancelled. Escrowed MON refunded to your wallet.";
        }

        await loadBounties();

    } catch (error) {
        console.error("Cancel error:", error);
        if (transactionStatus) {
            transactionStatus.textContent = getErrorMessage(error);
        }
    }
}


// ================================
// HELPERS
// ================================

function formatStatus(status) {
    const statuses = ["Open", "Submitted", "Completed", "Cancelled"];
    return statuses[status] || `Unknown (${status})`;
}

function shortAddress(address) {
    if (!address || address === "0x0000000000000000000000000000000000000000") {
        return "None";
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function escapeHTML(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getErrorMessage(error) {
    return (
        error?.reason ||
        error?.shortMessage ||
        error?.info?.error?.message ||
        error?.message ||
        "Transaction failed."
    );
}


// ================================
// EVENT LISTENERS
// ================================

if (connectButton) {
    connectButton.addEventListener("click", connectWallet);
}

if (bountyForm) {
    bountyForm.addEventListener("submit", createBounty);
}

if (refreshButton) {
    refreshButton.addEventListener("click", loadBounties);
}

if (aiGenerateBtn) {
    aiGenerateBtn.addEventListener("click", generateWithAI);
}


// ================================
// METAMASK LIVE ACCOUNT SWITCH LISTENER
// ================================

if (window.ethereum) {
    window.ethereum.on("accountsChanged", async (accounts) => {
        if (!accounts || accounts.length === 0) {
            currentAccount = null;
            provider = null;
            signer = null;
            contract = null;

            if (walletStatus) walletStatus.textContent = "Wallet not connected";
            if (connectButton) connectButton.textContent = "Connect Wallet";
            if (bountiesContainer) bountiesContainer.innerHTML = "<p>Connect your wallet to view bounties.</p>";
            if (transactionStatus) transactionStatus.textContent = "Wallet disconnected.";
            return;
        }

        try {
            currentAccount = accounts[0];
            provider = new ethers.BrowserProvider(window.ethereum);
            signer = await provider.getSigner();
            contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
            window.bountyContract = contract;

            if (walletStatus) {
                walletStatus.innerHTML = `Connected: <strong>${shortAddress(currentAccount)}</strong> <span style="font-size:12px; color:#888;">(${currentAccount})</span>`;
            }
            if (connectButton) {
                connectButton.textContent = "Change Wallet";
            }
            if (transactionStatus) {
                transactionStatus.textContent = `Active account changed to ${shortAddress(currentAccount)}.`;
            }

            await loadBounties();
        } catch (error) {
            console.error("Account change listener error:", error);
        }
    });

    window.ethereum.on("chainChanged", () => {
        window.location.reload();
    });
}
