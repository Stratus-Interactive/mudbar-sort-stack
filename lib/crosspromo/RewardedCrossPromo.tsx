/**
 * Rewarded cross-promo — "Try [sister game], get [exclusive reward]."
 * Every 8th interstitial slot (less frequent than house ads because
 * the reward makes it higher-value).
 *
 * Flow:
 * 1. Full-screen card: "[Sister game icon] Try Neon Swerve — get the
 *    EXCLUSIVE 'Neon Buddy' costume in Bounce Buddies!"
 * 2. Tap → App Store (or deep link if installed)
 * 3. Reward granted on tap (v1: reward cost is negligible, and the
 *    friction of verification kills conversion)
 *
 * Exclusive reward catalog (not earnable any other way):
 * - Grime Busters → Sort Stack players: "Gilded Nozzle" spray theme
 * - Sort Stack → Grime Busters players: "Power-Wash" tube skin
 * - Neon Swerve → Bounce Buddies players: "Synthwave Buddy" costume
 * - Bounce Buddies → Neon Swerve players: "Googly Eyes" orb trail
 * - Merge Minis → any: "Golden Egg" spawn skin
 *
 * Remote config: reward mappings in cross-promo JSON so Evan can swap
 * featured games without app updates.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { getOrderedGames, SisterGame } from './config';
import { track } from '../analytics';
import { CONFIG } from '../config';

/** Every Nth interstitial slot shows a rewarded cross-promo. */
export const REWARDED_XPROMO_SLOT = 8;

export function shouldShowRewardedCrossPromo(
  interstitialCount: number,
): boolean {
  return interstitialCount % REWARDED_XPROMO_SLOT === 0;
}

/** Exclusive reward this game offers to players of sister games. */
export interface CrossPromoReward {
  /** Reward ID (matches the game's collection system) */
  id: string;
  /** Display name, e.g. "Gilded Nozzle" */
  name: string;
  /** What it is, e.g. "Exclusive spray theme" */
  description: string;
  /** Emoji/icon for the reward */
  emoji: string;
}

/**
 * Default reward catalog. Games override via getRewardForGame().
 * Remote JSON can also specify rewards per game:
 * { "games": [...], "rewards": { "grime-busters": { "id": "...", ... } } }
 */
const DEFAULT_REWARDS: Record<string, CrossPromoReward> = {
  'grime-busters': {
    id: 'gilded_nozzle',
    name: 'Gilded Nozzle',
    description: 'Exclusive spray theme',
    emoji: '✨',
  },
  'sort-stack': {
    id: 'powerwash_tubes',
    name: 'Power-Wash Tubes',
    description: 'Exclusive tube skin',
    emoji: '🫧',
  },
  'neon-swerve': {
    id: 'googly_trail',
    name: 'Googly Eyes Trail',
    description: 'Exclusive orb trail',
    emoji: '👀',
  },
  'merge-minis': {
    id: 'golden_egg',
    name: 'Golden Egg',
    description: 'Exclusive spawn skin',
    emoji: '🥚',
  },
  'bounce-buddies': {
    id: 'synthwave_buddy',
    name: 'Synthwave Buddy',
    description: 'Exclusive costume',
    emoji: '🌆',
  },
};

/** Which sister game to feature (round-robin, featured first). */
let rewardedIndex = 0;

export async function getRewardedCrossPromoGame(): Promise<{
  game: SisterGame;
  reward: CrossPromoReward;
} | null> {
  const games = await getOrderedGames();
  if (games.length === 0) return null;
  const game = games[rewardedIndex % games.length];
  rewardedIndex += 1;
  if (!game) return null;
  // Reward is keyed by the CURRENT game's slug (CONFIG.slug), not the
  // featured sister game's slug — the current app can only grant rewards
  // from its own collection system.
  const reward = DEFAULT_REWARDS[CONFIG.slug] ?? {
    id: `xpromo_${CONFIG.slug}`,
    name: 'Exclusive Reward',
    description: 'Exclusive reward',
    emoji: '🎁',
  };
  return { game, reward };
}

export interface RewardedCrossPromoProps {
  game: SisterGame;
  reward: CrossPromoReward;
  /** Called when the player taps "Claim" — game grants the reward */
  onClaim: (reward: CrossPromoReward) => void | Promise<void>;
  /** Called when dismissed */
  onClose: () => void;
}

export function RewardedCrossPromo(
  props: RewardedCrossPromoProps,
): React.JSX.Element {
  const { game, reward, onClaim, onClose } = props;
  const [loading, setLoading] = useState(false);

  const handleClaim = async (): Promise<void> => {
    if (loading) return;
    setLoading(true);
    void track('xpromo_reward_tapped', {
      target_game: game.slug,
      reward_id: reward.id,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      // Try deep link first (game installed), fall back to App Store
      const deepUrl = `${game.urlScheme}://`;
      const canOpen = await Linking.canOpenURL(deepUrl);
      if (canOpen) {
        await Linking.openURL(deepUrl);
        void track('xpromo_install_confirmed', { target_game: game.slug });
      } else {
        await Linking.openURL(game.appStoreUrl);
      }
    } catch {
      /* link failures are silent */
    }
    // Grant the reward (v1: on tap — verification friction kills conversion)
    await onClaim(reward);
    void track('xpromo_reward_earned', {
      target_game: game.slug,
      reward_id: reward.id,
    });
    setLoading(false);
    onClose();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.badge}>LIMITED TIME</Text>
        {game.iconUrl ? (
          <Image
            source={{ uri: game.iconUrl }}
            style={styles.icon}
            resizeMode="contain"
          />
        ) : (
          <Text style={styles.emojiFallback}>🎮</Text>
        )}
        <Text style={styles.title}>Try {game.name}!</Text>
        <Text style={styles.tagline}>{game.tagline}</Text>
        <View style={styles.rewardBox}>
          <Text style={styles.rewardEmoji}>{reward.emoji}</Text>
          <View style={styles.rewardText}>
            <Text style={styles.rewardName}>{reward.name}</Text>
            <Text style={styles.rewardDesc}>{reward.description}</Text>
            <Text style={styles.exclusive}>EXCLUSIVE — only here!</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.claimButton}
          onPress={() => void handleClaim()}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.claimText}>Get {reward.name} 🎁</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.dismiss}>
          <Text style={styles.dismissText}>No thanks</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** Call when the rewarded cross-promo card is shown. */
export function trackRewardedCrossPromoShown(gameSlug: string): void {
  void track('xpromo_reward_shown', { target_game: gameSlug });
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  card: {
    width: 320,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#7c3aed',
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#fbbf24',
    marginBottom: 12,
  },
  icon: { width: 80, height: 80, borderRadius: 18, marginBottom: 12 },
  emojiFallback: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#f8fafc' },
  tagline: { fontSize: 14, color: '#94a3b8', marginTop: 4, textAlign: 'center' },
  rewardBox: {
    flexDirection: 'row',
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  rewardEmoji: { fontSize: 36, marginRight: 12 },
  rewardText: { flex: 1 },
  rewardName: { fontSize: 16, fontWeight: '700', color: '#f8fafc' },
  rewardDesc: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  exclusive: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fbbf24',
    marginTop: 4,
    letterSpacing: 1,
  },
  claimButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  claimText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dismiss: { marginTop: 12, padding: 8 },
  dismissText: { color: '#64748b', fontSize: 14 },
});
