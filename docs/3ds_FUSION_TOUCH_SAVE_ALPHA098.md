# PKMSVV 3DS Alpha 09.8 — Fusion touch + Save Guardian QA

Alpha 09.8 branches from Alpha09.7 ([PR #40](https://github.com/votrivalley/PKMSVV/pull/40)). All work stays in Draft; no main, Web, PC or Android deployment.

## Fix
- Native bottom LCD is only 320×240; the original Fusion list draws options at `y=92+32*i`. For `i>=5`, rows are off-screen. Prior native 8-slot Fusion logic was functional but the UI was not safe.
- Native `CH_BOND` now shows **four 32px rows per page** (y=92..220). Footer at y=220..239 includes page indicator and previous/next arrows, supporting both tap and L/R. The card cursor is the single source of truth for render and hit-testing.
- Touching a row maps to the corresponding original skill index; it never treats the pagination footer as a selected skill. Previous first-choice marking survives page navigation.
- Solo 8-skill expansion is preserved; native Co-op logic and original <=4 skill UI remain unchanged.

## Real guest tests, not mocks
`touch8qa` is an opt-in native 3DS test mode:
1. Start an eight-move Kanto Solo run.
2. Inject `UiIn.tap` into the real `App::update` / `App::in_run` path: right-page arrow → seventh move → left-page arrow → first move.
3. Require the actual `CMD_BOND` and native game tick to perform Fusion, with exactly eight unique moves represented in seven slots.
4. Verify independent combat continues.
5. On the **same emulated SD**, create a nested QA-only save: `sdmc:/3ds/pkmsvv-kanto01/fusion098-saveqa/`. Write initial JSON (kills 200, coins 111), rewrite (kills 260, coins 222), read newest, intentionally corrupt QA `save.json`, and verify fallback to preceding `save.bak` (kills 200, coins 111).

This never deliberately writes or corrupts the player's actual `sdmc:/3ds/pkmsvv-kanto01/save.json`.

## Limits
- Automated taps are injected at the 3DS native `App::update` layer in Azahar, not a real New 3DS touchscreen or an OS-level stylus press.
- Save restoration is a single-emulator-session test in a nested QA folder; actual power cycle/restart, SD migration, and the **real user save** still require physical hardware QA.
- 30-second Azahar FPS is not 30-minute New 3DS performance. Web image sprite bytes have not been ported.
- Never merge or mark production hardware validated from these tests alone.

## CI evidence
Pending actual run completion. Link GitHub Actions and hashes only after the workflow passes.
