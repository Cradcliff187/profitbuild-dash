# Training Module - Cursor Agent Implementation Prompt

> **Copy this entire prompt into Cursor to guide implementation.**
> 
> **Important:** Before starting, ensure you have access to these specification files in the `docs/` folder:
> - `TRAINING_MODULE_IMPLEMENTATION_PLAN.md`
> - `TRAINING_MODULE_DATABASE_MIGRATION.md`
> - `TRAINING_MODULE_EDGE_FUNCTION.md`
> - `TRAINING_MODULE_COMPONENTS.md`

---

## Context

I'm building a Training Module for RCG Work (construction management app). This module allows admins to upload training content (videos, decks, documents, links), assign to users, send email notifications, and track completion.

**Tech Stack:**
- React 18 + TypeScript + Vite
- Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- Tailwind CSS + shadcn-ui
- TanStack Query (React Query)
- react-hook-form + zod validation
- Resend for email

**Critical Rules:**
1. Follow existing patterns in the codebase exactly
2. Use shadcn-ui components (Card, Dialog, Sheet, Table, Form, etc.)
3. Use react-hook-form with zodResolver for all forms
4. Use sonner toast for notifications
5. Follow mobile-first design with 48px minimum touch targets
6. Integrate with existing reporting system (DO NOT create new reports page)

---

## Phase 1: Database Migration

**Task:** Create the database migration file.

**File to create:** `supabase/migrations/20251210150000_training_module.sql`

**Reference:** See `docs/TRAINING_MODULE_DATABASE_MIGRATION.md` for complete SQL.

**Steps:**
1. Create the migration file with all tables, enums, indexes, RLS policies
2. Run: `supabase db push` or apply via Supabase dashboard
3. Verify with the verification queries in the spec

**Verification:**
```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'training%';
```

---

## Phase 2: Edge Function

**Task:** Create the email notification edge function.

**File to create:** `supabase/functions/send-training-notification/index.ts`

**Reference:** See `docs/TRAINING_MODULE_EDGE_FUNCTION.md` for complete code.

**Steps:**
1. Create the function file following the existing `send-auth-email` pattern exactly
2. Add to `supabase/config.toml`:
   ```toml
   [functions.send-training-notification]
   verify_jwt = false
   ```
3. Deploy: `supabase functions deploy send-training-notification`

---

## Phase 3: Types

**Task:** Create TypeScript types for the training module.

**File to create:** `src/types/training.ts`

**Reference:** See `docs/TRAINING_MODULE_COMPONENTS.md` for complete types.

**Key types needed:**
- `TrainingContent`
- `TrainingAssignment`
- `TrainingCompletion`
- `MyTrainingItem`
- `TrainingStats`
- Create/Update data types
- Notification types

---

## Phase 4: Hooks

**Task:** Create React hooks for data management.

**Files to create:**
- `src/hooks/useTrainingContent.ts`
- `src/hooks/useTrainingAssignments.ts`

**Reference:** See `docs/TRAINING_MODULE_COMPONENTS.md` for complete hook implementations.

**Pattern to follow:** Reference existing hooks like `src/hooks/useBidMediaUpload.ts` for Supabase patterns.

---

## Phase 5: Utilities

**Task:** Create utility functions for file uploads and video parsing.

**File to create:** `src/utils/trainingStorage.ts`

**Reference:** See `docs/TRAINING_MODULE_COMPONENTS.md` for implementation.

**Pattern to follow:** Reference `src/utils/projectMedia.ts` for storage upload patterns.

---

## Phase 6: Admin Page

**Task:** Create the admin training management page.

**File to create:** `src/pages/TrainingAdmin.tsx`

**Pattern to follow:** Reference `src/pages/RoleManagement.tsx` for layout structure.

**Features:**
1. Stats cards (total content, published, draft, archived)
2. Content table with actions (edit, delete, publish, assign)
3. Sheet/Dialog for creating/editing content
4. Assignment dialog for assigning to users
5. Send notification functionality

**UI Structure:**
```tsx
<div className="space-y-4 p-4">
  {/* Header */}
  <div className="flex items-center justify-between">
    <h1>Training Management</h1>
    <Button onClick={openCreateSheet}>Add Content</Button>
  </div>

  {/* Stats Cards */}
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <Card>Total</Card>
    <Card>Published</Card>
    <Card>Draft</Card>
    <Card>Archived</Card>
  </div>

  {/* Filters */}
  <div className="flex gap-2">
    <Select status filter />
    <Input search />
  </div>

  {/* Content Table */}
  <Card>
    <Table>...</Table>
  </Card>

  {/* Create/Edit Sheet */}
  <Sheet>
    <TrainingContentForm />
  </Sheet>

  {/* Assignment Dialog */}
  <Dialog>
    <TrainingAssignmentDialog />
  </Dialog>
</div>
```

---

## Phase 7: User Training Page

**Task:** Create the user's "My Training" page.

**File to create:** `src/pages/Training.tsx`

**Features:**
1. Stats summary (total, completed, pending, overdue)
2. Filter tabs (All, Pending, Completed, Overdue)
3. Training cards with status indicators
4. Click to view content
5. Mark complete functionality

**UI Structure:**
```tsx
<div className="space-y-4 p-4">
  {/* Header with stats */}
  <div className="flex items-center justify-between">
    <h1>My Training</h1>
    <Badge>{stats.completionRate}% Complete</Badge>
  </div>

  {/* Stats Cards */}
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <Card>Total: {stats.total}</Card>
    <Card>Completed: {stats.completed}</Card>
    <Card>Pending: {stats.pending}</Card>
    <Card className="border-red-200">Overdue: {stats.overdue}</Card>
  </div>

  {/* Filter Tabs */}
  <Tabs defaultValue="all">
    <TabsList>
      <TabsTrigger value="all">All</TabsTrigger>
      <TabsTrigger value="pending">Pending</TabsTrigger>
      <TabsTrigger value="completed">Completed</TabsTrigger>
      <TabsTrigger value="overdue">Overdue</TabsTrigger>
    </TabsList>
  </Tabs>

  {/* Training List */}
  <div className="space-y-3">
    {filteredItems.map(item => (
      <TrainingCard key={item.assignment.id} item={item} />
    ))}
  </div>
</div>
```

---

## Phase 8: Content Viewer Page

**Task:** Create the training content viewer page.

**File to create:** `src/pages/TrainingViewer.tsx`

**Features:**
1. Display content based on type (video embed, PDF, external link)
2. Content title and description
3. "Mark Complete" button
4. Back navigation
5. Completion confirmation

**Content Display Logic:**
```tsx
// Video link (YouTube, Vimeo, Loom)
if (content.content_type === 'video_link') {
  const embedUrl = getVideoEmbedUrl(content.content_url);
  return <iframe src={embedUrl} className="w-full aspect-video" />;
}

// Document/Presentation (PDF viewer)
if (content.content_type === 'document' || content.content_type === 'presentation') {
  const signedUrl = await getTrainingFileUrl(content.storage_path);
  return <iframe src={signedUrl} className="w-full h-[600px]" />;
}

// External link
if (content.content_type === 'external_link') {
  return (
    <div className="text-center">
      <p>This training opens in a new window.</p>
      <Button onClick={() => window.open(content.content_url, '_blank')}>
        Open Training →
      </Button>
    </div>
  );
}
```

---

## Phase 9: Components

**Task:** Create supporting components.

**Files to create:**
- `src/components/training/TrainingContentForm.tsx`
- `src/components/training/TrainingContentTable.tsx`
- `src/components/training/TrainingAssignmentDialog.tsx`
- `src/components/training/MyTrainingList.tsx`
- `src/components/training/TrainingContentViewer.tsx`

**Form Schema Example (TrainingContentForm):**
```typescript
const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  content_type: z.enum(['video_link', 'video_embed', 'document', 'presentation', 'external_link']),
  content_url: z.string().url().optional(),
  duration_minutes: z.coerce.number().min(1).max(480).optional(),
  is_required: z.boolean().default(false),
  target_roles: z.array(z.enum(['admin', 'manager', 'field_worker'])).optional(),
});
```

---

## Phase 10: Navigation Integration

**Task:** Add routes and navigation items.

**File to update:** `src/App.tsx`

Add lazy imports:
```tsx
const Training = lazy(() => import("./pages/Training"));
const TrainingAdmin = lazy(() => import("./pages/TrainingAdmin"));
const TrainingViewer = lazy(() => import("./pages/TrainingViewer"));
```

Add routes inside ProtectedLayout:
```tsx
<Route path="training" element={<LazyRoute component={Training} />} />
<Route path="training/admin" element={<LazyRoute component={TrainingAdmin} />} />
<Route path="training/:id" element={<LazyRoute component={TrainingViewer} />} />
```

**File to update:** `src/components/Navigation.tsx`

Add to `secondaryItems` or `mobileNavGroups`:
```tsx
{ to: "/training", label: "My Training", icon: GraduationCap, show: true },
{ to: "/training/admin", label: "Training Admin", icon: BookOpen, show: isAdmin || isManager },
```

Add import:
```tsx
import { GraduationCap, BookOpen } from "lucide-react";
```

---

## Phase 11: Report Builder Integration

**Task:** Add training fields to the existing report builder.

**File to update:** `src/components/reports/SimpleReportBuilder.tsx`

Add to `AVAILABLE_FIELDS` constant:
```typescript
// Training fields (from reporting.training_status view)
{ key: 'employee_name', label: 'Employee Name', type: 'text', group: 'Training' },
{ key: 'content_title', label: 'Training Title', type: 'text', group: 'Training' },
{ key: 'content_type', label: 'Content Type', type: 'text', group: 'Training' },
{ key: 'status', label: 'Training Status', type: 'text', group: 'Training' },
{ key: 'is_required', label: 'Required', type: 'boolean', group: 'Training' },
{ key: 'due_date', label: 'Due Date', type: 'date', group: 'Training' },
{ key: 'assigned_at', label: 'Assigned Date', type: 'date', group: 'Training' },
{ key: 'completed_at', label: 'Completed Date', type: 'date', group: 'Training' },
{ key: 'days_remaining', label: 'Days Remaining', type: 'number', group: 'Training' },
{ key: 'estimated_duration', label: 'Est. Duration (min)', type: 'number', group: 'Training' },
{ key: 'actual_duration', label: 'Actual Duration (min)', type: 'number', group: 'Training' },
```

Add to `DATA_SOURCES`:
```typescript
{ value: 'reporting.training_status', label: 'Training Status' },
```

---

## Verification Checklist

After completing all phases, verify:

- [ ] Database tables exist and RLS is enabled
- [ ] Storage bucket `training-content` exists
- [ ] Edge function deploys and sends test email
- [ ] Admin can create/edit/delete training content
- [ ] Admin can publish/archive content
- [ ] Admin can assign content to users
- [ ] Admin can send email notifications
- [ ] Users see assigned training on My Training page
- [ ] Users can view embedded video content
- [ ] Users can view PDF/document content
- [ ] Users can open external links
- [ ] Users can mark training as complete
- [ ] Completion is recorded in database
- [ ] Training reports available in Report Builder
- [ ] Navigation shows Training links
- [ ] Mobile responsive (48px touch targets)
- [ ] Toast notifications working

---

## Common Issues & Solutions

**Issue:** RLS blocks queries
**Solution:** Check user has correct role in `user_roles` table

**Issue:** Storage upload fails
**Solution:** Verify bucket exists and storage policies are in place

**Issue:** Email not sending
**Solution:** Check ResendAPI secret in Supabase vault, verify domain in Resend

**Issue:** Video not embedding
**Solution:** Use `getVideoEmbedUrl()` utility to convert watch URLs to embed URLs

**Issue:** TypeScript errors
**Solution:** Ensure types in `training.ts` match database column names exactly

---

## Reference Files

When implementing, reference these existing files for patterns:

| Pattern | Reference File |
|---------|----------------|
| Form with zod | `src/components/ChangeOrderForm.tsx` |
| Page layout | `src/pages/RoleManagement.tsx` |
| Table component | `src/components/schedule/ScheduleTableView.tsx` |
| Dialog/Sheet | `src/components/schedule/ScheduleExportModal.tsx` |
| Hook pattern | `src/hooks/useBidMediaUpload.ts` |
| Storage upload | `src/utils/projectMedia.ts` |
| Edge function | `supabase/functions/send-auth-email/index.ts` |
| Email template | `supabase/functions/send-receipt-notification/index.ts` |

---

## Order of Implementation

1. ✅ Database migration (must be first)
2. ✅ Edge function (can deploy immediately)
3. ✅ Types file
4. ✅ Hooks
5. ✅ Utilities
6. ✅ Navigation updates (add routes early)
7. ✅ Admin page + components
8. ✅ User page + components
9. ✅ Viewer page
10. ✅ Report builder integration
11. ✅ Testing and polish
