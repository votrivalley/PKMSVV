# PKMSVV — Save Guardian 2.0 & LAN Match Recovery
**QA checkpoint — 2026-11-06 | Isolated QA branch only**
Repository: votrivalley/PKMSVV
Branch: feature/pokebox-stage1-isolated-qa

## P0: Save Guardian 2.0
**Sources:** `src/cloudflare/save-guardian.js`, `src/pkmsvv-save-ui.js`, `scripts/patch-save-guardian-v2.cjs`, `scripts/prepare-game.cjs`.

- Keep legacy `pkmsvv.safe.v1.pkmsvv_offline.latest` and `previous` keys for backward-compatible snapshots. Store a bounded **local-only** 40-entry metadata journal in `pkmsvv.safe.v2.pkmsvv_offline.journal`; the journal never contains a full raw save or sends data online.
- Journal confirmed local DB commits and explicit transactions. Failed synchronous/async commit does not get logged. Pending explicit transaction holds snapshots until resolved; no duplicate journal row for unchanged save. This is a *save-change audit*, not proof of every in-game vendor transaction if something bypasses DB.commit.
- Preserve permanent achievements and chapter unlock flags, Crown Seals, learned TMs, Mega unlocks, Berry use/completions. Restore preview compares **current** vs **candidate** with permanent gains/losses and **informational** PokéCoins, tickets, Berry bag, Mega Stones, Arena points. A larger item balance NEVER auto-selects a save.
- The existing invalid-primary startup recovery retains its automatic fallback behavior to a known-valid v1 local snapshot; this is only for a corrupted/unparseable primary. A valid primary is NEVER auto replaced by another candidate. Recovery is logged in the journal.
- Explicit import (Save Management) always displays a comparison and a user-confirmed Restore button, persists pre-import backup and previous generation, writes once, reloads only after successful write. From the expandable **Lịch sử thay đổi Save** and **Hai bản Save dự phòng** controls, players can inspect the journal and compare/restore the latest or previous local snapshot. The fallback-restore flow preserves the current good save separately before replacing it, and rejects failure to persist that pre-restore copy.
- Cloudflare preload and shared Web/Windows/Android bundle use the same idempotent guardian. No changes to Firebase, Cloudflare account linkage, server-side saves, or public deploy. Scope of the inherited guardian remains the original `pkmsvv_offline` profile and same-origin local storage. Users must still export JSON outside the app for uninstall/device-loss protection.

## P1: Co-op and Arena reliability
**Sources:** `src/lan/match-recovery.js`, `src/lan/arena-pvp.js`, `scripts/patch-arena-pvp.cjs`.

- Arena Solo + Champion human PvP: Host has already periodically streamed authoritative `apvp` frames. Now a client returning from Android app background, re-opening the page or reconnecting to the peer requests a fresh state scoped by *room, seed, authenticated sender and match type*. Requests/replies are throttled; stale sequence numbers, incorrect seeds, forged clients and attempts to return from terminal `result` to `fight` are ignored.
- Co-op/Royale/Egg Rush/Berry LAN modes: after an **actual successful Host `finishMatch()`**, replay a bounded terminal status up to 8 times at 1.8s intervals via the LAN/Wi-Fi relay, plus answer explicit resume requests. The receiving Client verifies real Host uid, room, match seed and mode. A completed session can clean up exactly once and return to the lobby. No Client coin/berry/win/seal reward path or new Game.endRun call exists in this recovery layer. A disconnection safely exits to menu without inventing a victory.
- Started-in-open-lobby state is not interpreted as a match finish. A late finish response for a previous seed cannot emit the new match's terminal token. Room-open signal is a secondary recovery path only when gameplay began from a *closed* room.
- No automatic restoration of a dead WebRTC PeerConnection without a new manual invite; lost network for longer than available signaling safely exits. A host closing or losing connection cannot guarantee gameplay rewards for a disconnected client; this requires separate authoritative settlement protocol.

## Automated tests
- `tests/web-save-guardian-v2.test.cjs`: spendable balances, chapter/Mega/Berry comparisons, manual restore rollback, bounded journal, committed vs pending DB operations, async commit, old v1 snapshot compatibility, cross-platform install.
- `tests/web-match-recovery.test.cjs`: lost terminal and replay, invalid sender/room/seed, Android foreground request, initial open lobby, Wi-Fi loss, duplicate terminal, late finish.
- `tests/arena-pvp.test.cjs`: lost Champion result, Android app switch, higher-sequence stale combat packet, replay rate limiting, existing Host PvP semantics.
- All above run within `npm run test:web`. QA Web/Windows/Android packaging runs in GitHub Actions, not production.

## Still required before release
1. On real Windows/Android/Web with a copy of a 558-Pokémon save: validate import/preview rendering with thousands of item entries and save persistence across restart.
2. Intentionally corrupt a test save, check auto-recovery, both snapshots and pre-import recovery; simulate storage quota full and an app suspended during a purchase.
3. LAN/Direct Wi-Fi soak: live Host/Client disconnect at 3-2-1, mid-Co-op, Champion result packet dropped, Android background/foreground 30–120s, switch networks, retry room, ensure no duplicate pay.
4. Review native Co-op completion payout policy with disconnected players; this recovery mechanism **does not guarantee granting unreceived rewards**, by design.
5. Only then merge into stable branch and package the signed, same-version PC/Web/Android release. Do not overwrite existing player saves in QA.

**No public Cloudflare deployment and no change to the main production branch.**

## Safety addendum — Shared Host match epochs
- LAN server and Direct Wi-Fi room snapshots now carry a Host-issued `matchSerial` counter, incremented once when a new battle closes the lobby. If the native Co-op `cfg.seed` is not available, both sides use this verified shared epoch instead; reused room IDs alone can never authorize an old result.
- Client disconnect to UI/menu is a **forfeit/connection loss, not a win**; no reward settlement is replayed. Late Host finish results for a previous match are ignored once a different match starts.
- CI source test includes the Host epoch fallback, room reopen, stale result and duplicate terminal scenarios.
