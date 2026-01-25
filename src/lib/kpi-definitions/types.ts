/**
 * KPI Definition Types
 * 
 * Single source of truth for all KPI measure definitions.
 * Used by both KPIGuide.tsx (UI) and AI Report Assistant (edge function).
 * 
 * @version 2.0.0
 * @lastUpdated 2026-01-23
 */

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Where the KPI value comes from
 */
export type KPISource = 
  | 'database'      // Stored or calculated in PostgreSQL
  | 'frontend'      // Calculated in React/TypeScript
  | 'view'          // Calculated in a database view
  | 'deprecated';   // No longer used, kept for reference

/**
 * Data type for formatting and validation
 */
export type KPIDataType = 
  | 'currency'      // Dollar amounts
  | 'percent'       // Percentages (0-100)
  | 'number'        // Plain numbers (counts, hours)
  | 'boolean'       // True/false flags
  | 'text'          // String values
  | 'date'          // Date values
  | 'enum';         // Enumerated values

/**
 * Which domain this KPI belongs to
 */
export type KPIDomain = 
  | 'project'
  | 'estimate'
  | 'quote'
  | 'expense'
  | 'revenue'
  | 'change_order'
  | 'work_order'
  | 'time_entry'
  | 'payee'
  | 'training'
  | 'deprecated';

/**
 * Core KPI measure definition
 */
export interface KPIMeasure {
  /** Unique identifier (snake_case) */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Where the value comes from */
  source: KPISource;
  
  /** Database field path (table.column or view.column) */
  field: string;
  
  /** How it's calculated (human-readable formula) */
  formula: string;
  
  /** Data type for formatting */
  dataType: KPIDataType;
  
  /** Which business domain */
  domain: KPIDomain;
  
  /** Where this is displayed in the UI */
  whereUsed: string;
  
  /** Additional context for understanding */
  notes?: string;
  
  /** Alternative names users might use (for AI matching) */
  aliases?: string[];
  
  /** Related KPIs (for AI context) */
  relatedTo?: string[];
  
  /** If deprecated, what replaces it */
  replacedBy?: string;
  
  /** When to prefer this over similar metrics */
  preferWhen?: string;
  
  /** When NOT to use this metric */
  avoidWhen?: string;
}

// =============================================================================
// SEMANTIC MAPPING TYPES
// =============================================================================

/**
 * Maps business concepts to specific KPIs
 * Helps AI understand "profit" → actual_margin
 */
export interface SemanticMapping {
  /** Business term users might say */
  concept: string;
  
  /** Alternative phrases for this concept */
  aliases: string[];
  
  /** What this concept actually means */
  description: string;
  
  /** KPI IDs that relate to this concept */
  kpiIds: string[];
  
  /** Default/preferred KPI for this concept */
  defaultKpiId: string;
  
  /** Context for when to use each option */
  disambiguation?: Record<string, string>;
}

// =============================================================================
// BUSINESS RULE TYPES
// =============================================================================

/**
 * Critical business rules the AI must follow
 */
export interface BusinessRule {
  /** Unique identifier */
  id: string;
  
  /** Rule category */
  category: 'data_source' | 'calculation' | 'filtering' | 'terminology' | 'security';
  
  /** The rule itself */
  rule: string;
  
  /** Why this rule exists */
  reason: string;
  
  /** Example of correct behavior */
  correctExample?: string;
  
  /** Example of incorrect behavior to avoid */
  incorrectExample?: string;
  
  /** Severity if violated */
  severity: 'critical' | 'important' | 'advisory';
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export interface ValidationIssue {
  type: 'duplicate' | 'inconsistent' | 'deprecated' | 'missing' | 'orphaned';
  severity: 'error' | 'warning' | 'info';
  kpiId?: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  stats: {
    totalKpis: number;
    bySource: Record<KPISource, number>;
    byDomain: Record<KPIDomain, number>;
    duplicatesFound: number;
    deprecatedCount: number;
  };
}

// =============================================================================
// AI CONTEXT TYPES
// =============================================================================

/**
 * Structured context for AI prompts
 */
export interface AIKPIContext {
  /** Organized KPIs by domain */
  kpisByDomain: Record<KPIDomain, KPIMeasure[]>;
  
  /** Semantic mappings for business terms */
  semanticMappings: SemanticMapping[];
  
  /** Critical business rules */
  businessRules: BusinessRule[];
  
  /** Preferred data sources (views over tables) */
  preferredSources: Record<string, string>;
  
  /** Generated timestamp */
  generatedAt: string;
  
  /** Version of definitions used */
  version: string;
}

// =============================================================================
// FEW-SHOT EXAMPLE TYPES
// =============================================================================

export interface FewShotExample {
  /** User's natural language question */
  question: string;
  
  /** AI's reasoning process */
  reasoning: string;
  
  /** The SQL query to generate */
  sql: string;
  
  /** Which KPIs are used */
  kpisUsed: string[];
  
  /** Category of question */
  category: 'aggregation' | 'filtering' | 'comparison' | 'time_based' | 'lookup';
  
  /** Response mode - simple for direct answers, analytical for insights */
  responseMode?: 'simple' | 'analytical';
}
