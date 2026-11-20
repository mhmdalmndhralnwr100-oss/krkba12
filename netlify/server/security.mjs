import { createHash } from 'node:crypto';
import { getCookie, setCookie } from 'hono/cookie';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { db, schema } from '../../db/client.mjs';

export const hash = value => createHash('sha256').update(value).digest('hex');
export const clean = (v,max=2000) => typeof v === 'string' ? v.trim().slice(0,max) : '';
export const viewUser = (user,admin=false,source='identity') => ({id:user.id,email:user.email,phone:user.phone||null,name:user.user_metadata?.full_name||user.name||user.phone||user.email,admin,source});
export const cookieOptions = {httpOnly:true,secure:true,sameSite:'Strict',path:'/'};
export const SESSION_COOKIE = '__Host-kk_session';
export const ACCESS_COOKIE = '__Host-kk_access';
export const CHALLENGE_COOKIE = '__Host-kk_challenge';
export const VISITOR_COOKIE = '__Host-kk_visitor';
export const pages = new Set(['login','home','svc','order','chat','adm','acc','ct','ai','account_setup']);

export function deviceInfo(ua='') {
 return {
  browser:/Edg\//.test(ua)?'Edge':/OPR\//.test(ua)?'Opera':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'غير معروف',
  device:/iPad|Tablet/i.test(ua)?'جهاز لوحي':/Mobile|Android|iPhone/i.test(ua)?'هاتف':'حاسوب أو جهاز آخر',
  platform:/Android/i.test(ua)?'Android':/iPhone|iPad/i.test(ua)?'iOS':/Windows/i.test(ua)?'Windows':/Mac/i.test(ua)?'macOS':/Linux/i.test(ua)?'Linux':'غير معروف'
 };
}
export async function audit(c,event,extra={}) {
 const u=c.get('user');
 await db.insert(schema.activity).values({uid:u?.id||null,email:u?.email||null,visitor:getCookie(c,VISITOR_COOKIE)||null,event,method:c.get('source')||null,...deviceInfo(c.req.header('user-agent')), ...extra});
}
export async function rate(c,scope,maximum,seconds=60,identity) {
 // Platform-supplied client address is hashed and used only for short-lived throttling.
 const subject=identity||c.req.header('x-nf-client-connection-ip')||'unknown';
 const now=Date.now(),key=scope+':'+hash(subject)+':'+Math.floor(now/(seconds*1000));
 await db.delete(schema.limits).where(lt(schema.limits.expires,new Date(now)));
 const [row]=await db.insert(schema.limits).values({key,expires:new Date(now+seconds*1000)})
  .onConflictDoUpdate({target:schema.limits.key,set:{count:sql`${schema.limits.count} + 1`}}).returning();
 return row.count<=maximum;
}
export async function authenticate(c) {
 const cookie=getCookie(c,'nf_jwt');
 const token=cookie?'Bearer '+cookie:c.req.header('authorization');
 if(token?.startsWith('Bearer ')) {
  let response;
  try {response=await fetch(new URL('/.netlify/identity/user',c.req.url),{headers:{Authorization:token},signal:AbortSignal.timeout(8000)});}
  catch {return {error:'تعذر التحقق من الجلسة، حاول مجدداً',status:503};}
  if(response.status>=500)return {error:'خدمة الحسابات غير متاحة مؤقتاً',status:503};
  if(response.ok){
   const user=await response.json();
   if(user.id&&user.confirmed_at){
    c.set('user',user);c.set('source','identity');
    c.set('admin',Array.isArray(user.app_metadata?.roles)&&user.app_metadata.roles.includes('admin'));
   }
  }
 }
 if(!c.get('user')){
  const session=getCookie(c,SESSION_COOKIE);
  if(session){
   const [row]=await db.select({user:schema.users}).from(schema.sessions)
    .innerJoin(schema.users,eq(schema.sessions.uid,schema.users.id))
    .innerJoin(schema.passkeys,eq(schema.sessions.credentialId,schema.passkeys.id))
    .where(and(eq(schema.sessions.hash,hash(session)),gt(schema.sessions.expires,new Date()),eq(schema.passkeys.rpId,new URL(c.req.url).hostname))).limit(1);
   if(row){c.set('user',row.user);c.set('source','passkey');c.set('admin',false);setCookie(c,SESSION_COOKIE,session,{...cookieOptions,maxAge:34560000});}
  }
 }
 if(!c.get('user')){
  const access=getCookie(c,ACCESS_COOKIE),binding=c.req.header('x-kk-window');
  if(access&&binding){
   const [row]=await db.select({user:schema.users}).from(schema.appSessions)
    .innerJoin(schema.users,eq(schema.appSessions.uid,schema.users.id))
    .where(and(eq(schema.appSessions.hash,hash(access)),eq(schema.appSessions.source,'phone'),eq(schema.appSessions.binding,hash(binding)),gt(schema.appSessions.expires,new Date()))).limit(1);
   if(row){c.set('user',row.user);c.set('source','phone');c.set('admin',false)}
  }
 }
 const user=c.get('user');
 if(user)await db.insert(schema.users).values({id:user.id,name:clean(user.user_metadata?.full_name||user.name,100)||user.email,email:user.email})
  .onConflictDoUpdate({target:schema.users.id,set:{name:clean(user.user_metadata?.full_name||user.name,100)||user.email,email:user.email,last:new Date()}});
 return null;
}
