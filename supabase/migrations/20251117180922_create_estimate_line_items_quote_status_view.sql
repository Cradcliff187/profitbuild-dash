-- Create reporting views for estimate line items quote status
-- Views: estimate_line_items_quote_status, estimate_quote_status_summary

-- Ensure reporting schema exists
CREATE SCHEMA IF NOT EXISTS reporting;

-- Detailed view showing each line item with its quote status
CREATE OR REPLACE VIEW reporting.estimate_line_items_quote_status AS
SELECT 
  e.id as estimate_id,
  e.estimate_number,
  e.project_id,
  p.project_number,
  p.project_name,
  p.client_name,
  eli.id as line_item_id,
  eli.category,
  eli.description,
  eli.quantity,
  eli.price_per_unit,
  eli.total,
  eli.cost_per_unit,
  eli.total_cost,
  eli.unit,
  eli.sort_order,
  -- Quote counts and status
  COUNT(DISTINCT qli.quote_id) as quote_count,
  COUNT(DISTINCT CASE WHEN q.status = 'accepted' THEN qli.quote_id END) as accepted_quote_count,
  COUNT(DISTINCT CASE WHEN q.status = 'pending' THEN qli.quote_id END) as pending_quote_count,
  COUNT(DISTINCT CASE WHEN q.status = 'rejected' THEN qli.quote_id END) as rejected_quote_count,
  COUNT(DISTINCT CASE WHEN q.status = 'expired' THEN qli.quote_id END) as expired_quote_count,
  -- Quote details as JSONB array
  COALESCE(
    (SELECT jsonb_agg(
      jsonb_build_object(
        'quote_id', q.id,
        'quote_number', q.quote_number,
        'vendor', pay.payee_name,
        'vendor_id', q.payee_id,
        'status', q.status,
        'total_amount', qli.total,
        'date_received', q.date_received,
        'valid_until', q.valid_until
      )
      ORDER BY q.date_received DESC
    )
    FROM quote_line_items qli
    JOIN quotes q ON q.id = qli.quote_id
    LEFT JOIN payees pay ON pay.id = q.payee_id
    WHERE qli.estimate_line_item_id = eli.id),
    '[]'::jsonb
  ) as quote_details,
  -- Flags
  (COUNT(DISTINCT qli.quote_id) > 0) as has_quotes,
  (COUNT(DISTINCT CASE WHEN q.status = 'accepted' THEN qli.quote_id END) > 0) as has_accepted_quote
FROM estimates e
JOIN projects p ON p.id = e.project_id
JOIN estimate_line_items eli ON eli.estimate_id = e.id
LEFT JOIN quote_line_items qli ON qli.estimate_line_item_id = eli.id
LEFT JOIN quotes q ON q.id = qli.quote_id
WHERE p.project_number NOT IN ('SYS-000', '000-UNASSIGNED')
GROUP BY e.id, e.estimate_number, e.project_id, p.project_number, p.project_name, p.client_name,
         eli.id, eli.category, eli.description, eli.quantity, eli.price_per_unit, 
         eli.total, eli.cost_per_unit, eli.total_cost, eli.unit, eli.sort_order;

-- Summary view aggregating quote status per estimate
CREATE OR REPLACE VIEW reporting.estimate_quote_status_summary AS
SELECT 
  estimate_id,
  estimate_number,
  project_id,
  project_number,
  project_name,
  client_name,
  COUNT(DISTINCT line_item_id) as total_line_items,
  COUNT(DISTINCT CASE WHEN has_quotes THEN line_item_id END) as line_items_with_quotes,
  COUNT(DISTINCT CASE WHEN NOT has_quotes THEN line_item_id END) as line_items_without_quotes,
  COUNT(DISTINCT CASE WHEN has_accepted_quote THEN line_item_id END) as line_items_with_accepted_quotes,
  CASE 
    WHEN COUNT(DISTINCT line_item_id) > 0 
    THEN ROUND(
      (COUNT(DISTINCT CASE WHEN has_quotes THEN line_item_id END)::numeric / 
       COUNT(DISTINCT line_item_id)::numeric) * 100, 
      1
    )
    ELSE 0
  END as quote_coverage_percent,
  SUM(quote_count) as total_quotes_received,
  SUM(accepted_quote_count) as total_accepted_quotes,
  SUM(pending_quote_count) as total_pending_quotes,
  SUM(rejected_quote_count) as total_rejected_quotes,
  SUM(expired_quote_count) as total_expired_quotes,
  SUM(total) as total_estimate_amount,
  SUM(total_cost) as total_estimate_cost
FROM reporting.estimate_line_items_quote_status
GROUP BY estimate_id, estimate_number, project_id, project_number, project_name, client_name;

-- Grant access to authenticated users
GRANT SELECT ON reporting.estimate_line_items_quote_status TO authenticated;
GRANT SELECT ON reporting.estimate_quote_status_summary TO authenticated;

