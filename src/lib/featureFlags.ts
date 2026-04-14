/**
 * Feature flag system for safe rollout of new features
 * Flags can be controlled via environment variables or database
 */

export interface FeatureFlags {
  scheduleView: boolean;
  aiaBilling: boolean;
}

// Default flags - shipped features default ON
const defaultFlags: FeatureFlags = {
  scheduleView: true,
  aiaBilling: true,
};

// Check environment variables
const getEnvFlags = (): Partial<FeatureFlags> => {
  return {
    // Shipped on main: on unless host sets VITE_FEATURE_SCHEDULE=false
    // (Lovable strips VITE_* vars, so we must default ON, not require opt-in)
    scheduleView: import.meta.env.VITE_FEATURE_SCHEDULE !== "false",
    // Shipped on main: on unless host sets VITE_FEATURE_AIA_BILLING=false
    aiaBilling: import.meta.env.VITE_FEATURE_AIA_BILLING !== "false",
  };
};

// Merge with defaults
export const featureFlags: FeatureFlags = {
  ...defaultFlags,
  ...getEnvFlags(),
};

/**
 * Check if a feature is enabled
 */
export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  return featureFlags[feature] ?? false;
};
