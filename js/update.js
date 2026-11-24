/* js/update.js — регистрация service worker и безопасное обновление: баннер только вне активного/приостановленного замера. */
window.SKTO_UPD=(function(){let reg=null;
 const can=()=>{const s=APP.T.state();return s==="idle"||(s==="finished"&&APP.isSaved())};
 const banner=()=>{const b=document.getElementById("upd");b.hidden=!(reg&&reg.waiting&&can())};
 function init(){if(!("serviceWorker"in navigator))return;
  navigator.serviceWorker.register("sw.js").then(r=>{reg=r;r.addEventListener("updatefound",()=>{const n=r.installing;if(n)n.addEventListener("statechange",banner)});banner()}).catch(()=>{});
  setInterval(banner,2000);
  document.getElementById("updBtn").onclick=()=>{if(reg&&reg.waiting&&can()){navigator.serviceWorker.addEventListener("controllerchange",()=>location.reload(),{once:true});reg.waiting.postMessage("SKIP_WAITING")}}}
 return{init}})();
