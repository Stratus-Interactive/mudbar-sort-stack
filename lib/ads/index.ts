/**
 * Ads module entry point.
 * Initializes all ad formats. Respects "Remove Ads" purchase —
 * when the player owns it, no ads are shown at all.
 */
import { MobileAds } from 'react-native-google-mobile-ads';
import { initRewardedAds, resetRewardedSessionCount } from './rewarded';
import { initInterstitialAds } from './interstitial';
import { hasRemoveAds } from '../iap';

let initialized = false;

export async function initAds(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    await MobileAds().initialize();
  } catch (e) {
    console.warn('[ads] MobileAds init failed', e);
    return;
  }
  // Skip ad loading entirely for remove-ads owners
  if (await hasRemoveAds()) {
    console.log('[ads] Remove Ads owned — skipping ad init');
    return;
  }
  initRewardedAds();
  initInterstitialAds();
  resetRewardedSessionCount();
}

export { canShowRewarded, showRewarded } from './rewarded';
export { maybeShowInterstitial } from './interstitial';
export { AdBanner } from './Banner';
