# Switch One-file NRO Beta handoff — 2026-10-28

- Artifact `PKMSVV.nro` must contain **embedded Brewser v0.1.1.31 runtime and v1.5.41 FULL patched game assets** in RomFS. The NRO is a self-installing launcher: copy one NRO to `sd:/switch/` and open it in hbmenu full-RAM mode.
- First launch extracts Brewser and game automatically into sdmc. Later launches do not redo the game install if the version stamp and files are intact. It never wipes Brewser local saves.
- This is **not** a native Switch engine, **not** a standalone NSP, and not hardware-QA verified. A binary-format and bundle-size test is not proof the game boots on hardware.
- Safety: no Nintendo proprietary keys, no prod.keys or firmware access, licensed third-party Brewser release with attribution, preserve game licensing and save data.
- Required hardware QA: Switch Lite/standard Joy-Con and touch inputs, 10–30 minutes survival, Egg Rush AI, music, memory/heap, local save persistence after restart and update, standby/resume.
- If the large NRO fails to load in applet mode, require full-RAM Homebrew Menu and treat it as beta. Never present the launcher NSP from the old ZIP as a complete game.
