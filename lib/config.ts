/**
 * Central game configuration.
 * Each game clones this template and overrides ONLY this file
 * (plus assets and the game screen) — everything else is shared.
 *
 * Brand: MudBar Entertainment (NOT Stratus Interactive — deliberate
 * separation to protect the Stratus reputation).
 */

import gameJson from '../game.config.json';

export interface GameConfig {
  /** Display name, e.g. "Grime Busters" */
  name: string;
  /** Expo slug, e.g. "grime-busters" */
  slug: string;
  /** iOS bundle ID, e.g. "com.mudbarentertainment.grimebusters" */
  iosBundleId: string;
  /** Android package, e.g. "com.mudbarentertainment.grimebusters" */
  androidPackage: string;
  /** URL scheme for deep links, e.g. "mudbar-grimebusters" */
  urlScheme: string;
  /** One-line pitch shown in cross-promo cards */
  tagline: string;
  /** RevenueCat API keys (per platform) */
  revenueCat: {
    ios: string;
    android: string;
  };
  /** AdMob app IDs (per platform) — override with real IDs at launch */
  admob: {
    ios: string;
    android: string;
  };
  /** PostHog project key */
  posthogKey: string;
  /** Remote URL for cross-promo game list JSON */
  crossPromoUrl: string;
}

export const CONFIG: GameConfig = {
  ...(gameJson as Omit<GameConfig, 'revenueCat' | 'admob' | 'posthogKey' | 'crossPromoUrl'>),
  revenueCat: {
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  },
  admob: {
    ios: process.env.EXPO_PUBLIC_ADMOB_IOS_ID ?? '',
    android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_ID ?? '',
  },
  posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
  crossPromoUrl:
    process.env.EXPO_PUBLIC_CROSS_PROMO_URL ?? gameJson.crossPromoUrl,
};

export const COMPANY_NAME = 'MudBar Entertainment';
