import React from 'react';
import {createRoot} from 'react-dom/client';
import htm from 'htm';
import {getUser,login,signup,logout,onAuthChange,handleAuthCallback,requestPasswordRecovery,updateUser,acceptInvite} from '@netlify/identity';
import {db,request} from './data.js';
import {defaultContent} from './content-defaults.js';
import {ContentEditor} from './owner-settings.js';
import {authMessage} from './auth-errors.js';
import {LoginMethods,Passkeys,Activity,Assistant,PrivacyNotice} from './features.js';
import {VoiceRecorder,VoiceMessage} from './voice.js';
import {DevicePermissions,Loyalty} from './device-permissions.js';
import {PhoneLogin} from './phone-login.js';
import {recalledLogin,rememberLogin} from './login-preferences.js';
import {sessionOpened,expireSession,waitForSessionEnd} from './session.js';
const {useState:S,useEffect:E,useRef:R}=React,html=htm.bind(React.createElement);
const VER="2026-11-18-7",ADMIN="mhmdalmndhralnwr100@gmail.com";
window.LOGO='/icon-512.png';
const sec=t=>t?t.seconds:9e9,srt=(a,f)=>Object.assign([...a].sort(f),{loading:a.loading,error:a.error});
const dt=t=>t?new Date(t.seconds*1000).toLocaleString("ar",{dateStyle:"medium",timeStyle:"short"}):"الآن";
const Content=React.createContext(defaultContent);
const useContent=()=>React.useContext(Content);
const SC={"جديد":"#ffc83d","قيد التنفيذ":"#00d4ff","تم":"#25d366","ملغي":"#ff6b81"};
const phone=e=>e||"";
const toast=m=>window.dispatchEvent(new CustomEvent("kk-toast",{detail:m}));
let dip=null;addEventListener("beforeinstallprompt",e=>{e.preventDefault();dip=e;dispatchEvent(new Event("kk-inst"))});
function useQ(mk,deps){const[s,set]=S(()=>Object.assign([],{loading:true}));E(()=>{set(Object.assign([],{loading:true}));const q=mk();return q?q.onSnapshot(x=>set(x.docs.map(d=>({id:d.id,...d.data()}))),err=>set(Object.assign([],{error:err.message}))):undefined},deps);return s}
const queryMessage=rows=>rows.loading?'جارٍ تحميل البيانات…':rows.error||'لا توجد بيانات بعد';
const Chip=({s})=>html`<span className="chip" style=${{background:SC[s]||"#b4b4c8"}}>${s}</span>`;
const Btn=({c,...p})=>html`<button type="button" className=${"bt "+(c||"")} ...${p}/>`;

function Login({done}){
 const {title,whatsapp:WA,call:CALL,facebook:FACEBOOK}=useContent();
 const[method,setMethod]=S('email'),[m,setM]=S('L'),[nm,setNm]=S(''),[email,setEmail]=S(()=>recalledLogin('email')),[pw,setPw]=S(''),[msg,setMsg]=S(''),[busy,setBusy]=S(false),[show,setShow]=S(false);
 const run=async e=>{e.preventDefault();setMsg('');setBusy(true);try{
 await waitForSessionEnd();
 if(m==='F'){await requestPasswordRecovery(email.trim());setMsg('إذا كان البريد مسجلاً فسيصلك رابط استعادة كلمة المرور.');}
 else if(m==='R'){const u=await signup(email.trim(),pw,{full_name:nm.trim()});if(u.confirmedAt)await done();else setMsg('تم إنشاء الحساب. افتح بريدك لتأكيده، ثم سجّل الدخول.');}
 else {await login(email.trim(),pw);rememberLogin('email',email.trim());await done();}
 }catch(err){setMsg(authMessage(err));}finally{setBusy(false)}};
 return html`<main className="wrap c login-page"><header className="login-header"><img className="logo" src=${window.LOGO} alt="شعار مؤسسة كركبة"/><h1 className="h2">أهلاً بك في ${title}</h1><p className="mut">سجّل دخولك وابدأ طلبك</p></header><section className="gl login-card" aria-label="تسجيل الدخول"><div className="tabs login-switch" role="group" aria-label="طريقة الدخول"><button type="button" className=${method==='email'?'a':''} aria-pressed=${method==='email'} onClick=${()=>setMethod('email')}>البريد الإلكتروني</button><button type="button" className=${method==='phone'?'a':''} aria-pressed=${method==='phone'} onClick=${()=>setMethod('phone')}>رقم الهاتف</button></div><div hidden=${method!=='phone'}><${PhoneLogin} done=${done}/></div><div hidden=${method!=='email'}><form className="email-form" onSubmit=${run}><div className="tabs">${[['L','دخول'],['R','حساب جديد'],['F','استعادة الحساب']].map(([key,title])=>html`<button type="button" className=${m===key?'a':''} onClick=${()=>{setM(key);setMsg('')}}>${title}</button>`)}</div>
 ${m==='R'&&html`<label>الاسم<input className="in" required maxLength="100" autoComplete="name" value=${nm} onInput=${e=>setNm(e.target.value)}/></label>`}
 <label>البريد الإلكتروني<input className="in" dir="ltr" type="email" name="username" required autoComplete=${m==='L'?'username':'email'} value=${email} onInput=${e=>setEmail(e.target.value)}/></label>
 ${m!=='F'&&html`<label htmlFor="login-password">كلمة المرور</label><div className="password-field"><input id="login-password" name="password" className="in" dir="ltr" type=${show?'text':'password'} required minLength=${m==='R'?8:undefined} maxLength="128" autoComplete=${m==='R'?'new-password':'current-password'} value=${pw} onInput=${e=>setPw(e.target.value)}/><button type="button" className="password-eye" aria-label=${show?'إخفاء كلمة المرور':'إظهار كلمة المرور'} title=${show?'إخفاء كلمة المرور':'إظهار كلمة المرور'} aria-controls="login-password" aria-pressed=${show} onClick=${()=>setShow(!show)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>${show&&html`<path d="m3 3 18 18"/>`}</svg></button></div>`}
 ${msg&&html`<p role="status" className="mut">${msg}</p>`}<button className="bt" disabled=${busy}>${busy?'جارٍ الإرسال…':m==='R'?'إنشاء الحساب':m==='F'?'إرسال رابط الاستعادة':'دخول'}</button></form></div><div className="login-divider"><span>أو</span></div><${LoginMethods} done=${done}/></section><footer className="login-contact" aria-label="تواصل معنا"><a href=${'https://wa.me/'+WA}>واتساب</a><a href=${'tel:+'+CALL}>اتصال</a><a target="_blank" rel="noopener noreferrer" href=${FACEBOOK}>فيسبوك</a></footer></main>`
}
function PasswordSetup({invite,done}){
 const[p,setP]=S(''),[err,setErr]=S(''),[busy,setBusy]=S(false);
 return html`<main className="wrap"><h1 className="h2">تعيين كلمة المرور</h1><form className="gl pad" onSubmit=${async e=>{e.preventDefault();setBusy(true);setErr('');try{invite?await acceptInvite(invite,p):await updateUser({password:p});done()}catch{setErr('تعذر تعيين كلمة المرور. حاول مجدداً أو اطلب رابطاً جديداً.')}finally{setBusy(false)}}}><label>كلمة مرور جديدة<input className="in" type="password" minLength="8" required autoComplete="new-password" value=${p} onInput=${e=>setP(e.target.value)}/></label><p role="alert">${err}</p><button className="bt" disabled=${busy}>حفظ كلمة المرور</button></form></main>`
}

function Home({go,inst}){const {whatsapp:WA}=useContent();return html`<div>
 <div className="gl hero"><img src=${window.LOGO} alt="مستر كركبة الذئب"/></div>
 <${Btn} onClick=${()=>go("order")}>🛒 اطلب خدمة الآن<//><${Btn} c="g" onClick=${()=>location.href="https://wa.me/"+WA}>💬 تحدث معنا على واتساب<//>
 <div className="grid2"><${Btn} c="r" onClick=${()=>go("svc")}>📋 خدماتنا<//><${Btn} c="r" onClick=${()=>go("ct")}>📞 اتصل بنا<//></div>
 <button type="button" className="gl pad assistant-entry" onClick=${()=>go('ai')}><span className="eyebrow">مساعد كركبة الذكي</span><strong>تحتاج مساعدة في اختيار الخدمة؟</strong><span className="mut">اسأل المساعد ←</span></button>
 ${inst&&html`<${Btn} c="p" onClick=${()=>dip&&dip.prompt()}>📲 ثبّت التطبيق على جوالك<//>`}
 <div className="gl pad"><b>كيف تطلب؟ 3 خطوات بسيطة</b><ol><li>اختر الخدمة التي تريدها.</li><li>اكتب التفاصيل (المبلغ، الرقم...).</li><li>اضغط إرسال لحفظ الطلب، ثم تابعه من حسابك أو تواصل معنا عبر واتساب.</li></ol></div>
 <h2 className="h2">❓ أسئلة شائعة</h2>
 <details className="gl pad"><summary>كم يستغرق التنفيذ؟</summary>غالباً خلال دقائق بعد تأكيد طلبك.</details>
 <details className="gl pad"><summary>هل المعاملات آمنة؟</summary>نعم، نراجع كل عملية قبل التنفيذ وبعده، ونحافظ على خصوصيتك.</details>
 <details className="gl pad"><summary>كيف أطلب؟</summary>اذهب إلى "اطلب الآن"، اختر الخدمة واكتب التفاصيل، ثم اضغط إرسال لحفظ طلبك ومتابعته من حسابك.</details></div>`}

function Svc({pick}){const {title,services:SV}=useContent();return html`<div>
 <div className="gl pad gold"><b className="big">${title} للخدمات الرقمية</b>
 <p className="mut">هل تحتاج إلى خدمات بنكية أو شحن لبطاقاتك الدولية؟ اختر الخدمة وراسلنا لمعرفة التفاصيل.</p><b>نقدم لك خدماتنا الاحترافية:</b></div>
 ${SV.map((s,i)=>html`<button type="button" className="gl pad sv" key=${i} onClick=${()=>pick(i)}><div className="ic" style=${{background:s[2]}}>${s[0]}</div><div><b>✅ ${s[1]}</b><div className="mut">${s[3]}</div></div><span className="go">اطلب ›</span></button>`)}
 <div className="gl pad c"><b>🚀 سرعة في التنفيذ، أمان في المعاملات، ودعم فني متواصل.</b></div></div>`}

function Order({sel,u}){const {services:SV,whatsapp:WA,acceptOrders}=useContent();const[i,setI]=S(sel),[d,setD]=S(""),[e,setE]=S(""),[busy,setBusy]=S(false),[saved,setSaved]=S(null);E(()=>setI(sel),[sel]);
 const send=async()=>{if(busy)return;if(!acceptOrders)return setE('استقبال الطلبات متوقف مؤقتًا. راسل الإدارة.');if(!SV[i])return setE('اختر خدمة متاحة أولاً');if(!d.trim())return setE('اكتب تفاصيل طلبك أولاً');setE('');setBusy(true);try{const order=await db.collection('orders').add({service:SV[i][1],details:d.trim()});setSaved({name:order.name,contact:order.contact,service:order.service,details:order.details});setD('');toast('تم حفظ طلبك، يمكنك متابعة حالته من حسابي');}catch(error){setE(error.message||'لم يُحفظ الطلب. تحقق من اتصالك وأعد المحاولة.')}finally{setBusy(false)}};

 return html`<div><h2 className="h2">اطلب خدمتك</h2><p className="mut">اختر الخدمة واكتب التفاصيل لحفظ طلبك ومتابعة حالته.</p><div className="gl pad">
 <label className="mut" htmlFor="service">1) الخدمة المطلوبة</label><select id="service" className="in" value=${i} onChange=${e=>setI(+e.target.value)}>${SV.map((s,k)=>html`<option key=${k} value=${k}>${s[1]}</option>`)}</select>
 <label className="mut" htmlFor="details">2) تفاصيل طلبك</label><textarea id="details" maxLength="2000" className="in" rows="4" placeholder=${"اكتب: "+(SV[i]?.[4]||"تفاصيل طلبك")} value=${d} onInput=${e=>setD(e.target.value)}/><div className="err" role="alert">${e}</div>
 ${!acceptOrders&&html`<p role="status">استقبال الطلبات متوقف مؤقتًا. يمكنك مراسلة الإدارة.</p>`}<${Btn} c="g" disabled=${busy||!acceptOrders||!SV.length} onClick=${send}>${busy?'جارٍ حفظ الطلب…':'إرسال الطلب وحفظه'}<//><p className="mut">لا ترسل كلمات مرور أو أرقام بطاقات كاملة أو رموز تحقق.</p>${saved&&html`<div role="status" className="gl pad"><b>تم استلام طلبك</b><p>الحساب: ${saved.name} · ${saved.contact}</p><a className="bt g" target="_blank" rel="noopener noreferrer" href=${'https://wa.me/'+WA+'?text='+encodeURIComponent('طلب كركبة للحساب: '+saved.name+' · '+saved.contact+'\nالخدمة: '+saved.service+'\nالتفاصيل: '+saved.details)}>متابعة الطلب عبر واتساب</a></div>`}</div></div>`}

function Chat({u,uid,adm,nm,back}){const ms=srt(useQ(()=>db&&db.collection("messages").where("uid","==",uid),[uid]),(a,b)=>sec(a.t)-sec(b.t)),[t,setT]=S(""),[busy,setBusy]=S(false),[err,setErr]=S(""),bx=R();
 E(()=>{bx.current&&(bx.current.scrollTop=1e9)},[ms.length]);
 const send=async()=>{const v=t.trim();if(!v||busy)return;setBusy(true);setErr('');try{await db.collection('messages').add({uid,text:v});setT('')}catch{setErr('لم تُرسل الرسالة. النص محفوظ هنا لإعادة المحاولة.')}finally{setBusy(false)}};


 return html`<div>${adm&&html`<${Btn} c="r" onClick=${back}>↩️ رجوع للوحة الإدارة<//>`}<h2 className="h2">${adm?"محادثة مع "+nm:"💬 راسل الإدارة (كركبة)"}</h2>
 <div className="chat gl" role="log" aria-live="polite" aria-label="المحادثة" ref=${bx}>${ms.length?ms.map(m=>html`<div key=${m.id} className=${"b"+((adm?m.from==="admin":m.from==="user")?" m":"")}>${m.audioKey?html`<${VoiceMessage} message=${m}/>`:m.text}<small>${m.from==="admin"?"كركبة · ":""}${dt(m.t)}</small></div>`):html`<div className="mut c" style=${{margin:"auto"}}>${ms.loading||ms.error?queryMessage(ms):"ابدأ المحادثة، اكتب رسالتك بالأسفل"}</div>`}</div>
 <p className="err" role="alert">${err}</p><div className="row"><input aria-label="نص الرسالة" maxLength="2000" className="in" placeholder="اكتب رسالتك..." value=${t} onInput=${e=>setT(e.target.value)} onKeyDown=${e=>e.key==="Enter"&&send()}/><${Btn} disabled=${busy} onClick=${send}>${busy?"جارٍ الإرسال…":"إرسال"}<//></div><${VoiceRecorder} key=${uid} uid=${uid}/></div>`}

function Admin({open,settingsSaved}){const[stats,setStats]=S(null),[statsError,setStatsError]=S('');
 E(()=>{let active=true,running=false;const load=async()=>{if(document.hidden||running)return;running=true;try{const data=await request('stats');if(active){setStats(data);setStatsError('')}}catch(e){if(active)setStatsError(e.message)}finally{running=false}};load();const timer=setInterval(load,7000);addEventListener('kk-data',load);document.addEventListener('visibilitychange',load);return()=>{active=false;clearInterval(timer);removeEventListener('kk-data',load);document.removeEventListener('visibilitychange',load)}},[]);
 const[t,setT]=S("u"),us=useQ(()=>db.collection("users"),[]),os=srt(useQ(()=>db.collection("orders"),[]),(a,b)=>sec(b.t)-sec(a.t)),ms=useQ(()=>db.collection("messages").orderBy("t","desc").limit(300),[]);
 const nm=id=>(us.find(x=>x.id===id)||{}).name||"عميل",seen={};
 return html`<div><h2 className="h2">🛡️ لوحة الإدارة، كركبة</h2><section className="gl pad" aria-label="إحصائيات التطبيق"><span className="eyebrow">نظرة عامة</span>${statsError?html`<p className="err" role="alert">تعذر تحديث الأعداد: ${statsError}</p>`:stats?html`<dl><dt>المستخدمون الذين فتحوا التطبيق</dt><dd>${stats.users.toLocaleString('ar')}</dd><dt>إجمالي الطلبات</dt><dd>${stats.orders.toLocaleString('ar')}</dd><dt>الطلبات الجديدة</dt><dd>${stats.pending.toLocaleString('ar')}</dd></dl>`:html`<p role="status">جارٍ تحميل الأعداد…</p>`}<p className="mut sm">الأعداد من جميع سجلات التطبيق. القوائم أدناه تعرض أحدث ٥٠٠ عميل وطلب. الحسابات التي لم تفتح التطبيق لا تدخل في عدد المستخدمين.</p></section><div className="tabs">${[["u","العملاء"],["o","الطلبات"],["m","الرسائل"],["a","النشاط"],["s","الإعدادات والخدمات"]].map(([k,l])=>html`<button key=${k} className=${t===k?"a":""} onClick=${()=>setT(k)}>${l}</button>`)}</div>
 ${t==='a'&&html`<${Activity}/>`}${t==='s'&&html`<${ContentEditor} saved=${settingsSaved}/>`}
 ${t==="u"&&html`<div><div className="gl pad"><b>${us.loading||us.error?queryMessage(us):"العملاء المعروضون: "+us.length}</b></div>${srt(us,(a,b)=>(b.created?b.created.seconds:0)-(a.created?a.created.seconds:0)).map(x=>html`<div className="gl pad" key=${x.id}><b>${x.name||"بدون اسم"}</b><div className="mut" dir="ltr" style=${{textAlign:"right"}}>${x.phone||x.email}</div><div className="mut">انضم: ${dt(x.created)}<br/>آخر نشاط: ${dt(x.last)}</div><${Btn} c="p" onClick=${()=>open(x.id,x.name||"عميل")}>💬 راسله<//></div>`)}</div>`}
 ${t==="o"&&html`<div>${os.length?os.map(o=>html`<div className="gl pad" key=${o.id}><b>${o.service}</b> <${Chip} s=${o.status}/><div className="mut">${o.name} · ${o.contact}<br/>${o.details}<br/>${dt(o.t)}</div><div className="grid2">${["قيد التنفيذ","تم","ملغي"].map(s=>html`<${Btn} c="r" key=${s} onClick=${()=>db.collection("orders").doc(o.id).update({status:s}).then(()=>toast("تم تحديث الحالة")).catch(()=>toast("تعذر تحديث الحالة، أعد المحاولة"))}>${s}<//>`)}</div></div>`):html`<div className="mut">${os.loading||os.error?queryMessage(os):"لا توجد طلبات بعد"}</div>`}</div>`}
 ${t==="m"&&html`<div>${ms.filter(m=>!seen[m.uid]&&(seen[m.uid]=1)).map(m=>html`<button type="button" className="gl pad sv" key=${m.id} onClick=${()=>open(m.uid,nm(m.uid))}><b>${nm(m.uid)}</b><div className="mut">${m.text}</div></button>`)}${ms.length?"":html`<div className="mut">${ms.loading||ms.error?queryMessage(ms):"لا توجد رسائل بعد"}</div>`}</div>`}</div>`}

function Acc({u,ad,go,out,inst,reauth,refresh}){const os=srt(useQ(()=>db&&db.collection("orders").where("uid","==",u.uid),[u.uid]),(a,b)=>sec(b.t)-sec(a.t));
 const sh=()=>{const d={title:"مؤسسة كركبة",text:"خدماتك الرقمية بسرعة وأمان",url:location.origin};navigator.share?navigator.share(d).catch(()=>{}):navigator.clipboard?.writeText(d.url).then(()=>toast("تم نسخ رابط التطبيق")).catch(()=>toast("رابط التطبيق: "+location.origin))};
 return html`<div><h2 className="h2">حسابي</h2><div className="gl pad"><div className="mut">أنت مسجّل دخول باسم:</div><b className="big">${u.displayName||"—"}</b><div className="mut" dir="ltr" style=${{textAlign:"right"}}>${phone(u.phone||u.email)}</div></div>
 <${Loyalty} key=${u.uid} uid=${u.uid}/><div className="gl pad"><b>📦 طلباتي</b>${os.length?os.map(o=>html`<div className="ord" key=${o.id}><b>${o.service}</b> <${Chip} s=${o.status}/><div className="mut">الحساب: ${o.name} · ${o.contact}<br/>${o.details} · ${dt(o.t)}</div></div>`):html`<div className="mut">${os.loading||os.error?queryMessage(os):"لا توجد طلبات بعد، اطلب أول خدمة الآن!"}</div>`}</div>
 ${ad&&html`<${Btn} c="p" onClick=${()=>go("adm")}>🛡️ لوحة الإدارة (العملاء والطلبات)<//>`}
 ${!ad&&u.email?.toLowerCase()===ADMIN&&html`<section className="gl pad"><h3>صلاحية الإدارة</h3><p className="mut">${u.source==='passkey'?'فتح لوحة الإدارة يتطلب تأكيد الدخول بالبريد أو Google.':'الجلسة الحالية لا تحمل دور admin. يضيف مالك المشروع هذا الدور من لوحة Netlify ← Identity ← حساب الإدارة ← Roles، ثم يحفظ.'}</p><p className="mut sm">البريد وحده لا يمنح صلاحية الإدارة.</p></section>`}
 <${Btn} c="r" onClick=${refresh}>تحديث الحساب والصلاحيات<//>
 <${Passkeys} source=${u.source} reauth=${reauth}/>
 <${Btn} c="g" onClick=${sh}>📤 شارك التطبيق مع أصدقائك<//>${inst&&html`<${Btn} onClick=${()=>dip&&dip.prompt()}>📲 ثبّت التطبيق<//>`}<${Btn} c="r" onClick=${out}>تسجيل الخروج<//><div className="mut c">الإصدار ${VER}</div></div>`}

const Ct=()=>{const {whatsapp:WA,call:CALL,email:ADMIN,facebook:FACEBOOK}=useContent();return html`<div><h2 className="h2">اتصل بنا</h2><p className="mut">نحن في خدمتك، اختر الطريقة الأنسب لك.</p>
 <div className="gl pad"><b>🛡️ الإدارة: كركبة</b><div className="mut" dir="ltr" style=${{textAlign:"right"}}>${ADMIN}</div><${Btn} onClick=${()=>location.href="mailto:"+ADMIN}>✉️ راسل الإدارة بالبريد<//></div>
 <${Btn} c="g" onClick=${()=>location.href="https://wa.me/"+WA}>📲 واتساب: +${WA}<//><a className="bt" href=${'tel:+'+CALL}>للمكالمات فقط: +${CALL}</a><a className="bt r" href=${FACEBOOK} target="_blank" rel="noopener noreferrer">صفحتنا على فيسبوك</a><${Btn} c="p" onClick=${()=>location.href="https://tiktok.com/@mhmdaaisiiv"}>🎵 تيك توك @mhmdaaisiiv<//>
 <p className="c"><b>📍 مؤسسة كركبة للخدمات الرقمية، في خدمتك دائماً!</b></p><p className="mut c sm">#كركبة_للخدمات_الرقمية #البنوك_السودانية #شحن_فيزا #ماستركارد #USDT #Starlink #السودان #حلول_مالية</p></div>`};

function Welcome({go,done}){
 const[busy,setBusy]=S(false),[error,setError]=S('');
 const dismiss=async()=>{setBusy(true);setError('');try{await request('me/welcome','POST',{});done()}catch(e){setError(e.message||'تعذر حفظ اختيارك. أعد المحاولة.')}finally{setBusy(false)}};
 return html`<section className="gl pad welcome-guide" aria-label="دليل البداية"><span className="eyebrow">أول مرة في كركبة؟</span><h2>من اختيار الخدمة إلى متابعة طلبك</h2><ol><li><b>اختر خدمتك</b><span>تصفح «الخدمات» واقرأ التفاصيل.</span></li><li><b>أرسل طلبك</b><span>افتح «اطلب الآن»، اكتب التفاصيل واضغط إرسال.</span></li><li><b>تابع وتواصل</b><span>الحالة في «حسابي»، والرسائل النصية والصوتية في «رسائل».</span></li></ol><p className="mut sm">المساعد يشرح لك الخطوات بالنص والصوت. إرسال الطلب يحتاج تأكيدك من صفحة الطلب.</p><div className="voice-actions"><button type="button" className="bt" onClick=${()=>go('ai')}>اشرح لي مع المساعد</button><button type="button" className="bt r" disabled=${busy} onClick=${dismiss}>${busy?'جارٍ الحفظ…':'فهمت، إخفاء الدليل'}</button></div><p className="err" role="alert">${error}</p></section>`;
}
function App(){
 const ownerPath=location.pathname.replace(/\/$/,'')==='/admin';
 const[content,setContent]=S(defaultContent),[contentError,setContentError]=S('');
 const loadContent=async()=>{try{setContent(await request('content'));setContentError('')}catch{setContentError('تعذر تحميل إعدادات التطبيق. أعد المحاولة.')}};
 E(()=>{loadContent();const refresh=()=>{if(!document.hidden)loadContent()};document.addEventListener('visibilitychange',refresh);return()=>document.removeEventListener('visibilitychange',refresh)},[]);
 E(()=>{document.title=content.title+' | الخدمات الرقمية'},[content.title]);
 const[u,setU]=S(undefined),[v,setV]=S(ownerPath?"adm":"home"),[setup,setSetup]=S(null),[upd,setUpd]=S(false),[off,setOff]=S(!navigator.onLine),[ch,setCh]=S(null),[sel,setSel]=S(0),[inst,setInst]=S(!!dip),[tt,setTt]=S("");
 const[obscured,setObscured]=S(document.hidden),[resumeError,setResumeError]=S('');
 const ad=!!u&&u.admin===true;
 const sessionUser=async()=>{const x=await request('me');return {...x,uid:x.id,displayName:x.name||''}};
 const reloadSession=async(options={})=>{try{if(!options.passkey&&!options.phone)await request('session/open','POST',{});sessionOpened();const user=await sessionUser();setU(user);setObscured(document.hidden);setV(ownerPath?'adm':'home');setCh(null)}catch(error){error.sessionError=true;throw error}};
 E(()=>{let active=true,version=0;const sync=async()=>{const current=++version;try{const x=await sessionUser();if(active&&current===version)setU(x)}catch(e){if(active&&current===version){setU(null);if(e.status!==401)toast(e.message)}}};const off=onAuthChange(event=>{if(event==='logout'){version++;setU(null)}else if(event==='user_updated')sync()});(async()=>{try{const callback=await handleAuthCallback();if(callback?.type==='recovery')setSetup({});if(callback?.type==='invite')setSetup({invite:callback.token});if(callback?.user){await reloadSession();return}await getUser();await sync()}catch{toast('تعذر فتح جلسة الحساب. سجّل الدخول من جديد أو اطلب رابطاً جديداً.');if(active)setU(null)}})();return()=>{active=false;off()}},[]);
 const resume=async()=>{if(!u||document.hidden)return;setResumeError('');try{await sessionUser();if(!document.hidden)setObscured(false)}catch(e){setResumeError(e.status===401?'تعذر استعادة الدخول. سجّل الدخول مجدداً.':'تعذر التحقق من الجلسة. تحقق من الاتصال وأعد المحاولة.')}};
 E(()=>{
  if(!u)return;
  const visibility=()=>{if(document.hidden){document.querySelectorAll('audio').forEach(audio=>audio.pause());setObscured(true)}else resume()};
  const pageshow=()=>{if(!document.hidden)resume()};
  document.addEventListener('visibilitychange',visibility);addEventListener('pageshow',pageshow);addEventListener('online',pageshow);
  if(document.hidden)visibility();else resume();
  return()=>{document.removeEventListener('visibilitychange',visibility);removeEventListener('pageshow',pageshow);removeEventListener('online',pageshow)};
 },[u?.id]);
 E(()=>{if(u===undefined)return;request('visits','POST',{page:setup?'account_setup':u?v:'login'}).catch(()=>{})},[u===undefined,u?.id,v,!!setup]);
 E(()=>{const expired=()=>{setU(null);setSetup(null);setV('home');setCh(null);toast('انتهت الجلسة. سجّل الدخول من جديد.')};addEventListener('kk-session-expired',expired);return()=>removeEventListener('kk-session-expired',expired)},[]);
 E(()=>{const f=(n,fn)=>(addEventListener(n,fn),()=>removeEventListener(n,fn)),a=[f("kk-inst",()=>setInst(true)),f("online",()=>setOff(false)),f("offline",()=>setOff(true)),f("kk-toast",e=>{setTt(e.detail);setTimeout(()=>setTt(""),2600)})];return()=>a.forEach(x=>x())},[]);
 E(()=>{if(!('serviceWorker' in navigator))return;const controlled=!!navigator.serviceWorker.controller;const changed=()=>{if(controlled)setUpd(true)};navigator.serviceWorker.addEventListener('controllerchange',changed);navigator.serviceWorker.register('/sw.js').catch(()=>{});return()=>navigator.serviceWorker.removeEventListener('controllerchange',changed)},[]);
 const out=async()=>{setU(null);setSetup(null);setV('home');setCh(null);await expireSession()};
 const refreshAccess=async()=>{try{const user=await sessionUser();setU(user);toast(user.admin?'صلاحية الإدارة مفعّلة. افتح لوحة الإدارة من حسابي.':'تم تحديث الحساب. لا توجد صلاحية إدارة في هذه الجلسة.')}catch(e){toast(e.message)}};
 const reauth=()=>{out()};
 const go=k=>{if(k==="chat"){return ad?setV("adm"):(setCh({uid:u.uid}),setV("chat"))}setV(k)};
 let body;
 if(setup)body=html`<${PasswordSetup} invite=${setup.invite} done=${()=>{setSetup(null);reloadSession().catch(()=>toast('أعد تسجيل الدخول لإكمال إعداد الحساب'))}}/>`;
 else if(u===undefined)body=html`<div className="wrap c"><img className="logo" src=${window.LOGO} alt="شعار كركبة"/><p role="status">جارٍ فتح التطبيق…</p></div>`;
 else if(!u)body=html`${ownerPath&&html`<header className="wrap owner-banner"><span className="eyebrow">مساحة العمل</span><h1>إدارة كركبة</h1><p className="mut">سجّل الدخول بحساب يحمل صلاحية الإدارة لإدارة الخدمات والطلبات والرد على العملاء.</p></header>`}<${Login} done=${reloadSession}/>`;
 else if(ownerPath&&!ad)body=html`<main className="wrap"><h1>الوصول للإدارة</h1><p>حسابك لا يحمل صلاحية الإدارة، أو يحتاج تأكيد الدخول بالبريد أو Google.</p><p className="mut">يمنح مالك المشروع دور admin من لوحة Netlify ← Identity ← الحساب ← Roles. البريد وحده لا يمنح صلاحية.</p><button className="bt" onClick=${refreshAccess}>تحديث الصلاحيات</button><button className="bt r" onClick=${reauth}>الدخول بحساب الإدارة</button><a className="bt r" href="/">العودة للتطبيق</a></main>`;

 else{const P={home:html`<${Home} go=${go} inst=${inst}/>`,svc:html`<${Svc} pick=${i=>{setSel(i);setV("order")}}/>`,order:html`<${Order} sel=${sel} u=${u}/>`,chat:ch&&html`<${Chat} key=${ch.uid} u=${u} uid=${ch.uid} adm=${ch.adm} nm=${ch.nm} back=${()=>setV("adm")}/>`,adm:ad&&html`<${Admin} settingsSaved=${setContent} open=${(uid,nm)=>{setCh({uid,adm:1,nm});setV("chat")}}/>`,acc:html`<${Acc} u=${u} ad=${ad} go=${go} out=${out} inst=${inst} reauth=${reauth} refresh=${refreshAccess}/>`,ai:html`<${Assistant} go=${go}/>`,ct:html`<${Ct}/>`};
  body=html`<div className=${'wrap'+(ownerPath?' owner-workspace':'')}>${ad&&html`<a className="bt r" href="/admin">لوحة المالك · الإعدادات والعملاء والطلبات</a>`}${content.announcement&&html`<aside className="gl pad gold" role="status">${content.announcement}</aside>`}<p className="hi">أهلاً ${(u.displayName||"بك").split(" ")[0]} 👋</p>${u.welcomeNeeded&&!ownerPath&&html`<${Welcome} go=${go} done=${()=>setU(x=>({...x,welcomeNeeded:false}))}/>`}${!ownerPath&&html`<${DevicePermissions} key=${u.uid} uid=${u.uid}/>`}${P[v]||P.home}</div>
  <nav className="nav gl">${[["home","🏠","الرئيسية"],["svc","📋","الخدمات"],["order","🛒","اطلب الآن"],["chat","💬","رسائل"],["acc","👤","حسابي"]].map(([k,i,l])=>html`<button key=${k} aria-current=${(v===k||(k==="chat"&&v==="adm"))?"page":undefined} className=${(v===k||(k==="chat"&&v==="adm"))?"a":""} onClick=${()=>go(k)}><b>${i}</b>${l}</button>`)}</nav>`}
 return html`<${Content.Provider} value=${content}><div>${contentError&&html`<div className="off" role="alert">${contentError}<button type="button" onClick=${loadContent}>إعادة المحاولة</button></div>`}${off&&html`<div className="off">لا يوجد اتصال بالإنترنت. يمكنك تصفح الواجهة، ويتطلب إرسال الطلبات والرسائل عودة الاتصال.</div>`}
 ${upd&&html`<div className="upd gl" role="alert"><b>🔄 يوجد تحديث جديد للتطبيق</b><div className="mut">اضغط الزر ليتحدث التطبيق فوراً.</div><${Btn} onClick=${()=>location.replace(location.pathname+"?v="+Date.now())}>حدّث الآن<//></div>`}
 <div className="privacy-wrap"><${PrivacyNotice}/></div><div inert=${!!u&&obscured} aria-hidden=${!!u&&obscured} className=${u&&obscured?'session-concealed':''}>${body}</div>${u&&obscured&&html`<div className="session-curtain" role="status"><img src=${window.LOGO} width="88" height="88" alt="كركبة"/><h2>جلستك محمية</h2><p>${resumeError||'جارٍ التحقق من الجلسة…'}</p>${resumeError&&html`<button type="button" className="bt" onClick=${resume}>إعادة المحاولة</button><button type="button" className="bt r" onClick=${out}>تسجيل الخروج</button>`}</div>`}${tt&&html`<div className="toast" role="status">${tt}</div>`}</div><//>`}
createRoot(document.getElementById("root")).render(html`<${App}/>`);
