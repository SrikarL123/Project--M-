"""
Response helpers — consistent JSON response format across all endpoints.

Success: {"success": true, "data": {...}, "message": "..."}
Error:   {"success": false, "error": "..."}
"""

from flask import jsonify


def success_response(data=None, message="", status_code=200):
    """Return a consistent success JSON response."""
    return jsonify({
        "success": True,
        "data": data if data is not None else {},
        "message": message,
    }), status_code


def error_response(error_message, status_code=400):
    """Return a consistent error JSON response."""
    return jsonify({
        "success": False,
        "error": error_message,
    }), status_code
