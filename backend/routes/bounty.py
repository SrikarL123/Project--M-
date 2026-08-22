"""
Bounty routes — Full CRUD + submit + approve with in-memory storage.

All endpoints use the consistent response format:
  Success: {"success": true, "data": {...}, "message": "..."}
  Error:   {"success": false, "error": "..."}
"""

import time
from flask import Blueprint, request
from utils.responses import success_response, error_response
from services.blockchain_service import (
    create_on_chain_bounty,
    submit_on_chain_work,
    approve_on_chain_submission,
    STATUS_OPEN,
    STATUS_ACCEPTED,
    STATUS_SUBMITTED,
    STATUS_PAID,
    STATUS_CANCELLED,
    STATUS_LABELS,
)

bounty_bp = Blueprint('bounty', __name__)

# ─── In-memory bounty store ─────────────────────────────────────────
# Replaced with a real DB or on-chain reads after contract deployment.
_bounties = {}
_next_id = 0


def _serialize_bounty(bounty: dict) -> dict:
    """Return a clean copy with status label for API consumers."""
    b = dict(bounty)
    b["statusLabel"] = STATUS_LABELS.get(b["status"], "Unknown")
    return b


# ─── POST /bounties — Create a new bounty ───────────────────────────

@bounty_bp.route('/bounties', methods=['POST'])
def create_bounty():
    """
    Create a new bounty and (mock) fund it on-chain.

    Request body:
    {
      "title": "Build a React Landing Page",
      "description": "Create a modern landing page...",
      "skills": ["React", "Tailwind"],
      "reward": 5.0,
      "deadline": 24,
      "category": "Frontend",
      "difficulty": "Medium",
      "creator": "0x..."
    }
    """
    global _next_id

    data = request.get_json(silent=True)
    if not data:
        return error_response("Request body must be valid JSON")

    # Required fields
    required = ["title", "description", "reward", "creator"]
    missing = [f for f in required if f not in data or not data[f]]
    if missing:
        return error_response(f"Missing required fields: {', '.join(missing)}")

    # Validate title
    title = str(data["title"]).strip()
    if not (8 <= len(title) <= 80):
        return error_response("Title must be 8-80 characters")

    # Validate description
    description = str(data["description"]).strip()
    if not (30 <= len(description) <= 500):
        return error_response("Description must be 30-500 characters")

    # Validate reward
    try:
        reward = float(data["reward"])
        if reward <= 0:
            return error_response("Reward must be greater than 0")
    except (ValueError, TypeError):
        return error_response("Reward must be a valid number")

    # Validate creator address
    creator = str(data["creator"]).strip()
    if not creator.startswith("0x") or len(creator) != 42:
        return error_response("Creator must be a valid Ethereum address")

    # Optional fields with defaults
    skills = data.get("skills", [])
    if not isinstance(skills, list):
        skills = []
    skills = [str(s).strip() for s in skills[:5] if str(s).strip()]

    deadline = data.get("deadline", 48)
    try:
        deadline = int(deadline)
        deadline = max(1, min(168, deadline))
    except (ValueError, TypeError):
        deadline = 48

    category = data.get("category", "Other")
    difficulty = data.get("difficulty", "Medium")

    # Create the bounty
    bounty_id = _next_id
    _next_id += 1

    reward_wei = int(reward * 10**18)

    bounty = {
        "id": bounty_id,
        "title": title,
        "description": description,
        "skills": skills,
        "reward": reward,
        "rewardWei": str(reward_wei),
        "deadline": deadline,
        "category": category,
        "difficulty": difficulty,
        "creator": creator,
        "worker": None,
        "proofUrl": None,
        "status": STATUS_OPEN,
        "createdAt": int(time.time()),
        "updatedAt": int(time.time()),
        "transactionHash": None,
    }

    # Mock on-chain creation
    chain_result = create_on_chain_bounty(title, description, reward_wei, creator)
    bounty["transactionHash"] = chain_result.get("transactionHash")

    _bounties[bounty_id] = bounty

    return success_response(
        data=_serialize_bounty(bounty),
        message="Bounty created successfully",
        status_code=201,
    )


# ─── GET /bounties — List all bounties ───────────────────────────────

@bounty_bp.route('/bounties', methods=['GET'])
def list_bounties():
    """
    List all bounties, optionally filtered by status or creator.

    Query params:
      ?status=Open|Accepted|Submitted|Paid|Cancelled
      ?creator=0x...
    """
    bounties = list(_bounties.values())

    # Filter by status label
    status_filter = request.args.get("status")
    if status_filter:
        label_to_code = {v: k for k, v in STATUS_LABELS.items()}
        code = label_to_code.get(status_filter)
        if code is not None:
            bounties = [b for b in bounties if b["status"] == code]

    # Filter by creator
    creator_filter = request.args.get("creator")
    if creator_filter:
        bounties = [b for b in bounties if b["creator"].lower() == creator_filter.lower()]

    # Sort by newest first
    bounties.sort(key=lambda b: b["createdAt"], reverse=True)

    return success_response(
        data=[_serialize_bounty(b) for b in bounties],
        message=f"Found {len(bounties)} bounties",
    )


# ─── GET /bounties/<id> — Get a single bounty ───────────────────────

@bounty_bp.route('/bounties/<int:bounty_id>', methods=['GET'])
def get_bounty(bounty_id):
    """Get a single bounty by ID."""
    bounty = _bounties.get(bounty_id)
    if not bounty:
        return error_response(f"Bounty {bounty_id} not found", 404)

    return success_response(data=_serialize_bounty(bounty))


# ─── POST /bounties/<id>/accept — Worker accepts a bounty ───────────

@bounty_bp.route('/bounties/<int:bounty_id>/accept', methods=['POST'])
def accept_bounty(bounty_id):
    """
    A worker accepts an open bounty.

    Request body: { "worker": "0x..." }
    """
    bounty = _bounties.get(bounty_id)
    if not bounty:
        return error_response(f"Bounty {bounty_id} not found", 404)

    if bounty["status"] != STATUS_OPEN:
        return error_response(
            f"Bounty is '{STATUS_LABELS[bounty['status']]}' — only Open bounties can be accepted"
        )

    data = request.get_json(silent=True)
    if not data or "worker" not in data:
        return error_response("Missing required field: 'worker'")

    worker = str(data["worker"]).strip()
    if not worker.startswith("0x") or len(worker) != 42:
        return error_response("Worker must be a valid Ethereum address")

    # Creator cannot self-accept
    if worker.lower() == bounty["creator"].lower():
        return error_response("Creator cannot accept their own bounty")

    bounty["worker"] = worker
    bounty["status"] = STATUS_ACCEPTED
    bounty["updatedAt"] = int(time.time())

    return success_response(
        data=_serialize_bounty(bounty),
        message="Bounty accepted",
    )


# ─── POST /bounties/<id>/submit — Worker submits proof ──────────────

@bounty_bp.route('/bounties/<int:bounty_id>/submit', methods=['POST'])
def submit_proof(bounty_id):
    """
    Worker submits proof of completed work.

    Request body: { "proofUrl": "https://...", "worker": "0x..." }
    """
    bounty = _bounties.get(bounty_id)
    if not bounty:
        return error_response(f"Bounty {bounty_id} not found", 404)

    if bounty["status"] != STATUS_ACCEPTED:
        return error_response(
            f"Bounty is '{STATUS_LABELS[bounty['status']]}' — only Accepted bounties can receive submissions"
        )

    data = request.get_json(silent=True)
    if not data:
        return error_response("Request body must be valid JSON")

    proof_url = str(data.get("proofUrl", "")).strip()
    if not proof_url:
        return error_response("proofUrl cannot be empty")

    worker = str(data.get("worker", "")).strip()
    if not worker:
        return error_response("Missing required field: 'worker'")

    # Only the accepted worker can submit
    if worker.lower() != bounty["worker"].lower():
        return error_response("Only the accepted worker can submit proof")

    # Mock on-chain submission
    chain_result = submit_on_chain_work(bounty_id, proof_url, worker)

    bounty["proofUrl"] = proof_url
    bounty["status"] = STATUS_SUBMITTED
    bounty["updatedAt"] = int(time.time())

    return success_response(
        data=_serialize_bounty(bounty),
        message="Work submitted successfully",
    )


# ─── POST /bounties/<id>/approve — Creator approves & releases ──────

@bounty_bp.route('/bounties/<int:bounty_id>/approve', methods=['POST'])
def approve_bounty(bounty_id):
    """
    Creator approves the submission and releases escrow to the worker.

    Request body: { "creator": "0x..." }
    """
    bounty = _bounties.get(bounty_id)
    if not bounty:
        return error_response(f"Bounty {bounty_id} not found", 404)

    if bounty["status"] != STATUS_SUBMITTED:
        return error_response(
            f"Bounty is '{STATUS_LABELS[bounty['status']]}' — only Submitted bounties can be approved"
        )

    data = request.get_json(silent=True)
    if not data or "creator" not in data:
        return error_response("Missing required field: 'creator'")

    creator = str(data["creator"]).strip()
    if creator.lower() != bounty["creator"].lower():
        return error_response("Only the bounty creator can approve")

    # Mock on-chain approval
    chain_result = approve_on_chain_submission(bounty_id, creator)

    bounty["status"] = STATUS_PAID
    bounty["updatedAt"] = int(time.time())

    return success_response(
        data=_serialize_bounty(bounty),
        message="Bounty approved — escrow released to worker",
    )


# ─── POST /bounties/<id>/cancel — Creator cancels ───────────────────

@bounty_bp.route('/bounties/<int:bounty_id>/cancel', methods=['POST'])
def cancel_bounty(bounty_id):
    """
    Creator cancels an open bounty and receives refund.

    Request body: { "creator": "0x..." }
    """
    bounty = _bounties.get(bounty_id)
    if not bounty:
        return error_response(f"Bounty {bounty_id} not found", 404)

    if bounty["status"] != STATUS_OPEN:
        return error_response(
            f"Bounty is '{STATUS_LABELS[bounty['status']]}' — only Open bounties can be cancelled"
        )

    data = request.get_json(silent=True)
    if not data or "creator" not in data:
        return error_response("Missing required field: 'creator'")

    creator = str(data["creator"]).strip()
    if creator.lower() != bounty["creator"].lower():
        return error_response("Only the bounty creator can cancel")

    bounty["status"] = STATUS_CANCELLED
    bounty["updatedAt"] = int(time.time())

    return success_response(
        data=_serialize_bounty(bounty),
        message="Bounty cancelled — escrow refunded to creator",
    )
