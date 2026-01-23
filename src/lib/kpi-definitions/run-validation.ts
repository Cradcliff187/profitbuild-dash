#!/usr/bin/env tsx

/**
 * KPI Validation Runner
 *
 * Runs KPI validation and exits with appropriate code.
 * Used by CI/CD pipelines and manual validation.
 */

import { runValidation } from './validation';

console.log('🔍 Running KPI Definitions Validation...\n');

runValidation();