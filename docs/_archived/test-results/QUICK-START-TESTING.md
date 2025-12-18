# Quick Start: Testing the Gantt Schedule Feature

## Step 1: Apply Database Migration

Run the migration to add schedule fields to your database:

```bash
# If using Supabase CLI locally
supabase db push

# Or apply the migration manually through Supabase dashboard
# Go to: Database > Migrations > New Migration
# Copy contents from: supabase/migrations/20251103232739_add_schedule_fields.sql
```

**Migration file**: `supabase/migrations/20251103232739_add_schedule_fields.sql`

This migration is **100% safe** - it only adds new columns, never modifies existing ones.

---

## Step 2: Enable Feature Flag

Create or edit `.env.local` file in the project root:

```env
VITE_FEATURE_SCHEDULE=true
VITE_FEATURE_SCHEDULE_WARNINGS=true
VITE_FEATURE_SCHEDULE_DEPS=true
```

**Important**: The `.env.local` file is gitignored, so it won't affect production.

---

## Step 3: Restart Dev Server

```bash
npm run dev
```

The feature flag is read at build time, so you need to restart.

---

## Step 4: Test the Feature

### Option A: Use Existing Project
1. Navigate to a project that has an **approved estimate**
2. You should see a **"Schedule"** tab in the sidebar
3. Click it to see the Gantt chart

### Option B: Create Test Project
```bash
# Install tsx if needed
npm install -D tsx

# Create test project with approved estimate
npm run create-test-project

# Follow the output to navigate to the test project
```

---

## What You Should See

✅ **Schedule tab** appears in project sidebar (between Expenses and Line Item Control)  
✅ **Gantt chart** displays all approved estimate line items  
✅ **Drag tasks** to change dates (auto-saves)  
✅ **Click tasks** to open edit panel  
✅ **Change orders** appear with striped pattern (if you have approved change orders)  
✅ **Stats dashboard** shows project duration and task counts  

---

## Troubleshooting

**Schedule tab doesn't appear?**
- Check `.env.local` has `VITE_FEATURE_SCHEDULE=true`
- Restart dev server
- Make sure project has an approved estimate

**Gantt chart is empty?**
- Project needs an approved estimate with line items
- Check browser console for errors

**Migration fails?**
- Check you're connected to the right database
- Verify you have permissions to alter tables

**Want to disable quickly?**
- Set `VITE_FEATURE_SCHEDULE=false` in `.env.local`
- Restart dev server
- Tab disappears immediately

---

## Next Steps After Testing

Once you've verified it works:
1. Test on mobile (PWA)
2. Test drag-and-drop functionality
3. Test dependency creation
4. Test warning system
5. Follow full `TESTING-CHECKLIST.md`

---

## Rollback (If Needed)

If something goes wrong:
1. Disable feature flag: `VITE_FEATURE_SCHEDULE=false`
2. Run rollback migration: `supabase/migrations/20251103232740_rollback_schedule_fields.sql`
3. Feature disappears - no code changes needed!

