# G-Max stage 8 — isolated roster discovery

Base: votrivalley/PKMSVV, feature/gmax-power-qa-20261127, bec20c537df4f3621c0eb5e5659eaf2b0a80ea9b. Do not use the older ronvotri/PKMSVV v1.2.1 tree for this project. Existing G-Max, Fusion, production and release branches remain unchanged.

Stage 7 evidence: run 45942375380, 11 tests passed. Exact Charizard Gigantamax folders sprite/0006/0003 and sprite/0006/0003/0001 have Normal and Shiny Idle, 168x192 frame, 168x1536 sheet (eight rows); missing required Walk, Attack, Hurt, Shoot, Charge, Faint XML. Pikachu exact form folders sprite/0025/0001 and sprite/0025/0001/0001 lack all seven checked animations and credits in that report. Neither is battle-ready.

Stage 8 searches the same pinned PMDCollab/SpriteCollab revision for 32 base species, recursively identifying exact G-Max labels, including nested style names. Never guesses numeric form IDs. Reports missing species, absent labels, ambiguous multiple forms and missing Shiny separately. Every candidate requires seven animation headers matching eight direction rows, declared frames/durations, and nonempty credits per variant. SHA-256 hashes preserve source evidence. Structural candidates still need visual review of every relevant animation, offsets and clipping, full engine compatibility, contributor attribution and rights review. No asset registration, unlock, save migration, version bump, build or deployment.

Run: node --test tests/gmax-roster-audit.test.cjs tests/gmax-source-audit.test.cjs tests/special-power-qa.test.cjs
Then: node scripts/audit-gmax-roster.cjs

Only the isolated branch triggers the new audit workflow. Output: dist/gmax-roster-audit/report.json (GitHub Actions artifact GMAX-ROSTER-QA-NEVER-LIVE). Results must be interpreted from the actual job log and report; a successful workflow alone does not prove any sprite is usable. Network failures other than 404 fail the run instead of labeling content missing. No changes to existing files or runtime.
