#!/bin/bash
# Deploy Bid Media Migration to Supabase
# This script applies the bid_media metadata migration and verifies the changes

set -e

PROJECT_ID="clsjdxwbsjbhjibvlqbz"
MIGRATION_FILE="supabase/migrations/20251113160000_add_bid_media_metadata.sql"

echo "🚀 Deploying Bid Media Migration"
echo "================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    curl -sL https://github.com/supabase/cli/releases/download/v1.200.3/supabase_linux_amd64.tar.gz | tar xz -C /tmp
    sudo mv /tmp/supabase /usr/local/bin/
    echo "✅ Supabase CLI installed"
fi

echo "📋 Migration to apply: $MIGRATION_FILE"
echo ""

# Method 1: Try to link and push (requires authentication)
echo "Method 1: Using Supabase CLI"
echo "----------------------------"
if supabase link --project-ref $PROJECT_ID 2>/dev/null; then
    echo "✅ Linked to project"
    echo "🔄 Pushing migrations..."
    supabase db push
    echo "✅ Migration applied successfully!"
    
    echo ""
    echo "🔄 Regenerating TypeScript types..."
    supabase gen types typescript --linked > src/integrations/supabase/types-generated.ts
    echo "✅ Types generated in src/integrations/supabase/types-generated.ts"
    echo "   Review and replace src/integrations/supabase/types.ts if needed"
else
    echo "⚠️  Could not link to project (requires authentication)"
    echo ""
    echo "Method 2: Manual Application via Supabase Dashboard"
    echo "---------------------------------------------------"
    echo "1. Go to: https://supabase.com/dashboard/project/$PROJECT_ID/sql/new"
    echo "2. Copy the SQL from: $MIGRATION_FILE"
    echo "3. Paste and execute in the SQL Editor"
    echo ""
    echo "📄 Migration SQL:"
    echo "----------------"
    cat $MIGRATION_FILE
    echo ""
    echo "After applying manually, run this to verify:"
    echo "  npx tsx scripts/verify-migration.ts"
fi

echo ""
echo "✅ Deployment script complete"
