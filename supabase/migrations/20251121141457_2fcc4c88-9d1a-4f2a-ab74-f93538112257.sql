-- Add 5 new expense categories
-- Tools, Software, Vehicle Maintenance, Gas, Meals

-- Add new values to expense_category enum
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'tools';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'software';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'vehicle_maintenance';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'gas';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'meals';