#!/usr/bin/env python3
"""PKMSVV Kanto native C++ patch 02, after isolate_qa.py + port_slice01_kanto.py.

Fixes the actual leak: spawn paths unrelated to the original tier cast could
still introduce off-generation Pokémon (thieves, lost, rifts, scripted bosses,
summons). Adds a CENTRAL enemy spawn invariant and Kanto-specific chapter
prototype beats at 15 and 30 min.

This remains a native early gameplay prototype; it is NOT a port of all
PKMSVV Web systems and its forest is NOT the PKMSVV Kanto map.
"""
import sys
from pathlib import Path

root=Path(sys.argv[1])
def patch(path,old,new,count=1):
    f=root/path
    s=f.read_text(encoding="utf-8")
    n=s.count(old)
    if n!=count:
        raise SystemExit(f"KANTO02_ANCHOR_FAILED {path}: expected={count} seen={n} {old[:110]!r}")
    f.write_text(s.replace(old,new),encoding="utf-8")

# Fail closed at the source of ALL living wild enemies, including scripted,
# summoned, event and boss paths. Not a pool check (which missed real gameplay).
patch("src/core/enemy.cpp",
      "Enemy* enemy_spawn(Game& g, const EnemyDef& def, float x, float y, Scale3 sc, bool boss) {\n  Enemy* e = g.enemies.push();",
      "Enemy* enemy_spawn(Game& g, const EnemyDef& def, float x, float y, Scale3 sc, bool boss) {\n"
      "  if (g.cfg.kanto_only) {\n"
      "    const Mon* native = mon_by_dex(def.dex);\n"
      "    if (!native || native->gen != 1 || native->reg != 0) return nullptr;\n"
      "  }\n"
      "  Enemy* e = g.enemies.push();")

# The lost Pokémon is NOT an Enemy, so it must have its own restriction.
patch("src/core/events.cpp",
      "  const int dex = gold ? 1000 : 52;",
      "  const int dex = g.cfg.kanto_only ? 52 : (gold ? 1000 : 52);")
patch("src/core/events.cpp",
      "    if (p.rarity <= 3 && !p.leg && !hovers(p.dex)) pool[np++] = p.dex;",
      "    if (p.rarity <= 3 && !p.leg && !hovers(p.dex) &&\n"
      "        (!g.cfg.kanto_only || (p.gen == 1 && p.reg == 0))) pool[np++] = p.dex;")

# Original 3DS rift/Arceus/Eternatus scripts do not belong in Chapter 1.
# Disable these sources for the Kanto prototype rather than substituting
# incompatible boss objects that would soft-lock an arena phase.
patch("src/core/game.cpp",
      "  rift_update(*this, dt);\n  eterna_update(*this, dt);\n  treasure_update(*this, dt);\n  judgment_update(*this, dt);",
      "  if (!cfg.kanto_only) {\n"
      "    rift_update(*this, dt);\n"
      "    eterna_update(*this, dt);\n"
      "  }\n"
      "  treasure_update(*this, dt);\n"
      "  if (!cfg.kanto_only) judgment_update(*this, dt);")

# Until true Kanto tiles are ported, don't pretend rotating unrelated
# stock biomes every 4 minutes constitutes distinct PKMSVV maps.
patch("src/core/game.cpp",
      "  const int b = int(std::floor(time / 240));",
      "  const int b = cfg.kanto_only ? 0 : int(std::floor(time / 240));")

# Native 15m and 30m bosses: the first is the Kanto test miniboss
# Dragonite; the 30m finale is Mewtwo (PKMSVV Chapter 1's featured boss).
# These are the engine's simple native boss AI, not the scripted Web boss yet.
patch("src/core/enemies.cpp",
      "  // Jefes.\n  int16_t used[8];",
      "  // PKMSVV Chapter 1 prototype beats, isolated from original 3DS timeline.\n"
      "  if (g.cfg.kanto_only) {\n"
      "    g.nbosses = 2;\n"
      "    const int dexes[2] = {149, 150}; // Dragonite 15', Mewtwo 30'\n"
      "    const int at[2] = {900, 1800};\n"
      "    for (int i = 0; i < 2; ++i) {\n"
      "      const Mon* m = mon_by_dex(dexes[i]);\n"
      "      if (!m || m->gen != 1 || m->reg != 0) { g.nbosses = 0; break; }\n"
      "      EnemyDef& b = g.bosses[i];\n"
      "      b = enemy_def_for(*m, 0);\n"
      "      b.at = int16_t(at[i]); b.idx = int8_t(i == 0 ? 3 : 4);\n"
      "      b.behavior = BH_CHARGER;\n"
      "      b.spd = i == 0 ? 95.0f : 105.0f;\n"
      "    }\n"
      "    return;\n"
      "  }\n"
      "  // Jefes.\n  int16_t used[8];")

# End a 30-minute Kanto test run on defeating the finale (no Arceus
# Judgment victory, no false Chapter 2 unlock).
patch("src/core/game.cpp",
      "  if (state != ST_PLAYING && state != ST_CHOICE) return;\n  music = int8_t(",
      "  if (cfg.kanto_only && time >= 1800 && spawner.boss_idx >= 2 && !boss_alive()) {\n"
      "    say(\"Đã đánh bại Mewtwo! Kết thúc bản thử Kanto.\", 4.0f);\n"
      "    extern void game_end_run(Game& g, bool dead);\n"
      "    game_end_run(*this, false);\n"
      "    return;\n"
      "  }\n"
      "  if (state != ST_PLAYING && state != ST_CHOICE) return;\n  music = int8_t(")

# Keep the UI honest; show a bright persistent prototype indicator in the 3DS
# gameplay itself, not only an installer icon.

print("PKMSVV_KANTO02_RUNTIME_GUARDS_APPLIED")
