/* js/app.js — интерфейс: режимы, хронометраж, разряд, сравнение. Ядро времени — Timer, нормативы — SKTO_NORMS. */
(function(){
const $=id=>document.getElementById(id),N=SKTO_NORMS,T=Timer,CM=SKTO_CMP;
const f=(c,big)=>{const h=Math.floor(c/360000),m=Math.floor(c%360000/6000),s=Math.floor(c%6000/100),x=c%100,p=n=>String(n).padStart(2,"0");
 if(big)return(h?h+":":"")+p(m)+":"+p(s)+","+p(x);
 return h?h+":"+p(m)+":"+p(s)+","+p(x):m?m+":"+p(s)+","+p(x):s+","+p(x)};
const rsave=()=>window.SKTO_REC&&SKTO_REC.save(),FB=SKTO_FB;
const C={mode:"train",dist:"",laps:null,hasRun:false,auto:true,rankOn:false,sex:0,cat:"A",cmp:false,name:"",refT:[],bad:false,athlete:"",title:"",comment:"",recId:null,started:0,notes:[],endReason:null,tplId:null,tplName:"",tplSnap:""};
let saved=false;
const dsel=$("dist");dsel.innerHTML='<option value="">Без дистанции (свободные круги)</option>'+SKTO_DIST.map(d=>`<option value="${d.id}">${d.name}</option>`).join("");
$("cat").innerHTML=Object.entries(N.CATS).filter(([k])=>k<"D").map(([k,v])=>`<option value="${k}">${k}: ${v}</option>`).join("");
const dist=()=>SKTO_DIST.find(d=>d.id===C.dist);
const planned=()=>C.dist?(C.hasRun?1:0)+(C.laps||0):(C.laps||0);
const locked=()=>T.state()!=="idle";
const segName=i=>C.dist&&C.hasRun?(i===0?"Разгон":String(i)):String(i+1);
const label=i=>C.dist&&C.hasRun?(i===0?"Разгон":"Круг "+i):"Круг "+(i+1);
const refCs=()=>C.refT.slice(0,planned()).map(CM.toCs);
const refOk=()=>planned()>0&&refCs().every(x=>x!==null);
let snap={unfin:null},refUI=null;
/* значения по умолчанию для основного режима (таблица ТЗ, раздел 9) */
function setMode(m){C.mode=m;C.cmp=m==="compare";C.rankOn=m==="comp";
 if(m==="comp"&&!C.dist){C.dist="d500";C.laps=1;C.hasRun=true}if(m!=="comp"&&C.dist==="d500"&&C.laps===1&&false){}
 if(!C.rankOn)C.rankOn=false;if(!C.dist)C.rankOn=false}
function buildRef(){const n=planned(),box=$("refRows");if(!C.cmp||!n){box.innerHTML="";refUI=null;$("refSum").textContent=C.cmp?"Укажите количество кругов — появится таблица ввода.":"";return}
 while(C.refT.length<n)C.refT.push(["","","",""]);
 refUI=CM.build(box,Array.from({length:n},(_,i)=>label(i)),C.refT,refChange,()=>C.bad);refChange()}
function refChange(){const r=refCs(),rows=[...$("refRows").children];let cum=0;
 rows.forEach((el,i)=>{el.querySelector(".rc").textContent=r[i]?f(cum+=r[i]):""});
 if(!r.length||!r.every(x=>x!==null)){$("refSum").textContent="Заполните все поля: секунды, десятые и сотые обязательны.";return render()}
 const full=r.filter((_,i)=>!(C.dist&&C.hasRun&&i===0));const avg=full.length?Math.round(full.reduce((a,b)=>a+b,0)/full.length):0;
 $("refSum").textContent="Итого ориентир: "+f(cum)+(full.length?" · средний круг: "+f(avg):"");render()}
function sync(){$("mode").value=C.mode;dsel.value=C.dist;$("laps").value=C.laps===null?"":C.laps;$("hasRun").checked=C.hasRun;$("auto").checked=C.auto;
 $("rankOn").checked=C.rankOn;$("rankCfg").hidden=!C.rankOn;$("cmpOn").checked=C.cmp;$("cmpBox").hidden=!C.cmp;$("cmpName").value=C.name;
 dsel.options[0].disabled=C.mode==="comp";$("rankOn").disabled=!C.dist||locked();$("hasRun").disabled=!C.dist||locked();
 $("cfgNote").textContent=(C.mode==="comp"?"Соревнование: дистанция обязательна. ":"")+(!C.dist?"Определение разряда доступно только при выбранной дистанции. ":"Изменение кругов не меняет дистанцию и нормативы: ответственность за соответствие метражу — на вас. ")+(locked()?"Во время замера настройки заблокированы.":"");
 buildRef();render()}
$("mode").onchange=e=>{if(locked())return;setMode(e.target.value);sync()};
dsel.onchange=e=>{if(locked())return;C.dist=e.target.value;const d=dist();if(d){C.laps=d.laps;C.hasRun=d.run}else{C.hasRun=false;C.rankOn=false}sync()};
$("laps").oninput=e=>{if(locked())return;C.laps=e.target.value===""?null:Math.max(0,Math.min(60,+e.target.value));buildRef()};
$("hasRun").onchange=e=>{C.hasRun=e.target.checked;sync()};$("auto").onchange=e=>C.auto=e.target.checked;
$("rankOn").onchange=e=>{C.rankOn=e.target.checked&&!!C.dist;sync()};$("sex").onchange=e=>{C.sex=+e.target.value;render()};$("cat").onchange=e=>{C.cat=e.target.value;render()};
$("cmpOn").onchange=e=>{C.cmp=e.target.checked;sync()};$("cmpName").oninput=e=>C.name=e.target.value;["athlete","title","comment"].forEach(k=>$(k).oninput=e=>C[k]=e.target.value.trim());
$("cfgBtn").onclick=()=>{$("cfg").hidden=!$("cfg").hidden};
const rankAt=c=>{if(!C.rankOn||!C.dist)return"";const r=N.evalTime(c,C.cat,C.dist,C.sex);return !r.hasNorms?"нет норм.":r.best?r.best.name:"Без разряда"};
const dcell=d=>`<td class="${d<0?"neg":d>0?"pos":"eq"}">${CM.fd(d,f)}</td>`;
function render(){
 const st=T.state(),sg=T.segs(),el=T.elapsedCs(),last=sg[sg.length-1],prevC=last?last.c:0,k=sg.length,fin=st==="finished";
 $("big").textContent=f(el,true);{const ti=$("tplInfo");if(ti)ti.textContent=C.tplId?"Шаблон: «"+C.tplName+"»"+(changed()?" — график изменён (шаблон не обновлён)":""):""}{const wb=$("warnbox");wb.hidden=!C.notes.length;wb.textContent=C.notes.length?"⚠ "+C.notes.join(" "):""}$("big").classList.toggle("long",el>=360000);
 $("rLast").innerHTML=last?`<td>${segName(k-1)}</td><td>${f(last.d)}</td><td>${f(last.c)}</td>`:"<td>—</td><td>—</td><td>—</td>";
 $("rCur").hidden=fin;$("rCur").innerHTML=`<td>${segName(k)}${st==="idle"?"":" — идёт"}</td><td>${f(Math.max(0,el-prevC))}</td><td>${f(el)}</td>`;
 const rk=$("rank");rk.hidden=!C.rankOn;
 if(C.rankOn){const r=rankAt(el);rk.textContent=fin?(snap.unfin||T.marks().length<planned()?"Дистанция не завершена — норматив не присваивается":"Итоговый норматив: "+r):"Текущий норматив (промежуточный): "+r}
 let pg="";const ref=C.cmp&&refOk()?refCs():null;
 if(!fin&&st!=="idle"){if(planned())pg=`Отрезок ${Math.min(k+1,planned())} из ${planned()}`;
  if(ref&&k<ref.length){const left=ref[k]-Math.max(0,el-prevC);pg+=(pg?" · ":"")+(left>=0?"до цели отрезка: "+f(left):"цель отрезка превышена: +"+f(-left)+" (не итог)")}}
 else if(fin)pg=snap.unfin?"Замер завершён, есть незавершённый отрезок":"Замер завершён";
 $("prog").textContent=pg;
 const b=$("btns");if(b.dataset.k!==st){b.dataset.k=st;
  b.innerHTML=st==="idle"?'<button id="bStart">СТАРТ</button>':st==="running"?'<button id="bLap">КРУГ</button><button id="bStop" class="alt">СТОП / ПАУЗА</button>':st==="paused"?'<button id="bRes">ПРОДОЛЖИТЬ</button><button id="bFin" class="alt">ЗАВЕРШИТЬ</button>':'<button class="alt" disabled>ЗАМЕР ЗАВЕРШЁН</button>';
  const g=$;if(g("bStart"))g("bStart").onclick=doStart;if(g("bLap"))g("bLap").onclick=doLap;if(g("bStop"))g("bStop").onclick=()=>{T.pause();FB.tap("stop");render();rsave()};if(g("bRes"))g("bRes").onclick=()=>{T.resume();FB.tap("resume");render();rsave()};if(g("bFin"))g("bFin").onclick=doFinish}
 $("undo").disabled=!sg.length||st==="idle";
 const dv=ref?CM.devs(ref,sg):[];const rows=[];
 $("tbl").className=(ref||C.rankOn)?"c":"";
 $("tbl").tHead.innerHTML="<tr><th>Отр.</th><th>Время</th><th>Общее</th>"+(ref?"<th>Δ круг</th><th>Δ общ.</th>":"")+(C.rankOn?"<th>Разряд</th>":"")+"</tr>";
 sg.forEach((s,i)=>rows.push(`<tr><td>${segName(i)}</td><td>${f(s.d)}</td><td>${i?f(s.c):""}</td>${ref?(dv[i]?dcell(dv[i].dl)+dcell(dv[i].dc):"<td>—</td><td>—</td>"):""}${C.rankOn?`<td>${rankAt(s.c)}</td>`:""}</tr>`));
 if(snap.unfin&&fin)rows.push(`<tr class="unf"><td>Незаверш.</td><td>${f(snap.unfin)}</td><td>${f(el)}</td>${ref?"<td>—</td><td>—</td>":""}${C.rankOn?"<td>—</td>":""}</tr>`);
 $("tbl").tBodies[0].innerHTML=rows.join(""); /* хронологический порядок: разгон/1-й круг сверху */
 /* итог после финиша */
 const sm=$("sum");sm.hidden=!fin;if(fin){let h=`<div class="sumbox">Итоговое время: <b>${f(el)}</b>`;
  if(ref){const s=CM.summary(ref,sg);h+=`<br>Ориентир${C.name?" «"+C.name.replace(/</g,"&lt;")+"»":""}: ${f(s.refTotal)}`+(s.n?`<br>Разница на ${s.n} отсеч.: <b class="${s.total<0?"neg":s.total>0?"pos":""}">${CM.fd(s.total,f)}</b><br>Быстрее: ${s.fa} · медленнее: ${s.sl} · одинаково: ${s.eq}`:"")+(s.incomplete?"<br>Сравнение незавершённое.":"")+(s.extra?`<br>Дополнительных кругов без ориентира: ${s.extra}.`:"")}
  sm.innerHTML=h+"</div>"}
 const lk=locked();["mode","dist","laps","auto","cmpOn","cmpName","tplPick","tplSave"].forEach(i=>$(i).disabled=lk);$("hasRun").disabled=lk||!C.dist;$("rankOn").disabled=lk||!C.dist;
 [...document.querySelectorAll("#refRows input")].forEach(x=>x.disabled=lk);
}
/* запись журнала: основной режим = C.mode, дополнительные функции — только отметки */
function buildRec(status){const sg=T.segs(),el=T.elapsedCs(),n=planned(),ref=C.cmp&&refOk()?refCs():null,complete=!snap.unfin&&(n?sg.length>=n:true);
 return{id:C.recId,v:1,started:C.started,savedAt:Date.now(),mode:C.mode,athlete:C.athlete,title:C.title,comment:C.comment,dist:C.dist,distName:dist()?dist().name:"",laps:C.laps,hasRun:C.hasRun,auto:C.auto,planned:n,segs:sg,unfin:snap.unfin,total:el,status:status||(complete?"complete":"incomplete"),
  features:{rank:C.rankOn,cmp:!!ref},rank:C.rankOn?{cat:C.cat,sex:C.sex,norms:N.NORMS_VERSION,rows:sg.map(s=>rankAt(s.c)),final:complete?rankAt(el):null}:null,cmp:ref?{name:C.name,ref}:null,notes:C.notes.slice(),endReason:C.endReason}}
async function persist(){try{await SKTO_DB.put(buildRec());saved=true;SKTO_JRN.toast("Результат сохранён");render();rsave();return true}catch(e){saved=false;SKTO_JRN.toast("ОШИБКА сохранения! Результат не сброшен");rsave();return false}}
function doStart(){const err=C.mode==="comp"&&!C.dist?"Выберите дистанцию.":C.cmp&&!planned()?"Для сравнения укажите количество кругов.":C.cmp&&!refOk()?"Заполните график ориентира.":"";
 if(err){C.bad=true;$("cfg").hidden=false;$("cfgNote").textContent=err;if(refUI)refUI.mark();return}
 T.start();snap.unfin=null;saved=false;C.notes=[];C.endReason=null;FB.tap("start");FB.wake(true);C.recId=SKTO_JRN.newId();C.started=Date.now();$("cfg").hidden=true;render();rsave()}
async function doFinish(){T.finish();FB.tap("stop");FB.wake(false);const m=T.marks(),last=m.length?m[m.length-1]:0,el=T.elapsedCs();snap.unfin=el>last?el-last:null;render();return persist()}
function doLap(){const c=T.lap();if(c===null)return;FB.tap("lap");
 if(C.auto&&planned()&&T.marks().length>=planned()){T.finish();snap.unfin=null;FB.wake(false);render();persist();return}render();rsave()}
$("undo").onclick=async()=>{const was=T.state()==="finished";T.undo();snap.unfin=null;FB.tap("undo");if(was)FB.wake(true);render();rsave();
 if(was&&saved){saved=false;try{await SKTO_DB.put(buildRec("active"))}catch(e){}}}; /* запись той же id перезапишется при повторном финише */
$("reset").onclick=()=>{if(T.state()==="idle")return;const done=T.state()==="finished"&&saved;$("mTxt").textContent=done?"Результат уже сохранён в журнал. Сброс не удалит запись.":"Убедитесь, что текущий результат сохранён.";$("mSave").hidden=done;$("modal").hidden=false}; /* время при открытом окне продолжает идти */
$("mNo").onclick=()=>{$("modal").hidden=true};
$("mSave").onclick=async()=>{const ok=T.state()==="finished"?await persist():await doFinish();if(ok){$("modal").hidden=true;doReset()}else $("mTxt").textContent="Сохранить не удалось. Замер не сброшен."};
function doReset(){T.reset();snap.unfin=null;saved=false;C.notes=[];C.endReason=null;FB.wake(false);rsave();$("btns").dataset.k="";C.bad=false;sync()}
$("mDo").onclick=()=>{$("modal").hidden=true;doReset()};
(function loop(){if(T.state()==="running")render();requestAnimationFrame(loop)})();
/* «Использовать для сравнения»: исходная запись не меняется */
function useAsRef(r){if(locked()){SKTO_JRN.toast("Сначала завершите текущий замер");return false}
 const cs=r.segs.map(s=>s.d);C.mode="compare";C.cmp=true;C.rankOn=false;C.dist=r.dist;C.hasRun=!!r.hasRun;C.laps=r.dist?cs.length-(r.hasRun?1:0):cs.length;
 C.tplId=null;C.name=r.title||r.athlete||(r.distName?r.distName+" "+new Date(r.started).toLocaleDateString("ru-RU"):"Запись");
 C.refT=cs.map(c=>[c>=6000?String(Math.floor(c/6000)):"",String(Math.floor(c%6000/100)),String(Math.floor(c%100/10)),String(c%10)]);
 sync();$("cfg").hidden=false;return true}
/* --- интерфейс для recovery.js --- */
const getState=()=>({C:JSON.parse(JSON.stringify(C)),unfin:snap.unfin,saved});
function applyConfig(s){Object.assign(C,s.C);C.notes=C.notes||[];snap.unfin=s.unfin;saved=!!s.saved;$("btns").dataset.k="";["athlete","title","comment"].forEach(k=>$(k).value=C[k]||"");sync()}
function warn(m){if(!C.notes.includes(m))C.notes.push(m);render()}
function finishRestored(reason){const m=T.marks(),last=m.length?m[m.length-1]:0,el=T.elapsedCs();snap.unfin=el>last?el-last:null;if(reason)C.endReason=reason;FB.wake(false);render();return persist()}
/* --- шаблоны сравнения (хранение и интерфейс — js/templates.js) --- */
const graphOf=()=>JSON.stringify({n:C.name,d:C.dist,l:C.laps,r:C.hasRun,t:refCs()});
const changed=()=>C.tplSnap!==graphOf();
function markLoaded(t){C.tplId=t.id;C.tplName=t.name;C.tplSnap=graphOf();render()}
/* загрузка меняет ТОЛЬКО график сравнения; спортсмен/название/комментарий и прочее не трогаются (режим — лишь по явному выбору) */
function applyTemplate(t,mode){if(locked())return false;if(mode)setMode(mode);
 C.cmp=true;C.dist=t.dist;C.hasRun=!!t.hasRun;C.laps=t.laps;C.name=t.refName;if(!C.dist)C.rankOn=false;
 C.refT=t.times.map(c=>[c>=6000?String(Math.floor(c/6000)):"",String(Math.floor(c%6000/100)),String(Math.floor(c%100/10)),String(c%10)]);
 C.bad=false;sync();markLoaded(t);return true}
const refGet=()=>({ok:refOk(),cs:refOk()?refCs():[],name:C.name,dist:C.dist,laps:C.laps,hasRun:C.hasRun});
window.APP={f,sync,render,useAsRef,C,T,getState,applyConfig,warn,finishRestored,isSaved:()=>saved,applyTemplate,markLoaded,changed,refGet,locked};
sync();
})();
