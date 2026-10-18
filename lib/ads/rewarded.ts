/**
 * Rewarded ad manager.
 * Cap: max 2 rewarded opportunities per session (AD_LIMITS).
 * Ketchapp pattern: rewarded ads are OPT-IN and player-initiated —
 * never forced. The player taps "watch ad for X" — always their choice.
 */
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { AD_UNITS, AD_LIMITS } from './config';
import { Analytics } from '../analytics';

let rewardedAd: RewardedAd | null = null;
let shownThisSession = 0;
let isLoaded = false;

function createAd(): RewardedAd {
  const ad = RewardedAd.createForAdRequest(AD_UNITS.rewarded, {
    requestNonPersonalizedAdsOnly: true,
  });

  ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
    isLoaded = true;
  });
  ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
    pendingReward?.resolve(reward.amount);
    pendingReward = null;
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    isLoaded = false;
    // Preload next
    rewardedAd = createAd();
    rewardedAd.load();
    if (pendingReward) {
      // Closed without earning — resolve with 0
      pendingReward.resolve(0);
      pendingReward = null;
    }
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    isLoaded = false;
    if (pendingReward) {
      pendingReward.reject(new Error('Rewarded ad failed to load'));
      pendingReward = null;
    }
  });

  return ad;
}

interface PendingReward {
  resolve: (amount: number) => void;
  reject: (err: Error) => void;
}
let pendingReward: PendingReward | null = null;

export function initRewardedAds(): void {
  rewardedAd = createAd();
  rewardedAd.load();
}

/** Reset per-session counter. Call on session_start. */
export function resetRewardedSessionCount(): void {
  shownThisSession = 0;
}

/** Whether a rewarded ad can currently be offered (cap not hit, ad loaded). */
export function canShowRewarded(): boolean {
  return shownThisSession < AD_LIMITS.maxRewardedPerSession && isLoaded;
}

/**
 * Show a rewarded ad for the given placement.
 * Resolves with the reward amount (0 if skipped/failed).
 * Rejects if the cap is hit or no ad is loaded.
 */
export function showRewarded(placement: string): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!canShowRewarded()) {
      reject(new Error('Rewarded ad not available (cap or not loaded)'));
      return;
    }
    if (!rewardedAd) {
      reject(new Error('Rewarded ad not initialized'));
      return;
    }
    shownThisSession += 1;
    pendingReward = { resolve, reject };
    rewardedAd.show().catch((e: unknown) => {
      pendingReward = null;
      reject(e instanceof Error ? e : new Error('Rewarded show failed'));
    });
    void Analytics.adWatched(placement, 'rewarded');
  });
}
