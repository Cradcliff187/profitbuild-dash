-- Add markup and cost tracking columns to estimates table
ALTER TABLE public.estimates 
ADD COLUMN default_markup_percent NUMERIC(5,2) DEFAULT 15.0,
ADD COLUMN target_margin_percent NUMERIC(5,2) DEFAULT 20.0,
ADD COLUMN total_cost NUMERIC(15,2) DEFAULT 0;