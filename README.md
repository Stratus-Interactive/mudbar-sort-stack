# MudBar Game Template

Shared Expo foundation for all MudBar Entertainment hyper-casual titles.
**Brand: MudBar Entertainment** — deliberately separate from Stratus Interactive.

## Design reference: Ketchapp

Every game built on this template follows Ketchapp's proven formula:

1. **Single-gesture control** — one input, playable by anyone in 3 seconds
2. **Boot straight into gameplay** — no menus, no tutorials, no gates; tap and play
3. **Learn by failing** — no text instructions; the mechanic teaches itself
4. **Instant restart** — fail → retry in under 2 seconds, always
5. **Short feedback loop** — every action gets immediate visual/haptic response
6. **Flat, minimal art** — must read clearly in a 15-second video ad
7. **Endless or bottomless** — chase the top score, never "finish"

If a design decision conflicts with this list, the list wins.

## What's included

| Module | Path | What it does |
|---|---|---|
| Config | `lib/config.ts` + `game.config.json` | Per-game name, bundle IDs (`com.mudbarentertainment.*`), URL schemes (`mudbar-*://`), API keys |
| Ads | `lib/ads/` | Rewarded (max 2/session), interstitial (max 1/3min, breaks only), banner (menus only) |
| IAP | `lib/iap/` | RevenueCat, Remove Ads $4.99, coin packs, starter bundle, paywall UI |
| Retention | `lib/retention/` | Daily rewards (streaks), level/best-score store, collections, haptics + sound |
| Cross-promo | `lib/crosspromo/` | "More games from MudBar" sheet, house ads (every 5th slot), deep links, player UUID |
| Analytics | `lib/analytics/` | PostHog, standardized events across all titles |

## Cloning for a new game

1. Copy this directory → `~/workspace/<game-slug>/`
2. Edit **`game.config.json`**: name, slug, iosBundleId, androidPackage, urlScheme, tagline
3. Replace **`app/index.tsx`** with the real game (keep the init calls in `app/_layout.tsx`)
4. Add game art to **`assets/`** (icon.png, adaptive-icon.png, splash)
5. Set EAS secrets: AdMob IDs, RevenueCat keys, PostHog key, cross-promo URL
6. Define products in App Store Connect (Evan), matching IDs in `lib/iap/products.ts`
7. `eas build --platform ios --profile production`

**Don't touch** `lib/` unless fixing a shared bug — changes here affect all games.

## Frequency caps (from monetization playbook — do not relax)

- Rewarded: max **2** opportunities per session
- Interstitial: max **1 per 3 minutes**, natural breaks only, **never** after a fail
- Banner: menus/shop only, never during gameplay
- House cross-promo ad: every **5th** interstitial slot

## Kill criteria (at 2,000 installs)

Kill or pivot if: D1 <20%, rewarded opt-in <8%, or ARPDAU <$0.015.
