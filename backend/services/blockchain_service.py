"""
Blockchain Service — Placeholder functions for Monad contract interactions.

All functions return mock responses now. Once Srikar shares the contract
ABI + deployed address, only the internals of these functions change —
the signatures and return shapes stay the same.
"""

import os
import time
from web3 import Web3

# Monad Testnet config
MONAD_TESTNET_RPC = "https://testnet-rpc.monad.xyz"
MONAD_TESTNET_CHAIN_ID = 10143

# Will be populated from shared/contract/ after Srikar's handoff
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "")
CONTRACT_ABI = []  # Load from shared/contract/MonadBounty.abi.json after deployment

# --- Bounty status enum (mirrors contract) ---
STATUS_OPEN = 0
STATUS_ACCEPTED = 1
STATUS_SUBMITTED = 2
STATUS_PAID = 3
STATUS_CANCELLED = 4

STATUS_LABELS = {
    STATUS_OPEN: "Open",
    STATUS_ACCEPTED: "Accepted",
    STATUS_SUBMITTED: "Submitted",
    STATUS_PAID: "Paid",
    STATUS_CANCELLED: "Cancelled",
}


def get_web3():
    """Get a Web3 instance connected to Monad Testnet."""
    return Web3(Web3.HTTPProvider(MONAD_TESTNET_RPC))


def is_connected() -> bool:
    """Check if we can reach the Monad Testnet RPC."""
    try:
        w3 = get_web3()
        return w3.is_connected()
    except Exception:
        return False


# ─── Placeholder functions for on-chain operations ───────────────────
# These return mock responses. After Srikar shares ABI + address,
# replace internals with real Web3 contract calls.

def create_on_chain_bounty(title: str, description: str, reward_wei: int, creator: str) -> dict:
    """
    Create a bounty on the Monad contract.

    TODO: Replace with real contract call:
        tx = contract.functions.createBounty(title, description).buildTransaction({
            'from': creator,
            'value': reward_wei,
            'chainId': MONAD_TESTNET_CHAIN_ID,
        })

    Returns mock tx data for now.
    """
    mock_tx_hash = f"0x{'a1b2c3d4e5f6' * 5}"[:66]
    return {
        "success": True,
        "transactionHash": mock_tx_hash,
        "blockNumber": 12345678,
        "contractAddress": CONTRACT_ADDRESS or "0x_PENDING_DEPLOYMENT",
        "message": "Mock: bounty creation transaction simulated",
    }


def submit_on_chain_work(bounty_id: int, proof_url: str, worker: str) -> dict:
    """
    Submit proof of work to an accepted bounty on-chain.

    TODO: Replace with real contract call:
        tx = contract.functions.submitProof(bounty_id, proof_url).buildTransaction({
            'from': worker,
            'chainId': MONAD_TESTNET_CHAIN_ID,
        })

    Returns mock tx data for now.
    """
    mock_tx_hash = f"0x{'f6e5d4c3b2a1' * 5}"[:66]
    return {
        "success": True,
        "transactionHash": mock_tx_hash,
        "blockNumber": 12345679,
        "message": "Mock: work submission transaction simulated",
    }


def approve_on_chain_submission(bounty_id: int, creator: str) -> dict:
    """
    Approve a submission and release escrow to the worker.

    TODO: Replace with real contract call:
        tx = contract.functions.approveAndRelease(bounty_id).buildTransaction({
            'from': creator,
            'chainId': MONAD_TESTNET_CHAIN_ID,
        })

    Returns mock tx data for now.
    """
    mock_tx_hash = f"0x{'1a2b3c4d5e6f' * 5}"[:66]
    return {
        "success": True,
        "transactionHash": mock_tx_hash,
        "blockNumber": 12345680,
        "message": "Mock: approval and escrow release simulated",
    }


def get_on_chain_bounty(bounty_id: int) -> dict | None:
    """
    Read a single bounty from the contract.

    TODO: Replace with real contract call:
        data = contract.functions.bounties(bounty_id).call()
    """
    return None  # No mock data here — in-memory store handles reads


def verify_transaction(tx_hash: str) -> dict | None:
    """
    Verify a transaction exists on Monad Testnet.
    Returns the transaction receipt or None if not found.
    """
    try:
        w3 = get_web3()
        receipt = w3.eth.get_transaction_receipt(tx_hash)
        return {
            "status": receipt["status"],
            "blockNumber": receipt["blockNumber"],
            "gasUsed": receipt["gasUsed"],
        }
    except Exception:
        return None
