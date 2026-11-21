# PKMSVV — Báo cáo đối chiếu toàn bộ skill 3DS (21/11/2026)

**Đã đối chiếu tự động**, không phỏng đoán từ tên skill: bản 3DS v1.0.0 `src/gen/gamedata.cpp` và `docs/SKILL_BALANCE.md` của PKMSVV.

| Chỉ số | Kết quả |
|---|---:|
| Skill trong 3DS | **176** |
| Skill gốc PKMSVV | **103** |
| Trùng ID (đúng nhóm hiệu ứng) | **103** |
| Skill 3DS còn thiếu so với 103 gốc | **73** |
| Nhóm hiệu ứng 3DS | **37** |
| Nhóm hiệu ứng PKMSVV | **23** |
| Nhóm hiệu ứng khác cần port | **14** |

**Chú ý:** Các skill `rapid-spin` và `whirlpool` đã có sẵn trong 103 skill gốc. `magnitude` đã có nhóm `quake`. Không được đăng ký lại hoặc đổi cơ chế của ba skill này.

PR #42 đã có thêm `earthquake` dạng **tremor** và `surf` dạng **wave** trong nhánh thử nghiệm (chưa phát hành), nghĩa là **71/73 skill đang chờ đưa sang**. Bubble tiến hóa thành Surf vẫn giữ nguyên cơ chế cũ.

## Toàn bộ 73 skill 3DS chưa có trong 103 bản gốc

### projectile — 9
`dragon-pulse`, `sludge-bomb`, `scald`, `hurricane`, `water-pulse`, `stone-edge`, `pyro-ball`, `snipe-shot`, `spirit-shackle`

### dash — 5
`megahorn`, `dragon-ascent`, `volt-tackle`, `meteor-assault`, `sunsteel-strike`

### meteor — 5
`sacred-fire`, `diamond-storm`, `doom-desire`, `glacial-lance`, `thousand-arrows`

### punch — 5
`fire-punch`, `ice-punch`, `thunder-punch`, `drain-punch`, `plasma-fists`

### nova — 4
`lava-plume`, `psystrike`, `origin-pulse`, `sparkling-aria`

### beam — 3
`blue-flare`, `aeroblast`, `moongeist-beam`

### charge — 3
`roar-of-time`, `photon-geyser`, `dynamax-cannon`

### homing — 3
`moonblast`, `attack-order`, `flower-trick`

### weather — 3
`sunny-day`, `rain-dance`, `sandstorm`

### cone — 2
`blizzard`, `silver-wind`

### cross — 2
`fire-blast`, `seed-flare`

### leap — 2
`acrobatics`, `shadow-force`

### melee — 2
`crunch`, `behemoth-blade`

### scissor — 2
`x-scissor`, `stone-axe`

### screen — 2
`reflect`, `light-screen`

### shove — 2
`relic-song`, `clanging-scales`

### spin — 2
`mortal-spin`, `darkest-lariat`

### storm — 2
`thunder`, `judgment`

### stun — 2
`waterfall`, `dark-void`

### tremor — 2
`earthquake`, `glaciate`

### blitz — 1
`extreme-speed`

### boom — 1
`explosion`

### boomerang — 1
`secret-sword`

### bounce — 1
`psyshock`

### buff — 1
`geomancy`

### chain — 1
`malignant-chain`

### decoy — 1
`double-team`

### guard — 1
`protect`

### quake — 1
`precipice-blades`

### rest — 1
`rest`

### wave — 1
`surf`

## 14 nhóm 3DS cần thêm engine hoặc xử lý status mới

- **punch**: fire-punch, ice-punch, thunder-punch, drain-punch, plasma-fists
- **weather**: sunny-day, rain-dance, sandstorm
- **cross**: fire-blast, seed-flare
- **leap**: acrobatics, shadow-force
- **scissor**: x-scissor, stone-axe
- **screen**: reflect, light-screen
- **storm**: thunder, judgment
- **tremor**: earthquake, glaciate
- **blitz**: extreme-speed
- **boom**: explosion
- **decoy**: double-team
- **guard**: protect
- **rest**: rest
- **wave**: surf

## Mục tiêu QA khi triển khai

- Giữ nguyên toàn bộ 103 skill có ID đã tồn tại; không đổi save hay tỉ lệ gacha.
- Không lấy nhầm tên tiến hóa để làm chiêu độc lập khác, trừ khi có ID riêng như Surf.
- Chiêu trạng thái cần đánh giá tương tác support, PvP, co-op và tự động chọn skill.
- Không bật skill mới trong nhiều người cho tới khi có đồng bộ mạng và kiểm thử hiệu suất.
- Tránh tự ý thêm chiêu đặc trưng của Pokémon khác vào pool chung; đối chiếu danh sách độc quyền/loại Pokémon được học từ bản 3DS.

**Nguồn QA:** https://github.com/votrivalley/PKMSVV/actions/runs/44896296990
**Artifact JSON + Markdown:** https://github.com/votrivalley/PKMSVV/actions/runs/44896296990/artifacts/14704057389
