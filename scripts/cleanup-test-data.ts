/**
 * Cleanup script to remove test project data
 * This removes the test project created by create-test-project.ts
 */

import { supabase } from '../src/integrations/supabase/client';

async function cleanupTestData() {
  console.log('Cleaning up test schedule data...');

  // Find test projects
  const { data: testProjects, error: projectsError } = await supabase
    .from('projects')
    .select('id')
    .eq('project_number', 'TEST-SCHEDULE-001')
    .or('project_name.ilike.[TEST]%');

  if (projectsError) {
    console.error('Failed to find test projects:', projectsError);
    return;
  }

  if (!testProjects || testProjects.length === 0) {
    console.log('No test projects found to clean up.');
    return;
  }

  const projectIds = testProjects.map(p => p.id);
  console.log(`Found ${projectIds.length} test project(s) to delete`);

  // Delete estimates (which will cascade delete line items)
  const { error: estimatesError } = await supabase
    .from('estimates')
    .delete()
    .in('project_id', projectIds);

  if (estimatesError) {
    console.error('Failed to delete estimates:', estimatesError);
    return;
  }

  // Delete change orders
  const { error: changeOrdersError } = await supabase
    .from('change_orders')
    .delete()
    .in('project_id', projectIds);

  if (changeOrdersError) {
    console.error('Failed to delete change orders:', changeOrdersError);
    return;
  }

  // Delete projects
  const { error: projectsDeleteError } = await supabase
    .from('projects')
    .delete()
    .in('id', projectIds);

  if (projectsDeleteError) {
    console.error('Failed to delete projects:', projectsDeleteError);
    return;
  }

  console.log('✓ Test data cleaned up successfully');
}

cleanupTestData();

