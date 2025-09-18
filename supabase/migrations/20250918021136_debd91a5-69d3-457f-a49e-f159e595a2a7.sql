-- Add unique constraint for quote numbers
ALTER TABLE quotes ADD CONSTRAINT unique_quote_number UNIQUE (quote_number);

-- Add check constraint for positive amounts
ALTER TABLE expenses ADD CONSTRAINT positive_amount CHECK (amount > 0);