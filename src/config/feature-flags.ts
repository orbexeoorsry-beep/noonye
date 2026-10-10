/**
 * Noon Learning Feature Flags Configuration
 *
 * Central configuration file to enable or disable features across the application.
 */

export type FeatureFlagKey =
  | 'localBooksEnabled'
  | 'lessonsEnabled'
  | 'lessonTestsEnabled'
  | 'lessonSummaryEnabled'
  | 'selectionEnabled'
  | 'aiAssistantEnabled'
  | 'guidedMathEnabled'
  | 'scienceAnalysisEnabled'
  | 'englishLanguageEnabled';

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export const featureFlags: FeatureFlags = {
  localBooksEnabled: true,
  lessonsEnabled: true,
  lessonTestsEnabled: true,
  lessonSummaryEnabled: false,
  selectionEnabled: false,
  aiAssistantEnabled: false,
  guidedMathEnabled: false,
  scienceAnalysisEnabled: false,
  englishLanguageEnabled: true,
};

/**
 * Helper to check if a given feature flag is enabled.
 * Example: isFeatureEnabled('lessonSummaryEnabled')
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return Boolean(featureFlags[flag]);
}

export default featureFlags;
