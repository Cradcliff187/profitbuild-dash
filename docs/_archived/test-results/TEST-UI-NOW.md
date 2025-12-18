# 🚀 Test the Gantt Chart UI - Quick Guide

## ✅ Current Status
- ✅ Dev server running on **http://localhost:8080**
- ✅ Feature flags enabled in `.env.local`
- ✅ All components implemented
- ✅ TypeScript compiles without errors

## ⚠️ IMPORTANT: Database Migration Required

Before you can see the Schedule tab, you **must** apply the database migration:

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to: **Database** → **Migrations**
3. Click **"New Migration"**
4. Copy the contents from: `supabase/migrations/20251103232739_add_schedule_fields.sql`
5. Paste and click **"Run"**

### Option 2: Via Supabase CLI (if installed)
```bash
supabase db push
```

---

## 🧪 Testing Steps

### Step 1: Open the App
Open your browser and go to:
```
http://localhost:8080
```

### Step 2: Navigate to a Project
1. Log in if needed
2. Go to **Projects** page
3. Click on a project that has an **approved estimate**

### Step 3: Find the Schedule Tab
Look in the **left sidebar** - you should see:
- Overview
- Estimates & Quotes
- Expenses
- **Schedule** ← NEW! (between Expenses and Line Item Control)
- Line Item Control
- ...

### Step 4: Test the Gantt Chart
Once you click **Schedule**:
- ✅ Gantt chart displays all approved estimate line items
- ✅ Tasks are color-coded by category
- ✅ Drag tasks to change dates
- ✅ Click tasks to open edit panel
- ✅ Stats dashboard shows metrics

---

## 🎯 Quick Test Scenarios

### Test 1: Basic Display
- [ ] Schedule tab appears in sidebar
- [ ] Gantt chart loads with tasks
- [ ] Tasks show correct names and dates

### Test 2: Drag & Drop
- [ ] Drag a task bar to change dates
- [ ] Dates update automatically
- [ ] Change persists after refresh

### Test 3: Task Editing
- [ ] Click a task to open edit panel
- [ ] Change start date and duration
- [ ] Save changes
- [ ] Changes appear in Gantt chart

### Test 4: Change Orders
- [ ] If project has approved change orders, they appear with striped pattern
- [ ] Change order tasks are distinguishable

---

## 🐛 Troubleshooting

### "Schedule tab doesn't appear"
- ✅ Check `.env.local` has `VITE_FEATURE_SCHEDULE=true`
- ✅ Restart dev server: Stop (Ctrl+C) and run `npm run dev` again
- ✅ Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### "Gantt chart is empty"
- ✅ Project needs an **approved estimate** with line items
- ✅ Check browser console for errors (F12)
- ✅ Verify database migration was applied

### "Migration fails"
- ✅ Check you're connected to the right Supabase project
- ✅ Verify you have admin permissions
- ✅ Check migration file syntax is correct

### "Tasks don't save"
- ✅ Check browser console for errors
- ✅ Verify database connection
- ✅ Check if migration added the schedule columns

---

## 📝 Create Test Data (Optional)

If you don't have a project with an approved estimate:

```bash
npm run create-test-project
```

This creates:
- Test project named "[TEST] Schedule Feature Test"
- Approved estimate with sample line items
- Ready to test immediately

**Clean up later:**
```bash
npm run cleanup-test-data
```

---

## 🎨 What You Should See

### Desktop View:
- Full-width Gantt chart
- Side panel for task editing
- Stats dashboard at top
- Color-coded task bars by category

### Mobile View:
- Responsive Gantt chart
- Touch-friendly drag interactions
- Collapsible panels
- Optimized for small screens

---

## ✅ Ready to Test!

1. **Apply migration** (if not done)
2. **Open** http://localhost:8080
3. **Navigate** to a project with approved estimate
4. **Click** Schedule tab
5. **Test** the features!

Happy testing! 🎉

