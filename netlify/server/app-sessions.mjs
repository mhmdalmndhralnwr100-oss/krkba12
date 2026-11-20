import {randomBytes} from 'node:crypto';
import {getCookie,setCookie,deleteCookie} from 'hono/cookie';
import {and,eq,gt,lt} from 'drizzle-orm';
import {db,schema} from '../../db/client.mjs';
import {hash,cookieOptions,rate,ACCESS_COOKIE} from './security.mjs';

const COOKIE=ACCESS_COOKIE;
const sessionExpiry=()=>new Date('9999-12-31T00:00:00Z');
const binding=c=>c.req.header('x-kk-window')||'';
export async function openAppSession(c){
 if(!/^[0-9a-f-]{36}$/i.test(binding(c)))return false;
 const token=randomBytes(32).toString('base64url');
 await db.delete(schema.appSessions).where(lt(schema.appSessions.expires,new Date()));
 await db.insert(schema.appSessions).values({hash:hash(token),uid:c.get('user').id,source:c.get('source'),binding:hash(binding(c)),expires:sessionExpiry()});
 // Browser cookies have a platform maximum lifetime and renew on use.
 setCookie(c,COOKIE,token,{...cookieOptions,maxAge:34560000});
 return true;
}
export async function checkAppSession(c){
 // Identity is already verified for every request. Do not add a second timeout.
 if(c.get('source')==='identity')return true;
 const token=getCookie(c,COOKIE);
 if(!token||!binding(c)||!c.get('user'))return false;
 const [row]=await db.select().from(schema.appSessions).where(and(eq(schema.appSessions.hash,hash(token)),eq(schema.appSessions.uid,c.get('user').id),eq(schema.appSessions.source,c.get('source')),eq(schema.appSessions.binding,hash(binding(c))),gt(schema.appSessions.expires,new Date()))).limit(1);
 if(!row)return false;
 setCookie(c,COOKIE,token,{...cookieOptions,maxAge:34560000});
 c.set('appSession',row);return true;
}
export async function closeAppSession(c){
 const token=getCookie(c,COOKIE);
 if(token)await db.delete(schema.appSessions).where(eq(schema.appSessions.hash,hash(token)));
 deleteCookie(c,COOKIE,cookieOptions);
}
export function appSessionRoutes(app){
 app.post('/api/session/open',async c=>{
  if(!c.get('user'))return c.json({error:'سجّل الدخول أولاً'},401);
  if(!await rate(c,'session-open',30,60,c.get('user').id))return c.json({error:'انتظر قليلاً ثم أعد الدخول'},429);
  // authenticate() has just validated this confirmed account with Identity.
  // last_sign_in_at is account metadata, not proof of session validity: it can
  // be absent or older after confirmation, recovery, or a token refresh.
  if(c.get('source')!=='identity')return c.json({error:'سجّل الدخول بحسابك أولاً'},401);
  // The verified Identity session is sufficient; no additional lease is needed.
  return c.json({ok:true});
 });
 app.post('/api/session/state',async c=>{
  const data=await c.req.json();
  if(typeof data?.hidden!=='boolean')return c.json({error:'حالة غير صحيحة'},400);
  // Compatibility with older clients: leaving/closing the page never logs out.
  return c.json({ok:true});
 });
}
