# Code Quality Standards

This document outlines the code quality standards for the project.

## Import Management

### Unused Imports
- **Detection**: ESLint rules enforce unused import warnings
- **Cleanup**: Run `npm run lint -- --fix` for automated removal
- **Prevention**: ESLint configuration warns on unused imports at development time

### Import Organization
1. **External libraries** (React, third-party packages)
2. **Internal UI components** (@/components/ui/*)
3. **Internal components** (@/components/*)
4. **Hooks and utilities** (@/hooks/*, @/utils/*)
5. **Types** (@/types/*)
6. **Constants and config**

## Code Quality Checks

### ESLint
The project uses ESLint as the primary code quality tool. Configuration is in `eslint.config.js`.

### Unused Variables/Imports
```javascript
"@typescript-eslint/no-unused-vars": ["warn", {
  "argsIgnorePattern": "^_",
  "varsIgnorePattern": "^_",
  "ignoreRestSiblings": true
}]
```

### Best Practices
- Use underscore prefix for intentionally unused variables: `_unusedParam`
- Enable `ignoreRestSiblings` for object destructuring patterns
- Warnings instead of errors for gradual cleanup

## Quality Gates

### Pre-deploy (`npm run pre-deploy`)
- TypeScript compilation check
- Feature flag safety checks
- Import safety checks

### Available Scripts
- `npm run lint` — Run ESLint on all TypeScript files
- `npm run lint -- --fix` — Auto-fix ESLint issues
- `npm run type-check` — TypeScript compilation without emitting
- `npm run pre-deploy` — Full pre-deployment safety checks

## TODO/FIXME Management

### Guidelines
1. **TODO**: For planned features or improvements
2. **FIXME**: For known bugs or issues that need immediate attention
3. Include context and ownership when possible

### Example
```typescript
// TODO: Implement user authentication context
// FIXME: Handle edge case when data is null - @username
```

## TypeScript Standards
- Strict mode enabled
- All components must be typed (no `any` types)
- Prefer interfaces over types for object shapes
- Use underscore prefix for intentionally unused variables

## File Naming
- Components: PascalCase (`ProjectForm.tsx`)
- Hooks: camelCase with `use` prefix (`useProjectData.ts`)
- Utils: camelCase (`formatCurrency.ts`)
- Types: PascalCase interfaces (`Project`, `Estimate`)
