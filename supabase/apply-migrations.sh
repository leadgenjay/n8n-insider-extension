#!/bin/bash

# Supabase Migration Application Script
# This script applies all migrations in order to your Supabase instance

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Check if project is linked
if [ ! -f .env.local ] || ! grep -q "SUPABASE_URL" .env.local; then
    echo -e "${YELLOW}Warning: Project may not be configured${NC}"
    echo "Make sure you have:"
    echo "1. Run 'supabase init' in your project root"
    echo "2. Run 'supabase link --project-ref YOUR_PROJECT_REF'"
    echo "3. Created a .env.local file with SUPABASE_URL and SUPABASE_ANON_KEY"
fi

echo -e "${GREEN}Starting migration process...${NC}"

# Migration files in order
migrations=(
    "20250101000001_create_profiles_table.sql"
    "20250101000002_create_profile_trigger.sql"
    "20250101000003_create_conversations_table.sql"
    "20250101000004_create_messages_table.sql"
    "20250101000005_create_workflow_snapshots_table.sql"
    "20250101000006_create_recent_messages_view.sql"
)

# Apply each migration
for migration in "${migrations[@]}"; do
    echo -e "\n${YELLOW}Applying: $migration${NC}"
    supabase db push --file "supabase/migrations/$migration"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Successfully applied $migration${NC}"
    else
        echo -e "${RED}✗ Failed to apply $migration${NC}"
        exit 1
    fi
done

echo -e "\n${GREEN}All migrations applied successfully!${NC}"

# Ask if user wants to run tests
read -p "Run schema validation tests? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${YELLOW}Running schema validation tests...${NC}"
    supabase db push --file "supabase/migrations/test_schema.sql"
fi

# Ask if user wants to generate TypeScript types
read -p "Generate TypeScript types? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${YELLOW}Generating TypeScript types...${NC}"
    mkdir -p src/types
    supabase gen types typescript --local > src/types/supabase.ts
    echo -e "${GREEN}✓ Types generated at src/types/supabase.ts${NC}"
fi

echo -e "\n${GREEN}Migration process complete!${NC}"
echo -e "\nNext steps:"
echo "1. Review the generated types in src/types/supabase.ts"
echo "2. Configure Google OAuth in Supabase Dashboard"
echo "3. Set up Stripe webhook Edge Function"
echo "4. Test RLS policies with different user contexts"
