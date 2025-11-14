# Supabase Migration Status

## Branch: fix-bids-media-workflow-merge

### Migration File
✅ **Created**: `supabase/migrations/20251113160000_add_bid_media_metadata.sql`

This migration adds the following columns to `bid_media` table:
- `latitude` (NUMERIC) - GPS latitude coordinate
- `longitude` (NUMERIC) - GPS longitude coordinate  
- `altitude` (NUMERIC) - GPS altitude in meters
- `location_name` (TEXT) - Human-readable location name
- `taken_at` (TIMESTAMPTZ) - Timestamp when media was captured
- `device_model` (TEXT) - Device model used for capture
- `upload_source` (TEXT) - Source: 'camera', 'gallery', or 'web'

### Database Status
⚠️ **MIGRATION NOT YET APPLIED TO DATABASE**

The migration file exists but needs to be applied to the Supabase database before deployment.

### TypeScript Types Status
✅ **TYPES UPDATED**

The file `src/integrations/supabase/types.ts` has been manually updated to include all new columns. The types match the migration schema exactly.

### Code Status
✅ **CODE READY**

The application code has been updated to use the new fields:
- `src/types/bid.ts` - BidMedia interface includes new fields
- `src/hooks/useBidMediaUpload.ts` - Upload hook handles metadata
- `src/components/BidDocumentUpload.tsx` - TypeScript errors fixed
- `src/pages/BidPhotoCapture.tsx` - Captures GPS and device info
- `src/pages/BidVideoCapture.tsx` - Captures GPS and device info

### Required Actions Before Deployment

1. **Apply Migration to Supabase Database**
   
   **Option A: Supabase Dashboard (RECOMMENDED)**
   - Go to: https://supabase.com/dashboard/project/clsjdxwbsjbhjibvlqbz/sql/new
   - Copy SQL from: `supabase/migrations/20251113160000_add_bid_media_metadata.sql`
   - Paste and execute in SQL Editor
   
   **Option B: Using Helper Script**
   ```bash
   bash scripts/deploy-bid-media-migration.sh
   ```
   
   **Option C: Supabase CLI**
   ```bash
   supabase login
   supabase link --project-ref clsjdxwbsjbhjibvlqbz
   supabase db push
   ```

2. **Verify Migration Applied**
   ```bash
   npm run verify-migration
   ```
   Or manually:
   ```bash
   npx tsx scripts/verify-bid-media-migration.ts
   ```

3. **Verify RLS Policies**
   - Ensure Row Level Security policies allow reading/writing new columns
   - Check that bid_media policies don't block the new fields
   - Test by uploading a document/photo through the app

### Merge Readiness
✅ **CODE IS READY TO MERGE**

The TypeScript errors have been fixed and all code compiles successfully. However, the Supabase migration and type regeneration should be completed before or immediately after merging to main.

### Notes
- The new fields are all optional (nullable), so existing records remain valid
- The migration includes indexes for performance on location and date queries
- Upload source has a CHECK constraint to ensure valid values
