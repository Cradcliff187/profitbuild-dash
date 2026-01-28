
# Fix Contract Preview - Filename Issue

## Root Cause

After investigating both the working Documents page and the broken Quote view preview, I found the issue:

**QuoteForm.tsx line 1179:**
```typescript
setPreviewContractFileName(`${c.contract_number}.docx`);
```

This uses `contract_number` (now the user-entered subcontract number like `testionew#542`) as the filename. The `#` character in the filename breaks Google Docs Viewer because it's a URL fragment identifier.

**Documents page works because:**
It uses the actual `file_name` from the database: `Q-ABF-225001-26_SubcontractorProjectAgreement_2026-01-28.docx` (no special characters).

---

## Fix

Update `QuoteForm.tsx` to use `internal_reference` instead of `contract_number` for the preview filename.

### File: `src/components/QuoteForm.tsx`

**Before (line 1179):**
```typescript
setPreviewContractFileName(`${c.contract_number}.docx`);
```

**After:**
```typescript
setPreviewContractFileName(`${c.internal_reference || c.contract_number || 'Contract'}.docx`);
```

This uses:
1. `internal_reference` (safe auto-generated value like `Q-ABF-225001-26`) if available
2. Falls back to `contract_number` for older contracts
3. Falls back to "Contract" as a last resort

---

## Summary

- **1 file to update**: `src/components/QuoteForm.tsx`
- **Change**: Use `internal_reference` for preview filename instead of user-entered `contract_number`
- **Result**: Preview will work again since the filename won't contain URL-breaking characters like `#`
