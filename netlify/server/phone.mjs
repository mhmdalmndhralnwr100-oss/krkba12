import {randomUUID} from 'node:crypto';
import twilio from 'twilio';
import {parsePhoneNumberFromString} from 'libphonenumber-js/max';
import {getCookie,setCookie,deleteCookie} from 'hono/cookie';
import {and,eq,gt,lt,sql} from 'drizzle-orm';
import {db,schema} from '../../db/client.mjs';
import {audit,clean,cookieOptions,hash,rate} from './security.mjs';
import {openAppSession} from './app-sessions.mjs';

const COOKIE='__Host-kk_phone_challenge';
const countries=new Set(['SD','EG','SA','DZ']);
const configured=()=>/^AC[0-9a-f]{32}$/i.test(process.env.TWILIO_ACCOUNT_SID||'')&&!!process.env.TWILIO_AUTH_TOKEN&&/^VA[0-9a-f]{32}$/i.test(process.env.TWILIO_VERIFY_SERVICE_SID||'');
const service=()=>twilio(process.env.TWILIO_ACCOUNT_SID,process.env.TWILIO_AUTH_TOKEN,{timeout:12000,autoRetry:false,logLevel:'silent'}).verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID);
const binding=c=>c.req.header('x-kk-window')||'';
const digits=value=>String(value||'').replace(/[٠-٩]/g,x=>String(x.charCodeAt(0)-1632)).replace(/[۰-۹]/g,x=>String(x.charCodeAt(0)-1776));
function normalizePhone(value,country){
 if(!countries.has(country)||typeof value!=='string'||value.length>40)return null;
 const input=digits(value).trim().replace(/^00/,'+');
 if(!/^[+\d\s()-]+$/.test(input))return null;
 const phone=parsePhoneNumberFromString(input,country);
 return phone?.country===country&&phone.isValid()&&['MOBILE','FIXED_LINE_OR_MOBILE'].includes(phone.getType())?phone.number:null;
}
function providerError(c,error){
 // Do not return/log SDK errors: they can contain credentials, phone numbers or codes.
 if(error.status===429||[60202,60203,60212].includes(error.code))return c.json({error:'محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.'},429);
 if(error.status===404||[60200,60223].includes(error.code))return c.json({error:'انتهت صلاحية الرمز أو لم يعد صالحًا. اطلب رمزًا جديدًا.'},400);
 if([21211,21614].includes(error.code))return c.json({error:'تعذر إرسال SMS إلى هذا الرقم. تحقق من رقم الجوال والبلد.'},400);
 if([21408,21608,60205,60410].includes(error.code))return c.json({error:'الإرسال إلى هذا الرقم أو شبكته غير متاح حاليًا. استخدم Google أو البريد أو تواصل مع الإدارة.'},503);
 return c.json({error:'خدمة التحقق غير متاحة الآن. أعد المحاولة لاحقًا أو ادخل باستخدام Google أو البريد.'},503);
}
export function phoneRoutes(app){
 app.get('/api/phone/settings',c=>c.json({enabled:configured()}));
 app.post('/api/phone/start',async c=>{
  if(!configured())return c.json({error:'الدخول بالهاتف غير متاح حاليًا. استخدم Google أو البريد.'},503);
  if(!/^[0-9a-f-]{36}$/i.test(binding(c)))return c.json({error:'أعد فتح صفحة الدخول وحاول مجددًا'},400);
  const data=await c.req.json(),phone=normalizePhone(data?.phone,data?.country),name=clean(data?.name,100);
  if(!phone)return c.json({error:'أدخل رقم جوال صحيحًا للسودان أو مصر أو السعودية أو الجزائر، واختر بلده.'},400);
  if(!await rate(c,'sms-ip',5,900)||!await rate(c,'sms-phone',3,900,phone)||!await rate(c,'sms-cooldown',1,60,phone))return c.json({error:'انتظر دقيقة قبل طلب رمز جديد. عدد الرسائل محدود لحماية حسابك.'},429);
  if(!await rate(c,'sms-daily',100,86400,'site'))return c.json({error:'الدخول بالهاتف مشغول اليوم. استخدم Google أو البريد أو حاول لاحقًا.'},429);
  await db.delete(schema.phoneChallenges).where(lt(schema.phoneChallenges.expires,new Date()));
  try{
   const verification=await service().verifications.create({to:phone,channel:'sms',locale:'ar'});
   if(verification.status!=='pending'||!/^VE[0-9a-f]{32}$/i.test(verification.sid))return c.json({error:'لم يكتمل إرسال الرمز. أعد المحاولة لاحقًا.'},503);
   const values={phone,verificationSid:verification.sid,binding:hash(binding(c)),name,expires:new Date(Date.now()+600000)};
   // Resends can reuse a provider SID. Keep its attempt count rather than resetting it.
   const [row]=await db.insert(schema.phoneChallenges).values(values).onConflictDoUpdate({target:schema.phoneChallenges.verificationSid,set:values}).returning({id:schema.phoneChallenges.id});
   setCookie(c,COOKIE,row.id,{...cookieOptions,maxAge:600});
   return c.json({sent:true,retryAfter:60,expiresIn:600});
  }catch(error){return providerError(c,error)}
 });
 app.post('/api/phone/verify',async c=>{
  if(!configured())return c.json({error:'خدمة التحقق غير متاحة حاليًا'},503);
  if(!await rate(c,'sms-check-ip',20,900))return c.json({error:'محاولات كثيرة. انتظر ثم أعد المحاولة.'},429);
  const id=getCookie(c,COOKIE),data=await c.req.json(),code=digits(data?.code).trim();
  if(!/^[0-9a-f-]{36}$/i.test(id||'')||!/^\d{4,10}$/.test(code)||!/^[0-9a-f-]{36}$/i.test(binding(c)))return c.json({error:'أدخل رمز التحقق المرسل إلى هاتفك، أو اطلب رمزًا جديدًا.'},400);
  const [pending]=await db.update(schema.phoneChallenges).set({attempts:sql`${schema.phoneChallenges.attempts} + 1`}).where(and(eq(schema.phoneChallenges.id,id),eq(schema.phoneChallenges.binding,hash(binding(c))),gt(schema.phoneChallenges.expires,new Date()),lt(schema.phoneChallenges.attempts,5))).returning();
  if(!pending)return c.json({error:'انتهت مهلة الرمز أو محاولاته. اطلب رمزًا جديدًا.'},400);
  let result;
  try{result=await service().verificationChecks.create({verificationSid:pending.verificationSid,code})}
  catch(error){return providerError(c,error)}
  if(result.status!=='approved'||result.sid!==pending.verificationSid||result.to!==pending.phone)return c.json({error:pending.attempts>=5?'انتهت محاولات الرمز. اطلب رمزًا جديدًا.':'الرمز غير صحيح. راجعه وأعد المحاولة.'},400);
  // Only one concurrent approval can consume a challenge and open access.
  const [consumed]=await db.delete(schema.phoneChallenges).where(and(eq(schema.phoneChallenges.id,id),eq(schema.phoneChallenges.binding,hash(binding(c))),eq(schema.phoneChallenges.verificationSid,pending.verificationSid))).returning({id:schema.phoneChallenges.id});
  if(!consumed)return c.json({error:'استخدمت محاولة التحقق بالفعل. ابدأ الدخول من جديد.'},400);
  const [user]=await db.insert(schema.users).values({id:'phone:'+randomUUID(),name:pending.name||'عميل كركبة',email:'',phone:pending.phone}).onConflictDoUpdate({target:schema.users.phone,set:{last:new Date()}}).returning();
  c.set('user',user);c.set('source','phone');c.set('admin',false);
  if(!await openAppSession(c))return c.json({error:'تعذر فتح الجلسة. أعد تسجيل الدخول.'},400);
  deleteCookie(c,COOKIE,cookieOptions);
  try{await audit(c,'login_success')}catch{}
  return c.json({ok:true});
 });
}
