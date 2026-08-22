import ABI from "./BountyFlow.abi.json" with { type: "json" };
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

    const prompt = aiPromptInput.value.trim();

    if (!prompt) {
        aiStatus.textContent =
            "Please describe your task first.";
        return;
    }

    aiGenerateBtn.disabled = true;
    aiGenerateBtn.textContent = "⏳ Generating...";
    aiStatus.textContent =
        "AI is drafting your bounty...";

    try {

        const response = await fetch(
            `${BACKEND_URL}/generate-bounty`,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    request: prompt
                })
            }
        );

        const result = await response.json();

        if (!result.success) {
            throw new Error(
                result.error ||
                "AI generation failed"
            );
        }

        const draft = result.data;

        // Fill form fields with AI response
        document.getElementById("title")
            .value = draft.title || "";

        document.getElementById("description")
            .value = draft.description || "";

        document.getElementById("reward")
            .value = draft.reward || "";

        // Set deadline to draft hours from now
        if (draft.deadline) {
            const deadlineDate = new Date(
                Date.now() +
                draft.deadline * 60 * 60 * 1000
            );
            const iso = deadlineDate
                .toISOString()
                .slice(0, 16);
            document.getElementById("deadline")
                .value = iso;
        }

        aiStatus.textContent =
            `✅ Draft ready! Category: ${draft.category || "Other"} · ` +
            `Difficulty: ${draft.difficulty || "Medium"} · ` +
            `Skills: ${(draft.skills || []).join(", ")}. ` +
            `Review and edit below, then create.`;

    } catch (error) {

        console.error(
            "AI generation error:",
            error
        );

        aiStatus.textContent =
            `❌ ${error.message || "Could not reach AI service. You can still fill the form manually."}`;

    } finally {

        aiGenerateBtn.disabled = false;
        aiGenerateBtn.textContent =
            "✨ Generate with AI";
    }
}



// ================================
// CONNECT / CHANGE WALLET
// ================================

async function connectWallet() {
    if (!window.ethereum) {
        alert("Please install MetaMask.");
        return;
    }

    try {
        transactionStatus.textContent =
            "Select your MetaMask account...";

        // Ask MetaMask to show account permissions
        await window.ethereum.request({
            method: "wallet_requestPermissions",
            params: [
                {
                    eth_accounts: {}
                }
            ]
        });

        const selectedAccounts =
            await window.ethereum.request({
                method: "eth_accounts"
            });

        if (
            !selectedAccounts ||
            selectedAccounts.length === 0
        ) {
            throw new Error("No wallet account selected.");
        }

        currentAccount = selectedAccounts[0];

        // Switch to Monad Testnet
        await switchToMonad();

        // Create ethers provider
        provider =
            new ethers.BrowserProvider(
                window.ethereum
            );

        // Get signer
        signer =
            await provider.getSigner();

        // Connect contract
        contract =
            new ethers.Contract(
                CONTRACT_ADDRESS,
                ABI,
                signer
            );

        // Temporary debugging access
        window.bountyContract = contract;

        walletStatus.textContent =
            `Connected: ${shortAddress(currentAccount)}`;

        connectButton.textContent =
            "Change Wallet";

        transactionStatus.textContent =
            "Wallet connected successfully.";

        await loadBounties();

    } catch (error) {

        console.error(
            "Wallet connection error:",
            error
        );

        transactionStatus.textContent =
            getErrorMessage(error);
    }
}


// ================================
// SWITCH TO MONAD
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

        // Chain doesn't exist in MetaMask
        if (error.code === 4902) {

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

        const title =
            document
                .getElementById("title")
                .value
                .trim();

        const description =
            document
                .getElementById("description")
                .value
                .trim();

        const reward =
            document
                .getElementById("reward")
                .value
                .trim();

        const deadlineInput =
            document
                .getElementById("deadline")
                .value;

        if (
            !title ||
            !description ||
            !reward ||
            !deadlineInput
        ) {
            alert("Please fill in all fields.");
            return;
        }

        const deadline =
            Math.floor(
                new Date(deadlineInput)
                    .getTime() / 1000
            );

        transactionStatus.textContent =
            "Confirm the transaction in MetaMask...";

        const tx =
            await contract.createBounty(
                title,
                description,
                deadline,
                {
                    value:
                        ethers.parseEther(reward)
                }
            );

        transactionStatus.textContent =
            "Transaction submitted. Waiting for confirmation...";

        await tx.wait();

        transactionStatus.textContent =
            "Bounty created successfully.";

        bountyForm.reset();

        await loadBounties();

    } catch (error) {

        console.error(
            "Create bounty error:",
            error
        );

        transactionStatus.textContent =
            getErrorMessage(error);
    }
}


// ================================
// LOAD BOUNTIES
// ================================

async function loadBounties() {

    if (!contract) {

        bountiesContainer.innerHTML =
            "<p>Connect your wallet to view bounties.</p>";

        return;
    }

    try {

        const count =
            await contract.getBountyCount();

        const bountyCount =
            Number(count);

        console.log(
            "Bounty count:",
            bountyCount
        );

        if (bountyCount === 0) {

            bountiesContainer.innerHTML =
                "<p>No bounties available.</p>";

            return;
        }

        bountiesContainer.innerHTML = "";

        for (
            let i = 0;
            i < bountyCount;
            i++
        ) {

            const bounty =
                await contract.getBounty(i);

            renderBounty(bounty);
        }

    } catch (error) {

        console.error(
            "Load bounties error:",
            error
        );

        bountiesContainer.innerHTML =
            "<p>Unable to load bounties.</p>";
    }
}


// ================================
// RENDER BOUNTY
// ================================

function renderBounty(bounty) {

    const card =
        document.createElement("div");

    card.className = "bounty-card";

    const id =
        Number(bounty.id);

    const client =
        bounty.client;

    const developer =
        bounty.developer;

    const title =
        bounty.title;

    const description =
        bounty.description;

    const reward =
        ethers.formatEther(
            bounty.reward
        );

    const deadline =
        new Date(
            Number(bounty.deadline) * 1000
        ).toLocaleString();

    const submission =
        bounty.submission;

    const status =
        Number(bounty.status);

    card.innerHTML = `
        <h3>
            #${id} — ${escapeHTML(title)}
        </h3>

        <p>
            ${escapeHTML(description)}
        </p>

        <p>
            <strong>Reward:</strong>
            ${reward} MON
        </p>

        <p>
            <strong>Client:</strong>
            ${shortAddress(client)}
        </p>

        <p>
            <strong>Developer:</strong>
            ${shortAddress(developer)}
        </p>

        <p>
            <strong>Deadline:</strong>
            ${deadline}
        </p>

        <p>
            <strong>Status:</strong>
            ${formatStatus(status)}
        </p>

        ${
            submission
                ? `
                <p>
                    <strong>Submission:</strong>
                    ${escapeHTML(submission)}
                </p>
                `
                : ""
        }
    `;

    const zeroAddress =
        "0x0000000000000000000000000000000000000000";


    // ================================
    // SUBMIT WORK BUTTON
    // ================================

    if (
        status === 0 &&
        developer.toLowerCase() ===
            zeroAddress &&
        currentAccount &&
        client.toLowerCase() !==
            currentAccount.toLowerCase()
    ) {

        const submitButton =
            document.createElement("button");

        submitButton.textContent =
            "Submit Work";

        submitButton.onclick =
            () => submitWork(id);

        card.appendChild(
            submitButton
        );
    }


    // ================================
    // APPROVE SUBMISSION BUTTON
    // ================================

    if (
        status === 1 &&
        currentAccount &&
        client.toLowerCase() ===
            currentAccount.toLowerCase()
    ) {

        const approveButton =
            document.createElement("button");

        approveButton.textContent =
            "Approve Submission";

        approveButton.onclick =
            () => approveSubmission(id);

        card.appendChild(
            approveButton
        );
    }


    // ================================
    // CANCEL BOUNTY BUTTON
    // ================================

    if (
        status === 0 &&
        currentAccount &&
        client.toLowerCase() ===
            currentAccount.toLowerCase()
    ) {

        const cancelButton =
            document.createElement("button");

        cancelButton.textContent =
            "Cancel Bounty";

        cancelButton.onclick =
            () => cancelBounty(id);

        card.appendChild(
            cancelButton
        );
    }


    bountiesContainer.appendChild(
        card
    );
}


// ================================
// SUBMIT WORK
// ================================

async function submitWork(bountyId) {

    const submission =
        prompt(
            "Enter your submission URI:"
        );

    if (!submission) {
        return;
    }

    try {

        transactionStatus.textContent =
            "Confirm submission in MetaMask...";

        const tx =
            await contract.submitWork(
                bountyId,
                submission
            );

        transactionStatus.textContent =
            "Submitting work...";

        await tx.wait();

        transactionStatus.textContent =
            "Work submitted successfully.";

        await loadBounties();

    } catch (error) {

        console.error(
            "Submit work error:",
            error
        );

        transactionStatus.textContent =
            getErrorMessage(error);
    }
}


// ================================
// APPROVE SUBMISSION
// ================================

async function approveSubmission(
    bountyId
) {

    try {

        transactionStatus.textContent =
            "Confirm approval in MetaMask...";

        const tx =
            await contract.approveSubmission(
                bountyId
            );

        transactionStatus.textContent =
            "Approving submission...";

        await tx.wait();

        transactionStatus.textContent =
            "Submission approved. MON released.";

        await loadBounties();

    } catch (error) {

        console.error(
            "Approve error:",
            error
        );

        transactionStatus.textContent =
            getErrorMessage(error);
    }
}


// ================================
// CANCEL BOUNTY
// ================================

async function cancelBounty(
    bountyId
) {

    try {

        transactionStatus.textContent =
            "Confirm cancellation in MetaMask...";

        const tx =
            await contract.cancelBounty(
                bountyId
            );

        transactionStatus.textContent =
            "Cancelling bounty...";

        await tx.wait();

        transactionStatus.textContent =
            "Bounty cancelled.";

        await loadBounties();

    } catch (error) {

        console.error(
            "Cancel error:",
            error
        );

        transactionStatus.textContent =
            getErrorMessage(error);
    }
}


// ================================
// STATUS
// ================================

function formatStatus(status) {

    const statuses = [
        "Open",
        "Submitted",
        "Completed",
        "Cancelled"
    ];

    return (
        statuses[status] ||
        `Unknown (${status})`
    );
}


// ================================
// SHORT ADDRESS
// ================================

function shortAddress(address) {

    if (!address) {
        return "None";
    }

    return (
        `${address.slice(0, 6)}...` +
        `${address.slice(-4)}`
    );
}


// ================================
// ESCAPE HTML
// ================================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll(
            "'",
            "&#039;"
        );
}


// ================================
// ERROR MESSAGE
// ================================

function getErrorMessage(error) {

    return (
        error?.shortMessage ||
        error?.reason ||
        error?.info?.error?.message ||
        error?.message ||
        "Transaction failed."
    );
}


// ================================
// EVENT LISTENERS
// ================================

connectButton.addEventListener(
    "click",
    connectWallet
);

bountyForm.addEventListener(
    "submit",
    createBounty
);

refreshButton.addEventListener(
    "click",
    loadBounties
);

aiGenerateBtn.addEventListener(
    "click",
    generateWithAI
);


// ================================
// METAMASK ACCOUNT CHANGES
// ================================

if (window.ethereum) {

    window.ethereum.on(
        "accountsChanged",
        async (accounts) => {

            if (
                !accounts ||
                accounts.length === 0
            ) {

                currentAccount = null;
                provider = null;
                signer = null;
                contract = null;

                walletStatus.textContent =
                    "Wallet not connected";

                connectButton.textContent =
                    "Connect Wallet";

                bountiesContainer.innerHTML =
                    "<p>Connect your wallet to view bounties.</p>";

                return;
            }

            try {

                currentAccount =
                    accounts[0];

                provider =
                    new ethers.BrowserProvider(
                        window.ethereum
                    );

                signer =
                    await provider.getSigner();

                contract =
                    new ethers.Contract(
                        CONTRACT_ADDRESS,
                        ABI,
                        signer
                    );

                window.bountyContract =
                    contract;

                walletStatus.textContent =
                    `Connected: ${shortAddress(
                        currentAccount
                    )}`;

                connectButton.textContent =
                    "Change Wallet";

                transactionStatus.textContent =
                    "Account changed.";

                await loadBounties();

            } catch (error) {

                console.error(
                    "Account change error:",
                    error
                );
            }
        }
    );


    // ================================
    // CHAIN CHANGES
    // ================================

    window.ethereum.on(
        "chainChanged",
        () => {

            window.location.reload();

        }
    );
}
