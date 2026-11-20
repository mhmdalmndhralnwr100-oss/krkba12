import React from 'react';
import htm from 'htm';
import {db,request} from './data.js';
const html=htm.bind(React.createElement);
const {useState,useEffect,useRef}=React;
export function DevicePermissions({uid}){
 const [notification,setNotification]=useState(()=>('Notification' in window?Notification.permission:'unsupported'));
 const [location,setLocation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const previous=useRef(null);
 useEffect(()=>{
  let active=true;
  previous.current=null;
  const unsubscribe=db.collection('orders').where('uid','==',uid).onSnapshot(snapshot=>{
   const rows=snapshot.docs.map(d=>d.data()),old=previous.current;
   previous.current=new Map(rows.map(o=>[o.id,o.status]));
   if(!old||!('Notification' in window)||Notification.permission!=='granted')return;
   if(!rows.some(o=>old.has(o.id)&&old.get(o.id)!==o.status))return;
   // Keep account and order details off the device lock screen.
   navigator.serviceWorker?.getRegistration().then(reg=>{
    if(active&&!document.hidden&&reg)return reg.showNotification('كركبة',{body:'تغيّرت حالة أحد طلباتك. افتح حسابي للاطلاع.',icon:'/icon-192.png',tag:'order-status'});
   }).catch(()=>{});
  },()=>{});
  return()=>{active=false;unsubscribe()};
 },[uid]);
 const notify=async()=>{setError('');try{setNotification(await Notification.requestPermission())}catch{setError('تعذر طلب الإشعارات. راجع إعدادات المتصفح.')}};
 const locate=()=>{
  setError('');if(!navigator.geolocation){setError('الموقع غير مدعوم في هذا المتصفح.');return}
  setBusy(true);
  navigator.geolocation.getCurrentPosition(()=>{setBusy(false);setLocation('تم السماح بالموقع والتحقق منه. لا نحفظ إحداثياتك أو نرسلها.');},e=>{setBusy(false);setError(e.code===1?'لم تسمح بالموقع. يمكنك تغييره من إعدادات الموقع في المتصفح.':'تعذر تحديد موقعك. فعّل خدمة الموقع وأعد المحاولة.');},{enableHighAccuracy:false,timeout:12000,maximumAge:60000});
 };
 return html`<details className="gl pad" open><summary>أذونات التطبيق · اختيارية</summary><p className="mut sm">اسمح بالإشعارات لمعرفة تغيّر حالة الطلب أثناء فتح التطبيق. لا تصل إشعارات عند إغلاقه حاليًا. يمكنك السماح بالموقع؛ لا يُحفظ ولا يُرسل. يمكنك استخدام الخدمات دون الأذونات.</p><button type="button" className="bt r" disabled=${notification!=='default'} onClick=${notify}>${notification==='granted'?'الإشعارات مسموحة':notification==='denied'?'الإشعارات محظورة؛ غيّرها من إعدادات المتصفح':notification==='unsupported'?'الإشعارات غير مدعومة هنا':'السماح بالإشعارات'}</button><button type="button" className="bt r" disabled=${busy} onClick=${locate}>${busy?'جارٍ تحديد الموقع…':'السماح بالموقع'}</button><p className="mut sm">على iPhone قد تتطلب الإشعارات تثبيت التطبيق على الشاشة الرئيسية أولًا.</p><p role="status">${location}</p><p className="err" role="alert">${error}</p></details>`;
}
export function Loyalty({uid}){
 const [data,setData]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;const load=()=>{if(document.hidden)return;request('loyalty').then(x=>{if(active){setData(x);setError('')}}).catch(e=>{if(active)setError(e.message)})};load();const timer=setInterval(load,7000);window.addEventListener('kk-data',load);document.addEventListener('visibilitychange',load);return()=>{active=false;clearInterval(timer);window.removeEventListener('kk-data',load);document.removeEventListener('visibilitychange',load)}},[uid]);
 return html`<section className="gl pad gold" aria-label="نقاطي"><span className="eyebrow">تقدّمك مع كركبة</span><h3>نقاطي: ${data?data.points.toLocaleString('ar'):'…'}</h3><p>${data?data.completed.toLocaleString('ar')+' طلب مكتمل':'جارٍ تحميل النقاط…'}</p><p className="mut sm">١٠ نقاط لكل طلب حالته «تم»، وتشمل الطلبات السابقة. النقاط للعرض فقط ولا تُستبدل بخصم. إذا أُعيد فتح الطلب أو أُلغي تُزال نقاطه حتى يكتمل مجددًا.</p><p role="alert" className="err">${error}</p></section>`;
}
