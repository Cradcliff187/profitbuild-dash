-- Update gas project name to be simpler
UPDATE public.projects 
SET project_name = 'Gas Expense',
    updated_at = NOW()
WHERE project_number = '001-GAS';