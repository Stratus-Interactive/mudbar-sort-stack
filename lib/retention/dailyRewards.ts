/**
 * Daily reward chest — streak-tracked.
 * Ketchapp rule: a reason to return tomorrow is non-negotiable.
 * Day 1→7 escalating rewards; streak resets if a day is missed.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Analytics } from '../analytics';

const KEY_LAST_CLAIM = '@mudbar/daily_last_claim';
const KEY_STREAK = '@mudbar/daily_streak';

/** Coins per day of streak (day 1 = 50, day 7 = 500). */
export const DAILY_REWARDS = [50, 75, 100, 150, 200, 300, 500];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export interface DailyStatus {
  /** Can the player claim right now? */
  canClaim: boolean;
  /** Current streak day (1-7) */
  streakDay: number;
  /** Coins the next claim awards */
  nextReward: number;
}

export async function getDailyStatus(): Promise<DailyStatus> {
  const [lastClaim, streakRaw] = await Promise.all([
    AsyncStorage.getItem(KEY_LAST_CLAIM),
    AsyncStorage.getItem(KEY_STREAK),
  ]);
  const streak = parseInt(streakRaw ?? '0', 10);
  const today = dayKey(new Date());
  if (lastClaim === today) {
    return { canClaim: false, streakDay: streak, nextReward: 0 };
  }
  const yesterday = dayKey(new Date(Date.now() - 86400000));
  const nextStreak = lastClaim === yesterday ? Math.min(streak + 1, 7) : 1;
  return {
    canClaim: true,
    streakDay: nextStreak,
    nextReward: DAILY_REWARDS[nextStreak - 1] ?? 50,
  };
}

/** Claim today's reward. Returns coins awarded (0 if already claimed). */
export async function claimDailyReward(): Promise<number> {
  const status = await getDailyStatus();
  if (!status.canClaim) return 0;
  await Promise.all([
    AsyncStorage.setItem(KEY_LAST_CLAIM, dayKey(new Date())),
    AsyncStorage.setItem(KEY_STREAK, String(status.streakDay)),
  ]);
  void Analytics.dailyRewardClaimed(status.streakDay, status.streakDay);
  return status.nextReward;
}
