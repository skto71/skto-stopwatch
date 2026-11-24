/* js/journal.js — журналы, таблицы, копирование, просмотр для скриншота, бэкап, навигация. Не меняет логику таймера. */
window.SKTO_JRN=(function(){
const $=id=>document.getElementById(id),CM=SKTO_CMP,DB=SKTO_DB;
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const MODES={train:"Тренировки",comp:"Соревнования",compare:"Сравнения"},APPN="skto-smart-stopwatch";
const F=c=>APP.f(c),newId=()=>"r"+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const dt=ms=>new Date(ms).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
function toast(m){const t=$("toast");t.textContent=m;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>t.hidden=true,2200)}
/* статистика: только полные круги, без разгона и незавершённого отрезка */
function stats(r){const full=r.segs.filter((_,i)=>!(r.dist&&r.hasRun&&i===0)).map(s=>s.d);if(!full.length)return null;
 const mn=Math.min(...full),mx=Math.max(...full);return{n:full.length,avg:Math.round(full.reduce((a,b)=>a+b,0)/full.length),mn,mx,diff:mx-mn}}
const nm=(r,i)=>r.dist&&r.hasRun?(i===0?"Разгон":String(i)):String(i+1);
const title=r=>(r.distName||"Свободные круги")+(r.athlete?" — "+r.athlete:"")+(r.title?" · "+r.title:"");
/* единая таблица для экрана, копирования и просмотра: все столбцы (Δ, разряд) сохраняются */
function table(r){const head=["Отр.","Время","Общее"],dv=r.cmp?CM.devs(r.cmp.ref,r.segs):[];if(r.cmp)head.push("Δ круг","Δ общ.");if(r.rank)head.push("Разряд");
 const rows=r.segs.map((s,i)=>{const x=[nm(r,i),F(s.d),i?F(s.c):""];if(r.cmp)x.push(...(dv[i]?[CM.fd(dv[i].dl,F),CM.fd(dv[i].dc,F)]:["—","—"]));if(r.rank)x.push(r.rank.rows[i]||"");return x});
 if(r.unfin){const x=["Незавершённый отрезок",F(r.unfin),F(r.total)];if(r.cmp)x.push("—","—");if(r.rank)x.push("—");rows.push(x)}
 const foot=["Итого: "+F(r.total)+(r.status==="complete"?"":" (дистанция не завершена)")];
 if(r.rank)foot.push(r.rank.final?"Норматив по времени: "+r.rank.final:"Итоговый норматив не присвоен");
 if(r.cmp){const s=CM.summary(r.cmp.ref,r.segs);foot.push("Ориентир"+(r.cmp.name?" «"+r.cmp.name+"»":"")+": "+F(s.refTotal)+(s.n?"; разница "+CM.fd(s.total,F)+" на "+s.n+" отсеч.; быстрее "+s.fa+", медленнее "+s.sl+", одинаково "+s.eq:"")+(s.incomplete?" (сравнение незавершённое)":""))}
 if(r.endReason)foot.push(r.endReason);(r.notes||[]).forEach(n=>foot.push("⚠ "+n));
 const st=stats(r);if(st)foot.push("Кругов: "+st.n+"; средний "+F(st.avg)+"; быстрый "+F(st.mn)+"; медленный "+F(st.mx)+"; разница "+F(st.diff));
 return{head,rows,foot}}
const cls=v=>/^−/.test(v)?"neg":/^\+/.test(v)?"pos":"";
const tHTML=(r,attr)=>{const t=table(r);return`<table ${attr||""}><tr>${t.head.map(h=>`<th>${h}</th>`).join("")}</tr>${t.rows.map(x=>`<tr>${x.map((v,i)=>`<td class="${r.cmp&&(i==3||i==4)?cls(v):""}">${esc(v)}</td>`).join("")}</tr>`).join("")}</table>`+t.foot.map(l=>`<p class="ft">${esc(l)}</p>`).join("")};
async function copy(r,rich){const t=table(r),head=title(r)+(r.started?" ("+dt(r.started)+")":"");
 const txt=head+"\n"+[t.head,...t.rows].map(x=>x.join("\t")).join("\n")+"\n"+t.foot.join("\n");
 const html=`<p><b>${esc(head)}</b></p><table border="1" cellpadding="4" style="border-collapse:collapse"><tr>${t.head.map(h=>`<th>${h}</th>`).join("")}</tr>${t.rows.map(x=>`<tr>${x.map(v=>`<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</table>`+t.foot.map(l=>`<p>${esc(l)}</p>`).join("");
 try{if(rich&&window.ClipboardItem&&navigator.clipboard.write){await navigator.clipboard.write([new ClipboardItem({"text/html":new Blob([html],{type:"text/html"}),"text/plain":new Blob([txt],{type:"text/plain"})})])}
  else await navigator.clipboard.writeText(txt);toast("Таблица скопирована")}
 catch(e){try{const a=document.createElement("textarea");a.value=txt;document.body.appendChild(a);a.select();document.execCommand("copy");a.remove();toast("Таблица скопирована (текстом)")}catch(e2){toast("Не удалось скопировать — сделайте скриншот")}}}
/* ---- экраны ---- */
let stack=[];const scr=()=>$("scr");
function show(fn){stack.push(fn);fn()}function close(){stack=[];scr().hidden=true;$("view").hidden=true;APP.sync&&APP.render()}
function back(){stack.pop();const p=stack[stack.length-1];p?p():close()}
const hdr=t=>`<div class="sh"><button class="ghost" data-a="back">‹ Назад</button><b>${esc(t)}</b><button class="ghost" data-a="home">⌂ Главный</button></div>`;
function paint(html,onclick){const s=scr();s.hidden=false;$("view").hidden=true;s.innerHTML=html;s.scrollTop=0;s.onclick=e=>{const a=e.target.closest("[data-a]");if(!a)return;const k=a.dataset.a;if(k==="back")back();else if(k==="home")close();else onclick&&onclick(k,a)}}
let q="",asc=false;
async function list(mode){let rs=[];try{rs=(await DB.all()).filter(r=>r.mode===mode&&r.status!=="active")}catch(e){}
 const ql=q.toLowerCase();rs=rs.filter(r=>!ql||(r.athlete+" "+r.title+" "+r.comment+" "+r.distName).toLowerCase().includes(ql)).sort((a,b)=>asc?a.started-b.started:b.started-a.started);
 paint(hdr("Журнал: "+MODES[mode].toLowerCase())+`<div class="sr"><input id="q" type="search" placeholder="Поиск по имени, названию" value="${esc(q)}"><button class="ghost" data-a="sort">${asc?"Старые ↑":"Новые ↓"}</button></div>`+(rs.length?rs.map(r=>`<div class="it" data-a="open" data-id="${r.id}"><b>${esc(title(r))}</b><span>${F(r.total)}</span><small>${dt(r.started)} · ${r.status==="complete"?"завершён":"не завершён"}${r.cmp?" · сравнение":""}${r.rank?" · разряд":""}</small></div>`).join(""):'<p class="note">Записей нет.</p>'),
  (k,a)=>{if(k==="sort"){asc=!asc;list(mode)}else if(k==="open")show(()=>rec(a.dataset.id))});
 const i=$("q");i.oninput=()=>{q=i.value;clearTimeout(list.h);list.h=setTimeout(()=>list(mode),250)}}
async function rec(id){const r=await DB.get(id);if(!r){back();return}const st=stats(r);
 paint(hdr("Запись")+`<div class="sumbox"><b>${esc(title(r))}</b><br>${dt(r.started)} · ${MODES[r.mode]}</div>
 <label class="fl">Спортсмен<input id="fa" value="${esc(r.athlete)}"></label><label class="fl">Название<input id="ft" value="${esc(r.title)}"></label><label class="fl">Комментарий<input id="fc" value="${esc(r.comment)}"></label>
 <div class="row"><button data-a="saveinfo">Сохранить имя и комментарий</button></div><div class="tw">${tHTML(r,'class="c"')}</div>
 <div class="row"><button data-a="cph">Копировать таблицу</button><button data-a="cpt">Копировать текстом</button><button data-a="view">Просмотр таблицы</button><button data-a="use">Использовать для сравнения</button><button class="danger" data-a="del">Удалить</button></div>`,
 async(k)=>{if(k==="saveinfo"){r.athlete=$("fa").value.trim();r.title=$("ft").value.trim();r.comment=$("fc").value.trim();try{await DB.put(r);toast("Сохранено");rec(id)}catch(e){toast("Ошибка сохранения")}}
  else if(k==="cph")copy(r,true);else if(k==="cpt")copy(r,false);else if(k==="view")show(()=>view(r));
  else if(k==="use")APP.useAsRef(r)&&close();
  else if(k==="del"&&confirm("Удалить запись безвозвратно?")){try{await DB.del(id);back()}catch(e){toast("Не удалось удалить")}}})}
/* чистый экран для системного скриншота: только таблица, «Назад» и подпись СКТО */
function view(r){const v=$("view");v.hidden=false;v.innerHTML=`<button class="ghost vb" id="vb">‹ Назад</button><h2>${esc(r.distName||"Свободные круги")}</h2>${r.athlete?`<div>${esc(r.athlete)}</div>`:""}${r.title?`<div>${esc(r.title)}</div>`:""}<div class="vd">${dt(r.started)}</div>${tHTML(r,'class="vt"')}<div class="vs">СКТО | Умный секундомер</div>`;v.scrollTop=0;$("vb").onclick=()=>{v.hidden=true;back()}}
/* ---- резервная копия ---- */
function validRec(r){return r&&typeof r.id==="string"&&MODES[r.mode]&&Array.isArray(r.segs)&&r.segs.every(s=>s&&Number.isFinite(s.d)&&Number.isFinite(s.c))&&Number.isFinite(r.total)&&Number.isFinite(r.started)}
async function exportAll(){try{const rs=(await DB.all()).filter(r=>r.status!=="active");const b=new Blob([JSON.stringify({app:APPN,format:1,exported:new Date().toISOString(),records:rs})],{type:"application/json"});
 const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="skto-stopwatch-backup-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(a);a.click();a.remove();toast("Копия создана: записей "+rs.length)}catch(e){toast("Ошибка экспорта")}}
async function importFile(file){let d;try{d=JSON.parse(await file.text())}catch(e){return toast("Файл повреждён: данные не изменены")}
 if(!d||d.app!==APPN||d.format!==1||!Array.isArray(d.records)||!d.records.every(validRec))return toast("Неверный формат: данные не изменены");
 const n=d.records.length;if(!confirm("В копии записей: "+n+".\nОК — объединить с текущими (повторы пропускаются).\nОтмена — другие варианты."))
  {if(!confirm("Полностью ЗАМЕНИТЬ все текущие записи записями из копии?"))return;try{await DB.replaceAll(d.records);return toast("Восстановлено записей: "+n)}catch(e){return toast("Ошибка: текущие данные сохранены")}}
 try{const ex=new Set((await DB.all()).map(r=>r.id)),add=d.records.filter(r=>!ex.has(r.id));await DB.putMany(add);toast("Добавлено: "+add.length+", пропущено повторов: "+(n-add.length))}catch(e){toast("Ошибка импорта: текущие данные сохранены")}}
function settings(){paint(hdr("Настройки")+`<div class="row"><button data-a="cfg">Настройки замера</button><button data-a="exp">Экспорт резервной копии (JSON)</button><button data-a="imp">Импорт резервной копии</button></div><input id="fi" type="file" accept=".json,application/json" hidden><p class="note" id="setx"></p>`+SKTO_FB.html(),
 (k)=>{if(k==="cfg"){close();$("cfg").hidden=false}else if(k==="exp")exportAll();else if(k==="imp")$("fi").click()});SKTO_FB.bind();$("fi").onchange=e=>{if(e.target.files[0])importFile(e.target.files[0]);e.target.value=""}}
function info(){paint(hdr("Справка")+SKTO_HELP.html())}
function init(){const nav=$("nav"),B=[["info","i","Справка"],["train","Тр","Журнал тренировок"],["comp","Сор","Журнал соревнований"],["compare","Ср","Журнал сравнений"],["settings","⚙","Настройки"],["home","⌂","Главный экран"]];
 nav.innerHTML=B.map(b=>`<button data-n="${b[0]}" title="${b[2]}" aria-label="${b[2]}">${b[1]}</button>`).join("");
 nav.onclick=e=>{const b=e.target.closest("button");if(!b)return;const n=b.dataset.n;stack=[];if(n==="home")close();else if(n==="info")show(info);else if(n==="settings")show(settings);else show(()=>list(n))}}
return{init,newId,toast,stats,table,show,close}})();
