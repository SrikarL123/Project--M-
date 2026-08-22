# Health check routes
from flask import Blueprint
from utils.responses import success_response

health_bp = Blueprint('health', __name__)


@health_bp.route('/health', methods=['GET'])
def health_check():
    return success_response(
        data={"status": "ok"},
        message="Server is running",
    )
