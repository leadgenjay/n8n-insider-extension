#!/bin/bash

# Install git hooks for this repository
# Run this once after cloning: ./.hooks/install.sh

HOOKS_DIR=".hooks"
GIT_HOOKS_DIR=".git/hooks"

echo "Installing git hooks..."

# Copy all hooks
for hook in "$HOOKS_DIR"/*; do
    if [ -f "$hook" ] && [ "$(basename "$hook")" != "install.sh" ]; then
        hook_name=$(basename "$hook")
        cp "$hook" "$GIT_HOOKS_DIR/$hook_name"
        chmod +x "$GIT_HOOKS_DIR/$hook_name"
        echo "  Installed: $hook_name"
    fi
done

echo "Done! Git hooks installed successfully."
echo ""
echo "The following protections are now active:"
echo "  - pre-commit: Blocks commits containing API keys and secrets"
