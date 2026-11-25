# Research lab V3.1 — backdrop repair QA

- Previous backdrop available at commit `4e25fbfcf2365bc89b93e7404fc1a36375b1ed87` (blob `385222f23999c7373249a1a0b45b15b1a1600ee3`).
- Repaired background: 1500 × 1049 PNG, SHA-256 `b4ecaa52975ca1351b9812ced36a335bbeaa0a8eb71622c46433b8c31248528b`.
- Restored continuous floor tile rows, wall belt and central brass outline from original-art texture. Fixed chest, plaques, lamps, entry rug and main emblem remain.
- All six furniture PNGs, their slots, positions and dimensions are unchanged. Local composite check: 705,752 fully opaque sprite pixels; 0 changed.
- The background itself intentionally differs from V3; pixel-exact reconstruction of the old room is therefore no longer claimed.
- New art is the default only in the isolated V3 QA build; no live deploy. Final visual backdrop review and browser regression required.
- `readyForFurnitureSwap` remains false. No price, purchase, equip, save, or Co-op economy changes.
