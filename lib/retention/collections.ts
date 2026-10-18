/**
 * Collection / unlock system — parameterized per game.
 * Games define their unlockables (skins, backgrounds, trails…);
 * this module handles ownership, equipping, and persistence.
 *
 * Ketchapp pattern: 12+ grindable unlockables per game (via rewarded
 * ads or coins) + 2–3 premium packs (IAP). Collection completionism
 * is a top-3 retention driver in hybrid-casual.
 */

export interface Unlockable {
  /** Unique ID, e.g. "neon_skin_03" */
  id: string;
  /** Display name */
  name: string;
  /** How to obtain: grind (coins/ads) or premium (IAP product ID) */
  obtain: { type: 'coins'; cost: number } | { type: 'ads'; watches: number } | { type: 'iap'; productId: string };
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_OWNED = '@mudbar/owned_';
const KEY_EQUIPPED = '@mudbar/equipped_';

async function ownedKey(category: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEY_OWNED + category);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function isOwned(category: string, id: string): Promise<boolean> {
  return (await ownedKey(category)).includes(id);
}

export async function unlock(category: string, id: string): Promise<void> {
  const owned = await ownedKey(category);
  if (!owned.includes(id)) {
    owned.push(id);
    await AsyncStorage.setItem(KEY_OWNED + category, JSON.stringify(owned));
  }
}

export async function getEquipped(category: string): Promise<string | null> {
  return AsyncStorage.getItem(KEY_EQUIPPED + category);
}

export async function equip(category: string, id: string): Promise<boolean> {
  if (!(await isOwned(category, id))) return false;
  await AsyncStorage.setItem(KEY_EQUIPPED + category, id);
  return true;
}

export async function getOwned(category: string): Promise<string[]> {
  return ownedKey(category);
}
