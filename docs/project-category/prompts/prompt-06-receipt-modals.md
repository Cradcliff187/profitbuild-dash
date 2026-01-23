# Prompt 06: Update Receipt Modals

## Context
We are implementing a project category system to replace hardcoded project_number filtering. Receipt modals should show BOTH construction AND overhead projects (unlike time tracker which only shows construction).

## Reference Document
Read `/docs/project-category/02-COMPONENT-UPDATES.md` for full context.

## Task
Update `src/components/time-tracker/AddReceiptModal.tsx` and `src/components/time-tracker/EditReceiptModal.tsx` to use category-based project filtering.

---

## File 1: AddReceiptModal.tsx

### 1. Update Project Interface (if exists locally, around line 30)

Add category to any local Project interface:
```typescript
interface Project {
  id: string;
  project_number: string;
  project_name: string;
  status: string;
  category?: string;  // ADD THIS
}
```

### 2. Rewrite `loadProjects()` Function (around line 55-80)

Find the entire `loadProjects` function and replace it with:

```typescript
const loadProjects = async () => {
  try {
    // Get system project ID for unassigned fallback
    const { data: sysProject } = await supabase
      .from('projects')
      .select('id')
      .eq('project_number', 'SYS-000')
      .single();
    
    if (sysProject) {
      setSystemProjectId(sysProject.id);
    }
    
    // Get overhead projects (these get pinned at top of list)
    const { data: overheadProjects, error: overheadError } = await supabase
      .from('projects')
      .select('id, project_number, project_name, status, category')
      .eq('category', 'overhead')
      .in('status', ['approved', 'in_progress'])
      .order('project_number', { ascending: true });
    
    if (overheadError) throw overheadError;
    
    // Get construction projects
    const { data: constructionProjects, error: constructionError } = await supabase
      .from('projects')
      .select('id, project_number, project_name, status, category')
      .eq('category', 'construction')
      .in('status', ['approved', 'in_progress'])
      .order('project_number', { ascending: false });
    
    if (constructionError) throw constructionError;
    
    // Combine: overhead first (pinned), then construction projects
    setProjects([...(overheadProjects || []), ...(constructionProjects || [])]);
  } catch (error) {
    console.error('Failed to load projects:', error);
    toast.error('Failed to load projects');
  }
};
```

### 3. Remove Hardcoded Project Number References

Remove any references to:
- `'001-GAS'` as a hardcoded pinned project
- `['SYS-000', '000-UNASSIGNED', '001-GAS'].includes(...)` filter logic

The category-based query now handles this automatically.

---

## File 2: EditReceiptModal.tsx

### 1. Update `loadProjects()` Function (around line 60)

Find:
```typescript
const { data, error } = await supabase
  .from('projects')
  .select('id, project_name, project_number')
  .in('status', ['approved', 'in_progress'])
  .not('project_number', 'in', '("000-UNASSIGNED","SYS-000")')
  .order('project_name');
```

Replace with:
```typescript
const { data, error } = await supabase
  .from('projects')
  .select('id, project_name, project_number, category')
  .in('status', ['approved', 'in_progress'])
  .in('category', ['construction', 'overhead'])
  .order('project_name');
```

---

## Validation

After making changes:
1. No TypeScript errors in either file
2. Add Receipt modal loads without errors
3. Edit Receipt modal loads without errors
4. Construction projects appear in dropdown
5. Overhead projects (001-GAS, 002-GA) appear at top of dropdown
6. System projects (SYS-000, 000-UNASSIGNED) do NOT appear in dropdown
7. "No project assigned" option still works
8. Receipt creation/editing still works correctly

## Do Not

- Change the "unassigned" / "no project" option logic
- Modify how receipts are saved
- Change the UI layout
