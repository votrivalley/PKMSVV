#!/usr/bin/env python3
"""Alpha09.8 isolated Azahar QA: synthetic native touch input + separate SD save tests.

The scripted taps run through App::update -> App::in_run -> Game command
processing; never invoke player_fuse directly in this mode.
Saves only inside sdmc:/3ds/pkmsvv-kanto01/fusion098-saveqa, NOT real save.json.
Physical touchscreen, SD removal and full 30m battery/thermal endurance
remain unverified.
"""
from pathlib import Path
import sys
p = Path(sys.argv[1]) / 'src/platform/3ds/main.cpp'
s = p.read_text(encoding='utf8')
def patch(old,new,n=1):
    global s
    seen=s.count(old)
    if seen!=n: raise SystemExit(f'FUSION098_QA_ANCHOR_FAIL {seen}/{n}: {old[:95]!r}')
    s=s.replace(old,new)

patch('  bool pk_fusion8_qa = false; // "fusion8qa" real bond/Fusion at eight moves',
'''  bool pk_touch8_qa = false;  // "touch8qa": inject real App::in_run touch inputs
  bool pk_touch_setup_ok = true, pk_touch_done = false, pk_saveqa_ok = false;
  int pk_touch_phase = 0;
  bool pk_fusion8_qa = false; // "fusion8qa" real bond/Fusion at eight moves''')

patch('  else if (!std::strcmp(first, "fusion8qa")) {\n'
      '    a.pk_fusion8_qa = a.pk_skill8_qa = a.pk_skill_qa = true;\n'
      '    a.seconds = 30; a.dex = 25; a.immortal = true;\n'
      '  }',
'''  else if (!std::strcmp(first, "fusion8qa")) {
    a.pk_fusion8_qa = a.pk_skill8_qa = a.pk_skill_qa = true;
    a.seconds = 30; a.dex = 25; a.immortal = true;
  }
  else if (!std::strcmp(first, "touch8qa")) {
    a.pk_touch8_qa = a.pk_skill8_qa = a.pk_skill_qa = true;
    a.seconds = 30; a.dex = 25; a.immortal = true;
  }''')

patch('  u64 last = osGetTime();',r'''  if (at.pk_touch8_qa) {
    // An isolated nested QA directory: never write the user's root save.json.
    const char* dir="sdmc:/3ds/pkmsvv-kanto01/fusion098-saveqa";
    mkdir(dir, 0777);
    static Save s1, s2;
    new_save(s1,"FUSION098_QA_ONLY",1234567890000LL);
    s1.partner=25; s1.owned_at[25]=1234567890000LL;
    s1.stats.total_kills=200; s1.coins=111;
    save_set_raw(Json(),s1);
    const bool first=save_write_file(dir,s1);
    s1.stats.total_kills=260; s1.coins=222;
    const bool second=first && save_write_file(dir,s1);
    const bool latest=second && save_read_file(dir,s2)==1 &&
        s2.stats.total_kills==260 && s2.coins==222;
    bool fallback=false;
    if (latest) {
      FILE* bad=std::fopen("sdmc:/3ds/pkmsvv-kanto01/fusion098-saveqa/save.json","wb");
      if (bad) { std::fputs("{BROKEN QA PRIMARY",bad); std::fclose(bad); }
      fallback=bad && save_read_file(dir,s2)==2 &&
          s2.stats.total_kills==200 && s2.coins==111;
    }
    at.pk_saveqa_ok=first && second && latest && fallback;
    if (at.log) std::fprintf(at.log,
      "PKMSVV_SAVE098_BACKUP_%s first=%d second=%d latest=%d fallback=%d\n",
      at.pk_saveqa_ok?"PASS":"FAIL",int(first),int(second),int(latest),int(fallback));
  }

  u64 last = osGetTime();''')

patch('    app.update(in, float(std::fmin(frame_ms, 100.0) / 1000.0));',r'''    if (at.pk_touch8_qa && at.pk_touch_phase==0 &&
        g->state==ST_PLAYING && g->time>=1.0 && g->me().nslots==8) {
      Player& p=g->me();
      p.bonds=1; p.choice=CH_BOND; g->state=ST_CHOICE;
      at.pk_touch_phase=1;
    }
    if (at.pk_touch8_qa && at.pk_touch_phase>=1 && at.pk_touch_phase<=4) {
      // Real App/UI input path: touch right page, choose 7th move,
      // touch left page, choose 1st move. Engine processes CMD_BOND.
      UiIn fake{};
      fake.tap=true;
      const int phase=at.pk_touch_phase;
      fake.tx=(phase==1 ? 286 : phase==3 ? 30 : 95);
      fake.ty=(phase==1 || phase==3 ? 230 : phase==2 ? 166 : 103);
      const bool was=app.autotest;
      app.autotest=false;  // only for this App::in_run input frame
      app.update(fake,float(std::fmin(frame_ms, 100.0) / 1000.0));
      app.autotest=was;
      const bool ok =
        phase==1 ? r.card_cursor==4 :
        phase==2 ? r.card_cursor==6 && r.bond_first==6 :
        phase==3 ? r.card_cursor==0 && r.bond_first==6 :
                   app.pending_input.cmd==CMD_BOND &&
                   app.pending_input.arg==2 &&
                   app.pending_input.moves[0]==6 &&
                   app.pending_input.moves[1]==0;
      if (!ok) at.pk_touch_setup_ok=false;
      if (at.log) std::fprintf(at.log,
        "PKMSVV_TOUCH098_STEP_%s phase=%d cursor=%d first=%d cmd=%d\n",
        ok?"PASS":"FAIL",phase,r.card_cursor,r.bond_first,int(app.pending_input.cmd));
      ++at.pk_touch_phase;
    } else app.update(in, float(std::fmin(frame_ms, 100.0) / 1000.0));
    if (at.pk_touch8_qa && at.pk_touch_phase==5 && !at.pk_touch_done &&
        g->state==ST_PLAYING) {
      const Player& p=g->me();
      bool seen[8]={};
      bool unique=true;
      int count=0;
      for(int i=0;i<p.nslots;i++)
        for(int j=0;j<p.slot_n[i];j++) {
          const int mi=p.slots[i][j];
          if(mi<0 || mi>=8 || seen[mi]) unique=false;
          else { seen[mi]=true; ++count; }
        }
      at.pk_touch_done=at.pk_touch_setup_ok && p.nslots==7 &&
          p.nmoves==8 && count==8 && unique && p.bonds==0;
      if (at.log) std::fprintf(at.log,
        "PKMSVV_TOUCH098_FUSION_%s slots=%d moves=%d seen=%d bonds=%d\n",
        at.pk_touch_done?"PASS":"FAIL",p.nslots,p.nmoves,count,p.bonds);
      at.pk_touch_phase=6;
    }''')

patch('          (at.pk_fusion8_qa ? (p.nslots==6 && at.pk_fusion8_setup_ok) : p.nslots==8) &&',
'''          (at.pk_fusion8_qa ? (p.nslots==6 && at.pk_fusion8_setup_ok) :
           at.pk_touch8_qa ? (p.nslots==7 && at.pk_touch_done && at.pk_saveqa_ok) :
           p.nslots==8) &&''')
patch('          full?"PASS":"FAIL",p.nslots,p.nmoves,p.max_moves,p.pkmsvv_passive_casts);\n'
      '        if (at.pk_fusion8_qa) std::fprintf(at.log,',
'''          full?"PASS":"FAIL",p.nslots,p.nmoves,p.max_moves,p.pkmsvv_passive_casts);
        if (at.pk_touch8_qa) std::fprintf(at.log,
          "PKMSVV_TOUCH098_RUNTIME_%s touch=%d save=%d moves=%d slots=%d casts=%d\n",
          full?"PASS":"FAIL",int(at.pk_touch_done),int(at.pk_saveqa_ok),
          p.nmoves,p.nslots,p.pkmsvv_passive_casts);
        if (at.pk_fusion8_qa) std::fprintf(at.log,''')
p.write_text(s,encoding='utf8')
print("PKMSVV_TOUCH098_QA_PATCH_PASS: native paging tap path + isolated save/bak fallback")
