/**
 * Feature flag system for safe rollout of new features
 * Flags can be controlled via environment variables or database
 */

export interface FeatureFlags {
  scheduleView: boolean;
  scheduleWarnings: boolean;
  scheduleDependencies: boolean;
}

// Default flags - all OFF initially
const defaultFlags: FeatureFlags = {
  scheduleView: false,
  scheduleWarnings: false,
  scheduleDependencies: false,
};

// Check environment variables
const getEnvFlags = (): Partial<FeatureFlags> => {
  return {
    scheduleView: import.meta.env.VITE_FEATURE_SCHEDULE === 'true',
    scheduleWarnings: import.meta.env.VITE_FEATURE_SCHEDULE_WARNINGS === 'true',
    scheduleDependencies: import.meta.env.VITE_FEATURE_SCHEDULE_DEPS === 'true',
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

/**
 * For development: Enable all schedule features
 */
export const enableScheduleFeatures = () => {
  if (import.meta.env.DEV) {
    featureFlags.scheduleView = true;
    featureFlags.scheduleWarnings = true;
    featureFlags.scheduleDependencies = true;
  }
};

/**
 * For emergencies: Disable all schedule features
 */
export const disableScheduleFeatures = () => {
  featureFlags.scheduleView = false;
  featureFlags.scheduleWarnings = false;
  featureFlags.scheduleDependencies = false;
};

