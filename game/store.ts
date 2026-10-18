/**
 * Sort Stack persistent game state: tube skins, background themes,
 * daily-challenge completion, per-level stars.
 * Coins live in the shared template progression store.
 * Ownership/equipping uses the shared template collections module.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const K_DAILY_DONE = '@sortstack/daily_done_v1';
const K_STARS = '@sortstack/stars_v1';
const K_UNDO_USED = '@sortstack/undo_used_v1';

export interface TubeSkin {
  id: string;
  name: string;
  /** Ball colors, premium-minimal palette. */
  balls: string[];
  tube: string;
  tubeAccent: string;
  /** Coin cost (0 = free). Premium skins need the IAP product. */
  coins: number;
  premiumProductId?: string;
}

export const TUBE_SKINS: TubeSkin[] = [
  {
    id: 'slate', name: 'Slate', coins: 0,
    balls: ['#E63946', '#F4A261', '#E9C46A', '#2A9D8F', '#457B9D', '#9B5DE5', '#F15BB5'],
    tube: '#1E293B', tubeAccent: '#475569',
  },
  {
    id: 'mono', name: 'Mono', coins: 300,
    balls: ['#111111', '#333333', '#555555', '#777777', '#999999', '#BBBBBB', '#DDDDDD'],
    tube: '#0F0F0F', tubeAccent: '#444444',
  },
  {
    id: 'ocean', name: 'Ocean', coins: 600,
    balls: ['#03045E', '#0077B6', '#00B4D8', '#90E0EF', '#48CAE4', '#ADE8F4', '#CAF0F8'],
    tube: '#0A1128', tubeAccent: '#1C5D99',
  },
  {
    id: 'sunset', name: 'Sunset', coins: 600,
    balls: ['#641220', '#85182A', '#A71E34', '#BD1F36', '#DA1E37', '#E5383B', '#F48C06'],
    tube: '#2B2D42', tubeAccent: '#8D0801',
  },
  {
    id: 'forest', name: 'Forest', coins: 900,
    balls: ['#1B4332', '#2D6A4F', '#40916C', '#52B788', '#74C69D', '#95D5B2', '#D8F3DC'],
    tube: '#081C15', tubeAccent: '#1B4332',
  },
  {
    id: 'candy', name: 'Candy Pop', coins: 900,
    balls: ['#FF0A54', '#FF477E', '#FF5C8A', '#FF7096', '#FF8FAB', '#FFB3C6', '#FFC2D1'],
    tube: '#3A0CA3', tubeAccent: '#7209B7',
  },
  {
    id: 'neon', name: 'Neon Nights', coins: 0, premiumProductId: 'neon_tube_pack',
    balls: ['#FF2975', '#F222FF', '#8C1EFF', '#1EFFBC', '#FFF911', '#FF7B00', '#00E5FF'],
    tube: '#0D0221', tubeAccent: '#541388',
  },
  {
    id: 'gold', name: '24K', coins: 0, premiumProductId: 'neon_tube_pack',
    balls: ['#8A6D00', '#B89100', '#D4A900', '#FFD23F', '#FFDE6B', '#FFEA9E', '#FFF3C4'],
    tube: '#1A1A1A', tubeAccent: '#8A6D00',
  },
];

export interface BackgroundTheme {
  id: string;
  name: string;
  bg: string;
  bgSoft: string;
  text: string;
  textDim: string;
  coins: number;
  premiumProductId?: string;
}

export const BACKGROUNDS: BackgroundTheme[] = [
  { id: 'ink', name: 'Ink', bg: '#0F172A', bgSoft: '#1E293B', text: '#F8FAFC', textDim: '#94A3B8', coins: 0 },
  { id: 'paper', name: 'Paper', bg: '#FAFAF9', bgSoft: '#E7E5E4', text: '#1C1917', textDim: '#78716C', coins: 400 },
  { id: 'midnight', name: 'Midnight', bg: '#020617', bgSoft: '#0F172A', text: '#E2E8F0', textDim: '#64748B', coins: 400 },
  { id: 'moss', name: 'Moss', bg: '#1A2E1F', bgSoft: '#243B2A', text: '#EDF7EE', textDim: '#9DB89F', coins: 700 },
  { id: 'dusk', name: 'Dusk', bg: '#2D1B2E', bgSoft: '#3D2540', text: '#F5E6F0', textDim: '#B794B8', coins: 700 },
  { id: 'zen_garden', name: 'Zen Garden', bg: '#F5F1E8', bgSoft: '#E8E0D0', text: '#2D2A26', textDim: '#8A8272', coins: 0, premiumProductId: 'zen_backgrounds' },
  { id: 'zen_night', name: 'Zen Night', bg: '#141210', bgSoft: '#1F1C18', text: '#EDE8DF', textDim: '#8A8478', coins: 0, premiumProductId: 'zen_backgrounds' },
  { id: 'zen_mist', name: 'Zen Mist', bg: '#E8EEF2', bgSoft: '#D5DEE5', text: '#1F2A33', textDim: '#6B7C8A', coins: 0, premiumProductId: 'zen_backgrounds' },
];

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/* ── Daily challenge ─────────────────────────────────────────────── */

export function dailyKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export async function isDailyDone(date: Date = new Date()): Promise<boolean> {
  const done = await read<Record<string, boolean>>(K_DAILY_DONE, {});
  return done[dailyKey(date)] === true;
}

export async function markDailyDone(date: Date = new Date()): Promise<void> {
  const done = await read<Record<string, boolean>>(K_DAILY_DONE, {});
  done[dailyKey(date)] = true;
  await write(K_DAILY_DONE, done);
}

/* ── Stars ───────────────────────────────────────────────────────── */

export async function getStars(level: number): Promise<number> {
  const all = await read<Record<string, number>>(K_STARS, {});
  return all[String(level)] ?? 0;
}

export async function setStars(level: number, stars: number): Promise<void> {
  const all = await read<Record<string, number>>(K_STARS, {});
  if (stars > (all[String(level)] ?? 0)) {
    all[String(level)] = stars;
    await write(K_STARS, all);
  }
}

/* ── Undo inventory (free undo used this level) ───────────────────── */

export async function wasFreeUndoUsed(levelKey: string): Promise<boolean> {
  const used = await read<Record<string, boolean>>(K_UNDO_USED, {});
  return used[levelKey] === true;
}

export async function markFreeUndoUsed(levelKey: string): Promise<void> {
  const used = await read<Record<string, boolean>>(K_UNDO_USED, {});
  used[levelKey] = true;
  await write(K_UNDO_USED, used);
}
