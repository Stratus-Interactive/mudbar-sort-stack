/**
 * Ad unit configuration.
 * Test IDs are Google's official test units — always used in dev.
 * Production IDs come from env vars (set per game in EAS secrets).
 */
import { TestIds } from 'react-native-google-mobile-ads';

const IS_DEV = __DEV__;

function prodOrTest(envValue: string, testId: string): string {
  if (IS_DEV) return testId;
  return envValue || testId; // fall back to test IDs if prod not configured
}

export const AD_UNITS = {
  rewarded: prodOrTest(
    process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID ?? '',
    TestIds.REWARDED,
  ),
  interstitial: prodOrTest(
    process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID ?? '',
    TestIds.INTERSTITIAL,
  ),
  banner: prodOrTest(
    process.env.EXPO_PUBLIC_ADMOB_BANNER_ID ?? '',
    TestIds.BANNER,
  ),
};

/**
 * Frequency caps — from the monetization playbook, enforced exactly:
 * - Rewarded: max 2 opportunities per session (preserve perceived value)
 * - Interstitial: max 1 per 3 minutes, only at natural breaks
 */
export const AD_LIMITS = {
  maxRewardedPerSession: 2,
  interstitialMinIntervalMs: 3 * 60 * 1000,
} as const;
