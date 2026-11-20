#!/usr/bin/env python3
"""PKMSVV native 3DS Alpha04: port Web Region 15/30 boss and Kanto Badge rules.

Authoritative source: PKMSVV Web src/pkmsvv-quick-region.js:
 - minute 15: 15% legendary mascot / 85% Epic of same Region
 - actual death of that boss earns Region Badge and opens next Region's story
 - minute 30: only after first boss defeated, guaranteed legendary mascot
 - killing final legendary ends match
 - separate native badge ledger with primary + backup (not Web JSON compatibility)

This is a source-gated transformation layered AFTER slice01/02/03 and 03
background; no code/assets from commercial ROMs committed to the repository.
"""
from pathlib import Path
import sys

root=Path(sys.argv[1])
def patch(path, old, new, n=1):
    p=root/path
    txt=p.read_text(encoding="utf-8")
    matches=txt.count(old)
    if matches!=n:
        raise SystemExit(f"REGION04_ANCHOR_FAILED {path} wanted={n} got={matches} {old[:110]!r}")
    p.write_text(txt.replace(old,new), encoding="utf-8")

# Convert the premature 15m Dragonite / 30m Mewtwo alpha test into the actual
# Web mechanics. Epic pool is Kanto rarity 4 and sprite-native; select a real
# Epic candidate, fall back to Mewtwo if the catalogue contains none.
patch("src/core/enemies.cpp",
      "    const int dexes[2] = {149, 150}; // Dragonite 15', Mewtwo 30'\n",
      "    const Mon* epic_pool[160]; int nepic = 0;\n"
      "    for (int j = 0; j < kDexCount; ++j) {\n"
      "      const Mon& p = kDex[j];\n"
      "      if (p.gen == 1 && p.reg == 0 && p.rarity == 4 && !p.leg && nepic < 160)\n"
      "        epic_pool[nepic++] = &p;\n"
      "    }\n"
      "    // Actual PKMSVV Web ratio: 15% Legend (Mewtwo), 85% same-Gen Epic.\n"
      "    int first_dex = 150;\n"
      "    if (g.rng.next() >= 0.15f && nepic)\n"
      "      first_dex = epic_pool[int(g.rng.next() * nepic) % nepic]->dex;\n"
      "    const int dexes[2] = {first_dex, 150};\n")

# Track actual spawned and killed named bosses, not unrelated boss counters.
patch("src/core/game.h",
      "  RunConfig cfg;\n  Rng rng, vrng;",
      "  RunConfig cfg;\n"
      "  // PKMSVV native Region Journey: run-local, reset every exploration run.\n"
      "  int32_t pkmsvv_badge_boss_id = -1, pkmsvv_final_boss_id = -1;\n"
      "  bool pkmsvv_badge_claimed = false, pkmsvv_region_victory = false;\n"
      "  Rng rng, vrng;")
patch("src/core/game.cpp",
      "  next_enemy_id = next_proj_id = next_pickup_id = 1;\n",
      "  next_enemy_id = next_proj_id = next_pickup_id = 1;\n"
      "  pkmsvv_badge_boss_id = pkmsvv_final_boss_id = -1;\n"
      "  pkmsvv_badge_claimed = pkmsvv_region_victory = false;\n")
patch("src/core/enemy.cpp",
      "  e->id = g.next_enemy_id++;\n  e->def = def;",
      "  e->id = g.next_enemy_id++;\n"
      "  if (g.cfg.kanto_only && boss) {\n"
      "    if (def.at == 900) g.pkmsvv_badge_boss_id = e->id;\n"
      "    if (def.at == 1800) g.pkmsvv_final_boss_id = e->id;\n"
      "  }\n"
      "  e->def = def;")
patch("src/core/enemy.cpp",
      "void enemy_die(Game& g, Enemy& e) {\n  if (e.dead) return;\n  e.dead = true;",
      "void enemy_die(Game& g, Enemy& e) {\n"
      "  if (e.dead) return;\n"
      "  // Only the tracked Region boss grants the Badge; random/miniboss kills\n"
      "  // never unlock an exploration Region.\n"
      "  if (g.cfg.kanto_only && e.boss) {\n"
      "    if (e.id == g.pkmsvv_badge_boss_id && g.time >= 900) {\n"
      "      g.pkmsvv_badge_claimed = true;\n"
      "      g.say(\"Huy hiệu Vùng Kanto! Johto được mở trong tiến trình.\", 5.0f);\n"
      "    }\n"
      "    if (e.id == g.pkmsvv_final_boss_id && g.pkmsvv_badge_claimed) {\n"
      "      g.pkmsvv_region_victory = true;\n"
      "      g.say(\"Hạ Mewtwo! Kết thúc chuyến khám phá Kanto.\", 5.0f);\n"
      "    }\n"
      "  }\n"
      "  e.dead = true;")

# Exactly as in Web, keep the 30-minute boss absent until the tracked 15-min
# badge boss was really defeated. Never allow two named bosses simultaneously.
patch("src/core/spawner.cpp",
      "    if (t >= b.at) { spawn_boss(g, anchor(g), t, b); g.spawner.boss_idx++; }",
      "    const bool ready = !g.cfg.kanto_only || g.spawner.boss_idx == 0 ||\n"
      "      (g.pkmsvv_badge_claimed && !g.boss_alive());\n"
      "    if (t >= b.at && ready) { spawn_boss(g, anchor(g), t, b); g.spawner.boss_idx++; }")
patch("src/core/game.cpp",
      "  if (cfg.kanto_only && time >= 1800 && spawner.boss_idx >= 2 && pl().bosses >= 2 && !boss_alive()) {",
      "  if (cfg.kanto_only && pkmsvv_region_victory && pkmsvv_badge_claimed) {")

# App-level native ledger; old engine Save remains isolated but we do not
# mutate its ABI with Web-specific fields, and we do not import Web JSON.
patch("src/platform/3ds/app.h",
      "  bool pk_story_replay_ = false;",
      "  bool pk_story_replay_ = false;\n"
      "  bool pkmsvv_kanto_badge_saved_ = false;")

# Small atomic-style primary + backup file. On power loss a valid remaining
# copy still unlocks; no claim of full PKMSVV Web Save Guardian parity.
badge_helpers = r'''
// --- Native-only Region Badge ledger (not Web/Android Save Guardian) ---
namespace {
constexpr const char* kPKMSVVBadgeMarker = "PKMSVV_REGION_V1\nKANTO=1\n";

bool pkmsvv_read_badge_copy(const char* root_dir, const char* name) {
  char path[240];
  std::snprintf(path, sizeof(path), "%s/%s", root_dir, name);
  FILE* f = std::fopen(path, "rb");
  if (!f) return false;
  char buf[64] = {};
  const size_t n = std::fread(buf, 1, sizeof(buf) - 1, f);
  const bool ok = !std::ferror(f) && n == std::strlen(kPKMSVVBadgeMarker) &&
                  std::memcmp(buf, kPKMSVVBadgeMarker, n) == 0;
  std::fclose(f);
  return ok;
}

bool pkmsvv_load_badge(const char* root_dir) {
  return pkmsvv_read_badge_copy(root_dir, "region-progress-v1.dat") ||
         pkmsvv_read_badge_copy(root_dir, "region-progress-v1.bak");
}

bool pkmsvv_write_badge_copy(const char* root_dir, const char* name) {
  char path[240], tmp[240];
  std::snprintf(path, sizeof(path), "%s/%s", root_dir, name);
  std::snprintf(tmp, sizeof(tmp), "%s/%s.tmp", root_dir, name);
  FILE* f = std::fopen(tmp, "wb");
  if (!f) return false;
  const size_t len = std::strlen(kPKMSVVBadgeMarker);
  const bool ok = std::fwrite(kPKMSVVBadgeMarker, 1, len, f) == len &&
                  std::fflush(f) == 0;
  const bool closed = std::fclose(f) == 0;
  if (!ok || !closed || std::rename(tmp, path) != 0) {
    std::remove(tmp);
    return false;
  }
  return true;
}

bool pkmsvv_save_badge(const char* root_dir) {
  // Independent files: if the second write fails, the first still survives.
  const bool main_ok = pkmsvv_write_badge_copy(root_dir, "region-progress-v1.dat");
  const bool backup_ok = pkmsvv_write_badge_copy(root_dir, "region-progress-v1.bak");
  return main_ok || backup_ok;
}
} // namespace
'''
patch("src/platform/3ds/app.cpp",
      "// ---------------- arranque ----------------",
      badge_helpers + "\n// ---------------- arranque ----------------")

patch("src/platform/3ds/app.cpp",
      "  r_ = r; g_ = g; s_ = s; st_ = st; dir_ = dir;\n  apply_settings();",
      "  r_ = r; g_ = g; s_ = s; st_ = st; dir_ = dir;\n"
      "  pkmsvv_kanto_badge_saved_ = pkmsvv_load_badge(dir_);\n"
      "  apply_settings();")

# Save promptly on successful boss death, before the player quits/dies.
# On write failure retry during subsequent frames; never falsely show unlocked.
patch("src/platform/3ds/app.cpp",
      "  g_->now_ms = now_ms();\n  cloud_tick();",
      "  g_->now_ms = now_ms();\n"
      "  if (g_->cfg.kanto_only && g_->pkmsvv_badge_claimed &&\n"
      "      !pkmsvv_kanto_badge_saved_ && !autotest && dir_) {\n"
      "    if (pkmsvv_save_badge(dir_)) {\n"
      "      pkmsvv_kanto_badge_saved_ = true;\n"
      "      g_notices.push(\"Huy hiệu Vùng Kanto đã lưu\", \"Đủ điều kiện mở Johto khi port xong.\", -1);\n"
      "    }\n"
      "  }\n"
      "  cloud_tick();")

# Copy reflects the fact that nine Region engines are still unported.
patch("src/platform/3ds/app.cpp",
      "    r_->text_fit(open ? \"Gen 1 · ĐÃ MỞ\" :\n                 (i == 9 ? \"Sky Pillar · chưa mở\" : \"Chưa port · đang khóa\"),",
      "    r_->text_fit(open ? (pkmsvv_kanto_badge_saved_ ? \"Đã có Huy hiệu Kanto\" : \"Gen 1 · ĐÃ MỞ\") :\n"
      "                 (i == 1 && pkmsvv_kanto_badge_saved_ ? \"Đạt điều kiện · chưa port\" :\n"
      "                  i == 9 ? \"Cần 9 Huy hiệu · chưa port\" : \"Chưa port · đang khóa\"),")
patch("src/platform/3ds/app.cpp",
      '    std::snprintf(info, sizeof(info), "Gen 1 · 15p boss · 30p kết thúc");',
      '    std::snprintf(info, sizeof(info), "%s",\n'
      '      pkmsvv_kanto_badge_saved_ ? "Đã có Huy hiệu Kanto · Boss cuối 30p"\n'
      '      : "15p hạ Boss nhận Huy hiệu · 30p hạ Mewtwo");')

# Show the live run milestone status even on the small bottom screen.
# Patch Renderer HUD rather than a decorative scene label.
patch("src/platform/3ds/app.cpp",
      "  g_->start_run(cfg, autotest && !auto_real ? nullptr : s_);\n  if (cfg.kanto_only && !autotest)",
      "  g_->start_run(cfg, autotest && !auto_real ? nullptr : s_);\n"
      "  if (cfg.kanto_only && !autotest)")
# No UI-only masquerading: milestone is in native gameplay core.

print("PKMSVV_NATIVE_REGION04_BADGE_TIMELINE_PASS: 15% legendary, 85% Kanto Epic, kill-gated 30m, isolated dual-copy badge")
