/**
 * Smart review prompts — SKStoreReviewController at delight moments only.
 *
 * Rules (from playbook — enforced exactly):
 * - Only at delight moments: perfect_clear, personal_best, streak_7_day, gallery_milestone
 * - 120-day cooldown (iOS allows ~3/year — each prompt is precious)
 * - Min 5 sessions, min 3 days installed
 * - NEVER after a fail, during onboarding, or within first 3 sessions
 *
 * Per-game trigger mapping (wire these in each game):
 * - Grime Busters: 3-star picture clear, gallery 25/50/75/100%
 * - Sort Stack: 3-star clear on level 10+, 7-day daily challenge streak
 * - Neon Swerve: new personal best by 20%+, FLOW mode first activation
 * - Merge Minis: first tier-8+ merge, wave 20 cleared
 * - Bounce Buddies: new height record, 10-combo bounce streak
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { track } from '../analytics';

const KEY_INSTALL_DATE = '@mudbar/install_date';
const KEY_SESSION_COUNT = '@mudbar/session_count';
const KEY_LAST_PROMPT = '@mudbar/review_last_prompt';
const KEY_LAST_SESSION_FAIL = '@mudbar/last_session_fail';

const COOLDOWN_DAYS = 120;
const MIN_SESSIONS = 5;
const MIN_DAYS_INSTALLED = 3;

export type DelightTrigger =
  | 'perfect_clear'
  | 'personal_best'
  | 'streak_7_day'
  | 'gallery_milestone';

const DELIGHT_TRIGGERS: DelightTrigger[] = [
  'perfect_clear',
  'personal_best',
  'streak_7_day',
  'gallery_milestone',
];

/** Call once on app launch. Tracks install date + session count. */
export async function initReviewPrompt(): Promise<void> {
  const [installRaw, sessionsRaw] = await Promise.all([
    AsyncStorage.getItem(KEY_INSTALL_DATE),
    AsyncStorage.getItem(KEY_SESSION_COUNT),
  ]);
  if (!installRaw) {
    await AsyncStorage.setItem(KEY_INSTALL_DATE, String(Date.now()));
  }
  const sessions = parseInt(sessionsRaw ?? '0', 10);
  await AsyncStorage.setItem(KEY_SESSION_COUNT, String(sessions + 1));
  // Reset the fail flag at session start — set by game on fail
  await AsyncStorage.setItem(KEY_LAST_SESSION_FAIL, '0');
}

/** Call when the player fails — blocks prompts for this session. */
export async function markSessionFail(): Promise<void> {
  await AsyncStorage.setItem(KEY_LAST_SESSION_FAIL, '1');
}

function daysBetween(a: number, b: number): number {
  return Math.abs(b - a) / 86400000;
}

export async function shouldPrompt(trigger: DelightTrigger): Promise<boolean> {
  if (!DELIGHT_TRIGGERS.includes(trigger)) return false;

  const [installRaw, sessionsRaw, lastPromptRaw, failRaw] = await Promise.all([
    AsyncStorage.getItem(KEY_INSTALL_DATE),
    AsyncStorage.getItem(KEY_SESSION_COUNT),
    AsyncStorage.getItem(KEY_LAST_PROMPT),
    AsyncStorage.getItem(KEY_LAST_SESSION_FAIL),
  ]);

  const sessions = parseInt(sessionsRaw ?? '0', 10);
  if (sessions < MIN_SESSIONS) return false;

  const installDate = parseInt(installRaw ?? String(Date.now()), 10);
  if (daysBetween(installDate, Date.now()) < MIN_DAYS_INSTALLED) return false;

  if (failRaw === '1') return false; // never after frustration

  if (lastPromptRaw) {
    const lastPrompt = parseInt(lastPromptRaw, 10);
    if (daysBetween(lastPrompt, Date.now()) < COOLDOWN_DAYS) return false;
  }

  return true;
}

/**
 * Attempt a review prompt at a delight moment.
 * Returns true if the prompt was shown.
 */
export async function maybeRequestReview(
  trigger: DelightTrigger,
): Promise<boolean> {
  if (!(await shouldPrompt(trigger))) return false;
  try {
    const available = await StoreReview.hasAction();
    if (!available) return false;
    await StoreReview.requestReview();
    await AsyncStorage.setItem(KEY_LAST_PROMPT, String(Date.now()));
    void track('review_prompt_shown', { trigger });
    return true;
  } catch {
    return false;
  }
}
