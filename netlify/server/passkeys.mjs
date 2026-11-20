import { randomBytes } from 'node:crypto';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { and, eq, gt, lt } from 'drizzle-orm';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { db, schema } from '../../db/client.mjs';
import { audit, rate, clean, hash, cookieOptions, SESSION_COOKIE, CHALLENGE_COOKIE } from './security.mjs';
import {openAppSession} from './app-sessions.mjs';

async function challenge(c,options,purpose,uid=null){
 await db.delete(schema.challenges).where(lt(schema.challenges.expires,new Date()));
 const [row]=await db.insert(schema.challenges).values({challenge:options.challenge,purpose,uid,origin:new URL(c.req.url).origin,expires:new Date(Date.now()+300000)}).returning();
 setCookie(c,CHALLENGE_COOKIE,row.id,{...cookieOptions,maxAge:300});
 return c.json(options);
}
async function consume(c,purpose){
 const id=getCookie(c,CHALLENGE_COOKIE);
 deleteCookie(c,CHALLENGE_COOKIE,cookieOptions);
 if(!id||! /^[0-9a-f-]{36}$/i.test(id))return null;
 // DELETE RETURNING makes challenges single-use, including concurrent verifications.
 const [row]=await db.delete(schema.challenges).where(and(eq(schema.challenges.id,id),eq(schema.challenges.purpose,purpose),gt(schema.challenges.expires,new Date()),eq(schema.challenges.origin,new URL(c.req.url).origin))).returning();
 return row;
}
export function passkeyRoutes(app){
 app.post('/api/passkeys/login/options',async c=>{
  if(!await rate(c,'passkey-options',20))return c.json({error:'محاولات كثيرة، انتظر دقيقة ثم أعد المحاولة'},429);
  const options=await generateAuthenticationOptions({rpID:new URL(c.req.url).hostname,userVerification:'required'});
  return challenge(c,options,'login');
 });
 app.post('/api/passkeys/login/verify',async c=>{
  if(!await rate(c,'passkey-verify',20))return c.json({error:'محاولات كثيرة، انتظر دقيقة'},429);
  const pending=await consume(c,'login');
  if(!pending)return c.json({error:'انتهت مهلة التحقق. ابدأ الدخول من جديد.'},400);
  try{
   const response=await c.req.json();
   const [key]=await db.select().from(schema.passkeys).where(and(eq(schema.passkeys.id,clean(response.id,2048)),eq(schema.passkeys.rpId,new URL(c.req.url).hostname))).limit(1);
   if(!key)throw new Error('Invalid credential');
   const verified=await verifyAuthenticationResponse({response,expectedChallenge:pending.challenge,expectedOrigin:pending.origin,expectedRPID:key.rpId,requireUserVerification:true,credential:{id:key.id,publicKey:new Uint8Array(Buffer.from(key.publicKey,'base64url')),counter:key.counter,transports:key.transports}});
   if(!verified.verified)throw new Error('Invalid signature');
   const [updated]=await db.update(schema.passkeys).set({counter:verified.authenticationInfo.newCounter,last:new Date()}).where(and(eq(schema.passkeys.id,key.id),eq(schema.passkeys.counter,key.counter))).returning();
   if(!updated)throw new Error('Concurrent authentication');
   const session=randomBytes(32).toString('base64url');
   await db.delete(schema.sessions).where(lt(schema.sessions.expires,new Date()));
   await db.insert(schema.sessions).values({hash:hash(session),uid:key.uid,credentialId:key.id,expires:new Date('9999-12-31T00:00:00Z')});
   const [user]=await db.select().from(schema.users).where(eq(schema.users.id,key.uid)).limit(1);
   c.set('user',user);c.set('source','passkey');
   await audit(c,'login_success');
   setCookie(c,SESSION_COOKIE,session,{...cookieOptions,maxAge:34560000});
   if(!await openAppSession(c))throw new Error('Missing window binding');
   return c.json({ok:true});
  }catch{
   // Never attach a claimed account or credential ID to a failed attempt.
   c.set('user',null);await audit(c,'login_failed',{method:'passkey'});
   return c.json({error:'تعذر التحقق من مفتاح المرور. أعد المحاولة أو ادخل بالبريد أو Google.'},401);
  }
 });
 app.post('/api/passkeys/register/options',async c=>{
  if(c.get('source')!=='identity')return c.json({error:'أكّد الدخول بالبريد أو Google أولاً لإضافة مفتاح مرور'},403);
  const u=c.get('user');
  if(!await rate(c,'enroll',10,3600,u.id))return c.json({error:'بلغت حد المحاولات. حاول لاحقاً.'},429);
  const keys=await db.select().from(schema.passkeys).where(eq(schema.passkeys.uid,u.id));
  if(keys.length>=10)return c.json({error:'يمكن حفظ عشرة مفاتيح كحد أقصى. احذف مفتاحاً قديماً.'},400);
  const options=await generateRegistrationOptions({rpName:'مؤسسة كركبة',rpID:new URL(c.req.url).hostname,userID:new TextEncoder().encode(u.id),userName:u.email,userDisplayName:u.user_metadata?.full_name||u.email,attestationType:'none',authenticatorSelection:{residentKey:'required',userVerification:'required'},excludeCredentials:keys.map(k=>({id:k.id,transports:k.transports}))});
  return challenge(c,options,'register',u.id);
 });
 app.post('/api/passkeys/register/verify',async c=>{
  if(c.get('source')!=='identity')return c.json({error:'أكّد الدخول بالبريد أو Google أولاً'},403);
  const pending=await consume(c,'register');
  if(!pending||pending.uid!==c.get('user').id)return c.json({error:'انتهت مهلة التسجيل، أعد المحاولة'},400);
  try{
   const {response,name}=await c.req.json();
   const result=await verifyRegistrationResponse({response,expectedChallenge:pending.challenge,expectedOrigin:pending.origin,expectedRPID:new URL(c.req.url).hostname,requireUserVerification:true});
   if(!result.verified||!result.registrationInfo)throw new Error('Invalid registration');
   const key=result.registrationInfo.credential;
   await db.insert(schema.passkeys).values({id:key.id,uid:pending.uid,publicKey:Buffer.from(key.publicKey).toString('base64url'),counter:key.counter,transports:key.transports||[],rpId:new URL(c.req.url).hostname,name:clean(name,80)||'مفتاح مرور'});
   await audit(c,'passkey_added');return c.json({ok:true},201);
  }catch{return c.json({error:'لم يتم تسجيل مفتاح المرور. ربما كان مسجلاً بالفعل؛ أعد المحاولة.'},400)}
 });
 app.get('/api/passkeys',async c=>{
  const keys=await db.select({id:schema.passkeys.id,name:schema.passkeys.name,created:schema.passkeys.created,last:schema.passkeys.last,rpId:schema.passkeys.rpId}).from(schema.passkeys).where(eq(schema.passkeys.uid,c.get('user').id));
  return c.json(keys);
 });
 app.delete('/api/passkeys/:id',async c=>{
  const rows=await db.delete(schema.passkeys).where(and(eq(schema.passkeys.id,c.req.param('id')),eq(schema.passkeys.uid,c.get('user').id))).returning({id:schema.passkeys.id});
  if(!rows.length)return c.notFound();
  await audit(c,'passkey_deleted');return c.json({ok:true});
 });
}
