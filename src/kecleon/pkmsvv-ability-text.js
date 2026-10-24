/* Actual in-game Ability effects, translated and shortened for Pokédex.
 * These are PokéSurvivor's mechanics (not the mainline Pokémon descriptions).
 * Format: ability id | Vietnamese benefit | English benefit.
 */
G.PKMSVVAbilityText=(()=>{
 const TEXT=`
water-bubble|+40% ST hệ Nước; giảm 50% ST Lửa nhận vào|+40% Water damage; take 50% less Fire damage
technician|Chiêu yếu gây thêm 35% ST|Weak moves deal +35% damage
huge-power|+50% sát thương vật lý|+50% physical damage
hustle|+25% ST vật lý; đôi lúc đánh yếu|+25% physical damage; occasional weak hit
guts|Dưới 50% HP: +30% ST vật lý|Below 50% HP: +30% physical damage
adaptability|Chiêu cùng hệ gây +25% ST|Own-type moves deal +25% damage
protean|Tất cả chiêu gây +12% ST|All moves deal +12% damage
sheer-force|Chiêu gây trạng thái/đẩy lùi +25% ST, mất hiệu ứng|Status/knockback moves +25% damage, lose their effects
serene-grace|Hiệu ứng bỏng, độc, làm chậm mạnh gấp đôi|Burn, poison and slow effects are twice as strong
tough-claws|Cận chiến và lao tới +25% ST|Melee and dash moves deal +25% damage
reckless|Chiêu lao tới +25% ST|Dash moves deal +25% damage
tinted-lens|Chiêu kém hiệu quả vẫn gây ST bình thường|Not very effective hits deal normal damage
scrappy|Chiêu Thường/Giác đấu đánh trúng hệ Ma|Normal/Fighting moves hit Ghosts normally
sand-force|Bão cát: chiêu Đá, Đất, Thép +30% ST|Sandstorm: Rock, Ground and Steel moves +30% damage
solar-power|Trời nắng: +40% ST đặc biệt nhưng mất HP|Sun: +40% special damage but lose HP
sniper|Đòn chí mạng gây ×2 ST|Critical hits deal 2× damage
super-luck|+10% tỷ lệ chí mạng|+10% critical chance
compound-eyes|+6% tỷ lệ chí mạng|+6% critical chance
speed-boost|Mỗi 10 giây tăng 1,5% tốc độ, tối đa 30%|+1.5% speed every 10s, up to +30%
run-away|+8% tốc độ di chuyển|+8% movement speed
rain-dish|Trời mưa: hồi 1,5% HP/giây|Rain: heal 1.5% HP/sec
ice-body|Trời tuyết: hồi 1,5% HP/giây|Snow: heal 1.5% HP/sec
dry-skin|Được hệ Nước hồi máu, mưa hồi HP; yếu Lửa +25%|Water heals, rain regenerates; take +25% Fire damage
levitate|Bay trên nước, dung nham và bẫy; kháng Đất|Float over water, lava and traps; resist Ground
thick-fat|Giảm 40% ST Lửa và Băng nhận vào|Take 40% less Fire and Ice damage
heatproof|Giảm 50% ST Lửa nhận vào|Take 50% less Fire damage
multiscale|Gần đầy HP: giảm 50% ST nhận vào|Near full HP: take 50% less damage
shadow-shield|Gần đầy HP: giảm 50% ST nhận vào|Near full HP: take 50% less damage
filter|Giảm 25% ST siêu hiệu quả nhận vào|Take 25% less super-effective damage
solid-rock|Giảm 25% ST siêu hiệu quả nhận vào|Take 25% less super-effective damage
prism-armor|Giảm 25% ST siêu hiệu quả nhận vào|Take 25% less super-effective damage
fur-coat|Giảm 40% ST vật lý nhận vào|Take 40% less physical damage
fluffy|Giảm 30% ST vật lý nhận vào|Take 30% less physical damage
ice-scales|Giảm 40% ST đặc biệt nhận vào|Take 40% less special damage
shell-armor|Giảm 8% ST nhận vào|Take 8% less damage
battle-armor|Giảm 8% ST nhận vào|Take 8% less damage
intimidate|Giảm 12% ST vật lý nhận vào|Take 12% less physical damage
pressure|Giảm 8% ST nhận vào|Take 8% less damage
sturdy|Chịu đòn kết liễu với 1 HP, hồi sau 90 giây|Survive a lethal hit at 1 HP; 90s cooldown
regenerator|Hồi 0,6% HP/giây|Regenerate 0.6% HP/sec
magic-guard|Miễn ST từ dung nham và bẫy|Immune to lava and trap damage
stamina|Bị đánh cận chiến sẽ tăng Phòng thủ tạm thời|Melee hits grant temporary Defense
poison-touch|Đòn cận chiến/lao tới gây độc|Melee and dash attacks poison enemies
pickup|+15% Pokémonedas kiếm được|Earn +15% Pokémonedas
honey-gather|+15% Pokémonedas kiếm được|Earn +15% Pokémonedas
truant|Hồi chiêu chậm 60%; mỗi đòn +35% ST|Cooldown +60%; each hit deals +35% damage
slow-start|Phút đầu -40% ST và chậm, sau đó bình thường|First minute: -40% damage and slower speed
defeatist|Trên nửa HP: +15% ST; dưới nửa: -25%|Above half HP +15% damage; below half -25%
wonder-guard|Kháng đòn không siêu hiệu quả; yếu đòn siêu hiệu quả|Resist non-super-effective hits; weak to super-effective ones
schooling|+25% HP; trên 25% HP gây +50% ST|+25% max HP; above 25% HP deal +50% damage
zen-mode|Dưới nửa HP: +30% ST đặc biệt|Below half HP: +30% special damage
stance-change|Đổi công +20% ST / thủ -20% ST nhận mỗi 8 giây|Alternate +20% damage / -20% incoming damage every 8s
imposter|Tăng công và thủ theo dạng cân bằng|Balanced offensive and defensive stats
keen-eye|+5% tỷ lệ chí mạng|+5% critical chance
frisk|+20% tầm hút vật phẩm|+20% pickup magnet range
magnet-pull|+20% tầm hút vật phẩm|+20% pickup magnet range
sticky-hold|+20% tầm hút vật phẩm|+20% pickup magnet range
illuminate|+10% tầm hút vật phẩm|+10% pickup magnet range
sand-veil|Trong bão cát: 15% né đòn|Sandstorm: 15% dodge chance
snow-cloak|Trời tuyết: 15% né đòn|Snow: 15% dodge chance
gluttony|Hồi máu nhận vào +40%|Healing received +40%
harvest|Hồi máu nhận vào +30%|Healing received +30%
unnerve|Giảm 6% ST nhận vào|Take 6% less damage
infiltrator|Đòn đánh phá lá chắn của địch|Attacks break enemy shields
telepathy|8% xác suất né đòn|8% dodge chance
anticipation|6% xác suất né đòn|6% dodge chance
forewarn|6% xác suất né đòn|6% dodge chance
weak-armor|Trúng đòn vật lý: +20% tốc độ tạm thời|Physical hit: temporary +20% speed
steadfast|Trúng đòn: +10% tốc độ tạm thời, cộng dồn|Being hit grants stacking +10% temporary speed
rattled|Trúng Bọ/Ma/Bóng tối: +25% tốc độ tạm thời|Bug/Ghost/Dark hits: temporary +25% speed
hydration|Trời mưa: hồi 1% HP/giây, miễn làm chậm|Rain: heal 1% HP/sec and resist slowing
overcoat|Giảm 5% ST đặc biệt nhận vào|Take 5% less special damage
shed-skin|Mỗi 5 giây xóa làm chậm, hồi 2% HP|Clear slows and heal 2% HP every 5s
natural-cure|Hồi 0,3% HP mỗi giây|Regenerate 0.3% HP each second
healer|Hồi 0,3% HP mỗi giây|Regenerate 0.3% HP each second
leaf-guard|Trời nắng: miễn làm chậm, giảm 15% ST nhận vào|Sun: resist slows and take 15% less damage
oblivious|Miễn làm chậm từ đòn đánh/bẫy; vẫn chậm trên nước|Ignore attack/trap slows; water still slows
sweet-veil|Miễn làm chậm từ đòn đánh/bẫy; vẫn chậm trên nước|Ignore attack/trap slows; water still slows
limber|Miễn làm chậm từ đòn đánh/bẫy; vẫn chậm trên nước|Ignore attack/trap slows; water still slows
own-tempo|Miễn làm chậm từ đòn đánh/bẫy; vẫn chậm trên nước|Ignore attack/trap slows; water still slows
inner-focus|Miễn làm chậm từ đòn đánh/bẫy; vẫn chậm trên nước|Ignore attack/trap slows; water still slows
clear-body|Miễn làm chậm từ đòn đánh/bẫy; vẫn chậm trên nước|Ignore attack/trap slows; water still slows
white-smoke|Miễn làm chậm từ đòn đánh/bẫy; vẫn chậm trên nước|Ignore attack/trap slows; water still slows
full-metal-body|Miễn làm chậm từ đòn đánh/bẫy; vẫn chậm trên nước|Ignore attack/trap slows; water still slows
insomnia|Miễn làm chậm từ đòn đánh/bẫy; vẫn chậm trên nước|Ignore attack/trap slows; water still slows
vital-spirit|Miễn làm chậm từ đòn đánh/bẫy; vẫn chậm trên nước|Ignore attack/trap slows; water still slows
early-bird|Miễn làm chậm từ đòn đánh/bẫy; vẫn chậm trên nước|Ignore attack/trap slows; water still slows
shield-dust|Miễn làm chậm từ đòn đánh/bẫy; vẫn chậm trên nước|Ignore attack/trap slows; water still slows
mold-breaker|+12% ST lên trùm|+12% damage to bosses
damp|Miễn sát thương từ quái tự nổ|Immune to self-destructing enemy blasts
rivalry|+15% ST với kẻ địch cùng hệ|+15% damage to enemies sharing a type
synchronize|Phản sát thương khi bị đánh cận chiến|Reflect damage from melee attackers
prankster|Giảm 30% thời gian hồi chiêu buff|Buff cooldowns reduced by 30%
unburden|Không trang bị vật phẩm: +15% tốc độ|Without an item: +15% speed
unaware|Giảm 8% ST nhận vào|Take 8% less damage
defiant|Bị làm chậm: +20% ST vật lý|While slowed: +20% physical damage
competitive|Bị làm chậm: +20% ST đặc biệt|While slowed: +20% special damage
soundproof|Giảm 10% ST đặc biệt nhận vào|Take 10% less special damage
big-pecks|Giảm 8% ST vật lý nhận vào|Take 8% less physical damage
water-veil|Miễn bỏng dung nham; giảm 50% ST Lửa|Lava immunity; take 50% less Fire damage
pickpocket|Trúng đòn đôi lúc lấy được 1 xu|Being hit can steal one coin
analytic|+15% ST lên kẻ địch dưới nửa HP|+15% damage to enemies below half HP
klutz|Không trang bị vật phẩm: +12% ST|Without an item: +12% damage
hyper-cutter|Chiêu vật lý +6% ST|Physical moves deal +6% damage
contrary|Bị làm chậm thì di chuyển nhanh hơn|Move faster when slowed
quick-feet|Bị làm chậm thì di chuyển nhanh hơn|Move faster when slowed
bulletproof|Giảm 15% ST đặc biệt nhận vào|Take 15% less special damage
magic-bounce|Giảm 15% ST đặc biệt; né 10% đòn đó|Take 15% less special damage; dodge 10% of it
friend-guard|Giảm 6% ST nhận vào|Take 6% less damage
stench|10% xác suất làm chậm mục tiêu khi đánh|10% chance to slow enemies on hit
anger-point|Dưới nửa HP lần đầu: +25% ST đến hết trận|First time below half HP: +25% damage for the run
justified|+15% ST lên Pokémon hệ Bóng tối|+15% damage to Dark-type Pokémon
plus|Chiêu đặc biệt +10% ST|Special moves deal +10% damage
minus|Chiêu đặc biệt +10% ST|Special moves deal +10% damage
no-guard|Gây +15% ST, nhưng nhận +10% ST|Deal +15% damage but take +10% damage
aftermath|Cận tử một lần mỗi trận: phát nổ gây ST xung quanh|Once per run near death: explode for area damage
moody|Mỗi 10 giây +10% một chỉ số ngẫu nhiên|+10% to a random stat every 10s
tangled-feet|Bị làm chậm: 20% né đòn|While slowed: 20% dodge chance
skill-link|Đòn nhiều hit gây +25% ST|Multi-hit moves deal +25% damage
protosynthesis|Trời nắng: +20% ST|Sun: +20% damage
`.trim().split('\n');
 const BY={};
 for(const line of TEXT){
  const [id,vi,en]=line.split('|');
  if(id&&vi&&en)BY[id]=[vi,en];
 }
 BY['pure-power']=BY['huge-power'];
 BY['libero']=BY['protean'];
 const TYPES={
  normal:['Thường','Normal'],fire:['Lửa','Fire'],water:['Nước','Water'],
  electric:['Điện','Electric'],grass:['Cỏ','Grass'],ice:['Băng','Ice'],
  fighting:['Giác đấu','Fighting'],poison:['Độc','Poison'],ground:['Đất','Ground'],
  flying:['Bay','Flying'],psychic:['Siêu linh','Psychic'],bug:['Bọ','Bug'],
  rock:['Đá','Rock'],ghost:['Ma','Ghost'],dragon:['Rồng','Dragon'],
  dark:['Bóng tối','Dark'],steel:['Thép','Steel'],fairy:['Tiên','Fairy']
 };
 const primary=mon=>TYPES[mon?.types?.[0]]||[mon?.types?.[0]||'chính',mon?.types?.[0]||'primary'];
 function summary(id,mon,fx,english=false){
  const i=english?1:0;
  if(fx&&fx.generic) return english?
   '+8% damage with '+primary(mon)[1]+' moves':
   '+8% ST với chiêu hệ '+primary(mon)[0];
  const text=BY[id];
  if(!text)return english?'Ability effect applies in battle':'Đặc tính có tác dụng trong trận';
  // 'plus' effects include an additional +8% primary-type damage bonus.
  if(fx&&fx.plus)return text[i]+(english?' · +8% primary-type damage':' · +8% ST hệ chính');
  return text[i];
 }
 return {BY,summary};
})();
