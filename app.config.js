/**
 * Expo config — parameterized per game.
 * Each game clones this template and overrides lib/config.ts;
 * this file reads from there so bundle IDs, schemes, and names
 * stay in sync automatically.
 *
 * Brand: MudBar Entertainment (NOT Stratus Interactive).
 */
const gameJson = require('./game.config.json');

const CONFIG = gameJson;

module.exports = {
  expo: {
    name: CONFIG.name,
    owner: 'mudbar-entertainment',
    slug: CONFIG.slug,
    extra: {
      eas: {
        projectId: '7304b330-595d-4c50-a8dd-9a3ca7698cc4',
      },
    },
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: CONFIG.urlScheme,
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,

    ios: {
      bundleIdentifier: CONFIG.iosBundleId,
      buildNumber: '1',
      supportsTablet: false,
      // Privacy manifest is auto-merged from SDK plugins.
      // Evan must declare data collection accurately in App Store Connect.
      infoPlist: {
        NSUserTrackingUsageDescription:
          'This identifier helps us show you relevant ads and keep the game free.',
      },
    },

    android: {
      package: CONFIG.androidPackage,
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
    },

    plugins: [
      'expo-router',
      [
        'react-native-google-mobile-ads',
        {
          // AdMob app IDs — set via EAS secrets at build time
          androidAppId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_ID ?? '',
          iosAppId: process.env.EXPO_PUBLIC_ADMOB_IOS_ID ?? '',
          // Delay app measurement to allow ATT prompt first
          delayAppMeasurementInit: true,
          // SKAdNetwork identifiers (auto-included by the plugin)
          skAdNetworkItems: [
            'cstr6suwn9.skadnetwork',
            '4fzdc2evr5.skadnetwork',
            '2fnua5tdw4.skadnetwork',
            'ydx93a7ass.skadnetwork',
            '5a6flpkh64.skadnetwork',
            'p78axxw29g.skadnetwork',
            'v72qych5fj.skadnetwork',
            'ludvb6z3bs.skadnetwork',
            'cp8zw746q7.skadnetwork',
            '3sh42y64q3.skadnetwork',
            'c6k4g5qg8m.skadnetwork',
            's39g2k73mm.skadnetwork',
            '3qy4746246.skadnetwork',
            'f38h382jlk.skadnetwork',
            'hs6bdukanm.skadnetwork',
            'prcb7njmu6.skadnetwork',
            'v4nxqhlyqp.skadnetwork',
            'wz6y4fa2l6.skadnetwork',
            'yclnxrl5pm.skadnetwork',
            't38b6d8341.skadnetwork',
            '7ug5zh24hu.skadnetwork',
            'gta9lk7p23.skadnetwork',
            'vutu7akeur.skadnetwork',
            'y5ghdn5avj.skadnetwork',
            'n6fk4v7mav.skadnetwork',
            'v9wttpbfk9.skadnetwork',
            'n38luad5bx.skadnetwork',
            'm8dbw4si6q.skadnetwork',
            'g2y4y55b64.skadnetwork',
            '44jx6755aq.skadnetwork',
            'k674qkevps.skadnetwork',
            '9rd848q2bz.skadnetwork',
            'n6x8vvk2h5.skadnetwork',
            '6g9un7ys2b.skadnetwork',
            '4mnbhqkjed.skadnetwork',
            'a7e4r3uakr.skadnetwork',
            'fz2k9k5dm8.skadnetwork',
            'e5fvkx8z3g.skadnetwork',
          ],
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
    },
  },
};
