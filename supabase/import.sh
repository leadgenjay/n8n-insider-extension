#!/bin/bash

# Import script: Import exported data to New Supabase

NEW_URL="https://uprkqfygjhxudhdpqhju.supabase.co"
NEW_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcmtxZnlnamh4dWRoZHBxaGp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg0MTcxNywiZXhwIjoyMDg0NDE3NzE3fQ.zYNNLVexQaKwCJYgRpJ1EbYxGWChit_kfw-XPKboyj8"

EXPORT_DIR="/Volumes/data/GITHUB/n8n-insider-extension/supabase/exports"

echo "=== Importing to NEW Supabase ==="

# Import admin_users first (no dependencies)
echo "Importing admin_users..."
ADMIN_DATA=$(cat "${EXPORT_DIR}/admin_users.json")
if [ "$ADMIN_DATA" != "[]" ] && [ "$ADMIN_DATA" != "" ]; then
  RESULT=$(curl -s -X POST "${NEW_URL}/rest/v1/admin_users" \
    -H "apikey: ${NEW_KEY}" \
    -H "Authorization: Bearer ${NEW_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates" \
    -d "$ADMIN_DATA")
  if echo "$RESULT" | grep -q "error"; then
    echo "  -> Error: $RESULT"
  else
    echo "  -> Admin users imported successfully"
  fi
else
  echo "  -> No admin users to import"
fi

# Import templates
echo "Importing templates..."
TEMPLATES_DATA=$(cat "${EXPORT_DIR}/templates.json")
if [ "$TEMPLATES_DATA" != "[]" ] && [ "$TEMPLATES_DATA" != "" ]; then
  RESULT=$(curl -s -X POST "${NEW_URL}/rest/v1/templates" \
    -H "apikey: ${NEW_KEY}" \
    -H "Authorization: Bearer ${NEW_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates" \
    -d "$TEMPLATES_DATA")
  if echo "$RESULT" | grep -q "error"; then
    echo "  -> Error: $RESULT"
  else
    echo "  -> Templates imported successfully"
  fi
else
  echo "  -> No templates to import"
fi

# Import workflow_documentation
echo "Importing workflow_documentation..."
DOCS_DATA=$(cat "${EXPORT_DIR}/workflow_documentation.json")
if [ "$DOCS_DATA" != "[]" ] && [ "$DOCS_DATA" != "" ]; then
  RESULT=$(curl -s -X POST "${NEW_URL}/rest/v1/workflow_documentation" \
    -H "apikey: ${NEW_KEY}" \
    -H "Authorization: Bearer ${NEW_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates" \
    -d "$DOCS_DATA")
  if echo "$RESULT" | grep -q "error"; then
    echo "  -> Error: $RESULT"
  else
    echo "  -> Workflow documentation imported successfully"
  fi
else
  echo "  -> No workflow documentation to import"
fi

echo ""
echo "=== Import complete! ==="
echo ""
echo "Verifying counts in NEW Supabase..."

# Verify counts
echo "Templates: $(curl -s "${NEW_URL}/rest/v1/templates?select=id" -H "apikey: ${NEW_KEY}" -H "Authorization: Bearer ${NEW_KEY}" | jq length)"
echo "Workflow Docs: $(curl -s "${NEW_URL}/rest/v1/workflow_documentation?select=id" -H "apikey: ${NEW_KEY}" -H "Authorization: Bearer ${NEW_KEY}" | jq length)"
echo "Admin Users: $(curl -s "${NEW_URL}/rest/v1/admin_users?select=id" -H "apikey: ${NEW_KEY}" -H "Authorization: Bearer ${NEW_KEY}" | jq length)"
