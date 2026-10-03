"""Tiny .env loader + helpers (no extra dependency).

WHY: .env keeps secrets (API keys, SECRET_KEY) OUT of source code.
Real environment variables always win over .env values.
"""
import os
from pathlib import Path


def load_dotenv(path) -> None:
    p = Path(path)
    if not p.is_file():
        return
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def env(name: str, default=None):
    value = os.environ.get(name)
    return default if value is None or value == "" else value


def env_bool(name: str, default: bool = False) -> bool:
    value = env(name)
    return default if value is None else value.lower() in ("1", "true", "yes", "on")


def env_list(name: str, default: str = "") -> list[str]:
    return [x.strip() for x in (env(name, default) or "").split(",") if x.strip()]
