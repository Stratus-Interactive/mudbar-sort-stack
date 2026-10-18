# Sort Stack

The satisfyingly perfect color-sort puzzle — pour, sort, clear.
A **MudBar Entertainment** title (deliberately separate from Stratus Interactive).

## Game

Tap a tube, tap a destination. Pour contiguous same-color balls until every
tube is a single color or empty. 750+ procedural levels, daily challenge,
tube skins + background collections, star ratings.

Built on the shared MudBar game template (`~/workspace/game-template/`):
AdMob ads, RevenueCat IAP, PostHog analytics, cross-promo hub.

## Brand

- Bundle ID: `com.mudbarentertainment.sortstack`
- URL scheme: `mudbar-sortstack://`
- Company: MudBar Entertainment

## IAP products (Evan creates in App Store Connect)

| ID | Title | Price |
|---|---|---|
| `remove_ads` | Remove Ads | $4.99 |
| `coins_small` / `coins_medium` / `coins_large` | Coin packs | $0.99 / $1.99 / $3.99 |
| `starter_bundle` | Starter Bundle | $2.99 |
| `neon_tube_pack` | Neon Tube Pack | $1.99 |
| `zen_backgrounds` | Zen Backgrounds | $0.99 |

## CI

`.github/workflows/eas-build.yml` triggers a production iOS build on every
push to `main` — guarded by the `EXPO_TOKEN` repo secret. Evan's setup:
1. Add `EXPO_TOKEN` in repo Settings → Secrets (one robot token for all games)
2. Approve PRs — each merge ships a fresh TestFlight build

## Dev

```bash
npm install
npx tsc --noEmit   # typecheck
npx expo start     # dev server
```
