/**
 * Standard product catalog for MudBar titles.
 * Each game defines these products in App Store Connect (Evan does this
 * manually) with matching IDs, then wires them in RevenueCat.
 *
 * Pricing from the monetization playbook:
 * - Remove Ads $4.99 — highest converter in the genre
 * - Skins $0.99–$2.99 — #2 seller
 * - Coins $0.99–$4.99 — shortcut pricing
 * - Starter bundle $2.99 — highest ARPPU, offer once in first 3 sessions
 */

export interface ProductDef {
  /** RevenueCat product identifier (matches App Store Connect) */
  id: string;
  /** Display title */
  title: string;
  /** Price in USD (informational — actual price from store) */
  priceUsd: number;
  /** What the player gets */
  kind: 'remove_ads' | 'coins' | 'skin_pack' | 'bundle';
  /** Coins granted (for coin/bundle products) */
  coins?: number;
}

export const PRODUCTS: ProductDef[] = [
  {
    id: 'remove_ads',
    title: 'Remove Ads',
    priceUsd: 4.99,
    kind: 'remove_ads',
  },
  {
    id: 'coins_small',
    title: 'Coin Pack S',
    priceUsd: 0.99,
    kind: 'coins',
    coins: 500,
  },
  {
    id: 'coins_medium',
    title: 'Coin Pack M',
    priceUsd: 1.99,
    kind: 'coins',
    coins: 1200,
  },
  {
    id: 'coins_large',
    title: 'Coin Pack L',
    priceUsd: 3.99,
    kind: 'coins',
    coins: 3000,
  },
  {
    id: 'starter_bundle',
    title: 'Starter Bundle',
    priceUsd: 2.99,
    kind: 'bundle',
    coins: 500,
  },
  // Per-game skin packs are appended by each title, e.g.:
  // { id: 'neon_skins', title: 'Neon Nights Pack', priceUsd: 1.99, kind: 'skin_pack' },
  // Sort Stack packs:
  { id: 'neon_tube_pack', title: 'Neon Tube Pack', priceUsd: 1.99, kind: 'skin_pack' },
  { id: 'zen_backgrounds', title: 'Zen Backgrounds', priceUsd: 0.99, kind: 'skin_pack' },
];

/** Entitlement ID in RevenueCat that gates "Remove Ads". */
export const REMOVE_ADS_ENTITLEMENT = 'remove_ads';
