# Prompt 05: Update Field Project Selector

## Context
We are implementing a project category system to replace hardcoded project_number filtering. The FieldProjectSelector is used for field workers (media capture) and should only show construction projects.

## Reference Document
Read `/docs/project-category-implementation/02-COMPONENT-UPDATES.md` for full context.

## Task
Update `src/components/FieldProjectSelector.tsx` to use category-based project filtering.

## Changes Required

### 1. Update Project Interface (around line 40)

Find:
```typescript
interface Project {
  id: string;
  project_number: string;
  project_name: string;
  client_name: string;
  status: string;
}
```

Replace with:
```typescript
interface Project {
  id: string;
  project_number: string;
  project_name: string;
  client_name: string;
  status: string;
  category: string;
}
```

### 2. Update useQuery queryFn (around line 55)

Find:
```typescript
const { data, error } = await supabase
  .from('projects')
  .select('id, project_number, project_name, client_name, status')
  .neq('project_number', 'SYS-000')
  .neq('project_number', '000-UNASSIGNED')
  .neq('project_number', '001-GAS')
  .order('project_number', { ascending: false });
```

Replace with:
```typescript
const { data, error } = await supabase
  .from('projects')
  .select('id, project_number, project_name, client_name, status, category')
  .eq('category', 'construction')
  .order('project_number', { ascending: false });
```

### 3. Update JSDoc Comment (at top of file)

Update the file's JSDoc comment to reflect the new filtering approach:

Find the comment that says:
```typescript
 * - Excludes system projects (SYS-000, 000-UNASSIGNED)
```

Replace with:
```typescript
 * - Filters to construction projects only (excludes system and overhead categories)
```

Also update:
```typescript
 * - Automatic filtering of system/administrative projects
```

To:
```typescript
 * - Automatic filtering by category (construction only)
```

## Validation

After making changes:
1. No TypeScript errors
2. Field project selector loads without errors
3. Only construction projects appear in the dropdown
4. Overhead projects (001-GAS) are NOT shown
5. System projects are NOT shown
6. Photo/video capture workflow works correctly

## Do Not

- Change the search/filter logic for the dropdown
- Modify the UI components
- Change how project selection is handled
