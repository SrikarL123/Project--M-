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
        aiStatus.textContent = "Please describe your task first.";
        return;
    }

    aiGenerateBtn.disabled = true;
    aiGenerateBtn.textContent = "⏳ Generating...";
    aiStatus.textContent = "AI is drafting your bounty...";

    try {
        const endpoint = BACKEND_URL ? `${BACKEND_URL}/generate-bounty` : "/api/generate-bounty";
        
        let response;
        try {
            response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    request: prompt
                })
            });
        } catch (fetchErr) {
            // Fallback try for Vercel alternative path rewrite
            if (!BACKEND_URL && endpoint === "/api/generate-bounty") {
                response = await fetch("/generate-bounty", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ request: prompt })
                });
            } else {
                throw fetchErr;
            }
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

        aiStatus.textContent =
            `✅ Draft ready! Category: ${draft.category || "Other"} · ` +
            `Difficulty: ${draft.difficulty || "Medium"} · ` +
            `Skills: ${(draft.skills || []).join(", ")}. ` +
            `Review and edit below, then create.`;

    } catch (error) {
        console.error("AI generation error:", error);
        aiStatus.textContent =
            `❌ ${error.message || "Could not reach AI service. You can still fill the form manually."}`;
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
        if (transactionStatus) {
            transactionStatus.textContent = "Connecting to wallet...";
        }

        // Request account access using standard eth_requestAccounts
        let accounts;
        try {
            accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
        } catch (reqErr) {
            // Fallback for wallet_requestPermissions if user clicked "Change Wallet"
            if (currentAccount) {
                await window.ethereum.request({
                    method: "wallet_requestPermissions",
                    params: [{ eth_accounts: {} }]
                });
                accounts = await window.ethereum.request({
                    method: "eth_accounts"
                });
            } else {
                throw reqErr;
            }
        }

        if (!accounts || accounts.length === 0) {
            throw new Error("No wallet account selected.");
        }

        currentAccount = accounts[0];

        // Switch to Monad Testnet
        await switchToMonad();

        // Create ethers provider
        provider = new ethers.BrowserProvider(window.ethereum);

        // Get signer
        signer = await provider.getSigner();

        // Connect contract
        contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            ABI,
            signer
        );

        window.bountyContract = contract;

        if (walletStatus) {
            walletStatus.textContent = `Connected: ${shortAddress(currentAccount)}`;
        }

        if (connectButton) {
            connectButton.textContent = "Change Wallet";
        }

        if (transactionStatus) {
            transactionStatus.textContent = "Wallet connected successfully.";
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
// CREATE BOUNTY
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
            transactionStatus.textContent = "Confirm the transaction in MetaMask...";
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
            transactionStatus.textContent = "✅ Bounty created successfully on Monad Testnet!";
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
            bountiesContainer.innerHTML = "<p>No bounties available yet. Be the first to create one!</p>";
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
// RENDER BOUNTY
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

    card.innerHTML = `
        <h3>#${id} — ${escapeHTML(title)}</h3>
        <p>${escapeHTML(description)}</p>
        <p><strong>Reward:</strong> ${reward} MON</p>
        <p><strong>Client:</strong> ${shortAddress(client)}</p>
        <p><strong>Developer:</strong> ${shortAddress(developer)}</p>
        <p><strong>Deadline:</strong> ${deadline}</p>
        <p><strong>Status:</strong> <span class="status-badge status-${formatStatus(status).toLowerCase()}">${formatStatus(status)}</span></p>
        ${
            submission
                ? `<p><strong>Submission:</strong> <a href="${escapeHTML(submission)}" target="_blank" rel="noopener noreferrer">${escapeHTML(submission)}</a></p>`
                : ""
        }
    `;

    const zeroAddress = "0x0000000000000000000000000000000000000000";

    // SUBMIT WORK BUTTON (Worker)
    if (
        status === 0 &&
        developer.toLowerCase() === zeroAddress &&
        currentAccount &&
        client.toLowerCase() !== currentAccount.toLowerCase()
    ) {
        const submitButton = document.createElement("button");
        submitButton.textContent = "Submit Work";
        submitButton.onclick = () => submitWork(id);
        card.appendChild(submitButton);
    }

    // APPROVE SUBMISSION BUTTON (Client)
    if (
        status === 1 &&
        currentAccount &&
        client.toLowerCase() === currentAccount.toLowerCase()
    ) {
        const approveButton = document.createElement("button");
        approveButton.textContent = "Approve Submission & Release MON";
        approveButton.onclick = () => approveSubmission(id);
        card.appendChild(approveButton);
    }

    // CANCEL BOUNTY BUTTON (Client)
    if (
        status === 0 &&
        currentAccount &&
        client.toLowerCase() === currentAccount.toLowerCase()
    ) {
        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Cancel Bounty & Refund MON";
        cancelButton.onclick = () => cancelBounty(id);
        card.appendChild(cancelButton);
    }

    bountiesContainer.appendChild(card);
}


// ================================
// SUBMIT WORK
// ================================

async function submitWork(bountyId) {
    const submission = prompt("Enter your submission URI or proof URL (e.g. GitHub PR / Demo link):");

    if (!submission || !submission.trim()) {
        return;
    }

    try {
        transactionStatus.textContent = "Confirm submission in MetaMask...";

        const tx = await contract.submitWork(bountyId, submission.trim());

        transactionStatus.textContent = "Submitting work to Monad Testnet...";
        await tx.wait();

        transactionStatus.textContent = "✅ Work submitted successfully!";
        await loadBounties();

    } catch (error) {
        console.error("Submit work error:", error);
        transactionStatus.textContent = getErrorMessage(error);
    }
}


// ================================
// APPROVE SUBMISSION
// ================================

async function approveSubmission(bountyId) {
    try {
        transactionStatus.textContent = "Confirm approval in MetaMask...";

        const tx = await contract.approveSubmission(bountyId);

        transactionStatus.textContent = "Approving submission and releasing escrowed MON...";
        await tx.wait();

        transactionStatus.textContent = "✅ Submission approved! Escrowed MON released to developer.";
        await loadBounties();

    } catch (error) {
        console.error("Approve error:", error);
        transactionStatus.textContent = getErrorMessage(error);
    }
}


// ================================
// CANCEL BOUNTY
// ================================

async function cancelBounty(bountyId) {
    if (!confirm("Are you sure you want to cancel this bounty and receive your refund?")) {
        return;
    }

    try {
        transactionStatus.textContent = "Confirm cancellation in MetaMask...";

        const tx = await contract.cancelBounty(bountyId);

        transactionStatus.textContent = "Cancelling bounty and refunding escrowed MON...";
        await tx.wait();

        transactionStatus.textContent = "✅ Bounty cancelled. Escrowed MON refunded to your wallet.";
        await loadBounties();

    } catch (error) {
        console.error("Cancel error:", error);
        transactionStatus.textContent = getErrorMessage(error);
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
// METAMASK ACCOUNT & CHAIN EVENTS
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
            return;
        }

        try {
            currentAccount = accounts[0];
            provider = new ethers.BrowserProvider(window.ethereum);
            signer = await provider.getSigner();
            contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
            window.bountyContract = contract;

            if (walletStatus) walletStatus.textContent = `Connected: ${shortAddress(currentAccount)}`;
            if (connectButton) connectButton.textContent = "Change Wallet";
            if (transactionStatus) transactionStatus.textContent = "Account changed.";

            await loadBounties();
        } catch (error) {
            console.error("Account change error:", error);
        }
    });

    window.ethereum.on("chainChanged", () => {
        window.location.reload();
    });
}
