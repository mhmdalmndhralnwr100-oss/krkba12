import {logout} from '@netlify/identity';

// This browser binding is not a credential; access still requires the HttpOnly
// session cookie and server-side account verification. Share it across reloads/tabs.
let windowId=document.cookie.split('; ').find(value=>value.startsWith('kk-browser='))?.slice(11);
if(!/^[0-9a-f-]{36}$/i.test(windowId||''))windowId=crypto.randomUUID();
document.cookie=`kk-browser=${windowId}; Path=/; Max-Age=34560000; Secure; SameSite=Strict`;
export const sessionHeaders=()=>({'X-KK-Window':windowId});
let expired=false,ending,generation=0;
export const sessionGeneration=()=>generation;
export function sessionOpened(){generation++;expired=false}
export async function waitForSessionEnd(){if(ending)await ending}
export function expireSession(){
 if(expired)return ending||Promise.resolve();
 expired=true;
 window.dispatchEvent(new Event('kk-session-expired'));
 if(!ending)ending=(async()=>{
  try{await fetch('/api/logout',{method:'POST',credentials:'same-origin',cache:'no-store',headers:sessionHeaders(),signal:AbortSignal.timeout(8000)})}catch{}
  try{await logout()}catch{}
 })().finally(()=>{ending=null});
 return ending;
}
