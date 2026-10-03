import re
import uuid

from .logging_utils import request_id_var

_SAFE_ID = re.compile(r"^[A-Za-z0-9\-_.]{8,64}$")


class RequestIDMiddleware:
    """Gives every request an ID (also returned as X-Request-ID) for log correlation."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        incoming = request.headers.get("X-Request-ID", "")
        rid = incoming if _SAFE_ID.match(incoming) else uuid.uuid4().hex
        request.request_id = rid
        token = request_id_var.set(rid)
        try:
            response = self.get_response(request)
        finally:
            request_id_var.reset(token)
        response["X-Request-ID"] = rid
        return response
