# API Reference

> Generated on 2025-11-12T14:20:04.429Z by `scripts/generate-api-docs.ts`.

This reference enumerates all exported components, hooks, functions, classes, types, enums, and values exposed under `src/`. Each entry includes import examples and usage guidance.

## React Components

Total: 227

### AccountMappingsManager

**Import:** `@/components/AccountMappingsManager`

- Defined in: `components/AccountMappingsManager.tsx`
- Export type: named

```ts
function AccountMappingsManager(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { AccountMappingsManager } from '@/components/AccountMappingsManager';

<AccountMappingsManager {...props} />
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
}: ActivityFeedListProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { AddReceiptModal } from '@/components/time-tracker/AddReceiptModal';

<AddReceiptModal {...props} />
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
}: AICaptionEnhancerProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { AICaptionEnhancer } from '@/components/AICaptionEnhancer';

<AICaptionEnhancer {...props} />
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
}: AudioVisualizerProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function Auth(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function AuthProvider({ children }): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { AuthProvider } from '@/contexts/AuthContext';

<AuthProvider {...props} />
```

### Badge

**Import:** `@/components/ui/badge`

- Defined in: `components/ui/badge.tsx`
- Export type: named

```ts
function Badge({ className, variant, ...props }: BadgeProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { Badge } from '@/components/ui/badge';

<Badge {...props} />
```

### BrandedLoader

**Import:** `@/components/ui/branded-loader`

- Defined in: `components/ui/branded-loader.tsx`
- Export type: named

```ts
function BrandedLoader({ 
  message = "Loading..." 
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { BrandedLoader } from '@/components/ui/branded-loader';

<BrandedLoader {...props} />
```

### BudgetComparisonBadge

**Import:** `@/components/BudgetComparisonBadge`

- Defined in: `components/BudgetComparisonBadge.tsx`
- Export type: named

```ts
function BudgetComparisonBadge({ status }: BudgetComparisonBadgeProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { BudgetComparisonBadge } from '@/components/BudgetComparisonBadge';

<BudgetComparisonBadge {...props} />
```

### BulkActionsBar

**Import:** `@/components/time-tracker/BulkActionsBar`

- Defined in: `components/time-tracker/BulkActionsBar.tsx`
- Export type: named

```ts
function BulkActionsBar({ selectedIds, onClearSelection, onRefresh }: BulkActionsBarProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { BulkActionsBar } from '@/components/time-tracker/BulkActionsBar';

<BulkActionsBar {...props} />
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
function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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

### CaptionFlowDiagnostics

**Import:** `@/components/CaptionFlowDiagnostics`

- Defined in: `components/CaptionFlowDiagnostics.tsx`
- Export type: named

```ts
function CaptionFlowDiagnostics(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { CaptionFlowDiagnostics } from '@/components/CaptionFlowDiagnostics';

<CaptionFlowDiagnostics {...props} />
```

### ChangeOrderForm

**Import:** `@/components/ChangeOrderForm`

- Defined in: `components/ChangeOrderForm.tsx`
- Export type: named

```ts
function ChangeOrderForm({ projectId, changeOrder, onSuccess, onCancel }: ChangeOrderFormProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ChangeOrderLineItemTable } from '@/components/ChangeOrderLineItemTable';

<ChangeOrderLineItemTable {...props} />
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
  enablePagination = false,
  pageSize = 20
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function ChangeOrderStatusBadge({ status }: ChangeOrderStatusBadgeProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ChangeOrderStatusBadge } from '@/components/ChangeOrderStatusBadge';

<ChangeOrderStatusBadge {...props} />
```

### ChangePassword

**Import:** `@/pages/ChangePassword`

- Defined in: `pages/ChangePassword.tsx`
- Export type: default

```ts
function ChangePassword(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}: ClientBulkActionsProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}: ClientFiltersProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function ClientForm({ client, onSave, onCancel }: ClientFormProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function ClientImportModal({ open, onClose, onSuccess }): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}: ClientSelectorProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function ClientsList(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
  onVisibilityChange,
  columnOrder = columns.map(c => c.key),
  onColumnOrderChange,
}: ColumnSelectorProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ColumnSelector } from '@/components/ui/column-selector';

<ColumnSelector {...props} />
```

### CompanyBrandingSettings

**Import:** `@/components/CompanyBrandingSettings`

- Defined in: `components/CompanyBrandingSettings.tsx`
- Export type: named

```ts
function CompanyBrandingSettings(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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

### ContingencyAllocation

**Import:** `@/components/ContingencyAllocation`

- Defined in: `components/ContingencyAllocation.tsx`
- Export type: named

```ts
function ContingencyAllocation({ 
  projectId, 
  contingencyRemaining, 
  onAllocationComplete,
  onCancel 
}: ContingencyAllocationProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ContingencyAllocation } from '@/components/ContingencyAllocation';

<ContingencyAllocation {...props} />
```

### CreateTimeEntryDialog

**Import:** `@/components/time-tracker/CreateTimeEntryDialog`

- Defined in: `components/time-tracker/CreateTimeEntryDialog.tsx`
- Export type: named

```ts
function CreateTimeEntryDialog({ open, onOpenChange, onSaved }: CreateTimeEntryDialogProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function CreateUserModal({ open, onOpenChange, onUserCreated }: CreateUserModalProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}: DashboardHeaderProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

<DashboardHeader {...props} />
```

### DeleteUserDialog

**Import:** `@/components/DeleteUserDialog`

- Defined in: `components/DeleteUserDialog.tsx`
- Export type: named

```ts
function DeleteUserDialog({ open, onOpenChange, user, onSuccess }: DeleteUserDialogProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { DeleteUserDialog } from '@/components/DeleteUserDialog';

<DeleteUserDialog {...props} />
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
}: DocumentUploadProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { DocumentUpload } from '@/components/DocumentUpload';

<DocumentUpload {...props} />
```

### EditProfileModal

**Import:** `@/components/EditProfileModal`

- Defined in: `components/EditProfileModal.tsx`
- Export type: default

```ts
function EditProfileModal({ open, onOpenChange, user, onSuccess }: EditProfileModalProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function EditReceiptDialog({ receipt, open, onOpenChange, onSaved }: EditReceiptDialogProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function EditReceiptModal({ open, onClose, onSuccess, receipt }: EditReceiptModalProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function EditTimeEntryDialog({ entry, open, onOpenChange, onSaved }: EditTimeEntryDialogProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EditTimeEntryDialog } from '@/components/time-tracker/EditTimeEntryDialog';

<EditTimeEntryDialog {...props} />
```

### EntityDetailsModal

**Import:** `@/components/EntityDetailsModal`

- Defined in: `components/EntityDetailsModal.tsx`
- Export type: named

```ts
function EntityDetailsModal({
  isOpen,
  onClose,
  title,
  subtitle,
  sections,
  onEdit,
  onDelete,
  children
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EntityDetailsModal } from '@/components/EntityDetailsModal';

<EntityDetailsModal {...props} />
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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function EstimateAccuracyChart({ data }): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}: EstimateActionsMenuProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateActionsMenu } from '@/components/EstimateActionsMenu';

<EstimateActionsMenu {...props} />
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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateExportModal } from '@/components/EstimateExportModal';

<EstimateExportModal {...props} />
```

### EstimateFamilyAnalyticsDashboard

**Import:** `@/components/EstimateFamilyAnalyticsDashboard`

- Defined in: `components/EstimateFamilyAnalyticsDashboard.tsx`
- Export type: named

```ts
function EstimateFamilyAnalyticsDashboard(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateFamilyAnalyticsDashboard } from '@/components/EstimateFamilyAnalyticsDashboard';

<EstimateFamilyAnalyticsDashboard {...props} />
```

### EstimateFamilySummary

**Import:** `@/components/EstimateFamilySummary`

- Defined in: `components/EstimateFamilySummary.tsx`
- Export type: named

```ts
function EstimateFamilySummary({ 
  projectId, 
  projectName, 
  onCreateEstimate,
  onViewEstimate 
}: EstimateFamilySummaryProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateFamilySummary } from '@/components/EstimateFamilySummary';

<EstimateFamilySummary {...props} />
```

### EstimateFinancialAnalyticsDashboard

**Import:** `@/components/EstimateFinancialAnalyticsDashboard`

- Defined in: `components/EstimateFinancialAnalyticsDashboard.tsx`
- Export type: default

```ts
function EstimateFinancialAnalyticsDashboard(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function EstimateForm({ mode = 'edit', initialEstimate, preselectedProjectId, availableEstimates = [], onSave, onCancel, hideNavigationButtons = false }: EstimateFormProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateForm } from '@/components/EstimateForm';

<EstimateForm {...props} />
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
  clients
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateSearchFilters } from '@/components/EstimateSearchFilters';

<EstimateSearchFilters {...props} />
```

### EstimatesList

**Import:** `@/components/EstimatesList`

- Defined in: `components/EstimatesList.tsx`
- Export type: named

```ts
function EstimatesList({ estimates, onEdit, onDelete, onView, onCreateNew }: EstimatesListProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimatesList } from '@/components/EstimatesList';

<EstimatesList {...props} />
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
function EstimatesTableView({ estimates, onEdit, onDelete, onView, onCreateNew }: EstimatesTableViewProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimatesTableView } from '@/components/EstimatesTableView';

<EstimatesTableView {...props} />
```

### EstimateStatusActions

**Import:** `@/components/EstimateStatusActions`

- Defined in: `components/EstimateStatusActions.tsx`
- Export type: named

```ts
function EstimateStatusActions({ 
  estimateId, 
  currentStatus, 
  onStatusUpdate,
  className 
}: EstimateStatusActionsProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateStatusActions } from '@/components/EstimateStatusActions';

<EstimateStatusActions {...props} />
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
}: EstimateStatusSelectorProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateStatusSelector } from '@/components/EstimateStatusSelector';

<EstimateStatusSelector {...props} />
```

### EstimateVersionComparison

**Import:** `@/components/EstimateVersionComparison`

- Defined in: `components/EstimateVersionComparison.tsx`
- Export type: named

```ts
function EstimateVersionComparison({ projectId, onClose }: EstimateVersionComparisonProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateVersionComparison } from '@/components/EstimateVersionComparison';

<EstimateVersionComparison {...props} />
```

### EstimateVersionManager

**Import:** `@/components/EstimateVersionManager`

- Defined in: `components/EstimateVersionManager.tsx`
- Export type: named

```ts
function EstimateVersionManager({ estimate, onVersionCreated }: EstimateVersionManagerProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { EstimateVersionManager } from '@/components/EstimateVersionManager';

<EstimateVersionManager {...props} />
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
}: ExpenseBulkActionsProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function ExpenseDashboard({ expenses, estimates }): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ExpenseDashboard } from '@/components/ExpenseDashboard';

<ExpenseDashboard {...props} />
```

### ExpenseForm

**Import:** `@/components/ExpenseForm`

- Defined in: `components/ExpenseForm.tsx`
- Export type: named

```ts
function ExpenseForm({ expense, onSave, onCancel }): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ExpenseForm } from '@/components/ExpenseForm';

<ExpenseForm {...props} />
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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ExpenseImportModal } from '@/components/ExpenseImportModal';

<ExpenseImportModal {...props} />
```

### ExpenseMatching

**Import:** `@/pages/ExpenseMatching`

- Defined in: `pages/ExpenseMatching.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import ExpenseMatching from '@/pages/ExpenseMatching';

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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ExpenseSplitDialog } from '@/components/ExpenseSplitDialog';

<ExpenseSplitDialog {...props} />
```

### ExpenseUpload

**Import:** `@/components/ExpenseUpload`

- Defined in: `components/ExpenseUpload.tsx`
- Export type: named

```ts
function ExpenseUpload({ estimates, onExpensesImported }): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ExpenseUpload } from '@/components/ExpenseUpload';

<ExpenseUpload {...props} />
```

### FieldMedia

**Import:** `@/pages/FieldMedia`

- Defined in: `pages/FieldMedia.tsx`
- Export type: default

```ts
function FieldMedia(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import FieldMedia from '@/pages/FieldMedia';

<FieldMedia {...props} />
```

### FieldPhotoCapture

**Import:** `@/pages/FieldPhotoCapture`

- Defined in: `pages/FieldPhotoCapture.tsx`
- Export type: default

```ts
function FieldPhotoCapture(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function FieldProjectSelector({ selectedProjectId, onProjectSelect }: FieldProjectSelectorProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { FieldProjectSelector } from '@/components/FieldProjectSelector';

<FieldProjectSelector {...props} />
```

### FieldSchedule

**Import:** `@/pages/FieldSchedule`

- Defined in: `pages/FieldSchedule.tsx`
- Export type: default

```ts
function FieldSchedule(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
  onTaskUpdate,
  projectId,
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { FieldScheduleTable } from '@/components/schedule/FieldScheduleTable';

<FieldScheduleTable {...props} />
```

### FieldVideoCapture

**Import:** `@/pages/FieldVideoCapture`

- Defined in: `pages/FieldVideoCapture.tsx`
- Export type: default

```ts
function FieldVideoCapture(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import FieldVideoCapture from '@/pages/FieldVideoCapture';

<FieldVideoCapture {...props} />
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
  sortable = true,
  collapseAllButton,
  collapsedGroups: externalCollapsedGroups,
  onCollapsedGroupsChange,
}: FinancialTableTemplateProps<T>): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { FuzzyMatchDetailsPanel } from '@/components/FuzzyMatchDetailsPanel';

<FuzzyMatchDetailsPanel {...props} />
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
  }): import("/workspace/src/types/schedule").ScheduleWarning[]
```

Generate all schedule warnings for a set of tasks

**Example**

```tsx
import { generateScheduleWarnings } from '@/components/schedule/utils/scheduleValidation';

<generateScheduleWarnings {...props} />
```

### getReadyToStartTasks

**Import:** `@/components/schedule/utils/scheduleCalculations`

- Defined in: `components/schedule/utils/scheduleCalculations.ts`
- Export type: named

```ts
function getReadyToStartTasks(tasks: ScheduleTask[]): import("/workspace/src/types/schedule").ScheduleTask[]
```

Get tasks that can start now (all dependencies met)

**Example**

```tsx
import { getReadyToStartTasks } from '@/components/schedule/utils/scheduleCalculations';

<getReadyToStartTasks {...props} />
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

**Import:** `@/components/GlobalExpenseMatching`

- Defined in: `components/GlobalExpenseMatching.tsx`
- Export type: named

```ts
function GlobalExpenseAllocation({
  onClose,
  projectId
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { GlobalExpenseAllocation } from '@/components/GlobalExpenseMatching';

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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import HierarchicalNumber, { HierarchicalNumber as HierarchicalNumberNamed } from '@/components/ui/hierarchical-number';

<HierarchicalNumber {...props} />
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

### Index

**Import:** `@/pages/Index`

- Defined in: `pages/Index.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import Index from '@/pages/Index';

<Index {...props} />
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

### LineItemControlDashboard

**Import:** `@/components/LineItemControlDashboard`

- Defined in: `components/LineItemControlDashboard.tsx`
- Export type: named

```ts
function LineItemControlDashboard({ projectId, project }: LineItemControlDashboardProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { LineItemTable } from '@/components/LineItemTable';

<LineItemTable {...props} />
```

### MarginDashboard

**Import:** `@/components/MarginDashboard`

- Defined in: `components/MarginDashboard.tsx`
- Export type: named

```ts
function MarginDashboard({ projectId }: MarginDashboardProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { MarginDashboard } from '@/components/MarginDashboard';

<MarginDashboard {...props} />
```

### MediaCommentBadge

**Import:** `@/components/MediaCommentBadge`

- Defined in: `components/MediaCommentBadge.tsx`
- Export type: named

```ts
function MediaCommentBadge({ mediaId }: MediaCommentBadgeProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function MediaCommentForm({ mediaId }: MediaCommentFormProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function MediaCommentsList({ mediaId }: MediaCommentsListProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}: MediaReportBuilderModalProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { MediaReportBuilderModal } from '@/components/MediaReportBuilderModal';

<MediaReportBuilderModal {...props} />
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
}: MobilePageWrapperProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

Universal mobile-first page wrapper component.
- Enforces mobile-safe container and padding
- Prevents horizontal scrolling
- Provides consistent page layout across application
- Follows construction industry data-dense standards

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
}: MobileResponsiveHeaderProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}: MobileResponsiveTabsProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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

### MobileTimeTracker

**Import:** `@/components/time-tracker/MobileTimeTracker`

- Defined in: `components/time-tracker/MobileTimeTracker.tsx`
- Export type: named

```ts
function MobileTimeTracker(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { MobileTimeTracker } from '@/components/time-tracker/MobileTimeTracker';

<MobileTimeTracker {...props} />
```

### Navigation

**Import:** `@/components/Navigation`

- Defined in: `components/Navigation.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import Navigation from '@/components/Navigation';

<Navigation {...props} />
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
  draftEstimates
}: NeedsAttentionCardProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { NeedsAttentionCard } from '@/components/dashboard/NeedsAttentionCard';

<NeedsAttentionCard {...props} />
```

### NotesSheetTrigger

**Import:** `@/components/schedule/NotesSheetTrigger`

- Defined in: `components/schedule/NotesSheetTrigger.tsx`
- Export type: named

```ts
function NotesSheetTrigger({ projectId, projectName }: NotesSheetTriggerProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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

### OfflineIndicator

**Import:** `@/components/OfflineIndicator`

- Defined in: `components/OfflineIndicator.tsx`
- Export type: named

```ts
function OfflineIndicator(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { OfflineIndicator } from '@/components/OfflineIndicator';

<OfflineIndicator {...props} />
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
}: PayeeBulkActionsProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}: PayeeFiltersProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function PayeeForm({ payee, onSuccess, onCancel, defaultPayeeType, defaultIsInternal, defaultProvidesLabor }: PayeeFormProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function PayeeImportModal({ open, onClose, onSuccess }): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}: PayeeSelectorProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { PayeeSelector } from '@/components/PayeeSelector';

<PayeeSelector {...props} />
```

### PayeeSelectorMobile

**Import:** `@/components/PayeeSelectorMobile`

- Defined in: `components/PayeeSelectorMobile.tsx`
- Export type: named

```ts
function PayeeSelectorMobile({ 
  value, 
  onValueChange,
  onBlur,
  placeholder = "Select a payee...",
  required = false,
  error = "",
  label = "Payee",
  showLabel = true,
  filterInternal = false,
  filterLabor = false,
  defaultPayeeType,
  defaultIsInternal,
  defaultProvidesLabor,
  compact = false
}: PayeeSelectorMobileProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { PayeeSelectorMobile } from '@/components/PayeeSelectorMobile';

<PayeeSelectorMobile {...props} />
```

### PayeesList

**Import:** `@/components/PayeesList`

- Defined in: `components/PayeesList.tsx`
- Export type: named

```ts
function PayeesList({ onEdit, refresh, onRefreshComplete }: PayeesListProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { PayeesList } from '@/components/PayeesList';

<PayeesList {...props} />
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
  fileName,
}: PdfPreviewModalProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { PdfPreviewModal } from '@/components/PdfPreviewModal';

<PdfPreviewModal {...props} />
```

### PdfUpload

**Import:** `@/components/PdfUpload`

- Defined in: `components/PdfUpload.tsx`
- Export type: named

```ts
function PdfUpload({
  onUpload,
  existingFile,
  onRemove
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { PdfUpload } from '@/components/PdfUpload';

<PdfUpload {...props} />
```

### PhotoLightbox

**Import:** `@/components/PhotoLightbox`

- Defined in: `components/PhotoLightbox.tsx`
- Export type: named

```ts
function PhotoLightbox({ photo, allPhotos, onClose, onNavigate }: PhotoLightboxProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function ProfitAnalysis({ estimates, quotes, expenses, projects }: ProfitAnalysisProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import ProfitAnalysis from '@/components/ProfitAnalysis';

<ProfitAnalysis {...props} />
```

### ProfitAnalysisPage

**Import:** `@/pages/ProfitAnalysis`

- Defined in: `pages/ProfitAnalysis.tsx`
- Export type: default

```ts
function ProfitAnalysisPage(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import ProfitAnalysisPage from '@/pages/ProfitAnalysis';

<ProfitAnalysisPage {...props} />
```

### ProfitChart

**Import:** `@/components/ProfitChart`

- Defined in: `components/ProfitChart.tsx`
- Export type: default

```ts
function ProfitChart({ data, type, dataKey, title, height = 300 }: ProfitChartProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import ProfitChart from '@/components/ProfitChart';

<ProfitChart {...props} />
```

### ProjectDetail

**Import:** `@/pages/ProjectDetail`

- Defined in: `pages/ProjectDetail.tsx`
- Export type: default

```ts
function ProjectDetail(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import ProjectDetail from '@/pages/ProjectDetail';

<ProjectDetail {...props} />
```

### ProjectDetailView

**Import:** `@/components/ProjectDetailView`

- Defined in: `components/ProjectDetailView.tsx`
- Export type: named

```ts
function ProjectDetailView(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function ProjectDocumentsHub({
  projectId,
  projectName,
  projectNumber,
  clientName,
}: ProjectDocumentsHubProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectDocumentsHub } from '@/components/ProjectDocumentsHub';

<ProjectDocumentsHub {...props} />
```

### ProjectDocumentsTable

**Import:** `@/components/ProjectDocumentsTable`

- Defined in: `components/ProjectDocumentsTable.tsx`
- Export type: named

```ts
function ProjectDocumentsTable({ 
  projectId, 
  documentType,
  onDocumentDeleted 
}: ProjectDocumentsTableProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function ProjectDocumentsTimeline({ projectId }: ProjectDocumentsTimelineProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function ProjectEdit(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function ProjectEditForm({ project, onSave, onCancel }: ProjectEditFormProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectEditForm } from '@/components/ProjectEditForm';

<ProjectEditForm {...props} />
```

### ProjectEstimatesView

**Import:** `@/components/ProjectEstimatesView`

- Defined in: `components/ProjectEstimatesView.tsx`
- Export type: named

```ts
function ProjectEstimatesView({ 
  projectId, 
  estimates, 
  quotes, 
  onRefresh 
}: ProjectEstimatesViewProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectEstimatesView } from '@/components/ProjectEstimatesView';

<ProjectEstimatesView {...props} />
```

### ProjectExpenseTracker

**Import:** `@/components/ProjectExpenseTracker`

- Defined in: `components/ProjectExpenseTracker.tsx`
- Export type: named

```ts
function ProjectExpenseTracker({ expenses, estimates, changeOrders = [] }): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectExpenseTracker } from '@/components/ProjectExpenseTracker';

<ProjectExpenseTracker {...props} />
```

### ProjectExportModal

**Import:** `@/components/ProjectExportModal`

- Defined in: `components/ProjectExportModal.tsx`
- Export type: named

```ts
function ProjectExportModal({ isOpen, onClose, filters }: ProjectExportModalProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}: ProjectFiltersProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectFilters } from '@/components/ProjectFilters';

<ProjectFilters {...props} />
```

### ProjectFinancialPendingView

**Import:** `@/components/ProjectFinancialPendingView`

- Defined in: `components/ProjectFinancialPendingView.tsx`
- Export type: named

```ts
function ProjectFinancialPendingView({ 
  project, 
  estimates, 
  onViewEstimates 
}: ProjectFinancialPendingViewProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectFinancialPendingView } from '@/components/ProjectFinancialPendingView';

<ProjectFinancialPendingView {...props} />
```

### ProjectFinancialReconciliation

**Import:** `@/components/ProjectFinancialReconciliation`

- Defined in: `components/ProjectFinancialReconciliation.tsx`
- Export type: named

```ts
function ProjectFinancialReconciliation({
  projectId
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectFinancialReconciliation } from '@/components/ProjectFinancialReconciliation';

<ProjectFinancialReconciliation {...props} />
```

### ProjectFormSimple

**Import:** `@/components/ProjectFormSimple`

- Defined in: `components/ProjectFormSimple.tsx`
- Export type: named

```ts
function ProjectFormSimple({ onSave, onCancel, disableNavigate = false }: ProjectFormSimpleProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectFormSimple } from '@/components/ProjectFormSimple';

<ProjectFormSimple {...props} />
```

### ProjectLineItemAnalysis

**Import:** `@/components/ProjectLineItemAnalysis`

- Defined in: `components/ProjectLineItemAnalysis.tsx`
- Export type: named

```ts
function ProjectLineItemAnalysis({ 
  projectId, 
  projectName 
}: ProjectLineItemAnalysisProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectLineItemAnalysis } from '@/components/ProjectLineItemAnalysis';

<ProjectLineItemAnalysis {...props} />
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
  address 
}: ProjectMediaGalleryProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function ProjectNotesTimeline({ projectId, inSheet = false }: ProjectNotesTimelineProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}: ProjectOperationalDashboardProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectOperationalDashboard } from '@/components/ProjectOperationalDashboard';

<ProjectOperationalDashboard {...props} />
```

### ProjectOverviewCompact

**Import:** `@/components/ProjectOverviewCompact`

- Defined in: `components/ProjectOverviewCompact.tsx`
- Export type: named

```ts
function ProjectOverviewCompact({
  project,
  marginData,
  estimates,
  quotes,
  expenses,
  changeOrders,
}: ProjectOverviewCompactProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectOverviewCompact } from '@/components/ProjectOverviewCompact';

<ProjectOverviewCompact {...props} />
```

### ProjectProfitMargin

**Import:** `@/components/ProjectProfitMargin`

- Defined in: `components/ProjectProfitMargin.tsx`
- Export type: named

```ts
function ProjectProfitMargin({ 
  contractAmount, 
  actualCosts, 
  projectName,
  project,
  marginData
}: ProjectProfitMarginProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectProfitMargin } from '@/components/ProjectProfitMargin';

<ProjectProfitMargin {...props} />
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
}: ProjectProfitTableProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function ProjectQuotePDFsList({ projectId }: ProjectQuotePDFsListProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function ProjectReceiptsView({ projectId }: ProjectReceiptsViewProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}: ProjectScheduleViewProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}: ProjectSelectorProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}: ProjectSelectorNewProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectSelectorNew } from '@/components/ProjectSelectorNew';

<ProjectSelectorNew {...props} />
```

### ProjectSidebar

**Import:** `@/components/ProjectSidebar`

- Defined in: `components/ProjectSidebar.tsx`
- Export type: named

```ts
function ProjectSidebar(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectSidebar } from '@/components/ProjectSidebar';

<ProjectSidebar {...props} />
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
}: ProjectsListProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
  isLoading = false 
}: ProjectsTableViewProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectsTableView } from '@/components/ProjectsTableView';

<ProjectsTableView {...props} />
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
  activeGrossMargin,
  activeGrossMarginPercent
}: ProjectStatusCardProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}: ProjectStatusSelectorProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ProjectStatusSelector } from '@/components/ProjectStatusSelector';

<ProjectStatusSelector {...props} />
```

### ProtectedLayout

**Import:** `@/components/ProtectedLayout`

- Defined in: `components/ProtectedLayout.tsx`
- Export type: default

```ts
function ProtectedLayout(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import ProtectedLayout from '@/components/ProtectedLayout';

<ProtectedLayout {...props} />
```

### ProtectedRoute

**Import:** `@/components/ProtectedRoute`

- Defined in: `components/ProtectedRoute.tsx`
- Export type: default

```ts
function ProtectedRoute({ children }: ProtectedRouteProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import ProtectedRoute from '@/components/ProtectedRoute';

<ProtectedRoute {...props} />
```

### QuickActionsCard

**Import:** `@/components/dashboard/QuickActionsCard`

- Defined in: `components/dashboard/QuickActionsCard.tsx`
- Export type: named

```ts
function QuickActionsCard(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';

<QuickActionsCard {...props} />
```

### QuickCaptionModal

**Import:** `@/components/QuickCaptionModal`

- Defined in: `components/QuickCaptionModal.tsx`
- Export type: named

```ts
function QuickCaptionModal({ photo, open, onClose, onSave }: QuickCaptionModalProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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

### QuoteAcceptanceModal

**Import:** `@/components/QuoteAcceptanceModal`

- Defined in: `components/QuoteAcceptanceModal.tsx`
- Export type: named

```ts
function QuoteAcceptanceModal({
  quote,
  estimate,
  project,
  expenses = [],
  onAccept,
  onReject,
  onClose,
}: QuoteAcceptanceModalProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuoteAcceptanceModal } from '@/components/QuoteAcceptanceModal';

<QuoteAcceptanceModal {...props} />
```

### QuoteComparison

**Import:** `@/components/QuoteComparison`

- Defined in: `components/QuoteComparison.tsx`
- Export type: named

```ts
function QuoteComparison({ quote, estimate, onBack }: QuoteComparisonProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuoteComparison } from '@/components/QuoteComparison';

<QuoteComparison {...props} />
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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}: QuoteFiltersProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function QuoteForm({ estimates, initialQuote, onSave, onCancel, mode = 'edit' }: QuoteFormProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuoteForm } from '@/components/QuoteForm';

<QuoteForm {...props} />
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
function QuotesList({ quotes, estimates, onEdit, onView, onDelete, onCompare, onExpire, onCreateNew }: QuotesListProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
  onCreateNew 
}: QuotesTableViewProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuotesTableView } from '@/components/QuotesTableView';

<QuotesTableView {...props} />
```

### QuoteStatusBadge

**Import:** `@/components/QuoteStatusBadge`

- Defined in: `components/QuoteStatusBadge.tsx`
- Export type: named

```ts
function QuoteStatusBadge({ status }: QuoteStatusBadgeProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuoteStatusBadge } from '@/components/QuoteStatusBadge';

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
}: QuoteStatusSelectorProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { QuoteStatusSelector } from '@/components/QuoteStatusSelector';

<QuoteStatusSelector {...props} />
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
}: ReassignExpenseProjectDialogProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}: ReassignReceiptDialogProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ReceiptCapture } from '@/components/time-tracker/ReceiptCapture';

<ReceiptCapture {...props} />
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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ReceiptPreviewModal } from '@/components/ReceiptPreviewModal';

<ReceiptPreviewModal {...props} />
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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function ReceiptsGallery(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function ReceiptsList(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function ReceiptsManagement(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { ReceiptsManagement } from '@/components/ReceiptsManagement';

<ReceiptsManagement {...props} />
```

### RecentlyViewedEstimates

**Import:** `@/components/RecentlyViewedEstimates`

- Defined in: `components/RecentlyViewedEstimates.tsx`
- Export type: named

```ts
function RecentlyViewedEstimates({ onViewEstimate }: RecentlyViewedEstimatesProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { RecentlyViewedEstimates } from '@/components/RecentlyViewedEstimates';

<RecentlyViewedEstimates {...props} />
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
}: RejectTimeEntryDialogProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { RejectTimeEntryDialog } from '@/components/RejectTimeEntryDialog';

<RejectTimeEntryDialog {...props} />
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
function ResetPasswordModal({ open, onOpenChange, userId, userEmail }: ResetPasswordModalProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import ResetPasswordModal from '@/components/ResetPasswordModal';

<ResetPasswordModal {...props} />
```

### RoleManagement

**Import:** `@/pages/RoleManagement`

- Defined in: `pages/RoleManagement.tsx`
- Export type: default

```ts
function RoleManagement(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function RoleProvider({ children }: { children: ReactNode }): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { RoleProvider } from '@/contexts/RoleContext';

<RoleProvider {...props} />
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
  projectName
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function ScheduleSkeleton(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function ScheduleStats({ tasks }: ScheduleStatsProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function ScheduleWarningBanner({ warnings, onDismiss, onAdjust }: ScheduleWarningBannerProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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

### Skeleton

**Import:** `@/components/ui/skeleton`

- Defined in: `components/ui/skeleton.tsx`
- Export type: named

```ts
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { Skeleton } from '@/components/ui/skeleton';

<Skeleton {...props} />
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
}: SyncStatusBadgeProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function SyncStatusBanner(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function TaskEditPanel({ task, allTasks, onClose, onSave }: TaskEditPanelProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}: TaskReorderPanelProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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

### TimeEntries

**Import:** `@/pages/TimeEntries`

- Defined in: `pages/TimeEntries.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import TimeEntries from '@/pages/TimeEntries';

<TimeEntries {...props} />
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
}: TimeEntryBulkActionsProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
}: TimeEntryDialogProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TimeEntryDialog } from '@/components/time-tracker/TimeEntryDialog';

<TimeEntryDialog {...props} />
```

### TimeEntryForm

**Import:** `@/components/time-tracker/TimeEntryForm`

- Defined in: `components/time-tracker/TimeEntryForm.tsx`
- Export type: named

```ts
function TimeEntryForm({
  workerId,
  setWorkerId,
  projectId,
  setProjectId,
  date,
  setDate,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  hours,
  setHours,
  receiptUrl,
  onCaptureReceipt,
  onRemoveReceipt,
  disabled = false,
  showReceipt = false,
  isMobile = false,
  showRates = true,
}: TimeEntryFormProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TimeEntryForm } from '@/components/time-tracker/TimeEntryForm';

<TimeEntryForm {...props} />
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
}): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function TimelineStoryView({ media, onMediaClick }: TimelineStoryViewProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { TimelineStoryView } from '@/components/TimelineStoryView';

<TimelineStoryView {...props} />
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
}: TimesheetGridCellProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function TimesheetGridView({ open, onClose, onSuccess, preselectedProjectId }: TimesheetGridViewProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function TimesheetSummary({ entries, validationErrors }: TimesheetSummaryProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function TimesheetWeekSelector({ startDate, endDate, onChange }: TimesheetWeekSelectorProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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

### Toaster

**Import:** `@/components/ui/toaster`

- Defined in: `components/ui/toaster.tsx`
- Export type: named

```ts
function Toaster(): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { Toaster } from '@/components/ui/toaster';

<Toaster {...props} />
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

### VarianceAnalysis

**Import:** `@/components/VarianceAnalysis`

- Defined in: `components/VarianceAnalysis.tsx`
- Export type: named

```ts
function VarianceAnalysis({ projectId }: VarianceAnalysisProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { VarianceAnalysis } from '@/components/VarianceAnalysis';

<VarianceAnalysis {...props} />
```

### VarianceBadge

**Import:** `@/components/ui/variance-badge`

- Defined in: `components/ui/variance-badge.tsx`
- Export type: named

```ts
function VarianceBadge({ variance, percentage, type, className }: VarianceBadgeProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function VersionEvolutionChart({ data }): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function VideoLightbox({ video, allVideos, onClose, onNavigate }: VideoLightboxProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
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
function VoiceCaptionModal({ open, onClose, onCaptionReady, imageUrl }: VoiceCaptionModalProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { VoiceCaptionModal } from '@/components/VoiceCaptionModal';

<VoiceCaptionModal {...props} />
```

### WeekView

**Import:** `@/components/time-tracker/WeekView`

- Defined in: `components/time-tracker/WeekView.tsx`
- Export type: named

```ts
function WeekView({ onEditEntry, onCreateEntry }: WeekViewProps): import("/workspace/node_modules/@types/react/jsx-runtime").JSX.Element
```

_No inline documentation provided._

**Example**

```tsx
import { WeekView } from '@/components/time-tracker/WeekView';

<WeekView {...props} />
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

### WorkOrdersList

**Import:** `@/components/WorkOrdersList`

- Defined in: `components/WorkOrdersList.tsx`
- Export type: default

_No inline documentation provided._

**Example**

```tsx
import WorkOrdersList from '@/components/WorkOrdersList';

<WorkOrdersList {...props} />
```

## Hooks

Total: 28

### reducer

**Import:** `@/hooks/use-toast`

- Defined in: `hooks/use-toast.ts`
- Export type: named

```ts
function reducer(state: State, action: Action): State
```

_No inline documentation provided._

**Example**

```ts
import { reducer } from '@/hooks/use-toast';

const result = reducer(/* params */);
```

### toast

**Import:** `@/hooks/use-toast`

- Defined in: `hooks/use-toast.ts`
- Export type: named

```ts
function toast({ ...props }: Toast): { id: string; dismiss: () => void; update: (props: ToasterToast) => void; }
```

_No inline documentation provided._

**Example**

```ts
import { toast } from '@/hooks/use-toast';

const result = toast(/* params */);
```

### useAICaptionEnhancement

**Import:** `@/hooks/useAICaptionEnhancement`

- Defined in: `hooks/useAICaptionEnhancement.ts`
- Export type: named

```ts
function useAICaptionEnhancement(): { enhance: (imageUrl: string, originalCaption: string, options: import("/workspace/src/hooks/useAICaptionEnhancement").EnhancementOptions) => Promise<import("/workspace/src/hooks/useAICaptionEnhancement").EnhancementResult>; isEnhancing: boolean; error: string; reset: () => void; }
```

_No inline documentation provided._

**Example**

```ts
import { useAICaptionEnhancement } from '@/hooks/useAICaptionEnhancement';

const result = useAICaptionEnhancement(/* params */);
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

### useGanttChart

**Import:** `@/components/schedule/hooks/useGanttChart`

- Defined in: `components/schedule/hooks/useGanttChart.ts`
- Export type: named

```ts
function useGanttChart({
  tasks,
  viewMode,
  onTaskClick,
  onDateChange
}: UseGanttChartProps): { containerRef: React.MutableRefObject<HTMLDivElement>; ganttRef: React.MutableRefObject<import("frappe-gantt").default>; isInitializing: boolean; refreshTasks: () => void; changeViewMode: (mode: "Day" | "Week" | "Month") => void; }
```

Manage Gantt chart initialization and lifecycle with proper cleanup

**Example**

```ts
import { useGanttChart } from '@/components/schedule/hooks/useGanttChart';

const result = useGanttChart(/* params */);
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

### useScheduleTableColumns

**Import:** `@/hooks/useScheduleTableColumns`

- Defined in: `hooks/useScheduleTableColumns.ts`
- Export type: named

```ts
function useScheduleTableColumns(projectId: string): { columnDefinitions: import("/workspace/src/hooks/useScheduleTableColumns").ScheduleColumnConfig[]; visibleColumns: string[]; setVisibleColumns: React.Dispatch<React.SetStateAction<string[]>>; }
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
}: UseScheduleTasksProps): { tasks: import("/workspace/src/types/schedule").ScheduleTask[]; isLoading: boolean; error: Error; loadTasks: () => Promise<void>; updateTask: (updatedTask: import("/workspace/src/types/schedule").ScheduleTask) => Promise<import("/workspace/src/types/schedule").ScheduleTask>; updateTaskDates: (taskId: string, start: Date, end: Date) => Promise<void>; refreshProgress: () => Promise<void>; }
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
function useScheduleWarnings(tasks: ScheduleTask[], settings: ScheduleSettings): { warnings: import("/workspace/src/types/schedule").ScheduleWarning[]; dismissWarning: (warningId: string) => void; clearDismissed: () => void; getTaskWarnings: (taskId: string) => import("/workspace/src/types/schedule").ScheduleWarning[]; warningCounts: { error: number; warning: number; info: number; total: number; }; }
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
function useTimeEntries(filters: TimeEntryFilters, pageSize: number = 25, currentPage: number = 1): { entries: import("/workspace/src/types/timeEntry").TimeEntryListItem[]; statistics: import("/workspace/src/types/timeEntry").TimeEntryStatistics; loading: boolean; totalCount: number; refetch: () => Promise<void>; }
```

_No inline documentation provided._

**Example**

```ts
import { useTimeEntries } from '@/hooks/useTimeEntries';

const result = useTimeEntries(/* params */);
```

### useToast

**Import:** `@/hooks/use-toast`

- Defined in: `hooks/use-toast.ts`
- Export type: named

```ts
function useToast(): { toast: typeof import("/workspace/src/hooks/use-toast").toast; dismiss: (toastId?: string) => void; toasts: ToasterToast[]; }
```

_No inline documentation provided._

**Example**

```ts
import { useToast } from '@/hooks/use-toast';

const result = useToast(/* params */);
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

Total: 194

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
function batchFuzzyMatchPayees(qbNames: string[], payees: PartialPayee[]): import("/workspace/src/utils/fuzzyPayeeMatcher").FuzzyMatchResult[]
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

### calculateBudgetStatus

**Import:** `@/utils/projectDashboard`

- Defined in: `utils/projectDashboard.ts`
- Export type: named

```ts
function calculateBudgetStatus(contracted: number | null | undefined, expenses: Expense[], adjustedEstCosts?: number | null): import("/workspace/src/utils/projectDashboard").BudgetStatus
```

_No inline documentation provided._

**Example**

```ts
import { calculateBudgetStatus } from '@/utils/projectDashboard';

const result = calculateBudgetStatus(/* args */);
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
function calculateEstimateFinancials(lineItems: LineItem[]): import("/workspace/src/utils/estimateFinancials").EstimateFinancialMetrics
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

### calculateMultipleProjectFinancials

**Import:** `@/utils/projectFinancials`

- Defined in: `utils/projectFinancials.ts`
- Export type: named

```ts
function calculateMultipleProjectFinancials(projects: Project[], estimates: Estimate[], expenses: Expense[]): Promise<import("/workspace/src/utils/projectFinancials").ProjectWithFinancials[]>
```

Calculate financial data for multiple projects efficiently

**Example**

```ts
import { calculateMultipleProjectFinancials } from '@/utils/projectFinancials';

const result = calculateMultipleProjectFinancials(/* args */);
```

### calculateProfitAnalytics

**Import:** `@/utils/profitCalculations`

- Defined in: `utils/profitCalculations.ts`
- Export type: named

```ts
function calculateProfitAnalytics(estimates: Estimate[], quotes: Quote[], expenses: Expense[], projects?: Project[]): import("/workspace/src/types/profit").ProfitAnalyticsSummary
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
function calculateProfitTrends(projectProfits: ProjectProfitData[]): import("/workspace/src/types/profit").ProfitTrend[]
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

### calculateProjectFinancials

**Import:** `@/utils/projectFinancials`

- Defined in: `utils/projectFinancials.ts`
- Export type: named

```ts
function calculateProjectFinancials(project: Project, estimates: Estimate[], expenses: Expense[]): Promise<import("/workspace/src/utils/projectFinancials").ProjectWithFinancials>
```

Calculate financial data for a project based on estimates and expenses

**Example**

```ts
import { calculateProjectFinancials } from '@/utils/projectFinancials';

const result = calculateProjectFinancials(/* args */);
```

### calculateProjectMargin

**Import:** `@/types/margin`

- Defined in: `types/margin.ts`
- Export type: named

```ts
function calculateProjectMargin(project: Project, expenses: Expense[] = [], estimates: Estimate[] = []): import("/workspace/src/types/margin").ProjectMargin
```

_No inline documentation provided._

**Example**

```ts
import { calculateProjectMargin } from '@/types/margin';

const result = calculateProjectMargin(/* args */);
```

### calculateProjectProfit

**Import:** `@/utils/profitCalculations`

- Defined in: `utils/profitCalculations.ts`
- Export type: named

```ts
function calculateProjectProfit(estimate: Estimate, quotes: Quote[], expenses: Expense[], storedProjectData?: {
    contracted_amount?: number | null;
    current_margin?: number | null;
    margin_percentage?: number | null;
    total_accepted_quotes?: number | null;
  }): import("/workspace/src/types/profit").ProjectProfitData
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
    current_margin?: number | null;
    margin_percentage?: number | null;
    total_accepted_quotes?: number | null;
  }): Promise<import("/workspace/src/types/profit").ProjectProfitData>
```

Async version of calculateProjectProfit that correctly handles split expenses
Use this version when you need accurate expense calculations

**Example**

```ts
import { calculateProjectProfitAsync } from '@/utils/profitCalculations';

const result = calculateProjectProfitAsync(/* args */);
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
function calculateQuoteFinancials(lineItems: QuoteLineItem[]): import("/workspace/src/utils/quoteFinancials").QuoteFinancialMetrics
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
function calculateScheduleStatus(startDate?: Date | string | null, endDate?: Date | string | null): import("/workspace/src/utils/projectDashboard").ScheduleStatus
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

### canCorrelateExpense

**Import:** `@/utils/expenseValidation`

- Defined in: `utils/expenseValidation.ts`
- Export type: named

```ts
function canCorrelateExpense(expense: Pick<Expense, 'is_split' | 'project_id'>): { isValid: boolean; error?: string; }
```

Validates whether an expense can be directly correlated to line items
Split parent expenses (with is_split=true or project_id=SYS-000) cannot be correlated
Only individual split records or regular expenses can be correlated

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
function checkTimeOverlap(payeeId: string, date: string, startTime: Date, endTime: Date, excludeId?: string): Promise<import("/workspace/src/utils/timeEntryValidation").OverlapCheckResult>
```

_No inline documentation provided._

**Example**

```ts
import { checkTimeOverlap } from '@/utils/timeEntryValidation';

const result = checkTimeOverlap(/* args */);
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
function compareQuoteToEstimate(quoteLineItems: QuoteLineItem[], estimateLineItems: LineItem[]): { [category: string]: import("/workspace/src/utils/quoteFinancials").CategoryCostComparison; }
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

### detectClientType

**Import:** `@/utils/clientCsvParser`

- Defined in: `utils/clientCsvParser.ts`
- Export type: named

```ts
function detectClientType(clientName: string, contactPerson?: string): import("/workspace/src/types/client").ClientType
```

_No inline documentation provided._

**Example**

```ts
import { detectClientType } from '@/utils/clientCsvParser';

const result = detectClientType(/* args */);
```

### detectCodeQualityIssues

**Import:** `@/utils/codeCleanup`

- Defined in: `utils/codeCleanup.ts`
- Export type: named

```ts
function detectCodeQualityIssues(filePath: string): CodeQualityIssue[]
```

Scans for common code quality issues

**Example**

```ts
import { detectCodeQualityIssues } from '@/utils/codeCleanup';

const result = detectCodeQualityIssues(/* args */);
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

### detectUnusedImports

**Import:** `@/utils/codeCleanup`

- Defined in: `utils/codeCleanup.ts`
- Export type: named

```ts
function detectUnusedImports(filePath: string): string[]
```

Scans a TypeScript/React file for unused imports

**Example**

```ts
import { detectUnusedImports } from '@/utils/codeCleanup';

const result = detectUnusedImports(/* args */);
```

### disableScheduleFeatures

**Import:** `@/lib/featureFlags`

- Defined in: `lib/featureFlags.ts`
- Export type: named

```ts
function disableScheduleFeatures(): void
```

_No inline documentation provided._

**Example**

```ts
import { disableScheduleFeatures } from '@/lib/featureFlags';

const result = disableScheduleFeatures(/* args */);
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

### enableScheduleFeatures

**Import:** `@/lib/featureFlags`

- Defined in: `lib/featureFlags.ts`
- Export type: named

```ts
function enableScheduleFeatures(): void
```

_No inline documentation provided._

**Example**

```ts
import { enableScheduleFeatures } from '@/lib/featureFlags';

const result = enableScheduleFeatures(/* args */);
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

### formatMarginCurrency

**Import:** `@/types/margin`

- Defined in: `types/margin.ts`
- Export type: named

```ts
function formatMarginCurrency(amount: number): string
```

_No inline documentation provided._

**Example**

```ts
import { formatMarginCurrency } from '@/types/margin';

const result = formatMarginCurrency(/* args */);
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

### fuzzyMatchPayee

**Import:** `@/utils/fuzzyPayeeMatcher`

- Defined in: `utils/fuzzyPayeeMatcher.ts`
- Export type: named

```ts
function fuzzyMatchPayee(qbName: string, payees: PartialPayee[]): import("/workspace/src/utils/fuzzyPayeeMatcher").FuzzyMatchResult
```

_No inline documentation provided._

**Example**

```ts
import { fuzzyMatchPayee } from '@/utils/fuzzyPayeeMatcher';

const result = fuzzyMatchPayee(/* args */);
```

### generateCodeQualityReport

**Import:** `@/utils/codeCleanup`

- Defined in: `utils/codeCleanup.ts`
- Export type: named

```ts
function generateCodeQualityReport(projectRoot: string): { scannedFiles: number; unusedImports: UnusedImportResult[]; codeQualityIssues: CodeQualityIssue[]; summary: { totalUnusedImports: number; totalIssues: number; todoCount: number; fixmeCount: number; incompleteCodeCount: number; }; }
```

Generates a comprehensive code quality report

**Example**

```ts
import { generateCodeQualityReport } from '@/utils/codeCleanup';

const result = generateCodeQualityReport(/* args */);
```

### generateMediaReportHTML

**Import:** `@/utils/htmlReportTemplate`

- Defined in: `utils/htmlReportTemplate.ts`
- Export type: named

```ts
function generateMediaReportHTML(options: GenerateHTMLReportOptions): Promise<string>
```

_No inline documentation provided._

**Example**

```ts
import { generateMediaReportHTML } from '@/utils/htmlReportTemplate';

const result = generateMediaReportHTML(/* args */);
```

### generateMediaReportPDF

**Import:** `@/utils/mediaReportPdfGenerator`

- Defined in: `utils/mediaReportPdfGenerator.ts`
- Export type: named

```ts
function generateMediaReportPDF(options: MediaReportOptions): Promise<import("/workspace/src/utils/mediaReportPdfGenerator").PDFGenerationResult>
```

Generate PDF report for project media

**Example**

```ts
import { generateMediaReportPDF } from '@/utils/mediaReportPdfGenerator';

const result = generateMediaReportPDF(/* args */);
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

### getCaptionPreferences

**Import:** `@/utils/userPreferences`

- Defined in: `utils/userPreferences.ts`
- Export type: named

```ts
function getCaptionPreferences(): Promise<import("/workspace/src/utils/userPreferences").CaptionPreferences>
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

### getCompanyBranding

**Import:** `@/utils/companyBranding`

- Defined in: `utils/companyBranding.ts`
- Export type: named

```ts
function getCompanyBranding(): Promise<import("/workspace/src/utils/companyBranding").CompanyBranding>
```

_No inline documentation provided._

**Example**

```ts
import { getCompanyBranding } from '@/utils/companyBranding';

const result = getCompanyBranding(/* args */);
```

### getContingencyUtilization

**Import:** `@/types/margin`

- Defined in: `types/margin.ts`
- Export type: named

```ts
function getContingencyUtilization(margin: ProjectMargin): number
```

_No inline documentation provided._

**Example**

```ts
import { getContingencyUtilization } from '@/types/margin';

const result = getContingencyUtilization(/* args */);
```

### getCostVarianceStatus

**Import:** `@/utils/quoteFinancials`

- Defined in: `utils/quoteFinancials.ts`
- Export type: named

```ts
function getCostVarianceStatus(variancePercent: number): "critical" | "excellent" | "good" | "poor"
```

_No inline documentation provided._

**Example**

```ts
import { getCostVarianceStatus } from '@/utils/quoteFinancials';

const result = getCostVarianceStatus(/* args */);
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
function getExpenseSplits(expenseId: string): Promise<import("/workspace/src/types/expense").ExpenseSplit[]>
```

Get all splits for an expense with project details

**Example**

```ts
import { getExpenseSplits } from '@/utils/expenseSplits';

const result = getExpenseSplits(/* args */);
```

### getExpiringQuotes

**Import:** `@/utils/projectDashboard`

- Defined in: `utils/projectDashboard.ts`
- Export type: named

```ts
function getExpiringQuotes(quotes: Quote[], daysAhead: number = 7): import("/workspace/src/types/quote").Quote[]
```

_No inline documentation provided._

**Example**

```ts
import { getExpiringQuotes } from '@/utils/projectDashboard';

const result = getExpiringQuotes(/* args */);
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

### getMarginEfficiency

**Import:** `@/types/margin`

- Defined in: `types/margin.ts`
- Export type: named

```ts
function getMarginEfficiency(margin: ProjectMargin): number
```

_No inline documentation provided._

**Example**

```ts
import { getMarginEfficiency } from '@/types/margin';

const result = getMarginEfficiency(/* args */);
```

### getMarginPerformanceStatus

**Import:** `@/utils/estimateFinancials`

- Defined in: `utils/estimateFinancials.ts`
- Export type: named

```ts
function getMarginPerformanceStatus(marginPercent: number): "critical" | "excellent" | "good" | "poor" | "loss"
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
function getMarginPerformanceStatus(marginPercent: number): "critical" | "excellent" | "good" | "poor"
```

_No inline documentation provided._

**Example**

```ts
import { getMarginPerformanceStatus } from '@/utils/quoteFinancials';

const result = getMarginPerformanceStatus(/* args */);
```

### getMarginStatusLevel

**Import:** `@/types/margin`

- Defined in: `types/margin.ts`
- Export type: named

```ts
function getMarginStatusLevel(margin: ProjectMargin): "critical" | "at_risk" | "on_target" | "excellent"
```

_No inline documentation provided._

**Example**

```ts
import { getMarginStatusLevel } from '@/types/margin';

const result = getMarginStatusLevel(/* args */);
```

### getMarginThresholdStatus

**Import:** `@/utils/thresholdUtils`

- Defined in: `utils/thresholdUtils.ts`
- Export type: named

```ts
function getMarginThresholdStatus(currentMargin: number | null | undefined, minimumThreshold: number = 10.0, targetMargin: number = 20.0): import("/workspace/src/types/project").MarginThresholdStatus
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
function getMarkupPerformanceStatus(markupPercent: number): "critical" | "excellent" | "good" | "poor" | "loss"
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
  }): Promise<{ data: import("/workspace/src/types/project").ProjectMedia[]; error: Error; }>
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

### getQBAccountMappings

**Import:** `@/utils/quickbooksMapping`

- Defined in: `utils/quickbooksMapping.ts`
- Export type: named

```ts
function getQBAccountMappings(): Record<string, import("/workspace/src/types/expense").ExpenseCategory>
```

_No inline documentation provided._

**Example**

```ts
import { getQBAccountMappings } from '@/utils/quickbooksMapping';

const result = getQBAccountMappings(/* args */);
```

### getQueue

**Import:** `@/utils/syncQueue`

- Defined in: `utils/syncQueue.ts`
- Export type: named

```ts
function getQueue(): Promise<import("/workspace/src/utils/syncQueue").QueuedOperation[]>
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
function getQuickBooksColumnMapping(headers: string[]): import("/workspace/src/utils/clientCsvParser").ClientColumnMapping
```

_No inline documentation provided._

**Example**

```ts
import { getQuickBooksColumnMapping } from '@/utils/clientCsvParser';

const result = getQuickBooksColumnMapping(/* args */);
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
function getRecommendedUnits(category: string): import("/workspace/src/utils/units").UnitDefinition[]
```

_No inline documentation provided._

**Example**

```ts
import { getRecommendedUnits } from '@/utils/units';

const result = getRecommendedUnits(/* args */);
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
function getTopProfitableProjects(projectProfits: ProjectProfitData[], limit: number = 5): import("/workspace/src/types/profit").ProjectProfitData[]
```

_No inline documentation provided._

**Example**

```ts
import { getTopProfitableProjects } from '@/utils/profitCalculations';

const result = getTopProfitableProjects(/* args */);
```

### getUnitByCode

**Import:** `@/utils/units`

- Defined in: `utils/units.ts`
- Export type: named

```ts
function getUnitByCode(code: string): import("/workspace/src/utils/units").UnitDefinition
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
function getUnitsByCategory(category: UnitCategory): import("/workspace/src/utils/units").UnitDefinition[]
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

### getWorstPerformingProjects

**Import:** `@/utils/profitCalculations`

- Defined in: `utils/profitCalculations.ts`
- Export type: named

```ts
function getWorstPerformingProjects(projectProfits: ProjectProfitData[], limit: number = 5): import("/workspace/src/types/profit").ProjectProfitData[]
```

_No inline documentation provided._

**Example**

```ts
import { getWorstPerformingProjects } from '@/utils/profitCalculations';

const result = getWorstPerformingProjects(/* args */);
```

### hasQBAccountMapping

**Import:** `@/utils/quickbooksMapping`

- Defined in: `utils/quickbooksMapping.ts`
- Export type: named

```ts
function hasQBAccountMapping(accountPath: string): boolean
```

_No inline documentation provided._

**Example**

```ts
import { hasQBAccountMapping } from '@/utils/quickbooksMapping';

const result = hasQBAccountMapping(/* args */);
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

### isMarginAtRisk

**Import:** `@/types/margin`

- Defined in: `types/margin.ts`
- Export type: named

```ts
function isMarginAtRisk(margin: ProjectMargin): boolean
```

_No inline documentation provided._

**Example**

```ts
import { isMarginAtRisk } from '@/types/margin';

const result = isMarginAtRisk(/* args */);
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

### mapCSVToClients

**Import:** `@/utils/clientCsvParser`

- Defined in: `utils/clientCsvParser.ts`
- Export type: named

```ts
function mapCSVToClients(data: ClientCSVRow[], mapping: ClientColumnMapping, fileName: string): import("/workspace/src/utils/clientCsvParser").ClientImportData[]
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
function mapCSVToExpenses(data: CSVRow[], mapping: ColumnMapping, projectId: string, fileName: string): import("/workspace/src/types/expense").Expense[]
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
function mapCSVToExpenses(data: ExpenseCSVRow[], mapping: ExpenseColumnMapping, fallbackProjectId: string, payeeMap: Map<string, string> = new Map(), projectMap: Map<string, string> = new Map()): import("/workspace/src/utils/expenseCsvParser").ExpenseImportData[]
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
function mapCSVToPayees(data: PayeeCSVRow[], mapping: PayeeColumnMapping, fileName: string): import("/workspace/src/utils/payeeCsvParser").PayeeImportData[]
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
function mapDbToLineItem(dbItem: any): import("/workspace/src/types/estimate").LineItem
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
function mapLineItemToDb(item: LineItem): { id: string; category: import("/workspace/src/types/estimate").LineItemCategory; description: string; quantity: number; rate: number; total: number; unit: string; sort_order: number; cost_per_unit: number; markup_percent: number; markup_amount: number; price_per_unit: number; total_cost: number; total_markup: number; }
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
function mapQuickBooksToExpenses(transactions: QBTransaction[], fileName: string): Promise<import("/workspace/src/utils/csvParser").QBImportResult>
```

_No inline documentation provided._

**Example**

```ts
import { mapQuickBooksToExpenses } from '@/utils/csvParser';

const result = mapQuickBooksToExpenses(/* args */);
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
function markPayeeAsSynced(payeeId: string): Promise<{ error: import("/workspace/node_modules/@supabase/postgrest-js/dist/cjs/PostgrestError").default; }>
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
function markProjectAsSynced(projectId: string): Promise<{ error: import("/workspace/node_modules/@supabase/postgrest-js/dist/cjs/PostgrestError").default; }>
```

_No inline documentation provided._

**Example**

```ts
import { markProjectAsSynced } from '@/utils/syncUtils';

const result = markProjectAsSynced(/* args */);
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
function parseClientCSVFile(file: File): Promise<import("/workspace/src/utils/clientCsvParser").ParsedClientCSV>
```

_No inline documentation provided._

**Example**

```ts
import { parseClientCSVFile } from '@/utils/clientCsvParser';

const result = parseClientCSVFile(/* args */);
```

### parseCSVFile

**Import:** `@/utils/csvParser`

- Defined in: `utils/csvParser.ts`
- Export type: named

```ts
function parseCSVFile(file: File): Promise<import("/workspace/src/utils/csvParser").ParseResult>
```

_No inline documentation provided._

**Example**

```ts
import { parseCSVFile } from '@/utils/csvParser';

const result = parseCSVFile(/* args */);
```

### parseEnhancedQuickBooksCSV

**Import:** `@/utils/enhancedCsvParser`

- Defined in: `utils/enhancedCsvParser.ts`
- Export type: named

```ts
function parseEnhancedQuickBooksCSV(file: File): Promise<{ data: import("/workspace/src/utils/enhancedCsvParser").QBTransaction[]; errors: string[]; headers: string[]; }>
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
function parseExpenseCSVFile(file: File): Promise<import("/workspace/src/utils/expenseCsvParser").ParsedExpenseCSV>
```

_No inline documentation provided._

**Example**

```ts
import { parseExpenseCSVFile } from '@/utils/expenseCsvParser';

const result = parseExpenseCSVFile(/* args */);
```

### parsePayeeCSVFile

**Import:** `@/utils/payeeCsvParser`

- Defined in: `utils/payeeCsvParser.ts`
- Export type: named

```ts
function parsePayeeCSVFile(file: File): Promise<import("/workspace/src/utils/payeeCsvParser").ParsedPayeeCSV>
```

_No inline documentation provided._

**Example**

```ts
import { parsePayeeCSVFile } from '@/utils/payeeCsvParser';

const result = parsePayeeCSVFile(/* args */);
```

### parseQuickBooksCSV

**Import:** `@/utils/csvParser`

- Defined in: `utils/csvParser.ts`
- Export type: named

```ts
function parseQuickBooksCSV(file: File): Promise<import("/workspace/src/utils/csvParser").QBParseResult>
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
function parseTransactionCSV(file: File): Promise<import("/workspace/src/utils/enhancedTransactionImporter").ParsedTransactionData>
```

_No inline documentation provided._

**Example**

```ts
import { parseTransactionCSV } from '@/utils/enhancedTransactionImporter';

const result = parseTransactionCSV(/* args */);
```

### processEnhancedQuickBooksImport

**Import:** `@/utils/enhancedCsvParser`

- Defined in: `utils/enhancedCsvParser.ts`
- Export type: named

```ts
function processEnhancedQuickBooksImport(transactions: QBTransaction[], fileName: string): Promise<import("/workspace/src/utils/enhancedCsvParser").EnhancedQBImportResult>
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
function processTransactionImport(data: TransactionCSVRow[]): Promise<import("/workspace/src/utils/enhancedTransactionImporter").TransactionImportResult>
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

### removeUnusedImports

**Import:** `@/utils/codeCleanup`

- Defined in: `utils/codeCleanup.ts`
- Export type: named

```ts
function removeUnusedImports(filePath: string): boolean
```

Removes unused imports from a file

**Example**

```ts
import { removeUnusedImports } from '@/utils/codeCleanup';

const result = removeUnusedImports(/* args */);
```

### resetPayeeSyncStatus

**Import:** `@/utils/syncUtils`

- Defined in: `utils/syncUtils.ts`
- Export type: named

```ts
function resetPayeeSyncStatus(payeeId: string): Promise<{ error: import("/workspace/node_modules/@supabase/postgrest-js/dist/cjs/PostgrestError").default; }>
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
function resetProjectSyncStatus(projectId: string): Promise<{ error: import("/workspace/node_modules/@supabase/postgrest-js/dist/cjs/PostgrestError").default; }>
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

### resolveQBAccountCategory

**Import:** `@/utils/quickbooksMapping`

- Defined in: `utils/quickbooksMapping.ts`
- Export type: named

```ts
function resolveQBAccountCategory(accountPath: string): import("/workspace/src/types/expense").ExpenseCategory
```

_No inline documentation provided._

**Example**

```ts
import { resolveQBAccountCategory } from '@/utils/quickbooksMapping';

const result = resolveQBAccountCategory(/* args */);
```

### scanDirectory

**Import:** `@/utils/codeCleanup`

- Defined in: `utils/codeCleanup.ts`
- Export type: named

```ts
function scanDirectory(dirPath: string, extensions: string[] = ['.ts', '.tsx']): string[]
```

Recursively scans a directory for TypeScript/React files

**Example**

```ts
import { scanDirectory } from '@/utils/codeCleanup';

const result = scanDirectory(/* args */);
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
  }): Promise<{ data: import("/workspace/src/types/project").ProjectMedia; error: Error; }>
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
function uploadProjectMedia(params: UploadProjectMediaParams): Promise<import("/workspace/src/utils/projectMedia").UploadProjectMediaResult>
```

Upload media file to project-media bucket and create database record

**Example**

```ts
import { uploadProjectMedia } from '@/utils/projectMedia';

const result = uploadProjectMedia(/* args */);
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
function validateExpensesForCorrelation<T extends Pick<Expense, 'is_split' | 'project_id'>>(expenses: T[]): { valid: T[]; invalid: { expense: T; reason: string; }[]; }
```

Validates a batch of expenses for correlation
Returns list of invalid expenses with reasons

**Example**

```ts
import { validateExpensesForCorrelation } from '@/utils/expenseValidation';

const result = validateExpensesForCorrelation(/* args */);
```

### validateMediaFile

**Import:** `@/utils/mediaMetadata`

- Defined in: `utils/mediaMetadata.ts`
- Export type: named

```ts
function validateMediaFile(file: File): import("/workspace/src/utils/mediaMetadata").ValidationResult
```

Validate media file type and size

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
function validateMediaItems(items: ProjectMedia[]): { valid: import("/workspace/src/types/project").ProjectMedia[]; invalid: import("/workspace/src/types/project").ProjectMedia[]; }
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
    projected_margin?: number | null;
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

Total: 120

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

### BudgetStatus

**Import:** `@/utils/projectDashboard`

- Defined in: `utils/projectDashboard.ts`
- Export type: named

```ts
interface BudgetStatus
```

_No inline documentation provided._

**Example**

```ts
import type { BudgetStatus } from '@/utils/projectDashboard';

type Example = BudgetStatus;
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

### CreateAccountMappingData

**Import:** `@/types/quickbooks`

- Defined in: `types/quickbooks.ts`
- Export type: named

```ts
interface CreateAccountMappingData
```

_No inline documentation provided._

**Example**

```ts
import type { CreateAccountMappingData } from '@/types/quickbooks';

type Example = CreateAccountMappingData;
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

_No inline documentation provided._

**Example**

```ts
import type { CreateProjectRevenueData } from '@/types/revenue';

type Example = CreateProjectRevenueData;
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

### MediaComment

**Import:** `@/utils/mediaReportPdfGenerator`

- Defined in: `utils/mediaReportPdfGenerator.ts`
- Export type: named

```ts
interface MediaComment
```

_No inline documentation provided._

**Example**

```ts
import type { MediaComment } from '@/utils/mediaReportPdfGenerator';

type Example = MediaComment;
```

### MediaReportOptions

**Import:** `@/utils/mediaReportPdfGenerator`

- Defined in: `utils/mediaReportPdfGenerator.ts`
- Export type: named

```ts
interface MediaReportOptions
```

_No inline documentation provided._

**Example**

```ts
import type { MediaReportOptions } from '@/utils/mediaReportPdfGenerator';

type Example = MediaReportOptions;
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

### PDFGenerationResult

**Import:** `@/utils/mediaReportPdfGenerator`

- Defined in: `utils/mediaReportPdfGenerator.ts`
- Export type: named

```ts
interface PDFGenerationResult
```

_No inline documentation provided._

**Example**

```ts
import type { PDFGenerationResult } from '@/utils/mediaReportPdfGenerator';

type Example = PDFGenerationResult;
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

### ProjectMargin

**Import:** `@/types/margin`

- Defined in: `types/margin.ts`
- Export type: named

```ts
interface ProjectMargin
```

_No inline documentation provided._

**Example**

```ts
import type { ProjectMargin } from '@/types/margin';

type Example = ProjectMargin;
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

_No inline documentation provided._

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

**Import:** `@/utils/projectFinancials`

- Defined in: `utils/projectFinancials.ts`
- Export type: named

```ts
interface ProjectWithFinancials
```

_No inline documentation provided._

**Example**

```ts
import type { ProjectWithFinancials } from '@/utils/projectFinancials';

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

### UpdateAccountMappingData

**Import:** `@/types/quickbooks`

- Defined in: `types/quickbooks.ts`
- Export type: named

```ts
interface UpdateAccountMappingData
```

_No inline documentation provided._

**Example**

```ts
import type { UpdateAccountMappingData } from '@/types/quickbooks';

type Example = UpdateAccountMappingData;
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

## Types

Total: 27

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
type ChangeOrderStatus = 'pending' | 'approved' | 'rejected'
```

_No inline documentation provided._

**Example**

```ts
import type { ChangeOrderStatus } from '@/components/ChangeOrderStatusBadge';

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
            referencedRelation: "project_financial_summary"
            referencedColumns: ["project_id"]
          },
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
      change_order_line_items: {
        Row: {
          category: Database["public"]["Enums"]["expense_category"]
          change_order_id: string
          cost_per_unit: number | null
          created_at: string | null
          dependencies: Json | null
          description: string
          duration_days: number | null
          id: string
          is_milestone: boolean | null
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
          category: Database["public"]["Enums"]["expense_category"]
          change_order_id: string
          cost_per_unit?: number | null
          created_at?: string | null
          dependencies?: Json | null
          description: string
          duration_days?: number | null
          id?: string
          is_milestone?: boolean | null
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
          category?: Database["public"]["Enums"]["expense_category"]
          change_order_id?: string
          cost_per_unit?: number | null
          created_at?: string | null
          dependencies?: Json | null
          description?: string
          duration_days?: number | null
          id?: string
          is_milestone?: boolean | null
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
            referencedRelation: "project_financial_summary"
            referencedColumns: ["project_id"]
          },
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
      estimate_line_items: {
        Row: {
          category: Database["public"]["Enums"]["expense_category"]
          cost_per_unit: number | null
          created_at: string | null
          dependencies: Json | null
          description: string
          duration_days: number | null
          estimate_id: string
          id: string
          is_milestone: boolean | null
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
          category: Database["public"]["Enums"]["expense_category"]
          cost_per_unit?: number | null
          created_at?: string | null
          dependencies?: Json | null
          description: string
          duration_days?: number | null
          estimate_id: string
          id?: string
          is_milestone?: boolean | null
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
          category?: Database["public"]["Enums"]["expense_category"]
          cost_per_unit?: number | null
          created_at?: string | null
          dependencies?: Json | null
          description?: string
          duration_days?: number | null
          estimate_id?: string
          id?: string
          is_milestone?: boolean | null
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
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_line_items_backup_20251030: {
        Row: {
          category: Database["public"]["Enums"]["expense_category"] | null
          cost_per_unit: number | null
          created_at: string | null
          description: string | null
          estimate_id: string | null
          id: string | null
          markup_amount: number | null
          markup_percent: number | null
          price_per_unit: number | null
          quantity: number | null
          quickbooks_item_id: string | null
          rate: number | null
          sort_order: number | null
          total: number | null
          total_cost: number | null
          total_markup: number | null
          unit: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["expense_category"] | null
          cost_per_unit?: number | null
          created_at?: string | null
          description?: string | null
          estimate_id?: string | null
          id?: string | null
          markup_amount?: number | null
          markup_percent?: number | null
          price_per_unit?: number | null
          quantity?: number | null
          quickbooks_item_id?: string | null
          rate?: number | null
          sort_order?: number | null
          total?: number | null
          total_cost?: number | null
          total_markup?: number | null
          unit?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["expense_category"] | null
          cost_per_unit?: number | null
          created_at?: string | null
          description?: string | null
          estimate_id?: string | null
          id?: string | null
          markup_amount?: number | null
          markup_percent?: number | null
          price_per_unit?: number | null
          quantity?: number | null
          quickbooks_item_id?: string | null
          rate?: number | null
          sort_order?: number | null
          total?: number | null
          total_cost?: number | null
          total_markup?: number | null
          unit?: string | null
        }
        Relationships: []
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
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financial_summary"
            referencedColumns: ["project_id"]
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
            referencedRelation: "project_financial_summary"
            referencedColumns: ["project_id"]
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
          id: string
          invoice_number: string | null
          is_locked: boolean | null
          is_planned: boolean | null
          is_split: boolean
          local_id: string | null
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
          id?: string
          invoice_number?: string | null
          is_locked?: boolean | null
          is_planned?: boolean | null
          is_split?: boolean
          local_id?: string | null
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
          id?: string
          invoice_number?: string | null
          is_locked?: boolean | null
          is_planned?: boolean | null
          is_split?: boolean
          local_id?: string | null
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
            referencedRelation: "project_financial_summary"
            referencedColumns: ["project_id"]
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
          created_at: string | null
          email: string | null
          full_name: string | null
          hourly_rate: number | null
          id: string
          insurance_expires: string | null
          is_active: boolean | null
          is_internal: boolean | null
          last_synced_at: string | null
          license_number: string | null
          payee_name: string
          payee_type: string | null
          permit_issuer: boolean | null
          phone_numbers: string | null
          provides_labor: boolean | null
          provides_materials: boolean | null
          quickbooks_vendor_id: string | null
          requires_1099: boolean | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          terms: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_number?: string | null
          billing_address?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          insurance_expires?: string | null
          is_active?: boolean | null
          is_internal?: boolean | null
          last_synced_at?: string | null
          license_number?: string | null
          payee_name: string
          payee_type?: string | null
          permit_issuer?: boolean | null
          phone_numbers?: string | null
          provides_labor?: boolean | null
          provides_materials?: boolean | null
          quickbooks_vendor_id?: string | null
          requires_1099?: boolean | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          terms?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_number?: string | null
          billing_address?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          insurance_expires?: string | null
          is_active?: boolean | null
          is_internal?: boolean | null
          last_synced_at?: string | null
          license_number?: string | null
          payee_name?: string
          payee_type?: string | null
          permit_issuer?: boolean | null
          phone_numbers?: string | null
          provides_labor?: boolean | null
          provides_materials?: boolean | null
          quickbooks_vendor_id?: string | null
          requires_1099?: boolean | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          terms?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
          must_change_password: boolean | null
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
          must_change_password?: boolean | null
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
          must_change_password?: boolean | null
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
            referencedRelation: "project_financial_summary"
            referencedColumns: ["project_id"]
          },
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
            referencedRelation: "project_financial_summary"
            referencedColumns: ["project_id"]
          },
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
            referencedRelation: "project_financial_summary"
            referencedColumns: ["project_id"]
          },
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
            referencedRelation: "project_financial_summary"
            referencedColumns: ["project_id"]
          },
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
          invoice_date: string
          invoice_number: string | null
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
          invoice_date?: string
          invoice_number?: string | null
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
          invoice_date?: string
          invoice_number?: string | null
          project_id?: string
          quickbooks_transaction_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          address: string | null
          adjusted_est_costs: number | null
          client_id: string | null
          client_name: string
          contingency_remaining: number | null
          contracted_amount: number | null
          created_at: string | null
          current_margin: number | null
          customer_po_number: string | null
          end_date: string | null
          id: string
          job_type: string | null
          last_synced_at: string | null
          margin_percentage: number | null
          minimum_margin_threshold: number | null
          notes: string | null
          original_est_costs: number | null
          original_margin: number | null
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
          address?: string | null
          adjusted_est_costs?: number | null
          client_id?: string | null
          client_name: string
          contingency_remaining?: number | null
          contracted_amount?: number | null
          created_at?: string | null
          current_margin?: number | null
          customer_po_number?: string | null
          end_date?: string | null
          id?: string
          job_type?: string | null
          last_synced_at?: string | null
          margin_percentage?: number | null
          minimum_margin_threshold?: number | null
          notes?: string | null
          original_est_costs?: number | null
          original_margin?: number | null
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
          address?: string | null
          adjusted_est_costs?: number | null
          client_id?: string | null
          client_name?: string
          contingency_remaining?: number | null
          contracted_amount?: number | null
          created_at?: string | null
          current_margin?: number | null
          customer_po_number?: string | null
          end_date?: string | null
          id?: string
          job_type?: string | null
          last_synced_at?: string | null
          margin_percentage?: number | null
          minimum_margin_threshold?: number | null
          notes?: string | null
          original_est_costs?: number | null
          original_margin?: number | null
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
      quickbooks_sync_log: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string
          error_message: string | null
          id: string
          quickbooks_id: string | null
          status: Database["public"]["Enums"]["sync_status"] | null
          sync_type: Database["public"]["Enums"]["sync_type"]
          synced_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          quickbooks_id?: string | null
          status?: Database["public"]["Enums"]["sync_status"] | null
          sync_type: Database["public"]["Enums"]["sync_type"]
          synced_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          quickbooks_id?: string | null
          status?: Database["public"]["Enums"]["sync_status"] | null
          sync_type?: Database["public"]["Enums"]["sync_type"]
          synced_at?: string | null
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
            referencedRelation: "project_financial_summary"
            referencedColumns: ["project_id"]
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
            referencedRelation: "project_financial_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "receipts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      project_financial_summary: {
        Row: {
          actual_profit: number | null
          change_order_costs: number | null
          change_order_revenue: number | null
          client_name: string | null
          contracted_amount: number | null
          cost_variance: number | null
          current_margin_percentage: number | null
          expense_count: number | null
          invoice_count: number | null
          project_id: string | null
          project_name: string | null
          project_number: string | null
          revenue_variance: number | null
          status: Database["public"]["Enums"]["project_status"] | null
          total_estimated: number | null
          total_expenses: number | null
          total_invoiced: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_contingency_remaining: {
        Args: { project_id_param: string }
        Returns: number
      }
      calculate_project_margins: {
        Args: { project_id_param: string }
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
      create_estimate_version: {
        Args: { new_version_number?: number; source_estimate_id: string }
        Returns: string
      }
      delete_project_cascade: {
        Args: { p_project_id: string }
        Returns: undefined
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
      generate_work_order_number: {
        Args: { project_id_param: string; project_number_param: string }
        Returns: string
      }
      get_next_project_number: { Args: never; Returns: string }
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
      get_user_auth_status: {
        Args: never
        Returns: {
          confirmed_at: string
          email: string
          full_name: string
          has_password: boolean
          id: string
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
      rollback_cost_migration_final: { Args: never; Returns: undefined }
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
      project_status:
        | "estimating"
        | "quoted"
        | "in_progress"
        | "complete"
        | "cancelled"
        | "approved"
        | "on_hold"
      project_type: "construction_project" | "work_order"
      quote_status: "pending" | "accepted" | "rejected" | "expired"
      sync_status: "success" | "failed" | "pending"
      sync_type: "import" | "export"
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

### ExpenseCategory

**Import:** `@/types/quickbooks`

- Defined in: `types/quickbooks.ts`
- Export type: named

```ts
type ExpenseCategory = Database['public']['Enums']['expense_category']
```

_No inline documentation provided._

**Example**

```ts
import type { ExpenseCategory } from '@/types/quickbooks';

type Example = ExpenseCategory;
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

### ProjectStatus

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
type ProjectStatus = | 'estimating'
  | 'quoted' 
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

### ToastActionElement

**Import:** `@/components/ui/toast`

- Defined in: `components/ui/toast.tsx`
- Export type: named

```ts
type ToastActionElement = React.ReactElement<typeof ToastAction>
```

_No inline documentation provided._

**Example**

```ts
import type { ToastActionElement } from '@/components/ui/toast';

type Example = ToastActionElement;
```

### ToastProps

**Import:** `@/components/ui/toast`

- Defined in: `components/ui/toast.tsx`
- Export type: named

```ts
type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>
```

_No inline documentation provided._

**Example**

```ts
import type { ToastProps } from '@/components/ui/toast';

type Example = ToastProps;
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

## Enums

Total: 5

### ExpenseCategory

**Import:** `@/types/expense`

- Defined in: `types/expense.ts`
- Export type: named

```ts
enum ExpenseCategory = LABOR | SUBCONTRACTOR | MATERIALS | EQUIPMENT | PERMITS | MANAGEMENT | OTHER
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

Total: 20

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
{ readonly public: { readonly Enums: { readonly app_role: readonly ["admin", "manager", "field_worker"]; readonly change_order_status: readonly ["pending", "approved", "rejected"]; readonly estimate_status: readonly ["draft", "sent", "approved", "rejected", "expired"]; readonly expense_category: readonly ["labor_internal", "subcontractors", "materials", "equipment", "other", "permits", "management", "office_expenses", "vehicle_expenses"]; readonly project_status: readonly ["estimating", "quoted", "in_progress", "complete", "cancelled", "approved", "on_hold"]; readonly project_type: readonly ["construction_project", "work_order"]; readonly quote_status: readonly ["pending", "accepted", "rejected", "expired"]; readonly sync_status: readonly ["success", "failed", "pending"]; readonly sync_type: readonly ["import", "export"]; readonly transaction_type: readonly ["expense", "bill", "check", "credit_card", "cash"]; }; }; }
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

### EXPENSE_CATEGORY_DISPLAY

**Import:** `@/types/expense`

- Defined in: `types/expense.ts`
- Export type: named

```ts
{ labor_internal: string; subcontractors: string; materials: string; equipment: string; permits: string; management: string; other: string; }
```

_No inline documentation provided._

**Example**

```ts
import { EXPENSE_CATEGORY_DISPLAY } from '@/types/expense';

// Use EXPENSE_CATEGORY_DISPLAY as needed.
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

### PROJECT_STATUSES

**Import:** `@/types/project`

- Defined in: `types/project.ts`
- Export type: named

```ts
readonly [{ readonly value: "estimating"; readonly label: "Estimating"; }, { readonly value: "quoted"; readonly label: "Quoted"; }, { readonly value: "approved"; readonly label: "Approved"; }, { readonly value: "in_progress"; readonly label: "In Progress"; }, { readonly value: "complete"; readonly label: "Complete"; }, { readonly value: "on_hold"; readonly label: "On Hold"; }, { readonly value: "cancelled"; readonly label: "Cancelled"; }]
```

_No inline documentation provided._

**Example**

```ts
import { PROJECT_STATUSES } from '@/types/project';

// Use PROJECT_STATUSES as needed.
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

### supabase

**Import:** `@/integrations/supabase/client`

- Defined in: `integrations/supabase/client.ts`
- Export type: named

```ts
import("/workspace/node_modules/@supabase/supabase-js/dist/module/SupabaseClient").default<Database, "public", "public", { Tables: { activity_feed: { Row: { activity_type: string; created_at: string; deleted_at: string | null; description: string; entity_id: string; entity_type: string; id: string; metadata: import("/workspace/src/integrations/supabase/types").Json | null; project_id: string | null; user_id: string | null; }; Insert: { activity_type: string; created_at?: string; deleted_at?: string | null; description: string; entity_id: string; entity_type: string; id?: string; metadata?: import("/workspace/src/integrations/supabase/types").Json | null; project_id?: string | null; user_id?: string | null; }; Update: { activity_type?: string; created_at?: string; deleted_at?: string | null; description?: string; entity_id?: string; entity_type?: string; id?: string; metadata?: import("/workspace/src/integrations/supabase/types").Json | null; project_id?: string | null; user_id?: string | null; }; Relationships: [{ foreignKeyName: "activity_feed_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "project_financial_summary"; referencedColumns: ["project_id"]; }, { foreignKeyName: "activity_feed_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }, { foreignKeyName: "activity_feed_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; admin_actions: { Row: { action_details: import("/workspace/src/integrations/supabase/types").Json | null; action_type: string; admin_user_id: string; created_at: string; id: string; target_user_id: string | null; }; Insert: { action_details?: import("/workspace/src/integrations/supabase/types").Json | null; action_type: string; admin_user_id: string; created_at?: string; id?: string; target_user_id?: string | null; }; Update: { action_details?: import("/workspace/src/integrations/supabase/types").Json | null; action_type?: string; admin_user_id?: string; created_at?: string; id?: string; target_user_id?: string | null; }; Relationships: []; }; change_order_line_items: { Row: { category: Database["public"]["Enums"]["expense_category"]; change_order_id: string; cost_per_unit: number | null; created_at: string | null; dependencies: import("/workspace/src/integrations/supabase/types").Json | null; description: string; duration_days: number | null; id: string; is_milestone: boolean | null; markup_amount: number | null; payee_id: string | null; price_per_unit: number | null; quantity: number | null; schedule_notes: string | null; scheduled_end_date: string | null; scheduled_start_date: string | null; sort_order: number | null; total_cost: number | null; total_price: number | null; unit: string | null; updated_at: string | null; }; Insert: { category: Database["public"]["Enums"]["expense_category"]; change_order_id: string; cost_per_unit?: number | null; created_at?: string | null; dependencies?: import("/workspace/src/integrations/supabase/types").Json | null; description: string; duration_days?: number | null; id?: string; is_milestone?: boolean | null; markup_amount?: number | null; payee_id?: string | null; price_per_unit?: number | null; quantity?: number | null; schedule_notes?: string | null; scheduled_end_date?: string | null; scheduled_start_date?: string | null; sort_order?: number | null; total_cost?: number | null; total_price?: number | null; unit?: string | null; updated_at?: string | null; }; Update: { category?: Database["public"]["Enums"]["expense_category"]; change_order_id?: string; cost_per_unit?: number | null; created_at?: string | null; dependencies?: import("/workspace/src/integrations/supabase/types").Json | null; description?: string; duration_days?: number | null; id?: string; is_milestone?: boolean | null; markup_amount?: number | null; payee_id?: string | null; price_per_unit?: number | null; quantity?: number | null; schedule_notes?: string | null; scheduled_end_date?: string | null; scheduled_start_date?: string | null; sort_order?: number | null; total_cost?: number | null; total_price?: number | null; unit?: string | null; updated_at?: string | null; }; Relationships: [{ foreignKeyName: "change_order_line_items_change_order_id_fkey"; columns: ["change_order_id"]; isOneToOne: false; referencedRelation: "change_orders"; referencedColumns: ["id"]; }, { foreignKeyName: "change_order_line_items_payee_id_fkey"; columns: ["payee_id"]; isOneToOne: false; referencedRelation: "payees"; referencedColumns: ["id"]; }]; }; change_orders: { Row: { amount: number | null; approved_by: string | null; approved_date: string | null; change_order_number: string; client_amount: number | null; contingency_billed_to_client: number | null; cost_impact: number | null; created_at: string | null; description: string; id: string; includes_contingency: boolean | null; margin_impact: number | null; project_id: string; reason_for_change: string | null; requested_date: string | null; status: Database["public"]["Enums"]["change_order_status"] | null; updated_at: string | null; }; Insert: { amount?: number | null; approved_by?: string | null; approved_date?: string | null; change_order_number: string; client_amount?: number | null; contingency_billed_to_client?: number | null; cost_impact?: number | null; created_at?: string | null; description: string; id?: string; includes_contingency?: boolean | null; margin_impact?: number | null; project_id: string; reason_for_change?: string | null; requested_date?: string | null; status?: Database["public"]["Enums"]["change_order_status"] | null; updated_at?: string | null; }; Update: { amount?: number | null; approved_by?: string | null; approved_date?: string | null; change_order_number?: string; client_amount?: number | null; contingency_billed_to_client?: number | null; cost_impact?: number | null; created_at?: string | null; description?: string; id?: string; includes_contingency?: boolean | null; margin_impact?: number | null; project_id?: string; reason_for_change?: string | null; requested_date?: string | null; status?: Database["public"]["Enums"]["change_order_status"] | null; updated_at?: string | null; }; Relationships: [{ foreignKeyName: "change_orders_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "project_financial_summary"; referencedColumns: ["project_id"]; }, { foreignKeyName: "change_orders_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }]; }; clients: { Row: { billing_address: string | null; client_name: string; client_type: string | null; company_name: string | null; contact_person: string | null; created_at: string | null; email: string | null; id: string; is_active: boolean | null; mailing_address: string | null; notes: string | null; payment_terms: string | null; phone: string | null; quickbooks_customer_id: string | null; tax_exempt: boolean | null; updated_at: string | null; }; Insert: { billing_address?: string | null; client_name: string; client_type?: string | null; company_name?: string | null; contact_person?: string | null; created_at?: string | null; email?: string | null; id?: string; is_active?: boolean | null; mailing_address?: string | null; notes?: string | null; payment_terms?: string | null; phone?: string | null; quickbooks_customer_id?: string | null; tax_exempt?: boolean | null; updated_at?: string | null; }; Update: { billing_address?: string | null; client_name?: string; client_type?: string | null; company_name?: string | null; contact_person?: string | null; created_at?: string | null; email?: string | null; id?: string; is_active?: boolean | null; mailing_address?: string | null; notes?: string | null; payment_terms?: string | null; phone?: string | null; quickbooks_customer_id?: string | null; tax_exempt?: boolean | null; updated_at?: string | null; }; Relationships: []; }; company_branding_settings: { Row: { accent_color: string | null; company_abbreviation: string | null; company_address: string | null; company_legal_name: string | null; company_license: string | null; company_name: string | null; company_phone: string | null; created_at: string | null; id: string; light_bg_color: string | null; logo_full_url: string | null; logo_icon_url: string | null; logo_report_header_url: string | null; logo_stacked_url: string | null; primary_color: string | null; secondary_color: string | null; updated_at: string | null; }; Insert: { accent_color?: string | null; company_abbreviation?: string | null; company_address?: string | null; company_legal_name?: string | null; company_license?: string | null; company_name?: string | null; company_phone?: string | null; created_at?: string | null; id?: string; light_bg_color?: string | null; logo_full_url?: string | null; logo_icon_url?: string | null; logo_report_header_url?: string | null; logo_stacked_url?: string | null; primary_color?: string | null; secondary_color?: string | null; updated_at?: string | null; }; Update: { accent_color?: string | null; company_abbreviation?: string | null; company_address?: string | null; company_legal_name?: string | null; company_license?: string | null; company_name?: string | null; company_phone?: string | null; created_at?: string | null; id?: string; light_bg_color?: string | null; logo_full_url?: string | null; logo_icon_url?: string | null; logo_report_header_url?: string | null; logo_stacked_url?: string | null; primary_color?: string | null; secondary_color?: string | null; updated_at?: string | null; }; Relationships: []; }; estimate_line_items: { Row: { category: Database["public"]["Enums"]["expense_category"]; cost_per_unit: number | null; created_at: string | null; dependencies: import("/workspace/src/integrations/supabase/types").Json | null; description: string; duration_days: number | null; estimate_id: string; id: string; is_milestone: boolean | null; markup_amount: number | null; markup_percent: number | null; price_per_unit: number | null; quantity: number | null; quickbooks_item_id: string | null; rate: number | null; schedule_notes: string | null; scheduled_end_date: string | null; scheduled_start_date: string | null; sort_order: number | null; total: number | null; total_cost: number | null; total_markup: number | null; unit: string | null; }; Insert: { category: Database["public"]["Enums"]["expense_category"]; cost_per_unit?: number | null; created_at?: string | null; dependencies?: import("/workspace/src/integrations/supabase/types").Json | null; description: string; duration_days?: number | null; estimate_id: string; id?: string; is_milestone?: boolean | null; markup_amount?: number | null; markup_percent?: number | null; price_per_unit?: number | null; quantity?: number | null; quickbooks_item_id?: string | null; rate?: number | null; schedule_notes?: string | null; scheduled_end_date?: string | null; scheduled_start_date?: string | null; sort_order?: number | null; total?: number | null; total_cost?: number | null; total_markup?: number | null; unit?: string | null; }; Update: { category?: Database["public"]["Enums"]["expense_category"]; cost_per_unit?: number | null; created_at?: string | null; dependencies?: import("/workspace/src/integrations/supabase/types").Json | null; description?: string; duration_days?: number | null; estimate_id?: string; id?: string; is_milestone?: boolean | null; markup_amount?: number | null; markup_percent?: number | null; price_per_unit?: number | null; quantity?: number | null; quickbooks_item_id?: string | null; rate?: number | null; schedule_notes?: string | null; scheduled_end_date?: string | null; scheduled_start_date?: string | null; sort_order?: number | null; total?: number | null; total_cost?: number | null; total_markup?: number | null; unit?: string | null; }; Relationships: [{ foreignKeyName: "estimate_line_items_estimate_id_fkey"; columns: ["estimate_id"]; isOneToOne: false; referencedRelation: "estimates"; referencedColumns: ["id"]; }]; }; estimate_line_items_backup_20251030: { Row: { category: Database["public"]["Enums"]["expense_category"] | null; cost_per_unit: number | null; created_at: string | null; description: string | null; estimate_id: string | null; id: string | null; markup_amount: number | null; markup_percent: number | null; price_per_unit: number | null; quantity: number | null; quickbooks_item_id: string | null; rate: number | null; sort_order: number | null; total: number | null; total_cost: number | null; total_markup: number | null; unit: string | null; }; Insert: { category?: Database["public"]["Enums"]["expense_category"] | null; cost_per_unit?: number | null; created_at?: string | null; description?: string | null; estimate_id?: string | null; id?: string | null; markup_amount?: number | null; markup_percent?: number | null; price_per_unit?: number | null; quantity?: number | null; quickbooks_item_id?: string | null; rate?: number | null; sort_order?: number | null; total?: number | null; total_cost?: number | null; total_markup?: number | null; unit?: string | null; }; Update: { category?: Database["public"]["Enums"]["expense_category"] | null; cost_per_unit?: number | null; created_at?: string | null; description?: string | null; estimate_id?: string | null; id?: string | null; markup_amount?: number | null; markup_percent?: number | null; price_per_unit?: number | null; quantity?: number | null; quickbooks_item_id?: string | null; rate?: number | null; sort_order?: number | null; total?: number | null; total_cost?: number | null; total_markup?: number | null; unit?: string | null; }; Relationships: []; }; estimates: { Row: { contingency_amount: number | null; contingency_percent: number | null; contingency_used: number | null; created_at: string | null; created_by: string | null; date_created: string | null; default_markup_percent: number | null; estimate_number: string; id: string; is_current_version: boolean | null; is_draft: boolean; notes: string | null; parent_estimate_id: string | null; project_id: string; revision_number: number | null; sequence_number: number | null; status: Database["public"]["Enums"]["estimate_status"] | null; target_margin_percent: number | null; total_amount: number | null; total_cost: number | null; updated_at: string | null; valid_for_days: number | null; valid_until: string | null; version_number: number | null; }; Insert: { contingency_amount?: number | null; contingency_percent?: number | null; contingency_used?: number | null; created_at?: string | null; created_by?: string | null; date_created?: string | null; default_markup_percent?: number | null; estimate_number: string; id?: string; is_current_version?: boolean | null; is_draft?: boolean; notes?: string | null; parent_estimate_id?: string | null; project_id: string; revision_number?: number | null; sequence_number?: number | null; status?: Database["public"]["Enums"]["estimate_status"] | null; target_margin_percent?: number | null; total_amount?: number | null; total_cost?: number | null; updated_at?: string | null; valid_for_days?: number | null; valid_until?: string | null; version_number?: number | null; }; Update: { contingency_amount?: number | null; contingency_percent?: number | null; contingency_used?: number | null; created_at?: string | null; created_by?: string | null; date_created?: string | null; default_markup_percent?: number | null; estimate_number?: string; id?: string; is_current_version?: boolean | null; is_draft?: boolean; notes?: string | null; parent_estimate_id?: string | null; project_id?: string; revision_number?: number | null; sequence_number?: number | null; status?: Database["public"]["Enums"]["estimate_status"] | null; target_margin_percent?: number | null; total_amount?: number | null; total_cost?: number | null; updated_at?: string | null; valid_for_days?: number | null; valid_until?: string | null; version_number?: number | null; }; Relationships: [{ foreignKeyName: "estimates_parent_estimate_id_fkey"; columns: ["parent_estimate_id"]; isOneToOne: false; referencedRelation: "estimates"; referencedColumns: ["id"]; }, { foreignKeyName: "estimates_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "project_financial_summary"; referencedColumns: ["project_id"]; }, { foreignKeyName: "estimates_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }]; }; expense_line_item_correlations: { Row: { auto_correlated: boolean | null; change_order_line_item_id: string | null; confidence_score: number | null; correlation_type: string; created_at: string; estimate_line_item_id: string | null; expense_id: string | null; expense_split_id: string | null; id: string; notes: string | null; quote_id: string | null; updated_at: string; }; Insert: { auto_correlated?: boolean | null; change_order_line_item_id?: string | null; confidence_score?: number | null; correlation_type: string; created_at?: string; estimate_line_item_id?: string | null; expense_id?: string | null; expense_split_id?: string | null; id?: string; notes?: string | null; quote_id?: string | null; updated_at?: string; }; Update: { auto_correlated?: boolean | null; change_order_line_item_id?: string | null; confidence_score?: number | null; correlation_type?: string; created_at?: string; estimate_line_item_id?: string | null; expense_id?: string | null; expense_split_id?: string | null; id?: string; notes?: string | null; quote_id?: string | null; updated_at?: string; }; Relationships: [{ foreignKeyName: "expense_line_item_correlations_change_order_line_item_id_fkey"; columns: ["change_order_line_item_id"]; isOneToOne: false; referencedRelation: "change_order_line_items"; referencedColumns: ["id"]; }, { foreignKeyName: "expense_line_item_correlations_estimate_line_item_id_fkey"; columns: ["estimate_line_item_id"]; isOneToOne: false; referencedRelation: "estimate_line_items"; referencedColumns: ["id"]; }, { foreignKeyName: "expense_line_item_correlations_expense_id_fkey"; columns: ["expense_id"]; isOneToOne: false; referencedRelation: "expenses"; referencedColumns: ["id"]; }, { foreignKeyName: "expense_line_item_correlations_expense_split_id_fkey"; columns: ["expense_split_id"]; isOneToOne: false; referencedRelation: "expense_splits"; referencedColumns: ["id"]; }, { foreignKeyName: "expense_line_item_correlations_quote_id_fkey"; columns: ["quote_id"]; isOneToOne: false; referencedRelation: "quotes"; referencedColumns: ["id"]; }]; }; expense_splits: { Row: { created_at: string; created_by: string | null; expense_id: string; id: string; notes: string | null; project_id: string; split_amount: number; split_percentage: number | null; updated_at: string; }; Insert: { created_at?: string; created_by?: string | null; expense_id: string; id?: string; notes?: string | null; project_id: string; split_amount: number; split_percentage?: number | null; updated_at?: string; }; Update: { created_at?: string; created_by?: string | null; expense_id?: string; id?: string; notes?: string | null; project_id?: string; split_amount?: number; split_percentage?: number | null; updated_at?: string; }; Relationships: [{ foreignKeyName: "expense_splits_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }, { foreignKeyName: "expense_splits_expense_id_fkey"; columns: ["expense_id"]; isOneToOne: false; referencedRelation: "expenses"; referencedColumns: ["id"]; }, { foreignKeyName: "expense_splits_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "project_financial_summary"; referencedColumns: ["project_id"]; }, { foreignKeyName: "expense_splits_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }]; }; expenses: { Row: { account_full_name: string | null; account_name: string | null; amount: number; approval_status: string | null; approved_at: string | null; approved_by: string | null; attachment_url: string | null; category: Database["public"]["Enums"]["expense_category"]; created_at: string | null; created_offline: boolean | null; description: string | null; end_time: string | null; expense_date: string | null; id: string; invoice_number: string | null; is_locked: boolean | null; is_planned: boolean | null; is_split: boolean; local_id: string | null; payee_id: string | null; project_id: string; quickbooks_transaction_id: string | null; receipt_id: string | null; rejection_reason: string | null; start_time: string | null; submitted_for_approval_at: string | null; synced_at: string | null; transaction_type: Database["public"]["Enums"]["transaction_type"]; updated_at: string | null; updated_by: string | null; user_id: string | null; }; Insert: { account_full_name?: string | null; account_name?: string | null; amount: number; approval_status?: string | null; approved_at?: string | null; approved_by?: string | null; attachment_url?: string | null; category: Database["public"]["Enums"]["expense_category"]; created_at?: string | null; created_offline?: boolean | null; description?: string | null; end_time?: string | null; expense_date?: string | null; id?: string; invoice_number?: string | null; is_locked?: boolean | null; is_planned?: boolean | null; is_split?: boolean; local_id?: string | null; payee_id?: string | null; project_id: string; quickbooks_transaction_id?: string | null; receipt_id?: string | null; rejection_reason?: string | null; start_time?: string | null; submitted_for_approval_at?: string | null; synced_at?: string | null; transaction_type: Database["public"]["Enums"]["transaction_type"]; updated_at?: string | null; updated_by?: string | null; user_id?: string | null; }; Update: { account_full_name?: string | null; account_name?: string | null; amount?: number; approval_status?: string | null; approved_at?: string | null; approved_by?: string | null; attachment_url?: string | null; category?: Database["public"]["Enums"]["expense_category"]; created_at?: string | null; created_offline?: boolean | null; description?: string | null; end_time?: string | null; expense_date?: string | null; id?: string; invoice_number?: string | null; is_locked?: boolean | null; is_planned?: boolean | null; is_split?: boolean; local_id?: string | null; payee_id?: string | null; project_id?: string; quickbooks_transaction_id?: string | null; receipt_id?: string | null; rejection_reason?: string | null; start_time?: string | null; submitted_for_approval_at?: string | null; synced_at?: string | null; transaction_type?: Database["public"]["Enums"]["transaction_type"]; updated_at?: string | null; updated_by?: string | null; user_id?: string | null; }; Relationships: [{ foreignKeyName: "expenses_approved_by_fkey"; columns: ["approved_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }, { foreignKeyName: "expenses_payee_id_fkey"; columns: ["payee_id"]; isOneToOne: false; referencedRelation: "payees"; referencedColumns: ["id"]; }, { foreignKeyName: "expenses_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "project_financial_summary"; referencedColumns: ["project_id"]; }, { foreignKeyName: "expenses_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }, { foreignKeyName: "expenses_receipt_id_fkey"; columns: ["receipt_id"]; isOneToOne: false; referencedRelation: "receipts"; referencedColumns: ["id"]; }, { foreignKeyName: "expenses_updated_by_fkey"; columns: ["updated_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; media_comments: { Row: { comment_text: string; created_at: string; id: string; media_id: string; updated_at: string; user_id: string; }; Insert: { comment_text: string; created_at?: string; id?: string; media_id: string; updated_at?: string; user_id: string; }; Update: { comment_text?: string; created_at?: string; id?: string; media_id?: string; updated_at?: string; user_id?: string; }; Relationships: [{ foreignKeyName: "media_comments_media_id_fkey"; columns: ["media_id"]; isOneToOne: false; referencedRelation: "project_media"; referencedColumns: ["id"]; }, { foreignKeyName: "media_comments_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; payees: { Row: { account_number: string | null; billing_address: string | null; created_at: string | null; email: string | null; full_name: string | null; hourly_rate: number | null; id: string; insurance_expires: string | null; is_active: boolean | null; is_internal: boolean | null; last_synced_at: string | null; license_number: string | null; payee_name: string; payee_type: string | null; permit_issuer: boolean | null; phone_numbers: string | null; provides_labor: boolean | null; provides_materials: boolean | null; quickbooks_vendor_id: string | null; requires_1099: boolean | null; sync_status: Database["public"]["Enums"]["sync_status"] | null; terms: string | null; updated_at: string | null; user_id: string | null; }; Insert: { account_number?: string | null; billing_address?: string | null; created_at?: string | null; email?: string | null; full_name?: string | null; hourly_rate?: number | null; id?: string; insurance_expires?: string | null; is_active?: boolean | null; is_internal?: boolean | null; last_synced_at?: string | null; license_number?: string | null; payee_name: string; payee_type?: string | null; permit_issuer?: boolean | null; phone_numbers?: string | null; provides_labor?: boolean | null; provides_materials?: boolean | null; quickbooks_vendor_id?: string | null; requires_1099?: boolean | null; sync_status?: Database["public"]["Enums"]["sync_status"] | null; terms?: string | null; updated_at?: string | null; user_id?: string | null; }; Update: { account_number?: string | null; billing_address?: string | null; created_at?: string | null; email?: string | null; full_name?: string | null; hourly_rate?: number | null; id?: string; insurance_expires?: string | null; is_active?: boolean | null; is_internal?: boolean | null; last_synced_at?: string | null; license_number?: string | null; payee_name?: string; payee_type?: string | null; permit_issuer?: boolean | null; phone_numbers?: string | null; provides_labor?: boolean | null; provides_materials?: boolean | null; quickbooks_vendor_id?: string | null; requires_1099?: boolean | null; sync_status?: Database["public"]["Enums"]["sync_status"] | null; terms?: string | null; updated_at?: string | null; user_id?: string | null; }; Relationships: []; }; profiles: { Row: { created_at: string; deactivated_at: string | null; deactivated_by: string | null; email: string | null; full_name: string | null; id: string; is_active: boolean; must_change_password: boolean | null; updated_at: string; }; Insert: { created_at?: string; deactivated_at?: string | null; deactivated_by?: string | null; email?: string | null; full_name?: string | null; id: string; is_active?: boolean; must_change_password?: boolean | null; updated_at?: string; }; Update: { created_at?: string; deactivated_at?: string | null; deactivated_by?: string | null; email?: string | null; full_name?: string | null; id?: string; is_active?: boolean; must_change_password?: boolean | null; updated_at?: string; }; Relationships: [{ foreignKeyName: "profiles_deactivated_by_fkey"; columns: ["deactivated_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; project_assignments: { Row: { assigned_at: string | null; assigned_by: string | null; id: string; project_id: string; user_id: string; }; Insert: { assigned_at?: string | null; assigned_by?: string | null; id?: string; project_id: string; user_id: string; }; Update: { assigned_at?: string | null; assigned_by?: string | null; id?: string; project_id?: string; user_id?: string; }; Relationships: [{ foreignKeyName: "project_assignments_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "project_financial_summary"; referencedColumns: ["project_id"]; }, { foreignKeyName: "project_assignments_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }]; }; project_documents: { Row: { created_at: string; description: string | null; document_type: string; expires_at: string | null; file_name: string; file_size: number; file_url: string; id: string; mime_type: string; project_id: string; related_quote_id: string | null; updated_at: string; uploaded_by: string | null; version_number: number | null; }; Insert: { created_at?: string; description?: string | null; document_type: string; expires_at?: string | null; file_name: string; file_size: number; file_url: string; id?: string; mime_type: string; project_id: string; related_quote_id?: string | null; updated_at?: string; uploaded_by?: string | null; version_number?: number | null; }; Update: { created_at?: string; description?: string | null; document_type?: string; expires_at?: string | null; file_name?: string; file_size?: number; file_url?: string; id?: string; mime_type?: string; project_id?: string; related_quote_id?: string | null; updated_at?: string; uploaded_by?: string | null; version_number?: number | null; }; Relationships: [{ foreignKeyName: "project_documents_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "project_financial_summary"; referencedColumns: ["project_id"]; }, { foreignKeyName: "project_documents_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }, { foreignKeyName: "project_documents_related_quote_id_fkey"; columns: ["related_quote_id"]; isOneToOne: false; referencedRelation: "quotes"; referencedColumns: ["id"]; }]; }; project_media: { Row: { altitude: number | null; caption: string | null; created_at: string; description: string | null; device_model: string | null; duration: number | null; file_name: string; file_size: number; file_type: string; file_url: string; id: string; latitude: number | null; location_name: string | null; longitude: number | null; mime_type: string; project_id: string; taken_at: string | null; thumbnail_url: string | null; updated_at: string; upload_source: string | null; uploaded_by: string | null; }; Insert: { altitude?: number | null; caption?: string | null; created_at?: string; description?: string | null; device_model?: string | null; duration?: number | null; file_name: string; file_size: number; file_type: string; file_url: string; id?: string; latitude?: number | null; location_name?: string | null; longitude?: number | null; mime_type: string; project_id: string; taken_at?: string | null; thumbnail_url?: string | null; updated_at?: string; upload_source?: string | null; uploaded_by?: string | null; }; Update: { altitude?: number | null; caption?: string | null; created_at?: string; description?: string | null; device_model?: string | null; duration?: number | null; file_name?: string; file_size?: number; file_type?: string; file_url?: string; id?: string; latitude?: number | null; location_name?: string | null; longitude?: number | null; mime_type?: string; project_id?: string; taken_at?: string | null; thumbnail_url?: string | null; updated_at?: string; upload_source?: string | null; uploaded_by?: string | null; }; Relationships: [{ foreignKeyName: "project_media_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "project_financial_summary"; referencedColumns: ["project_id"]; }, { foreignKeyName: "project_media_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }]; }; project_notes: { Row: { attachment_type: string | null; attachment_url: string | null; created_at: string; id: string; note_text: string; project_id: string; updated_at: string; user_id: string; }; Insert: { attachment_type?: string | null; attachment_url?: string | null; created_at?: string; id?: string; note_text: string; project_id: string; updated_at?: string; user_id: string; }; Update: { attachment_type?: string | null; attachment_url?: string | null; created_at?: string; id?: string; note_text?: string; project_id?: string; updated_at?: string; user_id?: string; }; Relationships: [{ foreignKeyName: "project_notes_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "project_financial_summary"; referencedColumns: ["project_id"]; }, { foreignKeyName: "project_notes_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }, { foreignKeyName: "project_notes_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }]; }; project_revenues: { Row: { account_full_name: string | null; account_name: string | null; amount: number; client_id: string | null; created_at: string; description: string | null; id: string; invoice_date: string; invoice_number: string | null; project_id: string; quickbooks_transaction_id: string | null; updated_at: string; }; Insert: { account_full_name?: string | null; account_name?: string | null; amount: number; client_id?: string | null; created_at?: string; description?: string | null; id?: string; invoice_date?: string; invoice_number?: string | null; project_id: string; quickbooks_transaction_id?: string | null; updated_at?: string; }; Update: { account_full_name?: string | null; account_name?: string | null; amount?: number; client_id?: string | null; created_at?: string; description?: string | null; id?: string; invoice_date?: string; invoice_number?: string | null; project_id?: string; quickbooks_transaction_id?: string | null; updated_at?: string; }; Relationships: []; }; projects: { Row: { address: string | null; adjusted_est_costs: number | null; client_id: string | null; client_name: string; contingency_remaining: number | null; contracted_amount: number | null; created_at: string | null; current_margin: number | null; customer_po_number: string | null; end_date: string | null; id: string; job_type: string | null; last_synced_at: string | null; margin_percentage: number | null; minimum_margin_threshold: number | null; notes: string | null; original_est_costs: number | null; original_margin: number | null; payment_terms: string | null; project_name: string; project_number: string; project_type: Database["public"]["Enums"]["project_type"] | null; projected_margin: number | null; qb_formatted_number: string | null; quickbooks_job_id: string | null; sequence_number: number | null; start_date: string | null; status: Database["public"]["Enums"]["project_status"] | null; sync_status: Database["public"]["Enums"]["sync_status"] | null; target_margin: number | null; total_accepted_quotes: number | null; updated_at: string | null; work_order_counter: number | null; }; Insert: { address?: string | null; adjusted_est_costs?: number | null; client_id?: string | null; client_name: string; contingency_remaining?: number | null; contracted_amount?: number | null; created_at?: string | null; current_margin?: number | null; customer_po_number?: string | null; end_date?: string | null; id?: string; job_type?: string | null; last_synced_at?: string | null; margin_percentage?: number | null; minimum_margin_threshold?: number | null; notes?: string | null; original_est_costs?: number | null; original_margin?: number | null; payment_terms?: string | null; project_name: string; project_number: string; project_type?: Database["public"]["Enums"]["project_type"] | null; projected_margin?: number | null; qb_formatted_number?: string | null; quickbooks_job_id?: string | null; sequence_number?: number | null; start_date?: string | null; status?: Database["public"]["Enums"]["project_status"] | null; sync_status?: Database["public"]["Enums"]["sync_status"] | null; target_margin?: number | null; total_accepted_quotes?: number | null; updated_at?: string | null; work_order_counter?: number | null; }; Update: { address?: string | null; adjusted_est_costs?: number | null; client_id?: string | null; client_name?: string; contingency_remaining?: number | null; contracted_amount?: number | null; created_at?: string | null; current_margin?: number | null; customer_po_number?: string | null; end_date?: string | null; id?: string; job_type?: string | null; last_synced_at?: string | null; margin_percentage?: number | null; minimum_margin_threshold?: number | null; notes?: string | null; original_est_costs?: number | null; original_margin?: number | null; payment_terms?: string | null; project_name?: string; project_number?: string; project_type?: Database["public"]["Enums"]["project_type"] | null; projected_margin?: number | null; qb_formatted_number?: string | null; quickbooks_job_id?: string | null; sequence_number?: number | null; start_date?: string | null; status?: Database["public"]["Enums"]["project_status"] | null; sync_status?: Database["public"]["Enums"]["sync_status"] | null; target_margin?: number | null; total_accepted_quotes?: number | null; updated_at?: string | null; work_order_counter?: number | null; }; Relationships: [{ foreignKeyName: "projects_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"]; }]; }; quickbooks_account_mappings: { Row: { app_category: Database["public"]["Enums"]["expense_category"]; created_at: string; id: string; is_active: boolean; qb_account_full_path: string; qb_account_name: string; updated_at: string; }; Insert: { app_category: Database["public"]["Enums"]["expense_category"]; created_at?: string; id?: string; is_active?: boolean; qb_account_full_path: string; qb_account_name: string; updated_at?: string; }; Update: { app_category?: Database["public"]["Enums"]["expense_category"]; created_at?: string; id?: string; is_active?: boolean; qb_account_full_path?: string; qb_account_name?: string; updated_at?: string; }; Relationships: []; }; quickbooks_sync_log: { Row: { created_at: string | null; entity_id: string | null; entity_type: string; error_message: string | null; id: string; quickbooks_id: string | null; status: Database["public"]["Enums"]["sync_status"] | null; sync_type: Database["public"]["Enums"]["sync_type"]; synced_at: string | null; }; Insert: { created_at?: string | null; entity_id?: string | null; entity_type: string; error_message?: string | null; id?: string; quickbooks_id?: string | null; status?: Database["public"]["Enums"]["sync_status"] | null; sync_type: Database["public"]["Enums"]["sync_type"]; synced_at?: string | null; }; Update: { created_at?: string | null; entity_id?: string | null; entity_type?: string; error_message?: string | null; id?: string; quickbooks_id?: string | null; status?: Database["public"]["Enums"]["sync_status"] | null; sync_type?: Database["public"]["Enums"]["sync_type"]; synced_at?: string | null; }; Relationships: []; }; quote_line_items: { Row: { category: Database["public"]["Enums"]["expense_category"]; change_order_line_item_id: string | null; cost_per_unit: number | null; created_at: string | null; description: string | null; estimate_line_item_id: string | null; id: string; markup_amount: number | null; markup_percent: number | null; quantity: number | null; quote_id: string; rate: number | null; sort_order: number | null; total: number | null; total_cost: number | null; total_markup: number | null; unit: string | null; }; Insert: { category: Database["public"]["Enums"]["expense_category"]; change_order_line_item_id?: string | null; cost_per_unit?: number | null; created_at?: string | null; description?: string | null; estimate_line_item_id?: string | null; id?: string; markup_amount?: number | null; markup_percent?: number | null; quantity?: number | null; quote_id: string; rate?: number | null; sort_order?: number | null; total?: number | null; total_cost?: number | null; total_markup?: number | null; unit?: string | null; }; Update: { category?: Database["public"]["Enums"]["expense_category"]; change_order_line_item_id?: string | null; cost_per_unit?: number | null; created_at?: string | null; description?: string | null; estimate_line_item_id?: string | null; id?: string; markup_amount?: number | null; markup_percent?: number | null; quantity?: number | null; quote_id?: string; rate?: number | null; sort_order?: number | null; total?: number | null; total_cost?: number | null; total_markup?: number | null; unit?: string | null; }; Relationships: [{ foreignKeyName: "quote_line_items_change_order_line_item_id_fkey"; columns: ["change_order_line_item_id"]; isOneToOne: false; referencedRelation: "change_order_line_items"; referencedColumns: ["id"]; }, { foreignKeyName: "quote_line_items_estimate_line_item_id_fkey"; columns: ["estimate_line_item_id"]; isOneToOne: false; referencedRelation: "estimate_line_items"; referencedColumns: ["id"]; }, { foreignKeyName: "quote_line_items_quote_id_fkey"; columns: ["quote_id"]; isOneToOne: false; referencedRelation: "quotes"; referencedColumns: ["id"]; }]; }; quotes: { Row: { accepted_date: string | null; attachment_url: string | null; created_at: string | null; date_received: string | null; estimate_id: string | null; id: string; includes_labor: boolean; includes_materials: boolean; notes: string | null; payee_id: string; project_id: string; quote_number: string; rejection_reason: string | null; sequence_number: number | null; status: Database["public"]["Enums"]["quote_status"] | null; total_amount: number | null; updated_at: string | null; valid_until: string | null; }; Insert: { accepted_date?: string | null; attachment_url?: string | null; created_at?: string | null; date_received?: string | null; estimate_id?: string | null; id?: string; includes_labor?: boolean; includes_materials?: boolean; notes?: string | null; payee_id: string; project_id: string; quote_number: string; rejection_reason?: string | null; sequence_number?: number | null; status?: Database["public"]["Enums"]["quote_status"] | null; total_amount?: number | null; updated_at?: string | null; valid_until?: string | null; }; Update: { accepted_date?: string | null; attachment_url?: string | null; created_at?: string | null; date_received?: string | null; estimate_id?: string | null; id?: string; includes_labor?: boolean; includes_materials?: boolean; notes?: string | null; payee_id?: string; project_id?: string; quote_number?: string; rejection_reason?: string | null; sequence_number?: number | null; status?: Database["public"]["Enums"]["quote_status"] | null; total_amount?: number | null; updated_at?: string | null; valid_until?: string | null; }; Relationships: [{ foreignKeyName: "quotes_estimate_id_fkey"; columns: ["estimate_id"]; isOneToOne: false; referencedRelation: "estimates"; referencedColumns: ["id"]; }, { foreignKeyName: "quotes_payee_id_fkey"; columns: ["payee_id"]; isOneToOne: false; referencedRelation: "payees"; referencedColumns: ["id"]; }, { foreignKeyName: "quotes_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "project_financial_summary"; referencedColumns: ["project_id"]; }, { foreignKeyName: "quotes_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }]; }; receipts: { Row: { amount: number; approval_status: string | null; approved_at: string | null; approved_by: string | null; captured_at: string; created_at: string; description: string | null; id: string; image_url: string; payee_id: string | null; project_id: string | null; rejection_reason: string | null; submitted_for_approval_at: string | null; updated_at: string; user_id: string; }; Insert: { amount: number; approval_status?: string | null; approved_at?: string | null; approved_by?: string | null; captured_at?: string; created_at?: string; description?: string | null; id?: string; image_url: string; payee_id?: string | null; project_id?: string | null; rejection_reason?: string | null; submitted_for_approval_at?: string | null; updated_at?: string; user_id: string; }; Update: { amount?: number; approval_status?: string | null; approved_at?: string | null; approved_by?: string | null; captured_at?: string; created_at?: string; description?: string | null; id?: string; image_url?: string; payee_id?: string | null; project_id?: string | null; rejection_reason?: string | null; submitted_for_approval_at?: string | null; updated_at?: string; user_id?: string; }; Relationships: [{ foreignKeyName: "receipts_payee_id_fkey"; columns: ["payee_id"]; isOneToOne: false; referencedRelation: "payees"; referencedColumns: ["id"]; }, { foreignKeyName: "receipts_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "project_financial_summary"; referencedColumns: ["project_id"]; }, { foreignKeyName: "receipts_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"]; }]; }; system_settings: { Row: { created_at: string; description: string | null; id: string; setting_key: string; setting_value: string; updated_at: string; }; Insert: { created_at?: string; description?: string | null; id?: string; setting_key: string; setting_value: string; updated_at?: string; }; Update: { created_at?: string; description?: string | null; id?: string; setting_key?: string; setting_value?: string; updated_at?: string; }; Relationships: []; }; user_roles: { Row: { assigned_at: string | null; assigned_by: string | null; id: string; role: Database["public"]["Enums"]["app_role"]; user_id: string; }; Insert: { assigned_at?: string | null; assigned_by?: string | null; id?: string; role: Database["public"]["Enums"]["app_role"]; user_id: string; }; Update: { assigned_at?: string | null; assigned_by?: string | null; id?: string; role?: Database["public"]["Enums"]["app_role"]; user_id?: string; }; Relationships: []; }; }; Views: { project_financial_summary: { Row: { actual_profit: number | null; change_order_costs: number | null; change_order_revenue: number | null; client_name: string | null; contracted_amount: number | null; cost_variance: number | null; current_margin_percentage: number | null; expense_count: number | null; invoice_count: number | null; project_id: string | null; project_name: string | null; project_number: string | null; revenue_variance: number | null; status: Database["public"]["Enums"]["project_status"] | null; total_estimated: number | null; total_expenses: number | null; total_invoiced: number | null; }; Relationships: []; }; }; Functions: { calculate_contingency_remaining: { Args: { project_id_param: string; }; Returns: number; }; calculate_project_margins: { Args: { project_id_param: string; }; Returns: undefined; }; can_access_project: { Args: { _project_id: string; _user_id: string; }; Returns: boolean; }; check_margin_thresholds: { Args: { project_id_param: string; }; Returns: string; }; create_estimate_version: { Args: { new_version_number?: number; source_estimate_id: string; }; Returns: string; }; delete_project_cascade: { Args: { p_project_id: string; }; Returns: undefined; }; generate_estimate_number: { Args: { project_id_param: string; project_number_param: string; }; Returns: string; }; generate_quote_number: { Args: { estimate_id_param?: string; project_id_param: string; project_number_param: string; }; Returns: string; }; generate_work_order_number: { Args: { project_id_param: string; project_number_param: string; }; Returns: string; }; get_next_project_number: { Args: never; Returns: string; }; get_project_financial_summary: { Args: never; Returns: { accepted_quote_count: number; actual_margin_percentage: number; actual_profit: number; change_order_costs: number; change_order_revenue: number; client_name: string; contingency_amount: number; cost_variance: number; expense_count: number; invoice_count: number; project_id: string; project_name: string; project_number: string; revenue_variance: number; status: Database["public"]["Enums"]["project_status"]; total_estimated: number; total_expenses: number; total_invoiced: number; total_quoted: number; }[]; }; get_user_auth_status: { Args: never; Returns: { confirmed_at: string; email: string; full_name: string; has_password: boolean; id: string; last_sign_in_at: string; must_change_password: boolean; }[]; }; has_any_role: { Args: { _user_id: string; }; Returns: boolean; }; has_role: { Args: { _role: Database["public"]["Enums"]["app_role"]; _user_id: string; }; Returns: boolean; }; log_activity: { Args: { p_activity_type: string; p_description: string; p_entity_id: string; p_entity_type: string; p_metadata?: import("/workspace/src/integrations/supabase/types").Json; p_project_id: string; p_user_id: string; }; Returns: string; }; rollback_cost_migration_final: { Args: never; Returns: undefined; }; }; Enums: { app_role: "admin" | "manager" | "field_worker"; change_order_status: "pending" | "approved" | "rejected"; estimate_status: "draft" | "sent" | "approved" | "rejected" | "expired"; expense_category: "labor_internal" | "subcontractors" | "materials" | "equipment" | "other" | "permits" | "management" | "office_expenses" | "vehicle_expenses"; project_status: "estimating" | "quoted" | "in_progress" | "complete" | "cancelled" | "approved" | "on_hold"; project_type: "construction_project" | "work_order"; quote_status: "pending" | "accepted" | "rejected" | "expired"; sync_status: "success" | "failed" | "pending"; sync_type: "import" | "export"; transaction_type: "expense" | "bill" | "check" | "credit_card" | "cash"; }; CompositeTypes: { [_ in never]: never; }; }, { PostgrestVersion: "13.0.5"; }>
```

_No inline documentation provided._

**Example**

```ts
import { supabase } from '@/integrations/supabase/client';

// Use supabase as needed.
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
