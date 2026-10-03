"""Tiny JSON-schema-like validator (no external dependency).

Supports: type, enum, required, properties, additionalProperties=False,
items, maxItems, maxLength. Enough for Phase 1 tools.
"""
from __future__ import annotations

_TYPES = {"string": str, "integer": int, "number": (int, float), "boolean": bool, "array": list, "object": dict}


class SchemaError(ValueError):
    pass


def validate(value, schema: dict, path: str = "$") -> None:
    t = schema.get("type")
    if t:
        if t not in _TYPES:
            raise SchemaError(f"{path}: unsupported schema type '{t}'")
        ok = isinstance(value, _TYPES[t])
        if t in ("integer", "number") and isinstance(value, bool):
            ok = False
        if not ok:
            raise SchemaError(f"{path}: expected {t}")
    if "enum" in schema and value not in schema["enum"]:
        raise SchemaError(f"{path}: value not allowed")
    if t == "string" and "maxLength" in schema and len(value) > schema["maxLength"]:
        raise SchemaError(f"{path}: too long")
    if t == "array":
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            raise SchemaError(f"{path}: too many items")
        if "items" in schema:
            for i, item in enumerate(value):
                validate(item, schema["items"], f"{path}[{i}]")
    if t == "object":
        props = schema.get("properties", {})
        for key in schema.get("required", []):
            if key not in value:
                raise SchemaError(f"{path}: missing '{key}'")
        if schema.get("additionalProperties") is False:
            extra = set(value) - set(props)
            if extra:
                raise SchemaError(f"{path}: unexpected field(s) {sorted(extra)}")
        for key, sub in props.items():
            if key in value:
                validate(value[key], sub, f"{path}.{key}")
