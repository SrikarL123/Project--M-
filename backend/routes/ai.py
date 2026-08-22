# AI routes — POST /generate-bounty
from flask import Blueprint, request
from services.ai_service import generate_bounty_draft
from utils.responses import success_response, error_response

ai_bp = Blueprint('ai', __name__)


@ai_bp.route('/generate-bounty', methods=['POST'])
def generate_bounty():
    """
    Generate a structured bounty draft from plain-English input.

    Request:  { "request": "plain-English task description" }
    Response: Consistent format with AI-generated draft in data field.
    """
    data = request.get_json(silent=True)

    if not data or "request" not in data:
        return error_response("Missing required field: 'request'")

    user_request = data["request"]

    if not isinstance(user_request, str):
        return error_response("'request' must be a string")

    try:
        draft = generate_bounty_draft(user_request)
        return success_response(
            data=draft,
            message="Bounty draft generated successfully",
        )

    except ValueError as e:
        return error_response(str(e))

    except RuntimeError as e:
        return error_response(str(e), 500)

    except Exception:
        return error_response("An unexpected error occurred. Please try again.", 500)
