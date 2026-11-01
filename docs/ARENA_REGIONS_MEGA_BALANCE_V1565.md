# QA Arena theo vùng / Champion Mega — v1.5.65

Ngày kiểm tra: 2026-11-01. Source branch: `feature/lan-local-beta`.

## Điều đã xác minh

**10 vùng có bản đồ gameplay riêng theo các theme native của engine**, nhưng **chưa có 10 bộ sân vận động pixel-art custom** theo concept. Theme gameplay thực tế được gọi bởi `G.World.setArena({type})` và `G.World.setBiome(G.Tiles.arenaBiome(type), true)`, không chỉ đổi tên trên nút. UI có 10 bộ luật buff/debuff đối xứng lên người chơi và đối thủ. Cần làm artwork bespoke cho từng vùng ở sprint sau, bảo đảm hình sprite pixel, camera, hitbox và vùng né đòn.

| Vùng | Boss đại diện gốc | Terrain theme | Luật sân |
|---|---|---|---|
| Kanto | Charizard | Fire | ST +8% |
| Johto | Scizor / Tyranitar tạm | Steel | ST −8% |
| Hoenn | Swampert / Gardevoir tạm | Water | Pokémon đi bộ chậm 10% |
| Sinnoh | Garchomp / Lucario tạm | Ground | Tốc độ −12% |
| Unova | Excadrill | Rock | ST −5%, tốc độ −6% |
| Kalos | Greninja / Dragalge tạm | Dark | ST +6%, tốc độ −3% |
| Alola | Golisopod / Drampa tạm | Bug | Tốc độ +12% |
| Galar | Falinks / Corviknight tạm | Fighting | ST +10% |
| Paldea | Baxcalibur / Tatsugiri tạm | Ice | Tốc độ −10% |
| Tháp Thiên Không | Dragonite | Dragon | ST +15%, tốc độ +5% |

**Chú ý:** Không gọi tạm hình của Pokémon thường là sprite Mega. Form chỉ thay sprite nếu `artReady` và animation Idle thật có trong `G.SPRITE_META`. Nếu thiếu, **boss vẫn chuyển pha gameplay**, dùng hào quang tím để báo phase 2 mà không clone/vẽ giả Pokémon Mega.

## Kiểm tra và sửa cơ chế Mega

- Trước sửa: `_pkmsvvChampionMegaEligible=mode==='story'&&round===3&&region>0`, Kanto bị bỏ sót.
- Sau sửa: **cả 10 Champion cuối từng vùng**, vòng chung kết Hành Trình Vương Miện, đều có `_pkmsvvChampionMegaEligible=true`.
- Khi HP xuống ≤50%, **trong lúc bị đánh trúng**: kích hoạt pha Mega. Intercept trực tiếp `Enemy.hurt` và `Enemy.die` trên actor sống. Một đòn chí mạng vượt từ hơn 50% xuống dưới 0 không thể làm boss chết/phát thưởng trước khi chuyển pha.
- Pha 2: `maxHp*=2;hp=maxHp`, sát thương `×2`; tốc độ di chuyển chỉ tăng có kiểm soát để vẫn né được qua màn hình cảm ứng; AI sử dụng fury, giảm cooldown thật từ `Enemy.bossEnd` (không chỉ sửa `shotCd` vô hiệu với boss).
- Pha cuối có tối đa **180 giây ở mỗi pha**; chuyển pha reset timer. Đăng quang đòi hỏi **đánh bại thực sự cả hai pha**; timeout không được giả lập `target.dead=true` để cấp Ấn Chứng.
- Ấn Chứng/cúp tiếp tục lưu theo key vùng cũ, không chỉnh migration hoặc cộng thưởng trùng.

## Cân bằng độ khó

- Final Champion bắt buộc tier `elite`, không còn tình trạng AI novice vượt bracket rồi trở thành boss yếu.
- Profile tăng dần theo vùng: HP factor 1.00→1.15, ATK factor 1.00→1.07, tempo 1.00→0.84, **cộng dồn** công thức scale theo vùng/round có sẵn. 10 vùng về cuối khó hơn, thời gian ra chiêu nhanh dần.
- Sát thương tuyệt đối thực tế vẫn chịu quy tắc venue áp dụng cho cả hai; bài test so sánh chỉ số sau khi chuẩn hóa buff/debuff theme.
- Boss giữ attack telegraph gốc để người chơi có cơ hội né, tránh 'one shot' thiếu dấu hiệu; không thay xác suất Berry/Gacha, chỉ số Pokémon người chơi ngoài trận hoặc Hero save.
- Phase 2 chống spam FX và dùng aura vẽ canvas; thiếu art thì không tự kéo sprite từ nguồn chưa kiểm chứng.

## QA tự động

`npm run test:arena:champion` gồm: 10 theme thật và trend độ khó; Kanto có phase 2; overkill tại 100% HP chưa phát loot/cúp; sát thương thường xuống đúng 50%; skill/CD boss thật; timeout không thưởng; màn hình glow khi thiếu sprite; seasonal event không phủ trên scored Arena. Web/Android/PC cùng source. Kết quả kiểm thử trên điện thoại thực/10 cuộc đấu thật vẫn là bước QA tiếp theo.

## Việc chưa hoàn thành

- **10 stadium bespoke pixel art riêng:** vẫn thiếu artwork, viền, khán đài, bản sắc đồ họa từng vùng; 10 theme native chỉ là bản vận hành beta.
- **Sprite Mega thật cho các Champion còn thiếu:** không được 'đã có' chỉ vì hiệu ứng chuyển pha hoạt động.
- Cần đánh giá hiệu suất và win rate/độ khó trực tiếp trên save mức trung bình và full-upgrade, nhất là tấn công vùng cuối trên Android.
