"""One consistent error shape for the whole API:
{"error": {"code": "...", "message": "...", "details": ...}}"""
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.views import exception_handler


class UpstreamAIError(APIException):
    status_code = 502
    default_detail = "The AI provider failed. Please try again."
    default_code = "ai_provider_error"


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:      # unhandled -> Django returns a generic 500 (no details leaked)
        return None
    if isinstance(exc, ValidationError):
        code, message, details = "invalid_input", "Invalid input.", response.data
    else:
        code = getattr(exc, "default_code", "error")
        message = str(getattr(exc, "detail", "Request failed."))
        details = None
    response.data = {"error": {"code": code, "message": message, "details": details}}
    return response


class ApprovalConflict(APIException):
    status_code = 409
    default_detail = "This action was already approved, denied, or has expired."
    default_code = "approval_not_pending"


class ApprovalExpired(APIException):
    status_code = 410
    default_detail = "This approval request expired. Please ask again."
    default_code = "approval_expired"
