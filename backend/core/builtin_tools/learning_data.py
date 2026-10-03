"""Curated lists for the 'learn something small' daily brief section.

Rotates daily based on day-of-year so the user sees a fresh tip every morning
without needing external API lookups.
"""
from __future__ import annotations

import datetime

TERMINAL_SHORTCUTS = [
    {
        "command": "Ctrl + R",
        "description": "Reverse incremental search through your command history. Press again to cycle backwards.",
    },
    {
        "command": "Ctrl + L",
        "description": "Clear the terminal screen while keeping your current command line intact.",
    },
    {
        "command": "Ctrl + U",
        "description": "Cut and clear the line from cursor position to the start.",
    },
    {
        "command": "Ctrl + K",
        "description": "Cut and clear the line from cursor position to the end.",
    },
    {
        "command": "Ctrl + W",
        "description": "Delete the word immediately preceding the cursor.",
    },
    {
        "command": "Alt + .  (or !$)",
        "description": "Insert the last argument of your previous shell command.",
    },
    {
        "command": "pushd <dir> / popd",
        "description": "Navigate directories on a stack so you can jump back instantly with popd.",
    },
    {
        "command": "!!",
        "description": "Rerun the last command (e.g. 'sudo !!' on Linux or run again with different flags).",
    },
]

SECURITY_TIPS = [
    {
        "title": "Principle of Least Privilege",
        "tip": "Avoid running everyday browsers, text editors, or build scripts with administrator or root privileges.",
    },
    {
        "title": "Verify File Hashes",
        "tip": "Compare SHA-256 checksums on downloaded installers or scripts before executing them on your machine.",
    },
    {
        "title": "Fail-Closed Security",
        "tip": "Default to BLOCK whenever an authorization decision cannot be positively validated.",
    },
    {
        "title": "Defense in Depth",
        "tip": "Never rely solely on edge firewalls; maintain host-level firewalls, least-privilege users, and audit logs.",
    },
    {
        "title": "Audit Listening Ports",
        "tip": "Routinely inspect 'netstat -ano' (Windows) or 'ss -tulpn' (Linux) to verify all listening services.",
    },
    {
        "title": "Isolate Untrusted Data",
        "tip": "Treat all user-supplied files and network inputs as untrusted until validated against a strict schema.",
    },
    {
        "title": "Secrets Hygiene",
        "tip": "Never commit .env or API credentials to source control; keep them in environment variables and .gitignore.",
    },
]

PYTHON_TIPS = [
    {
        "title": "dict.get with default",
        "tip": "Retrieve dictionary keys safely without raising KeyError: dict.get('key', 'default_value').",
    },
    {
        "title": "collections.defaultdict",
        "tip": "Automatically initialize missing dictionary values (e.g. lists or counts) when keys are accessed.",
    },
    {
        "title": "contextlib.suppress",
        "tip": "Cleanly ignore specific expected exceptions without multi-line try/except/pass boilerplate.",
    },
    {
        "title": "dataclasses.dataclass(frozen=True)",
        "tip": "Build immutable, thread-safe value objects with auto-generated equality and representations.",
    },
    {
        "title": "pathlib.Path",
        "tip": "Use object-oriented path operators (path / 'child') for reliable cross-platform path handling.",
    },
    {
        "title": "enumerate with start index",
        "tip": "Use enumerate(items, start=1) to track 1-indexed counters alongside elements cleanly in loops.",
    },
    {
        "title": "try / except / else / finally",
        "tip": "Use the 'else' block for code that should only run if no exception was raised in the try block.",
    },
]


def get_daily_learning_tips(day_of_year: int | None = None) -> dict:
    """Return today's rotated terminal shortcut, security tip, and python tip."""
    if day_of_year is None:
        day_of_year = datetime.date.today().timetuple().tm_yday

    return {
        "terminal_shortcut": TERMINAL_SHORTCUTS[day_of_year % len(TERMINAL_SHORTCUTS)],
        "security_tip": SECURITY_TIPS[day_of_year % len(SECURITY_TIPS)],
        "python_tip": PYTHON_TIPS[day_of_year % len(PYTHON_TIPS)],
    }
