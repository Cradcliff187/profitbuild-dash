export interface InternalLaborRates {
  billing_rate_per_hour: number;
  actual_cost_per_hour: number;
  effective_date: string;
}

export interface CompanySetting {
  id: string;
  setting_key: string;
  setting_value: Record<string, any>;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface LaborRateSettings extends CompanySetting {
  setting_key: 'internal_labor_rates';
  setting_value: InternalLaborRates;
}
