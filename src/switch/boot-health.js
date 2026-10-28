'use strict';
// Switch/Brewser only: show real startup failures instead of a permanent splash.
(function(){
  var boot=document.getElementById('boot');
  var label=document.getElementById('pkmsvv-switch-health');
  var stage='Trình kiểm tra JavaScript đã chạy';
  var error='';
  function visible(){
    return !!boot && String(boot.className||'').indexOf('hidden')<0;
  }
  function show(message,failed){
    if(!label||!visible())return;
    label.textContent=message;
    if(failed){label.style.color='#ffd67d';label.style.fontWeight='bold';}
  }
  window.PKMSVV_SWITCH_HEALTH_STAGE=function(text){
    stage=String(text).slice(0,160);
    show(stage,false);
  };
  show(stage,false);
  try {
    window.addEventListener('error',function(event){
      error=String(event&&(event.message||(event.error&&event.error.message))||'Lỗi JavaScript').slice(0,180);
      show('Lỗi game: '+error,true);
    });
    window.addEventListener('unhandledrejection',function(event){
      var cause=event&&event.reason;
      error=String(cause&&cause.message||cause||'Promise thất bại').slice(0,180);
      show('Lỗi tải: '+error,true);
    });
  } catch(_) {}
  setTimeout(function(){
    if(visible()&&!error)
      show('Dừng ở bước: '+stage+'. Chụp dòng này gửi để kiểm tra Brewser.',true);
  },12000);
})();
