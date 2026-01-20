#!/bin/bash

# Storage Migration Script: Old Supabase -> New Supabase

OLD_URL="https://yndcawdtkpqulpzxkwif.supabase.co"
OLD_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluZGNhd2R0a3BxdWxwenhrd2lmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzYwNTE4MywiZXhwIjoyMDYzMTgxMTgzfQ.Tj9bK4wylnpC9w0CxpQGyAH-sWJLb5qe9FRzJsrpSPw"

NEW_URL="https://uprkqfygjhxudhdpqhju.supabase.co"
NEW_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcmtxZnlnamh4dWRoZHBxaGp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg0MTcxNywiZXhwIjoyMDg0NDE3NzE3fQ.zYNNLVexQaKwCJYgRpJ1EbYxGWChit_kfw-XPKboyj8"

TEMP_DIR="/Volumes/data/GITHUB/n8n-insider-extension/supabase/storage_temp"
mkdir -p "$TEMP_DIR"

# Buckets to migrate
BUCKETS=("templates" "template-previews")

echo "=== Storage Migration ==="
echo ""

# Step 1: Create buckets in new Supabase
echo "Creating buckets in new Supabase..."
for bucket in "${BUCKETS[@]}"; do
  echo "  Creating bucket: $bucket"
  curl -s -X POST "${NEW_URL}/storage/v1/bucket" \
    -H "apikey: $NEW_KEY" \
    -H "Authorization: Bearer $NEW_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"id\":\"$bucket\",\"name\":\"$bucket\",\"public\":true}" > /dev/null
done
echo ""

# Step 2: Download and upload files for each bucket
for bucket in "${BUCKETS[@]}"; do
  echo "=== Migrating bucket: $bucket ==="

  # Create temp directory for this bucket
  BUCKET_DIR="$TEMP_DIR/$bucket"
  mkdir -p "$BUCKET_DIR"

  # List files in bucket
  FILES=$(curl -s "${OLD_URL}/storage/v1/object/list/${bucket}" \
    -H "apikey: $OLD_KEY" \
    -H "Authorization: Bearer $OLD_KEY" \
    -H "Content-Type: application/json" \
    -d '{"prefix":"","limit":1000}')

  # Get file names
  FILE_NAMES=$(echo "$FILES" | jq -r '.[].name')
  FILE_COUNT=$(echo "$FILES" | jq 'length')

  echo "  Found $FILE_COUNT files to migrate"

  # Download and upload each file
  for file in $FILE_NAMES; do
    echo "    Migrating: $file"

    # Download from old
    curl -s "${OLD_URL}/storage/v1/object/${bucket}/${file}" \
      -H "apikey: $OLD_KEY" \
      -H "Authorization: Bearer $OLD_KEY" \
      -o "$BUCKET_DIR/$file"

    # Get content type
    CONTENT_TYPE=$(file --mime-type -b "$BUCKET_DIR/$file")

    # Upload to new
    curl -s -X POST "${NEW_URL}/storage/v1/object/${bucket}/${file}" \
      -H "apikey: $NEW_KEY" \
      -H "Authorization: Bearer $NEW_KEY" \
      -H "Content-Type: $CONTENT_TYPE" \
      --data-binary "@$BUCKET_DIR/$file" > /dev/null
  done

  echo "  Done with $bucket"
  echo ""
done

echo "=== Verifying migration ==="
for bucket in "${BUCKETS[@]}"; do
  count=$(curl -s "${NEW_URL}/storage/v1/object/list/${bucket}" \
    -H "apikey: $NEW_KEY" \
    -H "Authorization: Bearer $NEW_KEY" \
    -H "Content-Type: application/json" \
    -d '{"prefix":"","limit":1000}' | jq 'length')
  echo "$bucket: $count files"
done

echo ""
echo "=== Cleaning up temp files ==="
rm -rf "$TEMP_DIR"
echo "Done!"
