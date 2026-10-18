/**
 * Analytics via PostHog.
 * Standardized events across all MudBar titles enable portfolio-level
 * LTV comparison — the same event names and property shapes everywhere.
 */
import { PostHog } from 'posthog-react-native';
import { CONFIG } from '../config';
import { getPlayerId } from '../crosspromo/playerId';

let posthog: PostHog | null = null;
let initialized = false;

export function initAnalytics(): void {
  if (initialized) return;
  initialized = true;
  if (!CONFIG.posthogKey) {
    console.log('[analytics] No PostHog key — running in no-op mode');
    return;
  }
  posthog = new PostHog(CONFIG.posthogKey, {
    host: 'https://us.i.posthog.com',
  });
}

/** Base properties attached to every event. */
async function baseProps(): Promise<Record<string, string>> {
  return {
    game: CONFIG.slug,
    player_id: await getPlayerId(),
  };
}

export async function track(
  event: string,
  props: Record<string, string | number | boolean> = {},
): Promise<void> {
  if (!posthog) return;
  try {
    posthog.capture(event, { ...(await baseProps()), ...props });
  } catch (e) {
    console.warn('[analytics] capture failed', e);
  }
}

// ── Standardized portfolio events ──────────────────────────────────

export const Analytics = {
  sessionStart: () => track('session_start'),
  levelComplete: (level: number, score: number) =>
    track('level_complete', { level, score }),
  levelFailed: (level: number, score: number) =>
    track('level_failed', { level, score }),
  adWatched: (placement: string, adType: 'rewarded' | 'interstitial' | 'banner') =>
    track('ad_watched', { placement, ad_type: adType }),
  iapViewed: (productId: string) => track('iap_viewed', { product_id: productId }),
  iapPurchased: (productId: string, priceUsd: number) =>
    track('iap_purchased', { product_id: productId, price_usd: priceUsd }),
  crossPromoTap: (targetGame: string) =>
    track('cross_promo_tap', { target_game: targetGame }),
  dailyRewardClaimed: (day: number, streak: number) =>
    track('daily_reward_claimed', { day, streak }),
  gameOver: (score: number, best: number) =>
    track('game_over', { score, best }),
};
