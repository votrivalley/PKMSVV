# Android 1.5.42 P0 single-engine fix (2026-10-29)

Android root now uses exactly the PC LAN+AI compiled engine. The former APK had two independent game runtimes, causing black/Spanish screens and hanging load when opening /ai/game/. Root now contains Co-op and AI in the same compiled script; player taps AI to create a local room without navigation, while host/join use root /index.html?pkmsvvWifi=1 with WebRTC invitation exchange.

Only one Co-op handler runs. Android landscape adjusts dimensions but retains PC menu ordering and top alignment. FULL Pokémon assets, save keys and signing certificate persist. Version 1.5.42, versionCode 1005042, package com.votrivalley.pkmsvv.fulllan; never debug-sign. QA includes tests/android-full-lan.test.cjs and tests/coop-platform-browser.cjs. Still requires signed Android CI Success and device testing.
