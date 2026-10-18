/**
 * Shareable score/replay cards — the #1 organic driver for hyper-casual.
 * Generates a branded image via react-native-view-shot and opens the
 * iOS share sheet. First share per day grants 50 coins.
 *
 * Per-game usage:
 *   <ShareCard
 *     headline="I cleaned this in 47 sprays!"
 *     stat="47" statLabel="SPRAYS"
 *     accentColor="#22c55e" emoji="🧽"
 *     onShared={() => ...}
 *   />
 */
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  ActivityIndicator,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { track } from '../analytics';
import { addCoins } from '../retention/progression';
import { CONFIG, COMPANY_NAME } from '../config';

const KEY_LAST_SHARE_REWARD = '@mudbar/share_last_reward';
export const SHARE_COIN_REWARD = 50;

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export interface ShareCardProps {
  /** Big headline, e.g. "I cleaned this in 47 sprays!" */
  headline: string;
  /** The hero number */
  stat: string;
  /** Label under the number, e.g. "SPRAYS" */
  statLabel: string;
  /** Per-game brand color */
  accentColor: string;
  /** Per-game emoji/icon */
  emoji: string;
  /** Optional sub-line, e.g. "Level 47 · Grime Busters" */
  subline?: string;
  /** Called after a completed share */
  onShared?: () => void;
}

/**
 * Awards 50 coins for the first share of the day. Returns coins awarded.
 */
export async function awardShareReward(): Promise<number> {
  const today = dayKey(new Date());
  const last = await AsyncStorage.getItem(KEY_LAST_SHARE_REWARD);
  if (last === today) return 0;
  await AsyncStorage.setItem(KEY_LAST_SHARE_REWARD, today);
  await addCoins(SHARE_COIN_REWARD);
  return SHARE_COIN_REWARD;
}

export function ShareCard(props: ShareCardProps): React.JSX.Element {
  const { headline, stat, statLabel, accentColor, emoji, subline, onShared } =
    props;
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = async (): Promise<void> => {
    if (sharing) return;
    setSharing(true);
    void track('share_card_tapped', { game: CONFIG.slug });
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 0.9,
      });
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
      const result = await Share.share({
        url: uri,
        message: `${headline} — ${CONFIG.name} by ${COMPANY_NAME}. Can you beat me?`,
      });
      if (result.action === Share.sharedAction) {
        void track('share_completed', { game: CONFIG.slug });
        const coins = await awardShareReward();
        if (coins > 0) {
          void track('share_reward_earned', { coins });
        }
        onShared?.();
      } else {
        void track('share_dismissed', { game: CONFIG.slug });
      }
    } catch {
      /* share failures are silent — never block gameplay */
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* The capturable branded card */}
      <View
        ref={cardRef}
        collapsable={false}
        style={[styles.card, { borderColor: accentColor }]}
      >
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={[styles.stat, { color: accentColor }]}>{stat}</Text>
        <Text style={styles.statLabel}>{statLabel}</Text>
        <Text style={styles.headline}>{headline}</Text>
        {subline ? <Text style={styles.subline}>{subline}</Text> : null}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {CONFIG.name} · {COMPANY_NAME}
          </Text>
          <Text style={styles.challenge}>Can you beat me?</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.shareButton, { backgroundColor: accentColor }]}
        onPress={() => void handleShare()}
        disabled={sharing}
        activeOpacity={0.8}
      >
        {sharing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.shareButtonText}>
            Share · earn {SHARE_COIN_REWARD} 🪙
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

/** Call when the card becomes visible (for analytics). */
export function trackShareCardShown(context: string): void {
  void track('share_card_shown', { game: CONFIG.slug, context });
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 16 },
  card: {
    width: 300,
    borderRadius: 20,
    borderWidth: 3,
    backgroundColor: '#0f172a',
    padding: 24,
    alignItems: 'center',
  },
  emoji: { fontSize: 48, marginBottom: 8 },
  stat: { fontSize: 56, fontWeight: '900' },
  statLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
    color: '#94a3b8',
    marginTop: 2,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600',
    color: '#f8fafc',
    textAlign: 'center',
    marginTop: 12,
  },
  subline: { fontSize: 13, color: '#64748b', marginTop: 6 },
  footer: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    width: '100%',
    alignItems: 'center',
  },
  footerText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  challenge: {
    fontSize: 14,
    color: '#f8fafc',
    fontWeight: '700',
    marginTop: 4,
  },
  shareButton: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
  },
  shareButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
