# Prompt 04: Update Time Tracker Components

## Context
We are implementing a project category system to replace hardcoded project_number filtering. The time tracker should only show construction projects (no overhead projects).

## Reference Document
Read `/docs/project-category-implementation/02-COMPONENT-UPDATES.md` for full context.

## Task
Update `src/components/time-tracker/MobileTimeTracker.tsx` to use category-based project filtering.

## Changes Required

### 1. Add Import (at top of file)

Add to existing imports:
```typescript
import { ProjectCategory } from '@/types/project';
```

### 2. Update Project Interface (around line 25)

Find the local Project interface and add category:
```typescript
interface Project {
  id: string;
  project_number: string;
  project_name: string;
  client_name: string;
  address: string;
  category?: string;  // ADD THIS LINE
}
```

### 3. Update `loadInitialData()` Query (around line 85)

Find:
```typescript
const { data: projectsData, error: projectsError } = await supabase
  .from('projects')
  .select('id, project_number, project_name, client_name, address')
  .in('status', ['approved', 'in_progress'])
  .neq('project_number', '000-UNASSIGNED')
  .neq('project_number', 'SYS-000')
  .neq('project_number', '001-GAS')
  .order('project_number', { ascending: false })
  .limit(20);
```

Replace with:
```typescript
const { data: projectsData, error: projectsError } = await supabase
  .from('projects')
  .select('id, project_number, project_name, client_name, address, category')
  .in('status', ['approved', 'in_progress'])
  .eq('category', 'construction')
  .order('project_number', { ascending: false })
  .limit(20);
```

### 4. Update Local isSystemProject Function (around line 60)

Find:
```typescript
const isSystemProject = (num: string) => 
  !!num && (num === 'SYS-000' || num === '000-UNASSIGNED' || num.startsWith('SYS-'));
```

Replace with:
```typescript
const isNonConstructionProject = (category?: string) => 
  category === 'system' || category === 'overhead';
```

### 5. Update Timer Restoration Logic (around line 65)

Find the check that uses isSystemProject:
```typescript
if (parsed.project && isSystemProject(parsed.project.project_number)) {
  parsed.project = null;
}
```

Replace with:
```typescript
if (parsed.project && isNonConstructionProject(parsed.project.category)) {
  parsed.project = null;
}
```

### 6. Update Defense-in-Depth Filter (around line 100)

Find:
```typescript
const cleanedProjects = (projectsData || []).filter(
  p => p.project_number !== '000-UNASSIGNED' && 
       p.project_number !== 'SYS-000' && 
       !p.project_number.startsWith('SYS-')
);
```

Replace with:
```typescript
const cleanedProjects = (projectsData || []).filter(
  p => p.category === 'construction'
);
```

## Validation

After making changes:
1. No TypeScript errors
2. Time tracker loads without errors
3. Only construction projects appear in project dropdown
4. Overhead projects (001-GAS) are NOT shown
5. Timer functionality works correctly
6. Saved timer state restores correctly

## Do Not

- Change any other logic in the component
- Modify the UI
- Change how time entries are saved
