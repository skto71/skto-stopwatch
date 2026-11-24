/* js/comparison.js — график ориентира: ввод времени (4 поля), расчёт отклонений и итогов. Не зависит от таймера. */
window.SKTO_CMP=(function(){
 /* [мин, сек, десятые, сотые] → целые сотые или null (сек обязательны, 0–59; ноль недопустим) */
 const toCs=t=>{if(t[1]===""||t[2]===""||t[3]==="")return null;const s=+t[1];if(s>59)return null;const v=((t[0]===""?0:+t[0])*60+s)*100+(+t[2])*10+(+t[3]);return v>0?v:null};
 const fd=(d,f)=>(d>0?"+":d<0?"−":"")+f(Math.abs(d)); /* знак всегда виден, не только цвет */
 const cum=a=>{let s=0;return a.map(x=>s+=x||0)};
 /* поля с готовыми разделителями : и , ; переход между полями автоматический */
 function build(box,labels,tuples,onChange,showBad){
  box.innerHTML=labels.map((l,i)=>`<div class="tr" data-i="${i}"><span class="rl">${l}</span><input inputmode="numeric" maxlength="2" data-f="0" placeholder="мм"><i>:</i><input inputmode="numeric" maxlength="2" data-f="1" placeholder="сс"><i>,</i><input inputmode="numeric" maxlength="1" data-f="2" placeholder="д"><input inputmode="numeric" maxlength="1" data-f="3" placeholder="с"><span class="rc"></span></div>`).join("");
  const rows=[...box.children];
  const mark=()=>rows.forEach((r,i)=>{[...r.querySelectorAll("input")].forEach((x,f)=>x.classList.toggle("bad",showBad()&&f>0&&x.value===""))});
  rows.forEach((r,i)=>{const ins=[...r.querySelectorAll("input")];ins.forEach((el,f)=>{el.value=tuples[i][f];
   el.addEventListener("input",()=>{el.value=el.value.replace(/\D/g,"");tuples[i][f]=el.value;
    if(el.value.length>=el.maxLength){const nx=f<3?ins[f+1]:(rows[i+1]&&rows[i+1].querySelectorAll("input")[1]);if(nx)nx.focus()}
    onChange();mark()})})});
  mark();return{mark};
 }
 return{toCs,fd,cum,build,
  /* отклонения по соответствующим отсечкам: dl — круг, dc — общее время */
  devs(ref,segs){const rc=cum(ref);return segs.map((s,i)=>i<ref.length?{dl:s.d-ref[i],dc:s.c-rc[i]}:null)},
  summary(ref,segs){const n=Math.min(ref.length,segs.length),rc=cum(ref);let fa=0,sl=0,eq=0;
   for(let i=0;i<n;i++){const d=segs[i].d-ref[i];d<0?fa++:d>0?sl++:eq++}
   return{n,fa,sl,eq,total:n?segs[n-1].c-rc[n-1]:0,refTotal:rc[rc.length-1]||0,incomplete:segs.length<ref.length,extra:Math.max(0,segs.length-ref.length)}}
 }})();
