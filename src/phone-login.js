import React from 'react';
import htm from 'htm';
import {logout} from '@netlify/identity';
import {request} from './data.js';
import {recalledLogin,rememberLogin} from './login-preferences.js';
import {sessionOpened,waitForSessionEnd} from './session.js';
const html=htm.bind(React.createElement),{useState:S,useEffect:E}=React;
const countries=[['SD','السودان','+249','09XXXXXXXX'],['EG','مصر','+20','01XXXXXXXXX'],['SA','السعودية','+966','05XXXXXXXX'],['DZ','الجزائر','+213','0XXXXXXXXX']];

export function PhoneLogin({done}){
 const[country,setCountry]=S(()=>countries.some(([key])=>key===recalledLogin('country'))?recalledLogin('country'):'SD'),[phone,setPhone]=S(()=>recalledLogin('phone')),[name,setName]=S(''),[code,setCode]=S(''),[pending,setPending]=S(false),[busy,setBusy]=S(false),[error,setError]=S(''),[settings,setSettings]=S(null),[deadline,setDeadline]=S(0),[remaining,setRemaining]=S(0);
 const load=async()=>{setSettings(null);try{const result=await request('phone/settings');setSettings(result.enabled)}catch{setSettings('error')}};
 E(()=>{load()},[]);
 E(()=>{const tick=()=>setRemaining(Math.max(0,Math.ceil((deadline-Date.now())/1000)));tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer)},[deadline]);
 const send=async e=>{
  e?.preventDefault();if(busy||remaining||settings!==true)return;setBusy(true);setError('');
  try{
   await waitForSessionEnd();await logout();await request('logout','POST',{});
   const result=await request('phone/start','POST',{country,phone,name});
   setPending(true);setCode('');setDeadline(Date.now()+result.retryAfter*1000);
  }catch(e){if(e.status===429)setDeadline(Date.now()+60000);setError(e.message||'تعذر طلب رمز التحقق. أعد المحاولة.')}
  finally{setBusy(false)}
 };
 const verify=async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{
  await request('phone/verify','POST',{code});rememberLogin('phone',phone.trim());rememberLogin('country',country);sessionOpened();await done({phone:true});
 }catch(e){setError(e.message||'تعذر تأكيد الرمز. أعد المحاولة.')}finally{setBusy(false)}};
 return html`<section className="gl pad phone-login" aria-labelledby="phone-heading"><h2 id="phone-heading" className="sr-only">الدخول أو التسجيل بالهاتف</h2><p className="mut sm phone-intro">دخول أو حساب جديد برمز SMS</p>
 ${settings===null?html`<p role="status" className="mut">جارٍ التحقق من توفر الدخول بالهاتف…</p>`:settings==='error'?html`<p className="err" role="alert">تعذر التحقق من توفر الخدمة.</p><button type="button" className="bt r" onClick=${load}>إعادة المحاولة</button>`:pending?html`
 <form onSubmit=${verify}><p className="mut" role="status">طلبنا إرسال رمز إلى <b dir="ltr">${phone}</b>. قد يتأخر وصوله قليلًا. لا تشارك الرمز مع أحد.</p><label>رمز التحقق<input className="in otp-code" dir="ltr" required inputMode="numeric" autoComplete="one-time-code" minLength="4" maxLength="10" value=${code} onInput=${e=>setCode(e.target.value.replace(/[^0-9٠-٩۰-۹]/g,''))}/></label><button className="bt" disabled=${busy||code.length<4}>${busy?'جارٍ التحقق…':'تأكيد الرمز والدخول'}</button></form><div className="voice-actions"><button type="button" className="bt r" disabled=${busy||remaining>0} onClick=${send}>${remaining?'إعادة الإرسال بعد '+remaining+' ثانية':'إعادة إرسال الرمز'}</button><button type="button" className="bt r" disabled=${busy} onClick=${()=>{setPending(false);setCode('');setError('')}}>تغيير الرقم</button></div>`:html`
 <form onSubmit=${send}>${settings===false&&html`<p role="status" className="mut">إرسال SMS غير مفعّل حاليًا. استخدم Google أو البريد.</p><button type="button" className="bt r" onClick=${load}>إعادة التحقق</button>`}<label>البلد<select className="in" value=${country} disabled=${busy} onChange=${e=>setCountry(e.target.value)}>${countries.map(([key,label,prefix])=>html`<option key=${key} value=${key}>${label} (${prefix})</option>`)}</select></label><label>رقم الجوال<input className="in" dir="ltr" type="tel" required autoComplete="tel" maxLength="40" disabled=${busy} placeholder=${countries.find(x=>x[0]===country)[3]} value=${phone} onInput=${e=>setPhone(e.target.value)}/></label><details className="phone-options"><summary>اسم الحساب وتفاصيل الدخول</summary><p className="mut sm">حساب الهاتف مستقل عن Google والبريد.</p><label>الاسم للحساب الجديد <span className="mut sm">(اختياري)</span><input className="in" autoComplete="name" maxLength="100" disabled=${busy} value=${name} onInput=${e=>setName(e.target.value)}/></label></details><p className="mut sm">بالمتابعة توافق على استلام رمز تحقق لرقمك.</p><button className="bt" disabled=${settings!==true||busy||remaining>0||!phone.trim()}>${settings!==true?'إرسال الرمز غير مفعّل حاليًا':busy?'جارٍ طلب الرمز…':remaining?'يمكن طلب رمز بعد '+remaining+' ثانية':'إرسال رمز SMS'}</button></form>`}
 <p className="err" role="alert">${error}</p></section>`;
}
