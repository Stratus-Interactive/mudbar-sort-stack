/**
 * Cross-promo game list — driven by remote JSON.
 * Evan can reorder/feature titles without app updates.
 *
 * Remote JSON shape:
 * {
 *   "games": [
 *     {
 *       "slug": "grime-busters",
 *       "name": "Grime Busters",
 *       "tagline": "Power-wash the grime!",
 *       "iconUrl": "https://...",
 *       "urlScheme": "mudbar-grimebusters",
 *       "appStoreUrl": "https://apps.apple.com/app/...",
 *       "featured": true
 *     }
 *   ]
 * }
 */
import { CONFIG } from '../config';

export interface SisterGame {
  slug: string;
  name: string;
  tagline: string;
  iconUrl: string;
  urlScheme: string;
  appStoreUrl: string;
  featured?: boolean;
}

let cache: SisterGame[] | null = null;
let lastFetch = 0;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function getSisterGames(): Promise<SisterGame[]> {
  const now = Date.now();
  if (cache && now - lastFetch < CACHE_TTL_MS) return cache;
  try {
    const res = await fetch(CONFIG.crossPromoUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { games: SisterGame[] };
    // Exclude self — don't cross-promo the game you're already in
    cache = (json.games ?? []).filter((g) => g.slug !== CONFIG.slug);
    lastFetch = now;
    return cache;
  } catch (e) {
    console.warn('[crosspromo] remote config failed, using cache', e);
    return cache ?? [];
  }
}

/** Featured game first, then the rest. */
export async function getOrderedGames(): Promise<SisterGame[]> {
  const games = await getSisterGames();
  return [...games].sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false));
}
