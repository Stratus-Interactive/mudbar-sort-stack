/**
 * Paywall UI — customizable per game via props.
 * Ketchapp-minimal: one screen, clear prices, big close button.
 * MUST include a Restore Purchases button (App Review requirement).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { PRODUCTS, ProductDef } from './products';
import { purchaseProduct, restorePurchases } from './index';

interface PaywallProps {
  /** Products to show (defaults to full catalog) */
  products?: ProductDef[];
  /** Called after a successful purchase */
  onPurchased?: (product: ProductDef) => void;
  /** Called when the user closes the paywall */
  onClose: () => void;
  /** Accent color for the game's theme */
  accentColor?: string;
}

export function Paywall({
  products = PRODUCTS,
  onPurchased,
  onClose,
  accentColor = '#6C5CE7',
}: PaywallProps): React.JSX.Element {
  const [busyId, setBusyId] = useState<string | null>(null);

  const buy = async (product: ProductDef): Promise<void> => {
    setBusyId(product.id);
    const result = await purchaseProduct(product);
    setBusyId(null);
    if (result.ok) {
      onPurchased?.(product);
      onClose();
    } else if (result.error) {
      Alert.alert('Purchase failed', result.error);
    }
  };

  const restore = async (): Promise<void> => {
    const ok = await restorePurchases();
    Alert.alert(
      'Restore Purchases',
      ok ? 'Your purchases have been restored.' : 'Nothing to restore.',
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Go Premium</Text>
      {products.map((p) => (
        <TouchableOpacity
          key={p.id}
          style={[styles.row, { borderColor: accentColor }]}
          onPress={() => void buy(p)}
          disabled={busyId !== null}
        >
          <Text style={styles.rowTitle}>{p.title}</Text>
          <Text style={styles.rowPrice}>${p.priceUsd.toFixed(2)}</Text>
          {busyId === p.id && <ActivityIndicator size="small" />}
        </TouchableOpacity>
      ))}
      <TouchableOpacity onPress={() => void restore()}>
        <Text style={styles.restore}>Restore Purchases</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.close, { backgroundColor: accentColor }]} onPress={onClose}>
        <Text style={styles.closeText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, alignItems: 'stretch' },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  rowTitle: { fontSize: 17, fontWeight: '600' },
  rowPrice: { fontSize: 17, fontWeight: '700' },
  restore: { textAlign: 'center', marginTop: 8, textDecorationLine: 'underline' },
  close: {
    marginTop: 20,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  closeText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
