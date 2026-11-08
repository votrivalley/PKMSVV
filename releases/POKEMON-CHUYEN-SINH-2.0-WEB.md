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
