/**
 * Feature Flags Manager for Closed Beta and Experimental Features
 * Local-first, privacy-respecting, zero external network dependency.
 */

export interface FeatureFlags {
  experimental_webcodecs_worker: boolean; // Offload WebCodecs encoding to dedicated Web Worker
  experimental_ai_voiceover: boolean;     // AI text-to-speech voiceover generator
  experimental_4k_60fps: boolean;         // Allow 4K 60fps export on lower-end hardware
  beta_guided_tasks: boolean;             // Closed Beta 5 guided onboarding tasks
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  experimental_webcodecs_worker: false,
  experimental_ai_voiceover: false,
  experimental_4k_60fps: false,
  beta_guided_tasks: true
};

const STORAGE_KEY = 'clipforge_feature_flags';

export function getFeatureFlags(): FeatureFlags {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_FEATURE_FLAGS };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_FEATURE_FLAGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_FEATURE_FLAGS,
      ...parsed
    };
  } catch {
    return { ...DEFAULT_FEATURE_FLAGS };
  }
}

export function setFeatureFlag(flag: keyof FeatureFlags, enabled: boolean): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  const current = getFeatureFlags();
  current[flag] = enabled;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('Failed to save feature flag:', err);
  }
}

export function resetFeatureFlags(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return getFeatureFlags()[flag] ?? false;
}

