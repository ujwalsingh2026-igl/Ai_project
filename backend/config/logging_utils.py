"""Structured (JSON) logging + request-id support. Never log secrets or message text."""
import contextvars
import json
import logging
from datetime import datetime, timezone

request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

_STANDARD = set(logging.LogRecord("", 0, "", 0, "", (), None).__dict__) | {"message", "asctime", "request_id"}


class RequestIDFilter(logging.Filter):
    def filter(self, record):
        record.request_id = request_id_var.get()
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record):
        data = {
            "timestamp": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
            "severity": record.levelname,
            "component": record.name,
            "event": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }
        for key, value in record.__dict__.items():   # fields passed via extra={...}
            if key not in _STANDARD:
                data[key] = value
        if record.exc_info:
            data["exception"] = self.formatException(record.exc_info)
        return json.dumps(data, default=str)
