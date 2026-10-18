/**
 * Level progression store.
 * Generic enough for level-based games (Sort Stack, Grime Busters);
 * endless games (Neon Swerve) use best-score instead — see below.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_LEVEL = '@mudbar/level';
const KEY_BEST = '@mudbar/best_score';
const KEY_COINS = '@mudbar/coins';

export async function getLevel(): Promise<number> {
  const v = await AsyncStorage.getItem(KEY_LEVEL);
  return parseInt(v ?? '1', 10);
}

export async function completeLevel(level: number): Promise<void> {
  const current = await getLevel();
  if (level >= current) {
    await AsyncStorage.setItem(KEY_LEVEL, String(level + 1));
  }
}

export async function getBestScore(): Promise<number> {
  const v = await AsyncStorage.getItem(KEY_BEST);
  return parseInt(v ?? '0', 10);
}

export async function submitScore(score: number): Promise<boolean> {
  const best = await getBestScore();
  if (score > best) {
    await AsyncStorage.setItem(KEY_BEST, String(score));
    return true; // new best!
  }
  return false;
}

export async function getCoins(): Promise<number> {
  const v = await AsyncStorage.getItem(KEY_COINS);
  return parseInt(v ?? '0', 10);
}

export async function addCoins(amount: number): Promise<number> {
  const current = await getCoins();
  const next = Math.max(0, current + amount);
  await AsyncStorage.setItem(KEY_COINS, String(next));
  return next;
}

/** Spend coins. Returns true if the player could afford it. */
export async function spendCoins(amount: number): Promise<boolean> {
  const current = await getCoins();
  if (current < amount) return false;
  await AsyncStorage.setItem(KEY_COINS, String(current - amount));
  return true;
}
