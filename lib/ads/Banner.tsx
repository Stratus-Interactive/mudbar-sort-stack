/**
 * Banner ad component.
 * Rule: menus and shop screens ONLY — never during gameplay.
 * Small money, zero friction. Ketchapp-clean: banners never overlap
 * interactive elements.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNITS } from './config';

export function AdBanner(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AD_UNITS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
