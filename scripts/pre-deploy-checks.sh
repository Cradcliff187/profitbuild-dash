#!/bin/bash

echo "Running pre-deployment safety checks..."

# Check 1: Ensure feature flags are OFF in production
echo "→ Checking feature flags..."
if grep -q "VITE_FEATURE_SCHEDULE=true" .env.production 2>/dev/null; then
    echo "✗ WARNING: Schedule feature is enabled in production!"
    echo "  Please set VITE_FEATURE_SCHEDULE=false in .env.production"
    exit 1
fi
echo "✓ Feature flags are safe"

# Check 2: TypeScript compilation
echo "→ Checking TypeScript compilation..."
npm run type-check 2>/dev/null || npm run build 2>/dev/null
if [ $? -ne 0 ]; then
    echo "✗ TypeScript errors detected"
    exit 1
fi
echo "✓ TypeScript compiles successfully"

# Check 3: No imports of schedule components in existing code
echo "→ Checking for schedule imports in existing components..."
SCHEDULE_IMPORTS=$(grep -r "from.*schedule/" src/components --exclude-dir=schedule --exclude-dir=node_modules 2>/dev/null | wc -l)
if [ $SCHEDULE_IMPORTS -gt 1 ]; then  # Allow 1 for ProjectDetailView
    echo "✗ WARNING: Schedule components imported in existing code"
    echo "  This may cause breaking changes. Review imports."
    grep -r "from.*schedule/" src/components --exclude-dir=schedule 2>/dev/null
    exit 1
fi
echo "✓ No unsafe schedule imports"

# Check 4: Database backup exists (optional check)
echo "→ Checking for recent database backup..."
if [ -d "backups" ] && [ -n "$(ls -A backups 2>/dev/null)" ]; then
    LATEST_BACKUP=$(ls -t backups/*.sql 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        echo "✓ Recent backup exists: $LATEST_BACKUP"
    else
        echo "⚠ No backup found (optional, but recommended)"
    fi
else
    echo "⚠ No backup directory found (optional, but recommended)"
fi

# Check 5: No direct table modifications in migration
echo "→ Checking migration safety..."
MIGRATION_FILE=$(ls -t supabase/migrations/*schedule*.sql 2>/dev/null | head -1)
if [ -n "$MIGRATION_FILE" ] && [ -f "$MIGRATION_FILE" ]; then
    if grep -q "ALTER.*DROP\|ALTER.*MODIFY\|UPDATE.*SET" "$MIGRATION_FILE" 2>/dev/null; then
        echo "✗ WARNING: Migration contains potentially dangerous operations"
        echo "  Only ADD operations are safe. Review migration carefully."
        exit 1
    fi
    echo "✓ Migration is additive-only"
else
    echo "⚠ No schedule migration found"
fi

echo ""
echo "════════════════════════════════════════"
echo "✓ All safety checks passed"
echo "════════════════════════════════════════"
echo ""

