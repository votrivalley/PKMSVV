# PKMSVV repository rules

## Permanent Android release identity

- The user authorized one permanent FULL LAN Android signing identity on 2026-10-28.
  Its public certificate is pinned in `config/android-signing-identity.json`.
- Never generate, replace or rotate that key, change the pinned fingerprint/alias,
  or change `com.votrivalley.pkmsvv.fulllan` without a new explicit user instruction.
- Use the existing four `PKMSVV_ANDROID_*` Actions Secrets. They describe ONE key,
  not four signing identities. Missing/inconsistent secrets must fail the release.
- Run `scripts/verify-android-signing.cjs` before signing and on the final APK.
  Never weaken/bypass the verifier or tests to accept a different certificate.
- Deliver only `PKMSVV-Android-FULL-LAN-SIGNED-UPDATE` to players. Never publish
  fresh runner debug APKs as updates or create a replacement key to make CI pass.
- Increase the Android versionCode for each subsequent player update, preserving
  save keys and personal ticket/Shiny rules. Keep the same certificate forever.
- The first migration from historical ephemeral debug certificates requires a
  verified JSON save backup before replacing an old app. Never uninstall, clear
  data or claim the new certificate can update those old APKs in place.
- Private backup material is outside this Git repository in a protected sibling
  directory on the owner's machine. Never commit it, log it, expose passwords in
  chat, or upload any keystore/password as a build artifact. See
  `docs/ANDROID_UPDATE_SIGNING.md` for enrollment and recovery boundaries.

## Gameplay and QA

Keep the current maximum of 10 trainers. Read `docs/CLOUD_HANDOFF.md` before
continuing. Preserve offline Wi-Fi hosting and the full existing test suite.
