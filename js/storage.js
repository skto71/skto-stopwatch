/* js/storage.js — IndexedDB «skto-smart-stopwatch-db» (независима от других приложений СКТО).
   Хранилища: records — журналы; meta — служебные данные (на этапе 4 здесь будет active-замер). */
window.SKTO_DB=(function(){const NAME="skto-smart-stopwatch-db",VER=1;let dbp;
 function open(){return dbp||(dbp=new Promise((res,rej)=>{const q=indexedDB.open(NAME,VER);
  q.onupgradeneeded=()=>{const d=q.result;if(!d.objectStoreNames.contains("records")){d.createObjectStore("records",{keyPath:"id"}).createIndex("mode","mode")}if(!d.objectStoreNames.contains("meta"))d.createObjectStore("meta",{keyPath:"key"})};
  q.onsuccess=()=>res(q.result);q.onerror=()=>{dbp=null;rej(q.error)}}))}
 const tx=async(st,m,fn)=>{const d=await open();return new Promise((res,rej)=>{const t=d.transaction(st,m);let out;const r=fn(t);if(r)r.onsuccess=()=>out=r.result;t.oncomplete=()=>res(out);t.onerror=t.onabort=()=>rej(t.error||new Error("tx"))})};
 const S=t=>t.objectStore("records");
 return{put:r=>tx("records","readwrite",t=>S(t).put(r)),get:id=>tx("records","readonly",t=>S(t).get(id)),all:()=>tx("records","readonly",t=>S(t).getAll()),del:id=>tx("records","readwrite",t=>S(t).delete(id)),
  putMany:rs=>tx("records","readwrite",t=>{rs.forEach(r=>S(t).put(r))}),
  replaceAll:rs=>tx("records","readwrite",t=>{S(t).clear();rs.forEach(r=>S(t).put(r))}), /* одна транзакция: при ошибке ничего не меняется */
  kvGet:k=>tx("meta","readonly",t=>t.objectStore("meta").get(k)).then(x=>x&&x.value),kvSet:(k,v)=>tx("meta","readwrite",t=>t.objectStore("meta").put({key:k,value:v}))}})();
