# Pagination System Documentation

## Overview

The pagination system provides a complete, reusable solution for adding pagination to tables and lists throughout the application. It consists of a custom hook, a complete pagination component, and integration patterns for different types of data displays.

## Core Components

### 1. `usePagination` Hook (`src/hooks/usePagination.ts`)

A custom React hook that manages pagination state and calculations.

```typescript
const {
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  hasNextPage,
  hasPreviousPage,
  goToPage,
  goToNextPage,
  goToPreviousPage,
  getPageNumbers,
} = usePagination({
  totalItems: data.length,
  pageSize: 10,
  initialPage: 1,
});
```

**Props:**
- `totalItems` (number): Total number of items to paginate
- `pageSize` (number): Number of items per page
- `initialPage` (number, optional): Starting page (default: 1)

**Returns:**
- `currentPage`: Current active page number
- `totalPages`: Total number of pages
- `startIndex`: Starting index for current page slice
- `endIndex`: Ending index for current page slice
- `hasNextPage` / `hasPreviousPage`: Boolean navigation helpers
- `goToPage(page)`: Navigate to specific page
- `goToNextPage()` / `goToPreviousPage()`: Navigation methods
- `getPageNumbers()`: Array of visible page numbers for pagination UI

### 2. `CompletePagination` Component (`src/components/ui/complete-pagination.tsx`)

A complete pagination UI component with smart page number display and ellipsis.

```tsx
<CompletePagination
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={goToPage}
  showPrevNext={true}      // Optional: show prev/next buttons
  showEllipsis={true}      // Optional: show ellipsis for large page counts
  className="custom-class" // Optional: additional CSS classes
/>
```

**Features:**
- Smart ellipsis display for large page counts
- Always shows first and last page
- Responsive design
- Accessible navigation
- Customizable appearance

## Integration Patterns

### Table Components

For table-based components, integrate pagination as follows:

```tsx
interface MyTableProps {
  data: MyDataType[];
  enablePagination?: boolean;
  pageSize?: number;
  // ... other props
}

export const MyTable = ({ 
  data, 
  enablePagination = false, 
  pageSize = 25 
}: MyTableProps) => {
  // Pagination setup
  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    goToPage,
  } = usePagination({
    totalItems: data.length,
    pageSize,
    initialPage: 1,
  });

  // Apply pagination to data
  const paginatedData = enablePagination 
    ? data.slice(startIndex, endIndex)
    : data;

  return (
    <div>
      {/* Table content */}
      <Table>
        <TableBody>
          {paginatedData.map(item => (
            <TableRow key={item.id}>
              {/* Row content */}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination controls */}
      {enablePagination && data.length > pageSize && (
        <div className="flex justify-center mt-6">
          <CompletePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </div>
      )}
    </div>
  );
};
```

### Grid/Card Components

For grid-based layouts like ProjectsList:

```tsx
export const MyGridComponent = ({ 
  items, 
  enablePagination = false, 
  pageSize = 12 
}: MyGridProps) => {
  // ... pagination setup same as above

  return (
    <div>
      {/* Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {paginatedItems.map(item => (
          <Card key={item.id}>
            {/* Card content */}
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {enablePagination && items.length > pageSize && (
        <div className="flex justify-center mt-6">
          <CompletePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </div>
      )}
    </div>
  );
};
```

## Integrated Components

The following components now support pagination:

### 1. EntityTableTemplate
- **Usage**: Generic table component
- **Default Page Size**: 10
- **Enable**: Set `enablePagination={true}`

### 2. ProjectProfitTable
- **Usage**: Project profit analysis table
- **Default Page Size**: 10
- **Enable**: Set `enablePagination={true}`

### 3. ProjectsList
- **Usage**: Grid-based project display
- **Default Page Size**: 12 (optimized for grid layout)
- **Enable**: Set `enablePagination={true}`

### 4. ExpensesList
- **Usage**: Table of expenses
- **Default Page Size**: 25
- **Enable**: Set `enablePagination={true}`

### 5. ChangeOrdersList
- **Usage**: Table of change orders
- **Default Page Size**: 20
- **Enable**: Set `enablePagination={true}`

## Usage Examples

### Basic Table with Pagination

```tsx
<EntityTableTemplate
  title="My Data"
  data={myData}
  columns={columns}
  onView={handleView}
  onEdit={handleEdit}
  onDelete={handleDelete}
  enablePagination={true}
  pageSize={15}
/>
```

### Projects Grid with Pagination

```tsx
<ProjectsList
  projects={projects}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onCreateNew={handleCreate}
  onRefresh={handleRefresh}
  enablePagination={true}
  pageSize={9} // 3x3 grid
/>
```

### Expenses Table with Pagination

```tsx
<ExpensesList
  expenses={expenses}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onRefresh={handleRefresh}
  enablePagination={true}
  pageSize={50} // Show more expenses per page
/>
```

## Recommended Page Sizes

- **Tables**: 10-25 items (based on content density)
- **Grids**: 6-12 items (based on grid columns)
- **Lists**: 15-30 items (based on item height)

Choose page sizes that:
1. Provide good user experience
2. Don't cause excessive scrolling
3. Load reasonably fast
4. Work well on mobile devices

## Performance Considerations

1. **Client-side Pagination**: Current implementation slices data on frontend
2. **Memory Usage**: All data is loaded, only display is paginated
3. **Future Enhancement**: Consider server-side pagination for very large datasets
4. **Filtering**: Apply filters before pagination for accurate page counts

## Best Practices

1. **Default to Disabled**: Only enable pagination when needed
2. **Consistent Page Sizes**: Use consistent defaults across similar components
3. **Mobile Responsive**: Ensure pagination works well on small screens
4. **Accessibility**: Pagination component includes ARIA labels
5. **Performance**: Consider virtualization for extremely large datasets

## Customization

### Custom Page Sizes
```tsx
<MyComponent 
  enablePagination={true} 
  pageSize={customSize} 
/>
```

### Custom Styling
```tsx
<CompletePagination
  className="my-custom-pagination"
  showPrevNext={false}
  showEllipsis={false}
/>
```

### Advanced Integration
For complex use cases, use the `usePagination` hook directly and build custom pagination UI:

```tsx
const MyCustomPagination = ({ data }: Props) => {
  const pagination = usePagination({
    totalItems: data.length,
    pageSize: 10,
  });

  return (
    <div>
      {/* Custom pagination UI */}
      <div className="pagination-info">
        Showing {pagination.startIndex + 1}-{pagination.endIndex} of {data.length}
      </div>
      
      <div className="pagination-controls">
        <button 
          onClick={pagination.goToPreviousPage}
          disabled={!pagination.hasPreviousPage}
        >
          Previous
        </button>
        
        {pagination.getPageNumbers().map(pageNum => (
          <button 
            key={pageNum}
            onClick={() => pagination.goToPage(pageNum)}
            className={pageNum === pagination.currentPage ? 'active' : ''}
          >
            {pageNum}
          </button>
        ))}
        
        <button 
          onClick={pagination.goToNextPage}
          disabled={!pagination.hasNextPage}
        >
          Next
        </button>
      </div>
    </div>
  );
};
```

## Future Enhancements

1. **Server-side Pagination**: For very large datasets
2. **Virtual Scrolling**: Alternative to pagination for continuous lists
3. **Infinite Scroll**: For social media style interfaces
4. **Page Size Selector**: Allow users to choose items per page
5. **URL Integration**: Sync pagination state with URL parameters
6. **Keyboard Navigation**: Arrow key navigation through pages
