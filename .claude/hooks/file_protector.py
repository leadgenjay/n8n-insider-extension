#!/usr/bin/env python3
"""
File protector hook for Claude Code.
Blocks edits to sensitive files like .env, lock files, and .git/.
Exit code 2 blocks the operation, 0 allows it.
"""
import json
import sys
import os


# Files and patterns to protect
PROTECTED_PATTERNS = [
    '.env',
    '.env.local',
    '.env.production',
    '.env.development',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '.git/',
    'node_modules/',
    'credentials',
    'secrets',
]


def is_protected(file_path):
    """Check if a file path matches any protected patterns."""
    # Normalize path
    normalized = os.path.normpath(file_path).lower()

    for pattern in PROTECTED_PATTERNS:
        pattern_lower = pattern.lower()

        # Check if pattern is in the path
        if pattern_lower in normalized:
            return True

        # Check if file ends with the pattern
        if normalized.endswith(pattern_lower):
            return True

        # Check if any path component matches
        parts = normalized.replace('\\', '/').split('/')
        if pattern_lower.rstrip('/') in parts:
            return True

    return False


def main():
    try:
        input_data = json.load(sys.stdin)
        file_path = input_data.get('tool_input', {}).get('file_path', '')

        if not file_path:
            sys.exit(0)  # No file path, allow

        if is_protected(file_path):
            print(f"BLOCKED: Cannot edit protected file: {file_path}")
            print("This file is protected to prevent accidental exposure of secrets or corruption of lock files.")
            sys.exit(2)  # Block the operation

        sys.exit(0)  # Allow the operation

    except Exception as e:
        # On error, allow the operation (fail open)
        sys.exit(0)


if __name__ == '__main__':
    main()
