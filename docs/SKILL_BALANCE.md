# PKMSVV — 103 kỹ năng (v0.5)

Cơ chế từ v0.4 cho 6–8 chiêu tự đánh cùng lúc. V0.5 cân lại 103 chiêu thuộc 23 nhóm theo nhịp sinh tồn và giới hạn tốc độ kích hoạt sau nâng cấp.

## 6 buff và thời gian duy trì

| Chiêu | Cấp 1 | Cấp 2 | Cấp 3 | Cấp 4 | Cấp 5 |
|---|---|---|---|---|---|
| Swords Dance, Nasty Plot, Agility, Harden, Dragon Dance | Bật 7s, chu kỳ 16s | Bật 8,75s | +20% hiệu lực | Bật 11,38s | Vĩnh viễn, không cộng dồn |
| Aqua Ring | Bật 8s, chu kỳ 16s | Bật 10s | +20% hiệu lực | Bật 13s | Vĩnh viễn, không cộng dồn |

Buff cấp 1–4 luôn có khoảng nghỉ và không chịu giảm hồi chiêu toàn cục. Cấp 5 chuyển trạng thái liên tục ngay lúc nâng cấp, không lặp hoạt ảnh. HUD hiển thị ON, OFF hoặc MAX và số giây.

## Thời gian hồi của 103 chiêu

Bảng dưới đây dùng thời gian hồi cơ sở khi mới học (trước khi giảm hồi chiêu từ lá bài); các chiêu như Orbit/Aura có cơ chế sát thương liên tục nên giá trị này thể hiện khoảng chạm/đánh.
| Chiêu | Loại | Hồi gốc | Hồi mới Lv.1 | Sàn hồi (sau nâng cấp) | Thời gian buff Lv.1 |
|---|---|---:|---:|---:|---:|
| bug-buzz | aura | 0.45s | **1.22s** | 0.55s | — |
| bulldoze | aura | 0.70s | **1.49s** | 0.55s | — |
| dazzling-gleam | aura | 0.50s | **1.27s** | 0.55s | — |
| discharge | aura | 0.45s | **1.22s** | 0.55s | — |
| giga-drain | aura | 0.55s | **1.33s** | 0.55s | — |
| night-shade | aura | 0.50s | **1.27s** | 0.55s | — |
| powder-snow | aura | 0.55s | **1.33s** | 0.55s | — |
| dragon-rage | beam | 1.00s | **3.15s** | 1.15s | — |
| flash-cannon | beam | 1.05s | **3.21s** | 1.15s | — |
| hydro-pump | beam | 1.50s | **3.75s** | 1.15s | — |
| ice-beam | beam | 1.10s | **3.27s** | 1.15s | — |
| psybeam | beam | 1.15s | **3.33s** | 1.15s | — |
| bonemerang | boomerang | 0.95s | **2.80s** | 1.05s | — |
| psycho-cut | boomerang | 0.80s | **2.65s** | 1.05s | — |
| razor-leaf | boomerang | 0.90s | **2.75s** | 1.05s | — |
| acid-spray | bounce | 0.66s | **2.61s** | 1.05s | — |
| electro-ball | bounce | 0.62s | **2.56s** | 1.05s | — |
| mirror-shot | bounce | 0.64s | **2.58s** | 1.05s | — |
| power-gem | bounce | 0.66s | **2.61s** | 1.05s | — |
| seed-bomb | bounce | 0.60s | **2.53s** | 1.05s | — |
| signal-beam | bounce | 0.60s | **2.53s** | 1.05s | — |
| agility | buff | 0.85s | **16.00s** | 16.00s | 7s |
| aqua-ring | buff | 0.90s | **16.00s** | 16.00s | 8s |
| dragon-dance | buff | 0.70s | **16.00s** | 16.00s | 7s |
| harden | buff | 0.85s | **16.00s** | 16.00s | 7s |
| nasty-plot | buff | 0.85s | **16.00s** | 16.00s | 7s |
| swords-dance | buff | 0.85s | **16.00s** | 16.00s | 7s |
| hex | chain | 0.90s | **3.31s** | 1.30s | — |
| thunderbolt | chain | 0.95s | **3.35s** | 1.30s | — |
| hyper-beam | charge | 2.20s | **5.91s** | 2.70s | — |
| solar-beam | charge | 2.30s | **6.02s** | 2.70s | — |
| bubble-beam | cone | 0.65s | **2.82s** | 1.15s | — |
| dragon-breath | cone | 0.70s | **2.88s** | 1.15s | — |
| flamethrower | cone | 0.70s | **2.88s** | 1.15s | — |
| aerial-ace | dash | 0.75s | **3.60s** | 1.65s | — |
| flame-charge | dash | 0.80s | **3.65s** | 1.65s | — |
| quick-attack | dash | 0.75s | **3.60s** | 1.65s | — |
| u-turn | dash | 0.70s | **3.55s** | 1.65s | — |
| air-slash | homing | 0.55s | **2.22s** | 0.90s | — |
| draining-kiss | homing | 0.55s | **2.22s** | 0.90s | — |
| energy-ball | homing | 0.62s | **2.32s** | 0.90s | — |
| ice-shard | homing | 0.32s | **1.91s** | 0.90s | — |
| mist-ball | homing | 0.55s | **2.22s** | 0.90s | — |
| shadow-sneak | homing | 0.45s | **2.09s** | 0.90s | — |
| sucker-punch | homing | 0.70s | **2.42s** | 0.90s | — |
| bite | melee | 0.45s | **1.55s** | 0.75s | — |
| body-slam | melee | 0.95s | **2.09s** | 0.75s | — |
| bug-bite | melee | 0.42s | **1.51s** | 0.75s | — |
| dragon-claw | melee | 0.52s | **1.62s** | 0.75s | — |
| karate-chop | melee | 0.50s | **1.60s** | 0.75s | — |
| lick | melee | 0.48s | **1.58s** | 0.75s | — |
| metal-claw | melee | 0.50s | **1.60s** | 0.75s | — |
| play-rough | melee | 0.60s | **1.71s** | 0.75s | — |
| tackle | melee | 0.50s | **1.60s** | 0.75s | — |
| vine-whip | melee | 0.62s | **1.73s** | 0.75s | — |
| wing-attack | melee | 0.55s | **1.66s** | 0.75s | — |
| hail | meteor | 1.20s | **5.21s** | 2.10s | — |
| meteor-mash | meteor | 1.40s | **5.42s** | 2.10s | — |
| rock-slide | meteor | 1.30s | **5.32s** | 2.10s | — |
| spikes | mine | 1.20s | **4.96s** | 2.00s | — |
| string-shot | mine | 1.10s | **4.86s** | 2.00s | — |
| toxic-spikes | mine | 1.10s | **4.86s** | 2.00s | — |
| bubble | nova | 1.00s | **3.65s** | 1.50s | — |
| dark-pulse | nova | 1.15s | **3.85s** | 1.50s | — |
| fairy-wind | nova | 1.00s | **3.69s** | 1.50s | — |
| heat-wave | nova | 1.25s | **3.97s** | 1.50s | — |
| hyper-voice | nova | 1.15s | **3.84s** | 1.50s | — |
| mud-shot | nova | 1.10s | **3.75s** | 1.50s | — |
| psychic | nova | 1.35s | **4.11s** | 1.50s | — |
| ancient-power | orbit | 0.28s | **0.71s** | 0.60s | — |
| fire-spin | orbit | 0.30s | **0.73s** | 0.60s | — |
| gust | orbit | 0.26s | **0.69s** | 0.60s | — |
| leaf-storm | orbit | 0.26s | **0.69s** | 0.60s | — |
| aura-sphere | projectile | 0.62s | **2.24s** | 0.80s | — |
| confusion | projectile | 0.58s | **2.18s** | 0.80s | — |
| ember | projectile | 0.52s | **2.10s** | 0.80s | — |
| poison-sting | projectile | 0.34s | **1.86s** | 0.80s | — |
| rock-throw | projectile | 0.70s | **2.34s** | 0.80s | — |
| shadow-ball | projectile | 0.66s | **2.29s** | 0.80s | — |
| sludge | projectile | 0.60s | **2.21s** | 0.80s | — |
| thunder-shock | projectile | 0.40s | **1.94s** | 0.80s | — |
| water-gun | projectile | 0.44s | **1.99s** | 0.80s | — |
| magnitude | quake | 1.15s | **4.46s** | 1.75s | — |
| disarming-voice | shove | 1.15s | **3.60s** | 1.30s | — |
| extrasensory | shove | 1.20s | **3.65s** | 1.30s | — |
| vacuum-wave | shove | 1.10s | **3.55s** | 1.30s | — |
| whirlwind | shove | 1.10s | **3.55s** | 1.30s | — |
| gyro-ball | spin | 1.05s | **3.26s** | 1.20s | — |
| night-slash | spin | 1.00s | **3.20s** | 1.20s | — |
| outrage | spin | 1.10s | **3.31s** | 1.20s | — |
| rapid-spin | spin | 1.00s | **3.20s** | 1.20s | — |
| rolling-kick | spin | 0.95s | **3.14s** | 1.20s | — |
| dynamic-punch | stun | 1.70s | **5.57s** | 2.00s | — |
| freeze-dry | stun | 1.60s | **5.46s** | 2.00s | — |
| rock-tomb | stun | 1.70s | **5.57s** | 2.00s | — |
| thunder-wave | stun | 1.60s | **5.46s** | 2.00s | — |
| flame-wheel | trail | 0.28s | **3.89s** | 1.90s | — |
| toxic | trail | 0.30s | **3.91s** | 1.90s | — |
| substitute | turret | 4.00s | **10.70s** | 4.20s | — |
| will-o-wisp | turret | 3.50s | **10.23s** | 4.20s | — |
| ominous-wind | vortex | 3.00s | **7.05s** | 3.40s | — |
| sand-tomb | vortex | 3.00s | **7.05s** | 3.40s | — |
| whirlpool | vortex | 3.00s | **7.05s** | 3.40s | — |

Ghi chú: Orbit hoạt động liên tục, hồi chiêu dùng như khoảng gây sát thương lại; Aura là đòn diện rộng lặp lại. Các dạng tiến hóa chiêu tăng sát thương/số lượng nhưng tuân theo sàn hồi riêng. Bảng được kiểm thử tự động trên toàn bộ 103 chiêu.

## Buff ON/OFF — phương án A

- Buff mỗi nhóm chỉ có **một hiệu ứng hoạt động**. Kích hoạt lại chỉ làm mới thời gian, không cộng tầng.
- Vòng sáng quanh chân Pokémon: **đủ 360° khi ON**, biến mất hoàn toàn khi OFF. Nhiều nhóm buff có vòng màu riêng.
- Thanh buff thay `×1` bằng `ON`; cấp MAX duy trì mãi hiện `MAX`.
- Buff MAX cùng chỉ số không bị buff thường ghi đè thời hạn vô hạn hay hiệu lực cao hơn.
- Pokédex hiện đúng chỉ số Tính cách đã áp dụng (cùng `G.Mons.monFor` với trận đấu); `+10%` và `−10%` đặt cạnh chỉ số tương ứng, không nhân hai lần.
