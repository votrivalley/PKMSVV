# PKMSVV — Pippi trail / Co-op icon QA (15/11/2026)

## Release policy
- Working branch: `fix/pippi-follow-menu-qa-20261115`.
- Android: compile a signed **in-place QA** APK. Same package and signing certificate as main; versionCode 2000115.
- Windows: compile a separate PC portable **QA** package from the same source.
- Web: **do not deploy public Cloudflare Pages** until the player explicitly approves QA. This branch is intentionally separate from `release/pokemon-chuyen-sinh-2.0-web`.

## Visual bugs reported from real Android screenshots
1. Co-op shows an extra handshake hovering above the 42px designed co-op sprite.
2. Pippi often sits on top of the player's Pokémon (Celebi) rather than walking behind it.

## Fixes
- Co-op: keep a single original authored WebP cell; clear injected legacy icon DOM, do not reinsert `G.Icons.html('online')`, suppress handshake pseudo content. Restrict a mutation observer to the main menu navigation list, so late-injected duplicate art is cleaned without scanning combat nodes.
- Pippi: the follower no longer aims for the exact player location. Record a trail of the player's real movement, follow a target **72 world units** behind it and enforce at least **56 world units** separation. On high-DPI Android WebView, convert **62 CSS px** to world units, preventing the viewport scaling from collapsing that gap visually.
- Player water/terrain slowdowns: Pippi's motion speed follows the **observed actual displacement** of the player, so it doesn't bypass speed penalties. Does not require Pippi to be a second hitbox or change enemy AI.
- A long map/portal warp may reset the follower position safely, but ordinary turns/halts do not teleport Pippi.
- PC build and staged Web: package Pippi PMD animation/portrait sprites, menu icon WebP, and menu reconciler. This avoids Android/PC gameplay drift.

## Regression QA
- Android launcher: one icon only for PC, Co-op and Arena; verify no handshake above Co-op after entering/exiting the menu repeatedly.
- Kanto exploration: Pippi begins visibly behind the Pokémon. Move in straight lines, reverse direction, pause, change direction, then cross water. Check Pippi has its own moving/idle animation and never merges into the player.
- Use Android at landscape high-DPI resolution, check separation and the Ragnarok-style pixel speech-bubble emotes.
- Confirm Co-op, Arena, Royale and Tranh Trứng do not spawn Pippi.
- Confirm Moon Miracle and save migration still behave as before.
- PC portable: verify Pippi PMD Walk-Anim.png and 16 portrait assets included, plus scripted menu fix.
- Only after Android/PC approval: merge the QA branch, test staged Web, then explicitly deploy Web.

This is **QA only**, not proof of real-device visual correctness. Back up your save JSON before installing.


## QA build findings and known limitations
- Android signed QA: automatic runtime suites passed; versionCode 2000115 and stable signing certificate verified. APK available as a **direct prerelease asset**, not only Actions Artifacts.
- High-density screens: the renderer chooses at least 62 CSS pixels of visible separation, scaling the 72-world-unit trailing distance up if needed.
- PC build: legacy `tests/berry.test.cjs` currently has two failing countdown assumptions in the baseline; they are recorded as a **nonblocking QA warning**, not silently fixed or deleted. Pippi/Co-op regression remains blocking.
- The scripted companion follows the player movement route and speed, but does not yet perform independent physics collision/pathfinding like a second player. Real-device water/obstacle QA is needed.
- No live Web deployment occurred from this branch; do not merge into the Web release branch until approved.

## Góc Pippi — PC tile & synchronized portraits
- PC now contains a fourth interactive tile **Góc Pippi** (Pippi's Corner), illustrated with Clefairy #035 rather than an OS emoji.
- The new screen shows Bond rank 1–10, XP progress to next rank, free remaining training points, and four upgrade trees.
- **One training point per Bond level after Bond 1**, carried across previous saves; unused points are not lost.
- Training trees (max 3 each) and unlock thresholds:
  1. Hồi máu / Healing: available with points, +2% max HP per upgrade level.
  2. Cổ vũ / Cheer: Bond 2, +1.5% attack while buff active per upgrade level.
  3. Làm chậm / Slowdown: Bond 3, stronger/longer slow per level; bosses resist.
  4. Khiên trăng / Moon Shield: Bond 7, +0.35s emergency protection per level.
- Bond 10 Moon Miracle remains automatic and unchanged. No second currency and no PokéCoins cost.
- A two-press confirmation prevents accidental training; buttons are keyboard/gamepad focusable. The save transaction rolls back if commit refuses.
- In combat, every Pippi speech event picks its matching Clefairy PMD facial portrait; the same event adds a custom pixel-art Ragnarok-style bubble on the portrait. If one portrait is unavailable, it falls back to Normal then a matching original vector face.
- All changes remain on the QA branch; public Cloudflare Web deploy is still blocked pending user approval.
