/**
 * Interstitial ad manager.
 * Rules (from monetization playbook — enforced exactly):
 * - Max 1 per 3 minutes (AD_LIMITS.interstitialMinIntervalMs)
 * - ONLY at natural breaks (level complete, run end) — never after a fail,
 *   never mid-action. Poor timing cuts D7 retention 10–25%.
 * - Every 5th slot is a house cross-promo ad instead (see crosspromo).
 */
import {
  InterstitialAd,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { AD_UNITS, AD_LIMITS } from './config';
import { Analytics, track } from '../analytics';
import { shouldShowHouseAd, getHouseAdGame } from '../crosspromo/houseAds';
import type { SisterGame } from '../crosspromo/config';

let interstitialAd: InterstitialAd | null = null;
let isLoaded = false;
let lastShownAt = 0;
let interstitialCounter = 0;

function createAd(): InterstitialAd {
  const ad = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, {
    requestNonPersonalizedAdsOnly: true,
  });
  ad.addAdEventListener(AdEventType.LOADED, () => {
    isLoaded = true;
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    isLoaded = false;
    interstitialAd = createAd();
    interstitialAd.load();
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    isLoaded = false;
  });
  return ad;
}

export function initInterstitialAds(): void {
  interstitialAd = createAd();
  interstitialAd.load();
}

/**
 * Attempt to show an interstitial at a natural break.
 * @param placement e.g. "level_complete", "run_end"
 * @returns 'ad' | 'house' | 'skipped' — 'house' means the caller should
 *   render the cross-promo house ad instead of an AdMob interstitial.
 */
export function maybeShowInterstitial(
  placement: string,
  onHouseAd?: (game: SisterGame) => void,
): 'ad' | 'house' | 'skipped' {
  const now = Date.now();
  if (now - lastShownAt < AD_LIMITS.interstitialMinIntervalMs) {
    return 'skipped';
  }
  interstitialCounter += 1;

  // Every 5th slot → house cross-promo ad (zero cost, full control).
  // Only take the house slot when the caller wired a UI handler for it;
  // otherwise fall through to AdMob — never silently drop a revenue slot.
  if (shouldShowHouseAd(interstitialCounter) && onHouseAd) {
    lastShownAt = now;
    void getHouseAdGame().then((game) => {
      if (game) {
        void track('house_ad_shown', { target_game: game.slug });
        onHouseAd(game);
      }
    });
    return 'house';
  }

  if (!isLoaded || !interstitialAd) {
    return 'skipped';
  }
  lastShownAt = now;
  interstitialAd.show().catch(() => {
    /* ad show failures are silent — never block gameplay */
  });
  void Analytics.adWatched(placement, 'interstitial');
  return 'ad';
}
