import {getUser,refreshSession} from '@netlify/identity';
import {sessionHeaders,expireSession,sessionGeneration} from './session.js';
let lastNotice=0;
function notice(message){if(Date.now()-lastNotice>12000){window.dispatchEvent(new CustomEvent('kk-toast',{detail:message}));lastNotice=Date.now()}}
export async function fetchApi(path,options={}){
 const generation=sessionGeneration();
 await getUser();
 await refreshSession(); // Refresh near-expiry cookies before authenticated requests.
 const response=await fetch('/api/'+path,{...options,credentials:'same-origin',cache:'no-store',headers:{...sessionHeaders(),...options.headers}});
 // A delayed failure from the previous session must never log out a new login.
 if(response.status===401&&generation===sessionGeneration()&&!['content','visits','logout','me','session/open','passkeys/login/options','passkeys/login/verify','phone/settings','phone/start','phone/verify'].includes(path))expireSession();
 return response;
}
export async function request(path,method='GET',body,onDelta){
 const response=await fetchApi(path,{method,headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
 if(response.ok&&onDelta){
  if(!response.body||!response.headers.get('content-type')?.includes('application/x-ndjson'))throw new Error('استجابة المساعد غير متاحة. أعد المحاولة.');
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',answer='',complete=false;
  try{
   while(true){
    const {value,done}=await reader.read();buffer+=decoder.decode(value,{stream:!done});
    const lines=buffer.split('\n');buffer=lines.pop();
    for(const line of lines){
     if(!line.trim())continue;const part=JSON.parse(line);
     if(part.error)throw new Error(part.error);
     if(part.delta){answer+=part.delta;onDelta(answer)}
     if(part.done)complete=true;
    }
    if(done)break;
   }
   if(!complete||!answer.trim())throw new Error('انقطع رد المساعد. سؤالك باقٍ؛ أعد المحاولة.');
   return {answer};
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
 }
 let data;
 try{data=await response.json()}catch{const error=new Error(response.status===401?'تعذر الوصول إلى التطبيق بسبب حماية الموقع. تواصل مع الإدارة للتحقق من إتاحة الموقع.':'استجابة الخادم غير متاحة. أعد المحاولة بعد قليل.');error.status=response.status;error.sessionError=true;throw error}
 if(!response.ok){const error=new Error(data.error||'تعذر الاتصال بالخادم');error.status=response.status;throw error;}
 return data;
}
class Collection{
 constructor(name,uid){this.name=name;this.uid=uid;this.maximum=1000;this.sortField=null}
 where(field,operator,value){if(field==='uid'&&operator==='==')return new Collection(this.name,value);throw new Error('Unsupported filter')}
 orderBy(field,direction){this.sortField=field;this.direction=direction;return this}
 limit(value){this.maximum=value;return this}
 async add(data){const row=await request(this.name,'POST',data);window.dispatchEvent(new Event('kk-data'));return row}
 doc(id){return {update:async data=>{const row=await request(this.name+'/'+encodeURIComponent(id),'PATCH',data);window.dispatchEvent(new Event('kk-data'));return row}}}
 onSnapshot(update,error){
  let active=true,running=false;
  const load=async()=>{if(!active||running||document.hidden)return;running=true;try{
   let rows=await request(this.name+(this.uid?'?uid='+encodeURIComponent(this.uid):''));
   if(this.sortField)rows.sort((a,b)=>((a[this.sortField]?.seconds||0)-(b[this.sortField]?.seconds||0))*(this.direction==='desc'?-1:1));
   if(active)update({docs:rows.slice(0,this.maximum).map(row=>({id:row.id,data:()=>row}))});
  }catch(err){if(active){error?.(err);notice(err.message)}}finally{running=false}};
  load();const timer=setInterval(load,7000);
  window.addEventListener('kk-data',load);window.addEventListener('online',load);document.addEventListener('visibilitychange',load);
  return()=>{active=false;clearInterval(timer);window.removeEventListener('kk-data',load);window.removeEventListener('online',load);document.removeEventListener('visibilitychange',load)};
 }
}
export const db={collection:name=>new Collection(name)};
