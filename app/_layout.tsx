import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { initAnalytics } from '../lib/analytics';
import { initAds } from '../lib/ads';
import { initIAP } from '../lib/iap';
import { initCrossPromo } from '../lib/crosspromo';
import { initReviewPrompt } from '../lib/retention/reviewPrompt';
import {
  initStreakPush,
  cancelStreakPush,
  scheduleStreakPush,
} from '../lib/retention/streakPush';

export default function RootLayout() {
  useEffect(() => {
    // Initialize all shared services on app launch.
    // Ketchapp principle: boot straight into the game — no splash gates,
    // no login walls. These inits are fire-and-forget.
    initAnalytics();
    initAds();
    initIAP();
    initCrossPromo();
    void initReviewPrompt();
    initStreakPush();

    // Streak-saver push: cancel when the player opens the app,
    // (re)schedule when they leave (8 PM local if streak is active).
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void cancelStreakPush();
      } else if (state === 'background' || state === 'inactive') {
        void scheduleStreakPush();
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
