/**
 * Fail-offer bottom sheet — dismissible, never blocks the retry button.
 * "So close!" + contextual offer. One-tap dismiss, "No thanks" always visible.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { FailOfferKind, getFailOfferProduct } from './failOffer';
import { purchaseProduct, restorePurchases } from './index';
import { track } from '../analytics';

export interface FailOfferSheetProps {
  visible: boolean;
  kind: FailOfferKind;
  /** Contextual headline, e.g. "So close! You were 3 tiles away!" */
  headline: string;
  /** Called when dismissed (any reason) */
  onClose: () => void;
  /** Called after successful purchase */
  onPurchased?: () => void;
}

export function FailOfferSheet(props: FailOfferSheetProps): React.JSX.Element {
  const { visible, kind, headline, onClose, onPurchased } = props;
  const [buying, setBuying] = useState(false);
  const product = getFailOfferProduct(kind);

  const handleBuy = async (): Promise<void> => {
    if (buying) return;
    setBuying(true);
    void track('fail_offer_tapped', { kind, product_id: product.id });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = await purchaseProduct(product);
    setBuying(false);
    if (result.ok) {
      void track('fail_offer_purchased', { kind, product_id: product.id });
      onPurchased?.();
      onClose();
    }
    // If cancelled or failed, stay open so they can dismiss
  };

  const handleDismiss = (): void => {
    void track('fail_offer_dismissed', { kind });
    onClose();
  };

  const ctaText =
    kind === 'remove_ads'
      ? `Remove Ads — $${product.priceUsd.toFixed(2)}`
      : `Revive + 200 🪙 — $${product.priceUsd.toFixed(2)}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.emoji}>{kind === 'remove_ads' ? '🚫' : '💪'}</Text>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.subtext}>
            {kind === 'remove_ads'
              ? 'Play uninterrupted, forever.'
              : 'Jump right back in where you left off.'}
          </Text>
          <TouchableOpacity
            style={styles.buyButton}
            onPress={() => void handleBuy()}
            disabled={buying}
            activeOpacity={0.8}
          >
            {buying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buyText}>{ctaText}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => void restorePurchases()}
            style={styles.restore}
          >
            <Text style={styles.restoreText}>Restore purchases</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDismiss} style={styles.dismiss}>
            <Text style={styles.dismissText}>No thanks</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    marginBottom: 16,
  },
  emoji: { fontSize: 40, marginBottom: 8 },
  headline: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  buyButton: {
    backgroundColor: '#22c55e',
    borderRadius: 999,
    paddingHorizontal: 40,
    paddingVertical: 16,
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  buyText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  restore: { marginTop: 12, padding: 6 },
  restoreText: { color: '#64748b', fontSize: 13 },
  dismiss: { marginTop: 8, padding: 10 },
  dismissText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
});
