#!/bin/bash

# Import profile migration lookup data to New Supabase
# Run this AFTER running migrate_profiles.sql in the SQL Editor

NEW_URL="https://uprkqfygjhxudhdpqhju.supabase.co"
NEW_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcmtxZnlnamh4dWRoZHBxaGp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg0MTcxNywiZXhwIjoyMDg0NDE3NzE3fQ.zYNNLVexQaKwCJYgRpJ1EbYxGWChit_kfw-XPKboyj8"

EXPORT_DIR="/Volumes/data/GITHUB/n8n-insider-extension/supabase/exports"

echo "=== Importing Profile Migration Lookup Data ==="
echo ""

# Import lookup data
LOOKUP_DATA=$(cat "${EXPORT_DIR}/profile_migration_lookup.json")

echo "Importing 597 profile records to migration lookup table..."
RESULT=$(curl -s -X POST "${NEW_URL}/rest/v1/profile_migration_lookup" \
  -H "apikey: ${NEW_KEY}" \
  -H "Authorization: Bearer ${NEW_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d "$LOOKUP_DATA")

if echo "$RESULT" | grep -q "error"; then
  echo "Error: $RESULT"
else
  echo "Import successful!"
fi

echo ""
echo "Verifying import..."
COUNT=$(curl -s "${NEW_URL}/rest/v1/profile_migration_lookup?select=id" \
  -H "apikey: ${NEW_KEY}" \
  -H "Authorization: Bearer ${NEW_KEY}" | jq 'length')
echo "Records in lookup table: $COUNT"

echo ""
echo "=== Migration Complete ==="
echo ""
echo "When users sign up with their old email, their subscription data will be automatically restored!"
