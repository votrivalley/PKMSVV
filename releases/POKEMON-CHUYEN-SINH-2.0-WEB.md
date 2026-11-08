# Pokémon Chuyển Sinh 2.0 — Web public release

Release date: 2026-11-09 (Asia/Ho_Chi_Minh).

The owner approved publishing the tested Web QA game to https://pkmsvv-web.pages.dev/ .

## Immutable build and safety

- Tested game snapshot: GitHub Actions run 42516317677.
- Source commit: 6c82e42afefbfe4e4c920d450298d5308e12d5d2.
- Release validation: run 42517840324, SUCCESS.
- Publication uses a pinned QA artifact with Chromium verification, not a rebuild of the gameplay engine.
- Saved browser data and Save Guardian files are retained.
- Players should export a JSON save backup before first-time PokéBox migration.
- Previous Cloudflare Pages deployment remains available for rollback without altering player saves.

## Player-facing 2.0

- Approved 2.0 bilingual changelog first, 1.0 history preserved.
- Unified PokéBox, Pokédex and Upgrade menu dimensions.
- Equal-sized recruitment cards.
- Random Mint and standard/Hidden Ability effects.
- Hidden Ability Capsules are unavailable to buy and worth twice as much.
- Bag item/MT sales return half the purchase price.
- Wild item drops: Mint and Ability Capsule 0.8%, Reforge Prism 0.4%, Elite x2, Legendary x4.

## Rollback

Re-deploy the previous Cloudflare Pages deployment if a critical public issue arises.
Never reset browser-local save data, erase stored Pokémon, or overwrite a player's JSON backup.

## Android UI hotfix — 2026-11-09

- Fix PokéBox/Pokédex/Upgrade tabs being enlarged, cut off and impossible to scroll in Android Chrome and Android WebView in landscape mode.
- Fit each Pokémon tab to the **actual dynamic viewport** including system safe-area; allow native finger scroll to reach Team Six, the collection, details and all upgrade buttons.
- Fix Android APK's home screen topbar spacing, preventing its primary actions from being pushed underneath the header.
- Enable Gamepad **L1/R1** for three-tab Pokémon navigation, preserving selection and never repeating while held.
- Tested with real Chromium phone emulation at **390×844 portrait**, **844×390 landscape** and **980×460 landscape**, with real DOM measurements and controller input.
- QA release snapshot run **42520192007**, source commit **81a1101a948be0fb2944ce302c8781eace1f21fa**.
- Independently signed Android QA APK run **42520191975**, separate install ID, not the official Android package.
- Refresh the PWA service-worker cache namespace to safely evict 2.0's broken mobile styles. Do not change JSON saves, PokéBox rank data, save schema or game economy.
