/* js/templates.js — «Шаблоны сравнения»: хранение (meta/"cmpTemplates", без смены версии БД) и интерфейс.
   Шаблон — только источник данных: записи журнала хранят собственную копию графика и от шаблонов не зависят. */
window.SKTO_TPL=(function(){
const $=id=>document.getElementById(id),CM=SKTO_CMP,KEY="cmpTemplates";
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const newId=()=>"t"+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
/* ---- хранилище: очередь операций (чтение→изменение→запись→проверка), чтобы последовательные правки не терялись ---- */
let q=Promise.resolve();const enq=fn=>{const p=q.then(fn);q=p.catch(()=>{});return p};
const read=async()=>{const v=await SKTO_DB.kvGet(KEY);return Array.isArray(v)?v:[]};
const write=async l=>{await SKTO_DB.kvSet(KEY,l);const b=await SKTO_DB.kvGet(KEY);if(!Array.isArray(b)||b.length!==l.length)throw new Error("verify")};
const nSeg=t=>(t.dist&&t.hasRun?1:0)+t.laps;
function valid(t){return !!t&&typeof t.id==="string"&&typeof t.name==="string"&&typeof t.refName==="string"&&Array.isArray(t.times)&&t.times.length>0&&t.times.every(x=>Number.isInteger(x)&&x>0)&&Number.isInteger(t.laps)&&t.laps>=0&&typeof t.dist==="string"&&(t.dist===""||SKTO_DIST.some(d=>d.id===t.dist))&&t.times.length===nSeg(t)}
const all=()=>enq(read).then(l=>l.slice().sort((a,b)=>(b.updated||0)-(a.updated||0)||a.name.localeCompare(b.name)));
const upsert=t=>enq(async()=>{const l=await read(),i=l.findIndex(x=>x.id===t.id);i>=0?l[i]=t:l.push(t);await write(l);return t});
const remove=id=>enq(async()=>{await write((await read()).filter(x=>x.id!==id))});
const same=(a,b)=>a.name===b.name&&a.refName===b.refName&&a.dist===b.dist&&a.laps===b.laps&&!!a.hasRun===!!b.hasRun&&JSON.stringify(a.times)===JSON.stringify(b.times);
/* объединение: новые id добавляются; одинаковые пропускаются; разные версии одного id — импортируемая сохраняется копией */
const mergeImport=list=>enq(async()=>{const l=await read();let added=0,conflicts=0;
 for(const x of list){const e=l.find(y=>y.id===x.id);if(!e){l.push(x);added++}else if(!same(e,x)){l.push({...x,id:newId(),name:x.name+" (из копии)"});conflicts++}}
 await write(l);return{added,conflicts}});
const replaceAll=list=>enq(()=>write(list.slice()));
/* ---- интерфейс ---- */
const F=c=>APP.f(c),sum=t=>t.times.reduce((a,b)=>a+b,0),toast=m=>SKTO_JRN.toast(m);
const lab=(t,i)=>t.dist&&t.hasRun?(i===0?"Разгон":"Круг "+i):"Круг "+(i+1);
const tup=c=>[c>=6000?String(Math.floor(c/6000)):"",String(Math.floor(c%6000/100)),String(Math.floor(c%100/10)),String(c%10)];
const meta=t=>{const d=SKTO_DIST.find(x=>x.id===t.dist);return(d?d.name:"без дистанции")+" · "+t.laps+" кр."+(t.dist&&t.hasRun?" + разгон":"")};
let stack=[];const S=()=>$("tplScr");
function paint(html,on){const s=S();s.hidden=false;s.innerHTML=html;s.scrollTop=0;s.onclick=e=>{const a=e.target.closest("[data-a]");if(!a)return;const k=a.dataset.a;if(k==="back")back();else if(k==="close")close();else if(on)on(k,a)}}
const show=fn=>{stack.push(fn);fn()},close=()=>{stack=[];S().hidden=true};
function back(){stack.pop();const p=stack[stack.length-1];p?p():close()}
const hdr=t=>`<div class="sh"><button class="ghost" data-a="back">‹ Назад</button><b>${esc(t)}</b><button class="ghost" data-a="close">✕</button></div>`;
const item=t=>`<div class="it" data-a="it" data-id="${t.id}"><b>${esc(t.name)}</b><span>${F(sum(t))}</span><small>${esc(meta(t))}${t.refName&&t.refName!==t.name?" · "+esc(t.refName):""}</small></div>`;
async function listScreen(title,action){const ts=await all();
 paint(hdr(title)+'<div class="sr"><input id="tq" type="search" placeholder="Поиск по названию"></div><div id="tl"></div>',(k,a)=>{if(k==="it")action(ts.find(t=>t.id===a.dataset.id))});
 const fill=()=>{const v=$("tq").value.toLowerCase(),f=ts.filter(t=>(t.name+" "+t.refName).toLowerCase().includes(v));$("tl").innerHTML=f.length?f.map(item).join(""):'<p class="note">Шаблонов нет.</p>'};$("tq").oninput=fill;fill()}
const pick=()=>show(()=>listScreen("Выбрать шаблон",load));
const manager=()=>show(()=>listScreen("Управление шаблонами",t=>show(()=>view(t.id))));
function load(t){if(!t)return;if(APP.locked()){toast("Во время замера график менять нельзя");return}
 if(APP.C.mode==="comp"&&!t.dist){show(()=>paint(hdr("Несовместимый шаблон")+`<div class="sumbox">Шаблон «${esc(t.name)}» — без дистанции, а в режиме «Соревнование» дистанция обязательна. Выберите совместимый вариант:</div><div class="row"><button data-a="m" data-m="train">Перейти в «Тренировку» и загрузить</button><button data-a="m" data-m="compare">Перейти в «Сравнение» и загрузить</button><button data-a="back">Отмена</button></div>`,(k,a)=>{if(k==="m")apply(t,a.dataset.m)}));return}
 apply(t)}
function apply(t,mode){if(APP.applyTemplate(t,mode)){close();toast("Шаблон загружен: поля можно править")}}
async function view(id){const t=(await all()).find(x=>x.id===id);if(!t){back();return}let c=0;const full=t.times.filter((_,i)=>!(t.dist&&t.hasRun&&i===0));
 paint(hdr(t.name)+`<div class="sumbox">Ориентир: <b>${esc(t.refName||"—")}</b><br>${esc(meta(t))}</div><div class="tw"><table class="c"><tr><th>Отр.</th><th>Время</th><th>Общее</th></tr>${t.times.map((x,i)=>`<tr><td>${lab(t,i)}</td><td>${F(x)}</td><td>${F(c+=x)}</td></tr>`).join("")}</table></div><p class="ft">Итого: ${F(sum(t))}${full.length?" · средний круг: "+F(Math.round(full.reduce((a,b)=>a+b,0)/full.length)):""}</p><div class="row"><button data-a="load">Загрузить</button><button data-a="edit">Редактировать</button><button data-a="ren">Переименовать</button><button data-a="dup">Дублировать</button><button class="danger" data-a="del">Удалить</button></div>`,
 async k=>{try{if(k==="load")load(t);else if(k==="edit")show(()=>editor(id));
  else if(k==="ren"){const n=prompt("Новое название шаблона",t.name);if(n&&n.trim()){await upsert({...t,name:n.trim(),updated:Date.now()});toast("Переименовано");view(id)}}
  else if(k==="dup"){await upsert({...t,id:newId(),name:t.name+" (копия)",created:Date.now(),updated:Date.now()});toast("Копия создана")}
  else if(k==="del"&&confirm("Удалить шаблон «"+t.name+"»? Записи журнала не изменятся.")){await remove(id);toast("Шаблон удалён");back()}}catch(e){toast("Ошибка: изменения не сохранены")}})}
async function editor(id){const t=(await all()).find(x=>x.id===id);if(!t){back();return}
 const e={name:t.name,refName:t.refName,dist:t.dist,laps:t.laps,hasRun:t.hasRun,tp:t.times.map(tup)};let bad=false;const n=()=>(e.dist&&e.hasRun?1:0)+(e.laps||0);
 paint(hdr("Редактирование")+`<label class="fl">Название шаблона<input id="en" value="${esc(e.name)}"></label><label class="fl">Название ориентира<input id="er0" value="${esc(e.refName)}"></label><label class="fl">Дистанция<select id="ed"><option value="">Без дистанции</option>${SKTO_DIST.map(d=>`<option value="${d.id}"${d.id===e.dist?" selected":""}>${d.name}</option>`).join("")}</select></label><label class="fl">Кругов<input id="el" type="number" inputmode="numeric" min="1" max="60" value="${e.laps}"></label><label class="chk"><input type="checkbox" id="eh"${e.hasRun?" checked":""}${e.dist?"":" disabled"}> Отдельный «Разгон»</label><div id="er"></div><p class="note" id="es"></p><div class="row"><button data-a="save">Сохранить изменения в шаблоне</button></div>`,
 async k=>{if(k!=="save")return;const ts=e.tp.slice(0,n()).map(CM.toCs);if(!e.name.trim()||!n()||ts.some(x=>x===null)){bad=true;rb();toast("Заполните название и все времена");return}
  try{await upsert({...t,name:e.name.trim(),refName:e.refName.trim(),dist:e.dist,laps:e.laps,hasRun:e.dist?e.hasRun:false,times:ts,updated:Date.now()});toast("Шаблон обновлён");back()}catch(x){toast("Ошибка: шаблон не сохранён")}});
 const upd=()=>{const ts=e.tp.map(CM.toCs);$("es").textContent=ts.length&&ts.every(x=>x!==null)?"Итого: "+F(ts.reduce((a,b)=>a+b,0)):"Заполните все времена"};
 const rb=()=>{while(e.tp.length<n())e.tp.push(["","","",""]);e.tp.length=n();CM.build($("er"),Array.from({length:n()},(_,i)=>lab(e,i)),e.tp,upd,()=>bad);upd()};
 $("en").oninput=x=>e.name=x.target.value;$("er0").oninput=x=>e.refName=x.target.value;
 $("ed").onchange=x=>{e.dist=x.target.value;const d=SKTO_DIST.find(y=>y.id===e.dist);if(d){e.laps=d.laps;e.hasRun=d.run}else e.hasRun=false;$("el").value=e.laps;$("eh").checked=e.hasRun;$("eh").disabled=!e.dist;rb()};
 $("el").oninput=x=>{e.laps=Math.max(0,Math.min(60,+x.target.value||0));rb()};$("eh").onchange=x=>{e.hasRun=x.target.checked;rb()};rb()}
/* «Сохранить как шаблон»: никогда не перезаписывает шаблон без явного выбора */
async function saveDlg(){const r=APP.refGet();if(!r.ok){APP.C.bad=true;APP.sync();toast("Заполните все времена графика (секунды, десятые и сотые)");return}
 const cur=APP.C.tplId&&(await all()).find(x=>x.id===APP.C.tplId);
 show(()=>paint(hdr("Сохранить как шаблон")+`<label class="fl">Название шаблона<input id="sn" maxlength="60" value="${esc(APP.C.tplName||r.name||"")}" placeholder="Например: Сура воска 1500"></label><div class="sumbox">Ориентир: <b>${esc(r.name||"—")}</b><br>${r.cs.length} отр., итого ${F(r.cs.reduce((a,b)=>a+b,0))}${cur?`<br>Загружен шаблон «${esc(cur.name)}»: ${APP.changed()?"график изменён, сам шаблон не затронут.":"график не менялся."}`:""}</div><div class="row">${cur?'<button data-a="upd">Обновить шаблон «'+esc(cur.name)+'»</button>':""}<button data-a="new">${cur?"Сохранить как новый шаблон":"Сохранить"}</button><button data-a="back">Только для этого замера (не сохранять)</button></div>`,
 async k=>{const name=($("sn").value.trim())||"Шаблон "+new Date().toLocaleDateString("ru-RU"),now=Date.now();
  const base={name,refName:r.name||"",dist:r.dist,laps:r.laps,hasRun:r.dist?r.hasRun:false,times:r.cs,v:1};
  try{let t;if(k==="upd"&&cur)t=await upsert({...cur,...base,updated:now});else if(k==="new"||k==="upd")t=await upsert({id:newId(),created:now,updated:now,...base});else return;
   APP.markLoaded(t);toast("Шаблон сохранён: «"+t.name+"»");close()}catch(x){toast("Ошибка: шаблон не сохранён")}}))}
function init(){$("tplPick").onclick=pick;$("tplMgr").onclick=manager;$("tplSave").onclick=saveDlg}
return{init,all,valid,mergeImport,replaceAll,newId}})();
