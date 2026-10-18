import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initAnalytics } from '../lib/analytics';
import { initAds } from '../lib/ads';
import { initIAP } from '../lib/iap';
import { initCrossPromo } from '../lib/crosspromo';

export default function RootLayout() {
  useEffect(() => {
    // Initialize all shared services on app launch.
    // Ketchapp principle: boot straight into the game — no splash gates,
    // no login walls. These inits are fire-and-forget.
    initAnalytics();
    initAds();
    initIAP();
    initCrossPromo();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
