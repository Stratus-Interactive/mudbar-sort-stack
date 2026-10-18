/**
 * Haptics + sound manager hooks.
 * Ketchapp feel: every tap gets instant feedback. Success/failure
 * are reported IMMEDIATELY — the short feedback loop is the game.
 */
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_SOUND = '@mudbar/sound_enabled';
const KEY_HAPTICS = '@mudbar/haptics_enabled';

async function isEnabled(key: string): Promise<boolean> {
  const v = await AsyncStorage.getItem(key);
  return v !== '0'; // default on
}

export const Feedback = {
  /** Light tap — every button press */
  tap: async (): Promise<void> => {
    if (await isEnabled(KEY_HAPTICS)) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },
  /** Success — level complete, reward claimed */
  success: async (): Promise<void> => {
    if (await isEnabled(KEY_HAPTICS)) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },
  /** Failure — game over, wrong move */
  failure: async (): Promise<void> => {
    if (await isEnabled(KEY_HAPTICS)) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  },
  /** Milestone — new best score, streak milestone */
  milestone: async (): Promise<void> => {
    if (await isEnabled(KEY_HAPTICS)) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  },
};

// ── Sound ──────────────────────────────────────────────────────────
// Games register their sound files once; play by name.

const sounds: Record<string, Audio.Sound> = {};

export async function loadSounds(
  files: Record<string, number>, // name → require('...mp3')
): Promise<void> {
  for (const [name, mod] of Object.entries(files)) {
    try {
      const { sound } = await Audio.Sound.createAsync(mod);
      sounds[name] = sound;
    } catch (e) {
      console.warn(`[sound] failed to load ${name}`, e);
    }
  }
}

export async function playSound(name: string): Promise<void> {
  if (!(await isEnabled(KEY_SOUND))) return;
  const s = sounds[name];
  if (!s) return;
  try {
    await s.replayAsync();
  } catch {
    /* silent — never break gameplay for audio */
  }
}

export async function setSoundEnabled(on: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_SOUND, on ? '1' : '0');
}

export async function setHapticsEnabled(on: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_HAPTICS, on ? '1' : '0');
}
