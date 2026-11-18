# Tháp Thiên Không – Hall of Origin source audit (18/11/2026)

## Exact user request
- Reuse **the real Hall of Origin** map seen in screenshots from the official **PokéSurvivor** Arceus Judgment at approximately 34:18–34:33 on 17 November 2026.
- **Do not substitute** a newly generated concept image, screenshot crop, the older `judgment` ruins tileset, or a vaguely similar generic Dragon/Flying arena.
- Targets in PKMSVV: Chapter 10 Rayquaza combat `src/pkmsvv-champion-arena.js:startSky()` (currently `G.World.setArena(...type:'dragon')`) and, when gameplay-consistent, the 10th exploration Sky Pillar map `src/pkmsvv-quick-region.js` (currently theme `dragon`). These are separate gameplay paths.
- Do not alter AI, Rayquaza boss physics, HP, combat or saved progress simply to change the art.

## Verified original source
- Official URL: https://pokesurvivor.com/en/
- Official frontend currently references `js/app.min.js?v=05f665510a`.
- Official public bundle `https://pokesurvivor.com/js/app.min.js` returned 200, ~4.9MB, on 18 November.
- Current Hall of Origin is a **procedural Canvas level**, not a standalone image source. The bundled, obfuscated JavaScript includes dynamic clouds and stage geometry. No standalone image asset path was found for the Hall.
- Original non-minified `/js/world/world.js`, `/js/systems/judgment.js`, `/dev.html`, and app sourcemap returned 404.
- The pinned upstream commit used by PKMSVV (`11fe868c640b62ac37beacc222e056bc4d9ec892`, October) **does not include Hall of Origin**. Its `judgment` theme still renders the older Ruins of Judgment, so changing Sky Pillar from `dragon` to `judgment` would not fulfill the request.
- QA audits: GitHub Actions #44214433668, #44214723563, #44215005516, #44215223558 (inspect source only; no deployment).
- Official site licensing note: code PolyForm Noncommercial 1.0.0 since 14 October 2026; contributors/third-party art credits must be checked and preserved.

## What is and is not changed
- Icon optical scale changed in `src/pkmsvv-pc-menu-clean-qa.css`: research image 32 -> **35.2px (+10%)**; Co-op and Arena 34 -> **47.6px (+40%)** via a non-interactive `::after` sprite drawn over the same 36px anchor; label tracks unchanged. Browser QA assertion added.
- **Hall of Origin is NOT YET integrated.** Do not report a completed map replacement or advertise a new map release.
- Next implementation needs either auditable unobfuscated render source of the Nov 2026 Hall or a verified extraction/port of the original Canvas drawing logic. Preserve full moving-camera geometry, terrain collisions and platform edges; verify both desktop/mobile rendering, content parity and noncommercial attribution before enabling.
- No change to production Web, Android signing identity, or the existing save keys.
