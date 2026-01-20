#!/bin/bash

# Migration script: Old Supabase -> New Supabase

OLD_URL="https://yndcawdtkpqulpzxkwif.supabase.co"
OLD_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluZGNhd2R0a3BxdWxwenhrd2lmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzYwNTE4MywiZXhwIjoyMDYzMTgxMTgzfQ.Tj9bK4wylnpC9w0CxpQGyAH-sWJLb5qe9FRzJsrpSPw"

NEW_URL="https://uprkqfygjhxudhdpqhju.supabase.co"
NEW_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcmtxZnlnamh4dWRoZHBxaGp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg0MTcxNywiZXhwIjoyMDg0NDE3NzE3fQ.zYNNLVexQaKwCJYgRpJ1EbYxGWChit_kfw-XPKboyj8"

EXPORT_DIR="/Volumes/data/GITHUB/n8n-insider-extension/supabase/exports"
mkdir -p "$EXPORT_DIR"

echo "=== Exporting from OLD Supabase ==="

# Export templates
echo "Exporting templates..."
curl -s "${OLD_URL}/rest/v1/templates?select=*" \
  -H "apikey: ${OLD_KEY}" \
  -H "Authorization: Bearer ${OLD_KEY}" > "${EXPORT_DIR}/templates.json"
echo "  -> $(cat ${EXPORT_DIR}/templates.json | jq length) templates exported"

# Export workflow_documentation
echo "Exporting workflow_documentation..."
curl -s "${OLD_URL}/rest/v1/workflow_documentation?select=*" \
  -H "apikey: ${OLD_KEY}" \
  -H "Authorization: Bearer ${OLD_KEY}" > "${EXPORT_DIR}/workflow_documentation.json"
echo "  -> $(cat ${EXPORT_DIR}/workflow_documentation.json | jq length 2>/dev/null || echo 0) docs exported"

# Export admin_users
echo "Exporting admin_users..."
curl -s "${OLD_URL}/rest/v1/admin_users?select=*" \
  -H "apikey: ${OLD_KEY}" \
  -H "Authorization: Bearer ${OLD_KEY}" > "${EXPORT_DIR}/admin_users.json"
echo "  -> $(cat ${EXPORT_DIR}/admin_users.json | jq length 2>/dev/null || echo 0) admin users exported"

# Export workflow_snapshots
echo "Exporting workflow_snapshots..."
curl -s "${OLD_URL}/rest/v1/workflow_snapshots?select=*" \
  -H "apikey: ${OLD_KEY}" \
  -H "Authorization: Bearer ${OLD_KEY}" > "${EXPORT_DIR}/workflow_snapshots.json"
echo "  -> $(cat ${EXPORT_DIR}/workflow_snapshots.json | jq length 2>/dev/null || echo 0) snapshots exported"

echo ""
echo "=== Export complete! Files saved to ${EXPORT_DIR} ==="
echo ""
ls -la "${EXPORT_DIR}"
