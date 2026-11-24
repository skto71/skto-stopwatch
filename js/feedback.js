/* js/feedback.js — звуки (Web Audio), вибрация, Wake Lock, тема. Вызывается ПОСЛЕ фиксации времени. Всё в try/catch. */
window.SKTO_FB=(function(){
 const K="skto-settings",cfg={sound:true,vol:.5,vib:true,wake:true,theme:"dark"};
 try{Object.assign(cfg,JSON.parse(localStorage.getItem(K)||"{}"))}catch(e){}
 const save=()=>{try{localStorage.setItem(K,JSON.stringify(cfg))}catch(e){}};
 let ac=null,wl=null;
 function ctx(){if(!ac){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;try{ac=new A()}catch(e){return null}}if(ac.state==="suspended")ac.resume().catch(()=>{});return ac}
 /* [частота Гц, длительность с, задержка с] — короткие «клавишные» щелчки, у каждой кнопки свой */
 const SND={start:[[1800,.05,0]],lap:[[1100,.03,0]],stop:[[420,.07,0]],resume:[[1300,.03,0],[1300,.03,.08]],undo:[[750,.03,0],[520,.05,.06]],reset:[[300,.05,0]]};
 function click(a,hz,d,at){const t=a.currentTime+at,o=a.createOscillator(),g=a.createGain();o.type="triangle";o.frequency.value=hz;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.001,cfg.vol*.6),t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+d+.02)}
 function tap(k){try{if(cfg.sound&&cfg.vol>0){const a=ctx();if(a)SND[k].forEach(s=>click(a,s[0],s[1],s[2]))}if(cfg.vib&&navigator.vibrate)navigator.vibrate(k==="reset"?10:18)}catch(e){}}
 async function wake(on){try{if(on&&cfg.wake&&"wakeLock"in navigator){if(!wl){wl=await navigator.wakeLock.request("screen");wl.addEventListener("release",()=>{wl=null})}}else if(!on&&wl){const w=wl;wl=null;await w.release()}}catch(e){wl=null}}
 const apply=()=>{document.documentElement.dataset.theme=cfg.theme;const m=document.querySelector('meta[name=theme-color]');if(m)m.content=cfg.theme==="light"?"#ffffff":"#111111"};
 function html(){return`<div class="sumbox"><b>Звук, вибрация, экран, тема</b>
 <label class="chk"><input type="checkbox" id="sSound" ${cfg.sound?"checked":""}> Звуки кнопок</label>
 <label class="fl">Громкость <input type="range" id="sVol" min="0" max="1" step="0.05" value="${cfg.vol}"></label>
 <label class="chk"><input type="checkbox" id="sVib" ${cfg.vib?"checked":""}> Вибрация (на iPhone не поддерживается браузером)</label>
 <label class="chk"><input type="checkbox" id="sWake" ${cfg.wake?"checked":""}> Не гасить экран во время хронометража</label>
 <label class="fl">Тема <select id="sTheme"><option value="dark">Тёмная СКТО</option><option value="light">Светлая / высокий контраст</option></select></label></div>`}
 function bind(){const g=i=>document.getElementById(i);if(!g("sSound"))return;g("sTheme").value=cfg.theme;
  g("sSound").onchange=e=>{cfg.sound=e.target.checked;save();tap("lap")};g("sVol").oninput=e=>{cfg.vol=+e.target.value;save()};g("sVol").onchange=()=>tap("lap");
  g("sVib").onchange=e=>{cfg.vib=e.target.checked;save();tap("lap")};g("sWake").onchange=e=>{cfg.wake=e.target.checked;save();wake(e.target.checked&&APP.T.state()!=="idle"&&APP.T.state()!=="finished")};
  g("sTheme").onchange=e=>{cfg.theme=e.target.value;save();apply()}}
 function init(){apply();document.addEventListener("pointerdown",()=>ctx(),{once:true})} /* iOS: звук включается после первого касания */
 return{init,tap,wake,html,bind,cfg}})();
