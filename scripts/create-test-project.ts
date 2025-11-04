/**
 * Test script to create a dummy project for schedule testing
 * This ensures we don't test on production data
 */

import { supabase } from '../src/integrations/supabase/client';

async function createTestProject() {
  console.log('Creating test project for schedule feature...');

  // Get first company (or use authenticated user's company)
  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (companyError || !companies) {
    console.error('Failed to get company. Make sure you are authenticated and have a company.');
    console.error('Error:', companyError);
    return;
  }

  const companyId = companies.id;
  console.log('Using company ID:', companyId);

  // Create test project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      project_name: '[TEST] Schedule Feature Test',
      project_number: 'TEST-SCHEDULE-001',
      client_name: 'Test Client - DO NOT USE',
      status: 'approved',
      project_type: 'construction_project',
      company_id: companyId,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days
    })
    .select()
    .single();

  if (projectError) {
    console.error('Failed to create project:', projectError);
    return;
  }

  console.log('✓ Test project created:', project.id);

  // Create test estimate
  const { data: estimate, error: estimateError } = await supabase
    .from('estimates')
    .insert({
      project_id: project.id,
      estimate_number: 'EST-TEST-001',
      date_created: new Date().toISOString().split('T')[0],
      total_amount: 50000,
      status: 'approved',
    })
    .select()
    .single();

  if (estimateError) {
    console.error('Failed to create estimate:', estimateError);
    return;
  }

  console.log('✓ Test estimate created:', estimate.id);

  // Create test line items
  const lineItems = [
    { category: 'labor_internal', description: 'Site Preparation', quantity: 5, cost_per_unit: 1000 },
    { category: 'permits', description: 'Building Permits', quantity: 1, cost_per_unit: 2000 },
    { category: 'subcontractors', description: 'Framing', quantity: 10, cost_per_unit: 1500 },
    { category: 'subcontractors', description: 'Electrical', quantity: 8, cost_per_unit: 1200 },
    { category: 'materials', description: 'Drywall Materials', quantity: 100, cost_per_unit: 50 },
  ];

  const { error: lineItemsError } = await supabase
    .from('estimate_line_items')
    .insert(
      lineItems.map((item, index) => ({
        estimate_id: estimate.id,
        ...item,
        sort_order: index,
      }))
    );

  if (lineItemsError) {
    console.error('Failed to create line items:', lineItemsError);
    return;
  }

  console.log('✓ Test line items created');
  console.log('\nTest project ready!');
  console.log(`Project ID: ${project.id}`);
  console.log(`Navigate to: /projects/${project.id}`);
  console.log('\nTo delete test data, run: npm run cleanup-test-data');
}

createTestProject();

