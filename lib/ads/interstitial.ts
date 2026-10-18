/**
 * Interstitial ad manager.
 * Rules (from monetization playbook — enforced exactly):
 * - Max 1 per 3 minutes (AD_LIMITS.interstitialMinIntervalMs)
 * - ONLY at natural breaks (level complete, run end) — never after a fail,
 *   never mid-action. Poor timing cuts D7 retention 10–25%.
 * - Every 5th slot is a house cross-promo ad instead (see crosspromo).
 * - Every 8th slot is a REWARDED cross-promo (higher value, less frequent).
 */
import {
  InterstitialAd,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { AD_UNITS, AD_LIMITS } from './config';
import { Analytics, track } from '../analytics';
import { shouldShowHouseAd, getHouseAdGame } from '../crosspromo/houseAds';
import { shouldShowRewardedCrossPromo } from '../crosspromo/RewardedCrossPromo';

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
 * @returns 'ad' | 'house' | 'rewarded_xpromo' | 'skipped'
 *   - 'house' means the caller should render the cross-promo house ad
 *   - 'rewarded_xpromo' means the caller should render the rewarded
 *     cross-promo card (every 8th slot, higher value)
 */
export function maybeShowInterstitial(
  placement: string,
): 'ad' | 'house' | 'rewarded_xpromo' | 'skipped' {
  const now = Date.now();
  if (now - lastShownAt < AD_LIMITS.interstitialMinIntervalMs) {
    return 'skipped';
  }
  interstitialCounter += 1;

  // Every 8th slot → rewarded cross-promo (exclusive reward incentive)
  // Check before house ads so the 8th slot isn't swallowed by the 5th-slot rule
  // (8 and 5 are coprime — they only collide every 40th slot, which is fine)
  //
  // NOTE: the caller is responsible for fetching the game via
  // getRewardedCrossPromoGame() and tracking via trackRewardedCrossPromoShown().
  // We do NOT fetch here — that would advance the round-robin twice and
  // misattribute the impression.
  if (shouldShowRewardedCrossPromo(interstitialCounter)) {
    lastShownAt = now;
    return 'rewarded_xpromo';
  }

  // Every 5th slot → house cross-promo ad (zero cost, full control)
  if (shouldShowHouseAd(interstitialCounter)) {
    lastShownAt = now;
    // Async — fire and forget; fall through to AdMob if no game configured
    void getHouseAdGame().then((game) => {
      if (game) {
        void track('house_ad_shown', { target_game: game.slug });
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
