

# Trigger Supabase Types Regeneration

## Summary
Apply a harmless schema change to trigger Lovable's automatic type regeneration, which will add the missing `contracts` table to the TypeScript types file.

## Approach
Run a SQL migration that adds a comment to the `contracts` table. This:
- Does not modify any data or schema structure
- Triggers the types file regeneration process
- Is a clean, reversible change

## Database Migration

```sql
-- Trigger types regeneration by adding table comment
COMMENT ON TABLE contracts IS 'Stores generated subcontractor contracts linked to projects and quotes';
```

## Expected Result
After the migration runs:
1. Lovable will regenerate `src/integrations/supabase/types.ts`
2. The `contracts` table definition will be added automatically
3. All 17+ build errors related to the missing table will be resolved

## Additional Fix Needed
There's also a type error in `EstimateStatusActions.tsx` comparing against `'approved'` which isn't in the type union. After types regenerate, I'll check if this needs a separate fix (it may be unrelated to the contracts table issue).

## Complexity: Minimal
- One simple SQL comment statement
- No code changes required for the contracts errors
- Types file updates automatically

