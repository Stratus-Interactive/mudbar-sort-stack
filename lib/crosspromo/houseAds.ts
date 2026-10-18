/**
 * House-ad interstitial logic.
 * Every 5th interstitial slot serves a cross-promo card for a sister
 * game instead of AdMob. Zero cost, full control. Weighted toward
 * the newest launch (featured flag in remote config).
 */
import { getOrderedGames, SisterGame } from './config';

let houseAdIndex = 0;

/** Called with the running interstitial counter — true every 5th. */
export function shouldShowHouseAd(interstitialCount: number): boolean {
  return interstitialCount % 5 === 0;
}

/** Round-robin through sister games, featured first. */
export async function getHouseAdGame(): Promise<SisterGame | null> {
  const games = await getOrderedGames();
  if (games.length === 0) return null;
  const game = games[houseAdIndex % games.length] ?? null;
  houseAdIndex += 1;
  return game;
}

export function initCrossPromo(): void {
  // Warm the remote config cache on launch
  void getOrderedGames();
}
