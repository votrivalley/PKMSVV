# Mega animated candidate pack — PC Fast Start only

Date: 2026-10-29. This is the **asset import/QA stage**, not 36 unlocked Mega forms.

## Scope
- The existing Mega Lucario 30-second solo prototype remains unchanged.
- With \`PKMSVV_MEGA_SPRITE_PACK=1\`, preparation imports 35 **additional** candidate
  animated 8-direction forms from pinned PMDCollab/SpriteCollab, producing 36
  locally packaged sets total. Source revision: \`448d3af85e2cfa85a8c5ead076eddb145251b473\`.
- The new registry is \`G.PKMSVV_MEGA_READY\`, with \`assetOnly: true\` and
  \`qaRequired: true\`. No other form is newly selectable or permanently unlocked.
- An individual form must have Idle, Walk, Attack, Hurt (plus useful fallback
  Shoot/Charge/Faint), a readable texture grid in 8 directions, and local source
  credits. Missing required art causes CI to fail instead of shipping a placeholder.
- Pinned per-form CC BY-NC 4.0 credits are copied into each
  \`assets/pokemon/{virtualSpriteId}/CREDITS-MEGA.txt\` folder.
- Mega Pokémon keep their base Pokédex IDs; the 10000+/20000+ IDs are visual
  aliases only, *never* Gacha entries or real species.
- Mega legendaries and other champion/story forms stay locked pending acquisition
  quests, Mega Stones, gameplay balancing, multiplayer replication and live QA.
- No existing save migration, tickets, Shiny odds, Android signing or package IDs
  are changed.

## CI and validation
Only the Windows LAN workflow opts into \`PKMSVV_MEGA_SPRITE_PACK=1\` during
\`npm run prepare:lan\`. It must then pass \`npm run test:mega\` and
\`npm run test:mega:pack\` **before** packaging \`PKMSVV-LAN-Windows-Fast-Start\`.

The existing Web/Android/Switch preparation remains at the Lucario prototype
level until multi-platform gameplay QA, to avoid adding hundreds of unused assets
to unrelated player packages. All in-game sprites are offline; the builder alone
requires network access during CI.

## Next milestone
Wire a controlled **solo PC preview** for the nonlegendary forms (without
awarding real stones), verify stat conversions and effects for each, then
implement quests/champion unlocks and deterministic multiplayer state. Track the
6 partial and 54 missing animations separately.
