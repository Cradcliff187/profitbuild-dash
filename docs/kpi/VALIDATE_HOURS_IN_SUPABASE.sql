-- =============================================================================
-- RUN THIS IN SUPABASE SQL EDITOR (Dashboard → SQL Editor → New query)
-- Copy-paste and run to get FACTS about expenses and weekly_labor_hours.
-- =============================================================================

-- 1) List all columns on public.expenses (order and names)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'expenses'
ORDER BY ordinal_position;

-- 2) Does expenses have an "hours" column? (expect 0 or 1 row)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'hours';

-- 3) Does expenses have a "gross_hours" column? (expect 0 or 1 row)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'gross_hours';

-- 4) Columns of weekly_labor_hours view (does it have total_hours and gross_hours?)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'weekly_labor_hours'
ORDER BY ordinal_position;

-- 5) Sample one row from weekly_labor_hours (if view exists and has data)
-- SELECT * FROM public.weekly_labor_hours LIMIT 1;
