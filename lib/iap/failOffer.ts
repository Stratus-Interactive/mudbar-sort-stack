/**
 * Fail-triggered IAP offers — conversion intent peaks right after
 * a close loss. "So close! Revive + 200 coins for $0.99"
 *
 * Rules (from playbook — enforced exactly):
 * - ONLY after close losses (per-game "wasClose" definitions)
 * - Max 1/day — this is critical
 * - Never before session 5 (don't monetize discovery)
 * - Never if the player has purchased anything
 * - Alternate: revive ($0.99) vs remove-ads ($4.99) — every 3rd is remove-ads
 *
 * "Close" definitions per game:
 * - Grime Busters: 3-star threshold barely met (hard level complete)
 * - Sort Stack: deadlock after 50+ moves
 * - Neon Swerve: missed gate within 15% of personal best
 * - Merge Minis: board-full game over after wave 10+
 * - Bounce Buddies: fell within 15% of personal best
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { track } from '../analytics';
import { hasRemoveAds } from './index';
import { PRODUCTS } from './products';

const KEY_OFFERS_TODAY = '@mudbar/fail_offer_date';
const KEY_OFFERS_COUNT = '@mudbar/fail_offer_count_today';
const KEY_OFFERS_LIFETIME = '@mudbar/fail_offer_lifetime';
const KEY_SESSION_COUNT = '@mudbar/session_count';

export type FailOfferKind = 'revive' | 'remove_ads';

export interface FailOfferContext {
  /** Was this a "close" loss? (per-game definition) */
  wasClose: boolean;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Determine whether to show a fail offer and which kind.
 * Returns null if no offer should be shown.
 */
export async function shouldShowFailOffer(
  ctx: FailOfferContext,
): Promise<FailOfferKind | null> {
  if (!ctx.wasClose) return null;

  // Never if the player has purchased (they're already a payer)
  // Note: hasRemoveAds is a proxy — full purchase history would need
  // RevenueCat customer info inspection
  try {
    if (await hasRemoveAds()) return null;
  } catch {
    /* if we can't check, err on the side of showing */
  }

  const [dateRaw, countRaw, lifetimeRaw, sessionsRaw] = await Promise.all([
    AsyncStorage.getItem(KEY_OFFERS_TODAY),
    AsyncStorage.getItem(KEY_OFFERS_COUNT),
    AsyncStorage.getItem(KEY_OFFERS_LIFETIME),
    AsyncStorage.getItem(KEY_SESSION_COUNT),
  ]);

  // Never before session 5
  const sessions = parseInt(sessionsRaw ?? '0', 10);
  if (sessions < 5) return null;

  // Max 1/day
  const today = dayKey(new Date());
  if (dateRaw === today) {
    const count = parseInt(countRaw ?? '0', 10);
    if (count >= 1) return null;
  }

  // Alternate: every 3rd offer is remove-ads, otherwise revive
  const lifetime = parseInt(lifetimeRaw ?? '0', 10);
  const kind: FailOfferKind = lifetime % 3 === 2 ? 'remove_ads' : 'revive';

  // Don't offer remove-ads if they already have it
  if (kind === 'remove_ads') {
    try {
      if (await hasRemoveAds()) return 'revive';
    } catch {
      /* show anyway */
    }
  }

  return kind;
}

/** Record that a fail offer was shown (for frequency capping). */
export async function recordFailOfferShown(
  kind: FailOfferKind,
): Promise<void> {
  const today = dayKey(new Date());
  const [dateRaw, countRaw, lifetimeRaw] = await Promise.all([
    AsyncStorage.getItem(KEY_OFFERS_TODAY),
    AsyncStorage.getItem(KEY_OFFERS_COUNT),
    AsyncStorage.getItem(KEY_OFFERS_LIFETIME),
  ]);
  const count = dateRaw === today ? parseInt(countRaw ?? '0', 10) : 0;
  const lifetime = parseInt(lifetimeRaw ?? '0', 10);
  await Promise.all([
    AsyncStorage.setItem(KEY_OFFERS_TODAY, today),
    AsyncStorage.setItem(KEY_OFFERS_COUNT, String(count + 1)),
    AsyncStorage.setItem(KEY_OFFERS_LIFETIME, String(lifetime + 1)),
  ]);
  void track('fail_offer_shown', { kind });
}

/** Get the product for a fail offer kind. */
export function getFailOfferProduct(kind: FailOfferKind) {
  if (kind === 'remove_ads') {
    return PRODUCTS.find((p) => p.id === 'remove_ads')!;
  }
  // Revive: $0.99 impulse — use coins_small as the vehicle,
  // or define a dedicated revive product per game
  return (
    PRODUCTS.find((p) => p.id === 'revive_offer') ??
    PRODUCTS.find((p) => p.id === 'coins_small')!
  );
}
