#!/usr/bin/env python3
"""
Markdown formatter for Claude Code output.
Fixes missing language tags and spacing issues in markdown files.
"""
import json
import sys
import re
import os


def detect_language(code):
    """Best-effort language detection from code content."""
    s = code.strip()

    # JSON detection
    if re.search(r'^\s*[{\[]', s):
        try:
            json.loads(s)
            return 'json'
        except:
            pass

    # TypeScript/JavaScript detection
    if re.search(r'\b(interface|type|enum)\s+\w+', s) or \
       re.search(r':\s*(string|number|boolean|any)\b', s):
        return 'typescript'

    if re.search(r'\b(function\s+\w+\s*\(|const\s+\w+\s*=)', s) or \
       re.search(r'=>|console\.(log|error)', s):
        return 'javascript'

    # Python detection
    if re.search(r'^\s*def\s+\w+\s*\(', s, re.M) or \
       re.search(r'^\s*(import|from)\s+\w+', s, re.M):
        return 'python'

    # SQL detection
    if re.search(r'\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\s+', s, re.I):
        return 'sql'

    # Bash detection
    if re.search(r'^#!.*\b(bash|sh)\b', s, re.M) or \
       re.search(r'\b(if|then|fi|for|in|do|done)\b', s):
        return 'bash'

    # HTML/JSX detection
    if re.search(r'<[a-zA-Z][^>]*>', s):
        return 'tsx' if 'className=' in s else 'html'

    # CSS detection
    if re.search(r'[.#][\w-]+\s*\{', s):
        return 'css'

    return 'text'


def format_markdown(content):
    """Format markdown content with language detection."""
    def add_lang_to_fence(match):
        indent, info, body, closing = match.groups()
        if not info.strip():
            lang = detect_language(body)
            return f"{indent}```{lang}\n{body}{closing}\n"
        return match.group(0)

    fence_pattern = r'(?ms)^([ \t]{0,3})```([^\n]*)\n(.*?)(\n\1```)\s*$'
    content = re.sub(fence_pattern, add_lang_to_fence, content)

    # Fix excessive blank lines (only outside code fences)
    content = re.sub(r'\n{3,}', '\n\n', content)

    return content.rstrip() + '\n'


def main():
    try:
        input_data = json.load(sys.stdin)
        file_path = input_data.get('tool_input', {}).get('file_path', '')

        if not file_path.endswith(('.md', '.mdx')):
            sys.exit(0)  # Not a markdown file

        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            formatted = format_markdown(content)

            if formatted != content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(formatted)
                print(f"Formatted markdown in {file_path}")

    except Exception as e:
        # Silently fail - don't block Claude's work
        pass


if __name__ == '__main__':
    main()
