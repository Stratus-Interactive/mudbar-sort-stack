/**
 * Streak-saver push notification — the single highest-ROI notification
 * in casual games. "Your 6-day streak expires in 2 hours."
 *
 * Rules (from playbook):
 * - Local notification at 8 PM local if streak active + daily not claimed
 * - Cancel on app open
 * - Max 1/day
 * - If user ignores 3 in a row, stop for 7 days
 * - Request permission AFTER first daily reward claim (2× higher opt-in
 *   than asking on launch)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { getDailyStatus } from './dailyRewards';
import { track } from '../analytics';

const KEY_PUSH_TOKEN = '@mudbar/push_token';
const KEY_IGNORED_COUNT = '@mudbar/streak_push_ignored';
const KEY_PAUSE_UNTIL = '@mudbar/streak_push_pause_until';
const KEY_LAST_SCHEDULED = '@mudbar/streak_push_last_scheduled';

const NOTIFICATION_ID = 'streak-saver';

// Configure how notifications behave when app is foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request push permission. Call AFTER the first daily reward claim,
 * NOT on launch — context doubles opt-in rates.
 * Returns true if permission granted.
 */
export async function requestStreakPushPermission(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';
    if (granted) {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      await AsyncStorage.setItem(KEY_PUSH_TOKEN, token);
    }
    void track('push_permission_result', { granted });
    return granted;
  } catch {
    return false;
  }
}

/** Cancel any pending streak-saver. Call on app open / foreground. */
export async function cancelStreakPush(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
  } catch {
    /* no-op */
  }
}

/**
 * Schedule the streak-saver for 8 PM today if conditions are met.
 * Call on app background / close.
 */
export async function scheduleStreakPush(): Promise<boolean> {
  // Respect the 7-day pause after 3 ignored pushes
  const pauseUntil = parseInt(
    (await AsyncStorage.getItem(KEY_PAUSE_UNTIL)) ?? '0',
    10,
  );
  if (Date.now() < pauseUntil) return false;

  // Max 1/day
  const lastScheduled = await AsyncStorage.getItem(KEY_LAST_SCHEDULED);
  const today = new Date().toDateString();
  if (lastScheduled === today) return false;

  // Only if streak is active and daily not yet claimed
  const status = await getDailyStatus();
  if (!status.canClaim || status.streakDay <= 1) return false;

  // Permission check
  const { status: perm } = await Notifications.getPermissionsAsync();
  if (perm !== 'granted') return false;

  // Schedule for 8 PM local
  const trigger = new Date();
  trigger.setHours(20, 0, 0, 0);
  if (trigger.getTime() <= Date.now()) return false; // already past 8 PM

  const streakDay = status.streakDay;
  const body =
    streakDay >= 7
      ? `${streakDay}-day streak on the line — don't break it! 🔥`
      : `Your ${streakDay}-day streak expires in a few hours! 🔥`;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: {
        title: 'Daily reward waiting',
        body,
        data: { type: 'streak_saver', streakDay },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
    });
    await AsyncStorage.setItem(KEY_LAST_SCHEDULED, today);
    void track('push_scheduled', { streak_day: streakDay });
    return true;
  } catch {
    return false;
  }
}

/**
 * Call when a streak-saver notification is opened.
 * Tracks the save and resets the ignore counter.
 */
export async function handleStreakPushOpened(): Promise<void> {
  await AsyncStorage.setItem(KEY_IGNORED_COUNT, '0');
  void track('push_opened', { type: 'streak_saver' });
  // If they claim the reward within the hour, it counts as a save
  // (the game calls trackStreakSaved() after claimDailyReward succeeds)
}

/** Call when the daily reward is claimed after opening a streak push. */
export async function trackStreakSaved(): Promise<void> {
  void track('streak_saved', {});
}

/**
 * Call when a scheduled push fires but the user doesn't open the app
 * within a reasonable window. After 3 ignored, pause for 7 days.
 * (Simplest v1: increment on each schedule that wasn't opened.
 * The game should call this on next launch if a push was scheduled
 * yesterday but no push_opened event was tracked.)
 */
export async function recordPushIgnored(): Promise<void> {
  const count = parseInt(
    (await AsyncStorage.getItem(KEY_IGNORED_COUNT)) ?? '0',
    10,
  );
  const next = count + 1;
  await AsyncStorage.setItem(KEY_IGNORED_COUNT, String(next));
  if (next >= 3) {
    const pauseUntil = Date.now() + 7 * 86400000;
    await AsyncStorage.setItem(KEY_PAUSE_UNTIL, String(pauseUntil));
    await AsyncStorage.setItem(KEY_IGNORED_COUNT, '0');
  }
}

/** Initialize streak push: cancel on foreground, schedule on background. */
export function initStreakPush(): void {
  // The game wires these to AppState changes:
  // - foreground → cancelStreakPush()
  // - background → scheduleStreakPush()
}
