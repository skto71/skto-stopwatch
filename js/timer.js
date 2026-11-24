/* js/timer.js — ЕДИНЫЙ механизм хронометража (не зависит от интерфейса).
   Время = performance.now() - старт - сумма пауз. Отметка фиксируется первой, до любых эффектов. */
window.Timer=(function(){
 const s={st:"idle",start:0,paused:0,pauseAt:0,end:null,marks:[],lastMark:-1e9,wall:0};
 const now=()=>performance.now();
 const elapsed=(t)=>{t=t===undefined?now():t;if(s.st==="idle")return 0;const e=s.end!==null?s.end:(s.st==="paused"?s.pauseAt:t);return e-s.start-s.paused};
 const cs=ms=>Math.floor(ms/10+1e-6); /* единое правило: ms → целые сотые */
 return{
  state:()=>s.st,elapsedMs:()=>elapsed(),
  /* восстановление: st, ms (накопленные мс), marks (целые сотые). Время после импорта продолжает идти монотонно. */
  imp(o){const t=now();s.st=o.st;s.start=t-o.ms;s.paused=0;s.pauseAt=t;s.marks=o.marks.slice();s.lastMark=-1e9;s.end=o.st==="finished"?t:null},
  start(){const t=now();s.st="running";s.start=t;s.paused=0;s.end=null;s.marks=[];s.wall=Date.now()},
  /* отсечка; возвращает накопленные сотые или null (двойное нажатие <250 мс / нулевой отрезок) */
  lap(){const t=now();if(s.st!=="running")return null;const c=cs(elapsed(t));const prev=s.marks.length?s.marks[s.marks.length-1]:0;
   if(t-s.lastMark<250||c<=prev)return null;s.lastMark=t;s.marks.push(c);return c},
  pause(){const t=now();if(s.st==="running"){s.st="paused";s.pauseAt=t}},
  resume(){const t=now();if(s.st==="paused"){s.paused+=t-s.pauseAt;s.st="running"}},
  finish(){const t=now();if(s.st==="running"||s.st==="paused"){s.end=s.st==="paused"?s.pauseAt:t;s.st="finished"}},
  /* отмена последней отсечки; если она завершила замер — время после неё не теряется */
  undo(){if(!s.marks.length)return false;s.marks.pop();if(s.st==="finished"){s.end=null;s.st="running"}return true},
  reset(){s.st="idle";s.marks=[];s.end=null;s.paused=0},
  elapsedCs:()=>cs(elapsed()),marks:()=>s.marks.slice(),
  /* сегменты: время отрезка = разность накопленных целых сотых (сумма всегда равна итогу) */
  segs(){const o=[];let p=0;for(const m of s.marks){o.push({d:m-p,c:m});p=m}return o}
 }})();
