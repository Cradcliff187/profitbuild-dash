/**
 * Construction-specific sequencing logic and validation
 * Based on industry standards and building code requirements
 */

export interface ConstructionPhase {
  /** Tasks that must be completed before this phase */
  after?: string[];
  /** Tasks that must wait for this phase */
  before?: string[];
  /** Typical duration in days */
  typicalDuration?: number;
  /** Whether this phase requires inspection */
  requiresInspection?: boolean;
  /** Critical keywords to identify this phase */
  keywords: string[];
}

/**
 * Standard construction sequence dependencies
 * Based on typical residential/commercial construction workflow
 */
export const CONSTRUCTION_SEQUENCES: Record<string, ConstructionPhase> = {
  // Foundation Phase
  foundation: {
    before: ['framing', 'roofing', 'rough_electrical', 'rough_plumbing', 'drywall'],
    typicalDuration: 7,
    requiresInspection: true,
    keywords: ['foundation', 'footing', 'slab', 'basement', 'concrete pour']
  },
  
  // Structural Phase
  framing: {
    after: ['foundation'],
    before: ['roofing', 'rough_electrical', 'rough_plumbing', 'insulation', 'drywall'],
    typicalDuration: 14,
    requiresInspection: true,
    keywords: ['framing', 'frame', 'studs', 'joists', 'trusses', 'structural']
  },
  
  roofing: {
    after: ['framing'],
    before: ['drywall', 'insulation', 'interior'],
    typicalDuration: 5,
    keywords: ['roof', 'roofing', 'shingles', 'flashing']
  },
  
  // Rough-In Phase
  rough_electrical: {
    after: ['framing'],
    before: ['drywall', 'insulation'],
    typicalDuration: 5,
    requiresInspection: true,
    keywords: ['electrical rough', 'rough electric', 'wiring', 'rough-in electric']
  },
  
  rough_plumbing: {
    after: ['framing'],
    before: ['drywall', 'insulation'],
    typicalDuration: 5,
    requiresInspection: true,
    keywords: ['plumbing rough', 'rough plumb', 'pipes', 'rough-in plumb']
  },
  
  hvac_rough: {
    after: ['framing'],
    before: ['drywall', 'insulation'],
    typicalDuration: 5,
    keywords: ['hvac rough', 'ductwork', 'rough-in hvac', 'heating']
  },
  
  // Insulation & Drywall Phase
  insulation: {
    after: ['framing', 'rough_electrical', 'rough_plumbing', 'hvac_rough', 'roofing'],
    before: ['drywall'],
    typicalDuration: 3,
    requiresInspection: true,
    keywords: ['insulation', 'insulate']
  },
  
  drywall: {
    after: ['framing', 'rough_electrical', 'rough_plumbing', 'hvac_rough', 'insulation', 'roofing'],
    before: ['paint', 'flooring', 'trim', 'cabinets'],
    typicalDuration: 10,
    keywords: ['drywall', 'sheetrock', 'wallboard']
  },
  
  // Finish Phase
  paint: {
    after: ['drywall'],
    before: ['flooring', 'cabinets', 'fixtures', 'trim'],
    typicalDuration: 5,
    keywords: ['paint', 'painting', 'primer']
  },
  
  flooring: {
    after: ['drywall', 'paint'],
    typicalDuration: 5,
    keywords: ['flooring', 'floor', 'hardwood', 'tile', 'carpet', 'vinyl']
  },
  
  cabinets: {
    after: ['drywall', 'paint'],
    before: ['countertops', 'fixtures'],
    typicalDuration: 3,
    keywords: ['cabinet', 'cabinetry']
  },
  
  countertops: {
    after: ['cabinets'],
    before: ['fixtures'],
    typicalDuration: 2,
    keywords: ['countertop', 'counter top', 'granite', 'quartz']
  },
  
  trim: {
    after: ['drywall', 'paint', 'flooring'],
    typicalDuration: 5,
    keywords: ['trim', 'baseboard', 'molding', 'crown']
  },
  
  // Final Fixtures
  fixtures: {
    after: ['paint', 'flooring', 'countertops'],
    typicalDuration: 3,
    keywords: ['fixture', 'faucet', 'light fixture', 'appliance']
  },
  
  final_electrical: {
    after: ['paint', 'drywall'],
    typicalDuration: 2,
    requiresInspection: true,
    keywords: ['electrical final', 'final electric', 'switches', 'outlets']
  },
  
  final_plumbing: {
    after: ['paint', 'drywall', 'countertops'],
    typicalDuration: 2,
    requiresInspection: true,
    keywords: ['plumbing final', 'final plumb']
  }
};

/**
 * Identify which construction phase a task belongs to based on its description
 */
export function identifyConstructionPhase(taskDescription: string): string | null {
  const lowerDesc = taskDescription.toLowerCase();
  
  for (const [phase, config] of Object.entries(CONSTRUCTION_SEQUENCES)) {
    if (config.keywords.some(keyword => lowerDesc.includes(keyword))) {
      return phase;
    }
  }
  
  return null;
}

/**
 * Check if task A should logically come before task B
 * Returns true if there's a sequencing violation
 */
export function isSequenceViolation(
  taskA: { name: string; start: string },
  taskB: { name: string; start: string }
): { violation: boolean; reason?: string } {
  const phaseA = identifyConstructionPhase(taskA.name);
  const phaseB = identifyConstructionPhase(taskB.name);
  
  if (!phaseA || !phaseB) {
    return { violation: false };
  }
  
  const configA = CONSTRUCTION_SEQUENCES[phaseA];
  const configB = CONSTRUCTION_SEQUENCES[phaseB];
  
  const dateA = new Date(taskA.start);
  const dateB = new Date(taskB.start);
  
  // Check if A should come before B but is scheduled after
  if (configA.before?.includes(phaseB) && dateA > dateB) {
    return {
      violation: true,
      reason: `${phaseA} typically must be completed before ${phaseB}`
    };
  }
  
  // Check if A should come after B but is scheduled before
  if (configA.after?.includes(phaseB) && dateA < dateB) {
    return {
      violation: true,
      reason: `${phaseA} typically requires ${phaseB} to be completed first`
    };
  }
  
  return { violation: false };
}

/**
 * Get suggested dependencies for a task based on construction sequencing
 */
export function getSuggestedDependencies(
  task: { name: string },
  allTasks: Array<{ id: string; name: string; start: string }>
): Array<{ taskId: string; reason: string }> {
  const phase = identifyConstructionPhase(task.name);
  if (!phase) return [];
  
  const config = CONSTRUCTION_SEQUENCES[phase];
  if (!config.after) return [];
  
  const suggestions: Array<{ taskId: string; reason: string }> = [];
  
  for (const requiredPhase of config.after) {
    const requiredTask = allTasks.find(t => 
      identifyConstructionPhase(t.name) === requiredPhase
    );
    
    if (requiredTask) {
      suggestions.push({
        taskId: requiredTask.id,
        reason: `${phase} typically requires ${requiredPhase} to be completed first`
      });
    }
  }
  
  return suggestions;
}

/**
 * Check if a task requires inspection based on its phase
 */
export function requiresInspection(taskDescription: string): boolean {
  const phase = identifyConstructionPhase(taskDescription);
  if (!phase) return false;
  
  return CONSTRUCTION_SEQUENCES[phase].requiresInspection || false;
}

/**
 * Get typical duration for a construction phase
 */
export function getTypicalDuration(taskDescription: string): number | null {
  const phase = identifyConstructionPhase(taskDescription);
  if (!phase) return null;
  
  return CONSTRUCTION_SEQUENCES[phase].typicalDuration || null;
}

