# Code Quality Standards

This document outlines the code quality standards and automated cleanup processes for the project.

## Import Management

### Unused Imports
- **Detection**: Automated scanning identifies unused imports across TypeScript/React files
- **Cleanup**: Use `src/utils/codeCleanup.ts` utilities for automated removal
- **Prevention**: ESLint rules enforce unused import warnings

### Import Organization
1. **External libraries** (React, third-party packages)
2. **Internal UI components** (@/components/ui/*)
3. **Internal components** (@/components/*)
4. **Hooks and utilities** (@/hooks/*, @/utils/*)
5. **Types** (@/types/*)
6. **Constants and config**

## Code Quality Checks

### Automated Scanning
The project includes automated scanning for:
- Unused imports
- TODO/FIXME comments
- Incomplete code patterns
- Type definition issues

### Usage
```typescript
import { generateCodeQualityReport } from '@/utils/codeCleanup';

// Generate comprehensive report
const report = generateCodeQualityReport(process.cwd());
console.log(report);
```

## ESLint Configuration

### Unused Variables/Imports
```javascript
"@typescript-eslint/no-unused-vars": ["warn", { 
  "argsIgnorePattern": "^_",
  "varsIgnorePattern": "^_",
  "ignoreRestSiblings": true 
}],
"@typescript-eslint/no-unused-imports": "warn"
```

### Best Practices
- Use underscore prefix for intentionally unused variables: `_unusedParam`
- Enable `ignoreRestSiblings` for object destructuring patterns
- Warnings instead of errors for gradual cleanup

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

## Incomplete Code Patterns

### Common Issues
- Dangling `else` statements
- Incomplete interface definitions
- Unfinished conditional blocks

### Detection
The cleanup utility automatically scans for:
- `} else someText` patterns
- `{ propertyName?` without closing
- Other incomplete syntax patterns

## Cleanup Workflow

### Manual Cleanup
```bash
# Generate quality report
npm run code-quality-check

# Fix specific files
npm run cleanup-imports src/pages/Dashboard.tsx
```

### Automated Cleanup
1. Run ESLint with auto-fix: `npm run lint -- --fix`
2. Use cleanup utilities for bulk operations
3. Integrate with CI/CD for quality gates

## File Structure Standards

### Component Organization
```
src/
├── components/
│   ├── ui/           # Reusable UI components
│   ├── forms/        # Form-specific components
│   └── layout/       # Layout components
├── pages/            # Page components
├── hooks/            # Custom React hooks
├── utils/            # Utility functions
├── types/            # TypeScript type definitions
└── docs/             # Documentation
```

### Naming Conventions
- **Components**: PascalCase (`UserProfile.tsx`)
- **Hooks**: camelCase with `use` prefix (`useUserData.ts`)
- **Utils**: camelCase (`formatCurrency.ts`)
- **Types**: PascalCase (`UserProfile.ts`)

## Quality Gates

### Pre-commit
- ESLint checks
- TypeScript compilation
- Import organization

### CI/CD
- Full quality report generation
- Unused import detection
- Code coverage requirements

## Maintenance Schedule

### Weekly
- Review TODO/FIXME comments
- Clean up unused imports
- Update type definitions

### Monthly
- Full codebase quality audit
- Update ESLint rules if needed
- Documentation updates

## Tools and Utilities

### Available Scripts
- `generateCodeQualityReport()`: Comprehensive quality analysis
- `detectUnusedImports()`: Find unused imports in file
- `removeUnusedImports()`: Automatically clean imports
- `detectCodeQualityIssues()`: Find various code issues

### Integration
- ESLint configuration in `eslint.config.js`
- Cleanup utilities in `src/utils/codeCleanup.ts`
- Quality documentation in `src/docs/CODE_QUALITY.md`