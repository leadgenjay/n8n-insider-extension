#!/bin/bash

NEW_URL="https://uprkqfygjhxudhdpqhju.supabase.co"
NEW_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcmtxZnlnamh4dWRoZHBxaGp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg0MTcxNywiZXhwIjoyMDg0NDE3NzE3fQ.zYNNLVexQaKwCJYgRpJ1EbYxGWChit_kfw-XPKboyj8"
ADMIN_DATA=$(cat /Volumes/data/GITHUB/n8n-insider-extension/supabase/exports/admin_users.json)

echo "Importing admin_users..."
RESULT=$(curl -s -X POST "${NEW_URL}/rest/v1/admin_users" \
  -H "apikey: ${NEW_KEY}" \
  -H "Authorization: Bearer ${NEW_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d "$ADMIN_DATA")

echo "Result: $RESULT"
echo ""
echo "Verifying admin_users count..."
curl -s "${NEW_URL}/rest/v1/admin_users?select=id,email,role" \
  -H "apikey: ${NEW_KEY}" \
  -H "Authorization: Bearer ${NEW_KEY}" | jq
