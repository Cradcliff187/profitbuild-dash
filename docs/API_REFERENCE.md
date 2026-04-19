# API Reference

> Generated on 2026-04-19T01:09:51.073Z by `scripts/generate-api-docs.ts`.

This reference enumerates all exported components, hooks, functions, classes, types, enums, and values exposed under `src/`. Each entry includes import examples and usage guidance.

## React Components

Total: 378

### AccountMappingsManager

**Import:** `@/components/AccountMappingsManager`

- Defined in: `components/AccountMappingsManager.tsx`
- Export type: named

```ts
function AccountMappingsManager(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { AccountMappingsManager } from '@/components/AccountMappingsManager';

<AccountMappingsManager {...props} />
```

### ActiveTimersTable

**Import:** `@/components/role-management/ActiveTimersTable`

- Defined in: `components/role-management/ActiveTimersTable.tsx`
- Export type: named

```ts
function ActiveTimersTable({ onTimerClosed }: ActiveTimersTableProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ActiveTimersTable } from '@/components/role-management/ActiveTimersTable';

<ActiveTimersTable {...props} />
```

### ActivityFeedList

**Import:** `@/components/ActivityFeedList`

- Defined in: `components/ActivityFeedList.tsx`
- Export type: named

```ts
function ActivityFeedList({ 
  limit = 20, 
  projectId = null,
  showFilters = true 
}: ActivityFeedListProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ActivityFeedList } from '@/components/ActivityFeedList';

<ActivityFeedList {...props} />
```

### AddReceiptModal

**Import:** `@/components/time-tracker/AddReceiptModal`

- Defined in: `components/time-tracker/AddReceiptModal.tsx`
- Export type: named

```ts
function AddReceiptModal({
  open,
  onClose,
  onSuccess,
  initialProjectId
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { AddReceiptModal } from '@/components/time-tracker/AddReceiptModal';

<AddReceiptModal {...props} />
```

### AdminCreateTimeEntrySheet

**Import:** `@/components/time-entries/AdminCreateTimeEntrySheet`

- Defined in: `components/time-entries/AdminCreateTimeEntrySheet.tsx`
- Export type: named

```ts
function AdminCreateTimeEntrySheet({
  open,
  onOpenChange,
  onSuccess,
}: AdminCreateTimeEntrySheetProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { AdminCreateTimeEntrySheet } from '@/components/time-entries/AdminCreateTimeEntrySheet';

<AdminCreateTimeEntrySheet {...props} />
```

### AdminEditTimeEntrySheet

**Import:** `@/components/time-entries/AdminEditTimeEntrySheet`

- Defined in: `components/time-entries/AdminEditTimeEntrySheet.tsx`
- Export type: named

```ts
function AdminEditTimeEntrySheet({
  entry,
  open,
  onOpenChange,
  onSuccess,
}: AdminEditTimeEntrySheetProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { AdminEditTimeEntrySheet } from '@/components/time-entries/AdminEditTimeEntrySheet';

<AdminEditTimeEntrySheet {...props} />
```

### AICaptionEnhancer

**Import:** `@/components/AICaptionEnhancer`

- Defined in: `components/AICaptionEnhancer.tsx`
- Export type: named

```ts
function AICaptionEnhancer({
  imageUrl,
  originalCaption,
  onAccept,
  onCancel
}: AICaptionEnhancerProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { AICaptionEnhancer } from '@/components/AICaptionEnhancer';

<AICaptionEnhancer {...props} />
```

### AIInsightsCard

**Import:** `@/components/reports/AIInsightsCard`

- Defined in: `components/reports/AIInsightsCard.tsx`
- Export type: named

```ts
function AIInsightsCard({ insights, className }: AIInsightsCardProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { AIInsightsCard } from '@/components/reports/AIInsightsCard';

<AIInsightsCard {...props} />
```

### AIReportChat

**Import:** `@/components/reports/AIReportChat`

- Defined in: `components/reports/AIReportChat.tsx`
- Export type: named

```ts
function AIReportChat(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { AIReportChat } from '@/components/reports/AIReportChat';

<AIReportChat {...props} />
```

### AllExpensesLineItemsReport

**Import:** `@/pages/AllExpensesLineItemsReport`

- Defined in: `pages/AllExpensesLineItemsReport.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import AllExpensesLineItemsReport from '@/pages/AllExpensesLineItemsReport';

<AllExpensesLineItemsReport {...props} />
```

### AllRevenuesLineItemsReport

**Import:** `@/pages/AllRevenuesLineItemsReport`

- Defined in: `pages/AllRevenuesLineItemsReport.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import AllRevenuesLineItemsReport from '@/pages/AllRevenuesLineItemsReport';

<AllRevenuesLineItemsReport {...props} />
```

### App

**Import:** `@/App`

- Defined in: `App.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import App from '@/App';

<App {...props} />
```

### AppLayout

**Import:** `@/components/AppLayout`

- Defined in: `components/AppLayout.tsx`
- Export type: default

```ts
function AppLayout(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import AppLayout from '@/components/AppLayout';

<AppLayout {...props} />
```

### AppSidebar

**Import:** `@/components/AppSidebar`

- Defined in: `components/AppSidebar.tsx`
- Export type: named

```ts
function AppSidebar(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { AppSidebar } from '@/components/AppSidebar';

<AppSidebar {...props} />
```

### AudioVisualizer

**Import:** `@/components/ui/audio-visualizer`

- Defined in: `components/ui/audio-visualizer.tsx`
- Export type: named

```ts
function AudioVisualizer({ 
  level, 
  className, 
  barCount = 5,
  compact = false 
}: AudioVisualizerProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { AudioVisualizer } from '@/components/ui/audio-visualizer';

<AudioVisualizer {...props} />
```

### Auth

**Import:** `@/pages/Auth`

- Defined in: `pages/Auth.tsx`
- Export type: default

```ts
function Auth(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import Auth from '@/pages/Auth';

<Auth {...props} />
```

### AuthProvider

**Import:** `@/contexts/AuthContext`

- Defined in: `contexts/AuthContext.tsx`
- Export type: named

```ts
function AuthProvider({ children }): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { AuthProvider } from '@/contexts/AuthContext';

<AuthProvider {...props} />
```

### AVAILABLE_FIELDS

**Import:** `@/components/reports/SimpleReportBuilder`

- Defined in: `components/reports/SimpleReportBuilder.tsx`
- Export type: named

```ts
Record<string, FieldMetadata[]>
```

_No inline documentation provided._

**Example**

```tsx
import { AVAILABLE_FIELDS } from '@/components/reports/SimpleReportBuilder';

<AVAILABLE_FIELDS {...props} />
```

### Badge

**Import:** `@/components/ui/badge`

- Defined in: `components/ui/badge.tsx`
- Export type: named

```ts
function Badge({ className, variant, ...props }: BadgeProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { Badge } from '@/components/ui/badge';

<Badge {...props} />
```

### BidBulkActions

**Import:** `@/components/BidBulkActions`

- Defined in: `components/BidBulkActions.tsx`
- Export type: named

```ts
function BidBulkActions({
  selectedCount,
  onDelete,
  onCancel,
}: BidBulkActionsProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { BidBulkActions } from '@/components/BidBulkActions';

<BidBulkActions {...props} />
```

### BidDocumentUpload

**Import:** `@/components/BidDocumentUpload`

- Defined in: `components/BidDocumentUpload.tsx`
- Export type: named

```ts
function BidDocumentUpload({ bidId }: BidDocumentUploadProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { BidDocumentUpload } from '@/components/BidDocumentUpload';

<BidDocumentUpload {...props} />
```

### BidExportModal

**Import:** `@/components/BidExportModal`

- Defined in: `components/BidExportModal.tsx`
- Export type: named

```ts
function BidExportModal({
  isOpen,
  onClose,
  bids
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { BidExportModal } from '@/components/BidExportModal';

<BidExportModal {...props} />
```

### BidFilters

**Import:** `@/components/BidFilters`

- Defined in: `components/BidFilters.tsx`
- Export type: named

```ts
function BidFilters({
  filters,
  onFiltersChange,
  resultCount,
  leftActions,
  actions,
  clients
}: BidFiltersProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { BidFilters } from '@/components/BidFilters';

<BidFilters {...props} />
```

### BidMediaBulkUpload

**Import:** `@/components/BidMediaBulkUpload`

- Defined in: `components/BidMediaBulkUpload.tsx`
- Export type: named

```ts
function BidMediaBulkUpload({ bidId, onUploadComplete }: BidMediaBulkUploadProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { BidMediaBulkUpload } from '@/components/BidMediaBulkUpload';

<BidMediaBulkUpload {...props} />
```

### BidMediaGallery

**Import:** `@/components/BidMediaGallery`

- Defined in: `components/BidMediaGallery.tsx`
- Export type: named

```ts
function BidMediaGallery({ bidId, bidName }: BidMediaGalleryProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { BidMediaGallery } from '@/components/BidMediaGallery';

<BidMediaGallery {...props} />
```

### BidNotesTimeline

**Import:** `@/components/BidNotesTimeline`

- Defined in: `components/BidNotesTimeline.tsx`
- Export type: named

```ts
function BidNotesTimeline({ bidId }: BidNotesTimelineProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { BidNotesTimeline } from '@/components/BidNotesTimeline';

<BidNotesTimeline {...props} />
```

### BidPhotoCapture

**Import:** `@/pages/BidPhotoCapture`

- Defined in: `pages/BidPhotoCapture.tsx`
- Export type: default

```ts
function BidPhotoCapture(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import BidPhotoCapture from '@/pages/BidPhotoCapture';

<BidPhotoCapture {...props} />
```

### BidPhotoLightbox

**Import:** `@/components/BidPhotoLightbox`

- Defined in: `components/BidPhotoLightbox.tsx`
- Export type: named

```ts
function BidPhotoLightbox({ photo, allPhotos, onClose, onNavigate, bidId }: BidPhotoLightboxProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { BidPhotoLightbox } from '@/components/BidPhotoLightbox';

<BidPhotoLightbox {...props} />
```

### BidsTableView

**Import:** `@/components/BidsTableView`

- Defined in: `components/BidsTableView.tsx`
- Export type: named

```ts
function BidsTableView({
  bids,
  onDelete,
  isLoading = false,
  selectedIds = [],
  onSelectAll,
  onSelectOne,
  visibleColumns = [],
  columnOrder = [],
  sortColumn = null,
  sortDirection = 'asc',
  onSort,
  renderSortIcon,
  totalCount,
  pageSize,
  onPageSizeChange,
  currentPage,
  totalPages,
  onPageChange,
}: BidsTableViewProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { BidsTableView } from '@/components/BidsTableView';

<BidsTableView {...props} />
```

### BidVideoCapture

**Import:** `@/pages/BidVideoCapture`

- Defined in: `pages/BidVideoCapture.tsx`
- Export type: default

```ts
function BidVideoCapture(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import BidVideoCapture from '@/pages/BidVideoCapture';

<BidVideoCapture {...props} />
```

### BillingProgressTable

**Import:** `@/components/profit-analysis/BillingProgressTable`

- Defined in: `components/profit-analysis/BillingProgressTable.tsx`
- Export type: named

```ts
function BillingProgressTable({ data, isLoading, onSelectProject }: Props): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { BillingProgressTable } from '@/components/profit-analysis/BillingProgressTable';

<BillingProgressTable {...props} />
```

### BranchBidDetail

**Import:** `@/pages/BranchBidDetail`

- Defined in: `pages/BranchBidDetail.tsx`
- Export type: default

```ts
function BranchBidDetail(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import BranchBidDetail from '@/pages/BranchBidDetail';

<BranchBidDetail {...props} />
```

### BranchBids

**Import:** `@/pages/BranchBids`

- Defined in: `pages/BranchBids.tsx`
- Export type: default

```ts
function BranchBids(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import BranchBids from '@/pages/BranchBids';

<BranchBids {...props} />
```

### BrandedLoader

**Import:** `@/components/ui/branded-loader`

- Defined in: `components/ui/branded-loader.tsx`
- Export type: named

```ts
function BrandedLoader({
  message,
  size = 'lg',
  className,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { BrandedLoader } from '@/components/ui/branded-loader';

<BrandedLoader {...props} />
```

### BucketEmptyState

**Import:** `@/components/cost-tracking/BucketEmptyState`

- Defined in: `components/cost-tracking/BucketEmptyState.tsx`
- Export type: named

```ts
function BucketEmptyState({ unmatchedSpend, bucketName }: BucketEmptyStateProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

Rendered inside an expanded bucket that has no line items.

Two states:
  - unmatchedSpend === 0: neutral "no line items" message (e.g. permits estimated but no spend yet)
  - unmatchedSpend > 0:   amber data-hygiene warning with dollar amount + recategorize CTA copy

This is the surface the bucket view exists to make impossible to miss
(see plan, Step 1, "category exists in spend but not in estimate" handling).

**Example**

```tsx
import { BucketEmptyState } from '@/components/cost-tracking/BucketEmptyState';

<BucketEmptyState {...props} />
```

### BucketHeaderRow

**Import:** `@/components/cost-tracking/BucketHeaderRow`

- Defined in: `components/cost-tracking/BucketHeaderRow.tsx`
- Export type: named

```ts
function BucketHeaderRow({ bucket, isOpen, onClick }: BucketHeaderRowProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

Bucket header row used by CostBucketView (the "replace the table" view).

For non-labor buckets: chevron · name · progress bar · target / spent / remaining.

For the Labor bucket: same top row PLUS a sub-line showing the dynamic cushion state.
The sub-line color and copy adapt to the three cushion zones (under_est / in_cushion /
over_capacity) — see plan, Step 2 mockups for the exact visual states.

The "no_target" status (bucket has spend but no estimate line) shows an "Over" badge
regardless of percent — it's a data hygiene flag, not a normal overrun.

**Example**

```tsx
import { BucketHeaderRow } from '@/components/cost-tracking/BucketHeaderRow';

<BucketHeaderRow {...props} />
```

### BudgetComparisonBadge

**Import:** `@/components/BudgetComparisonBadge`

- Defined in: `components/BudgetComparisonBadge.tsx`
- Export type: named

```ts
function BudgetComparisonBadge({ status }: BudgetComparisonBadgeProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { BudgetComparisonBadge } from '@/components/BudgetComparisonBadge';

<BudgetComparisonBadge {...props} />
```

### BudgetHealthTable

**Import:** `@/components/profit-analysis/BudgetHealthTable`

- Defined in: `components/profit-analysis/BudgetHealthTable.tsx`
- Export type: named

```ts
function BudgetHealthTable({ data, isLoading, onSelectProject }: Props): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { BudgetHealthTable } from '@/components/profit-analysis/BudgetHealthTable';

<BudgetHealthTable {...props} />
```

### BulkActionsBar

**Import:** `@/components/time-tracker/BulkActionsBar`

- Defined in: `components/time-tracker/BulkActionsBar.tsx`
- Export type: named

```ts
function BulkActionsBar({ selectedIds, onClearSelection, onRefresh }: BulkActionsBarProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { BulkActionsBar } from '@/components/time-tracker/BulkActionsBar';

<BulkActionsBar {...props} />
```

### BulkExpenseAllocationSheet

**Import:** `@/components/BulkExpenseAllocationSheet`

- Defined in: `components/BulkExpenseAllocationSheet.tsx`
- Export type: named

```ts
function BulkExpenseAllocationSheet({
  open,
  onOpenChange,
  onSuccess,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { BulkExpenseAllocationSheet } from '@/components/BulkExpenseAllocationSheet';

<BulkExpenseAllocationSheet {...props} />
```

### calculateCriticalPath

**Import:** `@/components/schedule/utils/scheduleCalculations`

- Defined in: `components/schedule/utils/scheduleCalculations.ts`
- Export type: named

```ts
function calculateCriticalPath(tasks: ScheduleTask[]): string[]
```

Calculate critical path through the project
Returns array of task IDs that are on the critical path

**Example**

```tsx
import { calculateCriticalPath } from '@/components/schedule/utils/scheduleCalculations';

<calculateCriticalPath {...props} />
```

### calculateDuration

**Import:** `@/components/schedule/utils/scheduleCalculations`

- Defined in: `components/schedule/utils/scheduleCalculations.ts`
- Export type: named

```ts
function calculateDuration(startDate: Date, endDate: Date): number
```

Calculate the duration in days between two dates (inclusive)

**Example**

```tsx
import { calculateDuration } from '@/components/schedule/utils/scheduleCalculations';

<calculateDuration {...props} />
```

### calculateEarliestStart

**Import:** `@/components/schedule/utils/scheduleCalculations`

- Defined in: `components/schedule/utils/scheduleCalculations.ts`
- Export type: named

```ts
function calculateEarliestStart(task: ScheduleTask, allTasks: ScheduleTask[]): Date
```

Calculate the earliest start date for a task based on its dependencies

**Example**

```tsx
import { calculateEarliestStart } from '@/components/schedule/utils/scheduleCalculations';

<calculateEarliestStart {...props} />
```

### calculateEndDate

**Import:** `@/components/schedule/utils/scheduleCalculations`

- Defined in: `components/schedule/utils/scheduleCalculations.ts`
- Export type: named

```ts
function calculateEndDate(startDate: Date, durationDays: number): Date
```

Calculate end date given start date and duration

**Example**

```tsx
import { calculateEndDate } from '@/components/schedule/utils/scheduleCalculations';

<calculateEndDate {...props} />
```

### calculateProgressFromCost

**Import:** `@/components/schedule/utils/scheduleCalculations`

- Defined in: `components/schedule/utils/scheduleCalculations.ts`
- Export type: named

```ts
function calculateProgressFromCost(actualCost: number, estimatedCost: number): number
```

Calculate progress percentage from actual vs estimated cost

**Example**

```tsx
import { calculateProgressFromCost } from '@/components/schedule/utils/scheduleCalculations';

<calculateProgressFromCost {...props} />
```

### calculateProjectDuration

**Import:** `@/components/schedule/utils/scheduleCalculations`

- Defined in: `components/schedule/utils/scheduleCalculations.ts`
- Export type: named

```ts
function calculateProjectDuration(tasks: ScheduleTask[]): number
```

Calculate total project duration from tasks

**Example**

```tsx
import { calculateProjectDuration } from '@/components/schedule/utils/scheduleCalculations';

<calculateProjectDuration {...props} />
```

### calculateScheduleVariance

**Import:** `@/components/schedule/utils/scheduleCalculations`

- Defined in: `components/schedule/utils/scheduleCalculations.ts`
- Export type: named

```ts
function calculateScheduleVariance(task: ScheduleTask, today: Date = new Date()): number
```

Calculate schedule variance (days ahead/behind)

**Example**

```tsx
import { calculateScheduleVariance } from '@/components/schedule/utils/scheduleCalculations';

<calculateScheduleVariance {...props} />
```

### Calendar

**Import:** `@/components/ui/calendar`

- Defined in: `components/ui/calendar.tsx`
- Export type: named

```ts
function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { Calendar } from '@/components/ui/calendar';

<Calendar {...props} />
```

### CAPTION_PROMPTS

**Import:** `@/components/CaptionPromptToast`

- Defined in: `components/CaptionPromptToast.tsx`
- Export type: named

```ts
{ readonly firstCapture: "📸 Quick tip: Voice captions save time during reviews"; readonly afterSkip: "Caption now or add details later in gallery"; readonly gpsAvailable: "Location captured - add context with voice note?"; readonly multipleSkips: "Captions improve project documentation accuracy"; readonly reviewAiCaption: "Review AI caption for accuracy"; }
```

_No inline documentation provided._

**Example**

```tsx
import { CAPTION_PROMPTS } from '@/components/CaptionPromptToast';

<CAPTION_PROMPTS {...props} />
```

### CategoryBreakdownTable

**Import:** `@/components/profit-analysis/CategoryBreakdownTable`

- Defined in: `components/profit-analysis/CategoryBreakdownTable.tsx`
- Export type: named

```ts
function CategoryBreakdownTable({ categories, expensesByCategory }: Props): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { CategoryBreakdownTable } from '@/components/profit-analysis/CategoryBreakdownTable';

<CategoryBreakdownTable {...props} />
```

### CertificationSection

**Import:** `@/components/payment-applications/CertificationSection`

- Defined in: `components/payment-applications/CertificationSection.tsx`
- Export type: named

```ts
function CertificationSection({
  application,
  onUpdateStatus,
  isUpdating,
}: CertificationSectionProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { CertificationSection } from '@/components/payment-applications/CertificationSection';

<CertificationSection {...props} />
```

### ChangeOrderForm

**Import:** `@/components/ChangeOrderForm`

- Defined in: `components/ChangeOrderForm.tsx`
- Export type: named

```ts
function ChangeOrderForm({ projectId, changeOrder, onSuccess, onCancel }: ChangeOrderFormProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ChangeOrderForm } from '@/components/ChangeOrderForm';

<ChangeOrderForm {...props} />
```

### ChangeOrderLineItemTable

**Import:** `@/components/ChangeOrderLineItemTable`

- Defined in: `components/ChangeOrderLineItemTable.tsx`
- Export type: named

```ts
function ChangeOrderLineItemTable({
  lineItems,
  onUpdateLineItem,
  onRemoveLineItem,
  onAddLineItem,
  contingencyRemaining,
  showContingencyGuidance,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ChangeOrderLineItemTable } from '@/components/ChangeOrderLineItemTable';

<ChangeOrderLineItemTable {...props} />
```

### ChangeOrderModal

**Import:** `@/components/project-detail/ChangeOrderModal`

- Defined in: `components/project-detail/ChangeOrderModal.tsx`
- Export type: named

```ts
function ChangeOrderModal({
  open,
  onOpenChange,
  projectId,
  editingChangeOrder,
  onSuccess,
  onCancel,
}: ChangeOrderModalProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ChangeOrderModal } from '@/components/project-detail/ChangeOrderModal';

<ChangeOrderModal {...props} />
```

### ChangeOrdersList

**Import:** `@/components/ChangeOrdersList`

- Defined in: `components/ChangeOrdersList.tsx`
- Export type: named

```ts
function ChangeOrdersList({ 
  projectId,
  projectContingencyRemaining = 0,
  onEdit, 
  onCreateNew,
  isChangeOrderModalOpen = false,
  enablePagination = false,
  pageSize = 20
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ChangeOrdersList } from '@/components/ChangeOrdersList';

<ChangeOrdersList {...props} />
```

### ChangeOrderStatusBadge

**Import:** `@/components/ChangeOrderStatusBadge`

- Defined in: `components/ChangeOrderStatusBadge.tsx`
- Export type: named

```ts
function ChangeOrderStatusBadge({ status }: ChangeOrderStatusBadgeProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ChangeOrderStatusBadge } from '@/components/ChangeOrderStatusBadge';

<ChangeOrderStatusBadge {...props} />
```

### ChangeOrderStatusBadge

**Import:** `@/components/ui/status-badge`

- Defined in: `components/ui/status-badge.tsx`
- Export type: named

```ts
function ChangeOrderStatusBadge(props: Omit<StatusBadgeProps, 'type'>): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ChangeOrderStatusBadge } from '@/components/ui/status-badge';

<ChangeOrderStatusBadge {...props} />
```

### ChangePassword

**Import:** `@/pages/ChangePassword`

- Defined in: `pages/ChangePassword.tsx`
- Export type: default

```ts
function ChangePassword(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import ChangePassword from '@/pages/ChangePassword';

<ChangePassword {...props} />
```

### ClientBulkActions

**Import:** `@/components/ClientBulkActions`

- Defined in: `components/ClientBulkActions.tsx`
- Export type: named

```ts
function ClientBulkActions({ 
  selectedClientIds, 
  onSelectionChange, 
  onComplete 
}: ClientBulkActionsProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ClientBulkActions } from '@/components/ClientBulkActions';

<ClientBulkActions {...props} />
```

### ClientDetailsModal

**Import:** `@/components/ClientDetailsModal`

- Defined in: `components/ClientDetailsModal.tsx`
- Export type: named

```ts
function ClientDetailsModal({
  client,
  isOpen,
  onClose,
  onEdit,
  onDelete
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ClientDetailsModal } from '@/components/ClientDetailsModal';

<ClientDetailsModal {...props} />
```

### ClientFilters

**Import:** `@/components/ClientFilters`

- Defined in: `components/ClientFilters.tsx`
- Export type: named

```ts
function ClientFilters({
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  resultCount,
}: ClientFiltersProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ClientFilters } from '@/components/ClientFilters';

<ClientFilters {...props} />
```

### ClientForm

**Import:** `@/components/ClientForm`

- Defined in: `components/ClientForm.tsx`
- Export type: named

```ts
function ClientForm({ client, onSave, onCancel }: ClientFormProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ClientForm } from '@/components/ClientForm';

<ClientForm {...props} />
```

### ClientImportModal

**Import:** `@/components/ClientImportModal`

- Defined in: `components/ClientImportModal.tsx`
- Export type: named

```ts
function ClientImportModal({ open, onClose, onSuccess }): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ClientImportModal } from '@/components/ClientImportModal';

<ClientImportModal {...props} />
```

### Clients

**Import:** `@/pages/Clients`

- Defined in: `pages/Clients.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import Clients from '@/pages/Clients';

<Clients {...props} />
```

### ClientSelector

**Import:** `@/components/ClientSelector`

- Defined in: `components/ClientSelector.tsx`
- Export type: named

```ts
function ClientSelector({ 
  value, 
  onValueChange,
  onBlur,
  placeholder = "Select client...",
  required = false,
  error = "",
  showLabel = true
}: ClientSelectorProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ClientSelector } from '@/components/ClientSelector';

<ClientSelector {...props} />
```

### ClientsList

**Import:** `@/components/ClientsList`

- Defined in: `components/ClientsList.tsx`
- Export type: named

```ts
import("C:/Dev/profitbuild-dash/node_modules/@types/react/index").ForwardRefExoticComponent<ClientsListProps & import("C:/Dev/profitbuild-dash/node_modules/@types/react/index").RefAttributes<ClientsListRef>>
```

_No inline documentation provided._

**Example**

```tsx
import { ClientsList } from '@/components/ClientsList';

<ClientsList {...props} />
```

### CollapsibleFilterSection

**Import:** `@/components/ui/collapsible-filter-section`

- Defined in: `components/ui/collapsible-filter-section.tsx`
- Export type: named

```ts
function CollapsibleFilterSection({
  title,
  children,
  hasActiveFilters = false,
  activeFilterCount = 0,
  onClearFilters,
  defaultExpanded = false,
  alwaysExpanded = false,
  resultCount,
  className,
  leftActions,
  actions
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { CollapsibleFilterSection } from '@/components/ui/collapsible-filter-section';

<CollapsibleFilterSection {...props} />
```

### ColumnSelector

**Import:** `@/components/ui/column-selector`

- Defined in: `components/ui/column-selector.tsx`
- Export type: named

```ts
function ColumnSelector({
  columns,
  visibleColumns,
  onVisibleColumnsChange,
  columnOrder = columns.map(c => c.key),
  onColumnOrderChange,
  className,
}: ColumnSelectorProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ColumnSelector } from '@/components/ui/column-selector';

<ColumnSelector {...props} />
```

### CompactTemplateList

**Import:** `@/components/reports/CompactTemplateList`

- Defined in: `components/reports/CompactTemplateList.tsx`
- Export type: named

```ts
function CompactTemplateList({ 
  templates, 
  savedReports = [],
  onSelectTemplate, 
  onCustomBuilder,
  selectedCategory 
}: CompactTemplateListProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { CompactTemplateList } from '@/components/reports/CompactTemplateList';

<CompactTemplateList {...props} />
```

### CompanyBrandingSettings

**Import:** `@/components/CompanyBrandingSettings`

- Defined in: `components/CompanyBrandingSettings.tsx`
- Export type: named

```ts
function CompanyBrandingSettings(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { CompanyBrandingSettings } from '@/components/CompanyBrandingSettings';

<CompanyBrandingSettings {...props} />
```

### CompletePagination

**Import:** `@/components/ui/complete-pagination`

- Defined in: `components/ui/complete-pagination.tsx`
- Export type: named

```ts
function CompletePagination({
  currentPage,
  totalPages,
  onPageChange,
  showPrevNext = true,
  showEllipsis = true,
  className,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { CompletePagination } from '@/components/ui/complete-pagination';

<CompletePagination {...props} />
```

### CONSTRUCTION_SEQUENCES

**Import:** `@/components/schedule/utils/constructionSequences`

- Defined in: `components/schedule/utils/constructionSequences.ts`
- Export type: named

```ts
Record<string, ConstructionPhase>
```

_No inline documentation provided._

**Example**

```tsx
import { CONSTRUCTION_SEQUENCES } from '@/components/schedule/utils/constructionSequences';

<CONSTRUCTION_SEQUENCES {...props} />
```

### ContractDocumentPreview

**Import:** `@/components/contracts/ContractDocumentPreview`

- Defined in: `components/contracts/ContractDocumentPreview.tsx`
- Export type: named

```ts
function ContractDocumentPreview({ fieldValues }: ContractDocumentPreviewProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ContractDocumentPreview } from '@/components/contracts/ContractDocumentPreview';

<ContractDocumentPreview {...props} />
```

### ContractFieldSummary

**Import:** `@/components/contracts/ContractFieldSummary`

- Defined in: `components/contracts/ContractFieldSummary.tsx`
- Export type: named

```ts
function ContractFieldSummary({ fieldValues }: ContractFieldSummaryProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ContractFieldSummary } from '@/components/contracts/ContractFieldSummary';

<ContractFieldSummary {...props} />
```

### ContractGenerationModal

**Import:** `@/components/contracts/ContractGenerationModal`

- Defined in: `components/contracts/ContractGenerationModal.tsx`
- Export type: named

```ts
function ContractGenerationModal({
  open,
  onOpenChange,
  projectId,
  estimateId,
  quoteId,
  payeeId,
  onSuccess,
}: ContractGenerationModalProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ContractGenerationModal } from '@/components/contracts/ContractGenerationModal';

<ContractGenerationModal {...props} />
```

### ContractGenerationSuccess

**Import:** `@/components/contracts/ContractGenerationSuccess`

- Defined in: `components/contracts/ContractGenerationSuccess.tsx`
- Export type: named

```ts
function ContractGenerationSuccess({ result, onClose }: ContractGenerationSuccessProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ContractGenerationSuccess } from '@/components/contracts/ContractGenerationSuccess';

<ContractGenerationSuccess {...props} />
```

### ContractsListView

**Import:** `@/components/contracts/ContractsListView`

- Defined in: `components/contracts/ContractsListView.tsx`
- Export type: named

```ts
function ContractsListView({ projectId, projectNumber }: ContractsListViewProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ContractsListView } from '@/components/contracts/ContractsListView';

<ContractsListView {...props} />
```

### ContractStepper

**Import:** `@/components/contracts/ContractStepper`

- Defined in: `components/contracts/ContractStepper.tsx`
- Export type: named

```ts
function ContractStepper({ currentStep }: ContractStepperProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ContractStepper } from '@/components/contracts/ContractStepper';

<ContractStepper {...props} />
```

### CostAnalysisTable

**Import:** `@/components/profit-analysis/CostAnalysisTable`

- Defined in: `components/profit-analysis/CostAnalysisTable.tsx`
- Export type: named

```ts
function CostAnalysisTable({ data, isLoading, onSelectProject }: Props): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { CostAnalysisTable } from '@/components/profit-analysis/CostAnalysisTable';

<CostAnalysisTable {...props} />
```

### CostBucketSummaryStrip

**Import:** `@/components/cost-tracking/CostBucketSummaryStrip`

- Defined in: `components/cost-tracking/CostBucketSummaryStrip.tsx`
- Export type: named

```ts
function CostBucketSummaryStrip({ projectId, project }: CostBucketSummaryStripProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

Compact "Detail" tab strip — sits above the existing dense table.

Same data as CostBucketView but rendered as a non-collapsible scannable strip.
No expand/drill-down here — the dense table below owns that affordance.

Desktop: horizontal pill row.
Mobile: 2-column grid of bucket pills + totals pill below.

**Example**

```tsx
import { CostBucketSummaryStrip } from '@/components/cost-tracking/CostBucketSummaryStrip';

<CostBucketSummaryStrip {...props} />
```

### CostBucketTotalsRow

**Import:** `@/components/cost-tracking/CostBucketTotalsRow`

- Defined in: `components/cost-tracking/CostBucketTotalsRow.tsx`
- Export type: named

```ts
function CostBucketTotalsRow({
  target,
  spent,
  remaining,
  percentUsed,
  variant = 'card',
}: CostBucketTotalsRowProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

Totals row anchored at the bottom of either view. Shows the project's overall
Target / Spent / Remaining + a single progress bar colored by utilization
(matching the existing Budget Status color thresholds: 80% warning, 95% critical).

**Example**

```tsx
import { CostBucketTotalsRow } from '@/components/cost-tracking/CostBucketTotalsRow';

<CostBucketTotalsRow {...props} />
```

### CostBucketView

**Import:** `@/components/cost-tracking/CostBucketView`

- Defined in: `components/cost-tracking/CostBucketView.tsx`
- Export type: named

```ts
function CostBucketView({ projectId, project }: CostBucketViewProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

"Buckets" view — replaces the dense LineItemControlDashboard table with a
per-category bucket layout. Each bucket is collapsed by default; expanding
reveals the line items inside.

Use this view when the PM wants to scan project cost flow at a glance. For
deeper drill-down (per-line correlations, quote management), the user can
switch to the "Detail" tab which keeps the existing dense table.

**Example**

```tsx
import { CostBucketView } from '@/components/cost-tracking/CostBucketView';

<CostBucketView {...props} />
```

### CostFlowVisualization

**Import:** `@/components/profit-analysis/CostFlowVisualization`

- Defined in: `components/profit-analysis/CostFlowVisualization.tsx`
- Export type: named

```ts
function CostFlowVisualization({ 
  estimatedCost, 
  quotedCost, 
  actualCost,
  budgetUtilization 
}: Props): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { CostFlowVisualization } from '@/components/profit-analysis/CostFlowVisualization';

<CostFlowVisualization {...props} />
```

### CreatePaymentAppDialog

**Import:** `@/components/payment-applications/CreatePaymentAppDialog`

- Defined in: `components/payment-applications/CreatePaymentAppDialog.tsx`
- Export type: named

```ts
function CreatePaymentAppDialog({
  open,
  onOpenChange,
  onCreateApp,
  isCreating,
  nextAppNumber,
}: CreatePaymentAppDialogProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { CreatePaymentAppDialog } from '@/components/payment-applications/CreatePaymentAppDialog';

<CreatePaymentAppDialog {...props} />
```

### CreateTimeEntryDialog

**Import:** `@/components/time-tracker/CreateTimeEntryDialog`

- Defined in: `components/time-tracker/CreateTimeEntryDialog.tsx`
- Export type: named

```ts
function CreateTimeEntryDialog({
  open,
  onOpenChange,
  onSaved,
}: CreateTimeEntryDialogProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { CreateTimeEntryDialog } from '@/components/time-tracker/CreateTimeEntryDialog';

<CreateTimeEntryDialog {...props} />
```

### CreateUserModal

**Import:** `@/components/CreateUserModal`

- Defined in: `components/CreateUserModal.tsx`
- Export type: default

```ts
function CreateUserModal({ open, onOpenChange, onUserCreated }: CreateUserModalProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import CreateUserModal from '@/components/CreateUserModal';

<CreateUserModal {...props} />
```

### CreateWorkOrderModal

**Import:** `@/components/CreateWorkOrderModal`

- Defined in: `components/CreateWorkOrderModal.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import CreateWorkOrderModal from '@/components/CreateWorkOrderModal';

<CreateWorkOrderModal {...props} />
```

### Dashboard

**Import:** `@/pages/Dashboard`

- Defined in: `pages/Dashboard.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import Dashboard from '@/pages/Dashboard';

<Dashboard {...props} />
```

### DashboardHeader

**Import:** `@/components/dashboard/DashboardHeader`

- Defined in: `components/dashboard/DashboardHeader.tsx`
- Export type: named

```ts
function DashboardHeader({
  activeProjectCount,
  lastUpdated,
  onRefresh,
  isRefreshing
}: DashboardHeaderProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

<DashboardHeader {...props} />
```

### DateField

**Import:** `@/components/time-entry-form/fields/DateField`

- Defined in: `components/time-entry-form/fields/DateField.tsx`
- Export type: named

```ts
function DateField({ value, onChange, disabled = false }: DateFieldProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { DateField } from '@/components/time-entry-form/fields/DateField';

<DateField {...props} />
```

### DeleteUserDialog

**Import:** `@/components/DeleteUserDialog`

- Defined in: `components/DeleteUserDialog.tsx`
- Export type: named

```ts
function DeleteUserDialog({ open, onOpenChange, user, onSuccess }: DeleteUserDialogProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { DeleteUserDialog } from '@/components/DeleteUserDialog';

<DeleteUserDialog {...props} />
```

### DevMobileCards

**Import:** `@/pages/DevMobileCards`

- Defined in: `pages/DevMobileCards.tsx`
- Export type: default

```ts
function DevMobileCards(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import DevMobileCards from '@/pages/DevMobileCards';

<DevMobileCards {...props} />
```

### DocumentPreviewModals

**Import:** `@/components/documents/DocumentPreviewModals`

- Defined in: `components/documents/DocumentPreviewModals.tsx`
- Export type: named

```ts
function DocumentPreviewModals({ preview }: DocumentPreviewModalsProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { DocumentPreviewModals } from '@/components/documents/DocumentPreviewModals';

<DocumentPreviewModals {...props} />
```

### DocumentUpload

**Import:** `@/components/DocumentUpload`

- Defined in: `components/DocumentUpload.tsx`
- Export type: named

```ts
function DocumentUpload({ 
  projectId, 
  documentType, 
  onUploadSuccess,
  relatedQuoteId 
}: DocumentUploadProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { DocumentUpload } from '@/components/DocumentUpload';

<DocumentUpload {...props} />
```

### DuplicateQuoteModal

**Import:** `@/components/DuplicateQuoteModal`

- Defined in: `components/DuplicateQuoteModal.tsx`
- Export type: named

```ts
function DuplicateQuoteModal({
  open,
  onOpenChange,
  quote,
  estimates,
  onSuccess
}: DuplicateQuoteModalProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { DuplicateQuoteModal } from '@/components/DuplicateQuoteModal';

<DuplicateQuoteModal {...props} />
```

### EditProfileModal

**Import:** `@/components/EditProfileModal`

- Defined in: `components/EditProfileModal.tsx`
- Export type: default

```ts
function EditProfileModal({ open, onOpenChange, user, onSuccess }: EditProfileModalProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import EditProfileModal from '@/components/EditProfileModal';

<EditProfileModal {...props} />
```

### EditReceiptDialog

**Import:** `@/components/time-tracker/EditReceiptDialog`

- Defined in: `components/time-tracker/EditReceiptDialog.tsx`
- Export type: named

```ts
function EditReceiptDialog({ receipt, open, onOpenChange, onSaved }: EditReceiptDialogProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EditReceiptDialog } from '@/components/time-tracker/EditReceiptDialog';

<EditReceiptDialog {...props} />
```

### EditReceiptModal

**Import:** `@/components/time-tracker/EditReceiptModal`

- Defined in: `components/time-tracker/EditReceiptModal.tsx`
- Export type: named

```ts
function EditReceiptModal({ open, onClose, onSuccess, receipt }: EditReceiptModalProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EditReceiptModal } from '@/components/time-tracker/EditReceiptModal';

<EditReceiptModal {...props} />
```

### EditTimeEntryDialog

**Import:** `@/components/time-tracker/EditTimeEntryDialog`

- Defined in: `components/time-tracker/EditTimeEntryDialog.tsx`
- Export type: named

```ts
function EditTimeEntryDialog({
  entry,
  open,
  onOpenChange,
  onSaved,
}: EditTimeEntryDialogProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EditTimeEntryDialog } from '@/components/time-tracker/EditTimeEntryDialog';

<EditTimeEntryDialog {...props} />
```

### EmployeeAuditSection

**Import:** `@/components/role-management/EmployeeAuditSection`

- Defined in: `components/role-management/EmployeeAuditSection.tsx`
- Export type: named

```ts
function EmployeeAuditSection(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EmployeeAuditSection } from '@/components/role-management/EmployeeAuditSection';

<EmployeeAuditSection {...props} />
```

### EntityTableTemplate

**Import:** `@/components/EntityTableTemplate`

- Defined in: `components/EntityTableTemplate.tsx`
- Export type: named

```ts
function EntityTableTemplate({
  title,
  description,
  data,
  columns,
  isLoading,
  selectedItems,
  onSelectItem,
  onSelectAll,
  onView,
  onEdit,
  onDelete,
  bulkActions,
  filters,
  emptyMessage = "No items found.",
  noResultsMessage = "No items match your current filters.",
  enablePagination = false,
  pageSize = 25,
  currentPage,
  onPageChange,
  enableSorting = false,
  defaultSortColumn,
  defaultSortDirection = 'asc',
  renderActions,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EntityTableTemplate } from '@/components/EntityTableTemplate';

<EntityTableTemplate {...props} />
```

### EstimateAccuracyChart

**Import:** `@/components/EstimateAccuracyChart`

- Defined in: `components/EstimateAccuracyChart.tsx`
- Export type: named

```ts
function EstimateAccuracyChart({ data }): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateAccuracyChart } from '@/components/EstimateAccuracyChart';

<EstimateAccuracyChart {...props} />
```

### EstimateActionsMenu

**Import:** `@/components/EstimateActionsMenu`

- Defined in: `components/EstimateActionsMenu.tsx`
- Export type: named

```ts
function EstimateActionsMenu({ 
  estimate, 
  onView, 
  onEdit, 
  onDelete,
  className 
}: EstimateActionsMenuProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateActionsMenu } from '@/components/EstimateActionsMenu';

<EstimateActionsMenu {...props} />
```

### EstimateEditRoute

**Import:** `@/components/project-routes/EstimateEditRoute`

- Defined in: `components/project-routes/EstimateEditRoute.tsx`
- Export type: named

```ts
function EstimateEditRoute(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateEditRoute } from '@/components/project-routes/EstimateEditRoute';

<EstimateEditRoute {...props} />
```

### EstimateExportModal

**Import:** `@/components/EstimateExportModal`

- Defined in: `components/EstimateExportModal.tsx`
- Export type: named

```ts
function EstimateExportModal({
  isOpen,
  onClose,
  filters
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateExportModal } from '@/components/EstimateExportModal';

<EstimateExportModal {...props} />
```

### EstimateFinancialAnalyticsDashboard

**Import:** `@/components/EstimateFinancialAnalyticsDashboard`

- Defined in: `components/EstimateFinancialAnalyticsDashboard.tsx`
- Export type: default

```ts
function EstimateFinancialAnalyticsDashboard({ timeframe = 'all' }: EstimateFinancialAnalyticsDashboardProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import EstimateFinancialAnalyticsDashboard from '@/components/EstimateFinancialAnalyticsDashboard';

<EstimateFinancialAnalyticsDashboard {...props} />
```

### EstimateForm

**Import:** `@/components/EstimateForm`

- Defined in: `components/EstimateForm.tsx`
- Export type: named

```ts
function EstimateForm({ mode = 'edit', initialEstimate, preselectedProjectId, preselectedProjectType, availableEstimates = [], onSave, onCancel, hideNavigationButtons = false }: EstimateFormProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateForm } from '@/components/EstimateForm';

<EstimateForm {...props} />
```

### EstimateNewRoute

**Import:** `@/components/project-routes/EstimateNewRoute`

- Defined in: `components/project-routes/EstimateNewRoute.tsx`
- Export type: named

```ts
function EstimateNewRoute(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateNewRoute } from '@/components/project-routes/EstimateNewRoute';

<EstimateNewRoute {...props} />
```

### EstimateQuoteStatusView

**Import:** `@/components/reports/EstimateQuoteStatusView`

- Defined in: `components/reports/EstimateQuoteStatusView.tsx`
- Export type: named

```ts
function EstimateQuoteStatusView({ estimateId }: EstimateQuoteStatusViewProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateQuoteStatusView } from '@/components/reports/EstimateQuoteStatusView';

<EstimateQuoteStatusView {...props} />
```

### EstimatesCardView

**Import:** `@/components/EstimatesCardView`

- Defined in: `components/EstimatesCardView.tsx`
- Export type: named

```ts
function EstimatesCardView({ estimates, onEdit, onDelete, onView, onCreateNew }: EstimatesCardViewProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimatesCardView } from '@/components/EstimatesCardView';

<EstimatesCardView {...props} />
```

### EstimateSearchFilters

**Import:** `@/components/EstimateSearchFilters`

- Defined in: `components/EstimateSearchFilters.tsx`
- Export type: named

```ts
function EstimateSearchFilters({
  filters,
  onFiltersChange,
  onSearch,
  onReset,
  resultCount,
  clients,
  projects
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateSearchFilters } from '@/components/EstimateSearchFilters';

<EstimateSearchFilters {...props} />
```

### EstimateSelector

**Import:** `@/components/EstimateSelector`

- Defined in: `components/EstimateSelector.tsx`
- Export type: named

```ts
function EstimateSelector({
  estimates,
  selectedEstimate,
  onSelect,
  placeholder = "Select an estimate...",
  disabled = false
}: EstimateSelectorProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateSelector } from '@/components/EstimateSelector';

<EstimateSelector {...props} />
```

### EstimatesPage

**Import:** `@/pages/Estimates`

- Defined in: `pages/Estimates.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import EstimatesPage from '@/pages/Estimates';

<EstimatesPage {...props} />
```

### EstimatesTableView

**Import:** `@/components/EstimatesTableView`

- Defined in: `components/EstimatesTableView.tsx`
- Export type: named

```ts
function EstimatesTableView({ estimates, onEdit, onDelete, onView, onCreateNew }: EstimatesTableViewProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimatesTableView } from '@/components/EstimatesTableView';

<EstimatesTableView {...props} />
```

### EstimateStatusBadge

**Import:** `@/components/ui/status-badge`

- Defined in: `components/ui/status-badge.tsx`
- Export type: named

```ts
function EstimateStatusBadge(props: Omit<StatusBadgeProps, 'type'>): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateStatusBadge } from '@/components/ui/status-badge';

<EstimateStatusBadge {...props} />
```

### EstimateStatusSelector

**Import:** `@/components/EstimateStatusSelector`

- Defined in: `components/EstimateStatusSelector.tsx`
- Export type: named

```ts
function EstimateStatusSelector({
  estimateId,
  currentStatus,
  estimateNumber,
  projectId,
  totalAmount,
  onStatusChange,
  disabled = false,
  showLabel = false
}: EstimateStatusSelectorProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateStatusSelector } from '@/components/EstimateStatusSelector';

<EstimateStatusSelector {...props} />
```

### EstimateSummaryCard

**Import:** `@/components/estimates/EstimateSummaryCard`

- Defined in: `components/estimates/EstimateSummaryCard.tsx`
- Export type: named

```ts
function EstimateSummaryCard({
  subtotal,
  totalCost,
  grossProfit,
  grossMarginPercent,
  contingencyPercent,
  contingencyAmount,
  totalWithContingency,
  laborCushion,
  laborHours,
  laborActualCost,
  laborBillingTotal,
  laborClientPrice,
  laborStandardMarkup,
  laborAvgActualRate,
  laborAvgBillingRate,
  cushionHoursCapacity,
  totalLaborCapacity,
  scheduleBufferPercent,
  onContingencyChange,
  readOnly = false,
  className,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateSummaryCard } from '@/components/estimates/EstimateSummaryCard';

<EstimateSummaryCard {...props} />
```

### EstimateTotalsRow

**Import:** `@/components/estimates/EstimateTotalsRow`

- Defined in: `components/estimates/EstimateTotalsRow.tsx`
- Export type: named

```ts
function EstimateTotalsRow({
  totalCost,
  totalMarkup,
  avgMarkupPercent,
  subtotal,
  className,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateTotalsRow } from '@/components/estimates/EstimateTotalsRow';

<EstimateTotalsRow {...props} />
```

### EstimateVersionComparison

**Import:** `@/components/EstimateVersionComparison`

- Defined in: `components/EstimateVersionComparison.tsx`
- Export type: named

```ts
function EstimateVersionComparison({ projectId, onClose }: EstimateVersionComparisonProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateVersionComparison } from '@/components/EstimateVersionComparison';

<EstimateVersionComparison {...props} />
```

### ExpenseAllocationSheet

**Import:** `@/components/ExpenseAllocationSheet`

- Defined in: `components/ExpenseAllocationSheet.tsx`
- Export type: named

```ts
function ExpenseAllocationSheet({
  open,
  onOpenChange,
  expenseId,
  onSuccess
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ExpenseAllocationSheet } from '@/components/ExpenseAllocationSheet';

<ExpenseAllocationSheet {...props} />
```

### ExpenseBulkActions

**Import:** `@/components/ExpenseBulkActions`

- Defined in: `components/ExpenseBulkActions.tsx`
- Export type: named

```ts
function ExpenseBulkActions({ 
  selectedExpenseIds, 
  onSelectionChange, 
  onComplete 
}: ExpenseBulkActionsProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ExpenseBulkActions } from '@/components/ExpenseBulkActions';

<ExpenseBulkActions {...props} />
```

### ExpenseDashboard

**Import:** `@/components/ExpenseDashboard`

- Defined in: `components/ExpenseDashboard.tsx`
- Export type: named

```ts
function ExpenseDashboard({ expenses, estimates }): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ExpenseDashboard } from '@/components/ExpenseDashboard';

<ExpenseDashboard {...props} />
```

### ExpenseExportModal

**Import:** `@/components/ExpenseExportModal`

- Defined in: `components/ExpenseExportModal.tsx`
- Export type: named

```ts
function ExpenseExportModal({
  isOpen,
  onClose,
  expenses
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ExpenseExportModal } from '@/components/ExpenseExportModal';

<ExpenseExportModal {...props} />
```

### ExpenseForm

**Import:** `@/components/ExpenseForm`

- Defined in: `components/ExpenseForm.tsx`
- Export type: named

```ts
function ExpenseForm({ expense, onSave, onCancel, defaultProjectId }): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ExpenseForm } from '@/components/ExpenseForm';

<ExpenseForm {...props} />
```

### ExpenseFormSheet

**Import:** `@/components/ExpenseFormSheet`

- Defined in: `components/ExpenseFormSheet.tsx`
- Export type: named

```ts
function ExpenseFormSheet({
  open,
  onOpenChange,
  expense,
  onSave,
  defaultProjectId,
  projectName,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ExpenseFormSheet } from '@/components/ExpenseFormSheet';

<ExpenseFormSheet {...props} />
```

### ExpenseImportModal

**Import:** `@/components/ExpenseImportModal`

- Defined in: `components/ExpenseImportModal.tsx`
- Export type: named

```ts
function ExpenseImportModal({ 
  open, 
  onClose, 
  onSuccess, 
  estimates 
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ExpenseImportModal } from '@/components/ExpenseImportModal';

<ExpenseImportModal {...props} />
```

### ExpenseMatching

**Import:** `@/_archived/pages/ExpenseMatching`

- Defined in: `_archived/pages/ExpenseMatching.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import ExpenseMatching from '@/_archived/pages/ExpenseMatching';

<ExpenseMatching {...props} />
```

### Expenses

**Import:** `@/pages/Expenses`

- Defined in: `pages/Expenses.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import Expenses from '@/pages/Expenses';

<Expenses {...props} />
```

### ExpensesList

**Import:** `@/components/ExpensesList`

- Defined in: `components/ExpensesList.tsx`
- Export type: named

```ts
React.ForwardRefExoticComponent<ExpensesListProps & React.RefAttributes<ExpensesListRef>>
```

_No inline documentation provided._

**Example**

```tsx
import { ExpensesList } from '@/components/ExpensesList';

<ExpensesList {...props} />
```

### ExpenseSplitDialog

**Import:** `@/components/ExpenseSplitDialog`

- Defined in: `components/ExpenseSplitDialog.tsx`
- Export type: named

```ts
function ExpenseSplitDialog({
  expense,
  open,
  onClose,
  onSuccess
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ExpenseSplitDialog } from '@/components/ExpenseSplitDialog';

<ExpenseSplitDialog {...props} />
```

### ExpenseStatusBadge

**Import:** `@/components/ui/status-badge`

- Defined in: `components/ui/status-badge.tsx`
- Export type: named

```ts
function ExpenseStatusBadge(props: Omit<StatusBadgeProps, 'type'>): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ExpenseStatusBadge } from '@/components/ui/status-badge';

<ExpenseStatusBadge {...props} />
```

### ExportControls

**Import:** `@/components/reports/ExportControls`

- Defined in: `components/reports/ExportControls.tsx`
- Export type: named

```ts
function ExportControls({ reportName, data, fields }: ExportControlsProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ExportControls } from '@/components/reports/ExportControls';

<ExportControls {...props} />
```

### FieldDocumentsList

**Import:** `@/components/schedule/FieldDocumentsList`

- Defined in: `components/schedule/FieldDocumentsList.tsx`
- Export type: named

```ts
function FieldDocumentsList({ projectId }: FieldDocumentsListProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { FieldDocumentsList } from '@/components/schedule/FieldDocumentsList';

<FieldDocumentsList {...props} />
```

### FieldMedia

**Import:** `@/pages/FieldMedia`

- Defined in: `pages/FieldMedia.tsx`
- Export type: default

```ts
function FieldMedia(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import FieldMedia from '@/pages/FieldMedia';

<FieldMedia {...props} />
```

### FieldMediaGallery

**Import:** `@/components/schedule/FieldMediaGallery`

- Defined in: `components/schedule/FieldMediaGallery.tsx`
- Export type: named

```ts
function FieldMediaGallery({ projectId }: FieldMediaGalleryProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { FieldMediaGallery } from '@/components/schedule/FieldMediaGallery';

<FieldMediaGallery {...props} />
```

### FieldPhotoCapture

**Import:** `@/pages/FieldPhotoCapture`

- Defined in: `pages/FieldPhotoCapture.tsx`
- Export type: default

```ts
function FieldPhotoCapture(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import FieldPhotoCapture from '@/pages/FieldPhotoCapture';

<FieldPhotoCapture {...props} />
```

### FieldProjectSelector

**Import:** `@/components/FieldProjectSelector`

- Defined in: `components/FieldProjectSelector.tsx`
- Export type: named

```ts
function FieldProjectSelector({ selectedProjectId, onProjectSelect }: FieldProjectSelectorProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { FieldProjectSelector } from '@/components/FieldProjectSelector';

<FieldProjectSelector {...props} />
```

### FieldQuickActionBar

**Import:** `@/components/schedule/FieldQuickActionBar`

- Defined in: `components/schedule/FieldQuickActionBar.tsx`
- Export type: named

```ts
function FieldQuickActionBar({ projectId, onNoteCreated }: FieldQuickActionBarProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

Three-button quick-action row: Note · Camera · Attach.

The Note button opens a shared NoteComposer in sheet presentation — full
text + mentions + voice + attach flow with Take Photo / Record Video /
Upload File labeled options inside. Camera and Attach stay as independent
quick-capture affordances for the "snap and forget" flow (no composition).

Sticky-bottom-positioned by default. When used inline inside a card, callers
override with `[&>div:first-child]:!static` utilities.

**Example**

```tsx
import { FieldQuickActionBar } from '@/components/schedule/FieldQuickActionBar';

<FieldQuickActionBar {...props} />
```

### FieldSchedule

**Import:** `@/pages/FieldSchedule`

- Defined in: `pages/FieldSchedule.tsx`
- Export type: default

```ts
function FieldSchedule(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import FieldSchedule from '@/pages/FieldSchedule';

<FieldSchedule {...props} />
```

### FieldScheduleTable

**Import:** `@/components/schedule/FieldScheduleTable`

- Defined in: `components/schedule/FieldScheduleTable.tsx`
- Export type: named

```ts
function FieldScheduleTable({
  tasks,
  projectId,
  onTaskUpdate,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { FieldScheduleTable } from '@/components/schedule/FieldScheduleTable';

<FieldScheduleTable {...props} />
```

### FieldTaskCard

**Import:** `@/components/schedule/FieldTaskCard`

- Defined in: `components/schedule/FieldTaskCard.tsx`
- Export type: named

```ts
function FieldTaskCard({ task, projectId, onToggleComplete, onTogglePhase }: FieldTaskCardProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { FieldTaskCard } from '@/components/schedule/FieldTaskCard';

<FieldTaskCard {...props} />
```

### FieldTaskSection

**Import:** `@/components/schedule/FieldTaskSection`

- Defined in: `components/schedule/FieldTaskSection.tsx`
- Export type: named

```ts
function FieldTaskSection({
  title,
  tasks,
  defaultOpen,
  projectId,
  onTaskUpdate,
}: FieldTaskSectionProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { FieldTaskSection } from '@/components/schedule/FieldTaskSection';

<FieldTaskSection {...props} />
```

### FieldVideoCapture

**Import:** `@/pages/FieldVideoCapture`

- Defined in: `pages/FieldVideoCapture.tsx`
- Export type: default

```ts
function FieldVideoCapture(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import FieldVideoCapture from '@/pages/FieldVideoCapture';

<FieldVideoCapture {...props} />
```

### FilterPresets

**Import:** `@/components/reports/FilterPresets`

- Defined in: `components/reports/FilterPresets.tsx`
- Export type: named

```ts
function FilterPresets({ dataSource, availableFields, onApplyPreset }: FilterPresetsProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { FilterPresets } from '@/components/reports/FilterPresets';

<FilterPresets {...props} />
```

### FilterSummary

**Import:** `@/components/reports/FilterSummary`

- Defined in: `components/reports/FilterSummary.tsx`
- Export type: named

```ts
function FilterSummary({ filters, availableFields, onRemoveFilter, onClearAll }: FilterSummaryProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { FilterSummary } from '@/components/reports/FilterSummary';

<FilterSummary {...props} />
```

### FinancialTableTemplate

**Import:** `@/components/FinancialTableTemplate`

- Defined in: `components/FinancialTableTemplate.tsx`
- Export type: named

```ts
function FinancialTableTemplate<T>({
  data,
  columns,
  onView,
  onEdit,
  onDelete,
  getItemId,
  isGrouped = false,
  className,
  emptyMessage = "No data available",
  emptyIcon,
  showActions = true,
  actionsLabel = 'Actions',
  sortable = true,
  collapseAllButton,
  collapsedGroups: externalCollapsedGroups,
  onCollapsedGroupsChange,
  expandable = false,
  renderExpandedContent,
}: FinancialTableTemplateProps<T>): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { FinancialTableTemplate } from '@/components/FinancialTableTemplate';

<FinancialTableTemplate {...props} />
```

### formatDuration

**Import:** `@/components/schedule/utils/scheduleCalculations`

- Defined in: `components/schedule/utils/scheduleCalculations.ts`
- Export type: named

```ts
function formatDuration(days: number): string
```

Format duration for display

**Example**

```tsx
import { formatDuration } from '@/components/schedule/utils/scheduleCalculations';

<formatDuration {...props} />
```

### formatProjectLabel

**Import:** `@/components/projects/ProjectOption`

- Defined in: `components/projects/ProjectOption.tsx`
- Export type: named

```ts
function formatProjectLabel(projectNumber?: string | null, projectName?: string | null): string
```

_No inline documentation provided._

**Example**

```tsx
import { formatProjectLabel } from '@/components/projects/ProjectOption';

<formatProjectLabel {...props} />
```

### formatTime12h

**Import:** `@/components/time-entry-form/fields/TimePickerButton`

- Defined in: `components/time-entry-form/fields/TimePickerButton.tsx`
- Export type: named

```ts
function formatTime12h(hhmm: string): string
```

Format HH:mm to 12-hour display e.g. "8:00 AM", "5:00 PM"

**Example**

```tsx
import { formatTime12h } from '@/components/time-entry-form/fields/TimePickerButton';

<formatTime12h {...props} />
```

### FuzzyMatchDetailsPanel

**Import:** `@/components/FuzzyMatchDetailsPanel`

- Defined in: `components/FuzzyMatchDetailsPanel.tsx`
- Export type: named

```ts
function FuzzyMatchDetailsPanel({
  payeeName,
  unallocatedExpenses,
  onAllocateExpense,
  showAllocateButtons = false
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { FuzzyMatchDetailsPanel } from '@/components/FuzzyMatchDetailsPanel';

<FuzzyMatchDetailsPanel {...props} />
```

### G702Summary

**Import:** `@/components/payment-applications/G702Summary`

- Defined in: `components/payment-applications/G702Summary.tsx`
- Export type: named

```ts
function G702Summary({
  application,
  projectName,
  projectNumber,
  clientName,
  retainagePercent = 10,
  appLines,
}: G702SummaryProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { G702Summary } from '@/components/payment-applications/G702Summary';

<G702Summary {...props} />
```

### G703ContinuationSheet

**Import:** `@/components/payment-applications/G703ContinuationSheet`

- Defined in: `components/payment-applications/G703ContinuationSheet.tsx`
- Export type: named

```ts
function G703ContinuationSheet({
  lines,
  isEditable,
  onUpdateLine,
}: G703ContinuationSheetProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { G703ContinuationSheet } from '@/components/payment-applications/G703ContinuationSheet';

<G703ContinuationSheet {...props} />
```

### generateScheduleWarnings

**Import:** `@/components/schedule/utils/scheduleValidation`

- Defined in: `components/schedule/utils/scheduleValidation.ts`
- Export type: named

```ts
function generateScheduleWarnings(tasks: ScheduleTask[], settings: {
    unusualSequence: boolean;
    dateOverlap: boolean;
    changeOrderTiming: boolean;
    resourceConflicts: boolean;
  }): import("C:/Dev/profitbuild-dash/src/types/schedule").ScheduleWarning[]
```

Generate all schedule warnings for a set of tasks

**Example**

```tsx
import { generateScheduleWarnings } from '@/components/schedule/utils/scheduleValidation';

<generateScheduleWarnings {...props} />
```

### getNavigationGroups

**Import:** `@/components/project-detail/projectNavigation`

- Defined in: `components/project-detail/projectNavigation.ts`
- Export type: named

```ts
function getNavigationGroups(): import("C:/Dev/profitbuild-dash/src/components/project-detail/projectNavigation").NavGroup[]
```

_No inline documentation provided._

**Example**

```tsx
import { getNavigationGroups } from '@/components/project-detail/projectNavigation';

<getNavigationGroups {...props} />
```

### getReadyToStartTasks

**Import:** `@/components/schedule/utils/scheduleCalculations`

- Defined in: `components/schedule/utils/scheduleCalculations.ts`
- Export type: named

```ts
function getReadyToStartTasks(tasks: ScheduleTask[]): import("C:/Dev/profitbuild-dash/src/types/schedule").ScheduleTask[]
```

Get tasks that can start now (all dependencies met)

**Example**

```tsx
import { getReadyToStartTasks } from '@/components/schedule/utils/scheduleCalculations';

<getReadyToStartTasks {...props} />
```

### getSectionIcon

**Import:** `@/components/project-detail/projectNavigation`

- Defined in: `components/project-detail/projectNavigation.ts`
- Export type: named

```ts
function getSectionIcon(section: string): React.ForwardRefExoticComponent<Omit<import("C:/Dev/profitbuild-dash/node_modules/lucide-react/dist/lucide-react").LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>
```

_No inline documentation provided._

**Example**

```tsx
import { getSectionIcon } from '@/components/project-detail/projectNavigation';

<getSectionIcon {...props} />
```

### getSectionLabel

**Import:** `@/components/project-detail/projectNavigation`

- Defined in: `components/project-detail/projectNavigation.ts`
- Export type: named

```ts
function getSectionLabel(section: string): string
```

_No inline documentation provided._

**Example**

```tsx
import { getSectionLabel } from '@/components/project-detail/projectNavigation';

<getSectionLabel {...props} />
```

### getSuggestedDependencies

**Import:** `@/components/schedule/utils/constructionSequences`

- Defined in: `components/schedule/utils/constructionSequences.ts`
- Export type: named

```ts
function getSuggestedDependencies(task: { name: string }, allTasks: Array<{ id: string; name: string; start: string }>): { taskId: string; reason: string; }[]
```

Get suggested dependencies for a task based on construction sequencing

**Example**

```tsx
import { getSuggestedDependencies } from '@/components/schedule/utils/constructionSequences';

<getSuggestedDependencies {...props} />
```

### getTypicalDuration

**Import:** `@/components/schedule/utils/constructionSequences`

- Defined in: `components/schedule/utils/constructionSequences.ts`
- Export type: named

```ts
function getTypicalDuration(taskDescription: string): number
```

Get typical duration for a construction phase

**Example**

```tsx
import { getTypicalDuration } from '@/components/schedule/utils/constructionSequences';

<getTypicalDuration {...props} />
```

### GlobalExpenseAllocation

**Import:** `@/_archived/components/GlobalExpenseMatching`

- Defined in: `_archived/components/GlobalExpenseMatching.tsx`
- Export type: named

```ts
function GlobalExpenseAllocation({
  onClose,
  projectId
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { GlobalExpenseAllocation } from '@/_archived/components/GlobalExpenseMatching';

<GlobalExpenseAllocation {...props} />
```

### HierarchicalNumber

**Import:** `@/components/ui/hierarchical-number`

- Defined in: `components/ui/hierarchical-number.tsx`
- Export type: named and default

```ts
function HierarchicalNumber({
  projectNumber,
  entityNumber,
  entityType,
  className,
  showProjectName = false,
  projectName
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import HierarchicalNumber, { HierarchicalNumber as HierarchicalNumberNamed } from '@/components/ui/hierarchical-number';

<HierarchicalNumber {...props} />
```

### HoursDisplay

**Import:** `@/components/time-entry-form/fields/HoursDisplay`

- Defined in: `components/time-entry-form/fields/HoursDisplay.tsx`
- Export type: named

```ts
function HoursDisplay({
  grossHours,
  lunchHours,
  netHours,
  isAutoCalculated,
  manualHours,
  onManualHoursChange,
  isPTO,
}: HoursDisplayProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { HoursDisplay } from '@/components/time-entry-form/fields/HoursDisplay';

<HoursDisplay {...props} />
```

### identifyConstructionPhase

**Import:** `@/components/schedule/utils/constructionSequences`

- Defined in: `components/schedule/utils/constructionSequences.ts`
- Export type: named

```ts
function identifyConstructionPhase(taskDescription: string): string
```

Identify which construction phase a task belongs to based on its description

**Example**

```tsx
import { identifyConstructionPhase } from '@/components/schedule/utils/constructionSequences';

<identifyConstructionPhase {...props} />
```

### ImportBatchDetail

**Import:** `@/components/ImportBatchDetail`

- Defined in: `components/ImportBatchDetail.tsx`
- Export type: named

```ts
function ImportBatchDetail({ batchId, onBack }: ImportBatchDetailProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ImportBatchDetail } from '@/components/ImportBatchDetail';

<ImportBatchDetail {...props} />
```

### ImportEstimateModal

**Import:** `@/components/estimates/ImportEstimateModal`

- Defined in: `components/estimates/ImportEstimateModal.tsx`
- Export type: default

```ts
function ImportEstimateModal({ isOpen, onClose, onImport }: Props): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import ImportEstimateModal from '@/components/estimates/ImportEstimateModal';

<ImportEstimateModal {...props} />
```

### ImportHistory

**Import:** `@/components/ImportHistory`

- Defined in: `components/ImportHistory.tsx`
- Export type: named

```ts
function ImportHistory(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ImportHistory } from '@/components/ImportHistory';

<ImportHistory {...props} />
```

### isSequenceViolation

**Import:** `@/components/schedule/utils/constructionSequences`

- Defined in: `components/schedule/utils/constructionSequences.ts`
- Export type: named

```ts
function isSequenceViolation(taskA: { name: string; start: string }, taskB: { name: string; start: string }): { violation: boolean; reason?: string; }
```

Check if task A should logically come before task B
Returns true if there's a sequencing violation

**Example**

```tsx
import { isSequenceViolation } from '@/components/schedule/utils/constructionSequences';

<isSequenceViolation {...props} />
```

### isTaskOverdue

**Import:** `@/components/schedule/utils/scheduleCalculations`

- Defined in: `components/schedule/utils/scheduleCalculations.ts`
- Export type: named

```ts
function isTaskOverdue(task: ScheduleTask, today: Date = new Date()): boolean
```

Check if a task is overdue

**Example**

```tsx
import { isTaskOverdue } from '@/components/schedule/utils/scheduleCalculations';

<isTaskOverdue {...props} />
```

### KPIGuide

**Import:** `@/pages/KPIGuide`

- Defined in: `pages/KPIGuide.tsx`
- Export type: default

```ts
function KPIGuide(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import KPIGuide from '@/pages/KPIGuide';

<KPIGuide {...props} />
```

### LaborLineItemRow

**Import:** `@/components/cost-tracking/LaborLineItemRow`

- Defined in: `components/cost-tracking/LaborLineItemRow.tsx`
- Export type: named

```ts
function LaborLineItemRow({ lineItem }: LaborLineItemRowProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

Single labor line item shown inside an expanded Labor bucket.

Layout shows: description, hours × billing rate breakdown, target $, spent $,
and the static per-line cushion annotation pulled from estimate_line_items.
labor_cushion_amount. The cushion annotation is intentionally muted — it's
a context indicator, not a primary metric (the dynamic cushion lives at the
bucket header level).

Line items from change orders (source === 'change_order') get a small marker.

**Example**

```tsx
import { LaborLineItemRow } from '@/components/cost-tracking/LaborLineItemRow';

<LaborLineItemRow {...props} />
```

### LaborRateSettings

**Import:** `@/components/admin/LaborRateSettings`

- Defined in: `components/admin/LaborRateSettings.tsx`
- Export type: named

```ts
function LaborRateSettings(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { LaborRateSettings } from '@/components/admin/LaborRateSettings';

<LaborRateSettings {...props} />
```

### LineItemAllocationSheet

**Import:** `@/components/profit-analysis/LineItemAllocationSheet`

- Defined in: `components/profit-analysis/LineItemAllocationSheet.tsx`
- Export type: named

```ts
function LineItemAllocationSheet({ projectId, projectNumber, open, onClose }: Props): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { LineItemAllocationSheet } from '@/components/profit-analysis/LineItemAllocationSheet';

<LineItemAllocationSheet {...props} />
```

### LineItemControlCardView

**Import:** `@/components/LineItemControlCardView`

- Defined in: `components/LineItemControlCardView.tsx`
- Export type: named

```ts
function LineItemControlCardView({ lineItems, onViewDetails }: LineItemControlCardViewProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { LineItemControlCardView } from '@/components/LineItemControlCardView';

<LineItemControlCardView {...props} />
```

### LineItemControlDashboard

**Import:** `@/components/LineItemControlDashboard`

- Defined in: `components/LineItemControlDashboard.tsx`
- Export type: named

```ts
function LineItemControlDashboard({ projectId, project }: LineItemControlDashboardProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { LineItemControlDashboard } from '@/components/LineItemControlDashboard';

<LineItemControlDashboard {...props} />
```

### LineItemDetailModal

**Import:** `@/components/LineItemDetailModal`

- Defined in: `components/LineItemDetailModal.tsx`
- Export type: named

```ts
function LineItemDetailModal({
  lineItem,
  isOpen,
  onClose,
  onSave,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { LineItemDetailModal } from '@/components/LineItemDetailModal';

<LineItemDetailModal {...props} />
```

### LineItemTable

**Import:** `@/components/LineItemTable`

- Defined in: `components/LineItemTable.tsx`
- Export type: named

```ts
function LineItemTable({
  lineItems,
  onUpdateLineItem,
  onRemoveLineItem,
  onAddLineItem,
  onEditDetails,
  onDuplicateLineItem,
  readOnly = false,
  showTotalsRow = false,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { LineItemTable } from '@/components/LineItemTable';

<LineItemTable {...props} />
```

### LunchSection

**Import:** `@/components/time-entry-form/fields/LunchSection`

- Defined in: `components/time-entry-form/fields/LunchSection.tsx`
- Export type: named

```ts
function LunchSection({
  lunchTaken,
  onLunchTakenChange,
  lunchDuration,
  onLunchDurationChange,
  disabled = false,
  isMobile = false,
  isPTO = false,
}: LunchSectionProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { LunchSection } from '@/components/time-entry-form/fields/LunchSection';

<LunchSection {...props} />
```

### LunchToggle

**Import:** `@/components/time-tracker/LunchToggle`

- Defined in: `components/time-tracker/LunchToggle.tsx`
- Export type: named

```ts
function LunchToggle({
  lunchTaken,
  onLunchTakenChange,
  lunchDuration,
  onLunchDurationChange,
  disabled = false,
  isMobile = false,
  compact = false,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { LunchToggle } from '@/components/time-tracker/LunchToggle';

<LunchToggle {...props} />
```

### ManualTimeEntryForm

**Import:** `@/components/time-entry-form/ManualTimeEntryForm`

- Defined in: `components/time-entry-form/ManualTimeEntryForm.tsx`
- Export type: named

```ts
function ManualTimeEntryForm({
  mode,
  initialValues,
  disabled = false,
  canEdit = true,
  showRates = false,
  restrictToCurrentUser = false,
  onFormDataReady,
}: ManualTimeEntryFormProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ManualTimeEntryForm } from '@/components/time-entry-form/ManualTimeEntryForm';

<ManualTimeEntryForm {...props} />
```

### ManualTimeEntrySheet

**Import:** `@/components/time-entry-form/ManualTimeEntrySheet`

- Defined in: `components/time-entry-form/ManualTimeEntrySheet.tsx`
- Export type: named

```ts
function ManualTimeEntrySheet({
  open,
  onOpenChange,
  mode,
  title,
  description,
  initialValues,
  onSave,
  onCancel,
  onDelete,
  disabled = false,
  canEdit = true,
  canDelete = true,
  showRates = false,
  restrictToCurrentUser = false,
}: ManualTimeEntrySheetProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ManualTimeEntrySheet } from '@/components/time-entry-form/ManualTimeEntrySheet';

<ManualTimeEntrySheet {...props} />
```

### MarginAnalysisTable

**Import:** `@/components/profit-analysis/MarginAnalysisTable`

- Defined in: `components/profit-analysis/MarginAnalysisTable.tsx`
- Export type: named

```ts
function MarginAnalysisTable({ data, isLoading, onSelectProject }: Props): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { MarginAnalysisTable } from '@/components/profit-analysis/MarginAnalysisTable';

<MarginAnalysisTable {...props} />
```

### MarginComparisonBars

**Import:** `@/components/profit-analysis/MarginComparisonBars`

- Defined in: `components/profit-analysis/MarginComparisonBars.tsx`
- Export type: named

```ts
function MarginComparisonBars({ 
  originalMargin, 
  projectedMargin, 
  currentMargin,
  contractedAmount 
}: Props): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { MarginComparisonBars } from '@/components/profit-analysis/MarginComparisonBars';

<MarginComparisonBars {...props} />
```

### MediaCommentBadge

**Import:** `@/components/MediaCommentBadge`

- Defined in: `components/MediaCommentBadge.tsx`
- Export type: named

```ts
function MediaCommentBadge({ count }: MediaCommentBadgeProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { MediaCommentBadge } from '@/components/MediaCommentBadge';

<MediaCommentBadge {...props} />
```

### MediaCommentForm

**Import:** `@/components/MediaCommentForm`

- Defined in: `components/MediaCommentForm.tsx`
- Export type: named

```ts
function MediaCommentForm({ mediaId }: MediaCommentFormProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { MediaCommentForm } from '@/components/MediaCommentForm';

<MediaCommentForm {...props} />
```

### MediaCommentsList

**Import:** `@/components/MediaCommentsList`

- Defined in: `components/MediaCommentsList.tsx`
- Export type: named

```ts
function MediaCommentsList({ mediaId }: MediaCommentsListProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { MediaCommentsList } from '@/components/MediaCommentsList';

<MediaCommentsList {...props} />
```

### MediaReportBuilderModal

**Import:** `@/components/MediaReportBuilderModal`

- Defined in: `components/MediaReportBuilderModal.tsx`
- Export type: named

```ts
function MediaReportBuilderModal({
  open,
  onOpenChange,
  projectName,
  projectNumber,
  clientName,
  address,
  selectedMedia,
  onComplete,
}: MediaReportBuilderModalProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { MediaReportBuilderModal } from '@/components/MediaReportBuilderModal';

<MediaReportBuilderModal {...props} />
```

### Mentions

**Import:** `@/pages/Mentions`

- Defined in: `pages/Mentions.tsx`
- Export type: default

```ts
function Mentions(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import Mentions from '@/pages/Mentions';

<Mentions {...props} />
```

### MentionTextarea

**Import:** `@/components/notes/MentionTextarea`

- Defined in: `components/notes/MentionTextarea.tsx`
- Export type: named

```ts
function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows = 2,
  className,
  disabled,
  mentionableUsers,
}: MentionTextareaProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { MentionTextarea } from '@/components/notes/MentionTextarea';

<MentionTextarea {...props} />
```

### MobileListCard

**Import:** `@/components/ui/mobile-list-card`

- Defined in: `components/ui/mobile-list-card.tsx`
- Export type: default

```ts
function MobileListCard({
  // Leading
  leading,

  // Identity
  title,
  subtitle,
  badge,
  secondaryBadge,

  // Metrics
  metrics = [],
  metricsColumns = 2,

  // Attention
  attention,

  // Actions
  onTap,
  actions = [],

  // Expandable
  expandable = false,
  expandedContent,
  defaultExpanded = false,
  expandTriggerLabel,

  // Selection
  selectable = false,
  selected = false,
  onSelectChange,

  // Styling
  className,
}: MobileListCardProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import MobileListCard from '@/components/ui/mobile-list-card';

<MobileListCard {...props} />
```

### MobilePageWrapper

**Import:** `@/components/ui/mobile-page-wrapper`

- Defined in: `components/ui/mobile-page-wrapper.tsx`
- Export type: named

```ts
function MobilePageWrapper({
  children,
  className,
  noPadding = false,
  fullWidth = false,
  onRefresh,
  enablePullToRefresh = false,
}: MobilePageWrapperProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

Universal mobile-first page wrapper component.
- Enforces mobile-safe container and padding
- Prevents horizontal scrolling
- Provides consistent page layout across application
- Follows construction industry data-dense standards
- Optional pull-to-refresh support for mobile PWA

**Example**

```tsx
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';

<MobilePageWrapper {...props} />
```

### MobileResponsiveHeader

**Import:** `@/components/ui/mobile-responsive-header`

- Defined in: `components/ui/mobile-responsive-header.tsx`
- Export type: named

```ts
function MobileResponsiveHeader({
  title,
  subtitle,
  actions = [],
  primaryAction,
  className,
  maxVisibleActions = 2,
}: MobileResponsiveHeaderProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

Universal mobile-first header component that prevents overflow issues.
- Automatically handles action button overflow on mobile
- Ensures titles truncate properly
- Enforces minimum 44px touch targets on mobile
- Never causes horizontal scrolling

**Example**

```tsx
import { MobileResponsiveHeader } from '@/components/ui/mobile-responsive-header';

<MobileResponsiveHeader {...props} />
```

### MobileResponsiveTabs

**Import:** `@/components/ui/mobile-responsive-tabs`

- Defined in: `components/ui/mobile-responsive-tabs.tsx`
- Export type: named

```ts
function MobileResponsiveTabs({
  tabs,
  defaultTab,
  className,
  maxMobileTabs = 3,
}: MobileResponsiveTabsProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

Universal mobile-first tabs component that prevents layout issues.
- Automatically handles tab overflow on mobile
- Never causes horizontal scrolling
- Shows first N tabs inline, rest in dropdown menu
- Enforces proper responsive grid layout

**Example**

```tsx
import { MobileResponsiveTabs } from '@/components/ui/mobile-responsive-tabs';

<MobileResponsiveTabs {...props} />
```

### MobileTabSelector

**Import:** `@/components/ui/mobile-tab-selector`

- Defined in: `components/ui/mobile-tab-selector.tsx`
- Export type: named

```ts
function MobileTabSelector({
  value,
  onValueChange,
  options,
  className,
}: MobileTabSelectorProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { MobileTabSelector } from '@/components/ui/mobile-tab-selector';

<MobileTabSelector {...props} />
```

### MobileTimeTracker

**Import:** `@/components/time-tracker/MobileTimeTracker`

- Defined in: `components/time-tracker/MobileTimeTracker.tsx`
- Export type: named

```ts
function MobileTimeTracker(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { MobileTimeTracker } from '@/components/time-tracker/MobileTimeTracker';

<MobileTimeTracker {...props} />
```

### NeedsAttentionCard

**Import:** `@/components/dashboard/NeedsAttentionCard`

- Defined in: `components/dashboard/NeedsAttentionCard.tsx`
- Export type: named

```ts
function NeedsAttentionCard({
  pendingTimeEntries,
  pendingReceipts,
  pendingChangeOrders,
  expiringQuotes,
  draftEstimates,
  workOrdersWithoutEstimates = 0,
  overdueWorkOrders = 0,
  workOrdersOnHold = 0,
  workOrdersOverBudget = 0
}: NeedsAttentionCardProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { NeedsAttentionCard } from '@/components/dashboard/NeedsAttentionCard';

<NeedsAttentionCard {...props} />
```

### NewTemplateGallery

**Import:** `@/components/reports/NewTemplateGallery`

- Defined in: `components/reports/NewTemplateGallery.tsx`
- Export type: named

```ts
function NewTemplateGallery({ onSelectTemplate, onCustomBuilder, selectedCategory = 'standard', savedReports = [] }: NewTemplateGalleryProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { NewTemplateGallery } from '@/components/reports/NewTemplateGallery';

<NewTemplateGallery {...props} />
```

### NonLaborLineItemRow

**Import:** `@/components/cost-tracking/NonLaborLineItemRow`

- Defined in: `components/cost-tracking/NonLaborLineItemRow.tsx`
- Export type: named

```ts
function NonLaborLineItemRow({ lineItem }: NonLaborLineItemRowProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

Single non-labor line item (Materials, Subs, Equipment, etc.) inside an
expanded bucket. The differentiator from LaborLineItemRow is the quote
affordance: when an accepted quote exists, show the payee name + check icon;
otherwise a muted "Quote: not yet accepted" placeholder.

If multiple accepted quotes exist (rare), the highest-cost one shows here +
a "+N" badge with a tooltip listing the others.

**Example**

```tsx
import { NonLaborLineItemRow } from '@/components/cost-tracking/NonLaborLineItemRow';

<NonLaborLineItemRow {...props} />
```

### NoteCard

**Import:** `@/components/notes/NoteCard`

- Defined in: `components/notes/NoteCard.tsx`
- Export type: named

```ts
function NoteCard({
  note,
  variant = 'default',
  editingNoteId,
  editText,
  onEditTextChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEnlargeImage,
  onEnlargeVideo,
  onPreviewPdf,
  formatTimestamp,
}: NoteCardProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { NoteCard } from '@/components/notes/NoteCard';

<NoteCard {...props} />
```

### NoteComposer

**Import:** `@/components/notes/NoteComposer`

- Defined in: `components/notes/NoteComposer.tsx`
- Export type: named

```ts
function NoteComposer({
  projectId,
  taskName,
  presentation = 'inline',
  open,
  onOpenChange,
  onSubmitted,
  placeholder = 'What happened? @ to tag',
  enableVoice = true,
  enableAttach = true,
  className,
}: NoteComposerProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

Unified note composer — replaces the three parallel implementations that
used to live in NoteInput, FieldQuickActionBar's inline sheet, and
FieldTaskCard.TaskActions. Owns: text + mentions + voice + attachment +
submit. Callers pick a presentation and (optionally) a task context.

Attach collapses to a single paperclip button opening a labeled menu
(Take Photo / Record Video / Upload File). Each option routes to its
dedicated hook or a docs-only file input — combined accept filters
regress iOS Safari video-capture reliability.

**Example**

```tsx
import { NoteComposer } from '@/components/notes/NoteComposer';

<NoteComposer {...props} />
```

### NoteInput

**Import:** `@/components/notes/NoteInput`

- Defined in: `components/notes/NoteInput.tsx`
- Export type: named

```ts
function NoteInput({
  variant = 'default',
  noteText,
  onNoteTextChange,
  onSubmit,
  isSubmitting,
  isUploading,
  attachmentPreview,
  attachmentType,
  attachmentFileName,
  onClearAttachment,
  onCapturePhoto,
  onCaptureVideo,
  onFileSelect,
  isCapturingPhoto,
  isRecording,
  fileInputId = 'file-upload-notes',
  voiceNoteSlot,
  mentionableUsers,
}: NoteInputProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { NoteInput } from '@/components/notes/NoteInput';

<NoteInput {...props} />
```

### NoteLightbox

**Import:** `@/components/notes/NoteLightbox`

- Defined in: `components/notes/NoteLightbox.tsx`
- Export type: named

```ts
function NoteLightbox({
  enlargedImage,
  enlargedVideo,
  onCloseImage,
  onCloseVideo,
  pdfPreviewOpen,
  onPdfPreviewChange,
  pdfUrl,
  pdfFileName,
}: NoteLightboxProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { NoteLightbox } from '@/components/notes/NoteLightbox';

<NoteLightbox {...props} />
```

### NotesField

**Import:** `@/components/time-entry-form/fields/NotesField`

- Defined in: `components/time-entry-form/fields/NotesField.tsx`
- Export type: named

```ts
function NotesField({ value, onChange, disabled = false }: NotesFieldProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { NotesField } from '@/components/time-entry-form/fields/NotesField';

<NotesField {...props} />
```

### NotesSheetTrigger

**Import:** `@/components/schedule/NotesSheetTrigger`

- Defined in: `components/schedule/NotesSheetTrigger.tsx`
- Export type: named

```ts
function NotesSheetTrigger({ projectId, projectName }: NotesSheetTriggerProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { NotesSheetTrigger } from '@/components/schedule/NotesSheetTrigger';

<NotesSheetTrigger {...props} />
```

### NotFound

**Import:** `@/pages/NotFound`

- Defined in: `pages/NotFound.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import NotFound from '@/pages/NotFound';

<NotFound {...props} />
```

### NotificationBell

**Import:** `@/components/notifications/NotificationBell`

- Defined in: `components/notifications/NotificationBell.tsx`
- Export type: named

```ts
function NotificationBell(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { NotificationBell } from '@/components/notifications/NotificationBell';

<NotificationBell {...props} />
```

### OfficeDocumentPreviewModal

**Import:** `@/components/OfficeDocumentPreviewModal`

- Defined in: `components/OfficeDocumentPreviewModal.tsx`
- Export type: named

```ts
function OfficeDocumentPreviewModal({
  open,
  onOpenChange,
  fileUrl,
  fileName,
  fileType,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { OfficeDocumentPreviewModal } from '@/components/OfficeDocumentPreviewModal';

<OfficeDocumentPreviewModal {...props} />
```

### OfflineIndicator

**Import:** `@/components/OfflineIndicator`

- Defined in: `components/OfflineIndicator.tsx`
- Export type: named

```ts
function OfflineIndicator(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { OfflineIndicator } from '@/components/OfflineIndicator';

<OfflineIndicator {...props} />
```

### OvernightIndicator

**Import:** `@/components/time-entry-form/fields/OvernightIndicator`

- Defined in: `components/time-entry-form/fields/OvernightIndicator.tsx`
- Export type: named

```ts
function OvernightIndicator({
  isOvernight,
  endDate,
  className,
}: OvernightIndicatorProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { OvernightIndicator } from '@/components/time-entry-form/fields/OvernightIndicator';

<OvernightIndicator {...props} />
```

### PageHeader

**Import:** `@/components/ui/page-header`

- Defined in: `components/ui/page-header.tsx`
- Export type: named

```ts
function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
  children,
  showAccent = true,
}: PageHeaderProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { PageHeader } from '@/components/ui/page-header';

<PageHeader {...props} />
```

### PayeeBulkActions

**Import:** `@/components/PayeeBulkActions`

- Defined in: `components/PayeeBulkActions.tsx`
- Export type: named

```ts
function PayeeBulkActions({ 
  selectedPayees, 
  onBulkDelete, 
  onBulkUpdateType, 
  onClearSelection 
}: PayeeBulkActionsProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { PayeeBulkActions } from '@/components/PayeeBulkActions';

<PayeeBulkActions {...props} />
```

### PayeeDetailsModal

**Import:** `@/components/PayeeDetailsModal`

- Defined in: `components/PayeeDetailsModal.tsx`
- Export type: named

```ts
function PayeeDetailsModal({
  payee,
  isOpen,
  onClose,
  onEdit,
  onDelete
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { PayeeDetailsModal } from '@/components/PayeeDetailsModal';

<PayeeDetailsModal {...props} />
```

### PayeeFilters

**Import:** `@/components/PayeeFilters`

- Defined in: `components/PayeeFilters.tsx`
- Export type: named

```ts
function PayeeFilters({
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  servicesFilter,
  onServicesFilterChange,
  onClearFilters,
  hasActiveFilters,
  resultCount,
}: PayeeFiltersProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { PayeeFilters } from '@/components/PayeeFilters';

<PayeeFilters {...props} />
```

### PayeeForm

**Import:** `@/components/PayeeForm`

- Defined in: `components/PayeeForm.tsx`
- Export type: named

```ts
function PayeeForm({ payee, onSuccess, onCancel, defaultPayeeType, defaultIsInternal, defaultProvidesLabor, isSubmittingRef }: PayeeFormProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { PayeeForm } from '@/components/PayeeForm';

<PayeeForm {...props} />
```

### PayeeImportModal

**Import:** `@/components/PayeeImportModal`

- Defined in: `components/PayeeImportModal.tsx`
- Export type: named

```ts
function PayeeImportModal({ open, onClose, onSuccess }): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { PayeeImportModal } from '@/components/PayeeImportModal';

<PayeeImportModal {...props} />
```

### Payees

**Import:** `@/pages/Payees`

- Defined in: `pages/Payees.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import Payees from '@/pages/Payees';

<Payees {...props} />
```

### PayeeSelector

**Import:** `@/components/PayeeSelector`

- Defined in: `components/PayeeSelector.tsx`
- Export type: named

```ts
function PayeeSelector({
  value,
  onValueChange,
  placeholder = 'Select payee',
  compact = false,
  filterInternal,
  filterLabor,
  filterPayeeTypes,
  defaultPayeeType,
  defaultProvidesLabor,
  defaultIsInternal,
  label,
  showLabel,
  required,
  error,
  onBlur,
  sortByUsage = false,
  usageSource = 'receipts',
  isMobile = false,
}: PayeeSelectorProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { PayeeSelector } from '@/components/PayeeSelector';

<PayeeSelector {...props} />
```

### PayeesList

**Import:** `@/components/PayeesList`

- Defined in: `components/PayeesList.tsx`
- Export type: named

```ts
import("C:/Dev/profitbuild-dash/node_modules/@types/react/index").ForwardRefExoticComponent<PayeesListProps & import("C:/Dev/profitbuild-dash/node_modules/@types/react/index").RefAttributes<PayeesListRef>>
```

_No inline documentation provided._

**Example**

```tsx
import { PayeesList } from '@/components/PayeesList';

<PayeesList {...props} />
```

### PaymentApplicationsTab

**Import:** `@/components/payment-applications/PaymentApplicationsTab`

- Defined in: `components/payment-applications/PaymentApplicationsTab.tsx`
- Export type: named

```ts
function PaymentApplicationsTab({
  projectId,
  projectName,
  projectNumber,
  clientName,
  estimates,
}: PaymentApplicationsTabProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { PaymentApplicationsTab } from '@/components/payment-applications/PaymentApplicationsTab';

<PaymentApplicationsTab {...props} />
```

### PaymentAppStatusBadge

**Import:** `@/components/payment-applications/PaymentAppStatusBadge`

- Defined in: `components/payment-applications/PaymentAppStatusBadge.tsx`
- Export type: named

```ts
function PaymentAppStatusBadge({ status }: PaymentAppStatusBadgeProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { PaymentAppStatusBadge } from '@/components/payment-applications/PaymentAppStatusBadge';

<PaymentAppStatusBadge {...props} />
```

### PdfPreviewModal

**Import:** `@/components/PdfPreviewModal`

- Defined in: `components/PdfPreviewModal.tsx`
- Export type: named

```ts
function PdfPreviewModal({
  open,
  onOpenChange,
  pdfBlob,
  pdfUrl,
  fileName,
}: PdfPreviewModalProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { PdfPreviewModal } from '@/components/PdfPreviewModal';

<PdfPreviewModal {...props} />
```

### PhotoLightbox

**Import:** `@/components/PhotoLightbox`

- Defined in: `components/PhotoLightbox.tsx`
- Export type: named

```ts
function PhotoLightbox({ photo, allPhotos, onClose, onNavigate }: PhotoLightboxProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { PhotoLightbox } from '@/components/PhotoLightbox';

<PhotoLightbox {...props} />
```

### ProfitAnalysis

**Import:** `@/components/ProfitAnalysis`

- Defined in: `components/ProfitAnalysis.tsx`
- Export type: default

```ts
function ProfitAnalysis({ estimates, quotes, expenses, projects }: ProfitAnalysisProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import ProfitAnalysis from '@/components/ProfitAnalysis';

<ProfitAnalysis {...props} />
```

### ProfitAnalysis

**Import:** `@/pages/ProfitAnalysis`

- Defined in: `pages/ProfitAnalysis.tsx`
- Export type: default

```ts
function ProfitAnalysis(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import ProfitAnalysis from '@/pages/ProfitAnalysis';

<ProfitAnalysis {...props} />
```

### ProfitChart

**Import:** `@/components/ProfitChart`

- Defined in: `components/ProfitChart.tsx`
- Export type: default

```ts
function ProfitChart({ data, type, dataKey, title, height = 300 }: ProfitChartProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import ProfitChart from '@/components/ProfitChart';

<ProfitChart {...props} />
```

### ProfitSummaryCards

**Import:** `@/components/profit-analysis/ProfitSummaryCards`

- Defined in: `components/profit-analysis/ProfitSummaryCards.tsx`
- Export type: named

```ts
function ProfitSummaryCards({ data, isLoading }: Props): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProfitSummaryCards } from '@/components/profit-analysis/ProfitSummaryCards';

<ProfitSummaryCards {...props} />
```

### ProjectBillingRoute

**Import:** `@/components/project-routes/ProjectBillingRoute`

- Defined in: `components/project-routes/ProjectBillingRoute.tsx`
- Export type: named

```ts
function ProjectBillingRoute(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectBillingRoute } from '@/components/project-routes/ProjectBillingRoute';

<ProjectBillingRoute {...props} />
```

### ProjectBulkActions

**Import:** `@/components/ProjectBulkActions`

- Defined in: `components/ProjectBulkActions.tsx`
- Export type: named

```ts
function ProjectBulkActions({
  selectedCount,
  onStatusUpdate,
  onDelete,
  onCancel,
}: ProjectBulkActionsProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectBulkActions } from '@/components/ProjectBulkActions';

<ProjectBulkActions {...props} />
```

### ProjectChangesRoute

**Import:** `@/components/project-routes/ProjectChangesRoute`

- Defined in: `components/project-routes/ProjectChangesRoute.tsx`
- Export type: named

```ts
function ProjectChangesRoute(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectChangesRoute } from '@/components/project-routes/ProjectChangesRoute';

<ProjectChangesRoute {...props} />
```

### ProjectContractsRoute

**Import:** `@/components/project-routes/ProjectContractsRoute`

- Defined in: `components/project-routes/ProjectContractsRoute.tsx`
- Export type: named

```ts
function ProjectContractsRoute(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectContractsRoute } from '@/components/project-routes/ProjectContractsRoute';

<ProjectContractsRoute {...props} />
```

### ProjectControlRoute

**Import:** `@/components/project-routes/ProjectControlRoute`

- Defined in: `components/project-routes/ProjectControlRoute.tsx`
- Export type: named

```ts
function ProjectControlRoute(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectControlRoute } from '@/components/project-routes/ProjectControlRoute';

<ProjectControlRoute {...props} />
```

### ProjectCostBreakdown

**Import:** `@/components/profit-analysis/ProjectCostBreakdown`

- Defined in: `components/profit-analysis/ProjectCostBreakdown.tsx`
- Export type: named

```ts
function ProjectCostBreakdown({ project, open, onClose }: Props): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectCostBreakdown } from '@/components/profit-analysis/ProjectCostBreakdown';

<ProjectCostBreakdown {...props} />
```

### ProjectDetailView

**Import:** `@/components/ProjectDetailView`

- Defined in: `components/ProjectDetailView.tsx`
- Export type: named

```ts
function ProjectDetailView(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectDetailView } from '@/components/ProjectDetailView';

<ProjectDetailView {...props} />
```

### ProjectDocumentsHub

**Import:** `@/components/ProjectDocumentsHub`

- Defined in: `components/ProjectDocumentsHub.tsx`
- Export type: named

```ts
function ProjectDocumentsHub({ projectId, projectName, projectNumber, clientName }: ProjectDocumentsHubProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectDocumentsHub } from '@/components/ProjectDocumentsHub';

<ProjectDocumentsHub {...props} />
```

### ProjectDocumentsRoute

**Import:** `@/components/project-routes/ProjectDocumentsRoute`

- Defined in: `components/project-routes/ProjectDocumentsRoute.tsx`
- Export type: named

```ts
function ProjectDocumentsRoute(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectDocumentsRoute } from '@/components/project-routes/ProjectDocumentsRoute';

<ProjectDocumentsRoute {...props} />
```

### ProjectDocumentsTable

**Import:** `@/components/ProjectDocumentsTable`

- Defined in: `components/ProjectDocumentsTable.tsx`
- Export type: named

```ts
function ProjectDocumentsTable({ projectId, documentType, projectNumber, onDocumentDeleted }: ProjectDocumentsTableProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectDocumentsTable } from '@/components/ProjectDocumentsTable';

<ProjectDocumentsTable {...props} />
```

### ProjectDocumentsTimeline

**Import:** `@/components/ProjectDocumentsTimeline`

- Defined in: `components/ProjectDocumentsTimeline.tsx`
- Export type: named

```ts
function ProjectDocumentsTimeline({ projectId, projectNumber }: ProjectDocumentsTimelineProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectDocumentsTimeline } from '@/components/ProjectDocumentsTimeline';

<ProjectDocumentsTimeline {...props} />
```

### ProjectEdit

**Import:** `@/pages/ProjectEdit`

- Defined in: `pages/ProjectEdit.tsx`
- Export type: default

```ts
function ProjectEdit(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import ProjectEdit from '@/pages/ProjectEdit';

<ProjectEdit {...props} />
```

### ProjectEditForm

**Import:** `@/components/ProjectEditForm`

- Defined in: `components/ProjectEditForm.tsx`
- Export type: named

```ts
function ProjectEditForm({ project, onSave, onCancel }: ProjectEditFormProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectEditForm } from '@/components/ProjectEditForm';

<ProjectEditForm {...props} />
```

### ProjectEditRoute

**Import:** `@/components/project-routes/ProjectEditRoute`

- Defined in: `components/project-routes/ProjectEditRoute.tsx`
- Export type: named

```ts
function ProjectEditRoute(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectEditRoute } from '@/components/project-routes/ProjectEditRoute';

<ProjectEditRoute {...props} />
```

### ProjectEstimatesRoute

**Import:** `@/components/project-routes/ProjectEstimatesRoute`

- Defined in: `components/project-routes/ProjectEstimatesRoute.tsx`
- Export type: named

```ts
function ProjectEstimatesRoute(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectEstimatesRoute } from '@/components/project-routes/ProjectEstimatesRoute';

<ProjectEstimatesRoute {...props} />
```

### ProjectEstimatesView

**Import:** `@/components/ProjectEstimatesView`

- Defined in: `components/ProjectEstimatesView.tsx`
- Export type: named

```ts
function ProjectEstimatesView({ projectId, estimates, quotes, onRefresh }: ProjectEstimatesViewProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectEstimatesView } from '@/components/ProjectEstimatesView';

<ProjectEstimatesView {...props} />
```

### ProjectExpensesRoute

**Import:** `@/components/project-routes/ProjectExpensesRoute`

- Defined in: `components/project-routes/ProjectExpensesRoute.tsx`
- Export type: named

```ts
function ProjectExpensesRoute(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectExpensesRoute } from '@/components/project-routes/ProjectExpensesRoute';

<ProjectExpensesRoute {...props} />
```

### ProjectExportModal

**Import:** `@/components/ProjectExportModal`

- Defined in: `components/ProjectExportModal.tsx`
- Export type: named

```ts
function ProjectExportModal({ isOpen, onClose, filters }: ProjectExportModalProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectExportModal } from '@/components/ProjectExportModal';

<ProjectExportModal {...props} />
```

### ProjectFilters

**Import:** `@/components/ProjectFilters`

- Defined in: `components/ProjectFilters.tsx`
- Export type: named

```ts
function ProjectFilters({
  filters,
  onFiltersChange,
  resultCount,
  leftActions,
  actions,
  clients
}: ProjectFiltersProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectFilters } from '@/components/ProjectFilters';

<ProjectFilters {...props} />
```

### ProjectFormSimple

**Import:** `@/components/ProjectFormSimple`

- Defined in: `components/ProjectFormSimple.tsx`
- Export type: named

```ts
function ProjectFormSimple({ onSave, onCancel, disableNavigate = false, defaultProjectType = 'construction_project' }: ProjectFormSimpleProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectFormSimple } from '@/components/ProjectFormSimple';

<ProjectFormSimple {...props} />
```

### ProjectMediaGallery

**Import:** `@/components/ProjectMediaGallery`

- Defined in: `components/ProjectMediaGallery.tsx`
- Export type: named

```ts
function ProjectMediaGallery({ 
  projectId, 
  projectName, 
  projectNumber, 
  clientName, 
  address,
  externalActiveTab,
  hideInternalTabs = false,
  controlsContainerRef,
}: ProjectMediaGalleryProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectMediaGallery } from '@/components/ProjectMediaGallery';

<ProjectMediaGallery {...props} />
```

### ProjectNotesTimeline

**Import:** `@/components/ProjectNotesTimeline`

- Defined in: `components/ProjectNotesTimeline.tsx`
- Export type: named

```ts
function ProjectNotesTimeline({ projectId, inSheet = false, hideComposer = false }: ProjectNotesTimelineProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectNotesTimeline } from '@/components/ProjectNotesTimeline';

<ProjectNotesTimeline {...props} />
```

### ProjectOperationalDashboard

**Import:** `@/components/ProjectOperationalDashboard`

- Defined in: `components/ProjectOperationalDashboard.tsx`
- Export type: named

```ts
function ProjectOperationalDashboard({
  project,
  estimates,
  quotes,
  expenses,
  changeOrders,
  pendingTimeEntries,
  pendingReceipts,
  mediaCounts,
  documentCount
}: ProjectOperationalDashboardProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectOperationalDashboard } from '@/components/ProjectOperationalDashboard';

<ProjectOperationalDashboard {...props} />
```

### ProjectOption

**Import:** `@/components/projects/ProjectOption`

- Defined in: `components/projects/ProjectOption.tsx`
- Export type: named

```ts
function ProjectOption({
  projectNumber,
  projectName,
  clientName,
  meta,
  className,
  size = "md",
}: ProjectOptionProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectOption } from '@/components/projects/ProjectOption';

<ProjectOption {...props} />
```

### ProjectOverviewRoute

**Import:** `@/components/project-routes/ProjectOverviewRoute`

- Defined in: `components/project-routes/ProjectOverviewRoute.tsx`
- Export type: named

```ts
function ProjectOverviewRoute(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectOverviewRoute } from '@/components/project-routes/ProjectOverviewRoute';

<ProjectOverviewRoute {...props} />
```

### ProjectPicker

**Import:** `@/components/time-entry-form/fields/ProjectPicker`

- Defined in: `components/time-entry-form/fields/ProjectPicker.tsx`
- Export type: named

```ts
function ProjectPicker({
  value,
  onChange,
  disabled = false,
}: ProjectPickerProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectPicker } from '@/components/time-entry-form/fields/ProjectPicker';

<ProjectPicker {...props} />
```

### ProjectProfitTable

**Import:** `@/components/ProjectProfitTable`

- Defined in: `components/ProjectProfitTable.tsx`
- Export type: default

```ts
function ProjectProfitTable({ 
  data, 
  enablePagination = false, 
  pageSize = 10 
}: ProjectProfitTableProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import ProjectProfitTable from '@/components/ProjectProfitTable';

<ProjectProfitTable {...props} />
```

### ProjectQuotePDFsList

**Import:** `@/components/ProjectQuotePDFsList`

- Defined in: `components/ProjectQuotePDFsList.tsx`
- Export type: named

```ts
function ProjectQuotePDFsList({ projectId }: ProjectQuotePDFsListProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectQuotePDFsList } from '@/components/ProjectQuotePDFsList';

<ProjectQuotePDFsList {...props} />
```

### ProjectReceiptsView

**Import:** `@/components/ProjectReceiptsView`

- Defined in: `components/ProjectReceiptsView.tsx`
- Export type: named

```ts
function ProjectReceiptsView({ projectId }: ProjectReceiptsViewProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectReceiptsView } from '@/components/ProjectReceiptsView';

<ProjectReceiptsView {...props} />
```

### Projects

**Import:** `@/pages/Projects`

- Defined in: `pages/Projects.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import Projects from '@/pages/Projects';

<Projects {...props} />
```

### ProjectScheduleRoute

**Import:** `@/components/project-routes/ProjectScheduleRoute`

- Defined in: `components/project-routes/ProjectScheduleRoute.tsx`
- Export type: named

```ts
function ProjectScheduleRoute(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectScheduleRoute } from '@/components/project-routes/ProjectScheduleRoute';

<ProjectScheduleRoute {...props} />
```

### ProjectScheduleSelector

**Import:** `@/components/time-tracker/ProjectScheduleSelector`

- Defined in: `components/time-tracker/ProjectScheduleSelector.tsx`
- Export type: named

```ts
function ProjectScheduleSelector({
  open,
  projects,
  onSelectProject,
  onClose,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectScheduleSelector } from '@/components/time-tracker/ProjectScheduleSelector';

<ProjectScheduleSelector {...props} />
```

### ProjectScheduleView

**Import:** `@/components/schedule/ProjectScheduleView`

- Defined in: `components/schedule/ProjectScheduleView.tsx`
- Export type: default

```ts
function ProjectScheduleView({ 
  projectId, 
  projectStartDate, 
  projectEndDate 
}: ProjectScheduleViewProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import ProjectScheduleView from '@/components/schedule/ProjectScheduleView';

<ProjectScheduleView {...props} />
```

### ProjectSelector

**Import:** `@/components/ProjectSelector`

- Defined in: `components/ProjectSelector.tsx`
- Export type: named

```ts
function ProjectSelector({
  estimates,
  selectedEstimate,
  onSelect,
  onCreateNew,
  placeholder = "Select a project..."
}: ProjectSelectorProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectSelector } from '@/components/ProjectSelector';

<ProjectSelector {...props} />
```

### ProjectSelectorNew

**Import:** `@/components/ProjectSelectorNew`

- Defined in: `components/ProjectSelectorNew.tsx`
- Export type: named

```ts
function ProjectSelectorNew({
  projects,
  selectedProject,
  onSelect,
  onCreateNew,
  placeholder = "Select a project...",
  hideCreateButton = false
}: ProjectSelectorNewProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectSelectorNew } from '@/components/ProjectSelectorNew';

<ProjectSelectorNew {...props} />
```

### ProjectsList

**Import:** `@/components/ProjectsList`

- Defined in: `components/ProjectsList.tsx`
- Export type: named

```ts
function ProjectsList({ 
  projects, 
  estimates,
  onEdit, 
  onDelete, 
  onCreateNew, 
  onRefresh, 
  enablePagination = false,
  pageSize = 12 
}: ProjectsListProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectsList } from '@/components/ProjectsList';

<ProjectsList {...props} />
```

### ProjectsTableView

**Import:** `@/components/ProjectsTableView`

- Defined in: `components/ProjectsTableView.tsx`
- Export type: named

```ts
function ProjectsTableView({
  projects,
  estimates,
  onEdit,
  onView,
  onDelete,
  onArchive,
  onCreateNew,
  isLoading = false,
  selectedIds = [],
  onSelectAll,
  onSelectOne,
  totalCount = 0,
  pageSize = 25,
  onPageSizeChange,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onRefresh,
}: ProjectsTableViewProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectsTableView } from '@/components/ProjectsTableView';

<ProjectsTableView {...props} />
```

### ProjectStatusBadge

**Import:** `@/components/ui/status-badge`

- Defined in: `components/ui/status-badge.tsx`
- Export type: named

```ts
function ProjectStatusBadge(props: Omit<StatusBadgeProps, 'type'>): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectStatusBadge } from '@/components/ui/status-badge';

<ProjectStatusBadge {...props} />
```

### ProjectStatusCard

**Import:** `@/components/dashboard/ProjectStatusCard`

- Defined in: `components/dashboard/ProjectStatusCard.tsx`
- Export type: named

```ts
function ProjectStatusCard({ 
  statusCounts,
  activeContractValue,
  activeEstimatedCosts,
  completedContractValue,
  activeProjectedMargin,
  activeProjectedMarginPercent,
  totalInvoiced
}: ProjectStatusCardProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectStatusCard } from '@/components/dashboard/ProjectStatusCard';

<ProjectStatusCard {...props} />
```

### ProjectStatusSelector

**Import:** `@/components/ProjectStatusSelector`

- Defined in: `components/ProjectStatusSelector.tsx`
- Export type: named

```ts
function ProjectStatusSelector({
  projectId,
  currentStatus,
  projectName,
  hasApprovedEstimate = false,
  estimateStatus,
  onStatusChange,
  disabled = false,
  showLabel = false
}: ProjectStatusSelectorProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectStatusSelector } from '@/components/ProjectStatusSelector';

<ProjectStatusSelector {...props} />
```

### PullToRefreshIndicator

**Import:** `@/components/ui/pull-to-refresh-indicator`

- Defined in: `components/ui/pull-to-refresh-indicator.tsx`
- Export type: named

```ts
function PullToRefreshIndicator({
  pullDistance,
  pullProgress,
  isRefreshing,
  threshold = 60,
}: PullToRefreshIndicatorProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

Visual indicator for pull-to-refresh.
Shows pull progress and spinning loader when refreshing.

**Example**

```tsx
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh-indicator';

<PullToRefreshIndicator {...props} />
```

### QuickBooksBackfillModal

**Import:** `@/components/QuickBooksBackfillModal`

- Defined in: `components/QuickBooksBackfillModal.tsx`
- Export type: named

```ts
function QuickBooksBackfillModal({
  open,
  onClose,
  onSuccess,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuickBooksBackfillModal } from '@/components/QuickBooksBackfillModal';

<QuickBooksBackfillModal {...props} />
```

### QuickBooksSettings

**Import:** `@/components/QuickBooksSettings`

- Defined in: `components/QuickBooksSettings.tsx`
- Export type: named

```ts
function QuickBooksSettings(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuickBooksSettings } from '@/components/QuickBooksSettings';

<QuickBooksSettings {...props} />
```

### QuickBooksSyncHistory

**Import:** `@/components/QuickBooksSyncHistory`

- Defined in: `components/QuickBooksSyncHistory.tsx`
- Export type: named

```ts
function QuickBooksSyncHistory({
  open,
  onClose
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuickBooksSyncHistory } from '@/components/QuickBooksSyncHistory';

<QuickBooksSyncHistory {...props} />
```

### QuickBooksSyncModal

**Import:** `@/components/QuickBooksSyncModal`

- Defined in: `components/QuickBooksSyncModal.tsx`
- Export type: named

```ts
function QuickBooksSyncModal({
  open,
  onClose,
  onSuccess,
  defaultDaysBack = 30
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuickBooksSyncModal } from '@/components/QuickBooksSyncModal';

<QuickBooksSyncModal {...props} />
```

### QuickCaptionModal

**Import:** `@/components/QuickCaptionModal`

- Defined in: `components/QuickCaptionModal.tsx`
- Export type: named

```ts
function QuickCaptionModal({ photo, open, onClose, onSave }: QuickCaptionModalProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuickCaptionModal } from '@/components/QuickCaptionModal';

<QuickCaptionModal {...props} />
```

### QuickWorkOrderForm

**Import:** `@/components/QuickWorkOrderForm`

- Defined in: `components/QuickWorkOrderForm.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import QuickWorkOrderForm from '@/components/QuickWorkOrderForm';

<QuickWorkOrderForm {...props} />
```

### QuoteAttachmentUpload

**Import:** `@/components/QuoteAttachmentUpload`

- Defined in: `components/QuoteAttachmentUpload.tsx`
- Export type: named

```ts
function QuoteAttachmentUpload({
  projectId,
  onUploadSuccess,
  onRemove,
  existingFile,
  disabled = false,
  relatedQuoteId,
  onViewDocument,
}: QuoteAttachmentUploadProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuoteAttachmentUpload } from '@/components/QuoteAttachmentUpload';

<QuoteAttachmentUpload {...props} />
```

### QuoteComparison

**Import:** `@/components/QuoteComparison`

- Defined in: `components/QuoteComparison.tsx`
- Export type: named

```ts
function QuoteComparison({ quote, estimate, onBack }: QuoteComparisonProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuoteComparison } from '@/components/QuoteComparison';

<QuoteComparison {...props} />
```

### QuoteEditRoute

**Import:** `@/components/project-routes/QuoteEditRoute`

- Defined in: `components/project-routes/QuoteEditRoute.tsx`
- Export type: named

```ts
function QuoteEditRoute(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuoteEditRoute } from '@/components/project-routes/QuoteEditRoute';

<QuoteEditRoute {...props} />
```

### QuoteExportModal

**Import:** `@/components/QuoteExportModal`

- Defined in: `components/QuoteExportModal.tsx`
- Export type: named

```ts
function QuoteExportModal({
  isOpen,
  onClose,
  filters
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuoteExportModal } from '@/components/QuoteExportModal';

<QuoteExportModal {...props} />
```

### QuoteFilters

**Import:** `@/components/QuoteFilters`

- Defined in: `components/QuoteFilters.tsx`
- Export type: named

```ts
function QuoteFilters({
  filters,
  onFiltersChange,
  resultCount,
  clients,
  payees
}: QuoteFiltersProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuoteFilters } from '@/components/QuoteFilters';

<QuoteFilters {...props} />
```

### QuoteForm

**Import:** `@/components/QuoteForm`

- Defined in: `components/QuoteForm.tsx`
- Export type: named

```ts
function QuoteForm({ estimates, initialQuote, preSelectedEstimateId, onSave, onCancel, mode = 'edit', generatedContractsForQuote, projectNumber, payeeName, onDeleteContract }: QuoteFormProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuoteForm } from '@/components/QuoteForm';

<QuoteForm {...props} />
```

### QuoteNewRoute

**Import:** `@/components/project-routes/QuoteNewRoute`

- Defined in: `components/project-routes/QuoteNewRoute.tsx`
- Export type: named

```ts
function QuoteNewRoute(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuoteNewRoute } from '@/components/project-routes/QuoteNewRoute';

<QuoteNewRoute {...props} />
```

### Quotes

**Import:** `@/pages/Quotes`

- Defined in: `pages/Quotes.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import Quotes from '@/pages/Quotes';

<Quotes {...props} />
```

### QuotesList

**Import:** `@/components/QuotesList`

- Defined in: `components/QuotesList.tsx`
- Export type: named

```ts
function QuotesList({ quotes, estimates, onEdit, onView, onDelete, onCompare, onExpire, onCreateNew, onRefresh }: QuotesListProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuotesList } from '@/components/QuotesList';

<QuotesList {...props} />
```

### QuotesTableView

**Import:** `@/components/QuotesTableView`

- Defined in: `components/QuotesTableView.tsx`
- Export type: named

```ts
function QuotesTableView({ 
  quotes, 
  estimates, 
  onEdit,
  onView, 
  onDelete, 
  onCompare, 
  onCreateNew,
  onRefresh 
}: QuotesTableViewProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuotesTableView } from '@/components/QuotesTableView';

<QuotesTableView {...props} />
```

### QuoteStatusBadge

**Import:** `@/components/ui/status-badge`

- Defined in: `components/ui/status-badge.tsx`
- Export type: named

```ts
function QuoteStatusBadge(props: Omit<StatusBadgeProps, 'type'>): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuoteStatusBadge } from '@/components/ui/status-badge';

<QuoteStatusBadge {...props} />
```

### QuoteStatusSelector

**Import:** `@/components/QuoteStatusSelector`

- Defined in: `components/QuoteStatusSelector.tsx`
- Export type: named

```ts
function QuoteStatusSelector({
  quoteId,
  currentStatus,
  quoteNumber,
  payeeName,
  projectId,
  totalAmount,
  onStatusChange,
  disabled = false,
  showLabel = false
}: QuoteStatusSelectorProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuoteStatusSelector } from '@/components/QuoteStatusSelector';

<QuoteStatusSelector {...props} />
```

### QuoteViewRoute

**Import:** `@/components/project-routes/QuoteViewRoute`

- Defined in: `components/project-routes/QuoteViewRoute.tsx`
- Export type: named

```ts
function QuoteViewRoute(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuoteViewRoute } from '@/components/project-routes/QuoteViewRoute';

<QuoteViewRoute {...props} />
```

### ReassignExpenseProjectDialog

**Import:** `@/components/ReassignExpenseProjectDialog`

- Defined in: `components/ReassignExpenseProjectDialog.tsx`
- Export type: named

```ts
function ReassignExpenseProjectDialog({
  open,
  onClose,
  onSuccess,
  expenseIds,
  currentProjectName,
}: ReassignExpenseProjectDialogProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ReassignExpenseProjectDialog } from '@/components/ReassignExpenseProjectDialog';

<ReassignExpenseProjectDialog {...props} />
```

### ReassignReceiptDialog

**Import:** `@/components/time-tracker/ReassignReceiptDialog`

- Defined in: `components/time-tracker/ReassignReceiptDialog.tsx`
- Export type: named

```ts
function ReassignReceiptDialog({
  open,
  onClose,
  onSuccess,
  receiptIds,
  currentProjectNumber,
}: ReassignReceiptDialogProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ReassignReceiptDialog } from '@/components/time-tracker/ReassignReceiptDialog';

<ReassignReceiptDialog {...props} />
```

### ReceiptCapture

**Import:** `@/components/time-tracker/ReceiptCapture`

- Defined in: `components/time-tracker/ReceiptCapture.tsx`
- Export type: named

```ts
function ReceiptCapture({ 
  projectId, 
  onCapture,
  onSkip
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ReceiptCapture } from '@/components/time-tracker/ReceiptCapture';

<ReceiptCapture {...props} />
```

### ReceiptLinkModal

**Import:** `@/components/expenses/ReceiptLinkModal`

- Defined in: `components/expenses/ReceiptLinkModal.tsx`
- Export type: named and default

```ts
function ReceiptLinkModal({
  open,
  onOpenChange,
  expense,
  onSuccess,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import ReceiptLinkModal, { ReceiptLinkModal as ReceiptLinkModalNamed } from '@/components/expenses/ReceiptLinkModal';

<ReceiptLinkModal {...props} />
```

### ReceiptPreviewModal

**Import:** `@/components/ReceiptPreviewModal`

- Defined in: `components/ReceiptPreviewModal.tsx`
- Export type: named

```ts
function ReceiptPreviewModal({
  open,
  onOpenChange,
  receiptUrl,
  timeEntryDetails,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ReceiptPreviewModal } from '@/components/ReceiptPreviewModal';

<ReceiptPreviewModal {...props} />
```

### ReceiptsCardView

**Import:** `@/components/receipts/ReceiptsCardView`

- Defined in: `components/receipts/ReceiptsCardView.tsx`
- Export type: named

```ts
React.NamedExoticComponent<ReceiptsCardViewProps>
```

_No inline documentation provided._

**Example**

```tsx
import { ReceiptsCardView } from '@/components/receipts/ReceiptsCardView';

<ReceiptsCardView {...props} />
```

### ReceiptSearchFilters

**Import:** `@/components/ReceiptSearchFilters`

- Defined in: `components/ReceiptSearchFilters.tsx`
- Export type: named

```ts
function ReceiptSearchFilters({
  filters,
  onFiltersChange,
  onReset,
  resultCount,
  payees,
  projects
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ReceiptSearchFilters } from '@/components/ReceiptSearchFilters';

<ReceiptSearchFilters {...props} />
```

### ReceiptsGallery

**Import:** `@/components/time-tracker/ReceiptsGallery`

- Defined in: `components/time-tracker/ReceiptsGallery.tsx`
- Export type: named

```ts
function ReceiptsGallery(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ReceiptsGallery } from '@/components/time-tracker/ReceiptsGallery';

<ReceiptsGallery {...props} />
```

### ReceiptsList

**Import:** `@/components/time-tracker/ReceiptsList`

- Defined in: `components/time-tracker/ReceiptsList.tsx`
- Export type: named

```ts
function ReceiptsList(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ReceiptsList } from '@/components/time-tracker/ReceiptsList';

<ReceiptsList {...props} />
```

### ReceiptsManagement

**Import:** `@/components/ReceiptsManagement`

- Defined in: `components/ReceiptsManagement.tsx`
- Export type: named

```ts
React.ForwardRefExoticComponent<React.RefAttributes<ReceiptsManagementRef>>
```

_No inline documentation provided._

**Example**

```tsx
import { ReceiptsManagement } from '@/components/ReceiptsManagement';

<ReceiptsManagement {...props} />
```

### ReceiptsTable

**Import:** `@/components/receipts/ReceiptsTable`

- Defined in: `components/receipts/ReceiptsTable.tsx`
- Export type: named

```ts
function ReceiptsTable({
  receipts,
  visibleColumns,
  displayColumns,
  sortColumn,
  sortDirection,
  selectedIds,
  onSort,
  onSelectAll,
  onSelectOne,
  onViewReceipt,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onDownload,
  totalCount,
  loading,
  pageSize,
  setPageSize,
  pagination,
  renderSortIcon,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ReceiptsTable } from '@/components/receipts/ReceiptsTable';

<ReceiptsTable {...props} />
```

### ReceiptsTableHeader

**Import:** `@/components/receipts/ReceiptsTableHeader`

- Defined in: `components/receipts/ReceiptsTableHeader.tsx`
- Export type: named

```ts
function ReceiptsTableHeader({
  visibleColumns,
  displayColumns,
  sortColumn,
  sortDirection,
  onSort,
  onSelectAll,
  allSelected,
  renderSortIcon,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ReceiptsTableHeader } from '@/components/receipts/ReceiptsTableHeader';

<ReceiptsTableHeader {...props} />
```

### ReceiptsTableRow

**Import:** `@/components/receipts/ReceiptsTableRow`

- Defined in: `components/receipts/ReceiptsTableRow.tsx`
- Export type: named

```ts
React.NamedExoticComponent<ReceiptsTableRowProps>
```

_No inline documentation provided._

**Example**

```tsx
import { ReceiptsTableRow } from '@/components/receipts/ReceiptsTableRow';

<ReceiptsTableRow {...props} />
```

### RejectTimeEntryDialog

**Import:** `@/components/RejectTimeEntryDialog`

- Defined in: `components/RejectTimeEntryDialog.tsx`
- Export type: named

```ts
function RejectTimeEntryDialog({
  open,
  onOpenChange,
  onConfirm,
  entryCount,
}: RejectTimeEntryDialogProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { RejectTimeEntryDialog } from '@/components/RejectTimeEntryDialog';

<RejectTimeEntryDialog {...props} />
```

### ReportActionsMenu

**Import:** `@/components/reports/ReportActionsMenu`

- Defined in: `components/reports/ReportActionsMenu.tsx`
- Export type: named

```ts
function ReportActionsMenu({
  template,
  isFavorite,
  onToggleFavorite,
  onUse,
  onViewDetails,
  onDuplicate,
}: ReportActionsMenuProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ReportActionsMenu } from '@/components/reports/ReportActionsMenu';

<ReportActionsMenu {...props} />
```

### ReportsPage

**Import:** `@/pages/Reports`

- Defined in: `pages/Reports.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import ReportsPage from '@/pages/Reports';

<ReportsPage {...props} />
```

### ReportViewer

**Import:** `@/components/reports/ReportViewer`

- Defined in: `components/reports/ReportViewer.tsx`
- Export type: named

```ts
function ReportViewer({ data, fields, isLoading, pageSize: initialPageSize = 50 }: ReportViewerProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ReportViewer } from '@/components/reports/ReportViewer';

<ReportViewer {...props} />
```

### requiresInspection

**Import:** `@/components/schedule/utils/constructionSequences`

- Defined in: `components/schedule/utils/constructionSequences.ts`
- Export type: named

```ts
function requiresInspection(taskDescription: string): boolean
```

Check if a task requires inspection based on its phase

**Example**

```tsx
import { requiresInspection } from '@/components/schedule/utils/constructionSequences';

<requiresInspection {...props} />
```

### ResetPassword

**Import:** `@/pages/ResetPassword`

- Defined in: `pages/ResetPassword.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import ResetPassword from '@/pages/ResetPassword';

<ResetPassword {...props} />
```

### ResetPasswordModal

**Import:** `@/components/ResetPasswordModal`

- Defined in: `components/ResetPasswordModal.tsx`
- Export type: default

```ts
function ResetPasswordModal({ open, onOpenChange, userId, userEmail }: ResetPasswordModalProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import ResetPasswordModal from '@/components/ResetPasswordModal';

<ResetPasswordModal {...props} />
```

### RevenueBulkActions

**Import:** `@/components/RevenueBulkActions`

- Defined in: `components/RevenueBulkActions.tsx`
- Export type: named

```ts
function RevenueBulkActions({ 
  selectedRevenueIds, 
  onSelectionChange, 
  onComplete 
}: RevenueBulkActionsProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { RevenueBulkActions } from '@/components/RevenueBulkActions';

<RevenueBulkActions {...props} />
```

### RevenueForm

**Import:** `@/components/RevenueForm`

- Defined in: `components/RevenueForm.tsx`
- Export type: named and default

```ts
function RevenueForm({
  revenue,
  onSave,
  onCancel,
  defaultProjectId,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import RevenueForm, { RevenueForm as RevenueFormNamed } from '@/components/RevenueForm';

<RevenueForm {...props} />
```

### RevenueFormSheet

**Import:** `@/components/RevenueFormSheet`

- Defined in: `components/RevenueFormSheet.tsx`
- Export type: named

```ts
function RevenueFormSheet({
  open,
  onOpenChange,
  revenue,
  onSave,
  defaultProjectId,
  projectName,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { RevenueFormSheet } from '@/components/RevenueFormSheet';

<RevenueFormSheet {...props} />
```

### RevenuesList

**Import:** `@/components/RevenuesList`

- Defined in: `components/RevenuesList.tsx`
- Export type: named

```ts
function RevenuesList({
  revenues,
  onEdit,
  onDelete,
  onRefresh,
  enablePagination = true,
  pageSize: initialPageSize = 50,
  visibleColumns: externalVisibleColumns,
  onVisibleColumnsChange,
  columnOrder: externalColumnOrder,
  onColumnOrderChange,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { RevenuesList } from '@/components/RevenuesList';

<RevenuesList {...props} />
```

### RevenueSplitDialog

**Import:** `@/components/RevenueSplitDialog`

- Defined in: `components/RevenueSplitDialog.tsx`
- Export type: named and default

```ts
function RevenueSplitDialog({
  revenue,
  open,
  onClose,
  onSuccess,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import RevenueSplitDialog, { RevenueSplitDialog as RevenueSplitDialogNamed } from '@/components/RevenueSplitDialog';

<RevenueSplitDialog {...props} />
```

### RoleManagement

**Import:** `@/pages/RoleManagement`

- Defined in: `pages/RoleManagement.tsx`
- Export type: default

```ts
function RoleManagement(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import RoleManagement from '@/pages/RoleManagement';

<RoleManagement {...props} />
```

### RoleProvider

**Import:** `@/contexts/RoleContext`

- Defined in: `contexts/RoleContext.tsx`
- Export type: named

```ts
function RoleProvider({ children }: { children: ReactNode }): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { RoleProvider } from '@/contexts/RoleContext';

<RoleProvider {...props} />
```

### ScheduledSMSLogs

**Import:** `@/components/sms/ScheduledSMSLogs`

- Defined in: `components/sms/ScheduledSMSLogs.tsx`
- Export type: named

```ts
function ScheduledSMSLogs({ scheduleIdFilter }: ScheduledSMSLogsProps = {}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ScheduledSMSLogs } from '@/components/sms/ScheduledSMSLogs';

<ScheduledSMSLogs {...props} />
```

### ScheduledSMSManager

**Import:** `@/components/sms/ScheduledSMSManager`

- Defined in: `components/sms/ScheduledSMSManager.tsx`
- Export type: named

```ts
function ScheduledSMSManager(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ScheduledSMSManager } from '@/components/sms/ScheduledSMSManager';

<ScheduledSMSManager {...props} />
```

### ScheduleExportModal

**Import:** `@/components/schedule/ScheduleExportModal`

- Defined in: `components/schedule/ScheduleExportModal.tsx`
- Export type: named

```ts
function ScheduleExportModal({
  isOpen,
  onClose,
  tasks,
  projectName,
  projectNumber,
  clientName,
  ganttContainerRef
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ScheduleExportModal } from '@/components/schedule/ScheduleExportModal';

<ScheduleExportModal {...props} />
```

### ScheduleSkeleton

**Import:** `@/components/schedule/ScheduleSkeleton`

- Defined in: `components/schedule/ScheduleSkeleton.tsx`
- Export type: named

```ts
function ScheduleSkeleton(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ScheduleSkeleton } from '@/components/schedule/ScheduleSkeleton';

<ScheduleSkeleton {...props} />
```

### ScheduleStats

**Import:** `@/components/schedule/ScheduleStats`

- Defined in: `components/schedule/ScheduleStats.tsx`
- Export type: default

```ts
function ScheduleStats({ tasks }: ScheduleStatsProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import ScheduleStats from '@/components/schedule/ScheduleStats';

<ScheduleStats {...props} />
```

### ScheduleTableView

**Import:** `@/components/schedule/ScheduleTableView`

- Defined in: `components/schedule/ScheduleTableView.tsx`
- Export type: named

```ts
function ScheduleTableView({
  tasks,
  projectId,
  onTaskClick,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ScheduleTableView } from '@/components/schedule/ScheduleTableView';

<ScheduleTableView {...props} />
```

### ScheduleWarningBanner

**Import:** `@/components/schedule/ScheduleWarningBanner`

- Defined in: `components/schedule/ScheduleWarningBanner.tsx`
- Export type: default

```ts
function ScheduleWarningBanner({ warnings, onDismiss, onAdjust }: ScheduleWarningBannerProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import ScheduleWarningBanner from '@/components/schedule/ScheduleWarningBanner';

<ScheduleWarningBanner {...props} />
```

### Settings

**Import:** `@/pages/Settings`

- Defined in: `pages/Settings.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import Settings from '@/pages/Settings';

<Settings {...props} />
```

### showCaptionPrompt

**Import:** `@/components/CaptionPromptToast`

- Defined in: `components/CaptionPromptToast.tsx`
- Export type: named

```ts
function showCaptionPrompt({
  onVoiceClick,
  onTypeClick,
  message = 'Add a caption for better documentation',
  duration = 5000,
}: CaptionPromptOptions): void
```

_No inline documentation provided._

**Example**

```tsx
import { showCaptionPrompt } from '@/components/CaptionPromptToast';

<showCaptionPrompt {...props} />
```

### SimpleFilterPanel

**Import:** `@/components/reports/SimpleFilterPanel`

- Defined in: `components/reports/SimpleFilterPanel.tsx`
- Export type: named

```ts
function SimpleFilterPanel({ filters, onFiltersChange, availableFields, dataSource }: SimpleFilterPanelProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { SimpleFilterPanel } from '@/components/reports/SimpleFilterPanel';

<SimpleFilterPanel {...props} />
```

### SimpleReportBuilder

**Import:** `@/components/reports/SimpleReportBuilder`

- Defined in: `components/reports/SimpleReportBuilder.tsx`
- Export type: named

```ts
function SimpleReportBuilder({ onRunReport }: { onRunReport: (config: ReportConfig, fields: ReportField[]) => void }): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { SimpleReportBuilder } from '@/components/reports/SimpleReportBuilder';

<SimpleReportBuilder {...props} />
```

### Skeleton

**Import:** `@/components/ui/skeleton`

- Defined in: `components/ui/skeleton.tsx`
- Export type: named

```ts
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { Skeleton } from '@/components/ui/skeleton';

<Skeleton {...props} />
```

### SMSAdmin

**Import:** `@/pages/SMSAdmin`

- Defined in: `pages/SMSAdmin.tsx`
- Export type: default

```ts
function SMSAdmin(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import SMSAdmin from '@/pages/SMSAdmin';

<SMSAdmin {...props} />
```

### SMSComposer

**Import:** `@/components/sms/SMSComposer`

- Defined in: `components/sms/SMSComposer.tsx`
- Export type: named

```ts
function SMSComposer(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { SMSComposer } from '@/components/sms/SMSComposer';

<SMSComposer {...props} />
```

### SMSHistory

**Import:** `@/components/sms/SMSHistory`

- Defined in: `components/sms/SMSHistory.tsx`
- Export type: named

```ts
function SMSHistory(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { SMSHistory } from '@/components/sms/SMSHistory';

<SMSHistory {...props} />
```

### SMSSettings

**Import:** `@/components/sms/SMSSettings`

- Defined in: `components/sms/SMSSettings.tsx`
- Export type: named

```ts
function SMSSettings(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { SMSSettings } from '@/components/sms/SMSSettings';

<SMSSettings {...props} />
```

### SOVGeneratorDialog

**Import:** `@/components/payment-applications/SOVGeneratorDialog`

- Defined in: `components/payment-applications/SOVGeneratorDialog.tsx`
- Export type: named

```ts
function SOVGeneratorDialog({
  open,
  onOpenChange,
  estimates,
  onGenerate,
  isGenerating,
}: SOVGeneratorDialogProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { SOVGeneratorDialog } from '@/components/payment-applications/SOVGeneratorDialog';

<SOVGeneratorDialog {...props} />
```

### SOVTable

**Import:** `@/components/payment-applications/SOVTable`

- Defined in: `components/payment-applications/SOVTable.tsx`
- Export type: named

```ts
function SOVTable({ sov, lines }: SOVTableProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { SOVTable } from '@/components/payment-applications/SOVTable';

<SOVTable {...props} />
```

### StatusBadge

**Import:** `@/components/ui/status-badge`

- Defined in: `components/ui/status-badge.tsx`
- Export type: named

```ts
function StatusBadge({ status, type, size = 'default', className, label }: StatusBadgeProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { StatusBadge } from '@/components/ui/status-badge';

<StatusBadge {...props} />
```

### SyncStatusBadge

**Import:** `@/components/SyncStatusBadge`

- Defined in: `components/SyncStatusBadge.tsx`
- Export type: named

```ts
function SyncStatusBadge({ 
  status, 
  lastSyncedAt, 
  onMarkAsSynced, 
  onResetSync,
  showActions = false 
}: SyncStatusBadgeProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { SyncStatusBadge } from '@/components/SyncStatusBadge';

<SyncStatusBadge {...props} />
```

### SyncStatusBanner

**Import:** `@/components/time-tracker/SyncStatusBanner`

- Defined in: `components/time-tracker/SyncStatusBanner.tsx`
- Export type: named

```ts
function SyncStatusBanner(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { SyncStatusBanner } from '@/components/time-tracker/SyncStatusBanner';

<SyncStatusBanner {...props} />
```

### TaskEditPanel

**Import:** `@/components/schedule/TaskEditPanel`

- Defined in: `components/schedule/TaskEditPanel.tsx`
- Export type: default

```ts
function TaskEditPanel({ task, allTasks, onClose, onSave }: TaskEditPanelProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import TaskEditPanel from '@/components/schedule/TaskEditPanel';

<TaskEditPanel {...props} />
```

### TaskReorderPanel

**Import:** `@/components/schedule/TaskReorderPanel`

- Defined in: `components/schedule/TaskReorderPanel.tsx`
- Export type: default

```ts
function TaskReorderPanel({ 
  tasks, 
  onMoveUp, 
  onMoveDown,
  isOpen,
  onToggle
}: TaskReorderPanelProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import TaskReorderPanel from '@/components/schedule/TaskReorderPanel';

<TaskReorderPanel {...props} />
```

### tasksOverlap

**Import:** `@/components/schedule/utils/scheduleCalculations`

- Defined in: `components/schedule/utils/scheduleCalculations.ts`
- Export type: named

```ts
function tasksOverlap(task1: ScheduleTask, task2: ScheduleTask): boolean
```

Detect if two tasks have date overlap

**Example**

```tsx
import { tasksOverlap } from '@/components/schedule/utils/scheduleCalculations';

<tasksOverlap {...props} />
```

### TemplateCard

**Import:** `@/components/reports/TemplateCard`

- Defined in: `components/reports/TemplateCard.tsx`
- Export type: named

```ts
function TemplateCard({ template, onUse, variant = 'default' }: TemplateCardProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TemplateCard } from '@/components/reports/TemplateCard';

<TemplateCard {...props} />
```

### TemplateGallery

**Import:** `@/components/reports/TemplateGallery`

- Defined in: `components/reports/TemplateGallery.tsx`
- Export type: named

```ts
function TemplateGallery({ onSelectTemplate }: TemplateGalleryProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TemplateGallery } from '@/components/reports/TemplateGallery';

<TemplateGallery {...props} />
```

### TimeEntriesCardView

**Import:** `@/components/TimeEntriesCardView`

- Defined in: `components/TimeEntriesCardView.tsx`
- Export type: named

```ts
function TimeEntriesCardView({
  timeEntries,
  selectedIds,
  onSelectOne,
  onEdit,
  onReject,
  onRefresh,
  canApprove,
  canReject,
  totalCount,
  pagination,
  pageSize,
  setPageSize,
  onBulkApprove,
  onBulkReject,
  onBulkDelete,
  onClearSelection,
}: TimeEntriesCardViewProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TimeEntriesCardView } from '@/components/TimeEntriesCardView';

<TimeEntriesCardView {...props} />
```

### TimeEntriesPage

**Import:** `@/pages/TimeEntries`

- Defined in: `pages/TimeEntries.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import TimeEntriesPage from '@/pages/TimeEntries';

<TimeEntriesPage {...props} />
```

### TimeEntriesTable

**Import:** `@/components/time-entries/TimeEntriesTable`

- Defined in: `components/time-entries/TimeEntriesTable.tsx`
- Export type: named

```ts
function TimeEntriesTable({
  entries,
  visibleColumns,
  columnOrder,
  sortColumn,
  sortDirection,
  selectedIds,
  onSort,
  onSelectAll,
  onSelectOne,
  onApprove,
  onReject,
  onEdit,
  onViewProject,
  totalCount,
  totalHours,
  totalAmount,
  loading,
  pageSize,
  setPageSize,
  pagination,
  renderSortIcon,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TimeEntriesTable } from '@/components/time-entries/TimeEntriesTable';

<TimeEntriesTable {...props} />
```

### TimeEntriesTableHeader

**Import:** `@/components/time-entries/TimeEntriesTableHeader`

- Defined in: `components/time-entries/TimeEntriesTableHeader.tsx`
- Export type: named

```ts
function TimeEntriesTableHeader({
  visibleColumns,
  columnOrder,
  sortColumn,
  sortDirection,
  onSort,
  onSelectAll,
  allSelected,
  renderSortIcon,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TimeEntriesTableHeader } from '@/components/time-entries/TimeEntriesTableHeader';

<TimeEntriesTableHeader {...props} />
```

### TimeEntriesTableRow

**Import:** `@/components/time-entries/TimeEntriesTableRow`

- Defined in: `components/time-entries/TimeEntriesTableRow.tsx`
- Export type: named

```ts
React.NamedExoticComponent<TimeEntriesTableRowProps>
```

_No inline documentation provided._

**Example**

```tsx
import { TimeEntriesTableRow } from '@/components/time-entries/TimeEntriesTableRow';

<TimeEntriesTableRow {...props} />
```

### TimeEntryBulkActions

**Import:** `@/components/TimeEntryBulkActions`

- Defined in: `components/TimeEntryBulkActions.tsx`
- Export type: named

```ts
function TimeEntryBulkActions({
  selectedCount,
  onApprove,
  onReject,
  onDelete,
  onCancel,
}: TimeEntryBulkActionsProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TimeEntryBulkActions } from '@/components/TimeEntryBulkActions';

<TimeEntryBulkActions {...props} />
```

### TimeEntryDialog

**Import:** `@/components/time-tracker/TimeEntryDialog`

- Defined in: `components/time-tracker/TimeEntryDialog.tsx`
- Export type: named

```ts
function TimeEntryDialog({ 
  open, 
  onOpenChange, 
  title, 
  description,
  children 
}: TimeEntryDialogProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TimeEntryDialog } from '@/components/time-tracker/TimeEntryDialog';

<TimeEntryDialog {...props} />
```

### TimeEntryExportModal

**Import:** `@/components/TimeEntryExportModal`

- Defined in: `components/TimeEntryExportModal.tsx`
- Export type: named

```ts
function TimeEntryExportModal({
  isOpen,
  onClose,
  entries,
  filters,
  totalCount
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TimeEntryExportModal } from '@/components/TimeEntryExportModal';

<TimeEntryExportModal {...props} />
```

### TimeEntrySearchFilters

**Import:** `@/components/TimeEntrySearchFilters`

- Defined in: `components/TimeEntrySearchFilters.tsx`
- Export type: named

```ts
function TimeEntrySearchFilters({
  filters,
  onFiltersChange,
  onReset,
  resultCount,
  workers,
  projects
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TimeEntrySearchFilters } from '@/components/TimeEntrySearchFilters';

<TimeEntrySearchFilters {...props} />
```

### TimelineStoryView

**Import:** `@/components/TimelineStoryView`

- Defined in: `components/TimelineStoryView.tsx`
- Export type: named

```ts
function TimelineStoryView({ media, onMediaClick }: TimelineStoryViewProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TimelineStoryView } from '@/components/TimelineStoryView';

<TimelineStoryView {...props} />
```

### TimePicker

**Import:** `@/components/time-entry-form/fields/TimePicker`

- Defined in: `components/time-entry-form/fields/TimePicker.tsx`
- Export type: named

```ts
function TimePicker({
  value,
  onChange,
  trigger,
  disabled = false,
  isMobile = false,
}: TimePickerProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TimePicker } from '@/components/time-entry-form/fields/TimePicker';

<TimePicker {...props} />
```

### TimePickerButton

**Import:** `@/components/time-entry-form/fields/TimePickerButton`

- Defined in: `components/time-entry-form/fields/TimePickerButton.tsx`
- Export type: named

```ts
function TimePickerButton({
  label,
  value,
  onTap,
  disabled = false,
  className,
  placeholder = '--:-- --',
}: TimePickerButtonProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TimePickerButton } from '@/components/time-entry-form/fields/TimePickerButton';

<TimePickerButton {...props} />
```

### TimeRangeField

**Import:** `@/components/time-entry-form/fields/TimeRangeField`

- Defined in: `components/time-entry-form/fields/TimeRangeField.tsx`
- Export type: named

```ts
function TimeRangeField({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  disabled = false,
}: TimeRangeFieldProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TimeRangeField } from '@/components/time-entry-form/fields/TimeRangeField';

<TimeRangeField {...props} />
```

### TimesheetGridCell

**Import:** `@/components/TimesheetGridCell`

- Defined in: `components/TimesheetGridCell.tsx`
- Export type: named

```ts
function TimesheetGridCell({
  value,
  onChange,
  hourlyRate,
  disabled = false
}: TimesheetGridCellProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TimesheetGridCell } from '@/components/TimesheetGridCell';

<TimesheetGridCell {...props} />
```

### TimesheetGridView

**Import:** `@/components/TimesheetGridView`

- Defined in: `components/TimesheetGridView.tsx`
- Export type: named

```ts
function TimesheetGridView({ open, onClose, onSuccess, preselectedProjectId }: TimesheetGridViewProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TimesheetGridView } from '@/components/TimesheetGridView';

<TimesheetGridView {...props} />
```

### TimesheetSummary

**Import:** `@/components/TimesheetSummary`

- Defined in: `components/TimesheetSummary.tsx`
- Export type: named

```ts
function TimesheetSummary({ entries, validationErrors }: TimesheetSummaryProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TimesheetSummary } from '@/components/TimesheetSummary';

<TimesheetSummary {...props} />
```

### TimesheetWeekSelector

**Import:** `@/components/TimesheetWeekSelector`

- Defined in: `components/TimesheetWeekSelector.tsx`
- Export type: named

```ts
function TimesheetWeekSelector({ startDate, endDate, onChange }: TimesheetWeekSelectorProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TimesheetWeekSelector } from '@/components/TimesheetWeekSelector';

<TimesheetWeekSelector {...props} />
```

### TimeTracker

**Import:** `@/pages/TimeTracker`

- Defined in: `pages/TimeTracker.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import TimeTracker from '@/pages/TimeTracker';

<TimeTracker {...props} />
```

### Training

**Import:** `@/pages/Training`

- Defined in: `pages/Training.tsx`
- Export type: default

```ts
function Training(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import Training from '@/pages/Training';

<Training {...props} />
```

### TrainingAdmin

**Import:** `@/pages/TrainingAdmin`

- Defined in: `pages/TrainingAdmin.tsx`
- Export type: default

```ts
function TrainingAdmin(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import TrainingAdmin from '@/pages/TrainingAdmin';

<TrainingAdmin {...props} />
```

### TrainingAssignmentDialog

**Import:** `@/components/training/TrainingAssignmentDialog`

- Defined in: `components/training/TrainingAssignmentDialog.tsx`
- Export type: named

```ts
function TrainingAssignmentDialog({
  open,
  onOpenChange,
  trainingContentId,
  onSuccess,
}: TrainingAssignmentDialogProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TrainingAssignmentDialog } from '@/components/training/TrainingAssignmentDialog';

<TrainingAssignmentDialog {...props} />
```

### TrainingContentForm

**Import:** `@/components/training/TrainingContentForm`

- Defined in: `components/training/TrainingContentForm.tsx`
- Export type: named

```ts
function TrainingContentForm({ content, onSave, onCancel }: TrainingContentFormProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TrainingContentForm } from '@/components/training/TrainingContentForm';

<TrainingContentForm {...props} />
```

### TrainingViewer

**Import:** `@/pages/TrainingViewer`

- Defined in: `pages/TrainingViewer.tsx`
- Export type: default

```ts
function TrainingViewer(): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import TrainingViewer from '@/pages/TrainingViewer';

<TrainingViewer {...props} />
```

### TransactionSelectionControls

**Import:** `@/components/import/TransactionSelectionControls`

- Defined in: `components/import/TransactionSelectionControls.tsx`
- Export type: named

```ts
function TransactionSelectionControls({
  totalNew,
  totalDuplicates,
  totalErrors,
  totalUnassigned,
  selectedCount,
  totalSelectable,
  onSelectAllNew,
  onSelectAllDuplicates,
  onSelectAll,
  onDeselectAll,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
}: TransactionSelectionControlsProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TransactionSelectionControls } from '@/components/import/TransactionSelectionControls';

<TransactionSelectionControls {...props} />
```

### TransactionSelectionTable

**Import:** `@/components/import/TransactionSelectionTable`

- Defined in: `components/import/TransactionSelectionTable.tsx`
- Export type: named

```ts
function TransactionSelectionTable({
  transactions,
  selectedRows,
  onSelectionChange,
  statusFilter = 'all',
  searchQuery = '',
}: TransactionSelectionTableProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TransactionSelectionTable } from '@/components/import/TransactionSelectionTable';

<TransactionSelectionTable {...props} />
```

### validateTask

**Import:** `@/components/schedule/utils/scheduleValidation`

- Defined in: `components/schedule/utils/scheduleValidation.ts`
- Export type: named

```ts
function validateTask(task: ScheduleTask, allTasks: ScheduleTask[]): { valid: boolean; errors: string[]; }
```

Validate a task before saving

**Example**

```tsx
import { validateTask } from '@/components/schedule/utils/scheduleValidation';

<validateTask {...props} />
```

### VarianceBadge

**Import:** `@/components/ui/variance-badge`

- Defined in: `components/ui/variance-badge.tsx`
- Export type: named

```ts
function VarianceBadge({ variance, percentage, type, className }: VarianceBadgeProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { VarianceBadge } from '@/components/ui/variance-badge';

<VarianceBadge {...props} />
```

### VersionEvolutionChart

**Import:** `@/components/VersionEvolutionChart`

- Defined in: `components/VersionEvolutionChart.tsx`
- Export type: named

```ts
function VersionEvolutionChart({ data }): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { VersionEvolutionChart } from '@/components/VersionEvolutionChart';

<VersionEvolutionChart {...props} />
```

### VideoLightbox

**Import:** `@/components/VideoLightbox`

- Defined in: `components/VideoLightbox.tsx`
- Export type: named

```ts
function VideoLightbox({ video, allVideos, onClose, onNavigate }: VideoLightboxProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { VideoLightbox } from '@/components/VideoLightbox';

<VideoLightbox {...props} />
```

### VoiceCaptionModal

**Import:** `@/components/VoiceCaptionModal`

- Defined in: `components/VoiceCaptionModal.tsx`
- Export type: named

```ts
function VoiceCaptionModal({ open, onClose, onCaptionReady, imageUrl }: VoiceCaptionModalProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { VoiceCaptionModal } from '@/components/VoiceCaptionModal';

<VoiceCaptionModal {...props} />
```

### VoiceNoteButton

**Import:** `@/components/notes/VoiceNoteButton`

- Defined in: `components/notes/VoiceNoteButton.tsx`
- Export type: named

```ts
function VoiceNoteButton({
  onTranscription,
  disabled = false,
  variant = 'icon',
}: VoiceNoteButtonProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { VoiceNoteButton } from '@/components/notes/VoiceNoteButton';

<VoiceNoteButton {...props} />
```

### WeekView

**Import:** `@/components/time-tracker/WeekView`

- Defined in: `components/time-tracker/WeekView.tsx`
- Export type: named

```ts
function WeekView({ onEditEntry, onCreateEntry }: WeekViewProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { WeekView } from '@/components/time-tracker/WeekView';

<WeekView {...props} />
```

### WorkerPicker

**Import:** `@/components/time-entry-form/fields/WorkerPicker`

- Defined in: `components/time-entry-form/fields/WorkerPicker.tsx`
- Export type: named

```ts
function WorkerPicker({
  value,
  onChange,
  disabled = false,
  showRates = false,
  restrictToCurrentUser = false,
}: WorkerPickerProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { WorkerPicker } from '@/components/time-entry-form/fields/WorkerPicker';

<WorkerPicker {...props} />
```

### WorkOrderBulkActions

**Import:** `@/components/WorkOrderBulkActions`

- Defined in: `components/WorkOrderBulkActions.tsx`
- Export type: named

```ts
function WorkOrderBulkActions({
  selectedCount,
  onStatusUpdate,
  onDelete,
  onCancel,
}: WorkOrderBulkActionsProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { WorkOrderBulkActions } from '@/components/WorkOrderBulkActions';

<WorkOrderBulkActions {...props} />
```

### WorkOrderCard

**Import:** `@/components/WorkOrderCard`

- Defined in: `components/WorkOrderCard.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import WorkOrderCard from '@/components/WorkOrderCard';

<WorkOrderCard {...props} />
```

### WorkOrderEditSheet

**Import:** `@/components/WorkOrderEditSheet`

- Defined in: `components/WorkOrderEditSheet.tsx`
- Export type: named

```ts
function WorkOrderEditSheet({
  open,
  onOpenChange,
  workOrder,
  onSave,
}): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { WorkOrderEditSheet } from '@/components/WorkOrderEditSheet';

<WorkOrderEditSheet {...props} />
```

### WorkOrderFilters

**Import:** `@/components/WorkOrderFilters`

- Defined in: `components/WorkOrderFilters.tsx`
- Export type: named

```ts
function WorkOrderFilters({
  filters,
  onFiltersChange,
  resultCount,
  leftActions,
  actions,
  clients
}: WorkOrderFiltersProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { WorkOrderFilters } from '@/components/WorkOrderFilters';

<WorkOrderFilters {...props} />
```

### WorkOrders

**Import:** `@/pages/WorkOrders`

- Defined in: `pages/WorkOrders.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import WorkOrders from '@/pages/WorkOrders';

<WorkOrders {...props} />
```

### WorkOrdersTableView

**Import:** `@/components/WorkOrdersTableView`

- Defined in: `components/WorkOrdersTableView.tsx`
- Export type: named

```ts
function WorkOrdersTableView({ 
  workOrders, 
  onEdit,
  onDelete,
  onUpdate,
  onAddExpense,
  isLoading = false,
  selectedIds = [],
  onSelectAll,
  onSelectOne,
  visibleColumns = [],
  columnOrder = [],
  sortColumn = null,
  sortDirection = 'asc',
  onSort,
  renderSortIcon,
  totalCount = 0,
  pageSize = 25,
  onPageSizeChange,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: WorkOrdersTableViewProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { WorkOrdersTableView } from '@/components/WorkOrdersTableView';

<WorkOrdersTableView {...props} />
```

### WorkOrderStatusCard

**Import:** `@/components/dashboard/WorkOrderStatusCard`

- Defined in: `components/dashboard/WorkOrderStatusCard.tsx`
- Export type: named

```ts
function WorkOrderStatusCard({ 
  statusCounts,
  activeContractValue,
  activeEstimatedCosts,
  completedContractValue,
  activeProjectedMargin,
  activeProjectedMarginPercent,
  totalInvoiced
}: WorkOrderStatusCardProps): import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { WorkOrderStatusCard } from '@/components/dashboard/WorkOrderStatusCard';

<WorkOrderStatusCard {...props} />
```

## Hooks

Total: 82

### calculateSummaryTotals

**Import:** `@/components/profit-analysis/hooks/useProfitAnalysisData`

- Defined in: `components/profit-analysis/hooks/useProfitAnalysisData.ts`
- Export type: named

```ts
function calculateSummaryTotals(projects: ProfitAnalysisProject[]): import("C:/Dev/profitbuild-dash/src/types/profitAnalysis").ProfitSummaryTotals
```

Calculate summary totals from project data
Note: Only aggregates database-provided values, no new calculations

**Example**

```ts
import { calculateSummaryTotals } from '@/components/profit-analysis/hooks/useProfitAnalysisData';

const result = calculateSummaryTotals(/* params */);
```

### clearGeocodeCache

**Import:** `@/hooks/useReverseGeocode`

- Defined in: `hooks/useReverseGeocode.ts`
- Export type: named

```ts
function clearGeocodeCache(): void
```

Clear the geocode cache (useful for testing)

**Example**

```ts
import { clearGeocodeCache } from '@/hooks/useReverseGeocode';

const result = clearGeocodeCache(/* params */);
```

### receiptQueryKeys

**Import:** `@/hooks/useReceiptsData`

- Defined in: `hooks/useReceiptsData.ts`
- Export type: named

```ts
{ all: readonly ["receipts"]; list: () => readonly ["receipts", "list"]; payees: () => readonly ["receipt-payees"]; projects: () => readonly ["receipt-projects"]; }
```

_No inline documentation provided._

**Example**

```ts
import { receiptQueryKeys } from '@/hooks/useReceiptsData';

const result = receiptQueryKeys(/* params */);
```

### useActivityTracker

**Import:** `@/hooks/useActivityTracker`

- Defined in: `hooks/useActivityTracker.ts`
- Export type: named

```ts
function useActivityTracker(): void
```

_No inline documentation provided._

**Example**

```ts
import { useActivityTracker } from '@/hooks/useActivityTracker';

const result = useActivityTracker(/* params */);
```

### useAICaptionEnhancement

**Import:** `@/hooks/useAICaptionEnhancement`

- Defined in: `hooks/useAICaptionEnhancement.ts`
- Export type: named

```ts
function useAICaptionEnhancement(): { enhance: (imageUrl: string, originalCaption: string, options: import("C:/Dev/profitbuild-dash/src/hooks/useAICaptionEnhancement").EnhancementOptions) => Promise<import("C:/Dev/profitbuild-dash/src/hooks/useAICaptionEnhancement").EnhancementResult>; isEnhancing: boolean; error: string; reset: () => void; }
```

_No inline documentation provided._

**Example**

```ts
import { useAICaptionEnhancement } from '@/hooks/useAICaptionEnhancement';

const result = useAICaptionEnhancement(/* params */);
```

### useAIReportAssistant

**Import:** `@/hooks/useAIReportAssistant`

- Defined in: `hooks/useAIReportAssistant.ts`
- Export type: named

```ts
function useAIReportAssistant(): { messages: import("C:/Dev/profitbuild-dash/src/hooks/useAIReportAssistant").AIMessage[]; isLoading: boolean; error: string; sendQuery: (query: string) => Promise<import("C:/Dev/profitbuild-dash/src/hooks/useAIReportAssistant").AIReportResult>; clearHistory: () => void; }
```

_No inline documentation provided._

**Example**

```ts
import { useAIReportAssistant } from '@/hooks/useAIReportAssistant';

const result = useAIReportAssistant(/* params */);
```

### useAudioRecording

**Import:** `@/hooks/useAudioRecording`

- Defined in: `hooks/useAudioRecording.ts`
- Export type: named

```ts
function useAudioRecording(): { state: RecordingState; duration: number; audioData: string; audioFormat: string; audioLevel: number; error: string; startRecording: () => Promise<void>; stopRecording: () => void; reset: () => void; isRecording: boolean; isProcessing: boolean; isRequesting: boolean; }
```

_No inline documentation provided._

**Example**

```ts
import { useAudioRecording } from '@/hooks/useAudioRecording';

const result = useAudioRecording(/* params */);
```

### useAudioTranscription

**Import:** `@/hooks/useAudioTranscription`

- Defined in: `hooks/useAudioTranscription.ts`
- Export type: named

```ts
function useAudioTranscription(): { transcribe: (audioBase64: string, format?: string) => Promise<any>; isTranscribing: boolean; transcription: string; error: string; reset: () => void; }
```

_No inline documentation provided._

**Example**

```ts
import { useAudioTranscription } from '@/hooks/useAudioTranscription';

const result = useAudioTranscription(/* params */);
```

### useAuth

**Import:** `@/contexts/AuthContext`

- Defined in: `contexts/AuthContext.tsx`
- Export type: named

```ts
function useAuth(): AuthContextType
```

_No inline documentation provided._

**Example**

```ts
import { useAuth } from '@/contexts/AuthContext';

const result = useAuth(/* params */);
```

### useBidMedia

**Import:** `@/hooks/useBidMedia`

- Defined in: `hooks/useBidMedia.ts`
- Export type: named

```ts
function useBidMedia(bidId: string, options?: UseBidMediaOptions): UseBidMediaResult
```

Hook for fetching and subscribing to bid media

**Example**

```ts
import { useBidMedia } from '@/hooks/useBidMedia';

const result = useBidMedia(/* params */);
```

### useBidMediaUpload

**Import:** `@/hooks/useBidMediaUpload`

- Defined in: `hooks/useBidMediaUpload.ts`
- Export type: named

```ts
function useBidMediaUpload(): UseBidMediaUploadResult
```

Hook for uploading bid media with progress tracking, validation, and error rollback

**Example**

```ts
import { useBidMediaUpload } from '@/hooks/useBidMediaUpload';

const result = useBidMediaUpload(/* params */);
```

### useBidNotes

**Import:** `@/hooks/useBidNotes`

- Defined in: `hooks/useBidNotes.ts`
- Export type: named

```ts
function useBidNotes(bidId: string): UseBidNotesResult
```

Hook for fetching and subscribing to bid notes

**Example**

```ts
import { useBidNotes } from '@/hooks/useBidNotes';

const result = useBidNotes(/* params */);
```

### useCameraCapture

**Import:** `@/hooks/useCameraCapture`

- Defined in: `hooks/useCameraCapture.ts`
- Export type: named

```ts
function useCameraCapture(): UseCameraCaptureResult
```

Hook for capturing photos using browser's camera API
Works on all modern mobile browsers (iOS Safari, Android Chrome)

**Example**

```ts
import { useCameraCapture } from '@/hooks/useCameraCapture';

const result = useCameraCapture(/* params */);
```

### useCaptionFlow

**Import:** `@/hooks/useCaptionFlow`

- Defined in: `hooks/useCaptionFlow.ts`
- Export type: named

```ts
function useCaptionFlow(): CaptionFlowState
```

Shared hook for the caption prompt flow.
Handles progressive prompting, skip tracking, voice/type modal coordination.

**Example**

```ts
import { useCaptionFlow } from '@/hooks/useCaptionFlow';

const result = useCaptionFlow(/* params */);
```

### useCaptureMetadata

**Import:** `@/hooks/useCaptureMetadata`

- Defined in: `hooks/useCaptureMetadata.ts`
- Export type: named

```ts
function useCaptureMetadata(): CaptureMetadata
```

Shared hook for capture metadata: GPS, reverse geocoding, timestamps, device info.
Used by both photo and video capture pages (project and bid).

**Example**

```ts
import { useCaptureMetadata } from '@/hooks/useCaptureMetadata';

const result = useCaptureMetadata(/* params */);
```

### useContractData

**Import:** `@/hooks/useContractData`

- Defined in: `hooks/useContractData.ts`
- Export type: named

```ts
function useContractData({
  projectId,
  estimateId,
  quoteId,
  payeeId,
}: UseContractDataParams): UseContractDataResult
```

_No inline documentation provided._

**Example**

```ts
import { useContractData } from '@/hooks/useContractData';

const result = useContractData(/* params */);
```

### useCreateLinkedPayee

**Import:** `@/hooks/useEmployeesAudit`

- Defined in: `hooks/useEmployeesAudit.ts`
- Export type: named

```ts
function useCreateLinkedPayee(): import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseMutationResult<void, unknown, import("C:/Dev/profitbuild-dash/src/hooks/useEmployeesAudit").EmployeeAuditRow, unknown>
```

Create a linked internal payee for a role-holder that has no payee row yet.
Sets provides_labor based on role (field_worker → true, admin/manager → false).

**Example**

```ts
import { useCreateLinkedPayee } from '@/hooks/useEmployeesAudit';

const result = useCreateLinkedPayee(/* params */);
```

### useDeactivatePayee

**Import:** `@/hooks/useEmployeesAudit`

- Defined in: `hooks/useEmployeesAudit.ts`
- Export type: named

```ts
function useDeactivatePayee(): import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseMutationResult<void, unknown, string, unknown>
```

Deactivate an existing payee (e.g. an unlinked legacy record the admin doesn't want to use).
Respects the golden rule: never delete payees — they're referenced by expense history.

**Example**

```ts
import { useDeactivatePayee } from '@/hooks/useEmployeesAudit';

const result = useDeactivatePayee(/* params */);
```

### useDebounce

**Import:** `@/hooks/useDebounce`

- Defined in: `hooks/useDebounce.ts`
- Export type: named

```ts
function useDebounce<T>(value: T, delay: number = 500): T
```

Custom hook to debounce a value

**Example**

```ts
import { useDebounce } from '@/hooks/useDebounce';

const result = useDebounce(/* params */);
```

### useDocumentPreview

**Import:** `@/hooks/useDocumentPreview`

- Defined in: `hooks/useDocumentPreview.ts`
- Export type: named

```ts
function useDocumentPreview(): import("C:/Dev/profitbuild-dash/src/hooks/useDocumentPreview").UseDocumentPreviewReturn
```

_No inline documentation provided._

**Example**

```ts
import { useDocumentPreview } from '@/hooks/useDocumentPreview';

const result = useDocumentPreview(/* params */);
```

### useEmployeesAudit

**Import:** `@/hooks/useEmployeesAudit`

- Defined in: `hooks/useEmployeesAudit.ts`
- Export type: named

```ts
function useEmployeesAudit(): import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseQueryResult<import("C:/Dev/profitbuild-dash/src/hooks/useEmployeesAudit").EmployeeAuditRow[], Error>
```

Admin-only read: every role-holder with their internal-payee linkage status.
Backed by the `get_employees_audit()` SECURITY DEFINER RPC (raises 42501 if caller
is not admin). See Architectural Rule 11 in CLAUDE.md.

**Example**

```ts
import { useEmployeesAudit } from '@/hooks/useEmployeesAudit';

const result = useEmployeesAudit(/* params */);
```

### useEstimateQuoteStatus

**Import:** `@/hooks/useEstimateQuoteStatus`

- Defined in: `hooks/useEstimateQuoteStatus.ts`
- Export type: named

```ts
function useEstimateQuoteStatus(estimateId?: string): { lineItems: import("C:/Dev/profitbuild-dash/src/hooks/useEstimateQuoteStatus").EstimateLineItemQuoteStatus[]; summary: import("C:/Dev/profitbuild-dash/src/hooks/useEstimateQuoteStatus").EstimateQuoteStatusSummary; isLoading: boolean; error: string; fetchData: (id: string) => Promise<void>; fetchAllSummaries: () => Promise<any[]>; clearError: () => void; }
```

_No inline documentation provided._

**Example**

```ts
import { useEstimateQuoteStatus } from '@/hooks/useEstimateQuoteStatus';

const result = useEstimateQuoteStatus(/* params */);
```

### useExpensesQuery

**Import:** `@/hooks/useExpensesQuery`

- Defined in: `hooks/useExpensesQuery.ts`
- Export type: named

```ts
function useExpensesQuery(filters: ExpensesQueryFilters = {}, options: { enabled?: boolean } = {}): { data: import("C:/Dev/profitbuild-dash/src/types/expense").Expense[]; totalCount: number; isLoading: boolean; isFetching: boolean; isFetchingNextPage: boolean; hasNextPage: boolean; fetchNextPage: (options?: import("C:/Dev/profitbuild-dash/node_modules/@tanstack/query-core/build/modern/hydration-Cvr-9VdO").av) => Promise<import("C:/Dev/profitbuild-dash/node_modules/@tanstack/query-core/build/modern/hydration-Cvr-9VdO").aQ<import("C:/Dev/profitbuild-dash/node_modules/@tanstack/query-core/build/modern/hydration-Cvr-9VdO").a8<ExpensesPage, unknown>, Error>>; refetch: (options?: import("C:/Dev/profitbuild-dash/node_modules/@tanstack/query-core/build/modern/hydration-Cvr-9VdO").aq) => Promise<import("C:/Dev/profitbuild-dash/node_modules/@tanstack/query-core/build/modern/hydration-Cvr-9VdO").aH<import("C:/Dev/profitbuild-dash/node_modules/@tanstack/query-core/build/modern/hydration-Cvr-9VdO").a8<ExpensesPage, unknown>, Error>>; error: Error; }
```

_No inline documentation provided._

**Example**

```ts
import { useExpensesQuery } from '@/hooks/useExpensesQuery';

const result = useExpensesQuery(/* params */);
```

### useGeolocation

**Import:** `@/hooks/useGeolocation`

- Defined in: `hooks/useGeolocation.ts`
- Export type: named

```ts
function useGeolocation(): UseGeolocationResult
```

Hook for getting device GPS location using browser Geolocation API
Works on all modern mobile browsers (iOS Safari, Android Chrome)

**Example**

```ts
import { useGeolocation } from '@/hooks/useGeolocation';

const result = useGeolocation(/* params */);
```

### useHardDeletePayee

**Import:** `@/hooks/useEmployeesAudit`

- Defined in: `hooks/useEmployeesAudit.ts`
- Export type: named

```ts
function useHardDeletePayee(): import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseMutationResult<void, unknown, string, unknown>
```

Hard-delete a payee row. Will fail at the DB level (FK constraint 23503) if anything
in expenses, contracts, quotes, receipts, change_order_line_items, pending_payee_reviews,
or projects.owner_id still references this payee. In that case we translate the error
into a plain-language toast suggesting Retire instead.

This lets Postgres be the source of truth on "is it safe to delete?" — no pre-check
needed, no race condition between check and delete. See Architectural Rule 11.

**Example**

```ts
import { useHardDeletePayee } from '@/hooks/useEmployeesAudit';

const result = useHardDeletePayee(/* params */);
```

### useInternalLaborRates

**Import:** `@/hooks/useCompanySettings`

- Defined in: `hooks/useCompanySettings.ts`
- Export type: named

```ts
function useInternalLaborRates(): import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseQueryResult<import("C:/Dev/profitbuild-dash/src/types/companySettings").InternalLaborRates, Error>
```

Hook to fetch internal labor rates from company settings

**Example**

```ts
import { useInternalLaborRates } from '@/hooks/useCompanySettings';

const result = useInternalLaborRates(/* params */);
```

### useIsMobile

**Import:** `@/hooks/use-mobile`

- Defined in: `hooks/use-mobile.tsx`
- Export type: named

```ts
function useIsMobile(): boolean
```

_No inline documentation provided._

**Example**

```ts
import { useIsMobile } from '@/hooks/use-mobile';

const result = useIsMobile(/* params */);
```

### useLineItemControl

**Import:** `@/hooks/useLineItemControl`

- Defined in: `hooks/useLineItemControl.ts`
- Export type: named

```ts
function useLineItemControl(projectId: string, project: Project): UseLineItemControlReturn
```

_No inline documentation provided._

**Example**

```ts
import { useLineItemControl } from '@/hooks/useLineItemControl';

const result = useLineItemControl(/* params */);
```

### useLinkExistingPayee

**Import:** `@/hooks/useEmployeesAudit`

- Defined in: `hooks/useEmployeesAudit.ts`
- Export type: named

```ts
function useLinkExistingPayee(): import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseMutationResult<void, unknown, import("C:/Dev/profitbuild-dash/src/hooks/useEmployeesAudit").EmployeeAuditRow, unknown>
```

Link an existing unlinked internal payee to the role-holder with the matching email.

**Example**

```ts
import { useLinkExistingPayee } from '@/hooks/useEmployeesAudit';

const result = useLinkExistingPayee(/* params */);
```

### useMentionableUsers

**Import:** `@/hooks/useMentionableUsers`

- Defined in: `hooks/useMentionableUsers.ts`
- Export type: named

```ts
function useMentionableUsers(): import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseQueryResult<any, Error>
```

Returns every role-holder who can be

**Example**

```ts
import { useMentionableUsers } from '@/hooks/useMentionableUsers';

const result = useMentionableUsers(/* params */);
```

### useMyTraining

**Import:** `@/hooks/useTrainingAssignments`

- Defined in: `hooks/useTrainingAssignments.ts`
- Export type: named

```ts
function useMyTraining(): { items: import("C:/Dev/profitbuild-dash/src/types/training").MyTrainingItem[]; stats: import("C:/Dev/profitbuild-dash/src/types/training").TrainingStats; isLoading: boolean; markComplete: (contentId: string, options?: { time_spent_minutes?: number; notes?: string; }) => Promise<boolean>; refresh: () => Promise<void>; }
```

_No inline documentation provided._

**Example**

```ts
import { useMyTraining } from '@/hooks/useTrainingAssignments';

const result = useMyTraining(/* params */);
```

### useOnlineStatus

**Import:** `@/hooks/useOnlineStatus`

- Defined in: `hooks/useOnlineStatus.ts`
- Export type: named

```ts
function useOnlineStatus(): OnlineStatus
```

_No inline documentation provided._

**Example**

```ts
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const result = useOnlineStatus(/* params */);
```

### useOvernightDetection

**Import:** `@/components/time-entry-form/hooks/useOvernightDetection`

- Defined in: `components/time-entry-form/hooks/useOvernightDetection.ts`
- Export type: named

```ts
function useOvernightDetection({
  date,
  startTime,
  endTime,
}: UseOvernightDetectionParams): import("C:/Dev/profitbuild-dash/src/components/time-entry-form/hooks/useOvernightDetection").UseOvernightDetectionResult
```

Detects when shift crosses midnight (endTime <= startTime in HH:mm)
and returns overnight-adjusted end date and Date objects.

**Example**

```ts
import { useOvernightDetection } from '@/components/time-entry-form/hooks/useOvernightDetection';

const result = useOvernightDetection(/* params */);
```

### usePagination

**Import:** `@/hooks/usePagination`

- Defined in: `hooks/usePagination.ts`
- Export type: named

```ts
function usePagination({
  totalItems,
  pageSize,
  initialPage = 1,
}: UsePaginationProps): UsePaginationReturn
```

_No inline documentation provided._

**Example**

```ts
import { usePagination } from '@/hooks/usePagination';

const result = usePagination(/* params */);
```

### usePaymentApplicationLines

**Import:** `@/hooks/usePaymentApplications`

- Defined in: `hooks/usePaymentApplications.ts`
- Export type: named

```ts
function usePaymentApplicationLines(applicationId: string | null): { lines: import("C:/Dev/profitbuild-dash/src/types/paymentApplication").PaymentApplicationLineWithSOV[]; isLoading: boolean; updateLine: import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseMutationResult<void, Error, { lineId: string; currentWork: number; storedMaterials: number; }, unknown>; refetch: (options?: import("C:/Dev/profitbuild-dash/node_modules/@tanstack/query-core/build/modern/hydration-Cvr-9VdO").aq) => Promise<import("C:/Dev/profitbuild-dash/node_modules/@tanstack/query-core/build/modern/hydration-Cvr-9VdO").aH<import("C:/Dev/profitbuild-dash/src/types/paymentApplication").PaymentApplicationLineWithSOV[], Error>>; }
```

_No inline documentation provided._

**Example**

```ts
import { usePaymentApplicationLines } from '@/hooks/usePaymentApplications';

const result = usePaymentApplicationLines(/* params */);
```

### usePaymentApplications

**Import:** `@/hooks/usePaymentApplications`

- Defined in: `hooks/usePaymentApplications.ts`
- Export type: named

```ts
function usePaymentApplications(projectId: string): { applications: { application_number: number; balance_to_finish: number; certified_amount: number; certified_by: string; certified_date: string; contract_sum_to_date: number; created_at: string; created_by: string; current_payment_due: number; g702_pdf_storage_path: string; g702_pdf_url: string; g703_pdf_storage_path: string; g703_pdf_url: string; id: string; net_change_orders: number; notes: string; original_contract_sum: number; period_from: string; period_to: string; project_id: string; sov_id: string; status: "rejected" | "draft" | "submitted" | "certified" | "paid"; total_completed_to_date: number; total_earned_less_retainage: number; total_previous_payments: number; total_retainage: number; updated_at: string; version: number; }[]; isLoading: boolean; createApplication: import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseMutationResult<string, Error, { periodFrom: string; periodTo: string; }, unknown>; updateStatus: import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseMutationResult<void, Error, { applicationId: string; status: "rejected" | "draft" | "submitted" | "certified" | "paid"; certifiedAmount?: number; certifiedBy?: string; }, unknown>; deleteApplication: import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseMutationResult<void, Error, string, unknown>; refetch: (options?: import("C:/Dev/profitbuild-dash/node_modules/@tanstack/query-core/build/modern/hydration-Cvr-9VdO").aq) => Promise<import("C:/Dev/profitbuild-dash/node_modules/@tanstack/query-core/build/modern/hydration-Cvr-9VdO").aH<{ application_number: number; balance_to_finish: number; certified_amount: number; certified_by: string; certified_date: string; contract_sum_to_date: number; created_at: string; created_by: string; current_payment_due: number; g702_pdf_storage_path: string; g702_pdf_url: string; g703_pdf_storage_path: string; g703_pdf_url: string; id: string; net_change_orders: number; notes: string; original_contract_sum: number; period_from: string; period_to: string; project_id: string; sov_id: string; status: "rejected" | "draft" | "submitted" | "certified" | "paid"; total_completed_to_date: number; total_earned_less_retainage: number; total_previous_payments: number; total_retainage: number; updated_at: string; version: number; }[], Error>>; }
```

_No inline documentation provided._

**Example**

```ts
import { usePaymentApplications } from '@/hooks/usePaymentApplications';

const result = usePaymentApplications(/* params */);
```

### usePendingCounts

**Import:** `@/hooks/usePendingCounts`

- Defined in: `hooks/usePendingCounts.ts`
- Export type: named

```ts
function usePendingCounts(): PendingCounts
```

_No inline documentation provided._

**Example**

```ts
import { usePendingCounts } from '@/hooks/usePendingCounts';

const result = usePendingCounts(/* params */);
```

### useProfitAnalysisData

**Import:** `@/components/profit-analysis/hooks/useProfitAnalysisData`

- Defined in: `components/profit-analysis/hooks/useProfitAnalysisData.ts`
- Export type: named

```ts
function useProfitAnalysisData(statusFilter: string[] = ['approved', 'in_progress', 'complete']): import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseQueryResult<import("C:/Dev/profitbuild-dash/src/types/profitAnalysis").ProfitAnalysisProject[], Error>
```

_No inline documentation provided._

**Example**

```ts
import { useProfitAnalysisData } from '@/components/profit-analysis/hooks/useProfitAnalysisData';

const result = useProfitAnalysisData(/* params */);
```

### useProgressTracking

**Import:** `@/components/schedule/hooks/useProgressTracking`

- Defined in: `components/schedule/hooks/useProgressTracking.ts`
- Export type: named

```ts
function useProgressTracking(projectId: string): { taskProgress: Map<string, TaskProgress>; getTaskProgress: (taskId: string) => number; getTaskActualCost: (taskId: string) => number; isLoading: boolean; error: string; refetch: () => Promise<void>; }
```

Hook to track progress and costs for schedule tasks
Updated: Fixed expense correlation queries

**Example**

```ts
import { useProgressTracking } from '@/components/schedule/hooks/useProgressTracking';

const result = useProgressTracking(/* params */);
```

### useProjectContext

**Import:** `@/components/ProjectDetailView`

- Defined in: `components/ProjectDetailView.tsx`
- Export type: named

```ts
function useProjectContext(): import("C:/Dev/profitbuild-dash/src/components/ProjectDetailView").ProjectOutletContext
```

_No inline documentation provided._

**Example**

```ts
import { useProjectContext } from '@/components/ProjectDetailView';

const result = useProjectContext(/* params */);
```

### useProjectCostBuckets

**Import:** `@/hooks/useProjectCostBuckets`

- Defined in: `hooks/useProjectCostBuckets.ts`
- Export type: named

```ts
function useProjectCostBuckets(projectId: string, project: Project): import("C:/Dev/profitbuild-dash/src/hooks/useProjectCostBuckets").UseProjectCostBucketsResult
```

Composite hook producing per-category cost buckets for the project.

Composes: useLineItemControl (line items + correlations + quotes)
        + categorySpend query (project-scoped expenses + splits, grouped by category)
        + laborCushionRaw query (estimate_financial_summary + actual labor hours)
        + estimateLineItemMeta query (labor_hours, billing_rate_per_hour, labor_cushion_amount)
        + useInternalLaborRates (fallback actual_cost_rate for cushion math)

The non-useLineItemControl reads use TanStack Query so they invalidate cleanly
across mutations (CLAUDE.md gotcha 23 + the "useProjectData not reactive" follow-up).

**Example**

```ts
import { useProjectCostBuckets } from '@/hooks/useProjectCostBuckets';

const result = useProjectCostBuckets(/* params */);
```

### useProjectData

**Import:** `@/hooks/useProjectData`

- Defined in: `hooks/useProjectData.tsx`
- Export type: named

```ts
function useProjectData(projectId: string | undefined): import("C:/Dev/profitbuild-dash/src/hooks/useProjectData").UseProjectDataReturn
```

_No inline documentation provided._

**Example**

```ts
import { useProjectData } from '@/hooks/useProjectData';

const result = useProjectData(/* params */);
```

### useProjectFinancialDetail

**Import:** `@/components/profit-analysis/hooks/useProjectFinancialDetail`

- Defined in: `components/profit-analysis/hooks/useProjectFinancialDetail.ts`
- Export type: named

```ts
function useProjectFinancialDetail(projectId: string | null): import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseQueryResult<{ categories: import("C:/Dev/profitbuild-dash/src/components/profit-analysis/hooks/useProjectFinancialDetail").CategorySummary[]; estimateToQuoteChange: number; estimateToQuotePercent: number; quoteToActualChange: number; quoteToActualPercent: number; projectedFinalCost: any; projectedFinalMargin: any; burnRate: any; allocationSummary: import("C:/Dev/profitbuild-dash/src/components/profit-analysis/hooks/useProjectFinancialDetail").AllocationSummary; }, Error>
```

_No inline documentation provided._

**Example**

```ts
import { useProjectFinancialDetail } from '@/components/profit-analysis/hooks/useProjectFinancialDetail';

const result = useProjectFinancialDetail(/* params */);
```

### useProjectMedia

**Import:** `@/hooks/useProjectMedia`

- Defined in: `hooks/useProjectMedia.ts`
- Export type: named

```ts
function useProjectMedia(projectId: string, options?: UseProjectMediaOptions): UseProjectMediaResult
```

Hook for fetching and subscribing to project media

**Example**

```ts
import { useProjectMedia } from '@/hooks/useProjectMedia';

const result = useProjectMedia(/* params */);
```

### useProjectMediaUpload

**Import:** `@/hooks/useProjectMediaUpload`

- Defined in: `hooks/useProjectMediaUpload.ts`
- Export type: named

```ts
function useProjectMediaUpload(projectId: string): UseProjectMediaUploadResult
```

Hook for uploading project media with progress tracking

**Example**

```ts
import { useProjectMediaUpload } from '@/hooks/useProjectMediaUpload';

const result = useProjectMediaUpload(/* params */);
```

### useProjectNotes

**Import:** `@/hooks/useProjectNotes`

- Defined in: `hooks/useProjectNotes.ts`
- Export type: named

```ts
function useProjectNotes(projectId: string): { notes: import("C:/Dev/profitbuild-dash/src/types/projectNote").ProjectNote[]; isLoading: boolean; addNote: import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseMutateFunction<void, Error, AddNoteParams, unknown>; isAdding: boolean; updateNote: import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseMutateFunction<void, Error, { id: string; text: string; }, unknown>; deleteNote: import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseMutateFunction<void, Error, string, unknown>; uploadAttachment: (dataUrl: string, type: "image" | "video" | "file", fileName?: string) => Promise<string>; }
```

_No inline documentation provided._

**Example**

```ts
import { useProjectNotes } from '@/hooks/useProjectNotes';

const result = useProjectNotes(/* params */);
```

### usePullToRefresh

**Import:** `@/hooks/usePullToRefresh`

- Defined in: `hooks/usePullToRefresh.ts`
- Export type: named

```ts
function usePullToRefresh({
  onRefresh,
  threshold = 60,
  maxPull = 120,
}: UsePullToRefreshOptions): UsePullToRefreshReturn
```

Pull-to-refresh hook for mobile PWA.

Safety measures:
- Only activates when scrolled to top (scrollTop === 0)
- Disabled when modal/sheet/drawer is open
- Requires minimum vertical pull distance (threshold)
- Ignores pulls with significant horizontal movement
- Debounced to prevent rapid multiple refreshes

**Example**

```ts
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const result = usePullToRefresh(/* params */);
```

### useQuickBooksConnection

**Import:** `@/hooks/useQuickBooksConnection`

- Defined in: `hooks/useQuickBooksConnection.ts`
- Export type: named

```ts
function useQuickBooksConnection(): { connection: import("C:/Dev/profitbuild-dash/src/hooks/useQuickBooksConnection").QuickBooksConnection; isLoading: boolean; error: Error; isConnected: boolean; isConnecting: boolean; isDisconnecting: boolean; initiateConnection: () => Promise<void>; disconnect: () => Promise<void>; }
```

_No inline documentation provided._

**Example**

```ts
import { useQuickBooksConnection } from '@/hooks/useQuickBooksConnection';

const result = useQuickBooksConnection(/* params */);
```

### useQuickBooksSync

**Import:** `@/hooks/useQuickBooksSync`

- Defined in: `hooks/useQuickBooksSync.ts`
- Export type: named

```ts
function useQuickBooksSync(): import("C:/Dev/profitbuild-dash/src/hooks/useQuickBooksSync").UseQuickBooksSyncReturn
```

Hook to check QuickBooks auto sync feature flag and configuration

**Example**

```ts
import { useQuickBooksSync } from '@/hooks/useQuickBooksSync';

const result = useQuickBooksSync(/* params */);
```

### useReactivatePayee

**Import:** `@/hooks/useEmployeesAudit`

- Defined in: `hooks/useEmployeesAudit.ts`
- Export type: named

```ts
function useReactivatePayee(): import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseMutationResult<void, unknown, string, unknown>
```

Reactivate an inactive internal payee.

**Example**

```ts
import { useReactivatePayee } from '@/hooks/useEmployeesAudit';

const result = useReactivatePayee(/* params */);
```

### useReceiptActions

**Import:** `@/hooks/useReceiptActions`

- Defined in: `hooks/useReceiptActions.ts`
- Export type: named

```ts
function useReceiptActions({
  loadReceipts,
  setRejectDialogOpen,
  setReceiptToReject,
}: UseReceiptActionsProps): { handleApproveReceipt: (receiptId: string) => Promise<void>; handleRejectReceipt: (receiptId: string, reason: string) => Promise<void>; handleDeleteReceipt: (receiptId: string, receiptType: "time_entry" | "standalone") => Promise<void>; }
```

_No inline documentation provided._

**Example**

```ts
import { useReceiptActions } from '@/hooks/useReceiptActions';

const result = useReceiptActions(/* params */);
```

### useReceiptBulkActions

**Import:** `@/hooks/useReceiptBulkActions`

- Defined in: `hooks/useReceiptBulkActions.ts`
- Export type: named

```ts
function useReceiptBulkActions({
  selectedIds,
  allReceipts,
  loadReceipts,
  setSelectedIds,
  setBulkRejectDialogOpen,
  setDeleteDialogOpen,
}: UseReceiptBulkActionsProps): { handleBulkApprove: () => Promise<void>; handleBulkReject: (reason: string) => Promise<void>; handleBulkDownloadSelected: () => Promise<void>; handleBulkDelete: () => Promise<void>; }
```

_No inline documentation provided._

**Example**

```ts
import { useReceiptBulkActions } from '@/hooks/useReceiptBulkActions';

const result = useReceiptBulkActions(/* params */);
```

### useReceiptFiltering

**Import:** `@/hooks/useReceiptFiltering`

- Defined in: `hooks/useReceiptFiltering.ts`
- Export type: named

```ts
function useReceiptFiltering(allReceipts: UnifiedReceipt[], filters: ReceiptFilters): { filteredReceipts: import("C:/Dev/profitbuild-dash/src/hooks/useReceiptsData").UnifiedReceipt[]; }
```

_No inline documentation provided._

**Example**

```ts
import { useReceiptFiltering } from '@/hooks/useReceiptFiltering';

const result = useReceiptFiltering(/* params */);
```

### useReceiptsData

**Import:** `@/hooks/useReceiptsData`

- Defined in: `hooks/useReceiptsData.ts`
- Export type: named

```ts
function useReceiptsData(): { allReceipts: import("C:/Dev/profitbuild-dash/src/hooks/useReceiptsData").UnifiedReceipt[]; loading: boolean; payees: { id: any; name: any; }[]; projects: { id: any; number: any; name: any; }[]; loadReceipts: () => void; statistics: { pendingCount: number; approvedTodayCount: number; rejectedCount: number; totalThisWeekCount: number; }; }
```

_No inline documentation provided._

**Example**

```ts
import { useReceiptsData } from '@/hooks/useReceiptsData';

const result = useReceiptsData(/* params */);
```

### useReceiptSorting

**Import:** `@/hooks/useReceiptSorting`

- Defined in: `hooks/useReceiptSorting.tsx`
- Export type: named

```ts
function useReceiptSorting(filteredReceipts: UnifiedReceipt[]): { sortColumn: string; sortDirection: "asc" | "desc"; handleSort: (columnKey: string) => void; renderSortIcon: (columnKey: string) => import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element; sortedReceipts: import("C:/Dev/profitbuild-dash/src/hooks/useReceiptsData").UnifiedReceipt[]; }
```

_No inline documentation provided._

**Example**

```ts
import { useReceiptSorting } from '@/hooks/useReceiptSorting';

const result = useReceiptSorting(/* params */);
```

### useReportExecution

**Import:** `@/hooks/useReportExecution`

- Defined in: `hooks/useReportExecution.ts`
- Export type: named

```ts
function useReportExecution(): { executeReport: (config: import("C:/Dev/profitbuild-dash/src/hooks/useReportExecution").ReportConfig) => Promise<import("C:/Dev/profitbuild-dash/src/hooks/useReportExecution").ReportResult>; isLoading: boolean; error: string; clearError: () => void; }
```

_No inline documentation provided._

**Example**

```ts
import { useReportExecution } from '@/hooks/useReportExecution';

const result = useReportExecution(/* params */);
```

### useReportFavorites

**Import:** `@/hooks/useReportFavorites`

- Defined in: `hooks/useReportFavorites.ts`
- Export type: named

```ts
function useReportFavorites(): { favorites: string[]; isFavorite: (reportId: string) => boolean; toggleFavorite: (reportId: string) => void; clearFavorites: () => void; }
```

_No inline documentation provided._

**Example**

```ts
import { useReportFavorites } from '@/hooks/useReportFavorites';

const result = useReportFavorites(/* params */);
```

### useReportFilterOptions

**Import:** `@/hooks/useReportFilterOptions`

- Defined in: `hooks/useReportFilterOptions.ts`
- Export type: named

```ts
function useReportFilterOptions(): { clients: import("C:/Dev/profitbuild-dash/src/hooks/useReportFilterOptions").FilterOption[]; payees: import("C:/Dev/profitbuild-dash/src/hooks/useReportFilterOptions").FilterOption[]; workers: import("C:/Dev/profitbuild-dash/src/hooks/useReportFilterOptions").FilterOption[]; projects: import("C:/Dev/profitbuild-dash/src/hooks/useReportFilterOptions").FilterOption[]; isLoading: boolean; }
```

_No inline documentation provided._

**Example**

```ts
import { useReportFilterOptions } from '@/hooks/useReportFilterOptions';

const result = useReportFilterOptions(/* params */);
```

### useReportTemplates

**Import:** `@/hooks/useReportTemplates`

- Defined in: `hooks/useReportTemplates.ts`
- Export type: named

```ts
function useReportTemplates(): { templates: import("C:/Dev/profitbuild-dash/src/hooks/useReportTemplates").ReportTemplate[]; savedReports: import("C:/Dev/profitbuild-dash/src/hooks/useReportTemplates").ReportTemplate[]; isLoading: boolean; error: string; loadTemplates: () => Promise<void>; loadSavedReports: () => Promise<void>; saveReport: (name: string, description: string, category: "schedule" | "financial" | "operational" | "client" | "vendor" | "Training", config: any, isTemplate?: boolean) => Promise<string>; deleteReport: (reportId: string) => Promise<boolean>; clearError: () => void; }
```

_No inline documentation provided._

**Example**

```ts
import { useReportTemplates } from '@/hooks/useReportTemplates';

const result = useReportTemplates(/* params */);
```

### useReverseGeocode

**Import:** `@/hooks/useReverseGeocode`

- Defined in: `hooks/useReverseGeocode.ts`
- Export type: named

```ts
function useReverseGeocode(): UseReverseGeocodeResult
```

Hook for reverse geocoding GPS coordinates to human-readable addresses
Uses OpenStreetMap Nominatim API (free, no API key required)

Rate limit: 1 request per second (enforced by this hook)
Usage policy: https://operations.osmfoundation.org/policies/nominatim/

**Example**

```ts
import { useReverseGeocode } from '@/hooks/useReverseGeocode';

const result = useReverseGeocode(/* params */);
```

### useRoles

**Import:** `@/contexts/RoleContext`

- Defined in: `contexts/RoleContext.tsx`
- Export type: named

```ts
function useRoles(): RoleContextType
```

_No inline documentation provided._

**Example**

```ts
import { useRoles } from '@/contexts/RoleContext';

const result = useRoles(/* params */);
```

### useScheduleOfValues

**Import:** `@/hooks/useScheduleOfValues`

- Defined in: `hooks/useScheduleOfValues.ts`
- Export type: named

```ts
function useScheduleOfValues(projectId: string): { sov: { created_at: string; created_by: string; estimate_id: string; id: string; original_contract_sum: number; project_id: string; retainage_percent: number; updated_at: string; }; sovLines: { category: "labor_internal" | "subcontractors" | "materials" | "equipment" | "other" | "permits" | "management" | "office_expenses" | "vehicle_expenses" | "tools" | "software" | "vehicle_maintenance" | "gas" | "meals"; created_at: string; description: string; id: string; item_number: string; retainage_percent_override: number; scheduled_value: number; sort_order: number; source_change_order_id: string; source_estimate_line_item_id: string; sov_id: string; }[]; isLoading: boolean; isLinesLoading: boolean; generateSOV: import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseMutationResult<string, Error, { estimateId: string; retainagePercent?: number; }, unknown>; updateRetainage: import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseMutationResult<void, Error, number, unknown>; refetch: () => void; }
```

_No inline documentation provided._

**Example**

```ts
import { useScheduleOfValues } from '@/hooks/useScheduleOfValues';

const result = useScheduleOfValues(/* params */);
```

### useScheduleTableColumns

**Import:** `@/hooks/useScheduleTableColumns`

- Defined in: `hooks/useScheduleTableColumns.ts`
- Export type: named

```ts
function useScheduleTableColumns(projectId: string): { columnDefinitions: import("C:/Dev/profitbuild-dash/src/hooks/useScheduleTableColumns").ScheduleColumnConfig[]; visibleColumns: string[]; setVisibleColumns: React.Dispatch<React.SetStateAction<string[]>>; }
```

_No inline documentation provided._

**Example**

```ts
import { useScheduleTableColumns } from '@/hooks/useScheduleTableColumns';

const result = useScheduleTableColumns(/* params */);
```

### useScheduleTasks

**Import:** `@/components/schedule/hooks/useScheduleTasks`

- Defined in: `components/schedule/hooks/useScheduleTasks.ts`
- Export type: named

```ts
function useScheduleTasks({
  projectId,
  projectStartDate,
  projectEndDate
}: UseScheduleTasksProps): { tasks: import("C:/Dev/profitbuild-dash/src/types/schedule").ScheduleTask[]; isLoading: boolean; error: Error; loadTasks: () => Promise<void>; updateTask: (updatedTask: import("C:/Dev/profitbuild-dash/src/types/schedule").ScheduleTask) => Promise<import("C:/Dev/profitbuild-dash/src/types/schedule").ScheduleTask>; updateTaskDates: (taskId: string, start: Date, end: Date) => Promise<void>; refreshProgress: () => Promise<void>; }
```

Load and manage schedule tasks from database

**Example**

```ts
import { useScheduleTasks } from '@/components/schedule/hooks/useScheduleTasks';

const result = useScheduleTasks(/* params */);
```

### useScheduleWarnings

**Import:** `@/components/schedule/hooks/useScheduleWarnings`

- Defined in: `components/schedule/hooks/useScheduleWarnings.ts`
- Export type: named

```ts
function useScheduleWarnings(tasks: ScheduleTask[], settings: ScheduleSettings): { warnings: import("C:/Dev/profitbuild-dash/src/types/schedule").ScheduleWarning[]; dismissWarning: (warningId: string) => void; clearDismissed: () => void; getTaskWarnings: (taskId: string) => import("C:/Dev/profitbuild-dash/src/types/schedule").ScheduleWarning[]; warningCounts: { error: number; warning: number; info: number; total: number; }; }
```

Generate and manage schedule warnings

**Example**

```ts
import { useScheduleWarnings } from '@/components/schedule/hooks/useScheduleWarnings';

const result = useScheduleWarnings(/* params */);
```

### useSelectInteractionGuard

**Import:** `@/components/time-tracker/hooks/useSelectInteractionGuard`

- Defined in: `components/time-tracker/hooks/useSelectInteractionGuard.ts`
- Export type: named

```ts
function useSelectInteractionGuard(): { isInteracting: boolean; startInteraction: () => void; endInteraction: () => void; }
```

_No inline documentation provided._

**Example**

```ts
import { useSelectInteractionGuard } from '@/components/time-tracker/hooks/useSelectInteractionGuard';

const result = useSelectInteractionGuard(/* params */);
```

### useSidebar

**Import:** `@/components/ui/sidebar`

- Defined in: `components/ui/sidebar.tsx`
- Export type: named

```ts
function useSidebar(): SidebarContext
```

_No inline documentation provided._

**Example**

```ts
import { useSidebar } from '@/components/ui/sidebar';

const result = useSidebar(/* params */);
```

### useSmartNavigation

**Import:** `@/hooks/useSmartNavigation`

- Defined in: `hooks/useSmartNavigation.ts`
- Export type: named

```ts
function useSmartNavigation(): { navigateToProjectMedia: (projectId: string) => void; navigateToProjectDetail: (projectId: string) => void; }
```

Smart navigation hook that routes users based on their roles
Field workers use /field-media routes, others use /projects routes

**Example**

```ts
import { useSmartNavigation } from '@/hooks/useSmartNavigation';

const result = useSmartNavigation(/* params */);
```

### useSwipeGesture

**Import:** `@/hooks/useSwipeGesture`

- Defined in: `hooks/useSwipeGesture.ts`
- Export type: named

```ts
function useSwipeGesture(options: SwipeGestureOptions): { handleTouchStart: (e: TouchEvent) => void; handleTouchMove: (e: TouchEvent) => void; handleTouchEnd: () => void; }
```

Hook for handling touch swipe gestures on mobile
Used for navigating between media items in lightboxes

**Example**

```ts
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

const result = useSwipeGesture(/* params */);
```

### useTimeEntries

**Import:** `@/hooks/useTimeEntries`

- Defined in: `hooks/useTimeEntries.ts`
- Export type: named

```ts
function useTimeEntries(filters: TimeEntryFilters, pageSize: number = 25, currentPage: number = 1): { entries: import("C:/Dev/profitbuild-dash/src/types/timeEntry").TimeEntryListItem[]; statistics: import("C:/Dev/profitbuild-dash/src/types/timeEntry").TimeEntryStatistics; loading: boolean; totalCount: number; refetch: () => Promise<void>; }
```

_No inline documentation provided._

**Example**

```ts
import { useTimeEntries } from '@/hooks/useTimeEntries';

const result = useTimeEntries(/* params */);
```

### useTimeEntryActions

**Import:** `@/hooks/useTimeEntryActions`

- Defined in: `hooks/useTimeEntryActions.ts`
- Export type: named

```ts
function useTimeEntryActions({
  user,
  refreshTimeEntries,
  setSelectedIds,
  setRejectDialogOpen,
  setDeleteDialogOpen,
}: UseTimeEntryActionsProps): { handleApprove: (entryIds: string[]) => Promise<void>; handleReject: (entryIds: string[], reason: string) => Promise<void>; handleDelete: (entryIds: string[]) => Promise<void>; }
```

_No inline documentation provided._

**Example**

```ts
import { useTimeEntryActions } from '@/hooks/useTimeEntryActions';

const result = useTimeEntryActions(/* params */);
```

### useTimeEntryForm

**Import:** `@/components/time-entry-form/hooks/useTimeEntryForm`

- Defined in: `components/time-entry-form/hooks/useTimeEntryForm.ts`
- Export type: named

```ts
function useTimeEntryForm(options: UseTimeEntryFormOptions = {}): { workerId: string; setWorkerId: React.Dispatch<React.SetStateAction<string>>; projectId: string; setProjectId: React.Dispatch<React.SetStateAction<string>>; date: string; setDate: React.Dispatch<React.SetStateAction<string>>; startTime: string; setStartTime: React.Dispatch<React.SetStateAction<string>>; endTime: string; setEndTime: React.Dispatch<React.SetStateAction<string>>; lunchTaken: boolean; setLunchTaken: React.Dispatch<React.SetStateAction<boolean>>; lunchDuration: number; setLunchDuration: React.Dispatch<React.SetStateAction<number>>; manualHours: number; setManualHours: React.Dispatch<React.SetStateAction<number>>; isOvernight: boolean; adjustedEndDate: string; isPTO: boolean; grossHours: number; netHours: number; lunchHours: number; isAutoCalculated: boolean; effectiveNetHours: number; notes: string; setNotes: React.Dispatch<React.SetStateAction<string>>; getFormData: () => import("C:/Dev/profitbuild-dash/src/components/time-entry-form/hooks/useTimeEntryForm").TimeEntryFormData; }
```

_No inline documentation provided._

**Example**

```ts
import { useTimeEntryForm } from '@/components/time-entry-form/hooks/useTimeEntryForm';

const result = useTimeEntryForm(/* params */);
```

### useTimeEntrySelection

**Import:** `@/hooks/useTimeEntrySelection`

- Defined in: `hooks/useTimeEntrySelection.ts`
- Export type: named

```ts
function useTimeEntrySelection(entries: TimeEntryListItem[]): { selectedIds: string[]; setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>; handleSelectAll: (checked: boolean) => void; handleSelectOne: (id: string, checked: boolean) => void; clearSelection: () => void; }
```

_No inline documentation provided._

**Example**

```ts
import { useTimeEntrySelection } from '@/hooks/useTimeEntrySelection';

const result = useTimeEntrySelection(/* params */);
```

### useTimeEntrySorting

**Import:** `@/hooks/useTimeEntrySorting`

- Defined in: `hooks/useTimeEntrySorting.tsx`
- Export type: named

```ts
function useTimeEntrySorting(entries: TimeEntryListItem[]): { sortColumn: string; sortDirection: "asc" | "desc"; handleSort: (columnKey: string) => void; renderSortIcon: (columnKey: string) => import("C:/Dev/profitbuild-dash/node_modules/@types/react/jsx-runtime").JSX.Element; sortedEntries: import("C:/Dev/profitbuild-dash/src/types/timeEntry").TimeEntryListItem[]; }
```

_No inline documentation provided._

**Example**

```ts
import { useTimeEntrySorting } from '@/hooks/useTimeEntrySorting';

const result = useTimeEntrySorting(/* params */);
```

### useToggleMentionable

**Import:** `@/hooks/useEmployeesAudit`

- Defined in: `hooks/useEmployeesAudit.ts`
- Export type: named

```ts
function useToggleMentionable(): import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseMutationResult<void, unknown, { userId: string; canBeMentioned: boolean; }, unknown>
```

Toggle whether a user appears in the

**Example**

```ts
import { useToggleMentionable } from '@/hooks/useEmployeesAudit';

const result = useToggleMentionable(/* params */);
```

### useTrainingAssignments

**Import:** `@/hooks/useTrainingAssignments`

- Defined in: `hooks/useTrainingAssignments.ts`
- Export type: named

```ts
function useTrainingAssignments(contentId?: string): { assignments: import("C:/Dev/profitbuild-dash/src/types/training").TrainingAssignment[]; isLoading: boolean; createAssignments: (trainingContentId: string, userIds: string[], options?: { due_date?: string; priority?: number; notes?: string; }) => Promise<boolean>; deleteAssignment: (assignmentId: string) => Promise<boolean>; sendNotifications: (params: import("C:/Dev/profitbuild-dash/src/types/training").SendNotificationParams) => Promise<import("C:/Dev/profitbuild-dash/src/types/training").NotificationResult>; refresh: () => Promise<void>; }
```

_No inline documentation provided._

**Example**

```ts
import { useTrainingAssignments } from '@/hooks/useTrainingAssignments';

const result = useTrainingAssignments(/* params */);
```

### useTrainingContent

**Import:** `@/hooks/useTrainingContent`

- Defined in: `hooks/useTrainingContent.ts`
- Export type: named

```ts
function useTrainingContent(): { content: import("C:/Dev/profitbuild-dash/src/types/training").TrainingContent[]; isLoading: boolean; error: Error; fetchContent: (statusFilter?: import("C:/Dev/profitbuild-dash/src/types/training").TrainingStatus) => Promise<void>; createContent: (data: import("C:/Dev/profitbuild-dash/src/types/training").CreateTrainingContentData) => Promise<import("C:/Dev/profitbuild-dash/src/types/training").TrainingContent>; updateContent: (data: import("C:/Dev/profitbuild-dash/src/types/training").UpdateTrainingContentData) => Promise<import("C:/Dev/profitbuild-dash/src/types/training").TrainingContent>; deleteContent: (id: string) => Promise<boolean>; setContentStatus: (id: string, status: import("C:/Dev/profitbuild-dash/src/types/training").TrainingStatus) => Promise<boolean>; refresh: (statusFilter?: import("C:/Dev/profitbuild-dash/src/types/training").TrainingStatus) => Promise<void>; }
```

_No inline documentation provided._

**Example**

```ts
import { useTrainingContent } from '@/hooks/useTrainingContent';

const result = useTrainingContent(/* params */);
```

### useUnapprovedExpensesCount

**Import:** `@/hooks/useUnapprovedExpensesCount`

- Defined in: `hooks/useUnapprovedExpensesCount.ts`
- Export type: named

```ts
function useUnapprovedExpensesCount(): import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseQueryResult<number, Error>
```

_No inline documentation provided._

**Example**

```ts
import { useUnapprovedExpensesCount } from '@/hooks/useUnapprovedExpensesCount';

const result = useUnapprovedExpensesCount(/* params */);
```

### useUnreadMentions

**Import:** `@/hooks/useUnreadMentions`

- Defined in: `hooks/useUnreadMentions.ts`
- Export type: named

```ts
function useUnreadMentions(): { unreadCount: number; notifications: import("C:/Dev/profitbuild-dash/src/types/notification").UserNotification[]; isLoading: boolean; markAsRead: (notificationId: string) => Promise<void>; markAllAsRead: () => Promise<void>; }
```

_No inline documentation provided._

**Example**

```ts
import { useUnreadMentions } from '@/hooks/useUnreadMentions';

const result = useUnreadMentions(/* params */);
```

### useUpdateInternalLaborRates

**Import:** `@/hooks/useCompanySettings`

- Defined in: `hooks/useCompanySettings.ts`
- Export type: named

```ts
function useUpdateInternalLaborRates(): import("C:/Dev/profitbuild-dash/node_modules/@tanstack/react-query/build/modern/types").UseMutationResult<{ created_at: string; description: string; id: string; setting_key: string; setting_value: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json; updated_at: string; }, Error, import("C:/Dev/profitbuild-dash/src/types/companySettings").InternalLaborRates, unknown>
```

Hook to update internal labor rates (admin only)

**Example**

```ts
import { useUpdateInternalLaborRates } from '@/hooks/useCompanySettings';

const result = useUpdateInternalLaborRates(/* params */);
```

### useVarianceCalculation

**Import:** `@/hooks/useVarianceCalculation`

- Defined in: `hooks/useVarianceCalculation.ts`
- Export type: named

```ts
function useVarianceCalculation(projectId: string): UseVarianceCalculationReturn
```

_No inline documentation provided._

**Example**

```ts
import { useVarianceCalculation } from '@/hooks/useVarianceCalculation';

const result = useVarianceCalculation(/* params */);
```

### useVideoCapture

**Import:** `@/hooks/useVideoCapture`

- Defined in: `hooks/useVideoCapture.ts`
- Export type: named

```ts
function useVideoCapture(): UseVideoCaptureResult
```

Hook for capturing videos using browser's camera API
Works on all modern mobile browsers (iOS Safari, Android Chrome)
Returns Photo object with video data for compatibility

**Example**

```ts
import { useVideoCapture } from '@/hooks/useVideoCapture';

const result = useVideoCapture(/* params */);
```

## Functions

Total: 320

### addBidMediaToQueue

**Import:** `@/utils/syncQueue`

- Defined in: `utils/syncQueue.ts`
- Export type: named

```ts
function addBidMediaToQueue(file: File, metadata: {
    bidId: string;
    caption?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    altitude?: number;
    locationName?: string;
    takenAt?: string;
    deviceModel?: string;
    uploadSource?: string;
    duration?: number;
  }): Promise<string>
```

_No inline documentation provided._

**Example**

```ts
import { addBidMediaToQueue } from '@/utils/syncQueue';

const result = addBidMediaToQueue(/* args */);
```

### addMediaToQueue

**Import:** `@/utils/syncQueue`

- Defined in: `utils/syncQueue.ts`
- Export type: named

```ts
function addMediaToQueue(file: File, metadata: {
    projectId: string;
    caption?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    locationName?: string;
    altitude?: number;
    deviceModel?: string;
    takenAt?: string;
    uploadSource?: 'camera' | 'gallery' | 'web';
    duration?: number;
  }): Promise<string>
```

_No inline documentation provided._

**Example**

```ts
import { addMediaToQueue } from '@/utils/syncQueue';

const result = addMediaToQueue(/* args */);
```

### addToQueue

**Import:** `@/utils/syncQueue`

- Defined in: `utils/syncQueue.ts`
- Export type: named

```ts
function addToQueue(operation: Omit<QueuedOperation, 'id' | 'retryCount' | 'status'>): Promise<void>
```

_No inline documentation provided._

**Example**

```ts
import { addToQueue } from '@/utils/syncQueue';

const result = addToQueue(/* args */);
```

### approveEstimateSideEffects

**Import:** `@/utils/estimateApproval`

- Defined in: `utils/estimateApproval.ts`
- Export type: named

```ts
function approveEstimateSideEffects(projectId: string, totalAmount: number): Promise<void>
```

Side effects of approving an estimate that are NOT handled by DB triggers.

Covered by triggers (do NOT duplicate here):
  - Un-approving competing estimates → `sync_contract_on_estimate_status` trigger
  - Advancing project.status from 'estimating' → 'approved' → same trigger
  - `is_current_version` cleanup on siblings → `ensure_single_current_version` trigger
  - `projects.contingency_amount` sync → `update_contingency_on_estimate_change` trigger
  - Project margin recalc → `calculate_margins_on_estimate_change` trigger

NOT covered by triggers — must be written here:
  - `projects.contracted_amount` — must be set to the approved estimate's total
  - Project status advance for early stages that aren't exactly 'estimating'
    (belt-and-suspenders with the trigger; keeps parity with the pre-refactor
    behavior in EstimateStatusActions)

GOTCHA #26: the estimate row's `status='approved' AND is_current_version=true`
MUST be written atomically in a SINGLE `.update()` BEFORE calling this helper.
The contingency trigger silently no-ops if the two fields aren't set together.

**Example**

```ts
import { approveEstimateSideEffects } from '@/utils/estimateApproval';

const result = approveEstimateSideEffects(/* args */);
```

### base64ToFile

**Import:** `@/utils/syncQueue`

- Defined in: `utils/syncQueue.ts`
- Export type: named

```ts
function base64ToFile(base64: string, fileName: string, mimeType: string): Promise<File>
```

_No inline documentation provided._

**Example**

```ts
import { base64ToFile } from '@/utils/syncQueue';

const result = base64ToFile(/* args */);
```

### batchFuzzyMatchPayees

**Import:** `@/utils/fuzzyPayeeMatcher`

- Defined in: `utils/fuzzyPayeeMatcher.ts`
- Export type: named

```ts
function batchFuzzyMatchPayees(qbNames: string[], payees: PartialPayee[]): import("C:/Dev/profitbuild-dash/src/utils/fuzzyPayeeMatcher").FuzzyMatchResult[]
```

_No inline documentation provided._

**Example**

```ts
import { batchFuzzyMatchPayees } from '@/utils/fuzzyPayeeMatcher';

const result = batchFuzzyMatchPayees(/* args */);
```

### blobToBase64

**Import:** `@/utils/audioConverter`

- Defined in: `utils/audioConverter.ts`
- Export type: named

```ts
function blobToBase64(blob: Blob): Promise<string>
```

Convert blob to base64 string

**Example**

```ts
import { blobToBase64 } from '@/utils/audioConverter';

const result = blobToBase64(/* args */);
```

### buildCronExpression

**Import:** `@/utils/cronBuilder`

- Defined in: `utils/cronBuilder.ts`
- Export type: named

```ts
function buildCronExpression(config: ScheduleConfig): string
```

Convert human-readable schedule to cron expression

**Example**

```ts
import { buildCronExpression } from '@/utils/cronBuilder';

const result = buildCronExpression(/* args */);
```

### buildTimeEntryDateTimes

**Import:** `@/utils/timeEntryCalculations`

- Defined in: `utils/timeEntryCalculations.ts`
- Export type: named

```ts
function buildTimeEntryDateTimes(date: string, startTime: string, endTime: string): { startDateTime: Date; endDateTime: Date; isOvernight: boolean; }
```

Build start and end Date objects from date + HH:mm strings with overnight adjustment.
When endTime <= startTime (HH:mm comparison), end is treated as next calendar day.

**Example**

```ts
import { buildTimeEntryDateTimes } from '@/utils/timeEntryCalculations';

const result = buildTimeEntryDateTimes(/* args */);
```

### calculateEstimateAverageMarkup

**Import:** `@/utils/estimateFinancials`

- Defined in: `utils/estimateFinancials.ts`
- Export type: named

```ts
function calculateEstimateAverageMarkup(lineItems: LineItem[]): number
```

_No inline documentation provided._

**Example**

```ts
import { calculateEstimateAverageMarkup } from '@/utils/estimateFinancials';

const result = calculateEstimateAverageMarkup(/* args */);
```

### calculateEstimateFinancials

**Import:** `@/utils/estimateFinancials`

- Defined in: `utils/estimateFinancials.ts`
- Export type: named

```ts
function calculateEstimateFinancials(lineItems: LineItem[]): import("C:/Dev/profitbuild-dash/src/utils/estimateFinancials").EstimateFinancialMetrics
```

_No inline documentation provided._

**Example**

```ts
import { calculateEstimateFinancials } from '@/utils/estimateFinancials';

const result = calculateEstimateFinancials(/* args */);
```

### calculateEstimateGrossMargin

**Import:** `@/utils/estimateFinancials`

- Defined in: `utils/estimateFinancials.ts`
- Export type: named

```ts
function calculateEstimateGrossMargin(lineItems: LineItem[]): number
```

_No inline documentation provided._

**Example**

```ts
import { calculateEstimateGrossMargin } from '@/utils/estimateFinancials';

const result = calculateEstimateGrossMargin(/* args */);
```

### calculateEstimateGrossProfit

**Import:** `@/utils/estimateFinancials`

- Defined in: `utils/estimateFinancials.ts`
- Export type: named

```ts
function calculateEstimateGrossProfit(lineItems: LineItem[]): number
```

_No inline documentation provided._

**Example**

```ts
import { calculateEstimateGrossProfit } from '@/utils/estimateFinancials';

const result = calculateEstimateGrossProfit(/* args */);
```

### calculateEstimateTotalAmount

**Import:** `@/utils/estimateFinancials`

- Defined in: `utils/estimateFinancials.ts`
- Export type: named

```ts
function calculateEstimateTotalAmount(lineItems: LineItem[]): number
```

_No inline documentation provided._

**Example**

```ts
import { calculateEstimateTotalAmount } from '@/utils/estimateFinancials';

const result = calculateEstimateTotalAmount(/* args */);
```

### calculateEstimateTotalCost

**Import:** `@/utils/estimateFinancials`

- Defined in: `utils/estimateFinancials.ts`
- Export type: named

```ts
function calculateEstimateTotalCost(lineItems: LineItem[]): number
```

_No inline documentation provided._

**Example**

```ts
import { calculateEstimateTotalCost } from '@/utils/estimateFinancials';

const result = calculateEstimateTotalCost(/* args */);
```

### calculateEstimateTotalMarkup

**Import:** `@/utils/estimateFinancials`

- Defined in: `utils/estimateFinancials.ts`
- Export type: named

```ts
function calculateEstimateTotalMarkup(lineItems: LineItem[]): number
```

_No inline documentation provided._

**Example**

```ts
import { calculateEstimateTotalMarkup } from '@/utils/estimateFinancials';

const result = calculateEstimateTotalMarkup(/* args */);
```

### calculateImportedItemCushion

**Import:** `@/types/importTypes`

- Defined in: `types/importTypes.ts`
- Export type: named

```ts
function calculateImportedItemCushion(item: EnrichedLineItem): number
```

_No inline documentation provided._

**Example**

```ts
import { calculateImportedItemCushion } from '@/types/importTypes';

const result = calculateImportedItemCushion(/* args */);
```

### calculateLaborMetrics

**Import:** `@/utils/laborCalculations`

- Defined in: `utils/laborCalculations.ts`
- Export type: named

```ts
function calculateLaborMetrics(input: LaborCalculationInput): import("C:/Dev/profitbuild-dash/src/utils/laborCalculations").LaborCalculationResult
```

Calculate all labor-related financial metrics

**Example**

```ts
import { calculateLaborMetrics } from '@/utils/laborCalculations';

const result = calculateLaborMetrics(/* args */);
```

### calculateMatchConfidence

**Import:** `@/utils/expenseAllocation`

- Defined in: `utils/expenseAllocation.ts`
- Export type: named

```ts
function calculateMatchConfidence(expense: EnhancedExpense, lineItems: LineItemForMatching[]): number
```

_No inline documentation provided._

**Example**

```ts
import { calculateMatchConfidence } from '@/utils/expenseAllocation';

const result = calculateMatchConfidence(/* args */);
```

### calculateMatchScore

**Import:** `@/utils/receiptLinking`

- Defined in: `utils/receiptLinking.ts`
- Export type: named

```ts
function calculateMatchScore(receipt: ReceiptForLinking, expense: {
    amount: number;
    expense_date: string;
    payee_id?: string | null;
    project_id?: string | null;
  }): { score: number; reasons: string[]; }
```

Calculate a soft match score for receipt suggestions
Returns 0-100 score and reasons for the match
This is SUGGESTIVE ONLY - user makes final decision

**Example**

```ts
import { calculateMatchScore } from '@/utils/receiptLinking';

const result = calculateMatchScore(/* args */);
```

### calculateMinimumAcceptableCost

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function calculateMinimumAcceptableCost(estimatePrice: number, targetMarginPercent: number): number
```

_No inline documentation provided._

**Example**

```ts
import { calculateMinimumAcceptableCost } from '@/utils/quoteFinancials';

const result = calculateMinimumAcceptableCost(/* args */);
```

### calculateProfitAnalytics

**Import:** `@/utils/profitCalculations`

- Defined in: `utils/profitCalculations.ts`
- Export type: named

```ts
function calculateProfitAnalytics(estimates: Estimate[], quotes: Quote[], expenses: Expense[], projects?: Project[]): import("C:/Dev/profitbuild-dash/src/types/profit").ProfitAnalyticsSummary
```

_No inline documentation provided._

**Example**

```ts
import { calculateProfitAnalytics } from '@/utils/profitCalculations';

const result = calculateProfitAnalytics(/* args */);
```

### calculateProfitTrends

**Import:** `@/utils/profitCalculations`

- Defined in: `utils/profitCalculations.ts`
- Export type: named

```ts
function calculateProfitTrends(projectProfits: ProjectProfitData[]): import("C:/Dev/profitbuild-dash/src/types/profit").ProfitTrend[]
```

_No inline documentation provided._

**Example**

```ts
import { calculateProfitTrends } from '@/utils/profitCalculations';

const result = calculateProfitTrends(/* args */);
```

### calculateProjectExpenses

**Import:** `@/utils/expenseSplits`

- Defined in: `utils/expenseSplits.ts`
- Export type: named

```ts
function calculateProjectExpenses(projectId: string, expenses: Expense[]): Promise<number>
```

Calculate the actual expense amount for a project, handling splits correctly
- If expense is split (project_id = SYS-000), only count split amounts for this project
- If expense is not split, only count if project_id matches

**Example**

```ts
import { calculateProjectExpenses } from '@/utils/expenseSplits';

const result = calculateProjectExpenses(/* args */);
```

### calculateProjectProfit

**Import:** `@/utils/profitCalculations`

- Defined in: `utils/profitCalculations.ts`
- Export type: named

```ts
function calculateProjectProfit(estimate: Estimate, quotes: Quote[], expenses: Expense[], storedProjectData?: {
    contracted_amount?: number | null;
    actual_margin?: number | null;
    adjusted_est_margin?: number | null;
    margin_percentage?: number | null;
    total_accepted_quotes?: number | null;
  }): import("C:/Dev/profitbuild-dash/src/types/profit").ProjectProfitData
```

_No inline documentation provided._

**Example**

```ts
import { calculateProjectProfit } from '@/utils/profitCalculations';

const result = calculateProjectProfit(/* args */);
```

### calculateProjectProfitAsync

**Import:** `@/utils/profitCalculations`

- Defined in: `utils/profitCalculations.ts`
- Export type: named

```ts
function calculateProjectProfitAsync(estimate: Estimate, quotes: Quote[], expenses: Expense[], storedProjectData?: {
    contracted_amount?: number | null;
    actual_margin?: number | null;
    adjusted_est_margin?: number | null;
    margin_percentage?: number | null;
    total_accepted_quotes?: number | null;
  }): Promise<import("C:/Dev/profitbuild-dash/src/types/profit").ProjectProfitData>
```

Async version of calculateProjectProfit that correctly handles split expenses
Use this version when you need accurate expense calculations

**Example**

```ts
import { calculateProjectProfitAsync } from '@/utils/profitCalculations';

const result = calculateProjectProfitAsync(/* args */);
```

### calculateProjectRevenue

**Import:** `@/utils/revenueSplits`

- Defined in: `utils/revenueSplits.ts`
- Export type: named

```ts
function calculateProjectRevenue(projectId: string, revenues: ProjectRevenue[]): Promise<number>
```

Calculate the actual revenue amount for a project, handling splits correctly
- If revenue is split (project_id = SYS-000), only count split amounts for this project
- If revenue is not split, only count if project_id matches

**Example**

```ts
import { calculateProjectRevenue } from '@/utils/revenueSplits';

const result = calculateProjectRevenue(/* args */);
```

### calculateQuoteAverageMarkup

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function calculateQuoteAverageMarkup(lineItems: QuoteLineItem[]): number
```

_No inline documentation provided._

**Example**

```ts
import { calculateQuoteAverageMarkup } from '@/utils/quoteFinancials';

const result = calculateQuoteAverageMarkup(/* args */);
```

### calculateQuoteFinancials

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function calculateQuoteFinancials(lineItems: QuoteLineItem[]): import("C:/Dev/profitbuild-dash/src/utils/quoteFinancials").QuoteFinancialMetrics
```

_No inline documentation provided._

**Example**

```ts
import { calculateQuoteFinancials } from '@/utils/quoteFinancials';

const result = calculateQuoteFinancials(/* args */);
```

### calculateQuoteGrossMargin

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function calculateQuoteGrossMargin(lineItems: QuoteLineItem[]): number
```

_No inline documentation provided._

**Example**

```ts
import { calculateQuoteGrossMargin } from '@/utils/quoteFinancials';

const result = calculateQuoteGrossMargin(/* args */);
```

### calculateQuoteGrossProfit

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function calculateQuoteGrossProfit(lineItems: QuoteLineItem[]): number
```

_No inline documentation provided._

**Example**

```ts
import { calculateQuoteGrossProfit } from '@/utils/quoteFinancials';

const result = calculateQuoteGrossProfit(/* args */);
```

### calculateQuoteProfitMargin

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function calculateQuoteProfitMargin(totalProfit: number, totalRevenue: number): number
```

_No inline documentation provided._

**Example**

```ts
import { calculateQuoteProfitMargin } from '@/utils/quoteFinancials';

const result = calculateQuoteProfitMargin(/* args */);
```

### calculateQuoteProfitPerUnit

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function calculateQuoteProfitPerUnit(estimatePrice: number, vendorCost: number): number
```

_No inline documentation provided._

**Example**

```ts
import { calculateQuoteProfitPerUnit } from '@/utils/quoteFinancials';

const result = calculateQuoteProfitPerUnit(/* args */);
```

### calculateQuoteTotalAmount

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function calculateQuoteTotalAmount(lineItems: QuoteLineItem[]): number
```

_No inline documentation provided._

**Example**

```ts
import { calculateQuoteTotalAmount } from '@/utils/quoteFinancials';

const result = calculateQuoteTotalAmount(/* args */);
```

### calculateQuoteTotalCost

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function calculateQuoteTotalCost(lineItems: QuoteLineItem[]): number
```

_No inline documentation provided._

**Example**

```ts
import { calculateQuoteTotalCost } from '@/utils/quoteFinancials';

const result = calculateQuoteTotalCost(/* args */);
```

### calculateQuoteTotalMarkup

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function calculateQuoteTotalMarkup(lineItems: QuoteLineItem[]): number
```

_No inline documentation provided._

**Example**

```ts
import { calculateQuoteTotalMarkup } from '@/utils/quoteFinancials';

const result = calculateQuoteTotalMarkup(/* args */);
```

### calculateQuoteTotalProfit

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function calculateQuoteTotalProfit(quoteLineItems: QuoteLineItem[], estimateLineItems: LineItem[]): number
```

_No inline documentation provided._

**Example**

```ts
import { calculateQuoteTotalProfit } from '@/utils/quoteFinancials';

const result = calculateQuoteTotalProfit(/* args */);
```

### calculateScheduleStatus

**Import:** `@/utils/projectDashboard`

- Defined in: `utils/projectDashboard.ts`
- Export type: named

```ts
function calculateScheduleStatus(startDate?: Date | string | null, endDate?: Date | string | null, projectStatus?: string | null): import("C:/Dev/profitbuild-dash/src/utils/projectDashboard").ScheduleStatus
```

_No inline documentation provided._

**Example**

```ts
import { calculateScheduleStatus } from '@/utils/projectDashboard';

const result = calculateScheduleStatus(/* args */);
```

### calculateSplitPercentage

**Import:** `@/utils/expenseSplits`

- Defined in: `utils/expenseSplits.ts`
- Export type: named

```ts
function calculateSplitPercentage(splitAmount: number, totalAmount: number): number
```

Calculate split percentage for display

**Example**

```ts
import { calculateSplitPercentage } from '@/utils/expenseSplits';

const result = calculateSplitPercentage(/* args */);
```

### calculateSplitPercentage

**Import:** `@/utils/revenueSplits`

- Defined in: `utils/revenueSplits.ts`
- Export type: named

```ts
function calculateSplitPercentage(splitAmount: number, totalAmount: number): number
```

Calculate split percentage for display

**Example**

```ts
import { calculateSplitPercentage } from '@/utils/revenueSplits';

const result = calculateSplitPercentage(/* args */);
```

### calculateTimeEntryAmount

**Import:** `@/utils/timeEntryCalculations`

- Defined in: `utils/timeEntryCalculations.ts`
- Export type: named

```ts
function calculateTimeEntryAmount(netHours: number, hourlyRate: number): number
```

Calculate the amount (cost) for a time entry

**Example**

```ts
import { calculateTimeEntryAmount } from '@/utils/timeEntryCalculations';

const result = calculateTimeEntryAmount(/* args */);
```

### calculateTimeEntryHours

**Import:** `@/utils/timeEntryCalculations`

- Defined in: `utils/timeEntryCalculations.ts`
- Export type: named

```ts
function calculateTimeEntryHours(startTime: Date, endTime: Date, lunchTaken: boolean = false, lunchDurationMinutes: number = 30): import("C:/Dev/profitbuild-dash/src/utils/timeEntryCalculations").TimeEntryHours
```

Calculate hours breakdown for a time entry

**Example**

```ts
import { calculateTimeEntryHours } from '@/utils/timeEntryCalculations';

const result = calculateTimeEntryHours(/* args */);
```

### calculateTotalExpenses

**Import:** `@/utils/expenseSplits`

- Defined in: `utils/expenseSplits.ts`
- Export type: named

```ts
function calculateTotalExpenses(expenses: Expense[]): Promise<{ total: number; splitAdjustedTotal: number; }>
```

Calculate total expenses across all projects, handling splits correctly

**Example**

```ts
import { calculateTotalExpenses } from '@/utils/expenseSplits';

const result = calculateTotalExpenses(/* args */);
```

### calculateTotalLaborCushion

**Import:** `@/utils/laborCalculations`

- Defined in: `utils/laborCalculations.ts`
- Export type: named

```ts
function calculateTotalLaborCushion(lineItems: Array<{
    category: string;
    laborHours?: number | null;
    billingRatePerHour?: number | null;
    actualCostRatePerHour?: number | null;
  }>): number
```

Calculate labor cushion for a set of line items

**Example**

```ts
import { calculateTotalLaborCushion } from '@/utils/laborCalculations';

const result = calculateTotalLaborCushion(/* args */);
```

### calculateTotalRevenues

**Import:** `@/utils/revenueSplits`

- Defined in: `utils/revenueSplits.ts`
- Export type: named

```ts
function calculateTotalRevenues(revenues: ProjectRevenue[]): Promise<{ total: number; splitAdjustedTotal: number; }>
```

Calculate total revenues across all projects, handling splits correctly

**Example**

```ts
import { calculateTotalRevenues } from '@/utils/revenueSplits';

const result = calculateTotalRevenues(/* args */);
```

### canCorrelateExpense

**Import:** `@/utils/expenseValidation`

- Defined in: `utils/expenseValidation.ts`
- Export type: named

```ts
function canCorrelateExpense(expense: Pick<Expense, 'is_split' | 'project_id' | 'project_number'> & { category?: ProjectCategory }): { isValid: boolean; error?: string; }
```

Validates whether an expense can be directly correlated to line items
Split parent expenses (with is_split=true or system category) cannot be correlated
Overhead projects (e.g., 001-GAS, 002-GA) cannot be correlated
Only individual split records or regular construction expenses can be correlated

**Example**

```ts
import { canCorrelateExpense } from '@/utils/expenseValidation';

const result = canCorrelateExpense(/* args */);
```

### canUseInstallPrompt

**Import:** `@/utils/platform`

- Defined in: `utils/platform.ts`
- Export type: named

```ts
function canUseInstallPrompt(): boolean
```

_No inline documentation provided._

**Example**

```ts
import { canUseInstallPrompt } from '@/utils/platform';

const result = canUseInstallPrompt(/* args */);
```

### categorizeExpense

**Import:** `@/utils/importCore`

- Defined in: `utils/importCore.ts`
- Export type: named

```ts
function categorizeExpense(description: string, accountPath?: string, dbMappings?: QuickBooksAccountMapping[]): import("C:/Dev/profitbuild-dash/src/types/expense").ExpenseCategory
```

_No inline documentation provided._

**Example**

```ts
import { categorizeExpense } from '@/utils/importCore';

const result = categorizeExpense(/* args */);
```

### checkAudioRecordingSupport

**Import:** `@/utils/browserCompatibility`

- Defined in: `utils/browserCompatibility.ts`
- Export type: named

```ts
function checkAudioRecordingSupport(): { supported: boolean; issues: string[]; warnings: string[]; recommendedAction: string; environment: { isIframe: boolean; isIOSPWA: boolean; isSecure: boolean; hasMediaRecorder: boolean; hasGetUserMedia: boolean; }; }
```

_No inline documentation provided._

**Example**

```ts
import { checkAudioRecordingSupport } from '@/utils/browserCompatibility';

const result = checkAudioRecordingSupport(/* args */);
```

### checkStaleTimer

**Import:** `@/utils/timeEntryValidation`

- Defined in: `utils/timeEntryValidation.ts`
- Export type: named

```ts
function checkStaleTimer(startTime: Date): { isStale: boolean; hoursElapsed: number; shouldAutoClose: boolean; message?: string; }
```

_No inline documentation provided._

**Example**

```ts
import { checkStaleTimer } from '@/utils/timeEntryValidation';

const result = checkStaleTimer(/* args */);
```

### checkTimeOverlap

**Import:** `@/utils/timeEntryValidation`

- Defined in: `utils/timeEntryValidation.ts`
- Export type: named

```ts
function checkTimeOverlap(payeeId: string, date: string, startTime: Date, endTime: Date, excludeId?: string): Promise<import("C:/Dev/profitbuild-dash/src/utils/timeEntryValidation").OverlapCheckResult>
```

_No inline documentation provided._

**Example**

```ts
import { checkTimeOverlap } from '@/utils/timeEntryValidation';

const result = checkTimeOverlap(/* args */);
```

### classifyPayees

**Import:** `@/utils/payeeImportMatcher`

- Defined in: `utils/payeeImportMatcher.ts`
- Export type: named

```ts
function classifyPayees(uniquePayeesFromCSV: PayeeImportData[], existingPayees: PartialPayee[], inFileMergeMetadata: { canonicalIndex: number; mergedNames: string[] }[] = []): import("C:/Dev/profitbuild-dash/src/utils/payeeImportMatcher").ClassifiedPayee[]
```

Classify each unique CSV payee against existing payees using fuzzyMatchPayee.
bestMatch and confidence >= 75% -> existing; matches in [40%, 75%) -> review; else -> new.

**Example**

```ts
import { classifyPayees } from '@/utils/payeeImportMatcher';

const result = classifyPayees(/* args */);
```

### clearQueue

**Import:** `@/utils/syncQueue`

- Defined in: `utils/syncQueue.ts`
- Export type: named

```ts
function clearQueue(): Promise<void>
```

_No inline documentation provided._

**Example**

```ts
import { clearQueue } from '@/utils/syncQueue';

const result = clearQueue(/* args */);
```

### cn

**Import:** `@/lib/utils`

- Defined in: `lib/utils.ts`
- Export type: named

```ts
function cn(...inputs: ClassValue[]): string
```

_No inline documentation provided._

**Example**

```ts
import { cn } from '@/lib/utils';

const result = cn(/* args */);
```

### compareQuoteToEstimate

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function compareQuoteToEstimate(quoteLineItems: QuoteLineItem[], estimateLineItems: LineItem[]): { [category: string]: import("C:/Dev/profitbuild-dash/src/utils/quoteFinancials").CategoryCostComparison; }
```

_No inline documentation provided._

**Example**

```ts
import { compareQuoteToEstimate } from '@/utils/quoteFinancials';

const result = compareQuoteToEstimate(/* args */);
```

### compressImage

**Import:** `@/utils/imageCompression`

- Defined in: `utils/imageCompression.ts`
- Export type: named

```ts
function compressImage(file: File, options: CompressionOptions = {}): Promise<File>
```

Compress an image file using Canvas API
Reduces file size while maintaining acceptable quality for construction site photos

**Example**

```ts
import { compressImage } from '@/utils/imageCompression';

const result = compressImage(/* args */);
```

### convertMovToM4a

**Import:** `@/utils/movToM4a`

- Defined in: `utils/movToM4a.ts`
- Export type: named

```ts
function convertMovToM4a(videoBlob: Blob, onProgress?: (progress: number) => void): Promise<ConversionResult>
```

Convert iOS QuickTime MOV to M4A audio for Whisper transcription

**Example**

```ts
import { convertMovToM4a } from '@/utils/movToM4a';

const result = convertMovToM4a(/* args */);
```

### convertToEstimateLineItems

**Import:** `@/services/estimateImportService`

- Defined in: `services/estimateImportService.ts`
- Export type: named

```ts
function convertToEstimateLineItems(items: EnrichedLineItem[]): any[]
```

_No inline documentation provided._

**Example**

```ts
import { convertToEstimateLineItems } from '@/services/estimateImportService';

const result = convertToEstimateLineItems(/* args */);
```

### convertToWav

**Import:** `@/utils/audioConverter`

- Defined in: `utils/audioConverter.ts`
- Export type: named

```ts
function convertToWav(audioBlob: Blob): Promise<Blob>
```

Audio Converter Utility
Converts recorded audio to WAV format for universal transcription API support

Convert any audio blob to WAV format using Web Audio API

**Example**

```ts
import { convertToWav } from '@/utils/audioConverter';

const result = convertToWav(/* args */);
```

### createExpenseKey

**Import:** `@/utils/importCore`

- Defined in: `utils/importCore.ts`
- Export type: named

```ts
function createExpenseKey(date: string | Date, amount: number, name: string, accountFullName?: string): string
```

_No inline documentation provided._

**Example**

```ts
import { createExpenseKey } from '@/utils/importCore';

const result = createExpenseKey(/* args */);
```

### createExpenseSplits

**Import:** `@/utils/expenseSplits`

- Defined in: `utils/expenseSplits.ts`
- Export type: named

```ts
function createExpenseSplits(expenseId: string, splits: CreateSplitInput[]): Promise<{ success: boolean; error?: string; }>
```

Create splits for an expense across multiple projects
Validates that split totals match the expense amount

**Example**

```ts
import { createExpenseSplits } from '@/utils/expenseSplits';

const result = createExpenseSplits(/* args */);
```

### createLaborLineItemDefaults

**Import:** `@/utils/laborCalculations`

- Defined in: `utils/laborCalculations.ts`
- Export type: named

```ts
function createLaborLineItemDefaults(laborRates: InternalLaborRates, laborHours: number, markupPercent: number = 25): { laborHours: number; billingRatePerHour: number; actualCostRatePerHour: number; costPerUnit: number; pricePerUnit: number; quantity: number; unit: string; }
```

Auto-populate labor fields from company settings

IMPORTANT: costPerUnit uses billing rate (not actual cost) because the billing rate
includes the "labor cushion" - the hidden profit opportunity built into the cost structure.
This way, the cushion is baked into the "Total Estimated Cost" shown to clients.

**Example**

```ts
import { createLaborLineItemDefaults } from '@/utils/laborCalculations';

const result = createLaborLineItemDefaults(/* args */);
```

### createPayeeFromTransaction

**Import:** `@/utils/enhancedTransactionImporter`

- Defined in: `utils/enhancedTransactionImporter.ts`
- Export type: named

```ts
function createPayeeFromTransaction(qbName: string, accountPath?: string): Promise<string>
```

_No inline documentation provided._

**Example**

```ts
import { createPayeeFromTransaction } from '@/utils/enhancedTransactionImporter';

const result = createPayeeFromTransaction(/* args */);
```

### createRevenueKey

**Import:** `@/utils/importCore`

- Defined in: `utils/importCore.ts`
- Export type: named

```ts
function createRevenueKey(amount: number, date: string | Date, invoiceNumber: string, name: string): string
```

_No inline documentation provided._

**Example**

```ts
import { createRevenueKey } from '@/utils/importCore';

const result = createRevenueKey(/* args */);
```

### createRevenueSplits

**Import:** `@/utils/revenueSplits`

- Defined in: `utils/revenueSplits.ts`
- Export type: named

```ts
function createRevenueSplits(revenueId: string, splits: CreateRevenueSplitInput[]): Promise<import("C:/Dev/profitbuild-dash/src/types/revenue").RevenueSplitResult>
```

Create splits for a revenue record
This will:
1. Get SYS-000 project ID
2. Update parent revenue to point to SYS-000 and set is_split = true
3. Create split records for each project allocation

**Example**

```ts
import { createRevenueSplits } from '@/utils/revenueSplits';

const result = createRevenueSplits(/* args */);
```

### dedupePayeesInFile

**Import:** `@/utils/payeeCsvParser`

- Defined in: `utils/payeeCsvParser.ts`
- Export type: named

```ts
function dedupePayeesInFile(payees: PayeeImportData[]): import("C:/Dev/profitbuild-dash/src/utils/payeeCsvParser").DedupePayeesResult
```

Dedupe payees within the CSV by normalized name. Keeps one canonical row per name (first occurrence), optionally merging non-empty email/phone/address from others.

**Example**

```ts
import { dedupePayeesInFile } from '@/utils/payeeCsvParser';

const result = dedupePayeesInFile(/* args */);
```

### deleteBidMedia

**Import:** `@/utils/bidMedia`

- Defined in: `utils/bidMedia.ts`
- Export type: named

```ts
function deleteBidMedia(mediaId: string): Promise<{ success: boolean; error: Error; }>
```

Delete bid media

**Example**

```ts
import { deleteBidMedia } from '@/utils/bidMedia';

const result = deleteBidMedia(/* args */);
```

### deleteExpenseSplits

**Import:** `@/utils/expenseSplits`

- Defined in: `utils/expenseSplits.ts`
- Export type: named

```ts
function deleteExpenseSplits(expenseId: string): Promise<{ success: boolean; error?: string; }>
```

Delete all splits for an expense
This converts the expense back to a single-project expense
Reverts parent expense to first split's project (or 000-UNASSIGNED if no splits found)

**Example**

```ts
import { deleteExpenseSplits } from '@/utils/expenseSplits';

const result = deleteExpenseSplits(/* args */);
```

### deleteProjectMedia

**Import:** `@/utils/projectMedia`

- Defined in: `utils/projectMedia.ts`
- Export type: named

```ts
function deleteProjectMedia(mediaId: string): Promise<{ success: boolean; error: Error; }>
```

Delete media file from storage and database

**Example**

```ts
import { deleteProjectMedia } from '@/utils/projectMedia';

const result = deleteProjectMedia(/* args */);
```

### deleteRevenueSplits

**Import:** `@/utils/revenueSplits`

- Defined in: `utils/revenueSplits.ts`
- Export type: named

```ts
function deleteRevenueSplits(revenueId: string): Promise<import("C:/Dev/profitbuild-dash/src/types/revenue").RevenueSplitResult>
```

Delete all splits for a revenue and revert to single-project assignment
Reverts parent revenue to first split's project (or 000-UNASSIGNED if no splits)

**Example**

```ts
import { deleteRevenueSplits } from '@/utils/revenueSplits';

const result = deleteRevenueSplits(/* args */);
```

### deleteTrainingFile

**Import:** `@/utils/trainingStorage`

- Defined in: `utils/trainingStorage.ts`
- Export type: named

```ts
function deleteTrainingFile(path: string): Promise<boolean>
```

Delete a training content file from storage

**Example**

```ts
import { deleteTrainingFile } from '@/utils/trainingStorage';

const result = deleteTrainingFile(/* args */);
```

### detectClientType

**Import:** `@/utils/clientCsvParser`

- Defined in: `utils/clientCsvParser.ts`
- Export type: named

```ts
function detectClientType(clientName: string, contactPerson?: string): import("C:/Dev/profitbuild-dash/src/types/client").ClientType
```

_No inline documentation provided._

**Example**

```ts
import { detectClientType } from '@/utils/clientCsvParser';

const result = detectClientType(/* args */);
```

### detectCostDecreaseIssue

**Import:** `@/utils/marginValidation`

- Defined in: `utils/marginValidation.ts`
- Export type: named

```ts
function detectCostDecreaseIssue(adjustedCosts: number, originalCosts: number): string
```

Validate that adjusted costs haven't decreased inappropriately

**Example**

```ts
import { detectCostDecreaseIssue } from '@/utils/marginValidation';

const result = detectCostDecreaseIssue(/* args */);
```

### detectCostExceedsContractIssue

**Import:** `@/utils/marginValidation`

- Defined in: `utils/marginValidation.ts`
- Export type: named

```ts
function detectCostExceedsContractIssue(projectedCosts: number, contractValue: number): string
```

Validate that projected costs don't exceed contract value unreasonably

**Example**

```ts
import { detectCostExceedsContractIssue } from '@/utils/marginValidation';

const result = detectCostExceedsContractIssue(/* args */);
```

### detectDateFormat

**Import:** `@/utils/dateUtils`

- Defined in: `utils/dateUtils.ts`
- Export type: named

```ts
function detectDateFormat(dateString: string | null | undefined): "M/D/YYYY" | "YYYY-MM-DD" | "MM-DD-YYYY" | "DD-MM-YYYY" | "unknown"
```

_No inline documentation provided._

**Example**

```ts
import { detectDateFormat } from '@/utils/dateUtils';

const result = detectDateFormat(/* args */);
```

### detectFileType

**Import:** `@/utils/documentFileType`

- Defined in: `utils/documentFileType.ts`
- Export type: named

```ts
function detectFileType(mimeType?: string | null, fileUrl?: string | null, fileName?: string | null): import("C:/Dev/profitbuild-dash/src/utils/documentFileType").PreviewableFileType
```

_No inline documentation provided._

**Example**

```ts
import { detectFileType } from '@/utils/documentFileType';

const result = detectFileType(/* args */);
```

### detectOfficeSubtype

**Import:** `@/utils/documentFileType`

- Defined in: `utils/documentFileType.ts`
- Export type: named

```ts
function detectOfficeSubtype(mimeType?: string | null, fileUrl?: string | null, fileName?: string | null): "word" | "excel" | "powerpoint"
```

_No inline documentation provided._

**Example**

```ts
import { detectOfficeSubtype } from '@/utils/documentFileType';

const result = detectOfficeSubtype(/* args */);
```

### detectPayeeTypeFromAccount

**Import:** `@/utils/importCore`

- Defined in: `utils/importCore.ts`
- Export type: named

```ts
function detectPayeeTypeFromAccount(accountPath?: string): import("C:/Dev/profitbuild-dash/src/types/payee").PayeeType
```

_No inline documentation provided._

**Example**

```ts
import { detectPayeeTypeFromAccount } from '@/utils/importCore';

const result = detectPayeeTypeFromAccount(/* args */);
```

### detectQuotePriceCostIssue

**Import:** `@/utils/marginValidation`

- Defined in: `utils/marginValidation.ts`
- Export type: named

```ts
function detectQuotePriceCostIssue(quoteLineItems: Array<{ total_cost: number | null; total: number | null }>): string
```

Margin validation and warning utilities

These helpers detect common data quality issues in project financial data,
such as costs that are suspiciously close to sell prices (indicating price/cost confusion).

Check if quote line item costs look like they might be sell prices instead of costs

**Example**

```ts
import { detectQuotePriceCostIssue } from '@/utils/marginValidation';

const result = detectQuotePriceCostIssue(/* args */);
```

### detectTableRegion

**Import:** `@/lib/budgetSheetParser`

- Defined in: `lib/budgetSheetParser.ts`
- Export type: named

```ts
function detectTableRegion(grid: Grid, headerRowIndex: number, columns: BudgetColumns): TableRegion
```

_No inline documentation provided._

**Example**

```ts
import { detectTableRegion } from '@/lib/budgetSheetParser';

const result = detectTableRegion(/* args */);
```

### dismissCaptionPrompts

**Import:** `@/utils/userPreferences`

- Defined in: `utils/userPreferences.ts`
- Export type: named

```ts
function dismissCaptionPrompts(): Promise<void>
```

_No inline documentation provided._

**Example**

```ts
import { dismissCaptionPrompts } from '@/utils/userPreferences';

const result = dismissCaptionPrompts(/* args */);
```

### DocumentLeadingIcon

**Import:** `@/utils/documentFileType`

- Defined in: `utils/documentFileType.ts`
- Export type: named

```ts
function DocumentLeadingIcon({
  documentType = 'other',
  thumbnailUrl,
  mimeType,
  fileUrl,
  size = 40,
}: DocumentLeadingProps): React.ReactElement<any, string | React.JSXElementConstructor<any>>
```

_No inline documentation provided._

**Example**

```ts
import { DocumentLeadingIcon } from '@/utils/documentFileType';

const result = DocumentLeadingIcon(/* args */);
```

### dollarAmountToLaborHours

**Import:** `@/utils/laborCalculations`

- Defined in: `utils/laborCalculations.ts`
- Export type: named

```ts
function dollarAmountToLaborHours(dollarAmount: number, billingRatePerHour: number): number
```

Convert a dollar amount at billing rate to labor hours

**Example**

```ts
import { dollarAmountToLaborHours } from '@/utils/laborCalculations';

const result = dollarAmountToLaborHours(/* args */);
```

### downloadBlob

**Import:** `@/utils/reportExporter`

- Defined in: `utils/reportExporter.ts`
- Export type: named

```ts
function downloadBlob(blob: Blob, filename: string): void
```

_No inline documentation provided._

**Example**

```ts
import { downloadBlob } from '@/utils/reportExporter';

const result = downloadBlob(/* args */);
```

### downloadReceiptsAsZip

**Import:** `@/utils/receiptDownloadUtils`

- Defined in: `utils/receiptDownloadUtils.ts`
- Export type: named

```ts
function downloadReceiptsAsZip(receipts: ReceiptDownloadData[], zipFilename: string): Promise<void>
```

_No inline documentation provided._

**Example**

```ts
import { downloadReceiptsAsZip } from '@/utils/receiptDownloadUtils';

const result = downloadReceiptsAsZip(/* args */);
```

### downloadSingleReceipt

**Import:** `@/utils/receiptDownloadUtils`

- Defined in: `utils/receiptDownloadUtils.ts`
- Export type: named

```ts
function downloadSingleReceipt(url: string, filename: string): Promise<void>
```

_No inline documentation provided._

**Example**

```ts
import { downloadSingleReceipt } from '@/utils/receiptDownloadUtils';

const result = downloadSingleReceipt(/* args */);
```

### downloadTrainingFileBlob

**Import:** `@/utils/trainingStorage`

- Defined in: `utils/trainingStorage.ts`
- Export type: named

```ts
function downloadTrainingFileBlob(path: string | null): Promise<Blob>
```

Download a training file as a Blob (bypasses CORS issues)

**Example**

```ts
import { downloadTrainingFileBlob } from '@/utils/trainingStorage';

const result = downloadTrainingFileBlob(/* args */);
```

### estimatePDFSize

**Import:** `@/utils/pdfHelpers`

- Defined in: `utils/pdfHelpers.ts`
- Export type: named

```ts
function estimatePDFSize(itemCount: number): string
```

_No inline documentation provided._

**Example**

```ts
import { estimatePDFSize } from '@/utils/pdfHelpers';

const result = estimatePDFSize(/* args */);
```

### estimateVideoSize

**Import:** `@/utils/videoUtils`

- Defined in: `utils/videoUtils.ts`
- Export type: named

```ts
function estimateVideoSize(durationSeconds: number): number
```

Estimate video file size based on duration

**Example**

```ts
import { estimateVideoSize } from '@/utils/videoUtils';

const result = estimateVideoSize(/* args */);
```

### evaluateMetric

**Import:** `@/lib/kpi-definitions/business-benchmarks`

- Defined in: `lib/kpi-definitions/business-benchmarks.ts`
- Export type: named

```ts
function evaluateMetric(metricId: string, value: number): { status: "unknown" | "critical" | "healthy" | "warning"; message: string; }
```

_No inline documentation provided._

**Example**

```ts
import { evaluateMetric } from '@/lib/kpi-definitions/business-benchmarks';

const result = evaluateMetric(/* args */);
```

### expenseHasSplits

**Import:** `@/utils/expenseSplits`

- Defined in: `utils/expenseSplits.ts`
- Export type: named

```ts
function expenseHasSplits(expenseId: string): Promise<boolean>
```

Check if an expense has splits

**Example**

```ts
import { expenseHasSplits } from '@/utils/expenseSplits';

const result = expenseHasSplits(/* args */);
```

### exportAllProjectsSchedule

**Import:** `@/utils/scheduleExport`

- Defined in: `utils/scheduleExport.ts`
- Export type: named

```ts
function exportAllProjectsSchedule(format: 'csv' | 'daily-activity' | 'ms-project'): Promise<{ success: boolean; projectCount: number; taskCount: number; }>
```

_No inline documentation provided._

**Example**

```ts
import { exportAllProjectsSchedule } from '@/utils/scheduleExport';

const result = exportAllProjectsSchedule(/* args */);
```

### exportGanttToPDF

**Import:** `@/utils/ganttPdfExport`

- Defined in: `utils/ganttPdfExport.ts`
- Export type: named

```ts
function exportGanttToPDF(options: GanttPdfExportOptions): Promise<void | Blob>
```

Export Gantt chart to PDF - drawn from scratch on canvas
Downloads the PDF file directly

**Example**

```ts
import { exportGanttToPDF } from '@/utils/ganttPdfExport';

const result = exportGanttToPDF(/* args */);
```

### exportReceiptsToCSV

**Import:** `@/utils/receiptExport`

- Defined in: `utils/receiptExport.ts`
- Export type: named

```ts
function exportReceiptsToCSV(receipts: ReceiptForExport[]): void
```

_No inline documentation provided._

**Example**

```ts
import { exportReceiptsToCSV } from '@/utils/receiptExport';

const result = exportReceiptsToCSV(/* args */);
```

### exportScheduleByDay

**Import:** `@/utils/scheduleExport`

- Defined in: `utils/scheduleExport.ts`
- Export type: named

```ts
function exportScheduleByDay(tasks: ScheduleTask[], projectName: string): void
```

_No inline documentation provided._

**Example**

```ts
import { exportScheduleByDay } from '@/utils/scheduleExport';

const result = exportScheduleByDay(/* args */);
```

### exportScheduleToCSV

**Import:** `@/utils/scheduleExport`

- Defined in: `utils/scheduleExport.ts`
- Export type: named

```ts
function exportScheduleToCSV(tasks: ScheduleTask[], projectName: string, options: ScheduleExportOptions): void
```

_No inline documentation provided._

**Example**

```ts
import { exportScheduleToCSV } from '@/utils/scheduleExport';

const result = exportScheduleToCSV(/* args */);
```

### exportScheduleToMSProject

**Import:** `@/utils/scheduleExport`

- Defined in: `utils/scheduleExport.ts`
- Export type: named

```ts
function exportScheduleToMSProject(tasks: ScheduleTask[], projectName: string): void
```

_No inline documentation provided._

**Example**

```ts
import { exportScheduleToMSProject } from '@/utils/scheduleExport';

const result = exportScheduleToMSProject(/* args */);
```

### exportTimeEntriesToCSV

**Import:** `@/utils/timeEntryExport`

- Defined in: `utils/timeEntryExport.ts`
- Export type: named

```ts
function exportTimeEntriesToCSV(entries: TimeEntryListItem[]): void
```

_No inline documentation provided._

**Example**

```ts
import { exportTimeEntriesToCSV } from '@/utils/timeEntryExport';

const result = exportTimeEntriesToCSV(/* args */);
```

### exportToCSV

**Import:** `@/utils/reportExporter`

- Defined in: `utils/reportExporter.ts`
- Export type: named

```ts
function exportToCSV(reportData: any[], options: ExportOptions): Blob
```

_No inline documentation provided._

**Example**

```ts
import { exportToCSV } from '@/utils/reportExporter';

const result = exportToCSV(/* args */);
```

### exportToExcel

**Import:** `@/utils/reportExporter`

- Defined in: `utils/reportExporter.ts`
- Export type: named

```ts
function exportToExcel(reportData: any[], options: ExportOptions): Promise<Blob>
```

_No inline documentation provided._

**Example**

```ts
import { exportToExcel } from '@/utils/reportExporter';

const result = exportToExcel(/* args */);
```

### exportToPDF

**Import:** `@/utils/reportExporter`

- Defined in: `utils/reportExporter.ts`
- Export type: named

```ts
function exportToPDF(reportData: any[], options: ExportOptions): Promise<Blob>
```

_No inline documentation provided._

**Example**

```ts
import { exportToPDF } from '@/utils/reportExporter';

const result = exportToPDF(/* args */);
```

### extractBudgetSheet

**Import:** `@/lib/budgetSheetParser`

- Defined in: `lib/budgetSheetParser.ts`
- Export type: named

```ts
function extractBudgetSheet(grid: Grid): import("C:/Dev/profitbuild-dash/src/types/importTypes").ExtractionResult
```

_No inline documentation provided._

**Example**

```ts
import { extractBudgetSheet } from '@/lib/budgetSheetParser';

const result = extractBudgetSheet(/* args */);
```

### extractExifMetadata

**Import:** `@/utils/mediaMetadata`

- Defined in: `utils/mediaMetadata.ts`
- Export type: named

```ts
function extractExifMetadata(file: File): Promise<{ latitude: number; longitude: number; altitude: number; takenAt: string; deviceModel: string; }>
```

Extract EXIF metadata from image file
Note: This is a placeholder. In production, you would use a library like exifr
For PWA apps, EXIF extraction is limited in browsers

**Example**

```ts
import { extractExifMetadata } from '@/utils/mediaMetadata';

const result = extractExifMetadata(/* args */);
```

### extractLineItems

**Import:** `@/lib/budgetSheetParser`

- Defined in: `lib/budgetSheetParser.ts`
- Export type: named

```ts
function extractLineItems(grid: Grid, columns: BudgetColumns, startRow: number, endRow: number): { items: import("C:/Dev/profitbuild-dash/src/types/importTypes").ExtractedLineItem[]; warnings: import("C:/Dev/profitbuild-dash/src/types/importTypes").ImportWarning[]; compoundRowsSplit: number; }
```

_No inline documentation provided._

**Example**

```ts
import { extractLineItems } from '@/lib/budgetSheetParser';

const result = extractLineItems(/* args */);
```

### extractProjectCounter

**Import:** `@/utils/numberGeneration`

- Defined in: `utils/numberGeneration.ts`
- Export type: named

```ts
function extractProjectCounter(projectNumber: string): number
```

_No inline documentation provided._

**Example**

```ts
import { extractProjectCounter } from '@/utils/numberGeneration';

const result = extractProjectCounter(/* args */);
```

### fetchLinkedReceipt

**Import:** `@/utils/receiptLinking`

- Defined in: `utils/receiptLinking.ts`
- Export type: named

```ts
function fetchLinkedReceipt(receiptId: string): Promise<import("C:/Dev/profitbuild-dash/src/utils/receiptLinking").ReceiptForLinking>
```

Fetch the linked receipt for an expense

**Example**

```ts
import { fetchLinkedReceipt } from '@/utils/receiptLinking';

const result = fetchLinkedReceipt(/* args */);
```

### fetchReceiptsForLinking

**Import:** `@/utils/receiptLinking`

- Defined in: `utils/receiptLinking.ts`
- Export type: named

```ts
function fetchReceiptsForLinking(): Promise<import("C:/Dev/profitbuild-dash/src/utils/receiptLinking").ReceiptForLinking[]>
```

Fetch all receipts available for linking
Does NOT filter by project since receipts are often submitted unassigned

**Example**

```ts
import { fetchReceiptsForLinking } from '@/utils/receiptLinking';

const result = fetchReceiptsForLinking(/* args */);
```

### findHeaderRow

**Import:** `@/lib/budgetSheetParser`

- Defined in: `lib/budgetSheetParser.ts`
- Export type: named

```ts
function findHeaderRow(grid: Grid, maxRowsToScan = 60): HeaderRowCandidate
```

_No inline documentation provided._

**Example**

```ts
import { findHeaderRow } from '@/lib/budgetSheetParser';

const result = findHeaderRow(/* args */);
```

### findKPIByAlias

**Import:** `@/lib/kpi-definitions`

- Defined in: `lib/kpi-definitions/index.ts`
- Export type: named

```ts
function findKPIByAlias(alias: string): import("C:/Dev/profitbuild-dash/src/lib/kpi-definitions/types").KPIMeasure
```

Find KPI by alias (fuzzy match)

**Example**

```ts
import { findKPIByAlias } from '@/lib/kpi-definitions';

const result = findKPIByAlias(/* args */);
```

### findKPIById

**Import:** `@/lib/kpi-definitions`

- Defined in: `lib/kpi-definitions/index.ts`
- Export type: named

```ts
function findKPIById(id: string): import("C:/Dev/profitbuild-dash/src/lib/kpi-definitions/types").KPIMeasure
```

Find a KPI by ID (legacy alias)

**Example**

```ts
import { findKPIById } from '@/lib/kpi-definitions';

const result = findKPIById(/* args */);
```

### findKPIsByConcept

**Import:** `@/lib/kpi-definitions`

- Defined in: `lib/kpi-definitions/index.ts`
- Export type: named

```ts
function findKPIsByConcept(concept: string): import("C:/Dev/profitbuild-dash/src/lib/kpi-definitions/types").KPIMeasure[]
```

Find KPIs by semantic concept (legacy)

**Example**

```ts
import { findKPIsByConcept } from '@/lib/kpi-definitions';

const result = findKPIsByConcept(/* args */);
```

### formatAgreementDate

**Import:** `@/utils/contractFormatters`

- Defined in: `utils/contractFormatters.ts`
- Export type: named

```ts
function formatAgreementDate(date: Date | string): string
```

Format date as "11th day of June, 2025"

**Example**

```ts
import { formatAgreementDate } from '@/utils/contractFormatters';

const result = formatAgreementDate(/* args */);
```

### formatChangeOrderWithProject

**Import:** `@/utils/numberGeneration`

- Defined in: `utils/numberGeneration.ts`
- Export type: named

```ts
function formatChangeOrderWithProject(changeOrderNumber: string, projectNumber: string): string
```

_No inline documentation provided._

**Example**

```ts
import { formatChangeOrderWithProject } from '@/utils/numberGeneration';

const result = formatChangeOrderWithProject(/* args */);
```

### formatContingencyRemaining

**Import:** `@/utils/thresholdUtils`

- Defined in: `utils/thresholdUtils.ts`
- Export type: named

```ts
function formatContingencyRemaining(amount: number | null | undefined): string
```

_No inline documentation provided._

**Example**

```ts
import { formatContingencyRemaining } from '@/utils/thresholdUtils';

const result = formatContingencyRemaining(/* args */);
```

### formatCoordinates

**Import:** `@/utils/mediaMetadata`

- Defined in: `utils/mediaMetadata.ts`
- Export type: named

```ts
function formatCoordinates(latitude: number, longitude: number): string
```

Format GPS coordinates to readable string

**Example**

```ts
import { formatCoordinates } from '@/utils/mediaMetadata';

const result = formatCoordinates(/* args */);
```

### formatCurrency

**Import:** `@/lib/utils`

- Defined in: `lib/utils.ts`
- Export type: named

```ts
function formatCurrency(amount: number | null | undefined, options?: { showCents?: boolean; useAccountingFormat?: boolean }): string
```

_No inline documentation provided._

**Example**

```ts
import { formatCurrency } from '@/lib/utils';

const result = formatCurrency(/* args */);
```

### formatCurrency

**Import:** `@/utils/contractFormatters`

- Defined in: `utils/contractFormatters.ts`
- Export type: named

```ts
function formatCurrency(amount: number): string
```

Format currency as "$63,323.00"

**Example**

```ts
import { formatCurrency } from '@/utils/contractFormatters';

const result = formatCurrency(/* args */);
```

### formatDateForDB

**Import:** `@/utils/dateUtils`

- Defined in: `utils/dateUtils.ts`
- Export type: named

```ts
function formatDateForDB(date: Date): string
```

_No inline documentation provided._

**Example**

```ts
import { formatDateForDB } from '@/utils/dateUtils';

const result = formatDateForDB(/* args */);
```

### formatDateString

**Import:** `@/utils/dateUtils`

- Defined in: `utils/dateUtils.ts`
- Export type: named

```ts
function formatDateString(dateString: string | null | undefined, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: '2-digit' }): string
```

_No inline documentation provided._

**Example**

```ts
import { formatDateString } from '@/utils/dateUtils';

const result = formatDateString(/* args */);
```

### formatDuration

**Import:** `@/utils/videoUtils`

- Defined in: `utils/videoUtils.ts`
- Export type: named

```ts
function formatDuration(seconds: number): string
```

Format duration in seconds to MM:SS

**Example**

```ts
import { formatDuration } from '@/utils/videoUtils';

const result = formatDuration(/* args */);
```

### formatDurationWithLabel

**Import:** `@/utils/videoUtils`

- Defined in: `utils/videoUtils.ts`
- Export type: named

```ts
function formatDurationWithLabel(seconds: number): string
```

Format duration with labels for display

**Example**

```ts
import { formatDurationWithLabel } from '@/utils/videoUtils';

const result = formatDurationWithLabel(/* args */);
```

### formatFileSize

**Import:** `@/utils/mediaMetadata`

- Defined in: `utils/mediaMetadata.ts`
- Export type: named

```ts
function formatFileSize(bytes: number): string
```

Convert bytes to human-readable file size

**Example**

```ts
import { formatFileSize } from '@/utils/mediaMetadata';

const result = formatFileSize(/* args */);
```

### formatFileSize

**Import:** `@/utils/pdfHelpers`

- Defined in: `utils/pdfHelpers.ts`
- Export type: named

```ts
function formatFileSize(bytes?: number): string
```

_No inline documentation provided._

**Example**

```ts
import { formatFileSize } from '@/utils/pdfHelpers';

const result = formatFileSize(/* args */);
```

### formatFileSize

**Import:** `@/utils/videoUtils`

- Defined in: `utils/videoUtils.ts`
- Export type: named

```ts
function formatFileSize(bytes: number): string
```

Format bytes to human-readable size

**Example**

```ts
import { formatFileSize } from '@/utils/videoUtils';

const result = formatFileSize(/* args */);
```

### formatHoursDisplay

**Import:** `@/utils/timeEntryCalculations`

- Defined in: `utils/timeEntryCalculations.ts`
- Export type: named

```ts
function formatHoursDisplay(netHours: number, lunchTaken: boolean = false, showLunchIndicator: boolean = true): string
```

Format hours for display with optional lunch indicator

**Example**

```ts
import { formatHoursDisplay } from '@/utils/timeEntryCalculations';

const result = formatHoursDisplay(/* args */);
```

### formatLegalForm

**Import:** `@/utils/contractFormatters`

- Defined in: `utils/contractFormatters.ts`
- Export type: named

```ts
function formatLegalForm(state: string, legalForm: string): string
```

Format legal form for contract body e.g. "[KY] [LLC]"

**Example**

```ts
import { formatLegalForm } from '@/utils/contractFormatters';

const result = formatLegalForm(/* args */);
```

### formatProjectDate

**Import:** `@/utils/contractFormatters`

- Defined in: `utils/contractFormatters.ts`
- Export type: named

```ts
function formatProjectDate(date: Date | string): string
```

Format date as "M/D/YYYY"

**Example**

```ts
import { formatProjectDate } from '@/utils/contractFormatters';

const result = formatProjectDate(/* args */);
```

### formatProjectNameNumber

**Import:** `@/utils/contractFormatters`

- Defined in: `utils/contractFormatters.ts`
- Export type: named

```ts
function formatProjectNameNumber(projectNumber: string | null, projectName: string | null, clientName?: string | null): string
```

Format project name/number as "[225-005] UC Neuro Suite 301 - UC Health"

**Example**

```ts
import { formatProjectNameNumber } from '@/utils/contractFormatters';

const result = formatProjectNameNumber(/* args */);
```

### formatProjectNumber

**Import:** `@/utils/numberGeneration`

- Defined in: `utils/numberGeneration.ts`
- Export type: named

```ts
function formatProjectNumber(counter: number): string
```

_No inline documentation provided._

**Example**

```ts
import { formatProjectNumber } from '@/utils/numberGeneration';

const result = formatProjectNumber(/* args */);
```

### formatQuantityWithUnit

**Import:** `@/utils/units`

- Defined in: `utils/units.ts`
- Export type: named

```ts
function formatQuantityWithUnit(quantity: number, unit: string | null): string
```

_No inline documentation provided._

**Example**

```ts
import { formatQuantityWithUnit } from '@/utils/units';

const result = formatQuantityWithUnit(/* args */);
```

### formatSplitInfo

**Import:** `@/utils/revenueSplits`

- Defined in: `utils/revenueSplits.ts`
- Export type: named

```ts
function formatSplitInfo(splits: RevenueSplit[]): string
```

Format split info for display

**Example**

```ts
import { formatSplitInfo } from '@/utils/revenueSplits';

const result = formatSplitInfo(/* args */);
```

### formatValidationReport

**Import:** `@/lib/kpi-definitions/validation`

- Defined in: `lib/kpi-definitions/validation.ts`
- Export type: named

```ts
function formatValidationReport(result: ValidationResult): string
```

Format validation results for console output

**Example**

```ts
import { formatValidationReport } from '@/lib/kpi-definitions/validation';

const result = formatValidationReport(/* args */);
```

### fuzzyMatchClient

**Import:** `@/utils/importCore`

- Defined in: `utils/importCore.ts`
- Export type: named

```ts
function fuzzyMatchClient(qbName: string, clients: PartialClient[]): { bestMatch: import("C:/Dev/profitbuild-dash/src/utils/importCore").ClientMatchResult; suggestions: { client: import("C:/Dev/profitbuild-dash/src/utils/importCore").PartialClient; confidence: number; }[]; }
```

_No inline documentation provided._

**Example**

```ts
import { fuzzyMatchClient } from '@/utils/importCore';

const result = fuzzyMatchClient(/* args */);
```

### fuzzyMatchPayee

**Import:** `@/utils/fuzzyPayeeMatcher`

- Defined in: `utils/fuzzyPayeeMatcher.ts`
- Export type: named

```ts
function fuzzyMatchPayee(qbName: string, payees: PartialPayee[]): import("C:/Dev/profitbuild-dash/src/utils/fuzzyPayeeMatcher").FuzzyMatchResult
```

_No inline documentation provided._

**Example**

```ts
import { fuzzyMatchPayee } from '@/utils/fuzzyPayeeMatcher';

const result = fuzzyMatchPayee(/* args */);
```

### fuzzyMatchProject

**Import:** `@/utils/importCore`

- Defined in: `utils/importCore.ts`
- Export type: named

```ts
function fuzzyMatchProject(qbProjectWO: string, projects: PartialProject[], aliases: ProjectAlias[]): import("C:/Dev/profitbuild-dash/src/utils/importCore").ProjectMatchResult
```

_No inline documentation provided._

**Example**

```ts
import { fuzzyMatchProject } from '@/utils/importCore';

const result = fuzzyMatchProject(/* args */);
```

### generateAIContext

**Import:** `@/lib/kpi-definitions/ai-context-generator`

- Defined in: `lib/kpi-definitions/ai-context-generator.ts`
- Export type: named

```ts
function generateAIContext(): import("C:/Dev/profitbuild-dash/src/lib/kpi-definitions/types").AIKPIContext
```

Generate the complete AI context object

**Example**

```ts
import { generateAIContext } from '@/lib/kpi-definitions/ai-context-generator';

const result = generateAIContext(/* args */);
```

### generateAndSaveG702

**Import:** `@/utils/paymentApplicationPdf`

- Defined in: `utils/paymentApplicationPdf.ts`
- Export type: named

```ts
function generateAndSaveG702(app: PaymentApplication, project: ProjectInfo, appLines?: PaymentApplicationLineWithSOV[]): Promise<import("C:/Dev/profitbuild-dash/src/utils/paymentApplicationPdf").PdfSaveResult>
```

_No inline documentation provided._

**Example**

```ts
import { generateAndSaveG702 } from '@/utils/paymentApplicationPdf';

const result = generateAndSaveG702(/* args */);
```

### generateAndSaveG703

**Import:** `@/utils/paymentApplicationPdf`

- Defined in: `utils/paymentApplicationPdf.ts`
- Export type: named

```ts
function generateAndSaveG703(app: PaymentApplication, appLines: PaymentApplicationLineWithSOV[], project: ProjectInfo): Promise<import("C:/Dev/profitbuild-dash/src/utils/paymentApplicationPdf").PdfSaveResult>
```

_No inline documentation provided._

**Example**

```ts
import { generateAndSaveG703 } from '@/utils/paymentApplicationPdf';

const result = generateAndSaveG703(/* args */);
```

### generateCompactPrompt

**Import:** `@/lib/kpi-definitions/ai-context-generator`

- Defined in: `lib/kpi-definitions/ai-context-generator.ts`
- Export type: named

```ts
function generateCompactPrompt(): string
```

Generate a compact version for token-limited contexts

**Example**

```ts
import { generateCompactPrompt } from '@/lib/kpi-definitions/ai-context-generator';

const result = generateCompactPrompt(/* args */);
```

### generateContractNumber

**Import:** `@/utils/contractFormatters`

- Defined in: `utils/contractFormatters.ts`
- Export type: named

```ts
function generateContractNumber(projectNumber: string, clientName: string, existingNumbers: string[]): string
```

Generate unique contract number. Format: {ClientInitials}{ProjectNumber} or with suffix if duplicate.

**Example**

```ts
import { generateContractNumber } from '@/utils/contractFormatters';

const result = generateContractNumber(/* args */);
```

### generatePDFFileName

**Import:** `@/utils/pdfHelpers`

- Defined in: `utils/pdfHelpers.ts`
- Export type: named

```ts
function generatePDFFileName(params: {
  projectName: string;
  projectNumber: string;
  itemCount: number;
  reportType?: string;
}): string
```

_No inline documentation provided._

**Example**

```ts
import { generatePDFFileName } from '@/utils/pdfHelpers';

const result = generatePDFFileName(/* args */);
```

### generateProjectNumber

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
function generateProjectNumber(): Promise<string>
```

_No inline documentation provided._

**Example**

```ts
import { generateProjectNumber } from '@/types/project';

const result = generateProjectNumber(/* args */);
```

### generateProjectNumberSync

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
function generateProjectNumberSync(): string
```

_No inline documentation provided._

**Example**

```ts
import { generateProjectNumberSync } from '@/types/project';

const result = generateProjectNumberSync(/* args */);
```

### generateStoragePath

**Import:** `@/utils/mediaMetadata`

- Defined in: `utils/mediaMetadata.ts`
- Export type: named

```ts
function generateStoragePath(userId: string, projectId: string, filename: string): string
```

Generate standardized storage path for media files
Format: {userId}/{projectId}/{timestamp}-{sanitizedFilename}

**Example**

```ts
import { generateStoragePath } from '@/utils/mediaMetadata';

const result = generateStoragePath(/* args */);
```

### generateSystemPrompt

**Import:** `@/lib/kpi-definitions/ai-context-generator`

- Defined in: `lib/kpi-definitions/ai-context-generator.ts`
- Export type: named

```ts
function generateSystemPrompt(dbSchema?: string): string
```

Generate the system prompt for AI Report Assistant
This version includes adaptive intelligence for different user types

**Example**

```ts
import { generateSystemPrompt } from '@/lib/kpi-definitions/ai-context-generator';

const result = generateSystemPrompt(/* args */);
```

### generateWorkOrderNumber

**Import:** `@/utils/numberGeneration`

- Defined in: `utils/numberGeneration.ts`
- Export type: named

```ts
function generateWorkOrderNumber(projectId: string, projectNumber: string): Promise<string>
```

_No inline documentation provided._

**Example**

```ts
import { generateWorkOrderNumber } from '@/utils/numberGeneration';

const result = generateWorkOrderNumber(/* args */);
```

### getAllKPIs

**Import:** `@/lib/kpi-definitions`

- Defined in: `lib/kpi-definitions/index.ts`
- Export type: named

```ts
function getAllKPIs(): import("C:/Dev/profitbuild-dash/src/lib/kpi-definitions/types").KPIMeasure[]
```

Get all KPIs as a flat array (for legacy compatibility)

**Example**

```ts
import { getAllKPIs } from '@/lib/kpi-definitions';

const result = getAllKPIs(/* args */);
```

### getAudioDuration

**Import:** `@/utils/audioConverter`

- Defined in: `utils/audioConverter.ts`
- Export type: named

```ts
function getAudioDuration(blob: Blob): Promise<number>
```

Get duration of audio blob in seconds

**Example**

```ts
import { getAudioDuration } from '@/utils/audioConverter';

const result = getAudioDuration(/* args */);
```

### getBenchmarkForMetric

**Import:** `@/lib/kpi-definitions/business-benchmarks`

- Defined in: `lib/kpi-definitions/business-benchmarks.ts`
- Export type: named

```ts
function getBenchmarkForMetric(metricId: string): import("C:/Dev/profitbuild-dash/src/lib/kpi-definitions/business-benchmarks").Benchmark
```

_No inline documentation provided._

**Example**

```ts
import { getBenchmarkForMetric } from '@/lib/kpi-definitions/business-benchmarks';

const result = getBenchmarkForMetric(/* args */);
```

### getBenchmarksForPrompt

**Import:** `@/lib/kpi-definitions/business-benchmarks`

- Defined in: `lib/kpi-definitions/business-benchmarks.ts`
- Export type: named

```ts
function getBenchmarksForPrompt(): string
```

_No inline documentation provided._

**Example**

```ts
import { getBenchmarksForPrompt } from '@/lib/kpi-definitions/business-benchmarks';

const result = getBenchmarksForPrompt(/* args */);
```

### getBudgetAlertThreshold

**Import:** `@/utils/budgetUtils`

- Defined in: `utils/budgetUtils.ts`
- Export type: named

```ts
function getBudgetAlertThreshold(): number
```

_No inline documentation provided._

**Example**

```ts
import { getBudgetAlertThreshold } from '@/utils/budgetUtils';

const result = getBudgetAlertThreshold(/* args */);
```

### getBudgetUtilizationColor

**Import:** `@/utils/financialColors`

- Defined in: `utils/financialColors.ts`
- Export type: named

```ts
function getBudgetUtilizationColor(utilizationPercent: number | null | undefined): string
```

Color for budget utilization percentage.
Benchmarks: healthy < 80%, warning >= 80%, critical >= 95%

**Example**

```ts
import { getBudgetUtilizationColor } from '@/utils/financialColors';

const result = getBudgetUtilizationColor(/* args */);
```

### getCaptionPreferences

**Import:** `@/utils/userPreferences`

- Defined in: `utils/userPreferences.ts`
- Export type: named

```ts
function getCaptionPreferences(): Promise<import("C:/Dev/profitbuild-dash/src/utils/userPreferences").CaptionPreferences>
```

_No inline documentation provided._

**Example**

```ts
import { getCaptionPreferences } from '@/utils/userPreferences';

const result = getCaptionPreferences(/* args */);
```

### getCategoryBadgeClasses

**Import:** `@/utils/categoryColors`

- Defined in: `utils/categoryColors.ts`
- Export type: named

```ts
function getCategoryBadgeClasses(category: string): string
```

_No inline documentation provided._

**Example**

```ts
import { getCategoryBadgeClasses } from '@/utils/categoryColors';

const result = getCategoryBadgeClasses(/* args */);
```

### getCategoryDotClasses

**Import:** `@/utils/categoryColors`

- Defined in: `utils/categoryColors.ts`
- Export type: named

```ts
function getCategoryDotClasses(category: string): string
```

_No inline documentation provided._

**Example**

```ts
import { getCategoryDotClasses } from '@/utils/categoryColors';

const result = getCategoryDotClasses(/* args */);
```

### getCategoryHexColor

**Import:** `@/utils/categoryColors`

- Defined in: `utils/categoryColors.ts`
- Export type: named

```ts
function getCategoryHexColor(category: string): string
```

_No inline documentation provided._

**Example**

```ts
import { getCategoryHexColor } from '@/utils/categoryColors';

const result = getCategoryHexColor(/* args */);
```

### getCategoryThemeColor

**Import:** `@/utils/categoryColors`

- Defined in: `utils/categoryColors.ts`
- Export type: named

```ts
function getCategoryThemeColor(category: string): string
```

_No inline documentation provided._

**Example**

```ts
import { getCategoryThemeColor } from '@/utils/categoryColors';

const result = getCategoryThemeColor(/* args */);
```

### getChangeOrderStatusColor

**Import:** `@/lib/statusColors`

- Defined in: `lib/statusColors.ts`
- Export type: named

```ts
function getChangeOrderStatusColor(status: ChangeOrderStatus | string): string
```

_No inline documentation provided._

**Example**

```ts
import { getChangeOrderStatusColor } from '@/lib/statusColors';

const result = getChangeOrderStatusColor(/* args */);
```

### getCompanyBranding

**Import:** `@/utils/companyBranding`

- Defined in: `utils/companyBranding.ts`
- Export type: named

```ts
function getCompanyBranding(): Promise<import("C:/Dev/profitbuild-dash/src/utils/companyBranding").CompanyBranding>
```

_No inline documentation provided._

**Example**

```ts
import { getCompanyBranding } from '@/utils/companyBranding';

const result = getCompanyBranding(/* args */);
```

### getConstructionFilter

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
function getConstructionFilter(): import("C:/Dev/profitbuild-dash/src/types/project").ProjectCategory
```

_No inline documentation provided._

**Example**

```ts
import { getConstructionFilter } from '@/types/project';

const result = getConstructionFilter(/* args */);
```

### getContingencyColor

**Import:** `@/utils/financialColors`

- Defined in: `utils/financialColors.ts`
- Export type: named

```ts
function getContingencyColor(remainingPercent: number | null | undefined): string
```

Color for contingency remaining percentage.
Benchmarks: healthy > 50%, warning <= 40%, critical <= 20%
Aligned with business-benchmarks.ts contingency_usage (inverted: remaining vs used)

**Example**

```ts
import { getContingencyColor } from '@/utils/financialColors';

const result = getContingencyColor(/* args */);
```

### getCostVariance

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function getCostVariance(quote: Quote, estimates: Estimate[]): import("C:/Dev/profitbuild-dash/src/utils/quoteFinancials").CostVarianceResult
```

Calculate cost variance between quoted cost and estimated cost.
Positive = over estimate (bad), Negative = under estimate (good).

**Example**

```ts
import { getCostVariance } from '@/utils/quoteFinancials';

const result = getCostVariance(/* args */);
```

### getCostVarianceColor

**Import:** `@/utils/financialColors`

- Defined in: `utils/financialColors.ts`
- Export type: named

```ts
function getCostVarianceColor(variancePercent: number | null | undefined): string
```

Color for cost variance percentage.
Benchmarks: healthy -5% to 5%, warning > 10%, critical > 20%

**Example**

```ts
import { getCostVarianceColor } from '@/utils/financialColors';

const result = getCostVarianceColor(/* args */);
```

### getCostVarianceStatus

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function getCostVarianceStatus(variancePercent: number): "excellent" | "good" | "poor" | "critical"
```

_No inline documentation provided._

**Example**

```ts
import { getCostVarianceStatus } from '@/utils/quoteFinancials';

const result = getCostVarianceStatus(/* args */);
```

### getDefaultKPIForConcept

**Import:** `@/lib/kpi-definitions`

- Defined in: `lib/kpi-definitions/index.ts`
- Export type: named

```ts
function getDefaultKPIForConcept(concept: string): import("C:/Dev/profitbuild-dash/src/lib/kpi-definitions/types").KPIMeasure
```

Get the default KPI for a business concept

**Example**

```ts
import { getDefaultKPIForConcept } from '@/lib/kpi-definitions';

const result = getDefaultKPIForConcept(/* args */);
```

### getDeviceInfo

**Import:** `@/utils/mediaMetadata`

- Defined in: `utils/mediaMetadata.ts`
- Export type: named

```ts
function getDeviceInfo(): { model: string; platform: string; osVersion: string; }
```

Get device information for PWA environment

**Example**

```ts
import { getDeviceInfo } from '@/utils/mediaMetadata';

const result = getDeviceInfo(/* args */);
```

### getEstimateForQuote

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function getEstimateForQuote(quote: Quote, estimates: Estimate[]): import("C:/Dev/profitbuild-dash/src/types/estimate").Estimate
```

Find the matching estimate for a given quote.
Prioritizes exact estimate_id match, falls back to project_id match.

**Example**

```ts
import { getEstimateForQuote } from '@/utils/quoteFinancials';

const result = getEstimateForQuote(/* args */);
```

### getEstimateLineItemCost

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function getEstimateLineItemCost(quote: Quote, estimates: Estimate[]): number
```

Get the corresponding estimate line item COST for a quote.
Returns the sum of estimate totalCost for each matched line item.
This is COST (what we estimated we'd pay), NOT price (what we charge client).

**Example**

```ts
import { getEstimateLineItemCost } from '@/utils/quoteFinancials';

const result = getEstimateLineItemCost(/* args */);
```

### getEstimateLineItemPrice

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function getEstimateLineItemPrice(quote: Quote, estimates: Estimate[]): number
```

Get the corresponding estimate line item PRICE for a quote.
Returns client-facing price. Use only for margin/profit analysis,
NOT for cost variance comparisons.

**Example**

```ts
import { getEstimateLineItemPrice } from '@/utils/quoteFinancials';

const result = getEstimateLineItemPrice(/* args */);
```

### getEstimateStatusColor

**Import:** `@/lib/statusColors`

- Defined in: `lib/statusColors.ts`
- Export type: named

```ts
function getEstimateStatusColor(status: EstimateStatus | string): string
```

_No inline documentation provided._

**Example**

```ts
import { getEstimateStatusColor } from '@/lib/statusColors';

const result = getEstimateStatusColor(/* args */);
```

### getExpenseContextFilter

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
function getExpenseContextFilter(): import("C:/Dev/profitbuild-dash/src/types/project").ProjectCategory[]
```

_No inline documentation provided._

**Example**

```ts
import { getExpenseContextFilter } from '@/types/project';

const result = getExpenseContextFilter(/* args */);
```

### getExpensePayeeLabel

**Import:** `@/lib/utils`

- Defined in: `lib/utils.ts`
- Export type: named

```ts
function getExpensePayeeLabel(expense: { 
  payee_name?: string | null; 
  description?: string | null;
}): string
```

_No inline documentation provided._

**Example**

```ts
import { getExpensePayeeLabel } from '@/lib/utils';

const result = getExpensePayeeLabel(/* args */);
```

### getExpenseSplits

**Import:** `@/utils/expenseSplits`

- Defined in: `utils/expenseSplits.ts`
- Export type: named

```ts
function getExpenseSplits(expenseId: string): Promise<import("C:/Dev/profitbuild-dash/src/types/expense").ExpenseSplit[]>
```

Get all splits for an expense with project details

**Example**

```ts
import { getExpenseSplits } from '@/utils/expenseSplits';

const result = getExpenseSplits(/* args */);
```

### getExpenseSplitsBatch

**Import:** `@/utils/expenseSplits`

- Defined in: `utils/expenseSplits.ts`
- Export type: named

```ts
function getExpenseSplitsBatch(expenseIds: string[]): Promise<Record<string, import("C:/Dev/profitbuild-dash/src/types/expense").ExpenseSplit[]>>
```

Get splits for multiple expenses in a single query (batch fetch).
Returns a Record keyed by expense_id, each containing an array of ExpenseSplit.
This replaces the N+1 pattern of calling getExpenseSplits() in a loop.

**Example**

```ts
import { getExpenseSplitsBatch } from '@/utils/expenseSplits';

const result = getExpenseSplitsBatch(/* args */);
```

### getExpenseStatusColor

**Import:** `@/lib/statusColors`

- Defined in: `lib/statusColors.ts`
- Export type: named

```ts
function getExpenseStatusColor(status: ExpenseStatus | string): string
```

_No inline documentation provided._

**Example**

```ts
import { getExpenseStatusColor } from '@/lib/statusColors';

const result = getExpenseStatusColor(/* args */);
```

### getExpiringQuotes

**Import:** `@/utils/projectDashboard`

- Defined in: `utils/projectDashboard.ts`
- Export type: named

```ts
function getExpiringQuotes(quotes: Quote[], daysAhead: number = 7): import("C:/Dev/profitbuild-dash/src/types/quote").Quote[]
```

_No inline documentation provided._

**Example**

```ts
import { getExpiringQuotes } from '@/utils/projectDashboard';

const result = getExpiringQuotes(/* args */);
```

### getFileExtension

**Import:** `@/utils/trainingStorage`

- Defined in: `utils/trainingStorage.ts`
- Export type: named

```ts
function getFileExtension(path: string): string
```

Get file extension from path

**Example**

```ts
import { getFileExtension } from '@/utils/trainingStorage';

const result = getFileExtension(/* args */);
```

### getFinancialHealth

**Import:** `@/utils/financialColors`

- Defined in: `utils/financialColors.ts`
- Export type: named

```ts
function getFinancialHealth(value: number | null | undefined, warningThreshold: number, criticalThreshold: number, invertDirection: boolean = false): import("C:/Dev/profitbuild-dash/src/utils/financialColors").FinancialHealthStatus
```

Determine financial health based on a value and thresholds.
Works for margins, budget utilization, contingency, etc.

**Example**

```ts
import { getFinancialHealth } from '@/utils/financialColors';

const result = getFinancialHealth(/* args */);
```

### getFinancialHealthColor

**Import:** `@/utils/financialColors`

- Defined in: `utils/financialColors.ts`
- Export type: named

```ts
function getFinancialHealthColor(status: FinancialHealthStatus): string
```

Get Tailwind text color class for financial health.

**Example**

```ts
import { getFinancialHealthColor } from '@/utils/financialColors';

const result = getFinancialHealthColor(/* args */);
```

### getFinancialHealthHSL

**Import:** `@/utils/financialColors`

- Defined in: `utils/financialColors.ts`
- Export type: named

```ts
function getFinancialHealthHSL(status: FinancialHealthStatus): string
```

Get HSL color for charts/progress bars.
Compatible with existing thresholdUtils pattern used by MarginDashboard.

**Example**

```ts
import { getFinancialHealthHSL } from '@/utils/financialColors';

const result = getFinancialHealthHSL(/* args */);
```

### getKPIById

**Import:** `@/lib/kpi-definitions`

- Defined in: `lib/kpi-definitions/index.ts`
- Export type: named

```ts
function getKPIById(id: string): import("C:/Dev/profitbuild-dash/src/lib/kpi-definitions/types").KPIMeasure
```

Get a KPI by its ID

**Example**

```ts
import { getKPIById } from '@/lib/kpi-definitions';

const result = getKPIById(/* args */);
```

### getKPIsByDomain

**Import:** `@/lib/kpi-definitions`

- Defined in: `lib/kpi-definitions/index.ts`
- Export type: named

```ts
function getKPIsByDomain(domain: KPIDomain | string): import("C:/Dev/profitbuild-dash/src/lib/kpi-definitions/types").KPIMeasure[]
```

Get all KPIs for a specific domain

**Example**

```ts
import { getKPIsByDomain } from '@/lib/kpi-definitions';

const result = getKPIsByDomain(/* args */);
```

### getKPIsBySource

**Import:** `@/lib/kpi-definitions`

- Defined in: `lib/kpi-definitions/index.ts`
- Export type: named

```ts
function getKPIsBySource(source: KPISource): import("C:/Dev/profitbuild-dash/src/lib/kpi-definitions/types").KPIMeasure[]
```

Get all KPIs from a specific source

**Example**

```ts
import { getKPIsBySource } from '@/lib/kpi-definitions';

const result = getKPIsBySource(/* args */);
```

### getKPIStats

**Import:** `@/lib/kpi-definitions`

- Defined in: `lib/kpi-definitions/index.ts`
- Export type: named

```ts
function getKPIStats(): { total: number; byDomain: Record<string, number>; bySource: Record<string, number>; deprecated: number; withAliases: number; }
```

Get statistics about KPI definitions

**Example**

```ts
import { getKPIStats } from '@/lib/kpi-definitions';

const result = getKPIStats(/* args */);
```

### getLogoSignedUrl

**Import:** `@/utils/companyBranding`

- Defined in: `utils/companyBranding.ts`
- Export type: named

```ts
function getLogoSignedUrl(path: string): Promise<string>
```

_No inline documentation provided._

**Example**

```ts
import { getLogoSignedUrl } from '@/utils/companyBranding';

const result = getLogoSignedUrl(/* args */);
```

### getMarginColor

**Import:** `@/utils/financialColors`

- Defined in: `utils/financialColors.ts`
- Export type: named

```ts
function getMarginColor(marginPercent: number | null | undefined, minimumThreshold: number = 10, targetMargin: number = 15): string
```

Color for margin percentage.
Benchmarks: healthy >= 15%, warning >= 10%, critical < 10%
Uses project's own thresholds when provided, else sensible defaults.

**Example**

```ts
import { getMarginColor } from '@/utils/financialColors';

const result = getMarginColor(/* args */);
```

### getMarginPerformanceStatus

**Import:** `@/utils/estimateFinancials`

- Defined in: `utils/estimateFinancials.ts`
- Export type: named

```ts
function getMarginPerformanceStatus(marginPercent: number): "excellent" | "good" | "poor" | "critical" | "loss"
```

_No inline documentation provided._

**Example**

```ts
import { getMarginPerformanceStatus } from '@/utils/estimateFinancials';

const result = getMarginPerformanceStatus(/* args */);
```

### getMarginPerformanceStatus

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function getMarginPerformanceStatus(marginPercent: number): "excellent" | "good" | "poor" | "critical"
```

_No inline documentation provided._

**Example**

```ts
import { getMarginPerformanceStatus } from '@/utils/quoteFinancials';

const result = getMarginPerformanceStatus(/* args */);
```

### getMarginThresholdStatus

**Import:** `@/utils/thresholdUtils`

- Defined in: `utils/thresholdUtils.ts`
- Export type: named

```ts
function getMarginThresholdStatus(currentMargin: number | null | undefined, minimumThreshold: number = 10.0, targetMargin: number = 20.0): import("C:/Dev/profitbuild-dash/src/types/project").MarginThresholdStatus
```

_No inline documentation provided._

**Example**

```ts
import { getMarginThresholdStatus } from '@/utils/thresholdUtils';

const result = getMarginThresholdStatus(/* args */);
```

### getMarkupPerformanceStatus

**Import:** `@/utils/estimateFinancials`

- Defined in: `utils/estimateFinancials.ts`
- Export type: named

```ts
function getMarkupPerformanceStatus(markupPercent: number): "excellent" | "good" | "poor" | "critical" | "loss"
```

_No inline documentation provided._

**Example**

```ts
import { getMarkupPerformanceStatus } from '@/utils/estimateFinancials';

const result = getMarkupPerformanceStatus(/* args */);
```

### getPendingCount

**Import:** `@/utils/syncQueue`

- Defined in: `utils/syncQueue.ts`
- Export type: named

```ts
function getPendingCount(): Promise<number>
```

_No inline documentation provided._

**Example**

```ts
import { getPendingCount } from '@/utils/syncQueue';

const result = getPendingCount(/* args */);
```

### getPlatformName

**Import:** `@/utils/platform`

- Defined in: `utils/platform.ts`
- Export type: named

```ts
function getPlatformName(): string
```

_No inline documentation provided._

**Example**

```ts
import { getPlatformName } from '@/utils/platform';

const result = getPlatformName(/* args */);
```

### getProfitStatus

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function getProfitStatus(profitMargin: number): "excellent" | "good" | "loss" | "acceptable"
```

_No inline documentation provided._

**Example**

```ts
import { getProfitStatus } from '@/utils/quoteFinancials';

const result = getProfitStatus(/* args */);
```

### getProjectMediaList

**Import:** `@/utils/projectMedia`

- Defined in: `utils/projectMedia.ts`
- Export type: named

```ts
function getProjectMediaList(projectId: string, options?: {
    fileType?: 'image' | 'video';
    limit?: number;
    offset?: number;
  }): Promise<{ data: import("C:/Dev/profitbuild-dash/src/types/project").ProjectMedia[]; error: Error; }>
```

Get media list for a project with signed URLs

**Example**

```ts
import { getProjectMediaList } from '@/utils/projectMedia';

const result = getProjectMediaList(/* args */);
```

### getProjectScheduleDates

**Import:** `@/utils/projectDashboard`

- Defined in: `utils/projectDashboard.ts`
- Export type: named

```ts
function getProjectScheduleDates(projectId: string, projectStartDate?: Date | string | null, projectEndDate?: Date | string | null): Promise<{ start: Date; end: Date; }>
```

Get project schedule dates from project-level dates or line item dates
Falls back to estimate/change order line items if project dates not set

**Example**

```ts
import { getProjectScheduleDates } from '@/utils/projectDashboard';

const result = getProjectScheduleDates(/* args */);
```

### getProjectStatusColor

**Import:** `@/lib/statusColors`

- Defined in: `lib/statusColors.ts`
- Export type: named

```ts
function getProjectStatusColor(status: ProjectStatus | string): string
```

_No inline documentation provided._

**Example**

```ts
import { getProjectStatusColor } from '@/lib/statusColors';

const result = getProjectStatusColor(/* args */);
```

### getQueue

**Import:** `@/utils/syncQueue`

- Defined in: `utils/syncQueue.ts`
- Export type: named

```ts
function getQueue(): Promise<import("C:/Dev/profitbuild-dash/src/utils/syncQueue").QueuedOperation[]>
```

_No inline documentation provided._

**Example**

```ts
import { getQueue } from '@/utils/syncQueue';

const result = getQueue(/* args */);
```

### getQuickBooksColumnMapping

**Import:** `@/utils/clientCsvParser`

- Defined in: `utils/clientCsvParser.ts`
- Export type: named

```ts
function getQuickBooksColumnMapping(headers: string[]): import("C:/Dev/profitbuild-dash/src/utils/clientCsvParser").ClientColumnMapping
```

_No inline documentation provided._

**Example**

```ts
import { getQuickBooksColumnMapping } from '@/utils/clientCsvParser';

const result = getQuickBooksColumnMapping(/* args */);
```

### getQuotedCost

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function getQuotedCost(quote: Quote): number
```

Get the vendor's quoted cost from quote line items.
This is the COST (what we pay the vendor), derived from line items.
Always use this instead of quote.total for display to ensure
correctness even for quotes saved before the totalCost fix.

**Example**

```ts
import { getQuotedCost } from '@/utils/quoteFinancials';

const result = getQuotedCost(/* args */);
```

### getQuoteStatusColor

**Import:** `@/lib/statusColors`

- Defined in: `lib/statusColors.ts`
- Export type: named

```ts
function getQuoteStatusColor(status: QuoteStatus | string): string
```

_No inline documentation provided._

**Example**

```ts
import { getQuoteStatusColor } from '@/lib/statusColors';

const result = getQuoteStatusColor(/* args */);
```

### getRecommendedUnitCodes

**Import:** `@/utils/units`

- Defined in: `utils/units.ts`
- Export type: named

```ts
function getRecommendedUnitCodes(category: string): string[]
```

_No inline documentation provided._

**Example**

```ts
import { getRecommendedUnitCodes } from '@/utils/units';

const result = getRecommendedUnitCodes(/* args */);
```

### getRecommendedUnits

**Import:** `@/utils/units`

- Defined in: `utils/units.ts`
- Export type: named

```ts
function getRecommendedUnits(category: string): import("C:/Dev/profitbuild-dash/src/utils/units").UnitDefinition[]
```

_No inline documentation provided._

**Example**

```ts
import { getRecommendedUnits } from '@/utils/units';

const result = getRecommendedUnits(/* args */);
```

### getRevenueDisplayAmount

**Import:** `@/utils/revenueSplits`

- Defined in: `utils/revenueSplits.ts`
- Export type: named

```ts
function getRevenueDisplayAmount(revenue: ProjectRevenue): number
```

Get the display amount for a revenue
For split revenues, returns the original amount (not individual splits)

**Example**

```ts
import { getRevenueDisplayAmount } from '@/utils/revenueSplits';

const result = getRevenueDisplayAmount(/* args */);
```

### getRevenueSplits

**Import:** `@/utils/revenueSplits`

- Defined in: `utils/revenueSplits.ts`
- Export type: named

```ts
function getRevenueSplits(revenueId: string): Promise<import("C:/Dev/profitbuild-dash/src/types/revenue").RevenueSplit[]>
```

Get all splits for a revenue with project details

**Example**

```ts
import { getRevenueSplits } from '@/utils/revenueSplits';

const result = getRevenueSplits(/* args */);
```

### getShowSandboxProject

**Import:** `@/utils/sandboxPreferences`

- Defined in: `utils/sandboxPreferences.ts`
- Export type: named

```ts
function getShowSandboxProject(): boolean
```

_No inline documentation provided._

**Example**

```ts
import { getShowSandboxProject } from '@/utils/sandboxPreferences';

const result = getShowSandboxProject(/* args */);
```

### getSupportedMediaTypes

**Import:** `@/utils/mediaMetadata`

- Defined in: `utils/mediaMetadata.ts`
- Export type: named

```ts
function getSupportedMediaTypes(): { supportsHeic: boolean; supportsWebP: boolean; }
```

Check if browser supports certain media types

**Example**

```ts
import { getSupportedMediaTypes } from '@/utils/mediaMetadata';

const result = getSupportedMediaTypes(/* args */);
```

### getThresholdStatusColor

**Import:** `@/utils/thresholdUtils`

- Defined in: `utils/thresholdUtils.ts`
- Export type: named

```ts
function getThresholdStatusColor(status: MarginThresholdStatus): string
```

_No inline documentation provided._

**Example**

```ts
import { getThresholdStatusColor } from '@/utils/thresholdUtils';

const result = getThresholdStatusColor(/* args */);
```

### getThresholdStatusLabel

**Import:** `@/utils/thresholdUtils`

- Defined in: `utils/thresholdUtils.ts`
- Export type: named

```ts
function getThresholdStatusLabel(status: MarginThresholdStatus): string
```

_No inline documentation provided._

**Example**

```ts
import { getThresholdStatusLabel } from '@/utils/thresholdUtils';

const result = getThresholdStatusLabel(/* args */);
```

### getTimeRemainingBeforeSizeLimit

**Import:** `@/utils/videoUtils`

- Defined in: `utils/videoUtils.ts`
- Export type: named

```ts
function getTimeRemainingBeforeSizeLimit(currentDuration: number): number
```

Get time remaining before hitting size limit

**Example**

```ts
import { getTimeRemainingBeforeSizeLimit } from '@/utils/videoUtils';

const result = getTimeRemainingBeforeSizeLimit(/* args */);
```

### getTopProfitableProjects

**Import:** `@/utils/profitCalculations`

- Defined in: `utils/profitCalculations.ts`
- Export type: named

```ts
function getTopProfitableProjects(projectProfits: ProjectProfitData[], limit: number = 5): import("C:/Dev/profitbuild-dash/src/types/profit").ProjectProfitData[]
```

_No inline documentation provided._

**Example**

```ts
import { getTopProfitableProjects } from '@/utils/profitCalculations';

const result = getTopProfitableProjects(/* args */);
```

### getTrainingFileUrl

**Import:** `@/utils/trainingStorage`

- Defined in: `utils/trainingStorage.ts`
- Export type: named

```ts
function getTrainingFileUrl(path: string | null): Promise<string>
```

Get a signed URL for viewing a training file

**Example**

```ts
import { getTrainingFileUrl } from '@/utils/trainingStorage';

const result = getTrainingFileUrl(/* args */);
```

### getUnitByCode

**Import:** `@/utils/units`

- Defined in: `utils/units.ts`
- Export type: named

```ts
function getUnitByCode(code: string): import("C:/Dev/profitbuild-dash/src/utils/units").UnitDefinition
```

_No inline documentation provided._

**Example**

```ts
import { getUnitByCode } from '@/utils/units';

const result = getUnitByCode(/* args */);
```

### getUnitsByCategory

**Import:** `@/utils/units`

- Defined in: `utils/units.ts`
- Export type: named

```ts
function getUnitsByCategory(category: UnitCategory): import("C:/Dev/profitbuild-dash/src/utils/units").UnitDefinition[]
```

_No inline documentation provided._

**Example**

```ts
import { getUnitsByCategory } from '@/utils/units';

const result = getUnitsByCategory(/* args */);
```

### getVideoDuration

**Import:** `@/utils/videoUtils`

- Defined in: `utils/videoUtils.ts`
- Export type: named

```ts
function getVideoDuration(file: File | Blob): Promise<number>
```

Extract video duration from a video file or blob
Returns duration in seconds

**Example**

```ts
import { getVideoDuration } from '@/utils/videoUtils';

const result = getVideoDuration(/* args */);
```

### getVideoEmbedUrl

**Import:** `@/utils/trainingStorage`

- Defined in: `utils/trainingStorage.ts`
- Export type: named

```ts
function getVideoEmbedUrl(url: string): string
```

Convert video URL to embeddable URL

**Example**

```ts
import { getVideoEmbedUrl } from '@/utils/trainingStorage';

const result = getVideoEmbedUrl(/* args */);
```

### getWorstPerformingProjects

**Import:** `@/utils/profitCalculations`

- Defined in: `utils/profitCalculations.ts`
- Export type: named

```ts
function getWorstPerformingProjects(projectProfits: ProjectProfitData[], limit: number = 5): import("C:/Dev/profitbuild-dash/src/types/profit").ProjectProfitData[]
```

_No inline documentation provided._

**Example**

```ts
import { getWorstPerformingProjects } from '@/utils/profitCalculations';

const result = getWorstPerformingProjects(/* args */);
```

### importBudgetSheet

**Import:** `@/services/estimateImportService`

- Defined in: `services/estimateImportService.ts`
- Export type: named

```ts
function importBudgetSheet(file: File, options: ImportOptions = {}): Promise<import("C:/Dev/profitbuild-dash/src/types/importTypes").ImportResult>
```

_No inline documentation provided._

**Example**

```ts
import { importBudgetSheet } from '@/services/estimateImportService';

const result = importBudgetSheet(/* args */);
```

### isAndroidChrome

**Import:** `@/utils/platform`

- Defined in: `utils/platform.ts`
- Export type: named

```ts
function isAndroidChrome(): boolean
```

_No inline documentation provided._

**Example**

```ts
import { isAndroidChrome } from '@/utils/platform';

const result = isAndroidChrome(/* args */);
```

### isConstructionProject

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
function isConstructionProject(category?: ProjectCategory | null): boolean
```

_No inline documentation provided._

**Example**

```ts
import { isConstructionProject } from '@/types/project';

const result = isConstructionProject(/* args */);
```

### isFeatureEnabled

**Import:** `@/lib/featureFlags`

- Defined in: `lib/featureFlags.ts`
- Export type: named

```ts
function isFeatureEnabled(feature: keyof FeatureFlags): boolean
```

_No inline documentation provided._

**Example**

```ts
import { isFeatureEnabled } from '@/lib/featureFlags';

const result = isFeatureEnabled(/* args */);
```

### isIOSDevice

**Import:** `@/utils/platform`

- Defined in: `utils/platform.ts`
- Export type: named

```ts
function isIOSDevice(): boolean
```

_No inline documentation provided._

**Example**

```ts
import { isIOSDevice } from '@/utils/platform';

const result = isIOSDevice(/* args */);
```

### isIOSPWA

**Import:** `@/utils/platform`

- Defined in: `utils/platform.ts`
- Export type: named

```ts
function isIOSPWA(): boolean
```

_No inline documentation provided._

**Example**

```ts
import { isIOSPWA } from '@/utils/platform';

const result = isIOSPWA(/* args */);
```

### isIOSSafari

**Import:** `@/utils/platform`

- Defined in: `utils/platform.ts`
- Export type: named

```ts
function isIOSSafari(): boolean
```

_No inline documentation provided._

**Example**

```ts
import { isIOSSafari } from '@/utils/platform';

const result = isIOSSafari(/* args */);
```

### isNativePlatform

**Import:** `@/utils/platform`

- Defined in: `utils/platform.ts`
- Export type: named

```ts
function isNativePlatform(): boolean
```

_No inline documentation provided._

**Example**

```ts
import { isNativePlatform } from '@/utils/platform';

const result = isNativePlatform(/* args */);
```

### isOperationalProject

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
function isOperationalProject(projectNumber: string): boolean
```

_No inline documentation provided._

**Example**

```ts
import { isOperationalProject } from '@/types/project';

const result = isOperationalProject(/* args */);
```

### isOverheadProject

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
function isOverheadProject(category?: ProjectCategory | null): boolean
```

_No inline documentation provided._

**Example**

```ts
import { isOverheadProject } from '@/types/project';

const result = isOverheadProject(/* args */);
```

### isPWAInstalled

**Import:** `@/utils/platform`

- Defined in: `utils/platform.ts`
- Export type: named

```ts
function isPWAInstalled(): boolean
```

_No inline documentation provided._

**Example**

```ts
import { isPWAInstalled } from '@/utils/platform';

const result = isPWAInstalled(/* args */);
```

### isSystemProject

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
function isSystemProject(projectNumber: string): boolean
```

_No inline documentation provided._

**Example**

```ts
import { isSystemProject } from '@/types/project';

const result = isSystemProject(/* args */);
```

### isSystemProjectByCategory

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
function isSystemProjectByCategory(category?: ProjectCategory | null): boolean
```

_No inline documentation provided._

**Example**

```ts
import { isSystemProjectByCategory } from '@/types/project';

const result = isSystemProjectByCategory(/* args */);
```

### isVideoSizeExceeded

**Import:** `@/utils/videoUtils`

- Defined in: `utils/videoUtils.ts`
- Export type: named

```ts
function isVideoSizeExceeded(durationSeconds: number): boolean
```

Check if estimated size exceeds limit

**Example**

```ts
import { isVideoSizeExceeded } from '@/utils/videoUtils';

const result = isVideoSizeExceeded(/* args */);
```

### isWebPlatform

**Import:** `@/utils/platform`

- Defined in: `utils/platform.ts`
- Export type: named

```ts
function isWebPlatform(): boolean
```

_No inline documentation provided._

**Example**

```ts
import { isWebPlatform } from '@/utils/platform';

const result = isWebPlatform(/* args */);
```

### jaroWinklerSimilarity

**Import:** `@/utils/fuzzyPayeeMatcher`

- Defined in: `utils/fuzzyPayeeMatcher.ts`
- Export type: named

```ts
function jaroWinklerSimilarity(str1: string, str2: string): number
```

_No inline documentation provided._

**Example**

```ts
import { jaroWinklerSimilarity } from '@/utils/fuzzyPayeeMatcher';

const result = jaroWinklerSimilarity(/* args */);
```

### linkReceiptToExpense

**Import:** `@/utils/receiptLinking`

- Defined in: `utils/receiptLinking.ts`
- Export type: named

```ts
function linkReceiptToExpense({ expenseId, receiptId }: LinkReceiptParams): Promise<void>
```

Link a receipt to an expense

**Example**

```ts
import { linkReceiptToExpense } from '@/utils/receiptLinking';

const result = linkReceiptToExpense(/* args */);
```

### mapAccountToCategory

**Import:** `@/utils/importCore`

- Defined in: `utils/importCore.ts`
- Export type: named

```ts
function mapAccountToCategory(accountFullName: string): import("C:/Dev/profitbuild-dash/src/types/expense").ExpenseCategory
```

_No inline documentation provided._

**Example**

```ts
import { mapAccountToCategory } from '@/utils/importCore';

const result = mapAccountToCategory(/* args */);
```

### mapColumns

**Import:** `@/lib/budgetSheetParser`

- Defined in: `lib/budgetSheetParser.ts`
- Export type: named

```ts
function mapColumns(grid: Grid, headerRowIndex: number): import("C:/Dev/profitbuild-dash/src/types/importTypes").ColumnMappingResult
```

_No inline documentation provided._

**Example**

```ts
import { mapColumns } from '@/lib/budgetSheetParser';

const result = mapColumns(/* args */);
```

### mapCSVToClients

**Import:** `@/utils/clientCsvParser`

- Defined in: `utils/clientCsvParser.ts`
- Export type: named

```ts
function mapCSVToClients(data: ClientCSVRow[], mapping: ClientColumnMapping, fileName: string): import("C:/Dev/profitbuild-dash/src/utils/clientCsvParser").ClientImportData[]
```

_No inline documentation provided._

**Example**

```ts
import { mapCSVToClients } from '@/utils/clientCsvParser';

const result = mapCSVToClients(/* args */);
```

### mapCSVToExpenses

**Import:** `@/utils/csvParser`

- Defined in: `utils/csvParser.ts`
- Export type: named

```ts
function mapCSVToExpenses(data: CSVRow[], mapping: ColumnMapping, projectId: string, fileName: string): import("C:/Dev/profitbuild-dash/src/types/expense").Expense[]
```

_No inline documentation provided._

**Example**

```ts
import { mapCSVToExpenses } from '@/utils/csvParser';

const result = mapCSVToExpenses(/* args */);
```

### mapCSVToExpenses

**Import:** `@/utils/expenseCsvParser`

- Defined in: `utils/expenseCsvParser.ts`
- Export type: named

```ts
function mapCSVToExpenses(data: ExpenseCSVRow[], mapping: ExpenseColumnMapping, fallbackProjectId: string, payeeMap: Map<string, string> = new Map(), projectMap: Map<string, string> = new Map()): import("C:/Dev/profitbuild-dash/src/utils/expenseCsvParser").ExpenseImportData[]
```

_No inline documentation provided._

**Example**

```ts
import { mapCSVToExpenses } from '@/utils/expenseCsvParser';

const result = mapCSVToExpenses(/* args */);
```

### mapCSVToPayees

**Import:** `@/utils/payeeCsvParser`

- Defined in: `utils/payeeCsvParser.ts`
- Export type: named

```ts
function mapCSVToPayees(data: PayeeCSVRow[], mapping: PayeeColumnMapping, fileName: string): import("C:/Dev/profitbuild-dash/src/utils/payeeCsvParser").PayeeImportData[]
```

_No inline documentation provided._

**Example**

```ts
import { mapCSVToPayees } from '@/utils/payeeCsvParser';

const result = mapCSVToPayees(/* args */);
```

### mapDbToLineItem

**Import:** `@/utils/dbMapping`

- Defined in: `utils/dbMapping.ts`
- Export type: named

```ts
function mapDbToLineItem(dbItem: any): import("C:/Dev/profitbuild-dash/src/types/estimate").LineItem
```

_No inline documentation provided._

**Example**

```ts
import { mapDbToLineItem } from '@/utils/dbMapping';

const result = mapDbToLineItem(/* args */);
```

### mapLineItemToDb

**Import:** `@/utils/dbMapping`

- Defined in: `utils/dbMapping.ts`
- Export type: named

```ts
function mapLineItemToDb(item: LineItem): { id: string; category: import("C:/Dev/profitbuild-dash/src/types/estimate").LineItemCategory; description: string; quantity: number; rate: number; total: number; unit: string; sort_order: number; cost_per_unit: number; markup_percent: number; markup_amount: number; price_per_unit: number; total_cost: number; total_markup: number; }
```

_No inline documentation provided._

**Example**

```ts
import { mapLineItemToDb } from '@/utils/dbMapping';

const result = mapLineItemToDb(/* args */);
```

### mapQuickBooksToExpenses

**Import:** `@/utils/csvParser`

- Defined in: `utils/csvParser.ts`
- Export type: named

```ts
function mapQuickBooksToExpenses(transactions: QBTransaction[], fileName: string): Promise<import("C:/Dev/profitbuild-dash/src/utils/csvParser").QBImportResult>
```

_No inline documentation provided._

**Example**

```ts
import { mapQuickBooksToExpenses } from '@/utils/csvParser';

const result = mapQuickBooksToExpenses(/* args */);
```

### mapTransactionType

**Import:** `@/utils/importCore`

- Defined in: `utils/importCore.ts`
- Export type: named

```ts
function mapTransactionType(transactionType: string): import("C:/Dev/profitbuild-dash/src/types/expense").TransactionType
```

_No inline documentation provided._

**Example**

```ts
import { mapTransactionType } from '@/utils/importCore';

const result = mapTransactionType(/* args */);
```

### markAsFailed

**Import:** `@/utils/syncQueue`

- Defined in: `utils/syncQueue.ts`
- Export type: named

```ts
function markAsFailed(operationId: string): Promise<void>
```

_No inline documentation provided._

**Example**

```ts
import { markAsFailed } from '@/utils/syncQueue';

const result = markAsFailed(/* args */);
```

### markAsSynced

**Import:** `@/utils/syncQueue`

- Defined in: `utils/syncQueue.ts`
- Export type: named

```ts
function markAsSynced(operationId: string): Promise<void>
```

_No inline documentation provided._

**Example**

```ts
import { markAsSynced } from '@/utils/syncQueue';

const result = markAsSynced(/* args */);
```

### markPayeeAsSynced

**Import:** `@/utils/syncUtils`

- Defined in: `utils/syncUtils.ts`
- Export type: named

```ts
function markPayeeAsSynced(payeeId: string): Promise<{ error: import("C:/Dev/profitbuild-dash/node_modules/@supabase/postgrest-js/dist/cjs/PostgrestError").default; }>
```

_No inline documentation provided._

**Example**

```ts
import { markPayeeAsSynced } from '@/utils/syncUtils';

const result = markPayeeAsSynced(/* args */);
```

### markProjectAsSynced

**Import:** `@/utils/syncUtils`

- Defined in: `utils/syncUtils.ts`
- Export type: named

```ts
function markProjectAsSynced(projectId: string): Promise<{ error: import("C:/Dev/profitbuild-dash/node_modules/@supabase/postgrest-js/dist/cjs/PostgrestError").default; }>
```

_No inline documentation provided._

**Example**

```ts
import { markProjectAsSynced } from '@/utils/syncUtils';

const result = markProjectAsSynced(/* args */);
```

### normalizeAmount

**Import:** `@/utils/importCore`

- Defined in: `utils/importCore.ts`
- Export type: named

```ts
function normalizeAmount(amount: number): string
```

_No inline documentation provided._

**Example**

```ts
import { normalizeAmount } from '@/utils/importCore';

const result = normalizeAmount(/* args */);
```

### normalizeBusinessName

**Import:** `@/utils/fuzzyPayeeMatcher`

- Defined in: `utils/fuzzyPayeeMatcher.ts`
- Export type: named

```ts
function normalizeBusinessName(str: string): string
```

_No inline documentation provided._

**Example**

```ts
import { normalizeBusinessName } from '@/utils/fuzzyPayeeMatcher';

const result = normalizeBusinessName(/* args */);
```

### normalizePayeeNameForDedupe

**Import:** `@/utils/payeeCsvParser`

- Defined in: `utils/payeeCsvParser.ts`
- Export type: named

```ts
function normalizePayeeNameForDedupe(name: string): string
```

Normalize payee name for in-file dedupe (trim, lowercase, collapse spaces). Consistent with exact-match behavior in fuzzyPayeeMatcher.

**Example**

```ts
import { normalizePayeeNameForDedupe } from '@/utils/payeeCsvParser';

const result = normalizePayeeNameForDedupe(/* args */);
```

### normalizeString

**Import:** `@/utils/importCore`

- Defined in: `utils/importCore.ts`
- Export type: named

```ts
function normalizeString(str: string): string
```

_No inline documentation provided._

**Example**

```ts
import { normalizeString } from '@/utils/importCore';

const result = normalizeString(/* args */);
```

### normalizeUnit

**Import:** `@/utils/dbMapping`

- Defined in: `utils/dbMapping.ts`
- Export type: named

```ts
function normalizeUnit(unit: string | null | undefined): string
```

_No inline documentation provided._

**Example**

```ts
import { normalizeUnit } from '@/utils/dbMapping';

const result = normalizeUnit(/* args */);
```

### parseClientCSVFile

**Import:** `@/utils/clientCsvParser`

- Defined in: `utils/clientCsvParser.ts`
- Export type: named

```ts
function parseClientCSVFile(file: File): Promise<import("C:/Dev/profitbuild-dash/src/utils/clientCsvParser").ParsedClientCSV>
```

_No inline documentation provided._

**Example**

```ts
import { parseClientCSVFile } from '@/utils/clientCsvParser';

const result = parseClientCSVFile(/* args */);
```

### parseCronExpression

**Import:** `@/utils/cronBuilder`

- Defined in: `utils/cronBuilder.ts`
- Export type: named

```ts
function parseCronExpression(cronExpression: string): { time: string; }
```

Parse cron expression back to human-readable format (basic)

**Example**

```ts
import { parseCronExpression } from '@/utils/cronBuilder';

const result = parseCronExpression(/* args */);
```

### parseCsvDateForDB

**Import:** `@/utils/dateUtils`

- Defined in: `utils/dateUtils.ts`
- Export type: named

```ts
function parseCsvDateForDB(dateString: string | null | undefined, fallbackToToday: boolean = true): string
```

_No inline documentation provided._

**Example**

```ts
import { parseCsvDateForDB } from '@/utils/dateUtils';

const result = parseCsvDateForDB(/* args */);
```

### parseCSVFile

**Import:** `@/utils/csvParser`

- Defined in: `utils/csvParser.ts`
- Export type: named

```ts
function parseCSVFile(file: File): Promise<import("C:/Dev/profitbuild-dash/src/utils/csvParser").ParseResult>
```

_No inline documentation provided._

**Example**

```ts
import { parseCSVFile } from '@/utils/csvParser';

const result = parseCSVFile(/* args */);
```

### parseDateOnly

**Import:** `@/utils/dateUtils`

- Defined in: `utils/dateUtils.ts`
- Export type: named

```ts
function parseDateOnly(dateInput: string | Date | null | undefined): Date
```

_No inline documentation provided._

**Example**

```ts
import { parseDateOnly } from '@/utils/dateUtils';

const result = parseDateOnly(/* args */);
```

### parseEnhancedQuickBooksCSV

**Import:** `@/utils/enhancedCsvParser`

- Defined in: `utils/enhancedCsvParser.ts`
- Export type: named

```ts
function parseEnhancedQuickBooksCSV(file: File): Promise<{ data: import("C:/Dev/profitbuild-dash/src/utils/enhancedCsvParser").QBTransaction[]; errors: string[]; headers: string[]; }>
```

_No inline documentation provided._

**Example**

```ts
import { parseEnhancedQuickBooksCSV } from '@/utils/enhancedCsvParser';

const result = parseEnhancedQuickBooksCSV(/* args */);
```

### parseExpenseCSVFile

**Import:** `@/utils/expenseCsvParser`

- Defined in: `utils/expenseCsvParser.ts`
- Export type: named

```ts
function parseExpenseCSVFile(file: File): Promise<import("C:/Dev/profitbuild-dash/src/utils/expenseCsvParser").ParsedExpenseCSV>
```

_No inline documentation provided._

**Example**

```ts
import { parseExpenseCSVFile } from '@/utils/expenseCsvParser';

const result = parseExpenseCSVFile(/* args */);
```

### parseLocalDate

**Import:** `@/lib/utils`

- Defined in: `lib/utils.ts`
- Export type: named

```ts
function parseLocalDate(dateString: string | null | undefined): Date
```

Parse a date string extracting only the date portion to avoid timezone shifts.
Handles both ISO format (2025-12-17T00:00:00) and space format (2025-12-17 00:00:00+00).
Returns a local date at midnight for the given calendar date.

**Example**

```ts
import { parseLocalDate } from '@/lib/utils';

const result = parseLocalDate(/* args */);
```

### parseMentions

**Import:** `@/utils/mentionUtils`

- Defined in: `utils/mentionUtils.ts`
- Export type: named

```ts
function parseMentions(text: string): { name: string; userId: string; }[]
```

Parse stored

**Example**

```ts
import { parseMentions } from '@/utils/mentionUtils';

const result = parseMentions(/* args */);
```

### parsePayeeCSVFile

**Import:** `@/utils/payeeCsvParser`

- Defined in: `utils/payeeCsvParser.ts`
- Export type: named

```ts
function parsePayeeCSVFile(file: File): Promise<import("C:/Dev/profitbuild-dash/src/utils/payeeCsvParser").ParsedPayeeCSV>
```

_No inline documentation provided._

**Example**

```ts
import { parsePayeeCSVFile } from '@/utils/payeeCsvParser';

const result = parsePayeeCSVFile(/* args */);
```

### parseQuickBooksAmount

**Import:** `@/utils/importCore`

- Defined in: `utils/importCore.ts`
- Export type: named

```ts
function parseQuickBooksAmount(amount: string | number): number
```

_No inline documentation provided._

**Example**

```ts
import { parseQuickBooksAmount } from '@/utils/importCore';

const result = parseQuickBooksAmount(/* args */);
```

### parseQuickBooksCSV

**Import:** `@/utils/csvParser`

- Defined in: `utils/csvParser.ts`
- Export type: named

```ts
function parseQuickBooksCSV(file: File): Promise<import("C:/Dev/profitbuild-dash/src/utils/csvParser").QBParseResult>
```

_No inline documentation provided._

**Example**

```ts
import { parseQuickBooksCSV } from '@/utils/csvParser';

const result = parseQuickBooksCSV(/* args */);
```

### parseTransactionCSV

**Import:** `@/utils/enhancedTransactionImporter`

- Defined in: `utils/enhancedTransactionImporter.ts`
- Export type: named

```ts
function parseTransactionCSV(file: File): Promise<import("C:/Dev/profitbuild-dash/src/utils/enhancedTransactionImporter").ParsedTransactionData>
```

_No inline documentation provided._

**Example**

```ts
import { parseTransactionCSV } from '@/utils/enhancedTransactionImporter';

const result = parseTransactionCSV(/* args */);
```

### parseUploadedFile

**Import:** `@/services/estimateImportService`

- Defined in: `services/estimateImportService.ts`
- Export type: named

```ts
function parseUploadedFile(file: File): Promise<import("C:/Dev/profitbuild-dash/src/types/importTypes").Grid>
```

_No inline documentation provided._

**Example**

```ts
import { parseUploadedFile } from '@/services/estimateImportService';

const result = parseUploadedFile(/* args */);
```

### parseVideoUrl

**Import:** `@/utils/trainingStorage`

- Defined in: `utils/trainingStorage.ts`
- Export type: named

```ts
function parseVideoUrl(url: string): { platform: string; id: string; }
```

Parse video URL to extract platform and ID

**Example**

```ts
import { parseVideoUrl } from '@/utils/trainingStorage';

const result = parseVideoUrl(/* args */);
```

### processEnhancedQuickBooksImport

**Import:** `@/utils/enhancedCsvParser`

- Defined in: `utils/enhancedCsvParser.ts`
- Export type: named

```ts
function processEnhancedQuickBooksImport(transactions: QBTransaction[], fileName: string): Promise<import("C:/Dev/profitbuild-dash/src/utils/enhancedCsvParser").EnhancedQBImportResult>
```

_No inline documentation provided._

**Example**

```ts
import { processEnhancedQuickBooksImport } from '@/utils/enhancedCsvParser';

const result = processEnhancedQuickBooksImport(/* args */);
```

### processQueue

**Import:** `@/utils/backgroundSync`

- Defined in: `utils/backgroundSync.ts`
- Export type: named

```ts
function processQueue(): Promise<void>
```

_No inline documentation provided._

**Example**

```ts
import { processQueue } from '@/utils/backgroundSync';

const result = processQueue(/* args */);
```

### processQueue

**Import:** `@/utils/syncQueue`

- Defined in: `utils/syncQueue.ts`
- Export type: named

```ts
function processQueue(): Promise<void>
```

_No inline documentation provided._

**Example**

```ts
import { processQueue } from '@/utils/syncQueue';

const result = processQueue(/* args */);
```

### processTransactionImport

**Import:** `@/utils/enhancedTransactionImporter`

- Defined in: `utils/enhancedTransactionImporter.ts`
- Export type: named

```ts
function processTransactionImport(data: TransactionCSVRow[], import_batch_id?: string, options?: { overrideDedup?: Set<string> }): Promise<import("C:/Dev/profitbuild-dash/src/utils/enhancedTransactionImporter").TransactionImportResult>
```

_No inline documentation provided._

**Example**

```ts
import { processTransactionImport } from '@/utils/enhancedTransactionImporter';

const result = processTransactionImport(/* args */);
```

### refreshMediaSignedUrl

**Import:** `@/utils/projectMedia`

- Defined in: `utils/projectMedia.ts`
- Export type: named

```ts
function refreshMediaSignedUrl(mediaId: string): Promise<{ signedUrl: string; thumbnailUrl: string; error: Error; }>
```

Refresh signed URL for a single media item
Used when images fail to load due to expired URLs

**Example**

```ts
import { refreshMediaSignedUrl } from '@/utils/projectMedia';

const result = refreshMediaSignedUrl(/* args */);
```

### resetPayeeSyncStatus

**Import:** `@/utils/syncUtils`

- Defined in: `utils/syncUtils.ts`
- Export type: named

```ts
function resetPayeeSyncStatus(payeeId: string): Promise<{ error: import("C:/Dev/profitbuild-dash/node_modules/@supabase/postgrest-js/dist/cjs/PostgrestError").default; }>
```

_No inline documentation provided._

**Example**

```ts
import { resetPayeeSyncStatus } from '@/utils/syncUtils';

const result = resetPayeeSyncStatus(/* args */);
```

### resetProjectSyncStatus

**Import:** `@/utils/syncUtils`

- Defined in: `utils/syncUtils.ts`
- Export type: named

```ts
function resetProjectSyncStatus(projectId: string): Promise<{ error: import("C:/Dev/profitbuild-dash/node_modules/@supabase/postgrest-js/dist/cjs/PostgrestError").default; }>
```

_No inline documentation provided._

**Example**

```ts
import { resetProjectSyncStatus } from '@/utils/syncUtils';

const result = resetProjectSyncStatus(/* args */);
```

### resolveConflict

**Import:** `@/utils/conflictResolution`

- Defined in: `utils/conflictResolution.ts`
- Export type: named

```ts
function resolveConflict(localId: string, serverData: any): Promise<void>
```

_No inline documentation provided._

**Example**

```ts
import { resolveConflict } from '@/utils/conflictResolution';

const result = resolveConflict(/* args */);
```

### resolveMentions

**Import:** `@/utils/mentionUtils`

- Defined in: `utils/mentionUtils.ts`
- Export type: named

```ts
function resolveMentions(rawText: string, users: MentionableUser[]): { formattedText: string; mentionedUserIds: string[]; }
```

Resolve typed

**Example**

```ts
import { resolveMentions } from '@/utils/mentionUtils';

const result = resolveMentions(/* args */);
```

### resolveQBAccountCategory

**Import:** `@/utils/quickbooksMapping`

- Defined in: `utils/quickbooksMapping.ts`
- Export type: named

```ts
function resolveQBAccountCategory(accountPath: string): import("C:/Dev/profitbuild-dash/src/types/expense").ExpenseCategory
```

_No inline documentation provided._

**Example**

```ts
import { resolveQBAccountCategory } from '@/utils/quickbooksMapping';

const result = resolveQBAccountCategory(/* args */);
```

### revenueHasSplits

**Import:** `@/utils/revenueSplits`

- Defined in: `utils/revenueSplits.ts`
- Export type: named

```ts
function revenueHasSplits(revenueId: string): Promise<boolean>
```

Check if a revenue has splits

**Example**

```ts
import { revenueHasSplits } from '@/utils/revenueSplits';

const result = revenueHasSplits(/* args */);
```

### runValidation

**Import:** `@/lib/kpi-definitions/validation`

- Defined in: `lib/kpi-definitions/validation.ts`
- Export type: named

```ts
function runValidation(): void
```

Run validation and print report (for CLI usage)

**Example**

```ts
import { runValidation } from '@/lib/kpi-definitions/validation';

const result = runValidation(/* args */);
```

### saveReportToProjectDocuments

**Import:** `@/utils/reportStorageUtils`

- Defined in: `utils/reportStorageUtils.ts`
- Export type: named

```ts
function saveReportToProjectDocuments(pdfBlob: Blob, projectId: string, projectNumber: string, reportTitle: string, mediaCount: number): Promise<SaveReportResult>
```

Upload a generated PDF report to Storage and save a record in project_documents.
Used by BOTH the Download and Email delivery paths.

Follows the exact pattern from DocumentUpload.tsx:
- Upload to 'project-documents' bucket
- Get publicUrl for the DB record
- Insert into project_documents table

**Example**

```ts
import { saveReportToProjectDocuments } from '@/utils/reportStorageUtils';

const result = saveReportToProjectDocuments(/* args */);
```

### searchKPIs

**Import:** `@/lib/kpi-definitions`

- Defined in: `lib/kpi-definitions/index.ts`
- Export type: named

```ts
function searchKPIs(term: string): import("C:/Dev/profitbuild-dash/src/lib/kpi-definitions/types").KPIMeasure[]
```

Find all KPIs matching a search term

**Example**

```ts
import { searchKPIs } from '@/lib/kpi-definitions';

const result = searchKPIs(/* args */);
```

### setBudgetAlertThreshold

**Import:** `@/utils/budgetUtils`

- Defined in: `utils/budgetUtils.ts`
- Export type: named

```ts
function setBudgetAlertThreshold(threshold: number): void
```

_No inline documentation provided._

**Example**

```ts
import { setBudgetAlertThreshold } from '@/utils/budgetUtils';

const result = setBudgetAlertThreshold(/* args */);
```

### setCaptionPreferences

**Import:** `@/utils/userPreferences`

- Defined in: `utils/userPreferences.ts`
- Export type: named

```ts
function setCaptionPreferences(prefs: CaptionPreferences): Promise<void>
```

_No inline documentation provided._

**Example**

```ts
import { setCaptionPreferences } from '@/utils/userPreferences';

const result = setCaptionPreferences(/* args */);
```

### setShowSandboxProject

**Import:** `@/utils/sandboxPreferences`

- Defined in: `utils/sandboxPreferences.ts`
- Export type: named

```ts
function setShowSandboxProject(show: boolean): void
```

_No inline documentation provided._

**Example**

```ts
import { setShowSandboxProject } from '@/utils/sandboxPreferences';

const result = setShowSandboxProject(/* args */);
```

### shouldShowInConstructionLists

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
function shouldShowInConstructionLists(category?: ProjectCategory | null): boolean
```

_No inline documentation provided._

**Example**

```ts
import { shouldShowInConstructionLists } from '@/types/project';

const result = shouldShowInConstructionLists(/* args */);
```

### shouldShowInExpenseContext

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
function shouldShowInExpenseContext(category?: ProjectCategory | null): boolean
```

_No inline documentation provided._

**Example**

```ts
import { shouldShowInExpenseContext } from '@/types/project';

const result = shouldShowInExpenseContext(/* args */);
```

### shouldShowInGeneralLists

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
function shouldShowInGeneralLists(projectNumber: string): boolean
```

_No inline documentation provided._

**Example**

```ts
import { shouldShowInGeneralLists } from '@/types/project';

const result = shouldShowInGeneralLists(/* args */);
```

### splitTextAndMentions

**Import:** `@/utils/mentionUtils`

- Defined in: `utils/mentionUtils.ts`
- Export type: named

```ts
function splitTextAndMentions(text: string): ({ type: "text"; content: string; } | { type: "mention"; name: string; userId: string; })[]
```

Render note text with mentions as an array of React-renderable parts.
Mentions become objects with name/userId; plain text stays as strings.

**Example**

```ts
import { splitTextAndMentions } from '@/utils/mentionUtils';

const result = splitTextAndMentions(/* args */);
```

### startSyncService

**Import:** `@/utils/backgroundSync`

- Defined in: `utils/backgroundSync.ts`
- Export type: named

```ts
function startSyncService(): void
```

_No inline documentation provided._

**Example**

```ts
import { startSyncService } from '@/utils/backgroundSync';

const result = startSyncService(/* args */);
```

### suggestCategoryFromAccountName

**Import:** `@/utils/importCore`

- Defined in: `utils/importCore.ts`
- Export type: named

```ts
function suggestCategoryFromAccountName(accountFullName: string): import("C:/Dev/profitbuild-dash/src/types/expense").ExpenseCategory
```

_No inline documentation provided._

**Example**

```ts
import { suggestCategoryFromAccountName } from '@/utils/importCore';

const result = suggestCategoryFromAccountName(/* args */);
```

### suggestLineItemAllocation

**Import:** `@/utils/expenseAllocation`

- Defined in: `utils/expenseAllocation.ts`
- Export type: named

```ts
function suggestLineItemAllocation(expense: EnhancedExpense, lineItems: LineItemForMatching[]): string
```

_No inline documentation provided._

**Example**

```ts
import { suggestLineItemAllocation } from '@/utils/expenseAllocation';

const result = suggestLineItemAllocation(/* args */);
```

### tokenSimilarity

**Import:** `@/utils/fuzzyPayeeMatcher`

- Defined in: `utils/fuzzyPayeeMatcher.ts`
- Export type: named

```ts
function tokenSimilarity(str1: string, str2: string): number
```

_No inline documentation provided._

**Example**

```ts
import { tokenSimilarity } from '@/utils/fuzzyPayeeMatcher';

const result = tokenSimilarity(/* args */);
```

### unapproveEstimateSideEffects

**Import:** `@/utils/estimateApproval`

- Defined in: `utils/estimateApproval.ts`
- Export type: named

```ts
function unapproveEstimateSideEffects(projectId: string): Promise<void>
```

Side effects of REVERTING an approved estimate back to non-approved status
(e.g. reopen-as-draft, reject, expire). Clears `contracted_amount` and
reverts project status if safe.

Not used by the new form buttons (the form only writes forward statuses),
but kept here so `EstimateStatusActions` can share the logic.

**Example**

```ts
import { unapproveEstimateSideEffects } from '@/utils/estimateApproval';

const result = unapproveEstimateSideEffects(/* args */);
```

### unlinkReceiptFromExpense

**Import:** `@/utils/receiptLinking`

- Defined in: `utils/receiptLinking.ts`
- Export type: named

```ts
function unlinkReceiptFromExpense({ expenseId }: UnlinkReceiptParams): Promise<void>
```

Unlink a receipt from an expense

**Example**

```ts
import { unlinkReceiptFromExpense } from '@/utils/receiptLinking';

const result = unlinkReceiptFromExpense(/* args */);
```

### updateBidMediaMetadata

**Import:** `@/utils/bidMedia`

- Defined in: `utils/bidMedia.ts`
- Export type: named

```ts
function updateBidMediaMetadata(mediaId: string, updates: {
    caption?: string;
    description?: string;
  }): Promise<{ data: import("C:/Dev/profitbuild-dash/src/types/bid").BidMedia; error: Error; }>
```

Update bid media metadata (caption, description)

**Example**

```ts
import { updateBidMediaMetadata } from '@/utils/bidMedia';

const result = updateBidMediaMetadata(/* args */);
```

### updateCompanyBranding

**Import:** `@/utils/companyBranding`

- Defined in: `utils/companyBranding.ts`
- Export type: named

```ts
function updateCompanyBranding(branding: Partial<CompanyBranding>): Promise<{ error: any; }>
```

_No inline documentation provided._

**Example**

```ts
import { updateCompanyBranding } from '@/utils/companyBranding';

const result = updateCompanyBranding(/* args */);
```

### updateExpenseSplits

**Import:** `@/utils/expenseSplits`

- Defined in: `utils/expenseSplits.ts`
- Export type: named

```ts
function updateExpenseSplits(expenseId: string, splits: CreateSplitInput[]): Promise<{ success: boolean; error?: string; }>
```

Update splits for an expense (deletes old splits and creates new ones)

**Example**

```ts
import { updateExpenseSplits } from '@/utils/expenseSplits';

const result = updateExpenseSplits(/* args */);
```

### updateMediaMetadata

**Import:** `@/utils/projectMedia`

- Defined in: `utils/projectMedia.ts`
- Export type: named

```ts
function updateMediaMetadata(mediaId: string, updates: {
    caption?: string;
    description?: string;
    location_name?: string;
  }): Promise<{ data: import("C:/Dev/profitbuild-dash/src/types/project").ProjectMedia; error: Error; }>
```

Update media metadata (caption, description, location)

**Example**

```ts
import { updateMediaMetadata } from '@/utils/projectMedia';

const result = updateMediaMetadata(/* args */);
```

### updateOperationStatus

**Import:** `@/utils/syncQueue`

- Defined in: `utils/syncQueue.ts`
- Export type: named

```ts
function updateOperationStatus(operationId: string, status: QueuedOperation['status']): Promise<void>
```

_No inline documentation provided._

**Example**

```ts
import { updateOperationStatus } from '@/utils/syncQueue';

const result = updateOperationStatus(/* args */);
```

### updateRevenueSplits

**Import:** `@/utils/revenueSplits`

- Defined in: `utils/revenueSplits.ts`
- Export type: named

```ts
function updateRevenueSplits(revenueId: string, splits: CreateRevenueSplitInput[]): Promise<import("C:/Dev/profitbuild-dash/src/types/revenue").RevenueSplitResult>
```

Update splits for a revenue (deletes old splits and creates new ones)

**Example**

```ts
import { updateRevenueSplits } from '@/utils/revenueSplits';

const result = updateRevenueSplits(/* args */);
```

### uploadLogo

**Import:** `@/utils/companyBranding`

- Defined in: `utils/companyBranding.ts`
- Export type: named

```ts
function uploadLogo(file: File, variant: 'full' | 'icon' | 'stacked' | 'report-header'): Promise<string>
```

_No inline documentation provided._

**Example**

```ts
import { uploadLogo } from '@/utils/companyBranding';

const result = uploadLogo(/* args */);
```

### uploadProjectMedia

**Import:** `@/utils/projectMedia`

- Defined in: `utils/projectMedia.ts`
- Export type: named

```ts
function uploadProjectMedia(params: UploadProjectMediaParams): Promise<import("C:/Dev/profitbuild-dash/src/utils/projectMedia").UploadProjectMediaResult>
```

Upload media file to project-media bucket and create database record

**Example**

```ts
import { uploadProjectMedia } from '@/utils/projectMedia';

const result = uploadProjectMedia(/* args */);
```

### uploadTrainingFile

**Import:** `@/utils/trainingStorage`

- Defined in: `utils/trainingStorage.ts`
- Export type: named

```ts
function uploadTrainingFile(file: File, contentType: 'document' | 'presentation'): Promise<import("C:/Dev/profitbuild-dash/src/utils/trainingStorage").UploadResult>
```

Upload a training content file to Supabase storage

**Example**

```ts
import { uploadTrainingFile } from '@/utils/trainingStorage';

const result = uploadTrainingFile(/* args */);
```

### validateAudioBlob

**Import:** `@/utils/audioConverter`

- Defined in: `utils/audioConverter.ts`
- Export type: named

```ts
function validateAudioBlob(blob: Blob): Promise<boolean>
```

Validate that a blob contains valid audio data

**Example**

```ts
import { validateAudioBlob } from '@/utils/audioConverter';

const result = validateAudioBlob(/* args */);
```

### validateClientCSVData

**Import:** `@/utils/clientCsvParser`

- Defined in: `utils/clientCsvParser.ts`
- Export type: named

```ts
function validateClientCSVData(data: ClientCSVRow[], mapping: ClientColumnMapping): string[]
```

_No inline documentation provided._

**Example**

```ts
import { validateClientCSVData } from '@/utils/clientCsvParser';

const result = validateClientCSVData(/* args */);
```

### validateContractFields

**Import:** `@/utils/contractValidation`

- Defined in: `utils/contractValidation.ts`
- Export type: named

```ts
function validateContractFields(fieldValues: ContractFieldValues): import("C:/Dev/profitbuild-dash/src/types/contract").ContractFieldValidation
```

_No inline documentation provided._

**Example**

```ts
import { validateContractFields } from '@/utils/contractValidation';

const result = validateContractFields(/* args */);
```

### validateCSVData

**Import:** `@/utils/csvParser`

- Defined in: `utils/csvParser.ts`
- Export type: named

```ts
function validateCSVData(data: CSVRow[], mapping: ColumnMapping): string[]
```

_No inline documentation provided._

**Example**

```ts
import { validateCSVData } from '@/utils/csvParser';

const result = validateCSVData(/* args */);
```

### validateExpenseCSVData

**Import:** `@/utils/expenseCsvParser`

- Defined in: `utils/expenseCsvParser.ts`
- Export type: named

```ts
function validateExpenseCSVData(data: ExpenseCSVRow[], mapping: ExpenseColumnMapping, selectedProjectId?: string): string[]
```

_No inline documentation provided._

**Example**

```ts
import { validateExpenseCSVData } from '@/utils/expenseCsvParser';

const result = validateExpenseCSVData(/* args */);
```

### validateExpensesForCorrelation

**Import:** `@/utils/expenseValidation`

- Defined in: `utils/expenseValidation.ts`
- Export type: named

```ts
function validateExpensesForCorrelation<T extends Pick<Expense, 'is_split' | 'project_id' | 'project_number'> & { category?: ProjectCategory }>(expenses: T[]): { valid: T[]; invalid: { expense: T; reason: string; }[]; }
```

Validates a batch of expenses for correlation
Returns list of invalid expenses with reasons

**Example**

```ts
import { validateExpensesForCorrelation } from '@/utils/expenseValidation';

const result = validateExpensesForCorrelation(/* args */);
```

### validateKPIDefinitions

**Import:** `@/lib/kpi-definitions/validation`

- Defined in: `lib/kpi-definitions/validation.ts`
- Export type: named

```ts
function validateKPIDefinitions(): import("C:/Dev/profitbuild-dash/src/lib/kpi-definitions/types").ValidationResult
```

Run all validations and return results

**Example**

```ts
import { validateKPIDefinitions } from '@/lib/kpi-definitions/validation';

const result = validateKPIDefinitions(/* args */);
```

### validateMediaFile

**Import:** `@/utils/mediaMetadata`

- Defined in: `utils/mediaMetadata.ts`
- Export type: named

```ts
function validateMediaFile(file: File): import("C:/Dev/profitbuild-dash/src/utils/mediaMetadata").ValidationResult
```

Validate media file type and size (supports images, videos, and documents)

**Example**

```ts
import { validateMediaFile } from '@/utils/mediaMetadata';

const result = validateMediaFile(/* args */);
```

### validateMediaItems

**Import:** `@/utils/pdfHelpers`

- Defined in: `utils/pdfHelpers.ts`
- Export type: named

```ts
function validateMediaItems(items: ProjectMedia[]): { valid: import("C:/Dev/profitbuild-dash/src/types/project").ProjectMedia[]; invalid: import("C:/Dev/profitbuild-dash/src/types/project").ProjectMedia[]; }
```

_No inline documentation provided._

**Example**

```ts
import { validateMediaItems } from '@/utils/pdfHelpers';

const result = validateMediaItems(/* args */);
```

### validatePayeeCSVData

**Import:** `@/utils/payeeCsvParser`

- Defined in: `utils/payeeCsvParser.ts`
- Export type: named

```ts
function validatePayeeCSVData(data: PayeeCSVRow[], mapping: PayeeColumnMapping): string[]
```

_No inline documentation provided._

**Example**

```ts
import { validatePayeeCSVData } from '@/utils/payeeCsvParser';

const result = validatePayeeCSVData(/* args */);
```

### validateProjectMargin

**Import:** `@/utils/marginValidation`

- Defined in: `utils/marginValidation.ts`
- Export type: named

```ts
function validateProjectMargin(project: {
    adjusted_est_costs?: number | null;
    original_est_costs?: number | null;
    contracted_amount?: number | null;
    adjusted_est_margin?: number | null;
  }, quoteLineItems?: Array<{ total_cost: number | null; total: number | null }>): string[]
```

Run all margin validation checks and return any warnings

**Example**

```ts
import { validateProjectMargin } from '@/utils/marginValidation';

const result = validateProjectMargin(/* args */);
```

### validateSplitTotal

**Import:** `@/utils/expenseSplits`

- Defined in: `utils/expenseSplits.ts`
- Export type: named

```ts
function validateSplitTotal(expenseAmount: number, splitAmounts: number[]): { valid: boolean; error?: string; }
```

Validate that split amounts sum to the expense total
Allows 0.01 tolerance for rounding errors

**Example**

```ts
import { validateSplitTotal } from '@/utils/expenseSplits';

const result = validateSplitTotal(/* args */);
```

### validateSplitTotal

**Import:** `@/utils/revenueSplits`

- Defined in: `utils/revenueSplits.ts`
- Export type: named

```ts
function validateSplitTotal(revenueAmount: number, splitAmounts: number[]): import("C:/Dev/profitbuild-dash/src/types/revenue").SplitValidationResult
```

Validate that split amounts sum to the revenue total
Allows tolerance for rounding errors

**Example**

```ts
import { validateSplitTotal } from '@/utils/revenueSplits';

const result = validateSplitTotal(/* args */);
```

### validateTimeEntryHours

**Import:** `@/utils/timeEntryValidation`

- Defined in: `utils/timeEntryValidation.ts`
- Export type: named

```ts
function validateTimeEntryHours(startTime: Date, endTime: Date): { valid: boolean; message?: string; }
```

_No inline documentation provided._

**Example**

```ts
import { validateTimeEntryHours } from '@/utils/timeEntryValidation';

const result = validateTimeEntryHours(/* args */);
```

### validateTimeEntryHoursV2

**Import:** `@/utils/timeEntryValidation`

- Defined in: `utils/timeEntryValidation.ts`
- Export type: named

```ts
function validateTimeEntryHoursV2(startTime: Date, endTime: Date): { valid: boolean; message?: string; isOvernight?: boolean; }
```

_No inline documentation provided._

**Example**

```ts
import { validateTimeEntryHoursV2 } from '@/utils/timeEntryValidation';

const result = validateTimeEntryHoursV2(/* args */);
```

### validateTotals

**Import:** `@/lib/budgetSheetParser`

- Defined in: `lib/budgetSheetParser.ts`
- Export type: named

```ts
function validateTotals(items: ExtractedLineItem[], grid: Grid, columns: BudgetColumns): import("C:/Dev/profitbuild-dash/src/types/importTypes").ImportWarning[]
```

_No inline documentation provided._

**Example**

```ts
import { validateTotals } from '@/lib/budgetSheetParser';

const result = validateTotals(/* args */);
```

### validateUnitCompatibility

**Import:** `@/utils/units`

- Defined in: `utils/units.ts`
- Export type: named

```ts
function validateUnitCompatibility(estimateUnit: string | null, quoteUnit: string | null): { isCompatible: boolean; message: string; }
```

_No inline documentation provided._

**Example**

```ts
import { validateUnitCompatibility } from '@/utils/units';

const result = validateUnitCompatibility(/* args */);
```

## Classes

Total: 2

### ErrorBoundary

**Import:** `@/components/ui/error-boundary`

- Defined in: `components/ui/error-boundary.tsx`
- Export type: default

```ts
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState>
```

_No inline documentation provided._

**Example**

```ts
import ErrorBoundary from '@/components/ui/error-boundary';

const instance = new ErrorBoundary(/* args */);
```

### ScheduleErrorBoundary

**Import:** `@/components/schedule/ScheduleErrorBoundary`

- Defined in: `components/schedule/ScheduleErrorBoundary.tsx`
- Export type: named

```ts
class ScheduleErrorBoundary extends Component<Props, State>
```

Error boundary to catch and handle schedule feature errors
Prevents entire app crash if schedule feature fails

**Example**

```ts
import { ScheduleErrorBoundary } from '@/components/schedule/ScheduleErrorBoundary';

const instance = new ScheduleErrorBoundary(/* args */);
```

## Interfaces

Total: 265

### AIKPIContext

**Import:** `@/lib/kpi-definitions/types`

- Defined in: `lib/kpi-definitions/types.ts`
- Export type: named

```ts
interface AIKPIContext
```

Structured context for AI prompts

**Example**

```ts
import type { AIKPIContext } from '@/lib/kpi-definitions/types';

type Example = AIKPIContext;
```

### AIMessage

**Import:** `@/hooks/useAIReportAssistant`

- Defined in: `hooks/useAIReportAssistant.ts`
- Export type: named

```ts
interface AIMessage
```

_No inline documentation provided._

**Example**

```ts
import type { AIMessage } from '@/hooks/useAIReportAssistant';

type Example = AIMessage;
```

### AIReportResult

**Import:** `@/hooks/useAIReportAssistant`

- Defined in: `hooks/useAIReportAssistant.ts`
- Export type: named

```ts
interface AIReportResult
```

_No inline documentation provided._

**Example**

```ts
import type { AIReportResult } from '@/hooks/useAIReportAssistant';

type Example = AIReportResult;
```

### AllocatedExpense

**Import:** `@/components/profit-analysis/hooks/useProjectFinancialDetail`

- Defined in: `components/profit-analysis/hooks/useProjectFinancialDetail.ts`
- Export type: named

```ts
interface AllocatedExpense
```

_No inline documentation provided._

**Example**

```ts
import type { AllocatedExpense } from '@/components/profit-analysis/hooks/useProjectFinancialDetail';

type Example = AllocatedExpense;
```

### AllocationSummary

**Import:** `@/components/profit-analysis/hooks/useProjectFinancialDetail`

- Defined in: `components/profit-analysis/hooks/useProjectFinancialDetail.ts`
- Export type: named

```ts
interface AllocationSummary
```

_No inline documentation provided._

**Example**

```ts
import type { AllocationSummary } from '@/components/profit-analysis/hooks/useProjectFinancialDetail';

type Example = AllocationSummary;
```

### BadgeProps

**Import:** `@/components/ui/badge`

- Defined in: `components/ui/badge.tsx`
- Export type: named

```ts
interface BadgeProps
```

_No inline documentation provided._

**Example**

```ts
import type { BadgeProps } from '@/components/ui/badge';

type Example = BadgeProps;
```

### Benchmark

**Import:** `@/lib/kpi-definitions/business-benchmarks`

- Defined in: `lib/kpi-definitions/business-benchmarks.ts`
- Export type: named

```ts
interface Benchmark
```

Business Benchmarks

Centralized thresholds the AI references for contextual insights.
Update these as RCG's targets evolve.

**Example**

```ts
import type { Benchmark } from '@/lib/kpi-definitions/business-benchmarks';

type Example = Benchmark;
```

### BidMedia

**Import:** `@/types/bid`

- Defined in: `types/bid.ts`
- Export type: named

```ts
interface BidMedia
```

_No inline documentation provided._

**Example**

```ts
import type { BidMedia } from '@/types/bid';

type Example = BidMedia;
```

### BidNote

**Import:** `@/types/bid`

- Defined in: `types/bid.ts`
- Export type: named

```ts
interface BidNote
```

_No inline documentation provided._

**Example**

```ts
import type { BidNote } from '@/types/bid';

type Example = BidNote;
```

### BidSearchFilters

**Import:** `@/components/BidFilters`

- Defined in: `components/BidFilters.tsx`
- Export type: named

```ts
interface BidSearchFilters
```

_No inline documentation provided._

**Example**

```ts
import type { BidSearchFilters } from '@/components/BidFilters';

type Example = BidSearchFilters;
```

### BranchBid

**Import:** `@/types/bid`

- Defined in: `types/bid.ts`
- Export type: named

```ts
interface BranchBid
```

_No inline documentation provided._

**Example**

```ts
import type { BranchBid } from '@/types/bid';

type Example = BranchBid;
```

### BrandedLoaderProps

**Import:** `@/components/ui/branded-loader`

- Defined in: `components/ui/branded-loader.tsx`
- Export type: named

```ts
interface BrandedLoaderProps
```

_No inline documentation provided._

**Example**

```ts
import type { BrandedLoaderProps } from '@/components/ui/branded-loader';

type Example = BrandedLoaderProps;
```

### BrandingColors

**Import:** `@/types/branding`

- Defined in: `types/branding.ts`
- Export type: named

```ts
interface BrandingColors
```

_No inline documentation provided._

**Example**

```ts
import type { BrandingColors } from '@/types/branding';

type Example = BrandingColors;
```

### BudgetColumns

**Import:** `@/types/importTypes`

- Defined in: `types/importTypes.ts`
- Export type: named

```ts
interface BudgetColumns
```

_No inline documentation provided._

**Example**

```ts
import type { BudgetColumns } from '@/types/importTypes';

type Example = BudgetColumns;
```

### BusinessRule

**Import:** `@/lib/kpi-definitions/types`

- Defined in: `lib/kpi-definitions/types.ts`
- Export type: named

```ts
interface BusinessRule
```

Critical business rules the AI must follow

**Example**

```ts
import type { BusinessRule } from '@/lib/kpi-definitions/types';

type Example = BusinessRule;
```

### ButtonProps

**Import:** `@/components/ui/button`

- Defined in: `components/ui/button.tsx`
- Export type: named

```ts
interface ButtonProps
```

_No inline documentation provided._

**Example**

```ts
import type { ButtonProps } from '@/components/ui/button';

type Example = ButtonProps;
```

### CaptionPreferences

**Import:** `@/utils/userPreferences`

- Defined in: `utils/userPreferences.ts`
- Export type: named

```ts
interface CaptionPreferences
```

_No inline documentation provided._

**Example**

```ts
import type { CaptionPreferences } from '@/utils/userPreferences';

type Example = CaptionPreferences;
```

### CategorizedTransaction

**Import:** `@/components/import/TransactionSelectionTable`

- Defined in: `components/import/TransactionSelectionTable.tsx`
- Export type: named

```ts
interface CategorizedTransaction
```

_No inline documentation provided._

**Example**

```ts
import type { CategorizedTransaction } from '@/components/import/TransactionSelectionTable';

type Example = CategorizedTransaction;
```

### CategoryCostComparison

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
interface CategoryCostComparison
```

_No inline documentation provided._

**Example**

```ts
import type { CategoryCostComparison } from '@/utils/quoteFinancials';

type Example = CategoryCostComparison;
```

### CategorySummary

**Import:** `@/components/profit-analysis/hooks/useProjectFinancialDetail`

- Defined in: `components/profit-analysis/hooks/useProjectFinancialDetail.ts`
- Export type: named

```ts
interface CategorySummary
```

_No inline documentation provided._

**Example**

```ts
import type { CategorySummary } from '@/components/profit-analysis/hooks/useProjectFinancialDetail';

type Example = CategorySummary;
```

### CategoryVariance

**Import:** `@/hooks/useVarianceCalculation`

- Defined in: `hooks/useVarianceCalculation.ts`
- Export type: named

```ts
interface CategoryVariance
```

_No inline documentation provided._

**Example**

```ts
import type { CategoryVariance } from '@/hooks/useVarianceCalculation';

type Example = CategoryVariance;
```

### ChangeOrderLineItemInput

**Import:** `@/types/changeOrder`

- Defined in: `types/changeOrder.ts`
- Export type: named

```ts
interface ChangeOrderLineItemInput
```

_No inline documentation provided._

**Example**

```ts
import type { ChangeOrderLineItemInput } from '@/types/changeOrder';

type Example = ChangeOrderLineItemInput;
```

### ClassifiedPayee

**Import:** `@/utils/payeeImportMatcher`

- Defined in: `utils/payeeImportMatcher.ts`
- Export type: named

```ts
interface ClassifiedPayee
```

_No inline documentation provided._

**Example**

```ts
import type { ClassifiedPayee } from '@/utils/payeeImportMatcher';

type Example = ClassifiedPayee;
```

### Client

**Import:** `@/types/client`

- Defined in: `types/client.ts`
- Export type: named

```ts
interface Client
```

_No inline documentation provided._

**Example**

```ts
import type { Client } from '@/types/client';

type Example = Client;
```

### ClientColumnMapping

**Import:** `@/utils/clientCsvParser`

- Defined in: `utils/clientCsvParser.ts`
- Export type: named

```ts
interface ClientColumnMapping
```

_No inline documentation provided._

**Example**

```ts
import type { ClientColumnMapping } from '@/utils/clientCsvParser';

type Example = ClientColumnMapping;
```

### ClientCSVRow

**Import:** `@/utils/clientCsvParser`

- Defined in: `utils/clientCsvParser.ts`
- Export type: named

```ts
interface ClientCSVRow
```

_No inline documentation provided._

**Example**

```ts
import type { ClientCSVRow } from '@/utils/clientCsvParser';

type Example = ClientCSVRow;
```

### ClientImportData

**Import:** `@/utils/clientCsvParser`

- Defined in: `utils/clientCsvParser.ts`
- Export type: named

```ts
interface ClientImportData
```

_No inline documentation provided._

**Example**

```ts
import type { ClientImportData } from '@/utils/clientCsvParser';

type Example = ClientImportData;
```

### ClientMatchInfo

**Import:** `@/utils/enhancedCsvParser`

- Defined in: `utils/enhancedCsvParser.ts`
- Export type: named

```ts
interface ClientMatchInfo
```

_No inline documentation provided._

**Example**

```ts
import type { ClientMatchInfo } from '@/utils/enhancedCsvParser';

type Example = ClientMatchInfo;
```

### ClientMatchResult

**Import:** `@/utils/importCore`

- Defined in: `utils/importCore.ts`
- Export type: named

```ts
interface ClientMatchResult
```

_No inline documentation provided._

**Example**

```ts
import type { ClientMatchResult } from '@/utils/importCore';

type Example = ClientMatchResult;
```

### ClientsListRef

**Import:** `@/components/ClientsList`

- Defined in: `components/ClientsList.tsx`
- Export type: named

```ts
interface ClientsListRef
```

_No inline documentation provided._

**Example**

```ts
import type { ClientsListRef } from '@/components/ClientsList';

type Example = ClientsListRef;
```

### ColumnMapping

**Import:** `@/types/expense`

- Defined in: `types/expense.ts`
- Export type: named

```ts
interface ColumnMapping
```

_No inline documentation provided._

**Example**

```ts
import type { ColumnMapping } from '@/types/expense';

type Example = ColumnMapping;
```

### ColumnMappingResult

**Import:** `@/types/importTypes`

- Defined in: `types/importTypes.ts`
- Export type: named

```ts
interface ColumnMappingResult
```

_No inline documentation provided._

**Example**

```ts
import type { ColumnMappingResult } from '@/types/importTypes';

type Example = ColumnMappingResult;
```

### CompanyBranding

**Import:** `@/types/branding`

- Defined in: `types/branding.ts`
- Export type: named

```ts
interface CompanyBranding
```

_No inline documentation provided._

**Example**

```ts
import type { CompanyBranding } from '@/types/branding';

type Example = CompanyBranding;
```

### CompanyBranding

**Import:** `@/utils/companyBranding`

- Defined in: `utils/companyBranding.ts`
- Export type: named

```ts
interface CompanyBranding
```

_No inline documentation provided._

**Example**

```ts
import type { CompanyBranding } from '@/utils/companyBranding';

type Example = CompanyBranding;
```

### CompanySetting

**Import:** `@/types/companySettings`

- Defined in: `types/companySettings.ts`
- Export type: named

```ts
interface CompanySetting
```

_No inline documentation provided._

**Example**

```ts
import type { CompanySetting } from '@/types/companySettings';

type Example = CompanySetting;
```

### ComparisonData

**Import:** `@/types/quote`

- Defined in: `types/quote.ts`
- Export type: named

```ts
interface ComparisonData
```

_No inline documentation provided._

**Example**

```ts
import type { ComparisonData } from '@/types/quote';

type Example = ComparisonData;
```

### ConstructionPhase

**Import:** `@/components/schedule/utils/constructionSequences`

- Defined in: `components/schedule/utils/constructionSequences.ts`
- Export type: named

```ts
interface ConstructionPhase
```

Construction-specific sequencing logic and validation
Based on industry standards and building code requirements

**Example**

```ts
import type { ConstructionPhase } from '@/components/schedule/utils/constructionSequences';

type Example = ConstructionPhase;
```

### Contract

**Import:** `@/types/contract`

- Defined in: `types/contract.ts`
- Export type: named

```ts
interface Contract
```

Contract record from database

**Example**

```ts
import type { Contract } from '@/types/contract';

type Example = Contract;
```

### ContractDetails

**Import:** `@/types/contract`

- Defined in: `types/contract.ts`
- Export type: named

```ts
interface ContractDetails
```

Contract details for generation

**Example**

```ts
import type { ContractDetails } from '@/types/contract';

type Example = ContractDetails;
```

### ContractFieldValidation

**Import:** `@/types/contract`

- Defined in: `types/contract.ts`
- Export type: named

```ts
interface ContractFieldValidation
```

Validation result for contract fields

**Example**

```ts
import type { ContractFieldValidation } from '@/types/contract';

type Example = ContractFieldValidation;
```

### ContractFieldValues

**Import:** `@/types/contract`

- Defined in: `types/contract.ts`
- Export type: named

```ts
interface ContractFieldValues
```

Complete contract field values for generation

**Example**

```ts
import type { ContractFieldValues } from '@/types/contract';

type Example = ContractFieldValues;
```

### ContractGenerationRequest

**Import:** `@/types/contract`

- Defined in: `types/contract.ts`
- Export type: named

```ts
interface ContractGenerationRequest
```

Contract generation request payload

**Example**

```ts
import type { ContractGenerationRequest } from '@/types/contract';

type Example = ContractGenerationRequest;
```

### ContractGenerationResponse

**Import:** `@/types/contract`

- Defined in: `types/contract.ts`
- Export type: named

```ts
interface ContractGenerationResponse
```

Contract generation response

**Example**

```ts
import type { ContractGenerationResponse } from '@/types/contract';

type Example = ContractGenerationResponse;
```

### CostBucket

**Import:** `@/hooks/useProjectCostBuckets`

- Defined in: `hooks/useProjectCostBuckets.ts`
- Export type: named

```ts
interface CostBucket
```

_No inline documentation provided._

**Example**

```ts
import type { CostBucket } from '@/hooks/useProjectCostBuckets';

type Example = CostBucket;
```

### CostBucketLineItem

**Import:** `@/hooks/useProjectCostBuckets`

- Defined in: `hooks/useProjectCostBuckets.ts`
- Export type: named

```ts
interface CostBucketLineItem
```

Per-line item cost bucket detail (rows that appear inside an expanded bucket).

On labor lines, hours/billingRate/cushionAmount are populated from
estimate_line_items columns (labor_hours, billing_rate_per_hour, labor_cushion_amount).
On non-labor lines, acceptedQuote is populated from useLineItemControl's quotes array
if any matching quote is in 'accepted' status.

**Example**

```ts
import type { CostBucketLineItem } from '@/hooks/useProjectCostBuckets';

type Example = CostBucketLineItem;
```

### CostVarianceResult

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
interface CostVarianceResult
```

_No inline documentation provided._

**Example**

```ts
import type { CostVarianceResult } from '@/utils/quoteFinancials';

type Example = CostVarianceResult;
```

### CreateAssignmentData

**Import:** `@/types/training`

- Defined in: `types/training.ts`
- Export type: named

```ts
interface CreateAssignmentData
```

_No inline documentation provided._

**Example**

```ts
import type { CreateAssignmentData } from '@/types/training';

type Example = CreateAssignmentData;
```

### CreateBidNoteParams

**Import:** `@/types/bid`

- Defined in: `types/bid.ts`
- Export type: named

```ts
interface CreateBidNoteParams
```

_No inline documentation provided._

**Example**

```ts
import type { CreateBidNoteParams } from '@/types/bid';

type Example = CreateBidNoteParams;
```

### CreateBranchBidParams

**Import:** `@/types/bid`

- Defined in: `types/bid.ts`
- Export type: named

```ts
interface CreateBranchBidParams
```

_No inline documentation provided._

**Example**

```ts
import type { CreateBranchBidParams } from '@/types/bid';

type Example = CreateBranchBidParams;
```

### CreateClientRequest

**Import:** `@/types/client`

- Defined in: `types/client.ts`
- Export type: named

```ts
interface CreateClientRequest
```

_No inline documentation provided._

**Example**

```ts
import type { CreateClientRequest } from '@/types/client';

type Example = CreateClientRequest;
```

### CreateCompletionData

**Import:** `@/types/training`

- Defined in: `types/training.ts`
- Export type: named

```ts
interface CreateCompletionData
```

_No inline documentation provided._

**Example**

```ts
import type { CreateCompletionData } from '@/types/training';

type Example = CreateCompletionData;
```

### CreatePayeeData

**Import:** `@/types/payee`

- Defined in: `types/payee.ts`
- Export type: named

```ts
interface CreatePayeeData
```

_No inline documentation provided._

**Example**

```ts
import type { CreatePayeeData } from '@/types/payee';

type Example = CreatePayeeData;
```

### CreateProjectRequest

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
interface CreateProjectRequest
```

_No inline documentation provided._

**Example**

```ts
import type { CreateProjectRequest } from '@/types/project';

type Example = CreateProjectRequest;
```

### CreateProjectRevenueData

**Import:** `@/types/revenue`

- Defined in: `types/revenue.ts`
- Export type: named

```ts
interface CreateProjectRevenueData
```

Data required to create a new revenue record
UPDATED: Added is_split flag

**Example**

```ts
import type { CreateProjectRevenueData } from '@/types/revenue';

type Example = CreateProjectRevenueData;
```

### CreateRevenueSplitInput

**Import:** `@/types/revenue`

- Defined in: `types/revenue.ts`
- Export type: named

```ts
interface CreateRevenueSplitInput
```

Input type for creating a new revenue split

**Example**

```ts
import type { CreateRevenueSplitInput } from '@/types/revenue';

type Example = CreateRevenueSplitInput;
```

### CreateSplitInput

**Import:** `@/utils/expenseSplits`

- Defined in: `utils/expenseSplits.ts`
- Export type: named

```ts
interface CreateSplitInput
```

_No inline documentation provided._

**Example**

```ts
import type { CreateSplitInput } from '@/utils/expenseSplits';

type Example = CreateSplitInput;
```

### CreateTrainingContentData

**Import:** `@/types/training`

- Defined in: `types/training.ts`
- Export type: named

```ts
interface CreateTrainingContentData
```

_No inline documentation provided._

**Example**

```ts
import type { CreateTrainingContentData } from '@/types/training';

type Example = CreateTrainingContentData;
```

### CSVRow

**Import:** `@/types/expense`

- Defined in: `types/expense.ts`
- Export type: named

```ts
interface CSVRow
```

_No inline documentation provided._

**Example**

```ts
import type { CSVRow } from '@/types/expense';

type Example = CSVRow;
```

### DateFieldProps

**Import:** `@/components/time-entry-form/fields/DateField`

- Defined in: `components/time-entry-form/fields/DateField.tsx`
- Export type: named

```ts
interface DateFieldProps
```

_No inline documentation provided._

**Example**

```ts
import type { DateFieldProps } from '@/components/time-entry-form/fields/DateField';

type Example = DateFieldProps;
```

### DedupePayeesResult

**Import:** `@/utils/payeeCsvParser`

- Defined in: `utils/payeeCsvParser.ts`
- Export type: named

```ts
interface DedupePayeesResult
```

_No inline documentation provided._

**Example**

```ts
import type { DedupePayeesResult } from '@/utils/payeeCsvParser';

type Example = DedupePayeesResult;
```

### EmployeeAuditRow

**Import:** `@/hooks/useEmployeesAudit`

- Defined in: `hooks/useEmployeesAudit.ts`
- Export type: named

```ts
interface EmployeeAuditRow
```

_No inline documentation provided._

**Example**

```ts
import type { EmployeeAuditRow } from '@/hooks/useEmployeesAudit';

type Example = EmployeeAuditRow;
```

### EnhancedExpense

**Import:** `@/utils/expenseAllocation`

- Defined in: `utils/expenseAllocation.ts`
- Export type: named

```ts
interface EnhancedExpense
```

_No inline documentation provided._

**Example**

```ts
import type { EnhancedExpense } from '@/utils/expenseAllocation';

type Example = EnhancedExpense;
```

### EnhancedQBImportResult

**Import:** `@/utils/enhancedCsvParser`

- Defined in: `utils/enhancedCsvParser.ts`
- Export type: named

```ts
interface EnhancedQBImportResult
```

_No inline documentation provided._

**Example**

```ts
import type { EnhancedQBImportResult } from '@/utils/enhancedCsvParser';

type Example = EnhancedQBImportResult;
```

### EnhancementOptions

**Import:** `@/hooks/useAICaptionEnhancement`

- Defined in: `hooks/useAICaptionEnhancement.ts`
- Export type: named

```ts
interface EnhancementOptions
```

_No inline documentation provided._

**Example**

```ts
import type { EnhancementOptions } from '@/hooks/useAICaptionEnhancement';

type Example = EnhancementOptions;
```

### EnhancementResult

**Import:** `@/hooks/useAICaptionEnhancement`

- Defined in: `hooks/useAICaptionEnhancement.ts`
- Export type: named

```ts
interface EnhancementResult
```

_No inline documentation provided._

**Example**

```ts
import type { EnhancementResult } from '@/hooks/useAICaptionEnhancement';

type Example = EnhancementResult;
```

### EnrichedLineItem

**Import:** `@/types/importTypes`

- Defined in: `types/importTypes.ts`
- Export type: named

```ts
interface EnrichedLineItem
```

_No inline documentation provided._

**Example**

```ts
import type { EnrichedLineItem } from '@/types/importTypes';

type Example = EnrichedLineItem;
```

### Estimate

**Import:** `@/types/estimate`

- Defined in: `types/estimate.ts`
- Export type: named

```ts
interface Estimate
```

_No inline documentation provided._

**Example**

```ts
import type { Estimate } from '@/types/estimate';

type Example = Estimate;
```

### EstimateFinancialMetrics

**Import:** `@/utils/estimateFinancials`

- Defined in: `utils/estimateFinancials.ts`
- Export type: named

```ts
interface EstimateFinancialMetrics
```

_No inline documentation provided._

**Example**

```ts
import type { EstimateFinancialMetrics } from '@/utils/estimateFinancials';

type Example = EstimateFinancialMetrics;
```

### EstimateLineItemQuoteStatus

**Import:** `@/hooks/useEstimateQuoteStatus`

- Defined in: `hooks/useEstimateQuoteStatus.ts`
- Export type: named

```ts
interface EstimateLineItemQuoteStatus
```

_No inline documentation provided._

**Example**

```ts
import type { EstimateLineItemQuoteStatus } from '@/hooks/useEstimateQuoteStatus';

type Example = EstimateLineItemQuoteStatus;
```

### EstimateQuoteStatusSummary

**Import:** `@/hooks/useEstimateQuoteStatus`

- Defined in: `hooks/useEstimateQuoteStatus.ts`
- Export type: named

```ts
interface EstimateQuoteStatusSummary
```

_No inline documentation provided._

**Example**

```ts
import type { EstimateQuoteStatusSummary } from '@/hooks/useEstimateQuoteStatus';

type Example = EstimateQuoteStatusSummary;
```

### EstimatesCardViewProps

**Import:** `@/components/EstimatesCardView`

- Defined in: `components/EstimatesCardView.tsx`
- Export type: named

```ts
interface EstimatesCardViewProps
```

_No inline documentation provided._

**Example**

```ts
import type { EstimatesCardViewProps } from '@/components/EstimatesCardView';

type Example = EstimatesCardViewProps;
```

### EstimateVersion

**Import:** `@/types/estimate`

- Defined in: `types/estimate.ts`
- Export type: named

```ts
interface EstimateVersion
```

_No inline documentation provided._

**Example**

```ts
import type { EstimateVersion } from '@/types/estimate';

type Example = EstimateVersion;
```

### Expense

**Import:** `@/types/expense`

- Defined in: `types/expense.ts`
- Export type: named

```ts
interface Expense
```

_No inline documentation provided._

**Example**

```ts
import type { Expense } from '@/types/expense';

type Example = Expense;
```

### ExpenseColumnMapping

**Import:** `@/utils/expenseCsvParser`

- Defined in: `utils/expenseCsvParser.ts`
- Export type: named

```ts
interface ExpenseColumnMapping
```

_No inline documentation provided._

**Example**

```ts
import type { ExpenseColumnMapping } from '@/utils/expenseCsvParser';

type Example = ExpenseColumnMapping;
```

### ExpenseCSVRow

**Import:** `@/utils/expenseCsvParser`

- Defined in: `utils/expenseCsvParser.ts`
- Export type: named

```ts
interface ExpenseCSVRow
```

_No inline documentation provided._

**Example**

```ts
import type { ExpenseCSVRow } from '@/utils/expenseCsvParser';

type Example = ExpenseCSVRow;
```

### ExpenseImportData

**Import:** `@/utils/enhancedTransactionImporter`

- Defined in: `utils/enhancedTransactionImporter.ts`
- Export type: named

```ts
interface ExpenseImportData
```

_No inline documentation provided._

**Example**

```ts
import type { ExpenseImportData } from '@/utils/enhancedTransactionImporter';

type Example = ExpenseImportData;
```

### ExpenseImportData

**Import:** `@/utils/expenseCsvParser`

- Defined in: `utils/expenseCsvParser.ts`
- Export type: named

```ts
interface ExpenseImportData
```

_No inline documentation provided._

**Example**

```ts
import type { ExpenseImportData } from '@/utils/expenseCsvParser';

type Example = ExpenseImportData;
```

### ExpenseLineItemCorrelation

**Import:** `@/types/revenue`

- Defined in: `types/revenue.ts`
- Export type: named

```ts
interface ExpenseLineItemCorrelation
```

_No inline documentation provided._

**Example**

```ts
import type { ExpenseLineItemCorrelation } from '@/types/revenue';

type Example = ExpenseLineItemCorrelation;
```

### ExpensesListRef

**Import:** `@/components/ExpensesList`

- Defined in: `components/ExpensesList.tsx`
- Export type: named

```ts
interface ExpensesListRef
```

_No inline documentation provided._

**Example**

```ts
import type { ExpensesListRef } from '@/components/ExpensesList';

type Example = ExpensesListRef;
```

### ExpenseSplit

**Import:** `@/types/expense`

- Defined in: `types/expense.ts`
- Export type: named

```ts
interface ExpenseSplit
```

_No inline documentation provided._

**Example**

```ts
import type { ExpenseSplit } from '@/types/expense';

type Example = ExpenseSplit;
```

### ExpensesQueryFilters

**Import:** `@/hooks/useExpensesQuery`

- Defined in: `hooks/useExpensesQuery.ts`
- Export type: named

```ts
interface ExpensesQueryFilters
```

_No inline documentation provided._

**Example**

```ts
import type { ExpensesQueryFilters } from '@/hooks/useExpensesQuery';

type Example = ExpensesQueryFilters;
```

### ExportOptions

**Import:** `@/utils/reportExporter`

- Defined in: `utils/reportExporter.ts`
- Export type: named

```ts
interface ExportOptions
```

_No inline documentation provided._

**Example**

```ts
import type { ExportOptions } from '@/utils/reportExporter';

type Example = ExportOptions;
```

### ExtractedLineItem

**Import:** `@/types/importTypes`

- Defined in: `types/importTypes.ts`
- Export type: named

```ts
interface ExtractedLineItem
```

_No inline documentation provided._

**Example**

```ts
import type { ExtractedLineItem } from '@/types/importTypes';

type Example = ExtractedLineItem;
```

### ExtractionResult

**Import:** `@/types/importTypes`

- Defined in: `types/importTypes.ts`
- Export type: named

```ts
interface ExtractionResult
```

_No inline documentation provided._

**Example**

```ts
import type { ExtractionResult } from '@/types/importTypes';

type Example = ExtractionResult;
```

### FeatureFlags

**Import:** `@/lib/featureFlags`

- Defined in: `lib/featureFlags.ts`
- Export type: named

```ts
interface FeatureFlags
```

Feature flag system for safe rollout of new features
Flags can be controlled via environment variables or database

**Example**

```ts
import type { FeatureFlags } from '@/lib/featureFlags';

type Example = FeatureFlags;
```

### FewShotExample

**Import:** `@/lib/kpi-definitions/types`

- Defined in: `lib/kpi-definitions/types.ts`
- Export type: named

```ts
interface FewShotExample
```

_No inline documentation provided._

**Example**

```ts
import type { FewShotExample } from '@/lib/kpi-definitions/types';

type Example = FewShotExample;
```

### FieldMetadata

**Import:** `@/components/reports/SimpleReportBuilder`

- Defined in: `components/reports/SimpleReportBuilder.tsx`
- Export type: named

```ts
interface FieldMetadata
```

_No inline documentation provided._

**Example**

```ts
import type { FieldMetadata } from '@/components/reports/SimpleReportBuilder';

type Example = FieldMetadata;
```

### FilterOption

**Import:** `@/hooks/useReportFilterOptions`

- Defined in: `hooks/useReportFilterOptions.ts`
- Export type: named

```ts
interface FilterOption
```

_No inline documentation provided._

**Example**

```ts
import type { FilterOption } from '@/hooks/useReportFilterOptions';

type Example = FilterOption;
```

### FinancialTableColumn

**Import:** `@/components/FinancialTableTemplate`

- Defined in: `components/FinancialTableTemplate.tsx`
- Export type: named

```ts
interface FinancialTableColumn
```

_No inline documentation provided._

**Example**

```ts
import type { FinancialTableColumn } from '@/components/FinancialTableTemplate';

type Example = FinancialTableColumn;
```

### FinancialTableGroup

**Import:** `@/components/FinancialTableTemplate`

- Defined in: `components/FinancialTableTemplate.tsx`
- Export type: named

```ts
interface FinancialTableGroup
```

_No inline documentation provided._

**Example**

```ts
import type { FinancialTableGroup } from '@/components/FinancialTableTemplate';

type Example = FinancialTableGroup;
```

### FuzzyMatchResult

**Import:** `@/utils/fuzzyPayeeMatcher`

- Defined in: `utils/fuzzyPayeeMatcher.ts`
- Export type: named

```ts
interface FuzzyMatchResult
```

_No inline documentation provided._

**Example**

```ts
import type { FuzzyMatchResult } from '@/utils/fuzzyPayeeMatcher';

type Example = FuzzyMatchResult;
```

### GeneratedContractForQuote

**Import:** `@/components/QuoteForm`

- Defined in: `components/QuoteForm.tsx`
- Export type: named

```ts
interface GeneratedContractForQuote
```

Minimal contract shape for showing generated contracts in the Quote Document section

**Example**

```ts
import type { GeneratedContractForQuote } from '@/components/QuoteForm';

type Example = GeneratedContractForQuote;
```

### HeaderAction

**Import:** `@/components/ui/mobile-responsive-header`

- Defined in: `components/ui/mobile-responsive-header.tsx`
- Export type: named

```ts
interface HeaderAction
```

_No inline documentation provided._

**Example**

```ts
import type { HeaderAction } from '@/components/ui/mobile-responsive-header';

type Example = HeaderAction;
```

### HoursDisplayProps

**Import:** `@/components/time-entry-form/fields/HoursDisplay`

- Defined in: `components/time-entry-form/fields/HoursDisplay.tsx`
- Export type: named

```ts
interface HoursDisplayProps
```

_No inline documentation provided._

**Example**

```ts
import type { HoursDisplayProps } from '@/components/time-entry-form/fields/HoursDisplay';

type Example = HoursDisplayProps;
```

### ImportOptions

**Import:** `@/services/estimateImportService`

- Defined in: `services/estimateImportService.ts`
- Export type: named

```ts
interface ImportOptions
```

_No inline documentation provided._

**Example**

```ts
import type { ImportOptions } from '@/services/estimateImportService';

type Example = ImportOptions;
```

### ImportResult

**Import:** `@/types/importTypes`

- Defined in: `types/importTypes.ts`
- Export type: named

```ts
interface ImportResult
```

_No inline documentation provided._

**Example**

```ts
import type { ImportResult } from '@/types/importTypes';

type Example = ImportResult;
```

### ImportState

**Import:** `@/types/importTypes`

- Defined in: `types/importTypes.ts`
- Export type: named

```ts
interface ImportState
```

_No inline documentation provided._

**Example**

```ts
import type { ImportState } from '@/types/importTypes';

type Example = ImportState;
```

### ImportSummary

**Import:** `@/types/importTypes`

- Defined in: `types/importTypes.ts`
- Export type: named

```ts
interface ImportSummary
```

_No inline documentation provided._

**Example**

```ts
import type { ImportSummary } from '@/types/importTypes';

type Example = ImportSummary;
```

### ImportWarning

**Import:** `@/types/importTypes`

- Defined in: `types/importTypes.ts`
- Export type: named

```ts
interface ImportWarning
```

_No inline documentation provided._

**Example**

```ts
import type { ImportWarning } from '@/types/importTypes';

type Example = ImportWarning;
```

### InternalLaborRates

**Import:** `@/types/companySettings`

- Defined in: `types/companySettings.ts`
- Export type: named

```ts
interface InternalLaborRates
```

_No inline documentation provided._

**Example**

```ts
import type { InternalLaborRates } from '@/types/companySettings';

type Example = InternalLaborRates;
```

### KPIMeasure

**Import:** `@/lib/kpi-definitions/types`

- Defined in: `lib/kpi-definitions/types.ts`
- Export type: named

```ts
interface KPIMeasure
```

Core KPI measure definition

**Example**

```ts
import type { KPIMeasure } from '@/lib/kpi-definitions/types';

type Example = KPIMeasure;
```

### LaborCalculationInput

**Import:** `@/utils/laborCalculations`

- Defined in: `utils/laborCalculations.ts`
- Export type: named

```ts
interface LaborCalculationInput
```

_No inline documentation provided._

**Example**

```ts
import type { LaborCalculationInput } from '@/utils/laborCalculations';

type Example = LaborCalculationInput;
```

### LaborCalculationResult

**Import:** `@/utils/laborCalculations`

- Defined in: `utils/laborCalculations.ts`
- Export type: named

```ts
interface LaborCalculationResult
```

_No inline documentation provided._

**Example**

```ts
import type { LaborCalculationResult } from '@/utils/laborCalculations';

type Example = LaborCalculationResult;
```

### LaborCushionState

**Import:** `@/hooks/useProjectCostBuckets`

- Defined in: `hooks/useProjectCostBuckets.ts`
- Export type: named

```ts
interface LaborCushionState
```

Dynamic labor cushion state, computed per render from actual hours vs. estimate.

`bakedIn` is the static cushion from estimate_financial_summary.total_labor_cushion
(computed at estimate finalization). `remaining` shrinks as actual hours exceed the
estimated hours, since each overage hour costs actual_cost_rate without earning any
billing/actual rate spread:

  if actual <= estHours        → remaining = bakedIn (cushion intact)
  if estHours < actual <= cap  → remaining = bakedIn − (actual − estHours) × actualCostRate
  if actual > cap              → remaining = 0 (the excess past capacity becomes a real loss)

**Example**

```ts
import type { LaborCushionState } from '@/hooks/useProjectCostBuckets';

type Example = LaborCushionState;
```

### LaborRateSettings

**Import:** `@/types/companySettings`

- Defined in: `types/companySettings.ts`
- Export type: named

```ts
interface LaborRateSettings
```

_No inline documentation provided._

**Example**

```ts
import type { LaborRateSettings } from '@/types/companySettings';

type Example = LaborRateSettings;
```

### LegacyEstimate

**Import:** `@/types/estimate`

- Defined in: `types/estimate.ts`
- Export type: named

```ts
interface LegacyEstimate
```

_No inline documentation provided._

**Example**

```ts
import type { LegacyEstimate } from '@/types/estimate';

type Example = LegacyEstimate;
```

### LegacyExpense

**Import:** `@/types/expense`

- Defined in: `types/expense.ts`
- Export type: named

```ts
interface LegacyExpense
```

_No inline documentation provided._

**Example**

```ts
import type { LegacyExpense } from '@/types/expense';

type Example = LegacyExpense;
```

### LineItem

**Import:** `@/types/estimate`

- Defined in: `types/estimate.ts`
- Export type: named

```ts
interface LineItem
```

_No inline documentation provided._

**Example**

```ts
import type { LineItem } from '@/types/estimate';

type Example = LineItem;
```

### LineItemAllocationDetail

**Import:** `@/components/profit-analysis/hooks/useProjectFinancialDetail`

- Defined in: `components/profit-analysis/hooks/useProjectFinancialDetail.ts`
- Export type: named

```ts
interface LineItemAllocationDetail
```

_No inline documentation provided._

**Example**

```ts
import type { LineItemAllocationDetail } from '@/components/profit-analysis/hooks/useProjectFinancialDetail';

type Example = LineItemAllocationDetail;
```

### LineItemControlData

**Import:** `@/hooks/useLineItemControl`

- Defined in: `hooks/useLineItemControl.ts`
- Export type: named

```ts
interface LineItemControlData
```

_No inline documentation provided._

**Example**

```ts
import type { LineItemControlData } from '@/hooks/useLineItemControl';

type Example = LineItemControlData;
```

### LineItemControlSummary

**Import:** `@/hooks/useLineItemControl`

- Defined in: `hooks/useLineItemControl.ts`
- Export type: named

```ts
interface LineItemControlSummary
```

_No inline documentation provided._

**Example**

```ts
import type { LineItemControlSummary } from '@/hooks/useLineItemControl';

type Example = LineItemControlSummary;
```

### LineItemDetail

**Import:** `@/hooks/useVarianceCalculation`

- Defined in: `hooks/useVarianceCalculation.ts`
- Export type: named

```ts
interface LineItemDetail
```

_No inline documentation provided._

**Example**

```ts
import type { LineItemDetail } from '@/hooks/useVarianceCalculation';

type Example = LineItemDetail;
```

### LineItemDetail

**Import:** `@/components/profit-analysis/hooks/useProjectFinancialDetail`

- Defined in: `components/profit-analysis/hooks/useProjectFinancialDetail.ts`
- Export type: named

```ts
interface LineItemDetail
```

_No inline documentation provided._

**Example**

```ts
import type { LineItemDetail } from '@/components/profit-analysis/hooks/useProjectFinancialDetail';

type Example = LineItemDetail;
```

### LineItemForMatching

**Import:** `@/utils/expenseAllocation`

- Defined in: `utils/expenseAllocation.ts`
- Export type: named

```ts
interface LineItemForMatching
```

_No inline documentation provided._

**Example**

```ts
import type { LineItemForMatching } from '@/utils/expenseAllocation';

type Example = LineItemForMatching;
```

### LinkReceiptParams

**Import:** `@/utils/receiptLinking`

- Defined in: `utils/receiptLinking.ts`
- Export type: named

```ts
interface LinkReceiptParams
```

_No inline documentation provided._

**Example**

```ts
import type { LinkReceiptParams } from '@/utils/receiptLinking';

type Example = LinkReceiptParams;
```

### LoadingSpinnerProps

**Import:** `@/components/ui/loading-spinner`

- Defined in: `components/ui/loading-spinner.tsx`
- Export type: named

```ts
interface LoadingSpinnerProps
```

_No inline documentation provided._

**Example**

```ts
import type { LoadingSpinnerProps } from '@/components/ui/loading-spinner';

type Example = LoadingSpinnerProps;
```

### LunchSectionProps

**Import:** `@/components/time-entry-form/fields/LunchSection`

- Defined in: `components/time-entry-form/fields/LunchSection.tsx`
- Export type: named

```ts
interface LunchSectionProps
```

_No inline documentation provided._

**Example**

```ts
import type { LunchSectionProps } from '@/components/time-entry-form/fields/LunchSection';

type Example = LunchSectionProps;
```

### ManualTimeEntryFormProps

**Import:** `@/components/time-entry-form/ManualTimeEntryForm`

- Defined in: `components/time-entry-form/ManualTimeEntryForm.tsx`
- Export type: named

```ts
interface ManualTimeEntryFormProps
```

_No inline documentation provided._

**Example**

```ts
import type { ManualTimeEntryFormProps } from '@/components/time-entry-form/ManualTimeEntryForm';

type Example = ManualTimeEntryFormProps;
```

### ManualTimeEntrySheetProps

**Import:** `@/components/time-entry-form/ManualTimeEntrySheet`

- Defined in: `components/time-entry-form/ManualTimeEntrySheet.tsx`
- Export type: named

```ts
interface ManualTimeEntrySheetProps
```

_No inline documentation provided._

**Example**

```ts
import type { ManualTimeEntrySheetProps } from '@/components/time-entry-form/ManualTimeEntrySheet';

type Example = ManualTimeEntrySheetProps;
```

### MarginComparisonData

**Import:** `@/types/quote`

- Defined in: `types/quote.ts`
- Export type: named

```ts
interface MarginComparisonData
```

_No inline documentation provided._

**Example**

```ts
import type { MarginComparisonData } from '@/types/quote';

type Example = MarginComparisonData;
```

### MarginThreshold

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
interface MarginThreshold
```

_No inline documentation provided._

**Example**

```ts
import type { MarginThreshold } from '@/types/project';

type Example = MarginThreshold;
```

### MatchLogEntry

**Import:** `@/utils/enhancedTransactionImporter`

- Defined in: `utils/enhancedTransactionImporter.ts`
- Export type: named

```ts
interface MatchLogEntry
```

_No inline documentation provided._

**Example**

```ts
import type { MatchLogEntry } from '@/utils/enhancedTransactionImporter';

type Example = MatchLogEntry;
```

### MentionableUser

**Import:** `@/types/notification`

- Defined in: `types/notification.ts`
- Export type: named

```ts
interface MentionableUser
```

_No inline documentation provided._

**Example**

```ts
import type { MentionableUser } from '@/types/notification';

type Example = MentionableUser;
```

### MobileListCardAction

**Import:** `@/components/ui/mobile-list-card`

- Defined in: `components/ui/mobile-list-card.tsx`
- Export type: named

```ts
interface MobileListCardAction
```

_No inline documentation provided._

**Example**

```ts
import type { MobileListCardAction } from '@/components/ui/mobile-list-card';

type Example = MobileListCardAction;
```

### MobileListCardBadge

**Import:** `@/components/ui/mobile-list-card`

- Defined in: `components/ui/mobile-list-card.tsx`
- Export type: named

```ts
interface MobileListCardBadge
```

_No inline documentation provided._

**Example**

```ts
import type { MobileListCardBadge } from '@/components/ui/mobile-list-card';

type Example = MobileListCardBadge;
```

### MobileListCardMetric

**Import:** `@/components/ui/mobile-list-card`

- Defined in: `components/ui/mobile-list-card.tsx`
- Export type: named

```ts
interface MobileListCardMetric
```

_No inline documentation provided._

**Example**

```ts
import type { MobileListCardMetric } from '@/components/ui/mobile-list-card';

type Example = MobileListCardMetric;
```

### MobileListCardProps

**Import:** `@/components/ui/mobile-list-card`

- Defined in: `components/ui/mobile-list-card.tsx`
- Export type: named

```ts
interface MobileListCardProps
```

_No inline documentation provided._

**Example**

```ts
import type { MobileListCardProps } from '@/components/ui/mobile-list-card';

type Example = MobileListCardProps;
```

### MyTrainingItem

**Import:** `@/types/training`

- Defined in: `types/training.ts`
- Export type: named

```ts
interface MyTrainingItem
```

_No inline documentation provided._

**Example**

```ts
import type { MyTrainingItem } from '@/types/training';

type Example = MyTrainingItem;
```

### NativeSelectProps

**Import:** `@/components/ui/native-select`

- Defined in: `components/ui/native-select.tsx`
- Export type: named

```ts
interface NativeSelectProps
```

_No inline documentation provided._

**Example**

```ts
import type { NativeSelectProps } from '@/components/ui/native-select';

type Example = NativeSelectProps;
```

### NavGroup

**Import:** `@/components/project-detail/projectNavigation`

- Defined in: `components/project-detail/projectNavigation.ts`
- Export type: named

```ts
interface NavGroup
```

_No inline documentation provided._

**Example**

```ts
import type { NavGroup } from '@/components/project-detail/projectNavigation';

type Example = NavGroup;
```

### NavItem

**Import:** `@/components/project-detail/projectNavigation`

- Defined in: `components/project-detail/projectNavigation.ts`
- Export type: named

```ts
interface NavItem
```

_No inline documentation provided._

**Example**

```ts
import type { NavItem } from '@/components/project-detail/projectNavigation';

type Example = NavItem;
```

### NoteComposerProps

**Import:** `@/components/notes/NoteComposer`

- Defined in: `components/notes/NoteComposer.tsx`
- Export type: named

```ts
interface NoteComposerProps
```

_No inline documentation provided._

**Example**

```ts
import type { NoteComposerProps } from '@/components/notes/NoteComposer';

type Example = NoteComposerProps;
```

### NotificationResult

**Import:** `@/types/training`

- Defined in: `types/training.ts`
- Export type: named

```ts
interface NotificationResult
```

_No inline documentation provided._

**Example**

```ts
import type { NotificationResult } from '@/types/training';

type Example = NotificationResult;
```

### OverlapCheckResult

**Import:** `@/utils/timeEntryValidation`

- Defined in: `utils/timeEntryValidation.ts`
- Export type: named

```ts
interface OverlapCheckResult
```

_No inline documentation provided._

**Example**

```ts
import type { OverlapCheckResult } from '@/utils/timeEntryValidation';

type Example = OverlapCheckResult;
```

### OvernightIndicatorProps

**Import:** `@/components/time-entry-form/fields/OvernightIndicator`

- Defined in: `components/time-entry-form/fields/OvernightIndicator.tsx`
- Export type: named

```ts
interface OvernightIndicatorProps
```

_No inline documentation provided._

**Example**

```ts
import type { OvernightIndicatorProps } from '@/components/time-entry-form/fields/OvernightIndicator';

type Example = OvernightIndicatorProps;
```

### ParsedClientCSV

**Import:** `@/utils/clientCsvParser`

- Defined in: `utils/clientCsvParser.ts`
- Export type: named

```ts
interface ParsedClientCSV
```

_No inline documentation provided._

**Example**

```ts
import type { ParsedClientCSV } from '@/utils/clientCsvParser';

type Example = ParsedClientCSV;
```

### ParsedExpenseCSV

**Import:** `@/utils/expenseCsvParser`

- Defined in: `utils/expenseCsvParser.ts`
- Export type: named

```ts
interface ParsedExpenseCSV
```

_No inline documentation provided._

**Example**

```ts
import type { ParsedExpenseCSV } from '@/utils/expenseCsvParser';

type Example = ParsedExpenseCSV;
```

### ParsedPayeeCSV

**Import:** `@/utils/payeeCsvParser`

- Defined in: `utils/payeeCsvParser.ts`
- Export type: named

```ts
interface ParsedPayeeCSV
```

_No inline documentation provided._

**Example**

```ts
import type { ParsedPayeeCSV } from '@/utils/payeeCsvParser';

type Example = ParsedPayeeCSV;
```

### ParsedTransactionData

**Import:** `@/utils/enhancedTransactionImporter`

- Defined in: `utils/enhancedTransactionImporter.ts`
- Export type: named

```ts
interface ParsedTransactionData
```

_No inline documentation provided._

**Example**

```ts
import type { ParsedTransactionData } from '@/utils/enhancedTransactionImporter';

type Example = ParsedTransactionData;
```

### ParseResult

**Import:** `@/utils/csvParser`

- Defined in: `utils/csvParser.ts`
- Export type: named

```ts
interface ParseResult
```

_No inline documentation provided._

**Example**

```ts
import type { ParseResult } from '@/utils/csvParser';

type Example = ParseResult;
```

### PartialClient

**Import:** `@/utils/importCore`

- Defined in: `utils/importCore.ts`
- Export type: named

```ts
interface PartialClient
```

_No inline documentation provided._

**Example**

```ts
import type { PartialClient } from '@/utils/importCore';

type Example = PartialClient;
```

### PartialPayee

**Import:** `@/utils/fuzzyPayeeMatcher`

- Defined in: `utils/fuzzyPayeeMatcher.ts`
- Export type: named

```ts
interface PartialPayee
```

_No inline documentation provided._

**Example**

```ts
import type { PartialPayee } from '@/utils/fuzzyPayeeMatcher';

type Example = PartialPayee;
```

### PartialProject

**Import:** `@/utils/importCore`

- Defined in: `utils/importCore.ts`
- Export type: named

```ts
interface PartialProject
```

_No inline documentation provided._

**Example**

```ts
import type { PartialProject } from '@/utils/importCore';

type Example = PartialProject;
```

### Payee

**Import:** `@/types/payee`

- Defined in: `types/payee.ts`
- Export type: named

```ts
interface Payee
```

_No inline documentation provided._

**Example**

```ts
import type { Payee } from '@/types/payee';

type Example = Payee;
```

### PayeeColumnMapping

**Import:** `@/utils/payeeCsvParser`

- Defined in: `utils/payeeCsvParser.ts`
- Export type: named

```ts
interface PayeeColumnMapping
```

_No inline documentation provided._

**Example**

```ts
import type { PayeeColumnMapping } from '@/utils/payeeCsvParser';

type Example = PayeeColumnMapping;
```

### PayeeCSVRow

**Import:** `@/utils/payeeCsvParser`

- Defined in: `utils/payeeCsvParser.ts`
- Export type: named

```ts
interface PayeeCSVRow
```

_No inline documentation provided._

**Example**

```ts
import type { PayeeCSVRow } from '@/utils/payeeCsvParser';

type Example = PayeeCSVRow;
```

### PayeeImportData

**Import:** `@/utils/payeeCsvParser`

- Defined in: `utils/payeeCsvParser.ts`
- Export type: named

```ts
interface PayeeImportData
```

_No inline documentation provided._

**Example**

```ts
import type { PayeeImportData } from '@/utils/payeeCsvParser';

type Example = PayeeImportData;
```

### PayeeMatch

**Import:** `@/utils/fuzzyPayeeMatcher`

- Defined in: `utils/fuzzyPayeeMatcher.ts`
- Export type: named

```ts
interface PayeeMatch
```

_No inline documentation provided._

**Example**

```ts
import type { PayeeMatch } from '@/utils/fuzzyPayeeMatcher';

type Example = PayeeMatch;
```

### PayeeMatchInfo

**Import:** `@/utils/csvParser`

- Defined in: `utils/csvParser.ts`
- Export type: named

```ts
interface PayeeMatchInfo
```

_No inline documentation provided._

**Example**

```ts
import type { PayeeMatchInfo } from '@/utils/csvParser';

type Example = PayeeMatchInfo;
```

### PayeeMatchInfo

**Import:** `@/utils/enhancedTransactionImporter`

- Defined in: `utils/enhancedTransactionImporter.ts`
- Export type: named

```ts
interface PayeeMatchInfo
```

_No inline documentation provided._

**Example**

```ts
import type { PayeeMatchInfo } from '@/utils/enhancedTransactionImporter';

type Example = PayeeMatchInfo;
```

### PayeesListRef

**Import:** `@/components/PayeesList`

- Defined in: `components/PayeesList.tsx`
- Export type: named

```ts
interface PayeesListRef
```

_No inline documentation provided._

**Example**

```ts
import type { PayeesListRef } from '@/components/PayeesList';

type Example = PayeesListRef;
```

### PaymentApplicationLineWithSOV

**Import:** `@/types/paymentApplication`

- Defined in: `types/paymentApplication.ts`
- Export type: named

```ts
interface PaymentApplicationLineWithSOV
```

_No inline documentation provided._

**Example**

```ts
import type { PaymentApplicationLineWithSOV } from '@/types/paymentApplication';

type Example = PaymentApplicationLineWithSOV;
```

### PaymentApplicationWithLines

**Import:** `@/types/paymentApplication`

- Defined in: `types/paymentApplication.ts`
- Export type: named

```ts
interface PaymentApplicationWithLines
```

_No inline documentation provided._

**Example**

```ts
import type { PaymentApplicationWithLines } from '@/types/paymentApplication';

type Example = PaymentApplicationWithLines;
```

### PdfSaveResult

**Import:** `@/utils/paymentApplicationPdf`

- Defined in: `utils/paymentApplicationPdf.ts`
- Export type: named

```ts
interface PdfSaveResult
```

_No inline documentation provided._

**Example**

```ts
import type { PdfSaveResult } from '@/utils/paymentApplicationPdf';

type Example = PdfSaveResult;
```

### PendingClientReview

**Import:** `@/utils/enhancedTransactionImporter`

- Defined in: `utils/enhancedTransactionImporter.ts`
- Export type: named

```ts
interface PendingClientReview
```

_No inline documentation provided._

**Example**

```ts
import type { PendingClientReview } from '@/utils/enhancedTransactionImporter';

type Example = PendingClientReview;
```

### PendingPayeeReview

**Import:** `@/utils/enhancedTransactionImporter`

- Defined in: `utils/enhancedTransactionImporter.ts`
- Export type: named

```ts
interface PendingPayeeReview
```

_No inline documentation provided._

**Example**

```ts
import type { PendingPayeeReview } from '@/utils/enhancedTransactionImporter';

type Example = PendingPayeeReview;
```

### ProfitAnalysisProject

**Import:** `@/types/profitAnalysis`

- Defined in: `types/profitAnalysis.ts`
- Export type: named

```ts
interface ProfitAnalysisProject
```

_No inline documentation provided._

**Example**

```ts
import type { ProfitAnalysisProject } from '@/types/profitAnalysis';

type Example = ProfitAnalysisProject;
```

### ProfitAnalyticsSummary

**Import:** `@/types/profit`

- Defined in: `types/profit.ts`
- Export type: named

```ts
interface ProfitAnalyticsSummary
```

_No inline documentation provided._

**Example**

```ts
import type { ProfitAnalyticsSummary } from '@/types/profit';

type Example = ProfitAnalyticsSummary;
```

### ProfitSummaryTotals

**Import:** `@/types/profitAnalysis`

- Defined in: `types/profitAnalysis.ts`
- Export type: named

```ts
interface ProfitSummaryTotals
```

_No inline documentation provided._

**Example**

```ts
import type { ProfitSummaryTotals } from '@/types/profitAnalysis';

type Example = ProfitSummaryTotals;
```

### ProfitTrend

**Import:** `@/types/profit`

- Defined in: `types/profit.ts`
- Export type: named

```ts
interface ProfitTrend
```

_No inline documentation provided._

**Example**

```ts
import type { ProfitTrend } from '@/types/profit';

type Example = ProfitTrend;
```

### Project

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
interface Project
```

_No inline documentation provided._

**Example**

```ts
import type { Project } from '@/types/project';

type Example = Project;
```

### ProjectAlias

**Import:** `@/utils/importCore`

- Defined in: `utils/importCore.ts`
- Export type: named

```ts
interface ProjectAlias
```

_No inline documentation provided._

**Example**

```ts
import type { ProjectAlias } from '@/utils/importCore';

type Example = ProjectAlias;
```

### ProjectDocument

**Import:** `@/types/document`

- Defined in: `types/document.ts`
- Export type: named

```ts
interface ProjectDocument
```

_No inline documentation provided._

**Example**

```ts
import type { ProjectDocument } from '@/types/document';

type Example = ProjectDocument;
```

### ProjectExpenseSummary

**Import:** `@/types/expense`

- Defined in: `types/expense.ts`
- Export type: named

```ts
interface ProjectExpenseSummary
```

_No inline documentation provided._

**Example**

```ts
import type { ProjectExpenseSummary } from '@/types/expense';

type Example = ProjectExpenseSummary;
```

### ProjectFinancialDetail

**Import:** `@/components/profit-analysis/hooks/useProjectFinancialDetail`

- Defined in: `components/profit-analysis/hooks/useProjectFinancialDetail.ts`
- Export type: named

```ts
interface ProjectFinancialDetail
```

_No inline documentation provided._

**Example**

```ts
import type { ProjectFinancialDetail } from '@/components/profit-analysis/hooks/useProjectFinancialDetail';

type Example = ProjectFinancialDetail;
```

### ProjectFinancialSummary

**Import:** `@/types/revenue`

- Defined in: `types/revenue.ts`
- Export type: named

```ts
interface ProjectFinancialSummary
```

_No inline documentation provided._

**Example**

```ts
import type { ProjectFinancialSummary } from '@/types/revenue';

type Example = ProjectFinancialSummary;
```

### ProjectInfo

**Import:** `@/types/contract`

- Defined in: `types/contract.ts`
- Export type: named

```ts
interface ProjectInfo
```

Project information for contract generation

**Example**

```ts
import type { ProjectInfo } from '@/types/contract';

type Example = ProjectInfo;
```

### ProjectInfo

**Import:** `@/utils/paymentApplicationPdf`

- Defined in: `utils/paymentApplicationPdf.ts`
- Export type: named

```ts
interface ProjectInfo
```

_No inline documentation provided._

**Example**

```ts
import type { ProjectInfo } from '@/utils/paymentApplicationPdf';

type Example = ProjectInfo;
```

### ProjectMatchResult

**Import:** `@/utils/importCore`

- Defined in: `utils/importCore.ts`
- Export type: named

```ts
interface ProjectMatchResult
```

_No inline documentation provided._

**Example**

```ts
import type { ProjectMatchResult } from '@/utils/importCore';

type Example = ProjectMatchResult;
```

### ProjectMedia

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
interface ProjectMedia
```

_No inline documentation provided._

**Example**

```ts
import type { ProjectMedia } from '@/types/project';

type Example = ProjectMedia;
```

### ProjectNote

**Import:** `@/types/projectNote`

- Defined in: `types/projectNote.ts`
- Export type: named

```ts
interface ProjectNote
```

_No inline documentation provided._

**Example**

```ts
import type { ProjectNote } from '@/types/projectNote';

type Example = ProjectNote;
```

### ProjectOptionProps

**Import:** `@/components/projects/ProjectOption`

- Defined in: `components/projects/ProjectOption.tsx`
- Export type: named

```ts
interface ProjectOptionProps
```

_No inline documentation provided._

**Example**

```ts
import type { ProjectOptionProps } from '@/components/projects/ProjectOption';

type Example = ProjectOptionProps;
```

### ProjectOutletContext

**Import:** `@/components/ProjectDetailView`

- Defined in: `components/ProjectDetailView.tsx`
- Export type: named

```ts
interface ProjectOutletContext
```

_No inline documentation provided._

**Example**

```ts
import type { ProjectOutletContext } from '@/components/ProjectDetailView';

type Example = ProjectOutletContext;
```

### ProjectPickerProps

**Import:** `@/components/time-entry-form/fields/ProjectPicker`

- Defined in: `components/time-entry-form/fields/ProjectPicker.tsx`
- Export type: named

```ts
interface ProjectPickerProps
```

_No inline documentation provided._

**Example**

```ts
import type { ProjectPickerProps } from '@/components/time-entry-form/fields/ProjectPicker';

type Example = ProjectPickerProps;
```

### ProjectProfitData

**Import:** `@/types/profit`

- Defined in: `types/profit.ts`
- Export type: named

```ts
interface ProjectProfitData
```

_No inline documentation provided._

**Example**

```ts
import type { ProjectProfitData } from '@/types/profit';

type Example = ProjectProfitData;
```

### ProjectRevenue

**Import:** `@/types/revenue`

- Defined in: `types/revenue.ts`
- Export type: named

```ts
interface ProjectRevenue
```

Represents an invoice/revenue record
UPDATED: Added is_split flag for split revenue support

**Example**

```ts
import type { ProjectRevenue } from '@/types/revenue';

type Example = ProjectRevenue;
```

### ProjectSearchFilters

**Import:** `@/components/ProjectFilters`

- Defined in: `components/ProjectFilters.tsx`
- Export type: named

```ts
interface ProjectSearchFilters
```

_No inline documentation provided._

**Example**

```ts
import type { ProjectSearchFilters } from '@/components/ProjectFilters';

type Example = ProjectSearchFilters;
```

### ProjectWithFinancials

**Import:** `@/types/projectFinancials`

- Defined in: `types/projectFinancials.ts`
- Export type: named

```ts
interface ProjectWithFinancials
```

Extended project type with computed financial fields.

These fields are populated by the data-loading code in Projects.tsx and
useProjectData.tsx — NOT by the now-deleted calculateProjectFinancials()
utility. The values come from database triggers/views and from lightweight
client-side aggregation of change-order and estimate data.

**Example**

```ts
import type { ProjectWithFinancials } from '@/types/projectFinancials';

type Example = ProjectWithFinancials;
```

### QBColumnMapping

**Import:** `@/types/expense`

- Defined in: `types/expense.ts`
- Export type: named

```ts
interface QBColumnMapping
```

_No inline documentation provided._

**Example**

```ts
import type { QBColumnMapping } from '@/types/expense';

type Example = QBColumnMapping;
```

### QBImportResult

**Import:** `@/utils/csvParser`

- Defined in: `utils/csvParser.ts`
- Export type: named

```ts
interface QBImportResult
```

_No inline documentation provided._

**Example**

```ts
import type { QBImportResult } from '@/utils/csvParser';

type Example = QBImportResult;
```

### QBParseResult

**Import:** `@/utils/csvParser`

- Defined in: `utils/csvParser.ts`
- Export type: named

```ts
interface QBParseResult
```

_No inline documentation provided._

**Example**

```ts
import type { QBParseResult } from '@/utils/csvParser';

type Example = QBParseResult;
```

### QBTransaction

**Import:** `@/utils/csvParser`

- Defined in: `utils/csvParser.ts`
- Export type: named

```ts
interface QBTransaction
```

_No inline documentation provided._

**Example**

```ts
import type { QBTransaction } from '@/utils/csvParser';

type Example = QBTransaction;
```

### QBTransaction

**Import:** `@/utils/enhancedCsvParser`

- Defined in: `utils/enhancedCsvParser.ts`
- Export type: named

```ts
interface QBTransaction
```

_No inline documentation provided._

**Example**

```ts
import type { QBTransaction } from '@/utils/enhancedCsvParser';

type Example = QBTransaction;
```

### QueuedOperation

**Import:** `@/utils/syncQueue`

- Defined in: `utils/syncQueue.ts`
- Export type: named

```ts
interface QueuedOperation
```

_No inline documentation provided._

**Example**

```ts
import type { QueuedOperation } from '@/utils/syncQueue';

type Example = QueuedOperation;
```

### QuickBooksAccountMapping

**Import:** `@/types/quickbooks`

- Defined in: `types/quickbooks.ts`
- Export type: named

```ts
interface QuickBooksAccountMapping
```

_No inline documentation provided._

**Example**

```ts
import type { QuickBooksAccountMapping } from '@/types/quickbooks';

type Example = QuickBooksAccountMapping;
```

### QuickBooksConnection

**Import:** `@/hooks/useQuickBooksConnection`

- Defined in: `hooks/useQuickBooksConnection.ts`
- Export type: named

```ts
interface QuickBooksConnection
```

_No inline documentation provided._

**Example**

```ts
import type { QuickBooksConnection } from '@/hooks/useQuickBooksConnection';

type Example = QuickBooksConnection;
```

### QuickBooksConnection

**Import:** `@/types/quickbooks`

- Defined in: `types/quickbooks.ts`
- Export type: named

```ts
interface QuickBooksConnection
```

_No inline documentation provided._

**Example**

```ts
import type { QuickBooksConnection } from '@/types/quickbooks';

type Example = QuickBooksConnection;
```

### QuickBooksSyncConfig

**Import:** `@/hooks/useQuickBooksSync`

- Defined in: `hooks/useQuickBooksSync.ts`
- Export type: named

```ts
interface QuickBooksSyncConfig
```

_No inline documentation provided._

**Example**

```ts
import type { QuickBooksSyncConfig } from '@/hooks/useQuickBooksSync';

type Example = QuickBooksSyncConfig;
```

### QuickBooksSyncLog

**Import:** `@/types/quickbooks`

- Defined in: `types/quickbooks.ts`
- Export type: named

```ts
interface QuickBooksSyncLog
```

_No inline documentation provided._

**Example**

```ts
import type { QuickBooksSyncLog } from '@/types/quickbooks';

type Example = QuickBooksSyncLog;
```

### Quote

**Import:** `@/types/quote`

- Defined in: `types/quote.ts`
- Export type: named

```ts
interface Quote
```

_No inline documentation provided._

**Example**

```ts
import type { Quote } from '@/types/quote';

type Example = Quote;
```

### QuoteData

**Import:** `@/hooks/useLineItemControl`

- Defined in: `hooks/useLineItemControl.ts`
- Export type: named

```ts
interface QuoteData
```

_No inline documentation provided._

**Example**

```ts
import type { QuoteData } from '@/hooks/useLineItemControl';

type Example = QuoteData;
```

### QuoteFinancialMetrics

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
interface QuoteFinancialMetrics
```

_No inline documentation provided._

**Example**

```ts
import type { QuoteFinancialMetrics } from '@/utils/quoteFinancials';

type Example = QuoteFinancialMetrics;
```

### QuoteLineItem

**Import:** `@/types/quote`

- Defined in: `types/quote.ts`
- Export type: named

```ts
interface QuoteLineItem
```

_No inline documentation provided._

**Example**

```ts
import type { QuoteLineItem } from '@/types/quote';

type Example = QuoteLineItem;
```

### QuoteSearchFilters

**Import:** `@/components/QuoteFilters`

- Defined in: `components/QuoteFilters.tsx`
- Export type: named

```ts
interface QuoteSearchFilters
```

_No inline documentation provided._

**Example**

```ts
import type { QuoteSearchFilters } from '@/components/QuoteFilters';

type Example = QuoteSearchFilters;
```

### RCGInfo

**Import:** `@/types/contract`

- Defined in: `types/contract.ts`
- Export type: named

```ts
interface RCGInfo
```

RCG company information (from settings)

**Example**

```ts
import type { RCGInfo } from '@/types/contract';

type Example = RCGInfo;
```

### ReceiptFilters

**Import:** `@/components/ReceiptSearchFilters`

- Defined in: `components/ReceiptSearchFilters.tsx`
- Export type: named

```ts
interface ReceiptFilters
```

_No inline documentation provided._

**Example**

```ts
import type { ReceiptFilters } from '@/components/ReceiptSearchFilters';

type Example = ReceiptFilters;
```

### ReceiptForLinking

**Import:** `@/utils/receiptLinking`

- Defined in: `utils/receiptLinking.ts`
- Export type: named

```ts
interface ReceiptForLinking
```

_No inline documentation provided._

**Example**

```ts
import type { ReceiptForLinking } from '@/utils/receiptLinking';

type Example = ReceiptForLinking;
```

### ReceiptsManagementRef

**Import:** `@/components/ReceiptsManagement`

- Defined in: `components/ReceiptsManagement.tsx`
- Export type: named

```ts
interface ReceiptsManagementRef
```

_No inline documentation provided._

**Example**

```ts
import type { ReceiptsManagementRef } from '@/components/ReceiptsManagement';

type Example = ReceiptsManagementRef;
```

### ReportConfig

**Import:** `@/hooks/useReportExecution`

- Defined in: `hooks/useReportExecution.ts`
- Export type: named

```ts
interface ReportConfig
```

_No inline documentation provided._

**Example**

```ts
import type { ReportConfig } from '@/hooks/useReportExecution';

type Example = ReportConfig;
```

### ReportField

**Import:** `@/utils/reportExporter`

- Defined in: `utils/reportExporter.ts`
- Export type: named

```ts
interface ReportField
```

_No inline documentation provided._

**Example**

```ts
import type { ReportField } from '@/utils/reportExporter';

type Example = ReportField;
```

### ReportFilter

**Import:** `@/hooks/useReportExecution`

- Defined in: `hooks/useReportExecution.ts`
- Export type: named

```ts
interface ReportFilter
```

_No inline documentation provided._

**Example**

```ts
import type { ReportFilter } from '@/hooks/useReportExecution';

type Example = ReportFilter;
```

### ReportResult

**Import:** `@/hooks/useReportExecution`

- Defined in: `hooks/useReportExecution.ts`
- Export type: named

```ts
interface ReportResult
```

_No inline documentation provided._

**Example**

```ts
import type { ReportResult } from '@/hooks/useReportExecution';

type Example = ReportResult;
```

### ReportTemplate

**Import:** `@/hooks/useReportTemplates`

- Defined in: `hooks/useReportTemplates.ts`
- Export type: named

```ts
interface ReportTemplate
```

_No inline documentation provided._

**Example**

```ts
import type { ReportTemplate } from '@/hooks/useReportTemplates';

type Example = ReportTemplate;
```

### RevenueImportData

**Import:** `@/utils/enhancedTransactionImporter`

- Defined in: `utils/enhancedTransactionImporter.ts`
- Export type: named

```ts
interface RevenueImportData
```

_No inline documentation provided._

**Example**

```ts
import type { RevenueImportData } from '@/utils/enhancedTransactionImporter';

type Example = RevenueImportData;
```

### RevenueSplit

**Import:** `@/types/revenue`

- Defined in: `types/revenue.ts`
- Export type: named

```ts
interface RevenueSplit
```

Represents a single split allocation of a revenue to a project
Child record of project_revenues when is_split = true

**Example**

```ts
import type { RevenueSplit } from '@/types/revenue';

type Example = RevenueSplit;
```

### RevenueSplitFormInput

**Import:** `@/types/revenue`

- Defined in: `types/revenue.ts`
- Export type: named

```ts
interface RevenueSplitFormInput
```

Input type for the split dialog form

**Example**

```ts
import type { RevenueSplitFormInput } from '@/types/revenue';

type Example = RevenueSplitFormInput;
```

### RevenueSplitResult

**Import:** `@/types/revenue`

- Defined in: `types/revenue.ts`
- Export type: named

```ts
interface RevenueSplitResult
```

Result type for split operations

**Example**

```ts
import type { RevenueSplitResult } from '@/types/revenue';

type Example = RevenueSplitResult;
```

### RevenueWithSplits

**Import:** `@/types/revenue`

- Defined in: `types/revenue.ts`
- Export type: named

```ts
interface RevenueWithSplits
```

Revenue with split details for list display

**Example**

```ts
import type { RevenueWithSplits } from '@/types/revenue';

type Example = RevenueWithSplits;
```

### ScheduleColumnConfig

**Import:** `@/hooks/useScheduleTableColumns`

- Defined in: `hooks/useScheduleTableColumns.ts`
- Export type: named

```ts
interface ScheduleColumnConfig
```

_No inline documentation provided._

**Example**

```ts
import type { ScheduleColumnConfig } from '@/hooks/useScheduleTableColumns';

type Example = ScheduleColumnConfig;
```

### ScheduleConfig

**Import:** `@/utils/cronBuilder`

- Defined in: `utils/cronBuilder.ts`
- Export type: named

```ts
interface ScheduleConfig
```

_No inline documentation provided._

**Example**

```ts
import type { ScheduleConfig } from '@/utils/cronBuilder';

type Example = ScheduleConfig;
```

### SchedulePhase

**Import:** `@/types/schedule`

- Defined in: `types/schedule.ts`
- Export type: named

```ts
interface SchedulePhase
```

_No inline documentation provided._

**Example**

```ts
import type { SchedulePhase } from '@/types/schedule';

type Example = SchedulePhase;
```

### ScheduleSettings

**Import:** `@/types/schedule`

- Defined in: `types/schedule.ts`
- Export type: named

```ts
interface ScheduleSettings
```

_No inline documentation provided._

**Example**

```ts
import type { ScheduleSettings } from '@/types/schedule';

type Example = ScheduleSettings;
```

### ScheduleStatus

**Import:** `@/utils/projectDashboard`

- Defined in: `utils/projectDashboard.ts`
- Export type: named

```ts
interface ScheduleStatus
```

_No inline documentation provided._

**Example**

```ts
import type { ScheduleStatus } from '@/utils/projectDashboard';

type Example = ScheduleStatus;
```

### ScheduleTask

**Import:** `@/types/schedule`

- Defined in: `types/schedule.ts`
- Export type: named

```ts
interface ScheduleTask
```

_No inline documentation provided._

**Example**

```ts
import type { ScheduleTask } from '@/types/schedule';

type Example = ScheduleTask;
```

### ScheduleWarning

**Import:** `@/types/schedule`

- Defined in: `types/schedule.ts`
- Export type: named

```ts
interface ScheduleWarning
```

_No inline documentation provided._

**Example**

```ts
import type { ScheduleWarning } from '@/types/schedule';

type Example = ScheduleWarning;
```

### SearchFilters

**Import:** `@/components/EstimateSearchFilters`

- Defined in: `components/EstimateSearchFilters.tsx`
- Export type: named

```ts
interface SearchFilters
```

_No inline documentation provided._

**Example**

```ts
import type { SearchFilters } from '@/components/EstimateSearchFilters';

type Example = SearchFilters;
```

### SemanticMapping

**Import:** `@/lib/kpi-definitions/types`

- Defined in: `lib/kpi-definitions/types.ts`
- Export type: named

```ts
interface SemanticMapping
```

Maps business concepts to specific KPIs
Helps AI understand "profit" → actual_margin

**Example**

```ts
import type { SemanticMapping } from '@/lib/kpi-definitions/types';

type Example = SemanticMapping;
```

### SendNotificationParams

**Import:** `@/types/training`

- Defined in: `types/training.ts`
- Export type: named

```ts
interface SendNotificationParams
```

_No inline documentation provided._

**Example**

```ts
import type { SendNotificationParams } from '@/types/training';

type Example = SendNotificationParams;
```

### SplitValidationResult

**Import:** `@/types/revenue`

- Defined in: `types/revenue.ts`
- Export type: named

```ts
interface SplitValidationResult
```

Validation result for split totals

**Example**

```ts
import type { SplitValidationResult } from '@/types/revenue';

type Example = SplitValidationResult;
```

### SubcontractorInfo

**Import:** `@/types/contract`

- Defined in: `types/contract.ts`
- Export type: named

```ts
interface SubcontractorInfo
```

Subcontractor information for contract generation

**Example**

```ts
import type { SubcontractorInfo } from '@/types/contract';

type Example = SubcontractorInfo;
```

### TabDefinition

**Import:** `@/components/ui/mobile-responsive-tabs`

- Defined in: `components/ui/mobile-responsive-tabs.tsx`
- Export type: named

```ts
interface TabDefinition
```

_No inline documentation provided._

**Example**

```ts
import type { TabDefinition } from '@/components/ui/mobile-responsive-tabs';

type Example = TabDefinition;
```

### TabOption

**Import:** `@/components/ui/mobile-tab-selector`

- Defined in: `components/ui/mobile-tab-selector.tsx`
- Export type: named

```ts
interface TabOption
```

_No inline documentation provided._

**Example**

```ts
import type { TabOption } from '@/components/ui/mobile-tab-selector';

type Example = TabOption;
```

### TaskDependency

**Import:** `@/types/schedule`

- Defined in: `types/schedule.ts`
- Export type: named

```ts
interface TaskDependency
```

_No inline documentation provided._

**Example**

```ts
import type { TaskDependency } from '@/types/schedule';

type Example = TaskDependency;
```

### TextareaProps

**Import:** `@/components/ui/textarea`

- Defined in: `components/ui/textarea.tsx`
- Export type: named

```ts
interface TextareaProps
```

_No inline documentation provided._

**Example**

```ts
import type { TextareaProps } from '@/components/ui/textarea';

type Example = TextareaProps;
```

### TimeEntryFilters

**Import:** `@/types/timeEntry`

- Defined in: `types/timeEntry.ts`
- Export type: named

```ts
interface TimeEntryFilters
```

_No inline documentation provided._

**Example**

```ts
import type { TimeEntryFilters } from '@/types/timeEntry';

type Example = TimeEntryFilters;
```

### TimeEntryFormData

**Import:** `@/components/time-entry-form/hooks/useTimeEntryForm`

- Defined in: `components/time-entry-form/hooks/useTimeEntryForm.ts`
- Export type: named

```ts
interface TimeEntryFormData
```

_No inline documentation provided._

**Example**

```ts
import type { TimeEntryFormData } from '@/components/time-entry-form/hooks/useTimeEntryForm';

type Example = TimeEntryFormData;
```

### TimeEntryFormInitialValues

**Import:** `@/components/time-entry-form/hooks/useTimeEntryForm`

- Defined in: `components/time-entry-form/hooks/useTimeEntryForm.ts`
- Export type: named

```ts
interface TimeEntryFormInitialValues
```

_No inline documentation provided._

**Example**

```ts
import type { TimeEntryFormInitialValues } from '@/components/time-entry-form/hooks/useTimeEntryForm';

type Example = TimeEntryFormInitialValues;
```

### TimeEntryHours

**Import:** `@/utils/timeEntryCalculations`

- Defined in: `utils/timeEntryCalculations.ts`
- Export type: named

```ts
interface TimeEntryHours
```

Time Entry Calculation Utilities

⚠️ IMPORTANT: These are for PRE-SAVE calculations only (forms, previews).
For displaying saved data, ALWAYS use database values:
- expenses.hours (net/billable)
- expenses.gross_hours (total shift duration)

These functions handle the core calculations for time entries,
including lunch break adjustments.

**Example**

```ts
import type { TimeEntryHours } from '@/utils/timeEntryCalculations';

type Example = TimeEntryHours;
```

### TimeEntryListItem

**Import:** `@/types/timeEntry`

- Defined in: `types/timeEntry.ts`
- Export type: named

```ts
interface TimeEntryListItem
```

_No inline documentation provided._

**Example**

```ts
import type { TimeEntryListItem } from '@/types/timeEntry';

type Example = TimeEntryListItem;
```

### TimeEntryStatistics

**Import:** `@/types/timeEntry`

- Defined in: `types/timeEntry.ts`
- Export type: named

```ts
interface TimeEntryStatistics
```

_No inline documentation provided._

**Example**

```ts
import type { TimeEntryStatistics } from '@/types/timeEntry';

type Example = TimeEntryStatistics;
```

### TimePickerButtonProps

**Import:** `@/components/time-entry-form/fields/TimePickerButton`

- Defined in: `components/time-entry-form/fields/TimePickerButton.tsx`
- Export type: named

```ts
interface TimePickerButtonProps
```

_No inline documentation provided._

**Example**

```ts
import type { TimePickerButtonProps } from '@/components/time-entry-form/fields/TimePickerButton';

type Example = TimePickerButtonProps;
```

### TimePickerProps

**Import:** `@/components/time-entry-form/fields/TimePicker`

- Defined in: `components/time-entry-form/fields/TimePicker.tsx`
- Export type: named

```ts
interface TimePickerProps
```

_No inline documentation provided._

**Example**

```ts
import type { TimePickerProps } from '@/components/time-entry-form/fields/TimePicker';

type Example = TimePickerProps;
```

### TimeRangeFieldProps

**Import:** `@/components/time-entry-form/fields/TimeRangeField`

- Defined in: `components/time-entry-form/fields/TimeRangeField.tsx`
- Export type: named

```ts
interface TimeRangeFieldProps
```

_No inline documentation provided._

**Example**

```ts
import type { TimeRangeFieldProps } from '@/components/time-entry-form/fields/TimeRangeField';

type Example = TimeRangeFieldProps;
```

### TrainingAssignment

**Import:** `@/types/training`

- Defined in: `types/training.ts`
- Export type: named

```ts
interface TrainingAssignment
```

_No inline documentation provided._

**Example**

```ts
import type { TrainingAssignment } from '@/types/training';

type Example = TrainingAssignment;
```

### TrainingCompletion

**Import:** `@/types/training`

- Defined in: `types/training.ts`
- Export type: named

```ts
interface TrainingCompletion
```

_No inline documentation provided._

**Example**

```ts
import type { TrainingCompletion } from '@/types/training';

type Example = TrainingCompletion;
```

### TrainingContent

**Import:** `@/types/training`

- Defined in: `types/training.ts`
- Export type: named

```ts
interface TrainingContent
```

_No inline documentation provided._

**Example**

```ts
import type { TrainingContent } from '@/types/training';

type Example = TrainingContent;
```

### TrainingStats

**Import:** `@/types/training`

- Defined in: `types/training.ts`
- Export type: named

```ts
interface TrainingStats
```

_No inline documentation provided._

**Example**

```ts
import type { TrainingStats } from '@/types/training';

type Example = TrainingStats;
```

### TransactionCSVRow

**Import:** `@/utils/enhancedTransactionImporter`

- Defined in: `utils/enhancedTransactionImporter.ts`
- Export type: named

```ts
interface TransactionCSVRow
```

_No inline documentation provided._

**Example**

```ts
import type { TransactionCSVRow } from '@/utils/enhancedTransactionImporter';

type Example = TransactionCSVRow;
```

### TransactionImportResult

**Import:** `@/utils/enhancedTransactionImporter`

- Defined in: `utils/enhancedTransactionImporter.ts`
- Export type: named

```ts
interface TransactionImportResult
```

_No inline documentation provided._

**Example**

```ts
import type { TransactionImportResult } from '@/utils/enhancedTransactionImporter';

type Example = TransactionImportResult;
```

### TransactionSelectionControlsProps

**Import:** `@/components/import/TransactionSelectionControls`

- Defined in: `components/import/TransactionSelectionControls.tsx`
- Export type: named

```ts
interface TransactionSelectionControlsProps
```

_No inline documentation provided._

**Example**

```ts
import type { TransactionSelectionControlsProps } from '@/components/import/TransactionSelectionControls';

type Example = TransactionSelectionControlsProps;
```

### TransactionSelectionTableProps

**Import:** `@/components/import/TransactionSelectionTable`

- Defined in: `components/import/TransactionSelectionTable.tsx`
- Export type: named

```ts
interface TransactionSelectionTableProps
```

_No inline documentation provided._

**Example**

```ts
import type { TransactionSelectionTableProps } from '@/components/import/TransactionSelectionTable';

type Example = TransactionSelectionTableProps;
```

### UnifiedReceipt

**Import:** `@/hooks/useReceiptsData`

- Defined in: `hooks/useReceiptsData.ts`
- Export type: named

```ts
interface UnifiedReceipt
```

_No inline documentation provided._

**Example**

```ts
import type { UnifiedReceipt } from '@/hooks/useReceiptsData';

type Example = UnifiedReceipt;
```

### UnitDefinition

**Import:** `@/utils/units`

- Defined in: `utils/units.ts`
- Export type: named

```ts
interface UnitDefinition
```

_No inline documentation provided._

**Example**

```ts
import type { UnitDefinition } from '@/utils/units';

type Example = UnitDefinition;
```

### UnlinkReceiptParams

**Import:** `@/utils/receiptLinking`

- Defined in: `utils/receiptLinking.ts`
- Export type: named

```ts
interface UnlinkReceiptParams
```

_No inline documentation provided._

**Example**

```ts
import type { UnlinkReceiptParams } from '@/utils/receiptLinking';

type Example = UnlinkReceiptParams;
```

### UpdateBranchBidParams

**Import:** `@/types/bid`

- Defined in: `types/bid.ts`
- Export type: named

```ts
interface UpdateBranchBidParams
```

_No inline documentation provided._

**Example**

```ts
import type { UpdateBranchBidParams } from '@/types/bid';

type Example = UpdateBranchBidParams;
```

### UpdatePayeeData

**Import:** `@/types/payee`

- Defined in: `types/payee.ts`
- Export type: named

```ts
interface UpdatePayeeData
```

_No inline documentation provided._

**Example**

```ts
import type { UpdatePayeeData } from '@/types/payee';

type Example = UpdatePayeeData;
```

### UpdateTrainingContentData

**Import:** `@/types/training`

- Defined in: `types/training.ts`
- Export type: named

```ts
interface UpdateTrainingContentData
```

_No inline documentation provided._

**Example**

```ts
import type { UpdateTrainingContentData } from '@/types/training';

type Example = UpdateTrainingContentData;
```

### UploadBidMediaParams

**Import:** `@/types/bid`

- Defined in: `types/bid.ts`
- Export type: named

```ts
interface UploadBidMediaParams
```

_No inline documentation provided._

**Example**

```ts
import type { UploadBidMediaParams } from '@/types/bid';

type Example = UploadBidMediaParams;
```

### UploadProjectMediaParams

**Import:** `@/utils/projectMedia`

- Defined in: `utils/projectMedia.ts`
- Export type: named

```ts
interface UploadProjectMediaParams
```

_No inline documentation provided._

**Example**

```ts
import type { UploadProjectMediaParams } from '@/utils/projectMedia';

type Example = UploadProjectMediaParams;
```

### UploadProjectMediaResult

**Import:** `@/utils/projectMedia`

- Defined in: `utils/projectMedia.ts`
- Export type: named

```ts
interface UploadProjectMediaResult
```

_No inline documentation provided._

**Example**

```ts
import type { UploadProjectMediaResult } from '@/utils/projectMedia';

type Example = UploadProjectMediaResult;
```

### UploadResult

**Import:** `@/utils/trainingStorage`

- Defined in: `utils/trainingStorage.ts`
- Export type: named

```ts
interface UploadResult
```

_No inline documentation provided._

**Example**

```ts
import type { UploadResult } from '@/utils/trainingStorage';

type Example = UploadResult;
```

### UseDocumentPreviewReturn

**Import:** `@/hooks/useDocumentPreview`

- Defined in: `hooks/useDocumentPreview.ts`
- Export type: named

```ts
interface UseDocumentPreviewReturn
```

_No inline documentation provided._

**Example**

```ts
import type { UseDocumentPreviewReturn } from '@/hooks/useDocumentPreview';

type Example = UseDocumentPreviewReturn;
```

### UseOvernightDetectionParams

**Import:** `@/components/time-entry-form/hooks/useOvernightDetection`

- Defined in: `components/time-entry-form/hooks/useOvernightDetection.ts`
- Export type: named

```ts
interface UseOvernightDetectionParams
```

_No inline documentation provided._

**Example**

```ts
import type { UseOvernightDetectionParams } from '@/components/time-entry-form/hooks/useOvernightDetection';

type Example = UseOvernightDetectionParams;
```

### UseOvernightDetectionResult

**Import:** `@/components/time-entry-form/hooks/useOvernightDetection`

- Defined in: `components/time-entry-form/hooks/useOvernightDetection.ts`
- Export type: named

```ts
interface UseOvernightDetectionResult
```

_No inline documentation provided._

**Example**

```ts
import type { UseOvernightDetectionResult } from '@/components/time-entry-form/hooks/useOvernightDetection';

type Example = UseOvernightDetectionResult;
```

### UseProjectCostBucketsResult

**Import:** `@/hooks/useProjectCostBuckets`

- Defined in: `hooks/useProjectCostBuckets.ts`
- Export type: named

```ts
interface UseProjectCostBucketsResult
```

_No inline documentation provided._

**Example**

```ts
import type { UseProjectCostBucketsResult } from '@/hooks/useProjectCostBuckets';

type Example = UseProjectCostBucketsResult;
```

### UseProjectDataReturn

**Import:** `@/hooks/useProjectData`

- Defined in: `hooks/useProjectData.tsx`
- Export type: named

```ts
interface UseProjectDataReturn
```

_No inline documentation provided._

**Example**

```ts
import type { UseProjectDataReturn } from '@/hooks/useProjectData';

type Example = UseProjectDataReturn;
```

### UseQuickBooksSyncReturn

**Import:** `@/hooks/useQuickBooksSync`

- Defined in: `hooks/useQuickBooksSync.ts`
- Export type: named

```ts
interface UseQuickBooksSyncReturn
```

_No inline documentation provided._

**Example**

```ts
import type { UseQuickBooksSyncReturn } from '@/hooks/useQuickBooksSync';

type Example = UseQuickBooksSyncReturn;
```

### UserNotification

**Import:** `@/types/notification`

- Defined in: `types/notification.ts`
- Export type: named

```ts
interface UserNotification
```

_No inline documentation provided._

**Example**

```ts
import type { UserNotification } from '@/types/notification';

type Example = UserNotification;
```

### UseTimeEntryFormOptions

**Import:** `@/components/time-entry-form/hooks/useTimeEntryForm`

- Defined in: `components/time-entry-form/hooks/useTimeEntryForm.ts`
- Export type: named

```ts
interface UseTimeEntryFormOptions
```

_No inline documentation provided._

**Example**

```ts
import type { UseTimeEntryFormOptions } from '@/components/time-entry-form/hooks/useTimeEntryForm';

type Example = UseTimeEntryFormOptions;
```

### ValidationIssue

**Import:** `@/lib/kpi-definitions/types`

- Defined in: `lib/kpi-definitions/types.ts`
- Export type: named

```ts
interface ValidationIssue
```

_No inline documentation provided._

**Example**

```ts
import type { ValidationIssue } from '@/lib/kpi-definitions/types';

type Example = ValidationIssue;
```

### ValidationResult

**Import:** `@/utils/mediaMetadata`

- Defined in: `utils/mediaMetadata.ts`
- Export type: named

```ts
interface ValidationResult
```

_No inline documentation provided._

**Example**

```ts
import type { ValidationResult } from '@/utils/mediaMetadata';

type Example = ValidationResult;
```

### ValidationResult

**Import:** `@/lib/kpi-definitions/types`

- Defined in: `lib/kpi-definitions/types.ts`
- Export type: named

```ts
interface ValidationResult
```

_No inline documentation provided._

**Example**

```ts
import type { ValidationResult } from '@/lib/kpi-definitions/types';

type Example = ValidationResult;
```

### VersionHistory

**Import:** `@/types/estimate`

- Defined in: `types/estimate.ts`
- Export type: named

```ts
interface VersionHistory
```

_No inline documentation provided._

**Example**

```ts
import type { VersionHistory } from '@/types/estimate';

type Example = VersionHistory;
```

### WorkerPickerProps

**Import:** `@/components/time-entry-form/fields/WorkerPicker`

- Defined in: `components/time-entry-form/fields/WorkerPicker.tsx`
- Export type: named

```ts
interface WorkerPickerProps
```

_No inline documentation provided._

**Example**

```ts
import type { WorkerPickerProps } from '@/components/time-entry-form/fields/WorkerPicker';

type Example = WorkerPickerProps;
```

### WorkOrderSearchFilters

**Import:** `@/components/WorkOrderFilters`

- Defined in: `components/WorkOrderFilters.tsx`
- Export type: named

```ts
interface WorkOrderSearchFilters
```

_No inline documentation provided._

**Example**

```ts
import type { WorkOrderSearchFilters } from '@/components/WorkOrderFilters';

type Example = WorkOrderSearchFilters;
```

## Types

Total: 67

### AppRole

**Import:** `@/contexts/RoleContext`

- Defined in: `contexts/RoleContext.tsx`
- Export type: named

```ts
type AppRole = 'admin' | 'manager' | 'field_worker'
```

_No inline documentation provided._

**Example**

```ts
import type { AppRole } from '@/contexts/RoleContext';

type Example = AppRole;
```

### AppRole

**Import:** `@/types/training`

- Defined in: `types/training.ts`
- Export type: named

```ts
type AppRole = Database['public']['Enums']['app_role']
```

_No inline documentation provided._

**Example**

```ts
import type { AppRole } from '@/types/training';

type Example = AppRole;
```

### BudgetComparisonStatus

**Import:** `@/components/BudgetComparisonBadge`

- Defined in: `components/BudgetComparisonBadge.tsx`
- Export type: named

```ts
type BudgetComparisonStatus = 'under-budget' | 'over-budget' | 'on-budget' | 'awaiting-quotes'
```

_No inline documentation provided._

**Example**

```ts
import type { BudgetComparisonStatus } from '@/components/BudgetComparisonBadge';

type Example = BudgetComparisonStatus;
```

### CalendarProps

**Import:** `@/components/ui/calendar`

- Defined in: `components/ui/calendar.tsx`
- Export type: named

```ts
type CalendarProps = React.ComponentProps<typeof DayPicker>
```

_No inline documentation provided._

**Example**

```ts
import type { CalendarProps } from '@/components/ui/calendar';

type Example = CalendarProps;
```

### CarouselApi

**Import:** `@/components/ui/carousel`

- Defined in: `components/ui/carousel.tsx`
- Export type: named

```ts
type CarouselApi = UseEmblaCarouselType[1]
```

_No inline documentation provided._

**Example**

```ts
import type { CarouselApi } from '@/components/ui/carousel';

type Example = CarouselApi;
```

### ChangeOrder

**Import:** `@/types/changeOrder`

- Defined in: `types/changeOrder.ts`
- Export type: named

```ts
type ChangeOrder = Database['public']['Tables']['change_orders']['Row']
```

_No inline documentation provided._

**Example**

```ts
import type { ChangeOrder } from '@/types/changeOrder';

type Example = ChangeOrder;
```

### ChangeOrderLineItem

**Import:** `@/types/changeOrder`

- Defined in: `types/changeOrder.ts`
- Export type: named

```ts
type ChangeOrderLineItem = Database['public']['Tables']['change_order_line_items']['Row']
```

_No inline documentation provided._

**Example**

```ts
import type { ChangeOrderLineItem } from '@/types/changeOrder';

type Example = ChangeOrderLineItem;
```

### ChangeOrderStatus

**Import:** `@/components/ChangeOrderStatusBadge`

- Defined in: `components/ChangeOrderStatusBadge.tsx`
- Export type: named

```ts
type ChangeOrderStatus = 'draft' | 'pending' | 'approved' | 'rejected'
```

_No inline documentation provided._

**Example**

```ts
import type { ChangeOrderStatus } from '@/components/ChangeOrderStatusBadge';

type Example = ChangeOrderStatus;
```

### ChangeOrderStatus

**Import:** `@/lib/statusColors`

- Defined in: `lib/statusColors.ts`
- Export type: named

```ts
type ChangeOrderStatus = 'draft' | 'pending' | 'approved' | 'rejected'
```

_No inline documentation provided._

**Example**

```ts
import type { ChangeOrderStatus } from '@/lib/statusColors';

type Example = ChangeOrderStatus;
```

### ChartConfig

**Import:** `@/components/ui/chart`

- Defined in: `components/ui/chart.tsx`
- Export type: named

```ts
type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & ({ color?: string; theme?: never } | { color?: never; theme: Record<keyof typeof THEMES, string> });
}
```

_No inline documentation provided._

**Example**

```ts
import type { ChartConfig } from '@/components/ui/chart';

type Example = ChartConfig;
```

### ClassifiedPayeeStatus

**Import:** `@/utils/payeeImportMatcher`

- Defined in: `utils/payeeImportMatcher.ts`
- Export type: named

```ts
type ClassifiedPayeeStatus = 'new' | 'existing' | 'review'
```

_No inline documentation provided._

**Example**

```ts
import type { ClassifiedPayeeStatus } from '@/utils/payeeImportMatcher';

type Example = ClassifiedPayeeStatus;
```

### ClientType

**Import:** `@/types/client`

- Defined in: `types/client.ts`
- Export type: named

```ts
type ClientType = 'residential' | 'commercial' | 'government' | 'nonprofit'
```

_No inline documentation provided._

**Example**

```ts
import type { ClientType } from '@/types/client';

type Example = ClientType;
```

### CompositeTypes

**Import:** `@/integrations/supabase/types`

- Defined in: `integrations/supabase/types.ts`
- Export type: named

```ts
type CompositeTypes = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
```

_No inline documentation provided._

**Example**

```ts
import type { CompositeTypes } from '@/integrations/supabase/types';

type Example = CompositeTypes;
```

### ContractStatus

**Import:** `@/types/contract`

- Defined in: `types/contract.ts`
- Export type: named

```ts
type ContractStatus = | 'draft'
  | 'generated'
  | 'sent'
  | 'signed'
  | 'void'
  | 'superseded'
```

Contract status

**Example**

```ts
import type { ContractStatus } from '@/types/contract';

type Example = ContractStatus;
```

### ContractStep

**Import:** `@/components/contracts/ContractStepper`

- Defined in: `components/contracts/ContractStepper.tsx`
- Export type: named

```ts
type ContractStep = 'configure' | 'preview' | 'complete'
```

_No inline documentation provided._

**Example**

```ts
import type { ContractStep } from '@/components/contracts/ContractStepper';

type Example = ContractStep;
```

### ContractType

**Import:** `@/types/contract`

- Defined in: `types/contract.ts`
- Export type: named

```ts
type ContractType = 'subcontractor_project_agreement'
```

Contract type enumeration. Database stores these values; extensible for future contract types.

**Example**

```ts
import type { ContractType } from '@/types/contract';

type Example = ContractType;
```

### CostComponent

**Import:** `@/types/importTypes`

- Defined in: `types/importTypes.ts`
- Export type: named

```ts
type CostComponent = 'labor' | 'material' | 'sub'
```

_No inline documentation provided._

**Example**

```ts
import type { CostComponent } from '@/types/importTypes';

type Example = CostComponent;
```

### Database

**Import:** `@/integrations/supabase/types`

- Defined in: `integrations/supabase/types.ts`
- Export type: named

```ts
type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_feed: {
        Row: {
          activity_type: string
          created_at: string
          deleted_at: string | null
          description: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          deleted_at?: string | null
          description: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_actions: {
        Row: {
          action_details: Json | null
          action_type: string
          admin_user_id: string
          created_at: string
          id: string
          target_user_id: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          admin_user_id: string
          created_at?: string
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      ai_action_log: {
        Row: {
          action_type: string
          ai_response: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          parameters: Json | null
          performed_by: string | null
          success: boolean | null
          user_message: string | null
        }
        Insert: {
          action_type: string
          ai_response?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          parameters?: Json | null
          performed_by?: string | null
          success?: boolean | null
          user_message?: string | null
        }
        Update: {
          action_type?: string
          ai_response?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          parameters?: Json | null
          performed_by?: string | null
          success?: boolean | null
          user_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_media: {
        Row: {
          altitude: number | null
          bid_id: string
          caption: string | null
          created_at: string
          description: string | null
          device_model: string | null
          duration: number | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          mime_type: string
          taken_at: string | null
          thumbnail_url: string | null
          updated_at: string
          upload_source: string | null
          uploaded_by: string | null
        }
        Insert: {
          altitude?: number | null
          bid_id: string
          caption?: string | null
          created_at?: string
          description?: string | null
          device_model?: string | null
          duration?: number | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          mime_type: string
          taken_at?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          upload_source?: string | null
          uploaded_by?: string | null
        }
        Update: {
          altitude?: number | null
          bid_id?: string
          caption?: string | null
          created_at?: string
          description?: string | null
          device_model?: string | null
          duration?: number | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          mime_type?: string
          taken_at?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          upload_source?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_media_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "branch_bids"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_notes: {
        Row: {
          bid_id: string
          created_at: string
          id: string
          note_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bid_id: string
          created_at?: string
          id?: string
          note_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bid_id?: string
          created_at?: string
          id?: string
          note_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_notes_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "branch_bids"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_bids: {
        Row: {
          address: string | null
          client_id: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          estimate_id: string | null
          id: string
          job_type: string | null
          name: string
          project_id: string | null
          project_type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          client_id?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          estimate_id?: string | null
          id?: string
          job_type?: string | null
          name: string
          project_id?: string | null
          project_type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          estimate_id?: string | null
          id?: string
          job_type?: string | null
          name?: string
          project_id?: string | null
          project_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_bids_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_bids_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimate_financial_summary"
            referencedColumns: ["estimate_id"]
          },
          {
            foreignKeyName: "branch_bids_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_bids_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_line_items: {
        Row: {
          actual_cost_rate_per_hour: number | null
          billing_rate_per_hour: number | null
          category: Database["public"]["Enums"]["expense_category"]
          change_order_id: string
          cost_per_unit: number | null
          created_at: string | null
          dependencies: Json | null
          description: string
          duration_days: number | null
          id: string
          is_milestone: boolean | null
          labor_cushion_amount: number | null
          labor_hours: number | null
          markup_amount: number | null
          payee_id: string | null
          price_per_unit: number | null
          quantity: number | null
          schedule_notes: string | null
          scheduled_end_date: string | null
          scheduled_start_date: string | null
          sort_order: number | null
          total_cost: number | null
          total_price: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          actual_cost_rate_per_hour?: number | null
          billing_rate_per_hour?: number | null
          category: Database["public"]["Enums"]["expense_category"]
          change_order_id: string
          cost_per_unit?: number | null
          created_at?: string | null
          dependencies?: Json | null
          description: string
          duration_days?: number | null
          id?: string
          is_milestone?: boolean | null
          labor_cushion_amount?: number | null
          labor_hours?: number | null
          markup_amount?: number | null
          payee_id?: string | null
          price_per_unit?: number | null
          quantity?: number | null
          schedule_notes?: string | null
          scheduled_end_date?: string | null
          scheduled_start_date?: string | null
          sort_order?: number | null
          total_cost?: number | null
          total_price?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_cost_rate_per_hour?: number | null
          billing_rate_per_hour?: number | null
          category?: Database["public"]["Enums"]["expense_category"]
          change_order_id?: string
          cost_per_unit?: number | null
          created_at?: string | null
          dependencies?: Json | null
          description?: string
          duration_days?: number | null
          id?: string
          is_milestone?: boolean | null
          labor_cushion_amount?: number | null
          labor_hours?: number | null
          markup_amount?: number | null
          payee_id?: string | null
          price_per_unit?: number | null
          quantity?: number | null
          schedule_notes?: string | null
          scheduled_end_date?: string | null
          scheduled_start_date?: string | null
          sort_order?: number | null
          total_cost?: number | null
          total_price?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_order_line_items_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_line_items_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "payees"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          amount: number | null
          approved_by: string | null
          approved_date: string | null
          change_order_number: string
          client_amount: number | null
          contingency_billed_to_client: number | null
          cost_impact: number | null
          created_at: string | null
          description: string
          id: string
          includes_contingency: boolean | null
          margin_impact: number | null
          project_id: string
          reason_for_change: string | null
          requested_date: string | null
          status: Database["public"]["Enums"]["change_order_status"] | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          approved_by?: string | null
          approved_date?: string | null
          change_order_number: string
          client_amount?: number | null
          contingency_billed_to_client?: number | null
          cost_impact?: number | null
          created_at?: string | null
          description: string
          id?: string
          includes_contingency?: boolean | null
          margin_impact?: number | null
          project_id: string
          reason_for_change?: string | null
          requested_date?: string | null
          status?: Database["public"]["Enums"]["change_order_status"] | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          approved_by?: string | null
          approved_date?: string | null
          change_order_number?: string
          client_amount?: number | null
          contingency_billed_to_client?: number | null
          cost_impact?: number | null
          created_at?: string | null
          description?: string
          id?: string
          includes_contingency?: boolean | null
          margin_impact?: number | null
          project_id?: string
          reason_for_change?: string | null
          requested_date?: string | null
          status?: Database["public"]["Enums"]["change_order_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          billing_address: string | null
          client_name: string
          client_type: string | null
          company_name: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          mailing_address: string | null
          notes: string | null
          payment_terms: string | null
          phone: string | null
          quickbooks_customer_id: string | null
          tax_exempt: boolean | null
          updated_at: string | null
        }
        Insert: {
          billing_address?: string | null
          client_name: string
          client_type?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          mailing_address?: string | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          quickbooks_customer_id?: string | null
          tax_exempt?: boolean | null
          updated_at?: string | null
        }
        Update: {
          billing_address?: string | null
          client_name?: string
          client_type?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          mailing_address?: string | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          quickbooks_customer_id?: string | null
          tax_exempt?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_branding_settings: {
        Row: {
          accent_color: string | null
          company_abbreviation: string | null
          company_address: string | null
          company_legal_name: string | null
          company_license: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string | null
          id: string
          light_bg_color: string | null
          logo_full_url: string | null
          logo_icon_url: string | null
          logo_report_header_url: string | null
          logo_stacked_url: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          company_abbreviation?: string | null
          company_address?: string | null
          company_legal_name?: string | null
          company_license?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string | null
          id?: string
          light_bg_color?: string | null
          logo_full_url?: string | null
          logo_icon_url?: string | null
          logo_report_header_url?: string | null
          logo_stacked_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          company_abbreviation?: string | null
          company_address?: string | null
          company_legal_name?: string | null
          company_license?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string | null
          id?: string
          light_bg_color?: string | null
          logo_full_url?: string | null
          logo_icon_url?: string | null
          logo_report_header_url?: string | null
          logo_stacked_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          agreement_date: string
          contract_number: string | null
          contract_type: string
          created_at: string
          created_by: string | null
          docx_storage_path: string | null
          docx_url: string | null
          estimate_id: string | null
          field_values: Json
          id: string
          internal_reference: string | null
          notes: string | null
          payee_id: string
          pdf_storage_path: string | null
          pdf_url: string | null
          project_end_date: string | null
          project_id: string
          project_start_date: string | null
          quote_id: string | null
          status: string
          subcontract_price: number
          updated_at: string
          version: number
        }
        Insert: {
          agreement_date: string
          contract_number?: string | null
          contract_type?: string
          created_at?: string
          created_by?: string | null
          docx_storage_path?: string | null
          docx_url?: string | null
          estimate_id?: string | null
          field_values: Json
          id?: string
          internal_reference?: string | null
          notes?: string | null
          payee_id: string
          pdf_storage_path?: string | null
          pdf_url?: string | null
          project_end_date?: string | null
          project_id: string
          project_start_date?: string | null
          quote_id?: string | null
          status?: string
          subcontract_price: number
          updated_at?: string
          version?: number
        }
        Update: {
          agreement_date?: string
          contract_number?: string | null
          contract_type?: string
          created_at?: string
          created_by?: string | null
          docx_storage_path?: string | null
          docx_url?: string | null
          estimate_id?: string | null
          field_values?: Json
          id?: string
          internal_reference?: string | null
          notes?: string | null
          payee_id?: string
          pdf_storage_path?: string | null
          pdf_url?: string | null
          project_end_date?: string | null
          project_id?: string
          project_start_date?: string | null
          quote_id?: string | null
          status?: string
          subcontract_price?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimate_financial_summary"
            referencedColumns: ["estimate_id"]
          },
          {
            foreignKeyName: "contracts_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "payees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      email_messages: {
        Row: {
          created_at: string | null
          delivery_status: string | null
          email_type: string
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          id: string
          project_id: string | null
          recipient_email: string
          recipient_name: string | null
          recipient_user_id: string | null
          resend_email_id: string | null
          sent_at: string | null
          sent_by: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_status?: string | null
          email_type: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          project_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          recipient_user_id?: string | null
          resend_email_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_status?: string | null
          email_type?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          project_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          recipient_user_id?: string | null
          resend_email_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_line_items: {
        Row: {
          actual_cost_rate_per_hour: number | null
          billing_rate_per_hour: number | null
          category: Database["public"]["Enums"]["expense_category"]
          cost_per_unit: number | null
          created_at: string | null
          dependencies: Json | null
          description: string
          duration_days: number | null
          estimate_id: string
          id: string
          is_milestone: boolean | null
          labor_cushion_amount: number | null
          labor_hours: number | null
          markup_amount: number | null
          markup_percent: number | null
          price_per_unit: number | null
          quantity: number | null
          quickbooks_item_id: string | null
          rate: number | null
          schedule_notes: string | null
          scheduled_end_date: string | null
          scheduled_start_date: string | null
          sort_order: number | null
          total: number | null
          total_cost: number | null
          total_markup: number | null
          unit: string | null
        }
        Insert: {
          actual_cost_rate_per_hour?: number | null
          billing_rate_per_hour?: number | null
          category: Database["public"]["Enums"]["expense_category"]
          cost_per_unit?: number | null
          created_at?: string | null
          dependencies?: Json | null
          description: string
          duration_days?: number | null
          estimate_id: string
          id?: string
          is_milestone?: boolean | null
          labor_cushion_amount?: number | null
          labor_hours?: number | null
          markup_amount?: number | null
          markup_percent?: number | null
          price_per_unit?: number | null
          quantity?: number | null
          quickbooks_item_id?: string | null
          rate?: number | null
          schedule_notes?: string | null
          scheduled_end_date?: string | null
          scheduled_start_date?: string | null
          sort_order?: number | null
          total?: number | null
          total_cost?: number | null
          total_markup?: number | null
          unit?: string | null
        }
        Update: {
          actual_cost_rate_per_hour?: number | null
          billing_rate_per_hour?: number | null
          category?: Database["public"]["Enums"]["expense_category"]
          cost_per_unit?: number | null
          created_at?: string | null
          dependencies?: Json | null
          description?: string
          duration_days?: number | null
          estimate_id?: string
          id?: string
          is_milestone?: boolean | null
          labor_cushion_amount?: number | null
          labor_hours?: number | null
          markup_amount?: number | null
          markup_percent?: number | null
          price_per_unit?: number | null
          quantity?: number | null
          quickbooks_item_id?: string | null
          rate?: number | null
          schedule_notes?: string | null
          scheduled_end_date?: string | null
          scheduled_start_date?: string | null
          sort_order?: number | null
          total?: number | null
          total_cost?: number | null
          total_markup?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_line_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimate_financial_summary"
            referencedColumns: ["estimate_id"]
          },
          {
            foreignKeyName: "estimate_line_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          contingency_amount: number | null
          contingency_percent: number | null
          contingency_used: number | null
          created_at: string | null
          created_by: string | null
          date_created: string | null
          default_markup_percent: number | null
          estimate_number: string
          id: string
          is_auto_generated: boolean | null
          is_current_version: boolean | null
          is_draft: boolean
          notes: string | null
          parent_estimate_id: string | null
          project_id: string
          revision_number: number | null
          sequence_number: number | null
          status: Database["public"]["Enums"]["estimate_status"] | null
          target_margin_percent: number | null
          total_amount: number | null
          total_cost: number | null
          total_labor_cushion: number | null
          updated_at: string | null
          valid_for_days: number | null
          valid_until: string | null
          version_number: number | null
        }
        Insert: {
          contingency_amount?: number | null
          contingency_percent?: number | null
          contingency_used?: number | null
          created_at?: string | null
          created_by?: string | null
          date_created?: string | null
          default_markup_percent?: number | null
          estimate_number: string
          id?: string
          is_auto_generated?: boolean | null
          is_current_version?: boolean | null
          is_draft?: boolean
          notes?: string | null
          parent_estimate_id?: string | null
          project_id: string
          revision_number?: number | null
          sequence_number?: number | null
          status?: Database["public"]["Enums"]["estimate_status"] | null
          target_margin_percent?: number | null
          total_amount?: number | null
          total_cost?: number | null
          total_labor_cushion?: number | null
          updated_at?: string | null
          valid_for_days?: number | null
          valid_until?: string | null
          version_number?: number | null
        }
        Update: {
          contingency_amount?: number | null
          contingency_percent?: number | null
          contingency_used?: number | null
          created_at?: string | null
          created_by?: string | null
          date_created?: string | null
          default_markup_percent?: number | null
          estimate_number?: string
          id?: string
          is_auto_generated?: boolean | null
          is_current_version?: boolean | null
          is_draft?: boolean
          notes?: string | null
          parent_estimate_id?: string | null
          project_id?: string
          revision_number?: number | null
          sequence_number?: number | null
          status?: Database["public"]["Enums"]["estimate_status"] | null
          target_margin_percent?: number | null
          total_amount?: number | null
          total_cost?: number | null
          total_labor_cushion?: number | null
          updated_at?: string | null
          valid_for_days?: number | null
          valid_until?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_parent_estimate_id_fkey"
            columns: ["parent_estimate_id"]
            isOneToOne: false
            referencedRelation: "estimate_financial_summary"
            referencedColumns: ["estimate_id"]
          },
          {
            foreignKeyName: "estimates_parent_estimate_id_fkey"
            columns: ["parent_estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_line_item_correlations: {
        Row: {
          auto_correlated: boolean | null
          change_order_line_item_id: string | null
          confidence_score: number | null
          correlation_type: string
          created_at: string
          estimate_line_item_id: string | null
          expense_id: string | null
          expense_split_id: string | null
          id: string
          notes: string | null
          quote_id: string | null
          updated_at: string
        }
        Insert: {
          auto_correlated?: boolean | null
          change_order_line_item_id?: string | null
          confidence_score?: number | null
          correlation_type: string
          created_at?: string
          estimate_line_item_id?: string | null
          expense_id?: string | null
          expense_split_id?: string | null
          id?: string
          notes?: string | null
          quote_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_correlated?: boolean | null
          change_order_line_item_id?: string | null
          confidence_score?: number | null
          correlation_type?: string
          created_at?: string
          estimate_line_item_id?: string | null
          expense_id?: string | null
          expense_split_id?: string | null
          id?: string
          notes?: string | null
          quote_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_line_item_correlations_change_order_line_item_id_fkey"
            columns: ["change_order_line_item_id"]
            isOneToOne: false
            referencedRelation: "change_order_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_line_item_correlations_estimate_line_item_id_fkey"
            columns: ["estimate_line_item_id"]
            isOneToOne: false
            referencedRelation: "estimate_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_line_item_correlations_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_line_item_correlations_expense_split_id_fkey"
            columns: ["expense_split_id"]
            isOneToOne: false
            referencedRelation: "expense_splits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_line_item_correlations_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_splits: {
        Row: {
          created_at: string
          created_by: string | null
          expense_id: string
          id: string
          notes: string | null
          project_id: string
          split_amount: number
          split_percentage: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expense_id: string
          id?: string
          notes?: string | null
          project_id: string
          split_amount: number
          split_percentage?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expense_id?: string
          id?: string
          notes?: string | null
          project_id?: string
          split_amount?: number
          split_percentage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_splits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_splits_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_splits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account_full_name: string | null
          account_name: string | null
          amount: number
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          attachment_url: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string | null
          created_offline: boolean | null
          description: string | null
          end_time: string | null
          expense_date: string | null
          gross_hours: number | null
          hours: number | null
          id: string
          import_batch_id: string | null
          invoice_number: string | null
          is_locked: boolean | null
          is_planned: boolean | null
          is_split: boolean
          local_id: string | null
          lunch_duration_minutes: number | null
          lunch_taken: boolean | null
          payee_id: string | null
          project_id: string
          quickbooks_transaction_id: string | null
          receipt_id: string | null
          rejection_reason: string | null
          start_time: string | null
          submitted_for_approval_at: string | null
          synced_at: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          account_full_name?: string | null
          account_name?: string | null
          amount: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attachment_url?: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          created_offline?: boolean | null
          description?: string | null
          end_time?: string | null
          expense_date?: string | null
          gross_hours?: number | null
          hours?: number | null
          id?: string
          import_batch_id?: string | null
          invoice_number?: string | null
          is_locked?: boolean | null
          is_planned?: boolean | null
          is_split?: boolean
          local_id?: string | null
          lunch_duration_minutes?: number | null
          lunch_taken?: boolean | null
          payee_id?: string | null
          project_id: string
          quickbooks_transaction_id?: string | null
          receipt_id?: string | null
          rejection_reason?: string | null
          start_time?: string | null
          submitted_for_approval_at?: string | null
          synced_at?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          account_full_name?: string | null
          account_name?: string | null
          amount?: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attachment_url?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          created_offline?: boolean | null
          description?: string | null
          end_time?: string | null
          expense_date?: string | null
          gross_hours?: number | null
          hours?: number | null
          id?: string
          import_batch_id?: string | null
          invoice_number?: string | null
          is_locked?: boolean | null
          is_planned?: boolean | null
          is_split?: boolean
          local_id?: string | null
          lunch_duration_minutes?: number | null
          lunch_taken?: boolean | null
          payee_id?: string | null
          project_id?: string
          quickbooks_transaction_id?: string | null
          receipt_id?: string | null
          rejection_reason?: string | null
          start_time?: string | null
          submitted_for_approval_at?: string | null
          synced_at?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "payees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          config: Json | null
          created_at: string | null
          description: string | null
          enabled: boolean | null
          flag_name: string
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          flag_name: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          flag_name?: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          duplicates_skipped: number | null
          errors: number | null
          expenses_imported: number | null
          file_name: string
          id: string
          imported_at: string | null
          imported_by: string | null
          match_log: Json | null
          revenues_imported: number | null
          status: string | null
          total_rows: number | null
        }
        Insert: {
          duplicates_skipped?: number | null
          errors?: number | null
          expenses_imported?: number | null
          file_name: string
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          match_log?: Json | null
          revenues_imported?: number | null
          status?: string | null
          total_rows?: number | null
        }
        Update: {
          duplicates_skipped?: number | null
          errors?: number | null
          expenses_imported?: number | null
          file_name?: string
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          match_log?: Json | null
          revenues_imported?: number | null
          status?: string | null
          total_rows?: number | null
        }
        Relationships: []
      }
      media_comments: {
        Row: {
          comment_text: string
          created_at: string
          id: string
          media_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          id?: string
          media_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          id?: string
          media_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_comments_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "project_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payees: {
        Row: {
          account_number: string | null
          billing_address: string | null
          contact_name: string | null
          contact_title: string | null
          created_at: string | null
          email: string | null
          employee_number: string | null
          full_name: string | null
          hourly_rate: number | null
          id: string
          insurance_expires: string | null
          is_active: boolean | null
          is_internal: boolean | null
          last_synced_at: string | null
          legal_form: string | null
          license_number: string | null
          notes: string | null
          payee_name: string
          payee_type: string | null
          permit_issuer: boolean | null
          phone_numbers: string | null
          provides_labor: boolean | null
          provides_materials: boolean | null
          quickbooks_sync_status: string | null
          quickbooks_synced_at: string | null
          quickbooks_vendor_id: string | null
          quickbooks_vendor_name: string | null
          requires_1099: boolean | null
          state_of_formation: string | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          terms: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_number?: string | null
          billing_address?: string | null
          contact_name?: string | null
          contact_title?: string | null
          created_at?: string | null
          email?: string | null
          employee_number?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          insurance_expires?: string | null
          is_active?: boolean | null
          is_internal?: boolean | null
          last_synced_at?: string | null
          legal_form?: string | null
          license_number?: string | null
          notes?: string | null
          payee_name: string
          payee_type?: string | null
          permit_issuer?: boolean | null
          phone_numbers?: string | null
          provides_labor?: boolean | null
          provides_materials?: boolean | null
          quickbooks_sync_status?: string | null
          quickbooks_synced_at?: string | null
          quickbooks_vendor_id?: string | null
          quickbooks_vendor_name?: string | null
          requires_1099?: boolean | null
          state_of_formation?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          terms?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_number?: string | null
          billing_address?: string | null
          contact_name?: string | null
          contact_title?: string | null
          created_at?: string | null
          email?: string | null
          employee_number?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          insurance_expires?: string | null
          is_active?: boolean | null
          is_internal?: boolean | null
          last_synced_at?: string | null
          legal_form?: string | null
          license_number?: string | null
          notes?: string | null
          payee_name?: string
          payee_type?: string | null
          permit_issuer?: boolean | null
          phone_numbers?: string | null
          provides_labor?: boolean | null
          provides_materials?: boolean | null
          quickbooks_sync_status?: string | null
          quickbooks_synced_at?: string | null
          quickbooks_vendor_id?: string | null
          quickbooks_vendor_name?: string | null
          requires_1099?: boolean | null
          state_of_formation?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          terms?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_application_lines: {
        Row: {
          balance_to_finish: number
          created_at: string
          current_work: number
          id: string
          payment_application_id: string
          percent_complete: number
          previous_work: number
          retainage: number
          scheduled_value: number
          sov_line_item_id: string
          stored_materials: number
          total_completed: number
          updated_at: string
        }
        Insert: {
          balance_to_finish?: number
          created_at?: string
          current_work?: number
          id?: string
          payment_application_id: string
          percent_complete?: number
          previous_work?: number
          retainage?: number
          scheduled_value?: number
          sov_line_item_id: string
          stored_materials?: number
          total_completed?: number
          updated_at?: string
        }
        Update: {
          balance_to_finish?: number
          created_at?: string
          current_work?: number
          id?: string
          payment_application_id?: string
          percent_complete?: number
          previous_work?: number
          retainage?: number
          scheduled_value?: number
          sov_line_item_id?: string
          stored_materials?: number
          total_completed?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_application_lines_payment_application_id_fkey"
            columns: ["payment_application_id"]
            isOneToOne: false
            referencedRelation: "payment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_application_lines_sov_line_item_id_fkey"
            columns: ["sov_line_item_id"]
            isOneToOne: false
            referencedRelation: "sov_line_items"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_applications: {
        Row: {
          application_number: number
          balance_to_finish: number
          certified_amount: number | null
          certified_by: string | null
          certified_date: string | null
          contract_sum_to_date: number
          created_at: string
          created_by: string | null
          current_payment_due: number
          g702_pdf_storage_path: string | null
          g702_pdf_url: string | null
          g703_pdf_storage_path: string | null
          g703_pdf_url: string | null
          id: string
          net_change_orders: number
          notes: string | null
          original_contract_sum: number
          period_from: string
          period_to: string
          project_id: string
          sov_id: string
          status: Database["public"]["Enums"]["payment_application_status"]
          total_completed_to_date: number
          total_earned_less_retainage: number
          total_previous_payments: number
          total_retainage: number
          updated_at: string
          version: number
        }
        Insert: {
          application_number: number
          balance_to_finish?: number
          certified_amount?: number | null
          certified_by?: string | null
          certified_date?: string | null
          contract_sum_to_date?: number
          created_at?: string
          created_by?: string | null
          current_payment_due?: number
          g702_pdf_storage_path?: string | null
          g702_pdf_url?: string | null
          g703_pdf_storage_path?: string | null
          g703_pdf_url?: string | null
          id?: string
          net_change_orders?: number
          notes?: string | null
          original_contract_sum?: number
          period_from: string
          period_to: string
          project_id: string
          sov_id: string
          status?: Database["public"]["Enums"]["payment_application_status"]
          total_completed_to_date?: number
          total_earned_less_retainage?: number
          total_previous_payments?: number
          total_retainage?: number
          updated_at?: string
          version?: number
        }
        Update: {
          application_number?: number
          balance_to_finish?: number
          certified_amount?: number | null
          certified_by?: string | null
          certified_date?: string | null
          contract_sum_to_date?: number
          created_at?: string
          created_by?: string | null
          current_payment_due?: number
          g702_pdf_storage_path?: string | null
          g702_pdf_url?: string | null
          g703_pdf_storage_path?: string | null
          g703_pdf_url?: string | null
          id?: string
          net_change_orders?: number
          notes?: string | null
          original_contract_sum?: number
          period_from?: string
          period_to?: string
          project_id?: string
          sov_id?: string
          status?: Database["public"]["Enums"]["payment_application_status"]
          total_completed_to_date?: number
          total_earned_less_retainage?: number
          total_previous_payments?: number
          total_retainage?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_sov_id_fkey"
            columns: ["sov_id"]
            isOneToOne: false
            referencedRelation: "schedule_of_values"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_payee_reviews: {
        Row: {
          account_full_name: string | null
          created_at: string | null
          id: string
          import_batch_id: string
          matched_payee_id: string | null
          qb_name: string
          resolution: string | null
          resolved_at: string | null
          suggested_payee_type: string | null
        }
        Insert: {
          account_full_name?: string | null
          created_at?: string | null
          id?: string
          import_batch_id: string
          matched_payee_id?: string | null
          qb_name: string
          resolution?: string | null
          resolved_at?: string | null
          suggested_payee_type?: string | null
        }
        Update: {
          account_full_name?: string | null
          created_at?: string | null
          id?: string
          import_batch_id?: string
          matched_payee_id?: string | null
          qb_name?: string
          resolution?: string | null
          resolved_at?: string | null
          suggested_payee_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_payee_reviews_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_payee_reviews_matched_payee_id_fkey"
            columns: ["matched_payee_id"]
            isOneToOne: false
            referencedRelation: "payees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          deactivated_at: string | null
          deactivated_by: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          last_active_at: string | null
          must_change_password: boolean | null
          phone: string | null
          sms_notifications_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          last_active_at?: string | null
          must_change_password?: boolean | null
          phone?: string | null
          sms_notifications_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_active_at?: string | null
          must_change_password?: boolean | null
          phone?: string | null
          sms_notifications_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_deactivated_by_fkey"
            columns: ["deactivated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_aliases: {
        Row: {
          alias: string
          created_at: string | null
          id: string
          is_active: boolean | null
          match_type: string | null
          project_id: string
        }
        Insert: {
          alias: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          match_type?: string | null
          project_id: string
        }
        Update: {
          alias?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          match_type?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_aliases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          expires_at: string | null
          file_name: string
          file_size: number
          file_url: string
          id: string
          mime_type: string
          project_id: string
          related_quote_id: string | null
          updated_at: string
          uploaded_by: string | null
          version_number: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type: string
          expires_at?: string | null
          file_name: string
          file_size: number
          file_url: string
          id?: string
          mime_type: string
          project_id: string
          related_quote_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version_number?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          expires_at?: string | null
          file_name?: string
          file_size?: number
          file_url?: string
          id?: string
          mime_type?: string
          project_id?: string
          related_quote_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_related_quote_id_fkey"
            columns: ["related_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      project_media: {
        Row: {
          altitude: number | null
          caption: string | null
          created_at: string
          description: string | null
          device_model: string | null
          duration: number | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          mime_type: string
          project_id: string
          taken_at: string | null
          thumbnail_url: string | null
          updated_at: string
          upload_source: string | null
          uploaded_by: string | null
        }
        Insert: {
          altitude?: number | null
          caption?: string | null
          created_at?: string
          description?: string | null
          device_model?: string | null
          duration?: number | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          mime_type: string
          project_id: string
          taken_at?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          upload_source?: string | null
          uploaded_by?: string | null
        }
        Update: {
          altitude?: number | null
          caption?: string | null
          created_at?: string
          description?: string | null
          device_model?: string | null
          duration?: number | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          mime_type?: string
          project_id?: string
          taken_at?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          upload_source?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          created_at: string
          id: string
          note_text: string
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          note_text: string
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          note_text?: string
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_revenues: {
        Row: {
          account_full_name: string | null
          account_name: string | null
          amount: number
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          import_batch_id: string | null
          invoice_date: string
          invoice_number: string | null
          is_split: boolean | null
          project_id: string
          quickbooks_transaction_id: string | null
          updated_at: string
        }
        Insert: {
          account_full_name?: string | null
          account_name?: string | null
          amount: number
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          import_batch_id?: string | null
          invoice_date?: string
          invoice_number?: string | null
          is_split?: boolean | null
          project_id: string
          quickbooks_transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          account_full_name?: string | null
          account_name?: string | null
          amount?: number
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          import_batch_id?: string | null
          invoice_date?: string
          invoice_number?: string | null
          is_split?: boolean | null
          project_id?: string
          quickbooks_transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_revenues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_revenues_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_revenues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_hours: number | null
          actual_margin: number | null
          address: string | null
          adjusted_est_costs: number | null
          adjusted_est_margin: number | null
          category: Database["public"]["Enums"]["project_category"]
          client_id: string | null
          client_name: string
          contingency_amount: number | null
          contingency_remaining: number | null
          contracted_amount: number | null
          created_at: string | null
          current_margin: number | null
          customer_po_number: string | null
          default_expense_category: Database["public"]["Enums"]["expense_category"] | null
          do_not_exceed: number | null
          end_date: string | null
          estimated_hours: number | null
          id: string
          job_type: string | null
          last_synced_at: string | null
          margin_percentage: number | null
          minimum_margin_threshold: number | null
          notes: string | null
          original_est_costs: number | null
          original_margin: number | null
          owner_id: string | null
          payment_terms: string | null
          project_name: string
          project_number: string
          project_type: Database["public"]["Enums"]["project_type"] | null
          projected_margin: number | null
          qb_formatted_number: string | null
          quickbooks_job_id: string | null
          sequence_number: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          target_margin: number | null
          total_accepted_quotes: number | null
          updated_at: string | null
          work_order_counter: number | null
        }
        Insert: {
          actual_hours?: number | null
          actual_margin?: number | null
          address?: string | null
          adjusted_est_costs?: number | null
          adjusted_est_margin?: number | null
          category?: Database["public"]["Enums"]["project_category"]
          client_id?: string | null
          client_name: string
          contingency_amount?: number | null
          contingency_remaining?: number | null
          contracted_amount?: number | null
          created_at?: string | null
          current_margin?: number | null
          customer_po_number?: string | null
          default_expense_category?: Database["public"]["Enums"]["expense_category"] | null
          do_not_exceed?: number | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          job_type?: string | null
          last_synced_at?: string | null
          margin_percentage?: number | null
          minimum_margin_threshold?: number | null
          notes?: string | null
          original_est_costs?: number | null
          original_margin?: number | null
          owner_id?: string | null
          payment_terms?: string | null
          project_name: string
          project_number: string
          project_type?: Database["public"]["Enums"]["project_type"] | null
          projected_margin?: number | null
          qb_formatted_number?: string | null
          quickbooks_job_id?: string | null
          sequence_number?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          target_margin?: number | null
          total_accepted_quotes?: number | null
          updated_at?: string | null
          work_order_counter?: number | null
        }
        Update: {
          actual_hours?: number | null
          actual_margin?: number | null
          address?: string | null
          adjusted_est_costs?: number | null
          adjusted_est_margin?: number | null
          category?: Database["public"]["Enums"]["project_category"]
          client_id?: string | null
          client_name?: string
          contingency_amount?: number | null
          contingency_remaining?: number | null
          contracted_amount?: number | null
          created_at?: string | null
          current_margin?: number | null
          customer_po_number?: string | null
          default_expense_category?: Database["public"]["Enums"]["expense_category"] | null
          do_not_exceed?: number | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          job_type?: string | null
          last_synced_at?: string | null
          margin_percentage?: number | null
          minimum_margin_threshold?: number | null
          notes?: string | null
          original_est_costs?: number | null
          original_margin?: number | null
          owner_id?: string | null
          payment_terms?: string | null
          project_name?: string
          project_number?: string
          project_type?: Database["public"]["Enums"]["project_type"] | null
          projected_margin?: number | null
          qb_formatted_number?: string | null
          quickbooks_job_id?: string | null
          sequence_number?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          target_margin?: number | null
          total_accepted_quotes?: number | null
          updated_at?: string | null
          work_order_counter?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "payees"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_account_mappings: {
        Row: {
          app_category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          id: string
          is_active: boolean
          qb_account_full_path: string
          qb_account_name: string
          updated_at: string
        }
        Insert: {
          app_category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          qb_account_full_path: string
          qb_account_name: string
          updated_at?: string
        }
        Update: {
          app_category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          qb_account_full_path?: string
          qb_account_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      quickbooks_connections: {
        Row: {
          access_token: string
          company_name: string | null
          connected_at: string | null
          connected_by: string | null
          created_at: string | null
          disconnected_at: string | null
          disconnected_by: string | null
          environment: string
          id: string
          is_active: boolean | null
          last_error: string | null
          last_sync_at: string | null
          realm_id: string
          refresh_token: string
          token_expires_at: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          company_name?: string | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          disconnected_by?: string | null
          environment?: string
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          realm_id: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          company_name?: string | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          disconnected_by?: string | null
          environment?: string
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          realm_id?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_connections_connected_by_fkey"
            columns: ["connected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quickbooks_connections_disconnected_by_fkey"
            columns: ["disconnected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_oauth_states: {
        Row: {
          created_at: string | null
          expires_at: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          state: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_oauth_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_sync_log: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          entity_id: string | null
          entity_type: string
          environment: string | null
          error_message: string | null
          id: string
          initiated_by: string | null
          quickbooks_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: Database["public"]["Enums"]["sync_status"] | null
          sync_type: Database["public"]["Enums"]["sync_type"]
          synced_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          entity_id?: string | null
          entity_type: string
          environment?: string | null
          error_message?: string | null
          id?: string
          initiated_by?: string | null
          quickbooks_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: Database["public"]["Enums"]["sync_status"] | null
          sync_type: Database["public"]["Enums"]["sync_type"]
          synced_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string
          environment?: string | null
          error_message?: string | null
          id?: string
          initiated_by?: string | null
          quickbooks_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: Database["public"]["Enums"]["sync_status"] | null
          sync_type?: Database["public"]["Enums"]["sync_type"]
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_sync_log_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_transaction_syncs: {
        Row: {
          created_at: string | null
          duplicates_skipped: number | null
          end_date: string
          environment: string
          error_message: string | null
          expenses_imported: number | null
          id: string
          initiated_by: string | null
          revenues_imported: number | null
          start_date: string
          sync_completed_at: string | null
          sync_started_at: string
          sync_status: string
          transactions_fetched: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duplicates_skipped?: number | null
          end_date: string
          environment: string
          error_message?: string | null
          expenses_imported?: number | null
          id?: string
          initiated_by?: string | null
          revenues_imported?: number | null
          start_date: string
          sync_completed_at?: string | null
          sync_started_at?: string
          sync_status?: string
          transactions_fetched?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duplicates_skipped?: number | null
          end_date?: string
          environment?: string
          error_message?: string | null
          expenses_imported?: number | null
          id?: string
          initiated_by?: string | null
          revenues_imported?: number | null
          start_date?: string
          sync_completed_at?: string | null
          sync_started_at?: string
          sync_status?: string
          transactions_fetched?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quote_line_items: {
        Row: {
          category: Database["public"]["Enums"]["expense_category"]
          change_order_line_item_id: string | null
          cost_per_unit: number | null
          created_at: string | null
          description: string | null
          estimate_line_item_id: string | null
          id: string
          markup_amount: number | null
          markup_percent: number | null
          quantity: number | null
          quote_id: string
          rate: number | null
          sort_order: number | null
          total: number | null
          total_cost: number | null
          total_markup: number | null
          unit: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["expense_category"]
          change_order_line_item_id?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          description?: string | null
          estimate_line_item_id?: string | null
          id?: string
          markup_amount?: number | null
          markup_percent?: number | null
          quantity?: number | null
          quote_id: string
          rate?: number | null
          sort_order?: number | null
          total?: number | null
          total_cost?: number | null
          total_markup?: number | null
          unit?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["expense_category"]
          change_order_line_item_id?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          description?: string | null
          estimate_line_item_id?: string | null
          id?: string
          markup_amount?: number | null
          markup_percent?: number | null
          quantity?: number | null
          quote_id?: string
          rate?: number | null
          sort_order?: number | null
          total?: number | null
          total_cost?: number | null
          total_markup?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_line_items_change_order_line_item_id_fkey"
            columns: ["change_order_line_item_id"]
            isOneToOne: false
            referencedRelation: "change_order_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_line_items_estimate_line_item_id_fkey"
            columns: ["estimate_line_item_id"]
            isOneToOne: false
            referencedRelation: "estimate_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_line_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_date: string | null
          attachment_url: string | null
          created_at: string | null
          date_received: string | null
          estimate_id: string | null
          id: string
          includes_labor: boolean
          includes_materials: boolean
          notes: string | null
          payee_id: string
          project_id: string
          quote_number: string
          rejection_reason: string | null
          sequence_number: number | null
          status: Database["public"]["Enums"]["quote_status"] | null
          total_amount: number | null
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          accepted_date?: string | null
          attachment_url?: string | null
          created_at?: string | null
          date_received?: string | null
          estimate_id?: string | null
          id?: string
          includes_labor?: boolean
          includes_materials?: boolean
          notes?: string | null
          payee_id: string
          project_id: string
          quote_number: string
          rejection_reason?: string | null
          sequence_number?: number | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          total_amount?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          accepted_date?: string | null
          attachment_url?: string | null
          created_at?: string | null
          date_received?: string | null
          estimate_id?: string | null
          id?: string
          includes_labor?: boolean
          includes_materials?: boolean
          notes?: string | null
          payee_id?: string
          project_id?: string
          quote_number?: string
          rejection_reason?: string | null
          sequence_number?: number | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          total_amount?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimate_financial_summary"
            referencedColumns: ["estimate_id"]
          },
          {
            foreignKeyName: "quotes_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "payees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          captured_at: string
          created_at: string
          description: string | null
          id: string
          image_url: string
          payee_id: string | null
          project_id: string | null
          quickbooks_error_message: string | null
          quickbooks_request_payload: Json | null
          quickbooks_response_payload: Json | null
          quickbooks_sync_status: string | null
          quickbooks_synced_at: string | null
          quickbooks_synced_by: string | null
          quickbooks_transaction_id: string | null
          rejection_reason: string | null
          submitted_for_approval_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          captured_at?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          payee_id?: string | null
          project_id?: string | null
          quickbooks_error_message?: string | null
          quickbooks_request_payload?: Json | null
          quickbooks_response_payload?: Json | null
          quickbooks_sync_status?: string | null
          quickbooks_synced_at?: string | null
          quickbooks_synced_by?: string | null
          quickbooks_transaction_id?: string | null
          rejection_reason?: string | null
          submitted_for_approval_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          captured_at?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          payee_id?: string | null
          project_id?: string | null
          quickbooks_error_message?: string | null
          quickbooks_request_payload?: Json | null
          quickbooks_response_payload?: Json | null
          quickbooks_sync_status?: string | null
          quickbooks_synced_at?: string | null
          quickbooks_synced_by?: string | null
          quickbooks_transaction_id?: string | null
          rejection_reason?: string | null
          submitted_for_approval_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "payees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_quickbooks_synced_by_fkey"
            columns: ["quickbooks_synced_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_execution_log: {
        Row: {
          config_used: Json | null
          executed_at: string | null
          executed_by: string | null
          execution_time_ms: number | null
          export_format: string | null
          id: string
          report_id: string | null
          row_count: number | null
        }
        Insert: {
          config_used?: Json | null
          executed_at?: string | null
          executed_by?: string | null
          execution_time_ms?: number | null
          export_format?: string | null
          id?: string
          report_id?: string | null
          row_count?: number | null
        }
        Update: {
          config_used?: Json | null
          executed_at?: string | null
          executed_by?: string | null
          execution_time_ms?: number | null
          export_format?: string | null
          id?: string
          report_id?: string | null
          row_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "report_execution_log_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "saved_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_splits: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          project_id: string
          revenue_id: string
          split_amount: number
          split_percentage: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          project_id: string
          revenue_id: string
          split_amount: number
          split_percentage?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          revenue_id?: string
          split_amount?: number
          split_percentage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_splits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_splits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_splits_revenue_id_fkey"
            columns: ["revenue_id"]
            isOneToOne: false
            referencedRelation: "project_revenues"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          category: string | null
          config: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_template: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          config: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      schedule_of_values: {
        Row: {
          created_at: string
          created_by: string | null
          estimate_id: string
          id: string
          original_contract_sum: number
          project_id: string
          retainage_percent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estimate_id: string
          id?: string
          original_contract_sum?: number
          project_id: string
          retainage_percent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estimate_id?: string
          id?: string
          original_contract_sum?: number
          project_id?: string
          retainage_percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_of_values_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimate_financial_summary"
            referencedColumns: ["estimate_id"]
          },
          {
            foreignKeyName: "schedule_of_values_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_of_values_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_sms_logs: {
        Row: {
          created_at: string | null
          error_details: Json | null
          executed_at: string | null
          failure_count: number | null
          id: string
          recipients_count: number | null
          scheduled_sms_id: string | null
          success_count: number | null
        }
        Insert: {
          created_at?: string | null
          error_details?: Json | null
          executed_at?: string | null
          failure_count?: number | null
          id?: string
          recipients_count?: number | null
          scheduled_sms_id?: string | null
          success_count?: number | null
        }
        Update: {
          created_at?: string | null
          error_details?: Json | null
          executed_at?: string | null
          failure_count?: number | null
          id?: string
          recipients_count?: number | null
          scheduled_sms_id?: string | null
          success_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_sms_logs_scheduled_sms_id_fkey"
            columns: ["scheduled_sms_id"]
            isOneToOne: false
            referencedRelation: "scheduled_sms_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_sms_messages: {
        Row: {
          created_at: string | null
          created_by: string
          cron_expression: string | null
          id: string
          is_active: boolean | null
          last_sent_at: string | null
          link_type: string | null
          link_url: string | null
          message_template: string
          name: string
          project_id: string | null
          schedule_type: string
          scheduled_datetime: string | null
          target_roles: Json | null
          target_type: string
          target_user_ids: Json | null
          timezone: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          cron_expression?: string | null
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          link_type?: string | null
          link_url?: string | null
          message_template: string
          name: string
          project_id?: string | null
          schedule_type: string
          scheduled_datetime?: string | null
          target_roles?: Json | null
          target_type: string
          target_user_ids?: Json | null
          timezone?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          cron_expression?: string | null
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          link_type?: string | null
          link_url?: string | null
          message_template?: string
          name?: string
          project_id?: string | null
          schedule_type?: string
          scheduled_datetime?: string | null
          target_roles?: Json | null
          target_type?: string
          target_user_ids?: Json | null
          timezone?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_sms_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_sms_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_messages: {
        Row: {
          created_at: string | null
          delivery_status: string | null
          error_message: string | null
          id: string
          link_type: string | null
          link_url: string | null
          message_body: string
          project_id: string | null
          recipient_name: string | null
          recipient_phone: string
          recipient_user_id: string | null
          sent_at: string | null
          sent_by: string
          status_checked_at: string | null
          textbelt_http_status: number | null
          textbelt_text_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_status?: string | null
          error_message?: string | null
          id?: string
          link_type?: string | null
          link_url?: string | null
          message_body: string
          project_id?: string | null
          recipient_name?: string | null
          recipient_phone: string
          recipient_user_id?: string | null
          sent_at?: string | null
          sent_by: string
          status_checked_at?: string | null
          textbelt_http_status?: number | null
          textbelt_text_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_status?: string | null
          error_message?: string | null
          id?: string
          link_type?: string | null
          link_url?: string | null
          message_body?: string
          project_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          sent_by?: string
          status_checked_at?: string | null
          textbelt_http_status?: number | null
          textbelt_text_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sov_line_items: {
        Row: {
          category: Database["public"]["Enums"]["expense_category"] | null
          created_at: string
          description: string
          id: string
          item_number: string
          retainage_percent_override: number | null
          scheduled_value: number
          sort_order: number
          source_change_order_id: string | null
          source_estimate_line_item_id: string | null
          sov_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["expense_category"] | null
          created_at?: string
          description: string
          id?: string
          item_number: string
          retainage_percent_override?: number | null
          scheduled_value?: number
          sort_order?: number
          source_change_order_id?: string | null
          source_estimate_line_item_id?: string | null
          sov_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["expense_category"] | null
          created_at?: string
          description?: string
          id?: string
          item_number?: string
          retainage_percent_override?: number | null
          scheduled_value?: number
          sort_order?: number
          source_change_order_id?: string | null
          source_estimate_line_item_id?: string | null
          sov_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sov_line_items_source_change_order_id_fkey"
            columns: ["source_change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sov_line_items_source_estimate_line_item_id_fkey"
            columns: ["source_estimate_line_item_id"]
            isOneToOne: false
            referencedRelation: "estimate_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sov_line_items_sov_id_fkey"
            columns: ["sov_id"]
            isOneToOne: false
            referencedRelation: "schedule_of_values"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          due_date: string | null
          id: string
          notes: string | null
          notification_sent_at: string | null
          priority: number | null
          reminder_sent_at: string | null
          training_content_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          notification_sent_at?: string | null
          priority?: number | null
          reminder_sent_at?: string | null
          training_content_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          notification_sent_at?: string | null
          priority?: number | null
          reminder_sent_at?: string | null
          training_content_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_training_content_id_fkey"
            columns: ["training_content_id"]
            isOneToOne: false
            referencedRelation: "training_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_completions: {
        Row: {
          acknowledged: boolean | null
          completed_at: string | null
          id: string
          notes: string | null
          time_spent_minutes: number | null
          training_content_id: string
          user_id: string
        }
        Insert: {
          acknowledged?: boolean | null
          completed_at?: string | null
          id?: string
          notes?: string | null
          time_spent_minutes?: number | null
          training_content_id: string
          user_id: string
        }
        Update: {
          acknowledged?: boolean | null
          completed_at?: string | null
          id?: string
          notes?: string | null
          time_spent_minutes?: number | null
          training_content_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_completions_training_content_id_fkey"
            columns: ["training_content_id"]
            isOneToOne: false
            referencedRelation: "training_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_content: {
        Row: {
          content_type: Database["public"]["Enums"]["training_content_type"]
          content_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          embed_code: string | null
          id: string
          is_required: boolean | null
          status: Database["public"]["Enums"]["training_status"] | null
          storage_path: string | null
          target_roles: Database["public"]["Enums"]["app_role"][] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content_type: Database["public"]["Enums"]["training_content_type"]
          content_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          embed_code?: string | null
          id?: string
          is_required?: boolean | null
          status?: Database["public"]["Enums"]["training_status"] | null
          storage_path?: string | null
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content_type?: Database["public"]["Enums"]["training_content_type"]
          content_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          embed_code?: string | null
          id?: string
          is_required?: boolean | null
          status?: Database["public"]["Enums"]["training_status"] | null
          storage_path?: string | null
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_content_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_notifications: {
        Row: {
          delivered: boolean | null
          email_id: string | null
          error_message: string | null
          id: string
          notification_type: string
          sent_at: string | null
          training_content_id: string
          user_id: string
        }
        Insert: {
          delivered?: boolean | null
          email_id?: string | null
          error_message?: string | null
          id?: string
          notification_type: string
          sent_at?: string | null
          training_content_id: string
          user_id: string
        }
        Update: {
          delivered?: boolean | null
          email_id?: string | null
          error_message?: string | null
          id?: string
          notification_type?: string
          sent_at?: string | null
          training_content_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_notifications_training_content_id_fkey"
            columns: ["training_content_id"]
            isOneToOne: false
            referencedRelation: "training_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      estimate_financial_summary: {
        Row: {
          contingency_amount: number | null
          contingency_percent: number | null
          created_at: string | null
          cushion_hours_capacity: number | null
          estimate_id: string | null
          estimate_number: string | null
          estimated_gross_margin_percent: number | null
          estimated_gross_profit: number | null
          max_gross_profit_potential: number | null
          max_potential_margin_percent: number | null
          project_id: string | null
          schedule_buffer_percent: number | null
          status: Database["public"]["Enums"]["estimate_status"] | null
          subtotal: number | null
          total_estimated_cost: number | null
          total_labor_actual_cost: number | null
          total_labor_billing_cost: number | null
          total_labor_capacity: number | null
          total_labor_client_price: number | null
          total_labor_cushion: number | null
          total_labor_hours: number | null
          total_with_contingency: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_labor_hours: {
        Row: {
          approved_entries: number | null
          employee_name: string | null
          employee_number: string | null
          entry_count: number | null
          gross_hours: number | null
          hourly_rate: number | null
          pending_entries: number | null
          rejected_entries: number | null
          total_cost: number | null
          paid_hours: number | null
          week_end_saturday: string | null
          week_start_sunday: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ai_find_client_by_name: {
        Args: { p_search_term: string }
        Returns: {
          client_name: string
          confidence: number
          email: string
          id: string
          match_type: string
          phone: string
        }[]
      }
      ai_get_project_summary: { Args: { p_project_id: string }; Returns: Json }
      ai_resolve_project: {
        Args: { p_search_term: string }
        Returns: {
          client_name: string
          confidence: number
          id: string
          match_type: string
          project_name: string
          project_number: string
          project_type: Database["public"]["Enums"]["project_type"]
          status: Database["public"]["Enums"]["project_status"]
        }[]
      }
      calculate_contingency_remaining: {
        Args: { project_id_param: string }
        Returns: number
      }
      calculate_estimate_labor_cushion: {
        Args: { p_estimate_id: string }
        Returns: number
      }
      calculate_project_margins: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      can_access_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      check_margin_thresholds: {
        Args: { project_id_param: string }
        Returns: string
      }
      check_scheduled_sms_cron_job: {
        Args: never
        Returns: {
          command: string
          jobid: number
          schedule: string
        }[]
      }
      cleanup_expired_oauth_states: { Args: never; Returns: undefined }
      create_estimate_version: {
        Args: { new_version_number?: number; source_estimate_id: string }
        Returns: string
      }
      create_payment_application: {
        Args: {
          p_period_from: string
          p_period_to: string
          p_project_id: string
        }
        Returns: string
      }
      delete_project_cascade: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      duplicate_quote_for_estimate: {
        Args: { source_quote_id: string; target_estimate_id: string }
        Returns: string
      }
      execute_ai_query: { Args: { p_query: string }; Returns: Json }
      execute_simple_report: {
        Args: {
          p_data_source: string
          p_filters?: Json
          p_limit?: number
          p_sort_by?: string
          p_sort_dir?: string
        }
        Returns: Json
      }
      generate_estimate_number: {
        Args: { project_id_param: string; project_number_param: string }
        Returns: string
      }
      generate_quote_number: {
        Args: {
          estimate_id_param?: string
          project_id_param: string
          project_number_param: string
        }
        Returns: string
      }
      generate_sov_from_estimate: {
        Args: {
          p_estimate_id: string
          p_project_id: string
          p_retainage_percent?: number
        }
        Returns: string
      }
      generate_work_order_number: {
        Args: { project_id_param: string; project_number_param: string }
        Returns: string
      }
      get_database_schema: { Args: never; Returns: Json }
      get_next_project_number: { Args: never; Returns: string }
      get_profit_analysis_data: {
        Args: { status_filter?: string[] }
        Returns: {
          accepted_quote_count: number
          actual_margin: number
          adjusted_est_costs: number
          adjusted_est_margin: number
          budget_utilization_percent: number
          change_order_cost: number
          change_order_count: number
          change_order_revenue: number
          client_name: string
          contingency_amount: number
          contingency_remaining: number
          contingency_used: number
          contracted_amount: number
          cost_variance: number
          cost_variance_percent: number
          current_margin: number
          end_date: string
          expenses_by_category: Json
          id: string
          invoice_count: number
          job_type: string
          margin_percentage: number
          original_est_costs: number
          original_margin: number
          project_name: string
          project_number: string
          projected_margin: number
          start_date: string
          status: string
          total_accepted_quotes: number
          total_expenses: number
          total_invoiced: number
        }[]
      }
      get_project_financial_summary: {
        Args: never
        Returns: {
          accepted_quote_count: number
          actual_margin_percentage: number
          actual_profit: number
          change_order_costs: number
          change_order_revenue: number
          client_name: string
          contingency_amount: number
          cost_variance: number
          expense_count: number
          invoice_count: number
          project_id: string
          project_name: string
          project_number: string
          revenue_variance: number
          status: Database["public"]["Enums"]["project_status"]
          total_estimated: number
          total_expenses: number
          total_invoiced: number
          total_quoted: number
        }[]
      }
      get_project_revenue_total: {
        Args: { p_project_id: string }
        Returns: number
      }
      get_scheduled_sms_recipients: {
        Args: {
          p_target_roles: Json
          p_target_type: string
          p_target_user_ids: Json
        }
        Returns: {
          full_name: string
          phone: string
          user_id: string
        }[]
      }
      get_user_auth_status: {
        Args: never
        Returns: {
          confirmed_at: string
          email: string
          full_name: string
          has_password: boolean
          id: string
          is_active: boolean
          last_active_at: string
          last_sign_in_at: string
          must_change_password: boolean
        }[]
      }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_activity: {
        Args: {
          p_activity_type: string
          p_description: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_project_id: string
          p_user_id: string
        }
        Returns: string
      }
      refresh_estimate_labor_cushion: {
        Args: { p_estimate_id: string }
        Returns: number
      }
      safe_cast_to_expense_category: {
        Args: { val: string }
        Returns: Database["public"]["Enums"]["expense_category"]
      }
      safe_cast_to_project_status: {
        Args: { val: string }
        Returns: Database["public"]["Enums"]["project_status"]
      }
      safe_cast_to_quote_status: {
        Args: { val: string }
        Returns: Database["public"]["Enums"]["quote_status"]
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "field_worker"
      change_order_status: "pending" | "approved" | "rejected"
      estimate_status: "draft" | "sent" | "approved" | "rejected" | "expired"
      expense_category:
        | "labor_internal"
        | "subcontractors"
        | "materials"
        | "equipment"
        | "other"
        | "permits"
        | "management"
        | "office_expenses"
        | "vehicle_expenses"
        | "tools"
        | "software"
        | "vehicle_maintenance"
        | "gas"
        | "meals"
      payment_application_status:
        | "draft"
        | "submitted"
        | "certified"
        | "paid"
        | "rejected"
      project_category: "construction" | "system" | "overhead"
      project_status:
        | "estimating"
        | "approved"
        | "in_progress"
        | "complete"
        | "on_hold"
        | "cancelled"
      project_type: "construction_project" | "work_order"
      quote_status: "pending" | "accepted" | "rejected" | "expired"
      sync_status: "success" | "failed" | "pending"
      sync_type: "import" | "export"
      training_content_type:
        | "video_link"
        | "video_embed"
        | "document"
        | "presentation"
        | "external_link"
      training_status: "draft" | "published" | "archived"
      transaction_type: "expense" | "bill" | "check" | "credit_card" | "cash"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
```

_No inline documentation provided._

**Example**

```ts
import type { Database } from '@/integrations/supabase/types';

type Example = Database;
```

### DocumentType

**Import:** `@/types/document`

- Defined in: `types/document.ts`
- Export type: named

```ts
type DocumentType = | 'drawing' 
  | 'permit' 
  | 'license' 
  | 'contract' 
  | 'specification' 
  | 'report'
  | 'other'
```

_No inline documentation provided._

**Example**

```ts
import type { DocumentType } from '@/types/document';

type Example = DocumentType;
```

### EnhancementMode

**Import:** `@/hooks/useAICaptionEnhancement`

- Defined in: `hooks/useAICaptionEnhancement.ts`
- Export type: named

```ts
type EnhancementMode = 'technical' | 'client-friendly' | 'next-steps'
```

_No inline documentation provided._

**Example**

```ts
import type { EnhancementMode } from '@/hooks/useAICaptionEnhancement';

type Example = EnhancementMode;
```

### Enums

**Import:** `@/integrations/supabase/types`

- Defined in: `integrations/supabase/types.ts`
- Export type: named

```ts
type Enums = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never
```

_No inline documentation provided._

**Example**

```ts
import type { Enums } from '@/integrations/supabase/types';

type Example = Enums;
```

### EstimateStatus

**Import:** `@/lib/statusColors`

- Defined in: `lib/statusColors.ts`
- Export type: named

```ts
type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
```

_No inline documentation provided._

**Example**

```ts
import type { EstimateStatus } from '@/lib/statusColors';

type Example = EstimateStatus;
```

### EstimateStatus

**Import:** `@/types/estimate`

- Defined in: `types/estimate.ts`
- Export type: named

```ts
type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
```

_No inline documentation provided._

**Example**

```ts
import type { EstimateStatus } from '@/types/estimate';

type Example = EstimateStatus;
```

### ExpenseStatus

**Import:** `@/lib/statusColors`

- Defined in: `lib/statusColors.ts`
- Export type: named

```ts
type ExpenseStatus = 'pending' | 'approved' | 'rejected'
```

_No inline documentation provided._

**Example**

```ts
import type { ExpenseStatus } from '@/lib/statusColors';

type Example = ExpenseStatus;
```

### FinancialHealthStatus

**Import:** `@/utils/financialColors`

- Defined in: `utils/financialColors.ts`
- Export type: named

```ts
type FinancialHealthStatus = 'healthy' | 'warning' | 'critical' | 'neutral'
```

Unified financial status color system.

Replaces ad-hoc color usage across MarginDashboard, ProjectProfitMargin, etc.
Compatible with the existing thresholdUtils.ts pattern (which remains unchanged).
Aligned with business-benchmarks.ts thresholds.

Usage:
  import { getMarginColor, getBudgetUtilizationColor } from '@/utils/financialColors';
  <span className={getMarginColor(marginPercent)}>18.6%</span>

**Example**

```ts
import type { FinancialHealthStatus } from '@/utils/financialColors';

type Example = FinancialHealthStatus;
```

### Grid

**Import:** `@/types/importTypes`

- Defined in: `types/importTypes.ts`
- Export type: named

```ts
type Grid = {
  rows: string[][];
  rowCount: number;
  colCount: number;
}
```

_No inline documentation provided._

**Example**

```ts
import type { Grid } from '@/types/importTypes';

type Example = Grid;
```

### ImportStep

**Import:** `@/types/importTypes`

- Defined in: `types/importTypes.ts`
- Export type: named

```ts
type ImportStep = 'upload' | 'mapping' | 'processing' | 'review'
```

_No inline documentation provided._

**Example**

```ts
import type { ImportStep } from '@/types/importTypes';

type Example = ImportStep;
```

### ItemCategory

**Import:** `@/types/importTypes`

- Defined in: `types/importTypes.ts`
- Export type: named

```ts
type ItemCategory = 'labor_internal' | 'materials' | 'subcontractors' | 'management'
```

_No inline documentation provided._

**Example**

```ts
import type { ItemCategory } from '@/types/importTypes';

type Example = ItemCategory;
```

### Json

**Import:** `@/integrations/supabase/types`

- Defined in: `integrations/supabase/types.ts`
- Export type: named

```ts
type Json = | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]
```

_No inline documentation provided._

**Example**

```ts
import type { Json } from '@/integrations/supabase/types';

type Example = Json;
```

### KPIDataType

**Import:** `@/lib/kpi-definitions/types`

- Defined in: `lib/kpi-definitions/types.ts`
- Export type: named

```ts
type KPIDataType = | 'currency'      // Dollar amounts
  | 'percent'       // Percentages (0-100)
  | 'number'        // Plain numbers (counts, hours)
  | 'boolean'       // True/false flags
  | 'text'          // String values
  | 'date'          // Date values
  | 'enum'
```

Data type for formatting and validation

**Example**

```ts
import type { KPIDataType } from '@/lib/kpi-definitions/types';

type Example = KPIDataType;
```

### KPIDomain

**Import:** `@/lib/kpi-definitions/types`

- Defined in: `lib/kpi-definitions/types.ts`
- Export type: named

```ts
type KPIDomain = | 'project'
  | 'estimate'
  | 'quote'
  | 'expense'
  | 'revenue'
  | 'change_order'
  | 'work_order'
  | 'time_entry'
  | 'payee'
  | 'training'
  | 'deprecated'
```

Which domain this KPI belongs to

**Example**

```ts
import type { KPIDomain } from '@/lib/kpi-definitions/types';

type Example = KPIDomain;
```

### KPISource

**Import:** `@/lib/kpi-definitions/types`

- Defined in: `lib/kpi-definitions/types.ts`
- Export type: named

```ts
type KPISource = | 'database'      // Stored or calculated in PostgreSQL
  | 'frontend'      // Calculated in React/TypeScript
  | 'view'          // Calculated in a database view
  | 'deprecated'
```

KPI Definition Types

Single source of truth for all KPI measure definitions.
Used by both KPIGuide.tsx (UI) and AI Report Assistant (edge function).

Where the KPI value comes from

**Example**

```ts
import type { KPISource } from '@/lib/kpi-definitions/types';

type Example = KPISource;
```

### LegalFormType

**Import:** `@/types/contract`

- Defined in: `types/contract.ts`
- Export type: named

```ts
type LegalFormType = | 'LLC'
  | 'Corp'
  | 'Inc'
  | 'Sole Proprietor'
  | 'Partnership'
  | 'LLP'
  | 'S-Corp'
  | 'Other'
```

Legal form options for subcontractors

**Example**

```ts
import type { LegalFormType } from '@/types/contract';

type Example = LegalFormType;
```

### LinkageStatus

**Import:** `@/hooks/useEmployeesAudit`

- Defined in: `hooks/useEmployeesAudit.ts`
- Export type: named

```ts
type LinkageStatus = | 'OK'
  | 'NO_PAYEE'
  | 'PAYEE_NOT_LINKED'
  | 'PAYEE_INACTIVE'
  | 'OTHER'
```

_No inline documentation provided._

**Example**

```ts
import type { LinkageStatus } from '@/hooks/useEmployeesAudit';

type Example = LinkageStatus;
```

### LogoVariant

**Import:** `@/types/branding`

- Defined in: `types/branding.ts`
- Export type: named

```ts
type LogoVariant = 'full' | 'icon' | 'stacked' | 'report-header'
```

_No inline documentation provided._

**Example**

```ts
import type { LogoVariant } from '@/types/branding';

type Example = LogoVariant;
```

### MarginThresholdStatus

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
type MarginThresholdStatus = | 'critical'
  | 'at_risk'
  | 'on_target'
  | 'excellent'
  | 'unknown'
```

_No inline documentation provided._

**Example**

```ts
import type { MarginThresholdStatus } from '@/types/project';

type Example = MarginThresholdStatus;
```

### NoteCardVariant

**Import:** `@/components/notes/NoteCard`

- Defined in: `components/notes/NoteCard.tsx`
- Export type: named

```ts
type NoteCardVariant = 'default' | 'compact'
```

_No inline documentation provided._

**Example**

```ts
import type { NoteCardVariant } from '@/components/notes/NoteCard';

type Example = NoteCardVariant;
```

### NoteInputVariant

**Import:** `@/components/notes/NoteInput`

- Defined in: `components/notes/NoteInput.tsx`
- Export type: named

```ts
type NoteInputVariant = 'default' | 'compact'
```

_No inline documentation provided._

**Example**

```ts
import type { NoteInputVariant } from '@/components/notes/NoteInput';

type Example = NoteInputVariant;
```

### NotificationType

**Import:** `@/types/training`

- Defined in: `types/training.ts`
- Export type: named

```ts
type NotificationType = 'assignment' | 'reminder' | 'overdue'
```

_No inline documentation provided._

**Example**

```ts
import type { NotificationType } from '@/types/training';

type Example = NotificationType;
```

### OperationalProjectNumber

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
type OperationalProjectNumber = typeof OPERATIONAL_PROJECT_NUMBERS[number]
```

_No inline documentation provided._

**Example**

```ts
import type { OperationalProjectNumber } from '@/types/project';

type Example = OperationalProjectNumber;
```

### PaymentApplication

**Import:** `@/types/paymentApplication`

- Defined in: `types/paymentApplication.ts`
- Export type: named

```ts
type PaymentApplication = Database["public"]["Tables"]["payment_applications"]["Row"]
```

_No inline documentation provided._

**Example**

```ts
import type { PaymentApplication } from '@/types/paymentApplication';

type Example = PaymentApplication;
```

### PaymentApplicationInsert

**Import:** `@/types/paymentApplication`

- Defined in: `types/paymentApplication.ts`
- Export type: named

```ts
type PaymentApplicationInsert = Database["public"]["Tables"]["payment_applications"]["Insert"]
```

_No inline documentation provided._

**Example**

```ts
import type { PaymentApplicationInsert } from '@/types/paymentApplication';

type Example = PaymentApplicationInsert;
```

### PaymentApplicationLine

**Import:** `@/types/paymentApplication`

- Defined in: `types/paymentApplication.ts`
- Export type: named

```ts
type PaymentApplicationLine = Database["public"]["Tables"]["payment_application_lines"]["Row"]
```

_No inline documentation provided._

**Example**

```ts
import type { PaymentApplicationLine } from '@/types/paymentApplication';

type Example = PaymentApplicationLine;
```

### PaymentApplicationLineUpdate

**Import:** `@/types/paymentApplication`

- Defined in: `types/paymentApplication.ts`
- Export type: named

```ts
type PaymentApplicationLineUpdate = Database["public"]["Tables"]["payment_application_lines"]["Update"]
```

_No inline documentation provided._

**Example**

```ts
import type { PaymentApplicationLineUpdate } from '@/types/paymentApplication';

type Example = PaymentApplicationLineUpdate;
```

### PaymentApplicationStatus

**Import:** `@/types/paymentApplication`

- Defined in: `types/paymentApplication.ts`
- Export type: named

```ts
type PaymentApplicationStatus = Database["public"]["Enums"]["payment_application_status"]
```

_No inline documentation provided._

**Example**

```ts
import type { PaymentApplicationStatus } from '@/types/paymentApplication';

type Example = PaymentApplicationStatus;
```

### PreviewableFileType

**Import:** `@/utils/documentFileType`

- Defined in: `utils/documentFileType.ts`
- Export type: named

```ts
type PreviewableFileType = 'pdf' | 'image' | 'video' | 'office' | 'receipt' | 'other'
```

_No inline documentation provided._

**Example**

```ts
import type { PreviewableFileType } from '@/utils/documentFileType';

type Example = PreviewableFileType;
```

### ProjectCategory

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
type ProjectCategory = 'construction' | 'system' | 'overhead'
```

_No inline documentation provided._

**Example**

```ts
import type { ProjectCategory } from '@/types/project';

type Example = ProjectCategory;
```

### ProjectStatus

**Import:** `@/lib/statusColors`

- Defined in: `lib/statusColors.ts`
- Export type: named

```ts
type ProjectStatus = | 'estimating' 
  | 'approved' 
  | 'in_progress' 
  | 'complete' 
  | 'on_hold' 
  | 'cancelled'
```

Centralized status color definitions
Single source of truth for all status badges across the app

Color Philosophy:
- Estimating: Amber (work in progress, needs attention)
- Approved: Green (positive, ready to start)
- In Progress: Blue (active, working)
- Complete: Emerald (success, finished - distinct from approved)
- On Hold: Yellow (warning, paused)
- Cancelled: Red (negative, stopped)

**Example**

```ts
import type { ProjectStatus } from '@/lib/statusColors';

type Example = ProjectStatus;
```

### ProjectStatus

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
type ProjectStatus = | 'estimating'
  | 'approved'
  | 'in_progress'
  | 'complete'
  | 'on_hold'
  | 'cancelled'
```

_No inline documentation provided._

**Example**

```ts
import type { ProjectStatus } from '@/types/project';

type Example = ProjectStatus;
```

### ProjectType

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
type ProjectType = 'construction_project' | 'work_order'
```

_No inline documentation provided._

**Example**

```ts
import type { ProjectType } from '@/types/project';

type Example = ProjectType;
```

### QuickBooksAccountMapping

**Import:** `@/utils/importCore`

- Defined in: `utils/importCore.ts`
- Export type: named

```ts
type QuickBooksAccountMapping = {
  qb_account_name: string;
  qb_account_full_path: string;
  app_category: string;
}
```

_No inline documentation provided._

**Example**

```ts
import type { QuickBooksAccountMapping } from '@/utils/importCore';

type Example = QuickBooksAccountMapping;
```

### QuoteStatus

**Import:** `@/lib/statusColors`

- Defined in: `lib/statusColors.ts`
- Export type: named

```ts
type QuoteStatus = 'pending' | 'accepted' | 'rejected' | 'expired'
```

_No inline documentation provided._

**Example**

```ts
import type { QuoteStatus } from '@/lib/statusColors';

type Example = QuoteStatus;
```

### ReportCategory

**Import:** `@/types/reports`

- Defined in: `types/reports.ts`
- Export type: named

```ts
type ReportCategory = | 'ai'
  | 'standard' 
  | 'custom' 
  | 'financial' 
  | 'operational' 
  | 'cost' 
  | 'labor' 
  | 'training'
  | 'other'
```

_No inline documentation provided._

**Example**

```ts
import type { ReportCategory } from '@/types/reports';

type Example = ReportCategory;
```

### ScheduleOfValues

**Import:** `@/types/paymentApplication`

- Defined in: `types/paymentApplication.ts`
- Export type: named

```ts
type ScheduleOfValues = Database["public"]["Tables"]["schedule_of_values"]["Row"]
```

_No inline documentation provided._

**Example**

```ts
import type { ScheduleOfValues } from '@/types/paymentApplication';

type Example = ScheduleOfValues;
```

### SOVLineItem

**Import:** `@/types/paymentApplication`

- Defined in: `types/paymentApplication.ts`
- Export type: named

```ts
type SOVLineItem = Database["public"]["Tables"]["sov_line_items"]["Row"]
```

_No inline documentation provided._

**Example**

```ts
import type { SOVLineItem } from '@/types/paymentApplication';

type Example = SOVLineItem;
```

### SOVLineItemInsert

**Import:** `@/types/paymentApplication`

- Defined in: `types/paymentApplication.ts`
- Export type: named

```ts
type SOVLineItemInsert = Database["public"]["Tables"]["sov_line_items"]["Insert"]
```

_No inline documentation provided._

**Example**

```ts
import type { SOVLineItemInsert } from '@/types/paymentApplication';

type Example = SOVLineItemInsert;
```

### SystemProjectNumber

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
type SystemProjectNumber = typeof SYSTEM_PROJECT_NUMBERS[number]
```

_No inline documentation provided._

**Example**

```ts
import type { SystemProjectNumber } from '@/types/project';

type Example = SystemProjectNumber;
```

### Tables

**Import:** `@/integrations/supabase/types`

- Defined in: `integrations/supabase/types.ts`
- Export type: named

```ts
type Tables = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never
```

_No inline documentation provided._

**Example**

```ts
import type { Tables } from '@/integrations/supabase/types';

type Example = Tables;
```

### TablesInsert

**Import:** `@/integrations/supabase/types`

- Defined in: `integrations/supabase/types.ts`
- Export type: named

```ts
type TablesInsert = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never
```

_No inline documentation provided._

**Example**

```ts
import type { TablesInsert } from '@/integrations/supabase/types';

type Example = TablesInsert;
```

### TablesUpdate

**Import:** `@/integrations/supabase/types`

- Defined in: `integrations/supabase/types.ts`
- Export type: named

```ts
type TablesUpdate = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never
```

_No inline documentation provided._

**Example**

```ts
import type { TablesUpdate } from '@/integrations/supabase/types';

type Example = TablesUpdate;
```

### TrainingContentType

**Import:** `@/types/training`

- Defined in: `types/training.ts`
- Export type: named

```ts
type TrainingContentType = 'video_link' | 'video_embed' | 'document' | 'presentation' | 'external_link'
```

_No inline documentation provided._

**Example**

```ts
import type { TrainingContentType } from '@/types/training';

type Example = TrainingContentType;
```

### TrainingItemStatus

**Import:** `@/types/training`

- Defined in: `types/training.ts`
- Export type: named

```ts
type TrainingItemStatus = 'completed' | 'overdue' | 'pending' | 'assigned'
```

_No inline documentation provided._

**Example**

```ts
import type { TrainingItemStatus } from '@/types/training';

type Example = TrainingItemStatus;
```

### TrainingStatus

**Import:** `@/types/training`

- Defined in: `types/training.ts`
- Export type: named

```ts
type TrainingStatus = 'draft' | 'published' | 'archived'
```

_No inline documentation provided._

**Example**

```ts
import type { TrainingStatus } from '@/types/training';

type Example = TrainingStatus;
```

### TransactionStatus

**Import:** `@/components/import/TransactionSelectionTable`

- Defined in: `components/import/TransactionSelectionTable.tsx`
- Export type: named

```ts
type TransactionStatus = 'new' | 'duplicate' | 'error' | 'unassigned'
```

_No inline documentation provided._

**Example**

```ts
import type { TransactionStatus } from '@/components/import/TransactionSelectionTable';

type Example = TransactionStatus;
```

### TransactionType

**Import:** `@/types/expense`

- Defined in: `types/expense.ts`
- Export type: named

```ts
type TransactionType = 'expense' | 'bill' | 'check' | 'credit_card' | 'cash'
```

_No inline documentation provided._

**Example**

```ts
import type { TransactionType } from '@/types/expense';

type Example = TransactionType;
```

### USState

**Import:** `@/types/contract`

- Defined in: `types/contract.ts`
- Export type: named

```ts
type USState = | 'AL' | 'AK' | 'AZ' | 'AR' | 'CA' | 'CO' | 'CT' | 'DE' | 'FL' | 'GA'
  | 'HI' | 'ID' | 'IL' | 'IN' | 'IA' | 'KS' | 'KY' | 'LA' | 'ME' | 'MD'
  | 'MA' | 'MI' | 'MN' | 'MS' | 'MO' | 'MT' | 'NE' | 'NV' | 'NH' | 'NJ'
  | 'NM' | 'NY' | 'NC' | 'ND' | 'OH' | 'OK' | 'OR' | 'PA' | 'RI' | 'SC'
  | 'SD' | 'TN' | 'TX' | 'UT' | 'VT' | 'VA' | 'WA' | 'WV' | 'WI' | 'WY'
  | 'DC'
```

US State abbreviations

**Example**

```ts
import type { USState } from '@/types/contract';

type Example = USState;
```

### WarningCode

**Import:** `@/types/importTypes`

- Defined in: `types/importTypes.ts`
- Export type: named

```ts
type WarningCode = | 'HEADER_NOT_FOUND'
  | 'COLUMN_MISSING'
  | 'COLUMN_AMBIGUOUS'
  | 'STOP_MARKER_FOUND'
  | 'STOP_BY_STRUCTURE'
  | 'SKIPPED_SUMMARY_ROW'
  | 'SKIPPED_EMPTY_ROW'
  | 'MARKUP_MISSING'
  | 'TOTAL_MISMATCH'
  | 'UNPARSEABLE_CURRENCY'
  | 'UNPARSEABLE_PERCENT'
  | 'LOW_CONFIDENCE_MAPPING'
  | 'NEGATIVE_VALUE'
```

_No inline documentation provided._

**Example**

```ts
import type { WarningCode } from '@/types/importTypes';

type Example = WarningCode;
```

## Enums

Total: 5

### ExpenseCategory

**Import:** `@/types/expense`

- Defined in: `types/expense.ts`
- Export type: named

```ts
enum ExpenseCategory = LABOR | SUBCONTRACTOR | MATERIALS | EQUIPMENT | PERMITS | MANAGEMENT | TOOLS | SOFTWARE | VEHICLE_MAINTENANCE | GAS | MEALS | OFFICE_EXPENSES | VEHICLE_EXPENSES | OTHER
```

_No inline documentation provided._

**Example**

```ts
import { ExpenseCategory } from '@/types/expense';

const value = ExpenseCategory.Example;
```

### LineItemCategory

**Import:** `@/types/estimate`

- Defined in: `types/estimate.ts`
- Export type: named

```ts
enum LineItemCategory = LABOR | SUBCONTRACTOR | MATERIALS | EQUIPMENT | PERMITS | MANAGEMENT | OTHER
```

_No inline documentation provided._

**Example**

```ts
import { LineItemCategory } from '@/types/estimate';

const value = LineItemCategory.Example;
```

### PayeeType

**Import:** `@/types/payee`

- Defined in: `types/payee.ts`
- Export type: named

```ts
enum PayeeType = SUBCONTRACTOR | MATERIAL_SUPPLIER | EQUIPMENT_RENTAL | INTERNAL_LABOR | MANAGEMENT | PERMIT_AUTHORITY | OTHER
```

_No inline documentation provided._

**Example**

```ts
import { PayeeType } from '@/types/payee';

const value = PayeeType.Example;
```

### QuoteStatus

**Import:** `@/types/quote`

- Defined in: `types/quote.ts`
- Export type: named

```ts
enum QuoteStatus = PENDING | ACCEPTED | REJECTED | EXPIRED
```

_No inline documentation provided._

**Example**

```ts
import { QuoteStatus } from '@/types/quote';

const value = QuoteStatus.Example;
```

### UnitCategory

**Import:** `@/utils/units`

- Defined in: `utils/units.ts`
- Export type: named

```ts
enum UnitCategory = COUNT | LENGTH | AREA | VOLUME | WEIGHT | TIME | LIQUID | MATERIAL
```

_No inline documentation provided._

**Example**

```ts
import { UnitCategory } from '@/utils/units';

const value = UnitCategory.Example;
```

## Values

Total: 65

### ACCOUNT_CATEGORY_MAP

**Import:** `@/utils/importCore`

- Defined in: `utils/importCore.ts`
- Export type: named

```ts
Record<string, ExpenseCategory>
```

_No inline documentation provided._

**Example**

```ts
import { ACCOUNT_CATEGORY_MAP } from '@/utils/importCore';

// Use ACCOUNT_CATEGORY_MAP as needed.
```

### AiContextGenerator

**Import:** `@/lib/kpi-definitions/ai-context-generator`

- Defined in: `lib/kpi-definitions/ai-context-generator.ts`
- Export type: default

_No inline documentation provided._

**Example**

```ts
import AiContextGenerator from '@/lib/kpi-definitions/ai-context-generator';

// Use AiContextGenerator as needed.
```

### allKPIs

**Import:** `@/lib/kpi-definitions`

- Defined in: `lib/kpi-definitions/index.ts`
- Export type: named

```ts
KPIMeasure[]
```

_No inline documentation provided._

**Example**

```ts
import { allKPIs } from '@/lib/kpi-definitions';

// Use allKPIs as needed.
```

### businessBenchmarks

**Import:** `@/lib/kpi-definitions/business-benchmarks`

- Defined in: `lib/kpi-definitions/business-benchmarks.ts`
- Export type: named and default

```ts
Benchmark[]
```

_No inline documentation provided._

**Example**

```ts
import businessBenchmarks, { businessBenchmarks as businessBenchmarksNamed } from '@/lib/kpi-definitions/business-benchmarks';

// Use businessBenchmarks as needed.
```

### businessRules

**Import:** `@/lib/kpi-definitions/business-rules`

- Defined in: `lib/kpi-definitions/business-rules.ts`
- Export type: named and default

```ts
BusinessRule[]
```

_No inline documentation provided._

**Example**

```ts
import businessRules, { businessRules as businessRulesNamed } from '@/lib/kpi-definitions/business-rules';

// Use businessRules as needed.
```

### BYTES_PER_SECOND

**Import:** `@/utils/videoUtils`

- Defined in: `utils/videoUtils.ts`
- Export type: named

```ts
650000
```

_No inline documentation provided._

**Example**

```ts
import { BYTES_PER_SECOND } from '@/utils/videoUtils';

// Use BYTES_PER_SECOND as needed.
```

### CATEGORY_DISPLAY_MAP

**Import:** `@/types/estimate`

- Defined in: `types/estimate.ts`
- Export type: named

```ts
{ labor_internal: string; subcontractors: string; materials: string; equipment: string; permits: string; management: string; other: string; }
```

_No inline documentation provided._

**Example**

```ts
import { CATEGORY_DISPLAY_MAP } from '@/types/estimate';

// Use CATEGORY_DISPLAY_MAP as needed.
```

### CATEGORY_UNIT_RECOMMENDATIONS

**Import:** `@/utils/units`

- Defined in: `utils/units.ts`
- Export type: named

```ts
Record<string, string[]>
```

_No inline documentation provided._

**Example**

```ts
import { CATEGORY_UNIT_RECOMMENDATIONS } from '@/utils/units';

// Use CATEGORY_UNIT_RECOMMENDATIONS as needed.
```

### CHANGE_ORDER_LINE_ITEM_TEMPLATE

**Import:** `@/types/changeOrder`

- Defined in: `types/changeOrder.ts`
- Export type: named

```ts
ChangeOrderLineItemInput
```

_No inline documentation provided._

**Example**

```ts
import { CHANGE_ORDER_LINE_ITEM_TEMPLATE } from '@/types/changeOrder';

// Use CHANGE_ORDER_LINE_ITEM_TEMPLATE as needed.
```

### CHANGE_ORDER_STATUS_COLORS

**Import:** `@/lib/statusColors`

- Defined in: `lib/statusColors.ts`
- Export type: named

```ts
Record<ChangeOrderStatus, string>
```

_No inline documentation provided._

**Example**

```ts
import { CHANGE_ORDER_STATUS_COLORS } from '@/lib/statusColors';

// Use CHANGE_ORDER_STATUS_COLORS as needed.
```

### changeOrderKPIs

**Import:** `@/lib/kpi-definitions/change-order-kpis`

- Defined in: `lib/kpi-definitions/change-order-kpis.ts`
- Export type: named and default

```ts
KPIMeasure[]
```

_No inline documentation provided._

**Example**

```ts
import changeOrderKPIs, { changeOrderKPIs as changeOrderKPIsNamed } from '@/lib/kpi-definitions/change-order-kpis';

// Use changeOrderKPIs as needed.
```

### CLIENT_TYPES

**Import:** `@/types/client`

- Defined in: `types/client.ts`
- Export type: named

```ts
{ value: ClientType; label: string; }[]
```

_No inline documentation provided._

**Example**

```ts
import { CLIENT_TYPES } from '@/types/client';

// Use CLIENT_TYPES as needed.
```

### Constants

**Import:** `@/integrations/supabase/types`

- Defined in: `integrations/supabase/types.ts`
- Export type: named

```ts
{ readonly public: { readonly Enums: { readonly app_role: readonly ["admin", "manager", "field_worker"]; readonly change_order_status: readonly ["pending", "approved", "rejected"]; readonly estimate_status: readonly ["draft", "sent", "approved", "rejected", "expired"]; readonly expense_category: readonly ["labor_internal", "subcontractors", "materials", "equipment", "other", "permits", "management", "office_expenses", "vehicle_expenses", "tools", "software", "vehicle_maintenance", "gas", "meals"]; readonly payment_application_status: readonly ["draft", "submitted", "certified", "paid", "rejected"]; readonly project_category: readonly ["construction", "system", "overhead"]; readonly project_status: readonly ["estimating", "approved", "in_progress", "complete", "on_hold", "cancelled"]; readonly project_type: readonly ["construction_project", "work_order"]; readonly quote_status: readonly ["pending", "accepted", "rejected", "expired"]; readonly sync_status: readonly ["success", "failed", "pending"]; readonly sync_type: readonly ["import", "export"]; readonly training_content_type: readonly ["video_link", "video_embed", "document", "presentation", "external_link"]; readonly training_status: readonly ["draft", "published", "archived"]; readonly transaction_type: readonly ["expense", "bill", "check", "credit_card", "cash"]; }; }; }
```

_No inline documentation provided._

**Example**

```ts
import { Constants } from '@/integrations/supabase/types';

// Use Constants as needed.
```

### CONSTRUCTION_UNITS

**Import:** `@/utils/units`

- Defined in: `utils/units.ts`
- Export type: named

```ts
UnitDefinition[]
```

_No inline documentation provided._

**Example**

```ts
import { CONSTRUCTION_UNITS } from '@/utils/units';

// Use CONSTRUCTION_UNITS as needed.
```

### CONTRACT_TEMPLATE_FILENAMES

**Import:** `@/constants/contractFields`

- Defined in: `constants/contractFields.ts`
- Export type: named

```ts
Record<"subcontractor_project_agreement", string>
```

_No inline documentation provided._

**Example**

```ts
import { CONTRACT_TEMPLATE_FILENAMES } from '@/constants/contractFields';

// Use CONTRACT_TEMPLATE_FILENAMES as needed.
```

### CONTRACT_TEMPLATE_PLACEHOLDERS

**Import:** `@/constants/contractFields`

- Defined in: `constants/contractFields.ts`
- Export type: named

```ts
{ readonly '{{SUBCONTRACTOR_COMPANY}}': "subcontractor.company"; readonly '{{SUBCONTRACTOR_CONTACT}}': "subcontractor.contactName"; readonly '{{SUBCONTRACTOR_PHONE}}': "subcontractor.phone"; readonly '{{SUBCONTRACTOR_EMAIL}}': "subcontractor.email"; readonly '{{SUBCONTRACTOR_ADDRESS}}': "subcontractor.address"; readonly '{{SUBCONTRACTOR_ADDRESS_FORMATTED}}': "subcontractor.addressFormatted"; readonly '{{SUBCONTRACTOR_STREET_ADDRESS}}': "subcontractor.streetAddress"; readonly '{{SUBCONTRACTOR_CITY_STATE_ZIP}}': "subcontractor.cityStateZip"; readonly '{{SUBCONTRACTOR_LEGAL_ENTITY}}': "subcontractor.legalEntity"; readonly '{{SUBCONTRACTOR_LEGAL_FORM}}': "subcontractor.legalForm"; readonly '{{SUBCONTRACTOR_STATE}}': "subcontractor.stateOfFormation"; readonly '{{SUBCONTRACTOR_TITLE}}': "subcontractor.contactTitle"; readonly '{{PROJECT_NAME_NUMBER}}': "project.projectNameNumber"; readonly '{{PROJECT_NUMBER}}': "project.projectNumber"; readonly '{{PROJECT_NAME}}': "project.projectName"; readonly '{{PROJECT_LOCATION}}': "project.location"; readonly '{{PROPERTY_OWNER}}': "project.propertyOwner"; readonly '{{PROJECT_START_DATE}}': "project.startDate"; readonly '{{PROJECT_END_DATE}}': "project.endDate"; readonly '{{SUBCONTRACT_NUMBER}}': "contract.subcontractNumber"; readonly '{{SUBCONTRACT_PRICE}}': "contract.subcontractPriceFormatted"; readonly '{{AGREEMENT_DATE}}': "contract.agreementDate"; readonly '{{PRIME_CONTRACT_OWNER}}': "contract.primeContractOwner"; readonly '{{LIST_OF_EXHIBITS}}': "contract.listOfExhibits"; readonly '{{ARBITRATION_LOCATION}}': "contract.arbitrationLocation"; readonly '{{DEFAULT_CURE_HOURS}}': "contract.defaultCureHours"; readonly '{{DELAY_NOTICE_DAYS}}': "contract.delayNoticeDays"; readonly '{{GOVERNING_COUNTY_STATE}}': "contract.governingCountyState"; readonly '{{GOVERNING_STATE}}': "contract.governingState"; readonly '{{INSURANCE_CANCELLATION_NOTICE_DAYS}}': "contract.insuranceCancellationNoticeDays"; readonly '{{INSURANCE_LIMIT_1M}}': "contract.insuranceLimit1m"; readonly '{{INSURANCE_LIMIT_2M}}': "contract.insuranceLimit2m"; readonly '{{LIEN_CURE_DAYS}}': "contract.lienCureDays"; readonly '{{LIQUIDATED_DAMAGES_DAILY}}': "contract.liquidatedDamagesDaily"; readonly '{{NOTICE_CURE_DAYS}}': "contract.noticeCureDays"; readonly '{{PAYMENT_TERMS_DAYS}}': "contract.paymentTermsDays"; readonly '{{RCG_LEGAL_NAME}}': "rcg.legalName"; readonly '{{RCG_DISPLAY_NAME}}': "rcg.displayName"; readonly '{{RCG_ADDRESS}}': "rcg.address"; readonly '{{RCG_STREET_ADDRESS}}': "rcg.streetAddress"; readonly '{{RCG_CITY_STATE_ZIP}}': "rcg.cityStateZip"; readonly '{{RCG_PHONE}}': "rcg.phone"; readonly '{{RCG_EMAIL}}': "rcg.email"; readonly '{{RCG_WEBSITE}}': "rcg.website"; readonly '{{RCG_SIGNATORY_NAME}}': "rcg.signatoryName"; readonly '{{RCG_SIGNATORY_TITLE}}': "rcg.signatoryTitle"; }
```

_No inline documentation provided._

**Example**

```ts
import { CONTRACT_TEMPLATE_PLACEHOLDERS } from '@/constants/contractFields';

// Use CONTRACT_TEMPLATE_PLACEHOLDERS as needed.
```

### CONTRACT_TYPES

**Import:** `@/constants/contractFields`

- Defined in: `constants/contractFields.ts`
- Export type: named

```ts
{ value: ContractType; label: string; }[]
```

_No inline documentation provided._

**Example**

```ts
import { CONTRACT_TYPES } from '@/constants/contractFields';

// Use CONTRACT_TYPES as needed.
```

### DEFAULT_LUNCH_DURATION

**Import:** `@/utils/timeEntryCalculations`

- Defined in: `utils/timeEntryCalculations.ts`
- Export type: named

```ts
30
```

_No inline documentation provided._

**Example**

```ts
import { DEFAULT_LUNCH_DURATION } from '@/utils/timeEntryCalculations';

// Use DEFAULT_LUNCH_DURATION as needed.
```

### deprecatedKPIs

**Import:** `@/lib/kpi-definitions/deprecated-kpis`

- Defined in: `lib/kpi-definitions/deprecated-kpis.ts`
- Export type: named and default

```ts
KPIMeasure[]
```

_No inline documentation provided._

**Example**

```ts
import deprecatedKPIs, { deprecatedKPIs as deprecatedKPIsNamed } from '@/lib/kpi-definitions/deprecated-kpis';

// Use deprecatedKPIs as needed.
```

### DOCUMENT_TYPE_ICON_COLORS

**Import:** `@/utils/documentFileType`

- Defined in: `utils/documentFileType.ts`
- Export type: named

```ts
Record<DocumentType, string>
```

_No inline documentation provided._

**Example**

```ts
import { DOCUMENT_TYPE_ICON_COLORS } from '@/utils/documentFileType';

// Use DOCUMENT_TYPE_ICON_COLORS as needed.
```

### DOCUMENT_TYPE_ICONS

**Import:** `@/types/document`

- Defined in: `types/document.ts`
- Export type: named

```ts
Record<DocumentType, string>
```

_No inline documentation provided._

**Example**

```ts
import { DOCUMENT_TYPE_ICONS } from '@/types/document';

// Use DOCUMENT_TYPE_ICONS as needed.
```

### DOCUMENT_TYPE_LABELS

**Import:** `@/types/document`

- Defined in: `types/document.ts`
- Export type: named

```ts
Record<DocumentType, string>
```

_No inline documentation provided._

**Example**

```ts
import { DOCUMENT_TYPE_LABELS } from '@/types/document';

// Use DOCUMENT_TYPE_LABELS as needed.
```

### DOCUMENT_TYPE_LUCIDE_ICONS

**Import:** `@/utils/documentFileType`

- Defined in: `utils/documentFileType.ts`
- Export type: named

```ts
Record<DocumentType, React.ComponentType<{ className?: string; }>>
```

_No inline documentation provided._

**Example**

```ts
import { DOCUMENT_TYPE_LUCIDE_ICONS } from '@/utils/documentFileType';

// Use DOCUMENT_TYPE_LUCIDE_ICONS as needed.
```

### ESTIMATE_STATUS_COLORS

**Import:** `@/lib/statusColors`

- Defined in: `lib/statusColors.ts`
- Export type: named

```ts
Record<EstimateStatus, string>
```

_No inline documentation provided._

**Example**

```ts
import { ESTIMATE_STATUS_COLORS } from '@/lib/statusColors';

// Use ESTIMATE_STATUS_COLORS as needed.
```

### estimateKPIs

**Import:** `@/lib/kpi-definitions/estimate-kpis`

- Defined in: `lib/kpi-definitions/estimate-kpis.ts`
- Export type: named and default

```ts
KPIMeasure[]
```

_No inline documentation provided._

**Example**

```ts
import estimateKPIs, { estimateKPIs as estimateKPIsNamed } from '@/lib/kpi-definitions/estimate-kpis';

// Use estimateKPIs as needed.
```

### EXPENSE_CATEGORY_DISPLAY

**Import:** `@/types/expense`

- Defined in: `types/expense.ts`
- Export type: named

```ts
{ labor_internal: string; subcontractors: string; materials: string; equipment: string; permits: string; management: string; tools: string; software: string; vehicle_maintenance: string; gas: string; meals: string; office_expenses: string; vehicle_expenses: string; other: string; }
```

_No inline documentation provided._

**Example**

```ts
import { EXPENSE_CATEGORY_DISPLAY } from '@/types/expense';

// Use EXPENSE_CATEGORY_DISPLAY as needed.
```

### EXPENSE_STATUS_COLORS

**Import:** `@/lib/statusColors`

- Defined in: `lib/statusColors.ts`
- Export type: named

```ts
Record<ExpenseStatus, string>
```

_No inline documentation provided._

**Example**

```ts
import { EXPENSE_STATUS_COLORS } from '@/lib/statusColors';

// Use EXPENSE_STATUS_COLORS as needed.
```

### expenseKPIs

**Import:** `@/lib/kpi-definitions/expense-kpis`

- Defined in: `lib/kpi-definitions/expense-kpis.ts`
- Export type: named and default

```ts
KPIMeasure[]
```

_No inline documentation provided._

**Example**

```ts
import expenseKPIs, { expenseKPIs as expenseKPIsNamed } from '@/lib/kpi-definitions/expense-kpis';

// Use expenseKPIs as needed.
```

### featureFlags

**Import:** `@/lib/featureFlags`

- Defined in: `lib/featureFlags.ts`
- Export type: named

```ts
FeatureFlags
```

_No inline documentation provided._

**Example**

```ts
import { featureFlags } from '@/lib/featureFlags';

// Use featureFlags as needed.
```

### fewShotExamples

**Import:** `@/lib/kpi-definitions/few-shot-examples`

- Defined in: `lib/kpi-definitions/few-shot-examples.ts`
- Export type: named and default

```ts
FewShotExample[]
```

_No inline documentation provided._

**Example**

```ts
import fewShotExamples, { fewShotExamples as fewShotExamplesNamed } from '@/lib/kpi-definitions/few-shot-examples';

// Use fewShotExamples as needed.
```

### IMPORT_CATEGORY_DISPLAY

**Import:** `@/types/importTypes`

- Defined in: `types/importTypes.ts`
- Export type: named

```ts
Record<ItemCategory, { label: string; color: string; bgColor: string; }>
```

_No inline documentation provided._

**Example**

```ts
import { IMPORT_CATEGORY_DISPLAY } from '@/types/importTypes';

// Use IMPORT_CATEGORY_DISPLAY as needed.
```

### JOB_TYPES

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
readonly ["Commercial", "Emergency Service", "Government", "Healthcare", "Industrial", "Maintenance", "Renovation", "Residential"]
```

_No inline documentation provided._

**Example**

```ts
import { JOB_TYPES } from '@/types/project';

// Use JOB_TYPES as needed.
```

### KPI_DEFINITIONS_VERSION

**Import:** `@/lib/kpi-definitions/ai-context-generator`

- Defined in: `lib/kpi-definitions/ai-context-generator.ts`
- Export type: named

```ts
"4.0.0"
```

_No inline documentation provided._

**Example**

```ts
import { KPI_DEFINITIONS_VERSION } from '@/lib/kpi-definitions/ai-context-generator';

// Use KPI_DEFINITIONS_VERSION as needed.
```

### LAST_UPDATED

**Import:** `@/lib/kpi-definitions/ai-context-generator`

- Defined in: `lib/kpi-definitions/ai-context-generator.ts`
- Export type: named

```ts
"2026-04-12"
```

_No inline documentation provided._

**Example**

```ts
import { LAST_UPDATED } from '@/lib/kpi-definitions/ai-context-generator';

// Use LAST_UPDATED as needed.
```

### LEGACY_CATEGORY_MAP

**Import:** `@/types/estimate`

- Defined in: `types/estimate.ts`
- Export type: named

```ts
Record<string, LineItemCategory>
```

_No inline documentation provided._

**Example**

```ts
import { LEGACY_CATEGORY_MAP } from '@/types/estimate';

// Use LEGACY_CATEGORY_MAP as needed.
```

### LEGAL_FORM_OPTIONS

**Import:** `@/constants/contractFields`

- Defined in: `constants/contractFields.ts`
- Export type: named

```ts
({ value: "LLC"; label: string; } | { value: "Corp"; label: string; } | { value: "Inc"; label: string; } | { value: "S-Corp"; label: string; } | { value: "Sole Proprietor"; label: string; } | { value: "Partnership"; label: string; } | { value: "LLP"; label: string; } | { value: "Other"; label: string; })[]
```

_No inline documentation provided._

**Example**

```ts
import { LEGAL_FORM_OPTIONS } from '@/constants/contractFields';

// Use LEGAL_FORM_OPTIONS as needed.
```

### LUNCH_DURATION_OPTIONS

**Import:** `@/utils/timeEntryCalculations`

- Defined in: `utils/timeEntryCalculations.ts`
- Export type: named

```ts
readonly [{ readonly value: 15; readonly label: "15 min"; }, { readonly value: 30; readonly label: "30 min"; }, { readonly value: 45; readonly label: "45 min"; }, { readonly value: 60; readonly label: "1 hour"; }, { readonly value: 90; readonly label: "1.5 hours"; }, { readonly value: 120; readonly label: "2 hours"; }]
```

_No inline documentation provided._

**Example**

```ts
import { LUNCH_DURATION_OPTIONS } from '@/utils/timeEntryCalculations';

// Use LUNCH_DURATION_OPTIONS as needed.
```

### MAX_VIDEO_DURATION

**Import:** `@/utils/videoUtils`

- Defined in: `utils/videoUtils.ts`
- Export type: named

```ts
120
```

_No inline documentation provided._

**Example**

```ts
import { MAX_VIDEO_DURATION } from '@/utils/videoUtils';

// Use MAX_VIDEO_DURATION as needed.
```

### MAX_VIDEO_SIZE

**Import:** `@/utils/videoUtils`

- Defined in: `utils/videoUtils.ts`
- Export type: named

```ts
number
```

_No inline documentation provided._

**Example**

```ts
import { MAX_VIDEO_SIZE } from '@/utils/videoUtils';

// Use MAX_VIDEO_SIZE as needed.
```

### OPERATIONAL_PROJECT_NUMBERS

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
readonly ["001-GAS"]
```

_No inline documentation provided._

**Example**

```ts
import { OPERATIONAL_PROJECT_NUMBERS } from '@/types/project';

// Use OPERATIONAL_PROJECT_NUMBERS as needed.
```

### payeeKPIs

**Import:** `@/lib/kpi-definitions/payee-kpis`

- Defined in: `lib/kpi-definitions/payee-kpis.ts`
- Export type: named and default

```ts
KPIMeasure[]
```

_No inline documentation provided._

**Example**

```ts
import payeeKPIs, { payeeKPIs as payeeKPIsNamed } from '@/lib/kpi-definitions/payee-kpis';

// Use payeeKPIs as needed.
```

### PAYMENT_APP_STATUS_COLORS

**Import:** `@/types/paymentApplication`

- Defined in: `types/paymentApplication.ts`
- Export type: named

```ts
Record<"rejected" | "draft" | "submitted" | "certified" | "paid", string>
```

_No inline documentation provided._

**Example**

```ts
import { PAYMENT_APP_STATUS_COLORS } from '@/types/paymentApplication';

// Use PAYMENT_APP_STATUS_COLORS as needed.
```

### PAYMENT_APP_STATUS_LABELS

**Import:** `@/types/paymentApplication`

- Defined in: `types/paymentApplication.ts`
- Export type: named

```ts
Record<"rejected" | "draft" | "submitted" | "certified" | "paid", string>
```

_No inline documentation provided._

**Example**

```ts
import { PAYMENT_APP_STATUS_LABELS } from '@/types/paymentApplication';

// Use PAYMENT_APP_STATUS_LABELS as needed.
```

### PAYMENT_TERMS

**Import:** `@/types/client`

- Defined in: `types/client.ts`
- Export type: named

```ts
readonly ["Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60", "2/10 Net 30"]
```

_No inline documentation provided._

**Example**

```ts
import { PAYMENT_TERMS } from '@/types/client';

// Use PAYMENT_TERMS as needed.
```

### PROJECT_STATUS_COLORS

**Import:** `@/lib/statusColors`

- Defined in: `lib/statusColors.ts`
- Export type: named

```ts
Record<ProjectStatus, string>
```

_No inline documentation provided._

**Example**

```ts
import { PROJECT_STATUS_COLORS } from '@/lib/statusColors';

// Use PROJECT_STATUS_COLORS as needed.
```

### PROJECT_STATUSES

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
readonly [{ readonly value: "estimating"; readonly label: "Estimating"; }, { readonly value: "approved"; readonly label: "Approved"; }, { readonly value: "in_progress"; readonly label: "In Progress"; }, { readonly value: "complete"; readonly label: "Complete"; }, { readonly value: "on_hold"; readonly label: "On Hold"; }, { readonly value: "cancelled"; readonly label: "Cancelled"; }]
```

_No inline documentation provided._

**Example**

```ts
import { PROJECT_STATUSES } from '@/types/project';

// Use PROJECT_STATUSES as needed.
```

### projectFinancialKPIs

**Import:** `@/lib/kpi-definitions/project-kpis`

- Defined in: `lib/kpi-definitions/project-kpis.ts`
- Export type: named and default

```ts
KPIMeasure[]
```

_No inline documentation provided._

**Example**

```ts
import projectFinancialKPIs, { projectFinancialKPIs as projectFinancialKPIsNamed } from '@/lib/kpi-definitions/project-kpis';

// Use projectFinancialKPIs as needed.
```

### QB_ACCOUNT_MAPPING

**Import:** `@/utils/quickbooksMapping`

- Defined in: `utils/quickbooksMapping.ts`
- Export type: named

```ts
Record<string, ExpenseCategory>
```

_No inline documentation provided._

**Example**

```ts
import { QB_ACCOUNT_MAPPING } from '@/utils/quickbooksMapping';

// Use QB_ACCOUNT_MAPPING as needed.
```

### QUOTE_STATUS_COLORS

**Import:** `@/lib/statusColors`

- Defined in: `lib/statusColors.ts`
- Export type: named

```ts
Record<QuoteStatus, string>
```

_No inline documentation provided._

**Example**

```ts
import { QUOTE_STATUS_COLORS } from '@/lib/statusColors';

// Use QUOTE_STATUS_COLORS as needed.
```

### quoteKPIs

**Import:** `@/lib/kpi-definitions/quote-kpis`

- Defined in: `lib/kpi-definitions/quote-kpis.ts`
- Export type: named and default

```ts
KPIMeasure[]
```

_No inline documentation provided._

**Example**

```ts
import quoteKPIs, { quoteKPIs as quoteKPIsNamed } from '@/lib/kpi-definitions/quote-kpis';

// Use quoteKPIs as needed.
```

### receiptColumnDefinitions

**Import:** `@/config/receiptColumns`

- Defined in: `config/receiptColumns.ts`
- Export type: named

```ts
({ key: string; label: string; required: boolean; hiddenOnMobile: boolean; sortable?: undefined; } | { key: string; label: string; required: boolean; hiddenOnMobile: boolean; sortable: boolean; })[]
```

_No inline documentation provided._

**Example**

```ts
import { receiptColumnDefinitions } from '@/config/receiptColumns';

// Use receiptColumnDefinitions as needed.
```

### REQUIRED_CONTRACT_FIELDS

**Import:** `@/constants/contractFields`

- Defined in: `constants/contractFields.ts`
- Export type: named

```ts
readonly ["subcontractor.company", "subcontractor.contactName", "subcontractor.address", "subcontractor.legalForm", "subcontractor.stateOfFormation", "project.projectNameNumber", "project.location", "project.propertyOwner", "project.startDate", "project.endDate", "contract.subcontractNumber", "contract.subcontractPrice", "contract.agreementDate"]
```

_No inline documentation provided._

**Example**

```ts
import { REQUIRED_CONTRACT_FIELDS } from '@/constants/contractFields';

// Use REQUIRED_CONTRACT_FIELDS as needed.
```

### revenueKPIs

**Import:** `@/lib/kpi-definitions/revenue-kpis`

- Defined in: `lib/kpi-definitions/revenue-kpis.ts`
- Export type: named and default

```ts
KPIMeasure[]
```

_No inline documentation provided._

**Example**

```ts
import revenueKPIs, { revenueKPIs as revenueKPIsNamed } from '@/lib/kpi-definitions/revenue-kpis';

// Use revenueKPIs as needed.
```

### SANDBOX_PROJECT_NUMBER

**Import:** `@/utils/sandboxPreferences`

- Defined in: `utils/sandboxPreferences.ts`
- Export type: named

```ts
"SYS-TEST"
```

_No inline documentation provided._

**Example**

```ts
import { SANDBOX_PROJECT_NUMBER } from '@/utils/sandboxPreferences';

// Use SANDBOX_PROJECT_NUMBER as needed.
```

### semanticMappings

**Import:** `@/lib/kpi-definitions/semantic-mappings`

- Defined in: `lib/kpi-definitions/semantic-mappings.ts`
- Export type: named and default

```ts
SemanticMapping[]
```

_No inline documentation provided._

**Example**

```ts
import semanticMappings, { semanticMappings as semanticMappingsNamed } from '@/lib/kpi-definitions/semantic-mappings';

// Use semanticMappings as needed.
```

### supabase

**Import:** `@/integrations/supabase/client`

- Defined in: `integrations/supabase/client.ts`
- Export type: named

```ts
import("C:/Dev/profitbuild-dash/node_modules/@supabase/supabase-js/dist/module/SupabaseClient").default<Database, "public", "public", { Tables: { activity_feed: { Row: { activity_type: string; created_at: string; deleted_at: string | null; description: string; entity_id: string; entity_type: string; id: string; metadata: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; project_id: string | null; user_id: string | null; }; Insert: { activity_type: string; created_at?: string; deleted_at?: string | null; description: string; entity_id: string; entity_type: string; id?: string; metadata?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; project_id?: string | null; user_id?: string | null; }; Update: { activity_type?: string; created_at?: string; deleted_at?: string | null; description?: string; entity_id?: string; entity_type?: string; id?: string; metadata?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; project_id?: string | null; user_id?: string | null; }; Relationships: [{ foreignKeyName: "activity_feed_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }, { foreignKeyName: "activity_feed_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; admin_actions: { Row: { action_details: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; action_type: string; admin_user_id: string; created_at: string; id: string; target_user_id: string | null; }; Insert: { action_details?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; action_type: string; admin_user_id: string; created_at?: string; id?: string; target_user_id?: string | null; }; Update: { action_details?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; action_type?: string; admin_user_id?: string; created_at?: string; id?: string; target_user_id?: string | null; }; Relationships: []; }; ai_action_log: { Row: { action_type: string; ai_response: string | null; created_at: string | null; entity_id: string | null; entity_type: string; error_message: string | null; execution_time_ms: number | null; id: string; parameters: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; performed_by: string | null; success: boolean | null; user_message: string | null; }; Insert: { action_type: string; ai_response?: string | null; created_at?: string | null; entity_id?: string | null; entity_type: string; error_message?: string | null; execution_time_ms?: number | null; id?: string; parameters?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; performed_by?: string | null; success?: boolean | null; user_message?: string | null; }; Update: { action_type?: string; ai_response?: string | null; created_at?: string | null; entity_id?: string | null; entity_type?: string; error_message?: string | null; execution_time_ms?: number | null; id?: string; parameters?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; performed_by?: string | null; success?: boolean | null; user_message?: string | null; }; Relationships: [{ foreignKeyName: "ai_action_log_performed_by_fkey"; columns: ["performed_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; bid_media: { Row: { altitude: number | null; bid_id: string; caption: string | null; created_at: string; description: string | null; device_model: string | null; duration: number | null; file_name: string; file_size: number; file_type: string; file_url: string; id: string; latitude: number | null; location_name: string | null; longitude: number | null; mime_type: string; taken_at: string | null; thumbnail_url: string | null; updated_at: string; upload_source: string | null; uploaded_by: string | null; }; Insert: { altitude?: number | null; bid_id: string; caption?: string | null; created_at?: string; description?: string | null; device_model?: string | null; duration?: number | null; file_name: string; file_size: number; file_type: string; file_url: string; id?: string; latitude?: number | null; location_name?: string | null; longitude?: number | null; mime_type: string; taken_at?: string | null; thumbnail_url?: string | null; updated_at?: string; upload_source?: string | null; uploaded_by?: string | null; }; Update: { altitude?: number | null; bid_id?: string; caption?: string | null; created_at?: string; description?: string | null; device_model?: string | null; duration?: number | null; file_name?: string; file_size?: number; file_type?: string; file_url?: string; id?: string; latitude?: number | null; location_name?: string | null; longitude?: number | null; mime_type?: string; taken_at?: string | null; thumbnail_url?: string | null; updated_at?: string; upload_source?: string | null; uploaded_by?: string | null; }; Relationships: [{ foreignKeyName: "bid_media_bid_id_fkey"; columns: ["bid_id"]; isOneToOne: false; referencedRelation: "branch_bids"; referencedColumns: ["id"]; }]; }; bid_notes: { Row: { bid_id: string; created_at: string; id: string; note_text: string; updated_at: string; user_id: string; }; Insert: { bid_id: string; created_at?: string; id?: string; note_text: string; updated_at?: string; user_id: string; }; Update: { bid_id?: string; created_at?: string; id?: string; note_text?: string; updated_at?: string; user_id?: string; }; Relationships: [{ foreignKeyName: "bid_notes_bid_id_fkey"; columns: ["bid_id"]; isOneToOne: false; referencedRelation: "branch_bids"; referencedColumns: ["id"]; }]; }; branch_bids: { Row: { address: string | null; client_id: string | null; created_at: string; created_by: string; deleted_at: string | null; description: string | null; estimate_id: string | null; id: string; job_type: string | null; name: string; project_id: string | null; project_type: string | null; updated_at: string; }; Insert: { address?: string | null; client_id?: string | null; created_at?: string; created_by: string; deleted_at?: string | null; description?: string | null; estimate_id?: string | null; id?: string; job_type?: string | null; name: string; project_id?: string | null; project_type?: string | null; updated_at?: string; }; Update: { address?: string | null; client_id?: string | null; created_at?: string; created_by?: string; deleted_at?: string | null; description?: string | null; estimate_id?: string | null; id?: string; job_type?: string | null; name?: string; project_id?: string | null; project_type?: string | null; updated_at?: string; }; Relationships: [{ foreignKeyName: "branch_bids_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"]; }, { foreignKeyName: "branch_bids_estimate_id_fkey"; columns: ["estimate_id"]; isOneToOne: false; referencedRelation: "estimate_financial_summary"; referencedColumns: ["estimate_id"]; }, { foreignKeyName: "branch_bids_estimate_id_fkey"; columns: ["estimate_id"]; isOneToOne: false; referencedRelation: "estimates"; referencedColumns: ["id"]; }, { foreignKeyName: "branch_bids_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }]; }; change_order_line_items: { Row: { actual_cost_rate_per_hour: number | null; billing_rate_per_hour: number | null; category: Database["public"]["Enums"]["expense_category"]; change_order_id: string; cost_per_unit: number | null; created_at: string | null; dependencies: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; description: string; duration_days: number | null; id: string; is_milestone: boolean | null; labor_cushion_amount: number | null; labor_hours: number | null; markup_amount: number | null; payee_id: string | null; price_per_unit: number | null; quantity: number | null; schedule_notes: string | null; scheduled_end_date: string | null; scheduled_start_date: string | null; sort_order: number | null; total_cost: number | null; total_price: number | null; unit: string | null; updated_at: string | null; }; Insert: { actual_cost_rate_per_hour?: number | null; billing_rate_per_hour?: number | null; category: Database["public"]["Enums"]["expense_category"]; change_order_id: string; cost_per_unit?: number | null; created_at?: string | null; dependencies?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; description: string; duration_days?: number | null; id?: string; is_milestone?: boolean | null; labor_cushion_amount?: number | null; labor_hours?: number | null; markup_amount?: number | null; payee_id?: string | null; price_per_unit?: number | null; quantity?: number | null; schedule_notes?: string | null; scheduled_end_date?: string | null; scheduled_start_date?: string | null; sort_order?: number | null; total_cost?: number | null; total_price?: number | null; unit?: string | null; updated_at?: string | null; }; Update: { actual_cost_rate_per_hour?: number | null; billing_rate_per_hour?: number | null; category?: Database["public"]["Enums"]["expense_category"]; change_order_id?: string; cost_per_unit?: number | null; created_at?: string | null; dependencies?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; description?: string; duration_days?: number | null; id?: string; is_milestone?: boolean | null; labor_cushion_amount?: number | null; labor_hours?: number | null; markup_amount?: number | null; payee_id?: string | null; price_per_unit?: number | null; quantity?: number | null; schedule_notes?: string | null; scheduled_end_date?: string | null; scheduled_start_date?: string | null; sort_order?: number | null; total_cost?: number | null; total_price?: number | null; unit?: string | null; updated_at?: string | null; }; Relationships: [{ foreignKeyName: "change_order_line_items_change_order_id_fkey"; columns: ["change_order_id"]; isOneToOne: false; referencedRelation: "change_orders"; referencedColumns: ["id"]; }, { foreignKeyName: "change_order_line_items_payee_id_fkey"; columns: ["payee_id"]; isOneToOne: false; referencedRelation: "payees"; referencedColumns: ["id"]; }]; }; change_orders: { Row: { amount: number | null; approved_by: string | null; approved_date: string | null; change_order_number: string; client_amount: number | null; contingency_billed_to_client: number | null; cost_impact: number | null; created_at: string | null; description: string; id: string; includes_contingency: boolean | null; margin_impact: number | null; project_id: string; reason_for_change: string | null; requested_date: string | null; status: Database["public"]["Enums"]["change_order_status"] | null; updated_at: string | null; }; Insert: { amount?: number | null; approved_by?: string | null; approved_date?: string | null; change_order_number: string; client_amount?: number | null; contingency_billed_to_client?: number | null; cost_impact?: number | null; created_at?: string | null; description: string; id?: string; includes_contingency?: boolean | null; margin_impact?: number | null; project_id: string; reason_for_change?: string | null; requested_date?: string | null; status?: Database["public"]["Enums"]["change_order_status"] | null; updated_at?: string | null; }; Update: { amount?: number | null; approved_by?: string | null; approved_date?: string | null; change_order_number?: string; client_amount?: number | null; contingency_billed_to_client?: number | null; cost_impact?: number | null; created_at?: string | null; description?: string; id?: string; includes_contingency?: boolean | null; margin_impact?: number | null; project_id?: string; reason_for_change?: string | null; requested_date?: string | null; status?: Database["public"]["Enums"]["change_order_status"] | null; updated_at?: string | null; }; Relationships: [{ foreignKeyName: "change_orders_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }]; }; clients: { Row: { billing_address: string | null; client_name: string; client_type: string | null; company_name: string | null; contact_person: string | null; created_at: string | null; email: string | null; id: string; is_active: boolean | null; mailing_address: string | null; notes: string | null; payment_terms: string | null; phone: string | null; quickbooks_customer_id: string | null; tax_exempt: boolean | null; updated_at: string | null; }; Insert: { billing_address?: string | null; client_name: string; client_type?: string | null; company_name?: string | null; contact_person?: string | null; created_at?: string | null; email?: string | null; id?: string; is_active?: boolean | null; mailing_address?: string | null; notes?: string | null; payment_terms?: string | null; phone?: string | null; quickbooks_customer_id?: string | null; tax_exempt?: boolean | null; updated_at?: string | null; }; Update: { billing_address?: string | null; client_name?: string; client_type?: string | null; company_name?: string | null; contact_person?: string | null; created_at?: string | null; email?: string | null; id?: string; is_active?: boolean | null; mailing_address?: string | null; notes?: string | null; payment_terms?: string | null; phone?: string | null; quickbooks_customer_id?: string | null; tax_exempt?: boolean | null; updated_at?: string | null; }; Relationships: []; }; company_branding_settings: { Row: { accent_color: string | null; company_abbreviation: string | null; company_address: string | null; company_legal_name: string | null; company_license: string | null; company_name: string | null; company_phone: string | null; created_at: string | null; id: string; light_bg_color: string | null; logo_full_url: string | null; logo_icon_url: string | null; logo_report_header_url: string | null; logo_stacked_url: string | null; primary_color: string | null; secondary_color: string | null; updated_at: string | null; }; Insert: { accent_color?: string | null; company_abbreviation?: string | null; company_address?: string | null; company_legal_name?: string | null; company_license?: string | null; company_name?: string | null; company_phone?: string | null; created_at?: string | null; id?: string; light_bg_color?: string | null; logo_full_url?: string | null; logo_icon_url?: string | null; logo_report_header_url?: string | null; logo_stacked_url?: string | null; primary_color?: string | null; secondary_color?: string | null; updated_at?: string | null; }; Update: { accent_color?: string | null; company_abbreviation?: string | null; company_address?: string | null; company_legal_name?: string | null; company_license?: string | null; company_name?: string | null; company_phone?: string | null; created_at?: string | null; id?: string; light_bg_color?: string | null; logo_full_url?: string | null; logo_icon_url?: string | null; logo_report_header_url?: string | null; logo_stacked_url?: string | null; primary_color?: string | null; secondary_color?: string | null; updated_at?: string | null; }; Relationships: []; }; company_settings: { Row: { created_at: string | null; description: string | null; id: string; setting_key: string; setting_value: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json; updated_at: string | null; }; Insert: { created_at?: string | null; description?: string | null; id?: string; setting_key: string; setting_value: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json; updated_at?: string | null; }; Update: { created_at?: string | null; description?: string | null; id?: string; setting_key?: string; setting_value?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json; updated_at?: string | null; }; Relationships: []; }; contracts: { Row: { agreement_date: string; contract_number: string | null; contract_type: string; created_at: string; created_by: string | null; docx_storage_path: string | null; docx_url: string | null; estimate_id: string | null; field_values: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json; id: string; internal_reference: string | null; notes: string | null; payee_id: string; pdf_storage_path: string | null; pdf_url: string | null; project_end_date: string | null; project_id: string; project_start_date: string | null; quote_id: string | null; status: string; subcontract_price: number; updated_at: string; version: number; }; Insert: { agreement_date: string; contract_number?: string | null; contract_type?: string; created_at?: string; created_by?: string | null; docx_storage_path?: string | null; docx_url?: string | null; estimate_id?: string | null; field_values: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json; id?: string; internal_reference?: string | null; notes?: string | null; payee_id: string; pdf_storage_path?: string | null; pdf_url?: string | null; project_end_date?: string | null; project_id: string; project_start_date?: string | null; quote_id?: string | null; status?: string; subcontract_price: number; updated_at?: string; version?: number; }; Update: { agreement_date?: string; contract_number?: string | null; contract_type?: string; created_at?: string; created_by?: string | null; docx_storage_path?: string | null; docx_url?: string | null; estimate_id?: string | null; field_values?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json; id?: string; internal_reference?: string | null; notes?: string | null; payee_id?: string; pdf_storage_path?: string | null; pdf_url?: string | null; project_end_date?: string | null; project_id?: string; project_start_date?: string | null; quote_id?: string | null; status?: string; subcontract_price?: number; updated_at?: string; version?: number; }; Relationships: [{ foreignKeyName: "contracts_estimate_id_fkey"; columns: ["estimate_id"]; isOneToOne: false; referencedRelation: "estimate_financial_summary"; referencedColumns: ["estimate_id"]; }, { foreignKeyName: "contracts_estimate_id_fkey"; columns: ["estimate_id"]; isOneToOne: false; referencedRelation: "estimates"; referencedColumns: ["id"]; }, { foreignKeyName: "contracts_payee_id_fkey"; columns: ["payee_id"]; isOneToOne: false; referencedRelation: "payees"; referencedColumns: ["id"]; }, { foreignKeyName: "contracts_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }, { foreignKeyName: "contracts_quote_id_fkey"; columns: ["quote_id"]; isOneToOne: false; referencedRelation: "quotes"; referencedColumns: ["id"]; }]; }; email_messages: { Row: { created_at: string | null; delivery_status: string | null; email_type: string; entity_id: string | null; entity_type: string | null; error_message: string | null; id: string; project_id: string | null; recipient_email: string; recipient_name: string | null; recipient_user_id: string | null; resend_email_id: string | null; sent_at: string | null; sent_by: string | null; subject: string; updated_at: string | null; }; Insert: { created_at?: string | null; delivery_status?: string | null; email_type: string; entity_id?: string | null; entity_type?: string | null; error_message?: string | null; id?: string; project_id?: string | null; recipient_email: string; recipient_name?: string | null; recipient_user_id?: string | null; resend_email_id?: string | null; sent_at?: string | null; sent_by?: string | null; subject: string; updated_at?: string | null; }; Update: { created_at?: string | null; delivery_status?: string | null; email_type?: string; entity_id?: string | null; entity_type?: string | null; error_message?: string | null; id?: string; project_id?: string | null; recipient_email?: string; recipient_name?: string | null; recipient_user_id?: string | null; resend_email_id?: string | null; sent_at?: string | null; sent_by?: string | null; subject?: string; updated_at?: string | null; }; Relationships: [{ foreignKeyName: "email_messages_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }, { foreignKeyName: "email_messages_recipient_user_id_fkey"; columns: ["recipient_user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }, { foreignKeyName: "email_messages_sent_by_fkey"; columns: ["sent_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; estimate_line_items: { Row: { actual_cost_rate_per_hour: number | null; billing_rate_per_hour: number | null; category: Database["public"]["Enums"]["expense_category"]; cost_per_unit: number | null; created_at: string | null; dependencies: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; description: string; duration_days: number | null; estimate_id: string; id: string; is_milestone: boolean | null; labor_cushion_amount: number | null; labor_hours: number | null; markup_amount: number | null; markup_percent: number | null; price_per_unit: number | null; quantity: number | null; quickbooks_item_id: string | null; rate: number | null; schedule_notes: string | null; scheduled_end_date: string | null; scheduled_start_date: string | null; sort_order: number | null; total: number | null; total_cost: number | null; total_markup: number | null; unit: string | null; }; Insert: { actual_cost_rate_per_hour?: number | null; billing_rate_per_hour?: number | null; category: Database["public"]["Enums"]["expense_category"]; cost_per_unit?: number | null; created_at?: string | null; dependencies?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; description: string; duration_days?: number | null; estimate_id: string; id?: string; is_milestone?: boolean | null; labor_cushion_amount?: number | null; labor_hours?: number | null; markup_amount?: number | null; markup_percent?: number | null; price_per_unit?: number | null; quantity?: number | null; quickbooks_item_id?: string | null; rate?: number | null; schedule_notes?: string | null; scheduled_end_date?: string | null; scheduled_start_date?: string | null; sort_order?: number | null; total?: number | null; total_cost?: number | null; total_markup?: number | null; unit?: string | null; }; Update: { actual_cost_rate_per_hour?: number | null; billing_rate_per_hour?: number | null; category?: Database["public"]["Enums"]["expense_category"]; cost_per_unit?: number | null; created_at?: string | null; dependencies?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; description?: string; duration_days?: number | null; estimate_id?: string; id?: string; is_milestone?: boolean | null; labor_cushion_amount?: number | null; labor_hours?: number | null; markup_amount?: number | null; markup_percent?: number | null; price_per_unit?: number | null; quantity?: number | null; quickbooks_item_id?: string | null; rate?: number | null; schedule_notes?: string | null; scheduled_end_date?: string | null; scheduled_start_date?: string | null; sort_order?: number | null; total?: number | null; total_cost?: number | null; total_markup?: number | null; unit?: string | null; }; Relationships: [{ foreignKeyName: "estimate_line_items_estimate_id_fkey"; columns: ["estimate_id"]; isOneToOne: false; referencedRelation: "estimate_financial_summary"; referencedColumns: ["estimate_id"]; }, { foreignKeyName: "estimate_line_items_estimate_id_fkey"; columns: ["estimate_id"]; isOneToOne: false; referencedRelation: "estimates"; referencedColumns: ["id"]; }]; }; estimates: { Row: { contingency_amount: number | null; contingency_percent: number | null; contingency_used: number | null; created_at: string | null; created_by: string | null; date_created: string | null; default_markup_percent: number | null; estimate_number: string; id: string; is_auto_generated: boolean | null; is_current_version: boolean | null; is_draft: boolean; notes: string | null; parent_estimate_id: string | null; project_id: string; revision_number: number | null; sequence_number: number | null; status: Database["public"]["Enums"]["estimate_status"] | null; target_margin_percent: number | null; total_amount: number | null; total_cost: number | null; total_labor_cushion: number | null; updated_at: string | null; valid_for_days: number | null; valid_until: string | null; version_number: number | null; }; Insert: { contingency_amount?: number | null; contingency_percent?: number | null; contingency_used?: number | null; created_at?: string | null; created_by?: string | null; date_created?: string | null; default_markup_percent?: number | null; estimate_number: string; id?: string; is_auto_generated?: boolean | null; is_current_version?: boolean | null; is_draft?: boolean; notes?: string | null; parent_estimate_id?: string | null; project_id: string; revision_number?: number | null; sequence_number?: number | null; status?: Database["public"]["Enums"]["estimate_status"] | null; target_margin_percent?: number | null; total_amount?: number | null; total_cost?: number | null; total_labor_cushion?: number | null; updated_at?: string | null; valid_for_days?: number | null; valid_until?: string | null; version_number?: number | null; }; Update: { contingency_amount?: number | null; contingency_percent?: number | null; contingency_used?: number | null; created_at?: string | null; created_by?: string | null; date_created?: string | null; default_markup_percent?: number | null; estimate_number?: string; id?: string; is_auto_generated?: boolean | null; is_current_version?: boolean | null; is_draft?: boolean; notes?: string | null; parent_estimate_id?: string | null; project_id?: string; revision_number?: number | null; sequence_number?: number | null; status?: Database["public"]["Enums"]["estimate_status"] | null; target_margin_percent?: number | null; total_amount?: number | null; total_cost?: number | null; total_labor_cushion?: number | null; updated_at?: string | null; valid_for_days?: number | null; valid_until?: string | null; version_number?: number | null; }; Relationships: [{ foreignKeyName: "estimates_parent_estimate_id_fkey"; columns: ["parent_estimate_id"]; isOneToOne: false; referencedRelation: "estimate_financial_summary"; referencedColumns: ["estimate_id"]; }, { foreignKeyName: "estimates_parent_estimate_id_fkey"; columns: ["parent_estimate_id"]; isOneToOne: false; referencedRelation: "estimates"; referencedColumns: ["id"]; }, { foreignKeyName: "estimates_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }]; }; expense_line_item_correlations: { Row: { auto_correlated: boolean | null; change_order_line_item_id: string | null; confidence_score: number | null; correlation_type: string; created_at: string; estimate_line_item_id: string | null; expense_id: string | null; expense_split_id: string | null; id: string; notes: string | null; quote_id: string | null; updated_at: string; }; Insert: { auto_correlated?: boolean | null; change_order_line_item_id?: string | null; confidence_score?: number | null; correlation_type: string; created_at?: string; estimate_line_item_id?: string | null; expense_id?: string | null; expense_split_id?: string | null; id?: string; notes?: string | null; quote_id?: string | null; updated_at?: string; }; Update: { auto_correlated?: boolean | null; change_order_line_item_id?: string | null; confidence_score?: number | null; correlation_type?: string; created_at?: string; estimate_line_item_id?: string | null; expense_id?: string | null; expense_split_id?: string | null; id?: string; notes?: string | null; quote_id?: string | null; updated_at?: string; }; Relationships: [{ foreignKeyName: "expense_line_item_correlations_change_order_line_item_id_fkey"; columns: ["change_order_line_item_id"]; isOneToOne: false; referencedRelation: "change_order_line_items"; referencedColumns: ["id"]; }, { foreignKeyName: "expense_line_item_correlations_estimate_line_item_id_fkey"; columns: ["estimate_line_item_id"]; isOneToOne: false; referencedRelation: "estimate_line_items"; referencedColumns: ["id"]; }, { foreignKeyName: "expense_line_item_correlations_expense_id_fkey"; columns: ["expense_id"]; isOneToOne: false; referencedRelation: "expenses"; referencedColumns: ["id"]; }, { foreignKeyName: "expense_line_item_correlations_expense_split_id_fkey"; columns: ["expense_split_id"]; isOneToOne: false; referencedRelation: "expense_splits"; referencedColumns: ["id"]; }, { foreignKeyName: "expense_line_item_correlations_quote_id_fkey"; columns: ["quote_id"]; isOneToOne: false; referencedRelation: "quotes"; referencedColumns: ["id"]; }]; }; expense_splits: { Row: { created_at: string; created_by: string | null; expense_id: string; id: string; notes: string | null; project_id: string; split_amount: number; split_percentage: number | null; updated_at: string; }; Insert: { created_at?: string; created_by?: string | null; expense_id: string; id?: string; notes?: string | null; project_id: string; split_amount: number; split_percentage?: number | null; updated_at?: string; }; Update: { created_at?: string; created_by?: string | null; expense_id?: string; id?: string; notes?: string | null; project_id?: string; split_amount?: number; split_percentage?: number | null; updated_at?: string; }; Relationships: [{ foreignKeyName: "expense_splits_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }, { foreignKeyName: "expense_splits_expense_id_fkey"; columns: ["expense_id"]; isOneToOne: false; referencedRelation: "expenses"; referencedColumns: ["id"]; }, { foreignKeyName: "expense_splits_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }]; }; expenses: { Row: { account_full_name: string | null; account_name: string | null; amount: number; approval_status: string | null; approved_at: string | null; approved_by: string | null; attachment_url: string | null; category: Database["public"]["Enums"]["expense_category"]; created_at: string | null; created_offline: boolean | null; description: string | null; end_time: string | null; expense_date: string | null; gross_hours: number | null; hours: number | null; id: string; import_batch_id: string | null; invoice_number: string | null; is_locked: boolean | null; is_planned: boolean | null; is_split: boolean; local_id: string | null; lunch_duration_minutes: number | null; lunch_taken: boolean | null; payee_id: string | null; project_id: string; quickbooks_transaction_id: string | null; receipt_id: string | null; rejection_reason: string | null; start_time: string | null; submitted_for_approval_at: string | null; synced_at: string | null; transaction_type: Database["public"]["Enums"]["transaction_type"]; updated_at: string | null; updated_by: string | null; user_id: string | null; }; Insert: { account_full_name?: string | null; account_name?: string | null; amount: number; approval_status?: string | null; approved_at?: string | null; approved_by?: string | null; attachment_url?: string | null; category: Database["public"]["Enums"]["expense_category"]; created_at?: string | null; created_offline?: boolean | null; description?: string | null; end_time?: string | null; expense_date?: string | null; gross_hours?: number | null; hours?: number | null; id?: string; import_batch_id?: string | null; invoice_number?: string | null; is_locked?: boolean | null; is_planned?: boolean | null; is_split?: boolean; local_id?: string | null; lunch_duration_minutes?: number | null; lunch_taken?: boolean | null; payee_id?: string | null; project_id: string; quickbooks_transaction_id?: string | null; receipt_id?: string | null; rejection_reason?: string | null; start_time?: string | null; submitted_for_approval_at?: string | null; synced_at?: string | null; transaction_type: Database["public"]["Enums"]["transaction_type"]; updated_at?: string | null; updated_by?: string | null; user_id?: string | null; }; Update: { account_full_name?: string | null; account_name?: string | null; amount?: number; approval_status?: string | null; approved_at?: string | null; approved_by?: string | null; attachment_url?: string | null; category?: Database["public"]["Enums"]["expense_category"]; created_at?: string | null; created_offline?: boolean | null; description?: string | null; end_time?: string | null; expense_date?: string | null; gross_hours?: number | null; hours?: number | null; id?: string; import_batch_id?: string | null; invoice_number?: string | null; is_locked?: boolean | null; is_planned?: boolean | null; is_split?: boolean; local_id?: string | null; lunch_duration_minutes?: number | null; lunch_taken?: boolean | null; payee_id?: string | null; project_id?: string; quickbooks_transaction_id?: string | null; receipt_id?: string | null; rejection_reason?: string | null; start_time?: string | null; submitted_for_approval_at?: string | null; synced_at?: string | null; transaction_type?: Database["public"]["Enums"]["transaction_type"]; updated_at?: string | null; updated_by?: string | null; user_id?: string | null; }; Relationships: [{ foreignKeyName: "expenses_approved_by_fkey"; columns: ["approved_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }, { foreignKeyName: "expenses_import_batch_id_fkey"; columns: ["import_batch_id"]; isOneToOne: false; referencedRelation: "import_batches"; referencedColumns: ["id"]; }, { foreignKeyName: "expenses_payee_id_fkey"; columns: ["payee_id"]; isOneToOne: false; referencedRelation: "payees"; referencedColumns: ["id"]; }, { foreignKeyName: "expenses_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }, { foreignKeyName: "expenses_receipt_id_fkey"; columns: ["receipt_id"]; isOneToOne: false; referencedRelation: "receipts"; referencedColumns: ["id"]; }, { foreignKeyName: "expenses_updated_by_fkey"; columns: ["updated_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; feature_flags: { Row: { config: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; created_at: string | null; description: string | null; enabled: boolean | null; flag_name: string; id: string; updated_at: string | null; updated_by: string | null; }; Insert: { config?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; created_at?: string | null; description?: string | null; enabled?: boolean | null; flag_name: string; id?: string; updated_at?: string | null; updated_by?: string | null; }; Update: { config?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; created_at?: string | null; description?: string | null; enabled?: boolean | null; flag_name?: string; id?: string; updated_at?: string | null; updated_by?: string | null; }; Relationships: [{ foreignKeyName: "feature_flags_updated_by_fkey"; columns: ["updated_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; import_batches: { Row: { duplicates_skipped: number | null; errors: number | null; expenses_imported: number | null; file_name: string; id: string; imported_at: string | null; imported_by: string | null; match_log: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; revenues_imported: number | null; status: string | null; total_rows: number | null; }; Insert: { duplicates_skipped?: number | null; errors?: number | null; expenses_imported?: number | null; file_name: string; id?: string; imported_at?: string | null; imported_by?: string | null; match_log?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; revenues_imported?: number | null; status?: string | null; total_rows?: number | null; }; Update: { duplicates_skipped?: number | null; errors?: number | null; expenses_imported?: number | null; file_name?: string; id?: string; imported_at?: string | null; imported_by?: string | null; match_log?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; revenues_imported?: number | null; status?: string | null; total_rows?: number | null; }; Relationships: []; }; media_comments: { Row: { comment_text: string; created_at: string; id: string; media_id: string; updated_at: string; user_id: string; }; Insert: { comment_text: string; created_at?: string; id?: string; media_id: string; updated_at?: string; user_id: string; }; Update: { comment_text?: string; created_at?: string; id?: string; media_id?: string; updated_at?: string; user_id?: string; }; Relationships: [{ foreignKeyName: "media_comments_media_id_fkey"; columns: ["media_id"]; isOneToOne: false; referencedRelation: "project_media"; referencedColumns: ["id"]; }, { foreignKeyName: "media_comments_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; payees: { Row: { account_number: string | null; billing_address: string | null; contact_name: string | null; contact_title: string | null; created_at: string | null; email: string | null; employee_number: string | null; full_name: string | null; hourly_rate: number | null; id: string; insurance_expires: string | null; is_active: boolean | null; is_internal: boolean | null; last_synced_at: string | null; legal_form: string | null; license_number: string | null; notes: string | null; payee_name: string; payee_type: string | null; permit_issuer: boolean | null; phone_numbers: string | null; provides_labor: boolean | null; provides_materials: boolean | null; quickbooks_sync_status: string | null; quickbooks_synced_at: string | null; quickbooks_vendor_id: string | null; quickbooks_vendor_name: string | null; requires_1099: boolean | null; state_of_formation: string | null; sync_status: Database["public"]["Enums"]["sync_status"] | null; terms: string | null; updated_at: string | null; user_id: string | null; }; Insert: { account_number?: string | null; billing_address?: string | null; contact_name?: string | null; contact_title?: string | null; created_at?: string | null; email?: string | null; employee_number?: string | null; full_name?: string | null; hourly_rate?: number | null; id?: string; insurance_expires?: string | null; is_active?: boolean | null; is_internal?: boolean | null; last_synced_at?: string | null; legal_form?: string | null; license_number?: string | null; notes?: string | null; payee_name: string; payee_type?: string | null; permit_issuer?: boolean | null; phone_numbers?: string | null; provides_labor?: boolean | null; provides_materials?: boolean | null; quickbooks_sync_status?: string | null; quickbooks_synced_at?: string | null; quickbooks_vendor_id?: string | null; quickbooks_vendor_name?: string | null; requires_1099?: boolean | null; state_of_formation?: string | null; sync_status?: Database["public"]["Enums"]["sync_status"] | null; terms?: string | null; updated_at?: string | null; user_id?: string | null; }; Update: { account_number?: string | null; billing_address?: string | null; contact_name?: string | null; contact_title?: string | null; created_at?: string | null; email?: string | null; employee_number?: string | null; full_name?: string | null; hourly_rate?: number | null; id?: string; insurance_expires?: string | null; is_active?: boolean | null; is_internal?: boolean | null; last_synced_at?: string | null; legal_form?: string | null; license_number?: string | null; notes?: string | null; payee_name?: string; payee_type?: string | null; permit_issuer?: boolean | null; phone_numbers?: string | null; provides_labor?: boolean | null; provides_materials?: boolean | null; quickbooks_sync_status?: string | null; quickbooks_synced_at?: string | null; quickbooks_vendor_id?: string | null; quickbooks_vendor_name?: string | null; requires_1099?: boolean | null; state_of_formation?: string | null; sync_status?: Database["public"]["Enums"]["sync_status"] | null; terms?: string | null; updated_at?: string | null; user_id?: string | null; }; Relationships: []; }; payment_application_lines: { Row: { balance_to_finish: number; created_at: string; current_work: number; id: string; payment_application_id: string; percent_complete: number; previous_work: number; retainage: number; scheduled_value: number; sov_line_item_id: string; stored_materials: number; total_completed: number; updated_at: string; }; Insert: { balance_to_finish?: number; created_at?: string; current_work?: number; id?: string; payment_application_id: string; percent_complete?: number; previous_work?: number; retainage?: number; scheduled_value?: number; sov_line_item_id: string; stored_materials?: number; total_completed?: number; updated_at?: string; }; Update: { balance_to_finish?: number; created_at?: string; current_work?: number; id?: string; payment_application_id?: string; percent_complete?: number; previous_work?: number; retainage?: number; scheduled_value?: number; sov_line_item_id?: string; stored_materials?: number; total_completed?: number; updated_at?: string; }; Relationships: [{ foreignKeyName: "payment_application_lines_payment_application_id_fkey"; columns: ["payment_application_id"]; isOneToOne: false; referencedRelation: "payment_applications"; referencedColumns: ["id"]; }, { foreignKeyName: "payment_application_lines_sov_line_item_id_fkey"; columns: ["sov_line_item_id"]; isOneToOne: false; referencedRelation: "sov_line_items"; referencedColumns: ["id"]; }]; }; payment_applications: { Row: { application_number: number; balance_to_finish: number; certified_amount: number | null; certified_by: string | null; certified_date: string | null; contract_sum_to_date: number; created_at: string; created_by: string | null; current_payment_due: number; g702_pdf_storage_path: string | null; g702_pdf_url: string | null; g703_pdf_storage_path: string | null; g703_pdf_url: string | null; id: string; net_change_orders: number; notes: string | null; original_contract_sum: number; period_from: string; period_to: string; project_id: string; sov_id: string; status: Database["public"]["Enums"]["payment_application_status"]; total_completed_to_date: number; total_earned_less_retainage: number; total_previous_payments: number; total_retainage: number; updated_at: string; version: number; }; Insert: { application_number: number; balance_to_finish?: number; certified_amount?: number | null; certified_by?: string | null; certified_date?: string | null; contract_sum_to_date?: number; created_at?: string; created_by?: string | null; current_payment_due?: number; g702_pdf_storage_path?: string | null; g702_pdf_url?: string | null; g703_pdf_storage_path?: string | null; g703_pdf_url?: string | null; id?: string; net_change_orders?: number; notes?: string | null; original_contract_sum?: number; period_from: string; period_to: string; project_id: string; sov_id: string; status?: Database["public"]["Enums"]["payment_application_status"]; total_completed_to_date?: number; total_earned_less_retainage?: number; total_previous_payments?: number; total_retainage?: number; updated_at?: string; version?: number; }; Update: { application_number?: number; balance_to_finish?: number; certified_amount?: number | null; certified_by?: string | null; certified_date?: string | null; contract_sum_to_date?: number; created_at?: string; created_by?: string | null; current_payment_due?: number; g702_pdf_storage_path?: string | null; g702_pdf_url?: string | null; g703_pdf_storage_path?: string | null; g703_pdf_url?: string | null; id?: string; net_change_orders?: number; notes?: string | null; original_contract_sum?: number; period_from?: string; period_to?: string; project_id?: string; sov_id?: string; status?: Database["public"]["Enums"]["payment_application_status"]; total_completed_to_date?: number; total_earned_less_retainage?: number; total_previous_payments?: number; total_retainage?: number; updated_at?: string; version?: number; }; Relationships: [{ foreignKeyName: "payment_applications_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }, { foreignKeyName: "payment_applications_sov_id_fkey"; columns: ["sov_id"]; isOneToOne: false; referencedRelation: "schedule_of_values"; referencedColumns: ["id"]; }]; }; pending_payee_reviews: { Row: { account_full_name: string | null; created_at: string | null; id: string; import_batch_id: string; matched_payee_id: string | null; qb_name: string; resolution: string | null; resolved_at: string | null; suggested_payee_type: string | null; }; Insert: { account_full_name?: string | null; created_at?: string | null; id?: string; import_batch_id: string; matched_payee_id?: string | null; qb_name: string; resolution?: string | null; resolved_at?: string | null; suggested_payee_type?: string | null; }; Update: { account_full_name?: string | null; created_at?: string | null; id?: string; import_batch_id?: string; matched_payee_id?: string | null; qb_name?: string; resolution?: string | null; resolved_at?: string | null; suggested_payee_type?: string | null; }; Relationships: [{ foreignKeyName: "pending_payee_reviews_import_batch_id_fkey"; columns: ["import_batch_id"]; isOneToOne: false; referencedRelation: "import_batches"; referencedColumns: ["id"]; }, { foreignKeyName: "pending_payee_reviews_matched_payee_id_fkey"; columns: ["matched_payee_id"]; isOneToOne: false; referencedRelation: "payees"; referencedColumns: ["id"]; }]; }; profiles: { Row: { created_at: string; deactivated_at: string | null; deactivated_by: string | null; email: string | null; full_name: string | null; id: string; is_active: boolean; last_active_at: string | null; must_change_password: boolean | null; phone: string | null; sms_notifications_enabled: boolean | null; updated_at: string; }; Insert: { created_at?: string; deactivated_at?: string | null; deactivated_by?: string | null; email?: string | null; full_name?: string | null; id: string; is_active?: boolean; last_active_at?: string | null; must_change_password?: boolean | null; phone?: string | null; sms_notifications_enabled?: boolean | null; updated_at?: string; }; Update: { created_at?: string; deactivated_at?: string | null; deactivated_by?: string | null; email?: string | null; full_name?: string | null; id?: string; is_active?: boolean; last_active_at?: string | null; must_change_password?: boolean | null; phone?: string | null; sms_notifications_enabled?: boolean | null; updated_at?: string; }; Relationships: [{ foreignKeyName: "profiles_deactivated_by_fkey"; columns: ["deactivated_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; project_aliases: { Row: { alias: string; created_at: string | null; id: string; is_active: boolean | null; match_type: string | null; project_id: string; }; Insert: { alias: string; created_at?: string | null; id?: string; is_active?: boolean | null; match_type?: string | null; project_id: string; }; Update: { alias?: string; created_at?: string | null; id?: string; is_active?: boolean | null; match_type?: string | null; project_id?: string; }; Relationships: [{ foreignKeyName: "project_aliases_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }]; }; project_assignments: { Row: { assigned_at: string | null; assigned_by: string | null; id: string; project_id: string; user_id: string; }; Insert: { assigned_at?: string | null; assigned_by?: string | null; id?: string; project_id: string; user_id: string; }; Update: { assigned_at?: string | null; assigned_by?: string | null; id?: string; project_id?: string; user_id?: string; }; Relationships: [{ foreignKeyName: "project_assignments_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }]; }; project_documents: { Row: { created_at: string; description: string | null; document_type: string; expires_at: string | null; file_name: string; file_size: number; file_url: string; id: string; mime_type: string; project_id: string; related_quote_id: string | null; updated_at: string; uploaded_by: string | null; version_number: number | null; }; Insert: { created_at?: string; description?: string | null; document_type: string; expires_at?: string | null; file_name: string; file_size: number; file_url: string; id?: string; mime_type: string; project_id: string; related_quote_id?: string | null; updated_at?: string; uploaded_by?: string | null; version_number?: number | null; }; Update: { created_at?: string; description?: string | null; document_type?: string; expires_at?: string | null; file_name?: string; file_size?: number; file_url?: string; id?: string; mime_type?: string; project_id?: string; related_quote_id?: string | null; updated_at?: string; uploaded_by?: string | null; version_number?: number | null; }; Relationships: [{ foreignKeyName: "project_documents_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }, { foreignKeyName: "project_documents_related_quote_id_fkey"; columns: ["related_quote_id"]; isOneToOne: false; referencedRelation: "quotes"; referencedColumns: ["id"]; }]; }; project_media: { Row: { altitude: number | null; caption: string | null; created_at: string; description: string | null; device_model: string | null; duration: number | null; file_name: string; file_size: number; file_type: string; file_url: string; id: string; latitude: number | null; location_name: string | null; longitude: number | null; mime_type: string; project_id: string; taken_at: string | null; thumbnail_url: string | null; updated_at: string; upload_source: string | null; uploaded_by: string | null; }; Insert: { altitude?: number | null; caption?: string | null; created_at?: string; description?: string | null; device_model?: string | null; duration?: number | null; file_name: string; file_size: number; file_type: string; file_url: string; id?: string; latitude?: number | null; location_name?: string | null; longitude?: number | null; mime_type: string; project_id: string; taken_at?: string | null; thumbnail_url?: string | null; updated_at?: string; upload_source?: string | null; uploaded_by?: string | null; }; Update: { altitude?: number | null; caption?: string | null; created_at?: string; description?: string | null; device_model?: string | null; duration?: number | null; file_name?: string; file_size?: number; file_type?: string; file_url?: string; id?: string; latitude?: number | null; location_name?: string | null; longitude?: number | null; mime_type?: string; project_id?: string; taken_at?: string | null; thumbnail_url?: string | null; updated_at?: string; upload_source?: string | null; uploaded_by?: string | null; }; Relationships: [{ foreignKeyName: "project_media_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }]; }; project_notes: { Row: { attachment_name: string | null; attachment_type: string | null; attachment_url: string | null; created_at: string; id: string; note_text: string; project_id: string; updated_at: string; user_id: string; }; Insert: { attachment_name?: string | null; attachment_type?: string | null; attachment_url?: string | null; created_at?: string; id?: string; note_text: string; project_id: string; updated_at?: string; user_id: string; }; Update: { attachment_name?: string | null; attachment_type?: string | null; attachment_url?: string | null; created_at?: string; id?: string; note_text?: string; project_id?: string; updated_at?: string; user_id?: string; }; Relationships: [{ foreignKeyName: "project_notes_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }, { foreignKeyName: "project_notes_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; project_revenues: { Row: { account_full_name: string | null; account_name: string | null; amount: number; client_id: string | null; created_at: string; description: string | null; id: string; import_batch_id: string | null; invoice_date: string; invoice_number: string | null; is_split: boolean | null; project_id: string; quickbooks_transaction_id: string | null; updated_at: string; }; Insert: { account_full_name?: string | null; account_name?: string | null; amount: number; client_id?: string | null; created_at?: string; description?: string | null; id?: string; import_batch_id?: string | null; invoice_date?: string; invoice_number?: string | null; is_split?: boolean | null; project_id: string; quickbooks_transaction_id?: string | null; updated_at?: string; }; Update: { account_full_name?: string | null; account_name?: string | null; amount?: number; client_id?: string | null; created_at?: string; description?: string | null; id?: string; import_batch_id?: string | null; invoice_date?: string; invoice_number?: string | null; is_split?: boolean | null; project_id?: string; quickbooks_transaction_id?: string | null; updated_at?: string; }; Relationships: [{ foreignKeyName: "project_revenues_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"]; }, { foreignKeyName: "project_revenues_import_batch_id_fkey"; columns: ["import_batch_id"]; isOneToOne: false; referencedRelation: "import_batches"; referencedColumns: ["id"]; }, { foreignKeyName: "project_revenues_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }]; }; projects: { Row: { actual_hours: number | null; actual_margin: number | null; address: string | null; adjusted_est_costs: number | null; adjusted_est_margin: number | null; category: Database["public"]["Enums"]["project_category"]; client_id: string | null; client_name: string; contingency_amount: number | null; contingency_remaining: number | null; contracted_amount: number | null; created_at: string | null; current_margin: number | null; customer_po_number: string | null; default_expense_category: Database["public"]["Enums"]["expense_category"] | null; do_not_exceed: number | null; end_date: string | null; estimated_hours: number | null; id: string; job_type: string | null; last_synced_at: string | null; margin_percentage: number | null; minimum_margin_threshold: number | null; notes: string | null; original_est_costs: number | null; original_margin: number | null; owner_id: string | null; payment_terms: string | null; project_name: string; project_number: string; project_type: Database["public"]["Enums"]["project_type"] | null; projected_margin: number | null; qb_formatted_number: string | null; quickbooks_job_id: string | null; sequence_number: number | null; start_date: string | null; status: Database["public"]["Enums"]["project_status"] | null; sync_status: Database["public"]["Enums"]["sync_status"] | null; target_margin: number | null; total_accepted_quotes: number | null; updated_at: string | null; work_order_counter: number | null; }; Insert: { actual_hours?: number | null; actual_margin?: number | null; address?: string | null; adjusted_est_costs?: number | null; adjusted_est_margin?: number | null; category?: Database["public"]["Enums"]["project_category"]; client_id?: string | null; client_name: string; contingency_amount?: number | null; contingency_remaining?: number | null; contracted_amount?: number | null; created_at?: string | null; current_margin?: number | null; customer_po_number?: string | null; default_expense_category?: Database["public"]["Enums"]["expense_category"] | null; do_not_exceed?: number | null; end_date?: string | null; estimated_hours?: number | null; id?: string; job_type?: string | null; last_synced_at?: string | null; margin_percentage?: number | null; minimum_margin_threshold?: number | null; notes?: string | null; original_est_costs?: number | null; original_margin?: number | null; owner_id?: string | null; payment_terms?: string | null; project_name: string; project_number: string; project_type?: Database["public"]["Enums"]["project_type"] | null; projected_margin?: number | null; qb_formatted_number?: string | null; quickbooks_job_id?: string | null; sequence_number?: number | null; start_date?: string | null; status?: Database["public"]["Enums"]["project_status"] | null; sync_status?: Database["public"]["Enums"]["sync_status"] | null; target_margin?: number | null; total_accepted_quotes?: number | null; updated_at?: string | null; work_order_counter?: number | null; }; Update: { actual_hours?: number | null; actual_margin?: number | null; address?: string | null; adjusted_est_costs?: number | null; adjusted_est_margin?: number | null; category?: Database["public"]["Enums"]["project_category"]; client_id?: string | null; client_name?: string; contingency_amount?: number | null; contingency_remaining?: number | null; contracted_amount?: number | null; created_at?: string | null; current_margin?: number | null; customer_po_number?: string | null; default_expense_category?: Database["public"]["Enums"]["expense_category"] | null; do_not_exceed?: number | null; end_date?: string | null; estimated_hours?: number | null; id?: string; job_type?: string | null; last_synced_at?: string | null; margin_percentage?: number | null; minimum_margin_threshold?: number | null; notes?: string | null; original_est_costs?: number | null; original_margin?: number | null; owner_id?: string | null; payment_terms?: string | null; project_name?: string; project_number?: string; project_type?: Database["public"]["Enums"]["project_type"] | null; projected_margin?: number | null; qb_formatted_number?: string | null; quickbooks_job_id?: string | null; sequence_number?: number | null; start_date?: string | null; status?: Database["public"]["Enums"]["project_status"] | null; sync_status?: Database["public"]["Enums"]["sync_status"] | null; target_margin?: number | null; total_accepted_quotes?: number | null; updated_at?: string | null; work_order_counter?: number | null; }; Relationships: [{ foreignKeyName: "projects_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"]; }, { foreignKeyName: "projects_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "payees"; referencedColumns: ["id"]; }]; }; quickbooks_account_mappings: { Row: { app_category: Database["public"]["Enums"]["expense_category"]; created_at: string; id: string; is_active: boolean; qb_account_full_path: string; qb_account_name: string; updated_at: string; }; Insert: { app_category: Database["public"]["Enums"]["expense_category"]; created_at?: string; id?: string; is_active?: boolean; qb_account_full_path: string; qb_account_name: string; updated_at?: string; }; Update: { app_category?: Database["public"]["Enums"]["expense_category"]; created_at?: string; id?: string; is_active?: boolean; qb_account_full_path?: string; qb_account_name?: string; updated_at?: string; }; Relationships: []; }; quickbooks_connections: { Row: { access_token: string; company_name: string | null; connected_at: string | null; connected_by: string | null; created_at: string | null; disconnected_at: string | null; disconnected_by: string | null; environment: string; id: string; is_active: boolean | null; last_error: string | null; last_sync_at: string | null; realm_id: string; refresh_token: string; token_expires_at: string; updated_at: string | null; }; Insert: { access_token: string; company_name?: string | null; connected_at?: string | null; connected_by?: string | null; created_at?: string | null; disconnected_at?: string | null; disconnected_by?: string | null; environment?: string; id?: string; is_active?: boolean | null; last_error?: string | null; last_sync_at?: string | null; realm_id: string; refresh_token: string; token_expires_at: string; updated_at?: string | null; }; Update: { access_token?: string; company_name?: string | null; connected_at?: string | null; connected_by?: string | null; created_at?: string | null; disconnected_at?: string | null; disconnected_by?: string | null; environment?: string; id?: string; is_active?: boolean | null; last_error?: string | null; last_sync_at?: string | null; realm_id?: string; refresh_token?: string; token_expires_at?: string; updated_at?: string | null; }; Relationships: [{ foreignKeyName: "quickbooks_connections_connected_by_fkey"; columns: ["connected_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }, { foreignKeyName: "quickbooks_connections_disconnected_by_fkey"; columns: ["disconnected_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; quickbooks_oauth_states: { Row: { created_at: string | null; expires_at: string; state: string; user_id: string; }; Insert: { created_at?: string | null; expires_at: string; state: string; user_id: string; }; Update: { created_at?: string | null; expires_at?: string; state?: string; user_id?: string; }; Relationships: [{ foreignKeyName: "quickbooks_oauth_states_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; quickbooks_sync_log: { Row: { created_at: string | null; duration_ms: number | null; entity_id: string | null; entity_type: string; environment: string | null; error_message: string | null; id: string; initiated_by: string | null; quickbooks_id: string | null; request_payload: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; response_payload: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; status: Database["public"]["Enums"]["sync_status"] | null; sync_type: Database["public"]["Enums"]["sync_type"]; synced_at: string | null; }; Insert: { created_at?: string | null; duration_ms?: number | null; entity_id?: string | null; entity_type: string; environment?: string | null; error_message?: string | null; id?: string; initiated_by?: string | null; quickbooks_id?: string | null; request_payload?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; response_payload?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; status?: Database["public"]["Enums"]["sync_status"] | null; sync_type: Database["public"]["Enums"]["sync_type"]; synced_at?: string | null; }; Update: { created_at?: string | null; duration_ms?: number | null; entity_id?: string | null; entity_type?: string; environment?: string | null; error_message?: string | null; id?: string; initiated_by?: string | null; quickbooks_id?: string | null; request_payload?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; response_payload?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; status?: Database["public"]["Enums"]["sync_status"] | null; sync_type?: Database["public"]["Enums"]["sync_type"]; synced_at?: string | null; }; Relationships: [{ foreignKeyName: "quickbooks_sync_log_initiated_by_fkey"; columns: ["initiated_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; quickbooks_transaction_syncs: { Row: { created_at: string | null; duplicates_skipped: number | null; end_date: string; environment: string; error_message: string | null; expenses_imported: number | null; id: string; initiated_by: string | null; revenues_imported: number | null; start_date: string; sync_completed_at: string | null; sync_started_at: string; sync_status: string; transactions_fetched: number | null; updated_at: string | null; }; Insert: { created_at?: string | null; duplicates_skipped?: number | null; end_date: string; environment: string; error_message?: string | null; expenses_imported?: number | null; id?: string; initiated_by?: string | null; revenues_imported?: number | null; start_date: string; sync_completed_at?: string | null; sync_started_at?: string; sync_status?: string; transactions_fetched?: number | null; updated_at?: string | null; }; Update: { created_at?: string | null; duplicates_skipped?: number | null; end_date?: string; environment?: string; error_message?: string | null; expenses_imported?: number | null; id?: string; initiated_by?: string | null; revenues_imported?: number | null; start_date?: string; sync_completed_at?: string | null; sync_started_at?: string; sync_status?: string; transactions_fetched?: number | null; updated_at?: string | null; }; Relationships: []; }; quote_line_items: { Row: { category: Database["public"]["Enums"]["expense_category"]; change_order_line_item_id: string | null; cost_per_unit: number | null; created_at: string | null; description: string | null; estimate_line_item_id: string | null; id: string; markup_amount: number | null; markup_percent: number | null; quantity: number | null; quote_id: string; rate: number | null; sort_order: number | null; total: number | null; total_cost: number | null; total_markup: number | null; unit: string | null; }; Insert: { category: Database["public"]["Enums"]["expense_category"]; change_order_line_item_id?: string | null; cost_per_unit?: number | null; created_at?: string | null; description?: string | null; estimate_line_item_id?: string | null; id?: string; markup_amount?: number | null; markup_percent?: number | null; quantity?: number | null; quote_id: string; rate?: number | null; sort_order?: number | null; total?: number | null; total_cost?: number | null; total_markup?: number | null; unit?: string | null; }; Update: { category?: Database["public"]["Enums"]["expense_category"]; change_order_line_item_id?: string | null; cost_per_unit?: number | null; created_at?: string | null; description?: string | null; estimate_line_item_id?: string | null; id?: string; markup_amount?: number | null; markup_percent?: number | null; quantity?: number | null; quote_id?: string; rate?: number | null; sort_order?: number | null; total?: number | null; total_cost?: number | null; total_markup?: number | null; unit?: string | null; }; Relationships: [{ foreignKeyName: "quote_line_items_change_order_line_item_id_fkey"; columns: ["change_order_line_item_id"]; isOneToOne: false; referencedRelation: "change_order_line_items"; referencedColumns: ["id"]; }, { foreignKeyName: "quote_line_items_estimate_line_item_id_fkey"; columns: ["estimate_line_item_id"]; isOneToOne: false; referencedRelation: "estimate_line_items"; referencedColumns: ["id"]; }, { foreignKeyName: "quote_line_items_quote_id_fkey"; columns: ["quote_id"]; isOneToOne: false; referencedRelation: "quotes"; referencedColumns: ["id"]; }]; }; quotes: { Row: { accepted_date: string | null; attachment_url: string | null; created_at: string | null; date_received: string | null; estimate_id: string | null; id: string; includes_labor: boolean; includes_materials: boolean; notes: string | null; payee_id: string; project_id: string; quote_number: string; rejection_reason: string | null; sequence_number: number | null; status: Database["public"]["Enums"]["quote_status"] | null; total_amount: number | null; updated_at: string | null; valid_until: string | null; }; Insert: { accepted_date?: string | null; attachment_url?: string | null; created_at?: string | null; date_received?: string | null; estimate_id?: string | null; id?: string; includes_labor?: boolean; includes_materials?: boolean; notes?: string | null; payee_id: string; project_id: string; quote_number: string; rejection_reason?: string | null; sequence_number?: number | null; status?: Database["public"]["Enums"]["quote_status"] | null; total_amount?: number | null; updated_at?: string | null; valid_until?: string | null; }; Update: { accepted_date?: string | null; attachment_url?: string | null; created_at?: string | null; date_received?: string | null; estimate_id?: string | null; id?: string; includes_labor?: boolean; includes_materials?: boolean; notes?: string | null; payee_id?: string; project_id?: string; quote_number?: string; rejection_reason?: string | null; sequence_number?: number | null; status?: Database["public"]["Enums"]["quote_status"] | null; total_amount?: number | null; updated_at?: string | null; valid_until?: string | null; }; Relationships: [{ foreignKeyName: "quotes_estimate_id_fkey"; columns: ["estimate_id"]; isOneToOne: false; referencedRelation: "estimate_financial_summary"; referencedColumns: ["estimate_id"]; }, { foreignKeyName: "quotes_estimate_id_fkey"; columns: ["estimate_id"]; isOneToOne: false; referencedRelation: "estimates"; referencedColumns: ["id"]; }, { foreignKeyName: "quotes_payee_id_fkey"; columns: ["payee_id"]; isOneToOne: false; referencedRelation: "payees"; referencedColumns: ["id"]; }, { foreignKeyName: "quotes_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }]; }; receipts: { Row: { amount: number; approval_status: string | null; approved_at: string | null; approved_by: string | null; captured_at: string; created_at: string; description: string | null; id: string; image_url: string; payee_id: string | null; project_id: string | null; quickbooks_error_message: string | null; quickbooks_request_payload: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; quickbooks_response_payload: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; quickbooks_sync_status: string | null; quickbooks_synced_at: string | null; quickbooks_synced_by: string | null; quickbooks_transaction_id: string | null; rejection_reason: string | null; submitted_for_approval_at: string | null; updated_at: string; user_id: string; }; Insert: { amount: number; approval_status?: string | null; approved_at?: string | null; approved_by?: string | null; captured_at?: string; created_at?: string; description?: string | null; id?: string; image_url: string; payee_id?: string | null; project_id?: string | null; quickbooks_error_message?: string | null; quickbooks_request_payload?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; quickbooks_response_payload?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; quickbooks_sync_status?: string | null; quickbooks_synced_at?: string | null; quickbooks_synced_by?: string | null; quickbooks_transaction_id?: string | null; rejection_reason?: string | null; submitted_for_approval_at?: string | null; updated_at?: string; user_id: string; }; Update: { amount?: number; approval_status?: string | null; approved_at?: string | null; approved_by?: string | null; captured_at?: string; created_at?: string; description?: string | null; id?: string; image_url?: string; payee_id?: string | null; project_id?: string | null; quickbooks_error_message?: string | null; quickbooks_request_payload?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; quickbooks_response_payload?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; quickbooks_sync_status?: string | null; quickbooks_synced_at?: string | null; quickbooks_synced_by?: string | null; quickbooks_transaction_id?: string | null; rejection_reason?: string | null; submitted_for_approval_at?: string | null; updated_at?: string; user_id?: string; }; Relationships: [{ foreignKeyName: "receipts_payee_id_fkey"; columns: ["payee_id"]; isOneToOne: false; referencedRelation: "payees"; referencedColumns: ["id"]; }, { foreignKeyName: "receipts_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }, { foreignKeyName: "receipts_quickbooks_synced_by_fkey"; columns: ["quickbooks_synced_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; report_execution_log: { Row: { config_used: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; executed_at: string | null; executed_by: string | null; execution_time_ms: number | null; export_format: string | null; id: string; report_id: string | null; row_count: number | null; }; Insert: { config_used?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; executed_at?: string | null; executed_by?: string | null; execution_time_ms?: number | null; export_format?: string | null; id?: string; report_id?: string | null; row_count?: number | null; }; Update: { config_used?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; executed_at?: string | null; executed_by?: string | null; execution_time_ms?: number | null; export_format?: string | null; id?: string; report_id?: string | null; row_count?: number | null; }; Relationships: [{ foreignKeyName: "report_execution_log_report_id_fkey"; columns: ["report_id"]; isOneToOne: false; referencedRelation: "saved_reports"; referencedColumns: ["id"]; }]; }; revenue_splits: { Row: { created_at: string; created_by: string | null; id: string; notes: string | null; project_id: string; revenue_id: string; split_amount: number; split_percentage: number | null; updated_at: string; }; Insert: { created_at?: string; created_by?: string | null; id?: string; notes?: string | null; project_id: string; revenue_id: string; split_amount: number; split_percentage?: number | null; updated_at?: string; }; Update: { created_at?: string; created_by?: string | null; id?: string; notes?: string | null; project_id?: string; revenue_id?: string; split_amount?: number; split_percentage?: number | null; updated_at?: string; }; Relationships: [{ foreignKeyName: "revenue_splits_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }, { foreignKeyName: "revenue_splits_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }, { foreignKeyName: "revenue_splits_revenue_id_fkey"; columns: ["revenue_id"]; isOneToOne: false; referencedRelation: "project_revenues"; referencedColumns: ["id"]; }]; }; saved_reports: { Row: { category: string | null; config: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json; created_at: string | null; created_by: string | null; description: string | null; id: string; is_template: boolean | null; name: string; updated_at: string | null; }; Insert: { category?: string | null; config: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json; created_at?: string | null; created_by?: string | null; description?: string | null; id?: string; is_template?: boolean | null; name: string; updated_at?: string | null; }; Update: { category?: string | null; config?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json; created_at?: string | null; created_by?: string | null; description?: string | null; id?: string; is_template?: boolean | null; name?: string; updated_at?: string | null; }; Relationships: []; }; schedule_of_values: { Row: { created_at: string; created_by: string | null; estimate_id: string; id: string; original_contract_sum: number; project_id: string; retainage_percent: number; updated_at: string; }; Insert: { created_at?: string; created_by?: string | null; estimate_id: string; id?: string; original_contract_sum?: number; project_id: string; retainage_percent?: number; updated_at?: string; }; Update: { created_at?: string; created_by?: string | null; estimate_id?: string; id?: string; original_contract_sum?: number; project_id?: string; retainage_percent?: number; updated_at?: string; }; Relationships: [{ foreignKeyName: "schedule_of_values_estimate_id_fkey"; columns: ["estimate_id"]; isOneToOne: false; referencedRelation: "estimate_financial_summary"; referencedColumns: ["estimate_id"]; }, { foreignKeyName: "schedule_of_values_estimate_id_fkey"; columns: ["estimate_id"]; isOneToOne: false; referencedRelation: "estimates"; referencedColumns: ["id"]; }, { foreignKeyName: "schedule_of_values_project_id_fkey"; columns: ["project_id"]; isOneToOne: true; referencedRelation: "projects"; referencedColumns: ["id"]; }]; }; scheduled_sms_logs: { Row: { created_at: string | null; error_details: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; executed_at: string | null; failure_count: number | null; id: string; recipients_count: number | null; scheduled_sms_id: string | null; success_count: number | null; }; Insert: { created_at?: string | null; error_details?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; executed_at?: string | null; failure_count?: number | null; id?: string; recipients_count?: number | null; scheduled_sms_id?: string | null; success_count?: number | null; }; Update: { created_at?: string | null; error_details?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; executed_at?: string | null; failure_count?: number | null; id?: string; recipients_count?: number | null; scheduled_sms_id?: string | null; success_count?: number | null; }; Relationships: [{ foreignKeyName: "scheduled_sms_logs_scheduled_sms_id_fkey"; columns: ["scheduled_sms_id"]; isOneToOne: false; referencedRelation: "scheduled_sms_messages"; referencedColumns: ["id"]; }]; }; scheduled_sms_messages: { Row: { created_at: string | null; created_by: string; cron_expression: string | null; id: string; is_active: boolean | null; last_sent_at: string | null; link_type: string | null; link_url: string | null; message_template: string; name: string; project_id: string | null; schedule_type: string; scheduled_datetime: string | null; target_roles: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; target_type: string; target_user_ids: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; timezone: string; updated_at: string | null; }; Insert: { created_at?: string | null; created_by: string; cron_expression?: string | null; id?: string; is_active?: boolean | null; last_sent_at?: string | null; link_type?: string | null; link_url?: string | null; message_template: string; name: string; project_id?: string | null; schedule_type: string; scheduled_datetime?: string | null; target_roles?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; target_type: string; target_user_ids?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; timezone?: string; updated_at?: string | null; }; Update: { created_at?: string | null; created_by?: string; cron_expression?: string | null; id?: string; is_active?: boolean | null; last_sent_at?: string | null; link_type?: string | null; link_url?: string | null; message_template?: string; name?: string; project_id?: string | null; schedule_type?: string; scheduled_datetime?: string | null; target_roles?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; target_type?: string; target_user_ids?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json | null; timezone?: string; updated_at?: string | null; }; Relationships: [{ foreignKeyName: "scheduled_sms_messages_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }, { foreignKeyName: "scheduled_sms_messages_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }]; }; sms_messages: { Row: { created_at: string | null; delivery_status: string | null; error_message: string | null; id: string; link_type: string | null; link_url: string | null; message_body: string; project_id: string | null; recipient_name: string | null; recipient_phone: string; recipient_user_id: string | null; sent_at: string | null; sent_by: string; status_checked_at: string | null; textbelt_http_status: number | null; textbelt_text_id: string | null; updated_at: string | null; }; Insert: { created_at?: string | null; delivery_status?: string | null; error_message?: string | null; id?: string; link_type?: string | null; link_url?: string | null; message_body: string; project_id?: string | null; recipient_name?: string | null; recipient_phone: string; recipient_user_id?: string | null; sent_at?: string | null; sent_by: string; status_checked_at?: string | null; textbelt_http_status?: number | null; textbelt_text_id?: string | null; updated_at?: string | null; }; Update: { created_at?: string | null; delivery_status?: string | null; error_message?: string | null; id?: string; link_type?: string | null; link_url?: string | null; message_body?: string; project_id?: string | null; recipient_name?: string | null; recipient_phone?: string; recipient_user_id?: string | null; sent_at?: string | null; sent_by?: string; status_checked_at?: string | null; textbelt_http_status?: number | null; textbelt_text_id?: string | null; updated_at?: string | null; }; Relationships: [{ foreignKeyName: "sms_messages_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }, { foreignKeyName: "sms_messages_recipient_user_id_fkey"; columns: ["recipient_user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }, { foreignKeyName: "sms_messages_sent_by_fkey"; columns: ["sent_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; sov_line_items: { Row: { category: Database["public"]["Enums"]["expense_category"] | null; created_at: string; description: string; id: string; item_number: string; retainage_percent_override: number | null; scheduled_value: number; sort_order: number; source_change_order_id: string | null; source_estimate_line_item_id: string | null; sov_id: string; }; Insert: { category?: Database["public"]["Enums"]["expense_category"] | null; created_at?: string; description: string; id?: string; item_number: string; retainage_percent_override?: number | null; scheduled_value?: number; sort_order?: number; source_change_order_id?: string | null; source_estimate_line_item_id?: string | null; sov_id: string; }; Update: { category?: Database["public"]["Enums"]["expense_category"] | null; created_at?: string; description?: string; id?: string; item_number?: string; retainage_percent_override?: number | null; scheduled_value?: number; sort_order?: number; source_change_order_id?: string | null; source_estimate_line_item_id?: string | null; sov_id?: string; }; Relationships: [{ foreignKeyName: "sov_line_items_source_change_order_id_fkey"; columns: ["source_change_order_id"]; isOneToOne: false; referencedRelation: "change_orders"; referencedColumns: ["id"]; }, { foreignKeyName: "sov_line_items_source_estimate_line_item_id_fkey"; columns: ["source_estimate_line_item_id"]; isOneToOne: false; referencedRelation: "estimate_line_items"; referencedColumns: ["id"]; }, { foreignKeyName: "sov_line_items_sov_id_fkey"; columns: ["sov_id"]; isOneToOne: false; referencedRelation: "schedule_of_values"; referencedColumns: ["id"]; }]; }; system_settings: { Row: { created_at: string; description: string | null; id: string; setting_key: string; setting_value: string; updated_at: string; }; Insert: { created_at?: string; description?: string | null; id?: string; setting_key: string; setting_value: string; updated_at?: string; }; Update: { created_at?: string; description?: string | null; id?: string; setting_key?: string; setting_value?: string; updated_at?: string; }; Relationships: []; }; training_assignments: { Row: { assigned_at: string | null; assigned_by: string | null; due_date: string | null; id: string; notes: string | null; notification_sent_at: string | null; priority: number | null; reminder_sent_at: string | null; training_content_id: string; user_id: string; }; Insert: { assigned_at?: string | null; assigned_by?: string | null; due_date?: string | null; id?: string; notes?: string | null; notification_sent_at?: string | null; priority?: number | null; reminder_sent_at?: string | null; training_content_id: string; user_id: string; }; Update: { assigned_at?: string | null; assigned_by?: string | null; due_date?: string | null; id?: string; notes?: string | null; notification_sent_at?: string | null; priority?: number | null; reminder_sent_at?: string | null; training_content_id?: string; user_id?: string; }; Relationships: [{ foreignKeyName: "training_assignments_assigned_by_fkey"; columns: ["assigned_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }, { foreignKeyName: "training_assignments_training_content_id_fkey"; columns: ["training_content_id"]; isOneToOne: false; referencedRelation: "training_content"; referencedColumns: ["id"]; }, { foreignKeyName: "training_assignments_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; training_completions: { Row: { acknowledged: boolean | null; completed_at: string | null; id: string; notes: string | null; time_spent_minutes: number | null; training_content_id: string; user_id: string; }; Insert: { acknowledged?: boolean | null; completed_at?: string | null; id?: string; notes?: string | null; time_spent_minutes?: number | null; training_content_id: string; user_id: string; }; Update: { acknowledged?: boolean | null; completed_at?: string | null; id?: string; notes?: string | null; time_spent_minutes?: number | null; training_content_id?: string; user_id?: string; }; Relationships: [{ foreignKeyName: "training_completions_training_content_id_fkey"; columns: ["training_content_id"]; isOneToOne: false; referencedRelation: "training_content"; referencedColumns: ["id"]; }, { foreignKeyName: "training_completions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; training_content: { Row: { content_type: Database["public"]["Enums"]["training_content_type"]; content_url: string | null; created_at: string | null; created_by: string | null; description: string | null; duration_minutes: number | null; embed_code: string | null; id: string; is_required: boolean | null; status: Database["public"]["Enums"]["training_status"] | null; storage_path: string | null; target_roles: Database["public"]["Enums"]["app_role"][] | null; thumbnail_url: string | null; title: string; updated_at: string | null; }; Insert: { content_type: Database["public"]["Enums"]["training_content_type"]; content_url?: string | null; created_at?: string | null; created_by?: string | null; description?: string | null; duration_minutes?: number | null; embed_code?: string | null; id?: string; is_required?: boolean | null; status?: Database["public"]["Enums"]["training_status"] | null; storage_path?: string | null; target_roles?: Database["public"]["Enums"]["app_role"][] | null; thumbnail_url?: string | null; title: string; updated_at?: string | null; }; Update: { content_type?: Database["public"]["Enums"]["training_content_type"]; content_url?: string | null; created_at?: string | null; created_by?: string | null; description?: string | null; duration_minutes?: number | null; embed_code?: string | null; id?: string; is_required?: boolean | null; status?: Database["public"]["Enums"]["training_status"] | null; storage_path?: string | null; target_roles?: Database["public"]["Enums"]["app_role"][] | null; thumbnail_url?: string | null; title?: string; updated_at?: string | null; }; Relationships: [{ foreignKeyName: "training_content_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; training_notifications: { Row: { delivered: boolean | null; email_id: string | null; error_message: string | null; id: string; notification_type: string; sent_at: string | null; training_content_id: string; user_id: string; }; Insert: { delivered?: boolean | null; email_id?: string | null; error_message?: string | null; id?: string; notification_type: string; sent_at?: string | null; training_content_id: string; user_id: string; }; Update: { delivered?: boolean | null; email_id?: string | null; error_message?: string | null; id?: string; notification_type?: string; sent_at?: string | null; training_content_id?: string; user_id?: string; }; Relationships: [{ foreignKeyName: "training_notifications_training_content_id_fkey"; columns: ["training_content_id"]; isOneToOne: false; referencedRelation: "training_content"; referencedColumns: ["id"]; }, { foreignKeyName: "training_notifications_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; user_roles: { Row: { assigned_at: string | null; assigned_by: string | null; id: string; role: Database["public"]["Enums"]["app_role"]; user_id: string; }; Insert: { assigned_at?: string | null; assigned_by?: string | null; id?: string; role: Database["public"]["Enums"]["app_role"]; user_id: string; }; Update: { assigned_at?: string | null; assigned_by?: string | null; id?: string; role?: Database["public"]["Enums"]["app_role"]; user_id?: string; }; Relationships: []; }; }; Views: { estimate_financial_summary: { Row: { contingency_amount: number | null; contingency_percent: number | null; created_at: string | null; cushion_hours_capacity: number | null; estimate_id: string | null; estimate_number: string | null; estimated_gross_margin_percent: number | null; estimated_gross_profit: number | null; max_gross_profit_potential: number | null; max_potential_margin_percent: number | null; project_id: string | null; schedule_buffer_percent: number | null; status: Database["public"]["Enums"]["estimate_status"] | null; subtotal: number | null; total_estimated_cost: number | null; total_labor_actual_cost: number | null; total_labor_billing_cost: number | null; total_labor_capacity: number | null; total_labor_client_price: number | null; total_labor_cushion: number | null; total_labor_hours: number | null; total_with_contingency: number | null; updated_at: string | null; }; Relationships: [{ foreignKeyName: "estimates_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }]; }; weekly_labor_hours: { Row: { approved_entries: number | null; employee_name: string | null; employee_number: string | null; entry_count: number | null; gross_hours: number | null; hourly_rate: number | null; pending_entries: number | null; rejected_entries: number | null; total_cost: number | null; paid_hours: number | null; week_end_saturday: string | null; week_start_sunday: string | null; }; Relationships: []; }; }; Functions: { ai_find_client_by_name: { Args: { p_search_term: string; }; Returns: { client_name: string; confidence: number; email: string; id: string; match_type: string; phone: string; }[]; }; ai_get_project_summary: { Args: { p_project_id: string; }; Returns: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json; }; ai_resolve_project: { Args: { p_search_term: string; }; Returns: { client_name: string; confidence: number; id: string; match_type: string; project_name: string; project_number: string; project_type: Database["public"]["Enums"]["project_type"]; status: Database["public"]["Enums"]["project_status"]; }[]; }; calculate_contingency_remaining: { Args: { project_id_param: string; }; Returns: number; }; calculate_estimate_labor_cushion: { Args: { p_estimate_id: string; }; Returns: number; }; calculate_project_margins: { Args: { p_project_id: string; }; Returns: undefined; }; can_access_project: { Args: { _project_id: string; _user_id: string; }; Returns: boolean; }; check_margin_thresholds: { Args: { project_id_param: string; }; Returns: string; }; check_scheduled_sms_cron_job: { Args: never; Returns: { command: string; jobid: number; schedule: string; }[]; }; cleanup_expired_oauth_states: { Args: never; Returns: undefined; }; create_estimate_version: { Args: { new_version_number?: number; source_estimate_id: string; }; Returns: string; }; create_payment_application: { Args: { p_period_from: string; p_period_to: string; p_project_id: string; }; Returns: string; }; delete_project_cascade: { Args: { p_project_id: string; }; Returns: undefined; }; duplicate_quote_for_estimate: { Args: { source_quote_id: string; target_estimate_id: string; }; Returns: string; }; execute_ai_query: { Args: { p_query: string; }; Returns: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json; }; execute_simple_report: { Args: { p_data_source: string; p_filters?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json; p_limit?: number; p_sort_by?: string; p_sort_dir?: string; }; Returns: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json; }; generate_estimate_number: { Args: { project_id_param: string; project_number_param: string; }; Returns: string; }; generate_quote_number: { Args: { estimate_id_param?: string; project_id_param: string; project_number_param: string; }; Returns: string; }; generate_sov_from_estimate: { Args: { p_estimate_id: string; p_project_id: string; p_retainage_percent?: number; }; Returns: string; }; generate_work_order_number: { Args: { project_id_param: string; project_number_param: string; }; Returns: string; }; get_database_schema: { Args: never; Returns: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json; }; get_next_project_number: { Args: never; Returns: string; }; get_profit_analysis_data: { Args: { status_filter?: string[]; }; Returns: { accepted_quote_count: number; actual_margin: number; adjusted_est_costs: number; adjusted_est_margin: number; budget_utilization_percent: number; change_order_cost: number; change_order_count: number; change_order_revenue: number; client_name: string; contingency_amount: number; contingency_remaining: number; contingency_used: number; contracted_amount: number; cost_variance: number; cost_variance_percent: number; current_margin: number; end_date: string; expenses_by_category: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json; id: string; invoice_count: number; job_type: string; margin_percentage: number; original_est_costs: number; original_margin: number; project_name: string; project_number: string; projected_margin: number; start_date: string; status: string; total_accepted_quotes: number; total_expenses: number; total_invoiced: number; }[]; }; get_project_financial_summary: { Args: never; Returns: { accepted_quote_count: number; actual_margin_percentage: number; actual_profit: number; change_order_costs: number; change_order_revenue: number; client_name: string; contingency_amount: number; cost_variance: number; expense_count: number; invoice_count: number; project_id: string; project_name: string; project_number: string; revenue_variance: number; status: Database["public"]["Enums"]["project_status"]; total_estimated: number; total_expenses: number; total_invoiced: number; total_quoted: number; }[]; }; get_project_revenue_total: { Args: { p_project_id: string; }; Returns: number; }; get_scheduled_sms_recipients: { Args: { p_target_roles: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json; p_target_type: string; p_target_user_ids: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json; }; Returns: { full_name: string; phone: string; user_id: string; }[]; }; get_user_auth_status: { Args: never; Returns: { confirmed_at: string; email: string; full_name: string; has_password: boolean; id: string; is_active: boolean; last_active_at: string; last_sign_in_at: string; must_change_password: boolean; }[]; }; has_any_role: { Args: { _user_id: string; }; Returns: boolean; }; has_role: { Args: { _role: Database["public"]["Enums"]["app_role"]; _user_id: string; }; Returns: boolean; }; log_activity: { Args: { p_activity_type: string; p_description: string; p_entity_id: string; p_entity_type: string; p_metadata?: import("C:/Dev/profitbuild-dash/src/integrations/supabase/types").Json; p_project_id: string; p_user_id: string; }; Returns: string; }; refresh_estimate_labor_cushion: { Args: { p_estimate_id: string; }; Returns: number; }; safe_cast_to_expense_category: { Args: { val: string; }; Returns: Database["public"]["Enums"]["expense_category"]; }; safe_cast_to_project_status: { Args: { val: string; }; Returns: Database["public"]["Enums"]["project_status"]; }; safe_cast_to_quote_status: { Args: { val: string; }; Returns: Database["public"]["Enums"]["quote_status"]; }; }; Enums: { app_role: "admin" | "manager" | "field_worker"; change_order_status: "pending" | "approved" | "rejected"; estimate_status: "draft" | "sent" | "approved" | "rejected" | "expired"; expense_category: "labor_internal" | "subcontractors" | "materials" | "equipment" | "other" | "permits" | "management" | "office_expenses" | "vehicle_expenses" | "tools" | "software" | "vehicle_maintenance" | "gas" | "meals"; payment_application_status: "draft" | "submitted" | "certified" | "paid" | "rejected"; project_category: "construction" | "system" | "overhead"; project_status: "estimating" | "approved" | "in_progress" | "complete" | "on_hold" | "cancelled"; project_type: "construction_project" | "work_order"; quote_status: "pending" | "accepted" | "rejected" | "expired"; sync_status: "success" | "failed" | "pending"; sync_type: "import" | "export"; training_content_type: "video_link" | "video_embed" | "document" | "presentation" | "external_link"; training_status: "draft" | "published" | "archived"; transaction_type: "expense" | "bill" | "check" | "credit_card" | "cash"; }; CompositeTypes: { [_ in never]: never; }; }, { PostgrestVersion: "13.0.5"; }>
```

_No inline documentation provided._

**Example**

```ts
import { supabase } from '@/integrations/supabase/client';

// Use supabase as needed.
```

### SYSTEM_PROJECT_NUMBERS

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
readonly ["SYS-000", "000-UNASSIGNED"]
```

_No inline documentation provided._

**Example**

```ts
import { SYSTEM_PROJECT_NUMBERS } from '@/types/project';

// Use SYSTEM_PROJECT_NUMBERS as needed.
```

### timeEntryColumnDefinitions

**Import:** `@/config/timeEntryColumns`

- Defined in: `config/timeEntryColumns.ts`
- Export type: named

```ts
({ key: string; label: string; required: boolean; sortable: boolean; } | { key: string; label: string; required: boolean; sortable?: undefined; })[]
```

_No inline documentation provided._

**Example**

```ts
import { timeEntryColumnDefinitions } from '@/config/timeEntryColumns';

// Use timeEntryColumnDefinitions as needed.
```

### timeEntryKPIs

**Import:** `@/lib/kpi-definitions/time-entry-kpis`

- Defined in: `lib/kpi-definitions/time-entry-kpis.ts`
- Export type: named and default

```ts
KPIMeasure[]
```

_No inline documentation provided._

**Example**

```ts
import timeEntryKPIs, { timeEntryKPIs as timeEntryKPIsNamed } from '@/lib/kpi-definitions/time-entry-kpis';

// Use timeEntryKPIs as needed.
```

### TRANSACTION_TYPE_DISPLAY

**Import:** `@/types/expense`

- Defined in: `types/expense.ts`
- Export type: named

```ts
Record<TransactionType, string>
```

_No inline documentation provided._

**Example**

```ts
import { TRANSACTION_TYPE_DISPLAY } from '@/types/expense';

// Use TRANSACTION_TYPE_DISPLAY as needed.
```

### TRANSACTION_TYPE_MAP

**Import:** `@/utils/importCore`

- Defined in: `utils/importCore.ts`
- Export type: named

```ts
Record<string, TransactionType>
```

_No inline documentation provided._

**Example**

```ts
import { TRANSACTION_TYPE_MAP } from '@/utils/importCore';

// Use TRANSACTION_TYPE_MAP as needed.
```

### US_STATE_OPTIONS

**Import:** `@/constants/contractFields`

- Defined in: `constants/contractFields.ts`
- Export type: named

```ts
({ value: "AL"; label: string; } | { value: "AK"; label: string; } | { value: "AZ"; label: string; } | { value: "AR"; label: string; } | { value: "CA"; label: string; } | { value: "CO"; label: string; } | { value: "CT"; label: string; } | { value: "DE"; label: string; } | { value: "FL"; label: string; } | { value: "GA"; label: string; } | { value: "HI"; label: string; } | { value: "ID"; label: string; } | { value: "IL"; label: string; } | { value: "IN"; label: string; } | { value: "IA"; label: string; } | { value: "KS"; label: string; } | { value: "KY"; label: string; } | { value: "LA"; label: string; } | { value: "ME"; label: string; } | { value: "MD"; label: string; } | { value: "MA"; label: string; } | { value: "MI"; label: string; } | { value: "MN"; label: string; } | { value: "MS"; label: string; } | { value: "MO"; label: string; } | { value: "MT"; label: string; } | { value: "NE"; label: string; } | { value: "NV"; label: string; } | { value: "NH"; label: string; } | { value: "NJ"; label: string; } | { value: "NM"; label: string; } | { value: "NY"; label: string; } | { value: "NC"; label: string; } | { value: "ND"; label: string; } | { value: "OH"; label: string; } | { value: "OK"; label: string; } | { value: "OR"; label: string; } | { value: "PA"; label: string; } | { value: "RI"; label: string; } | { value: "SC"; label: string; } | { value: "SD"; label: string; } | { value: "TN"; label: string; } | { value: "TX"; label: string; } | { value: "UT"; label: string; } | { value: "VT"; label: string; } | { value: "VA"; label: string; } | { value: "WA"; label: string; } | { value: "WV"; label: string; } | { value: "WI"; label: string; } | { value: "WY"; label: string; } | { value: "DC"; label: string; })[]
```

_No inline documentation provided._

**Example**

```ts
import { US_STATE_OPTIONS } from '@/constants/contractFields';

// Use US_STATE_OPTIONS as needed.
```

### Validation

**Import:** `@/lib/kpi-definitions/validation`

- Defined in: `lib/kpi-definitions/validation.ts`
- Export type: default

_No inline documentation provided._

**Example**

```ts
import Validation from '@/lib/kpi-definitions/validation';

// Use Validation as needed.
```

### viewKPIs

**Import:** `@/lib/kpi-definitions/view-kpis`

- Defined in: `lib/kpi-definitions/view-kpis.ts`
- Export type: named and default

```ts
KPIMeasure[]
```

_No inline documentation provided._

**Example**

```ts
import viewKPIs, { viewKPIs as viewKPIsNamed } from '@/lib/kpi-definitions/view-kpis';

// Use viewKPIs as needed.
```

### workOrderKPIs

**Import:** `@/lib/kpi-definitions/work-order-kpis`

- Defined in: `lib/kpi-definitions/work-order-kpis.ts`
- Export type: named and default

```ts
KPIMeasure[]
```

_No inline documentation provided._

**Example**

```ts
import workOrderKPIs, { workOrderKPIs as workOrderKPIsNamed } from '@/lib/kpi-definitions/work-order-kpis';

// Use workOrderKPIs as needed.
```
