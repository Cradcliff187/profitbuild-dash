# Training Module Implementation Plan

> **RCG Work - Internal Training & Content Management**
> 
> A lightweight training module that allows admins to upload content (videos, decks, links), assign to users, send email notifications, capture completion, and leverage existing reporting infrastructure.

---

## Table of Contents

1. [Overview](#overview)
2. [Existing Rails to Leverage](#existing-rails-to-leverage)
3. [Implementation Phases](#implementation-phases)
4. [File Structure](#file-structure)
5. [Navigation Integration](#navigation-integration)

---

## Overview

### Business Requirements

1. **Admin creates content** - Upload PDFs/decks, paste video links (YouTube, Vimeo), or external URLs
2. **Admin assigns content** - To all users, specific roles, or individual users
3. **Admin sends notifications** - Email via Resend with branded template and deep link
4. **User views content** - Embedded video, PDF viewer, or opens external link
5. **User marks complete** - Simple acknowledgment button
6. **Admin views reports** - Leverages existing report builder infrastructure

### What This Module Does NOT Include

- Video hosting (uses external links like YouTube, Vimeo, Loom)
- Complex quizzes or assessments
- Certifications with signatures
- SCORM compliance

---

## Existing Rails to Leverage

### 1. Database Patterns

| Pattern | Existing Example | Training Module Usage |
|---------|------------------|----------------------|
| UUID primary keys | All tables | `training_content.id` |
| `created_at`/`updated_at` timestamps | All tables | Same pattern |
| Foreign keys to `profiles.id` | `receipts.user_id` | `training_assignments.user_id` |
| ENUM types | `app_role`, `project_status` | `training_content_type`, `training_status` |
| RLS policies by role | `user_roles` checks | Same pattern for admin/manager access |

### 2. Reporting Infrastructure

**DO NOT create a new reports page.** Instead:

- Create a `reporting.training_status` view following the `reporting.project_financials` pattern
- Add training fields to `AVAILABLE_FIELDS` in `SimpleReportBuilder.tsx`
- Create 2-3 training report templates in `saved_reports` table
- Users access training reports via existing `/reports` page

### 3. Email Notifications (Resend)

Follow exact pattern from `supabase/functions/send-auth-email/index.ts`:

```typescript
// Pattern to follow:
- Fetch company branding from `company_branding_settings`
- Use Resend npm package
- Build branded HTML email template
- Return email ID for tracking
```

### 4. Storage (Supabase)

Use existing `time-tracker-documents` bucket OR create `training-content` bucket following same pattern:

```typescript
// Pattern from receipts:
const storagePath = `${user.id}/training/${timestamp}_${filename}`;
const { data } = await supabase.storage
  .from('training-content')
  .upload(storagePath, file);
```

### 5. UI Components (shadcn-ui)

| Component | Usage |
|-----------|-------|
| `Sheet` | Content creation/edit form |
| `Dialog` | Assignment dialog, confirmation modals |
| `Card` | Content list items, stats cards |
| `Table` | Admin content list, user assignments |
| `Form` + `react-hook-form` + `zod` | All forms |
| `Select` | Role/user selection |
| `Badge` | Status indicators |
| `Tabs` | Admin page sections |

### 6. Page Patterns

Follow `src/pages/RoleManagement.tsx` structure:
- Card-based layout
- Filter/search bar
- Table with actions
- Dialog/Sheet for create/edit

### 7. Form Patterns

Follow `src/components/ChangeOrderForm.tsx`:
```typescript
const schema = z.object({...});
const form = useForm({ resolver: zodResolver(schema) });
```

### 8. Navigation

Add to existing `src/components/Navigation.tsx`:
```typescript
{ to: "/training", label: "Training", icon: GraduationCap, show: true },
{ to: "/training/admin", label: "Training Admin", icon: GraduationCap, show: isAdmin || isManager },
```

---

## Implementation Phases

### Phase 1: Database Migration (Day 1)

**Files to create:**
- `supabase/migrations/YYYYMMDD_training_module.sql`

**Creates:**
- `training_content_type` enum
- `training_status` enum
- `training_content` table
- `training_assignments` table
- `training_completions` table
- `training_notifications` table
- `reporting.training_status` view
- RLS policies
- Indexes

### Phase 2: Edge Function (Day 1-2)

**Files to create:**
- `supabase/functions/send-training-notification/index.ts`

**Updates:**
- `supabase/config.toml` - Add function config

### Phase 3: Types & Hooks (Day 2)

**Files to create:**
- `src/types/training.ts`
- `src/hooks/useTrainingContent.ts`
- `src/hooks/useTrainingAssignments.ts`
- `src/utils/trainingStorage.ts`

### Phase 4: Admin UI (Day 2-3)

**Files to create:**
- `src/pages/TrainingAdmin.tsx`
- `src/components/training/TrainingContentForm.tsx`
- `src/components/training/TrainingContentTable.tsx`
- `src/components/training/TrainingAssignmentDialog.tsx`

### Phase 5: User UI (Day 3-4)

**Files to create:**
- `src/pages/Training.tsx`
- `src/pages/TrainingViewer.tsx`
- `src/components/training/MyTrainingList.tsx`
- `src/components/training/TrainingContentViewer.tsx`

### Phase 6: Reporting Integration (Day 4)

**Files to update:**
- `src/components/reports/SimpleReportBuilder.tsx` - Add training fields
- Seed training report templates in database

### Phase 7: Navigation & Polish (Day 4-5)

**Files to update:**
- `src/App.tsx` - Add routes
- `src/components/Navigation.tsx` - Add nav items
- Testing and bug fixes

---

## File Structure

```
src/
├── pages/
│   ├── Training.tsx              # User's "My Training" page
│   ├── TrainingAdmin.tsx         # Admin content management
│   └── TrainingViewer.tsx        # View/complete training content
├── components/
│   └── training/
│       ├── TrainingContentForm.tsx
│       ├── TrainingContentTable.tsx
│       ├── TrainingAssignmentDialog.tsx
│       ├── MyTrainingList.tsx
│       └── TrainingContentViewer.tsx
├── hooks/
│   ├── useTrainingContent.ts
│   └── useTrainingAssignments.ts
├── types/
│   └── training.ts
└── utils/
    └── trainingStorage.ts

supabase/
├── migrations/
│   └── YYYYMMDD_training_module.sql
└── functions/
    └── send-training-notification/
        └── index.ts
```

---

## Navigation Integration

### Routes (App.tsx)

```tsx
// Add to lazy imports
const Training = lazy(() => import("./pages/Training"));
const TrainingAdmin = lazy(() => import("./pages/TrainingAdmin"));
const TrainingViewer = lazy(() => import("./pages/TrainingViewer"));

// Add routes inside ProtectedLayout
<Route path="training" element={<LazyRoute component={Training} />} />
<Route path="training/admin" element={<LazyRoute component={TrainingAdmin} />} />
<Route path="training/:id" element={<LazyRoute component={TrainingViewer} />} />
```

### Navigation Items (Navigation.tsx)

Add to `mobileNavGroups` under "Workflows" or create new "Learning" group:

```tsx
{ to: "/training", label: "My Training", icon: GraduationCap, show: true },
{ to: "/training/admin", label: "Training Admin", icon: BookOpen, show: isAdmin || isManager },
```

---

## Success Criteria

- [ ] Admin can create training content (link, video, document)
- [ ] Admin can assign content to users (all, by role, individual)
- [ ] Email notifications sent via Resend with branded template
- [ ] Users see assigned training in "My Training" page
- [ ] Users can view content and mark complete
- [ ] Completion data captured in database
- [ ] Training reports available in existing Reports page
- [ ] Mobile-responsive with 48px touch targets
