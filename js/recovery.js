/* js/recovery.js — сохранение и восстановление активного замера (IndexedDB meta/"active" + зеркало localStorage).
   PWA НЕ гарантирует выполнение кода в фоне (особенно iOS): восстановление делается при возврате/следующем открытии по часам устройства. */
window.SKTO_REC=(function(){
 const KEY="active",LS="skto-active",LIM=10*60*1000;let hiddenAt=null,hiddenMs=0,hb={w:0,m:0};
 const T=()=>APP.T;
 function snapshot(){const st=T().state();if(st==="idle")return null;return{v:1,wall:Date.now(),st,ms:T().elapsedMs(),marks:T().marks(),hiddenAt,hiddenMs,...APP.getState()}}
 function save(){const s=snapshot();try{s?localStorage.setItem(LS,JSON.stringify(s)):localStorage.removeItem(LS)}catch(e){}return SKTO_DB.kvSet(KEY,s).catch(()=>{})}
 async function load(){let a=null,b=null;try{a=await SKTO_DB.kvGet(KEY)}catch(e){}try{b=JSON.parse(localStorage.getItem(LS)||"null")}catch(e){}return a&&b?(a.wall>=b.wall?a:b):(a||b)}
 const NOTE_CLOSED="Приложение было закрыто или выгружено системой: время восстановлено по часам устройства, возможна неточность.";
 const NOTE_BACK="Системные часы устройства изменены или недоступны: время восстановлено по последней сохранённой отметке, возможна неточность.";
 const REASON="Замер завершён автоматически: приложение находилось в фоне 10 минут или дольше (итог зафиксирован на отметке 10 минут после сворачивания).";
 /* единая логика: что делать с замером после отсутствия gap мс. fromHide=true — страница жила, false — холодный старт */
 function settle(s,now,cold){let ms=s.ms,st=s.st;
  if(st==="running"){const ref=s.hiddenAt||s.wall,msRef=s.hiddenAt?s.hiddenMs:s.ms+Math.max(0,ref-s.wall),gap=now-ref;
   if(gap<0){APP.warn(NOTE_BACK);T().imp({st:"running",ms:msRef,marks:s.marks});return}
   if(gap>=LIM){T().imp({st:"finished",ms:msRef+LIM,marks:s.marks});APP.finishRestored(REASON);if(cold)APP.warn(NOTE_CLOSED);return}
   T().imp({st:"running",ms:msRef+gap,marks:s.marks});if(cold)APP.warn(NOTE_CLOSED);SKTO_FB.wake(true);return}
  T().imp({st,ms,marks:s.marks}); /* пауза и финиш: время не меняется */
  if(st==="paused")SKTO_FB.wake(true);
  if(st==="finished"&&!s.saved)APP.finishRestored(s.C&&s.C.endReason||null)}
 async function restore(){const s=await load();if(!s||!s.st||s.st==="idle")return;APP.applyConfig(s);settle(s,Date.now(),true);hiddenAt=null;await save();APP.render();SKTO_JRN.toast("Замер восстановлен")}
 function onHide(){if(T().state()==="running"){hiddenAt=Date.now();hiddenMs=T().elapsedMs()}save()}
 function onShow(){hb={w:Date.now(),m:performance.now()};if(T().state()==="running"&&hiddenAt){const s={st:"running",ms:0,marks:T().marks(),hiddenAt,hiddenMs,wall:hiddenAt};hiddenAt=null;settle(s,Date.now(),false)}else hiddenAt=null;
  if(T().state()==="running"||T().state()==="paused")SKTO_FB.wake(true);save();APP.render()}
 function init(){hb={w:Date.now(),m:performance.now()};
  document.addEventListener("visibilitychange",()=>document.hidden?onHide():onShow());addEventListener("pagehide",onHide);
  /* пульс: сохраняет состояние и ловит смену системных часов (пока страница видима и монотонное время надёжно) */
  setInterval(()=>{if(document.hidden||(T().state()!=="running"&&T().state()!=="paused"))return;const w=Date.now(),m=performance.now();
   if(Math.abs((w-hb.w)-(m-hb.m))>1500)APP.warn("Обнаружено изменение системных часов во время замера: возможна неточность результата.");hb={w,m};save()},2000);
  return restore()}
 return{init,save,LIM}})();
