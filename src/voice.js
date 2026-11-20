import React from 'react';
import htm from 'htm';
import {fetchApi} from './data.js';
const html=htm.bind(React.createElement),{useState:S,useEffect:E,useRef:R}=React;

export function VoiceMessage({message}){
 const[url,setUrl]=S(''),[busy,setBusy]=S(false),[error,setError]=S(''),current=R(''),alive=R(true);
 E(()=>()=>{alive.current=false;if(current.current)URL.revokeObjectURL(current.current)},[]);
 const load=async()=>{setBusy(true);setError('');try{
  const response=await fetchApi('messages/'+encodeURIComponent(message.id)+'/audio');
  if(!response.ok)throw Error((await response.json()).error||'تعذر تحميل التسجيل');
  const blob=await response.blob();if(!alive.current)return;
  const next=URL.createObjectURL(blob);current.current=next;setUrl(next);
 }catch(e){if(alive.current)setError(e.message||'تعذر تحميل الصوت. أعد المحاولة.')}finally{if(alive.current)setBusy(false)}};
 return html`<div className="voice-message">${url?html`<audio controls preload="metadata" src=${url} aria-label="رسالة صوتية"/>`:html`<button type="button" className="bt r" disabled=${busy} onClick=${load}>${busy?'جارٍ تحميل الصوت…':'فتح الرسالة الصوتية · '+(message.audioSeconds||'')+' ثانية'}</button>`}<span className="err" role="alert">${error}</span></div>`;
}
export function VoiceRecorder({uid}){
 const[recording,setRecording]=S(false),[seconds,setSeconds]=S(0),[draft,setDraft]=S(null),[url,setUrl]=S(''),[busy,setBusy]=S(false),[error,setError]=S('');
 const recorder=R(),stream=R(),clock=R(),started=R(0),alive=R(true),requesting=R(false);
 const supported=!!navigator.mediaDevices?.getUserMedia&&typeof MediaRecorder!=='undefined';
 const release=()=>{clearInterval(clock.current);stream.current?.getTracks().forEach(t=>t.stop());stream.current=null};
 const stop=()=>{if(recorder.current?.state==='recording')recorder.current.stop();clearInterval(clock.current)};
 E(()=>{const hide=()=>{if(document.hidden)stop()};document.addEventListener('visibilitychange',hide);return()=>{alive.current=false;stop();release();document.removeEventListener('visibilitychange',hide)}},[]);
 E(()=>{if(!draft){setUrl('');return}const next=URL.createObjectURL(draft.blob);setUrl(next);return()=>URL.revokeObjectURL(next)},[draft]);
 const start=async()=>{
  if(requesting.current)return;requesting.current=true;setBusy(true);setError('');
  try{
   const mic=await navigator.mediaDevices.getUserMedia({audio:true});
   if(!alive.current||document.hidden){mic.getTracks().forEach(t=>t.stop());return}
   stream.current=mic;
   const type=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
   if(!type)throw Error('المتصفح لا يدعم صيغة تسجيل مناسبة. جرّب متصفحًا أحدث.');
   const rec=new MediaRecorder(mic,{mimeType:type,audioBitsPerSecond:64000}),chunks=[];let size=0,tooLarge=false;
   recorder.current=rec;started.current=Date.now();
   rec.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);size+=e.data.size;if(size>2097152){tooLarge=true;stop()}}};
   rec.onerror=()=>{stop();release();if(alive.current){setRecording(false);setError('تعذر التسجيل. تحقق من الميكروفون وأعد المحاولة.')}};
   rec.onstop=()=>{
    release();if(!alive.current)return;setRecording(false);
    const duration=Math.min(60,Math.max(1,Math.ceil((Date.now()-started.current)/1000)));
    if(tooLarge||!size){setError(tooLarge?'التسجيل أكبر من ٢ ميجابايت. سجّل مقطعًا أقصر.':'التسجيل فارغ. أعد المحاولة.');return}
    setDraft({blob:new Blob(chunks,{type}),seconds:duration});setSeconds(duration);
   };
   rec.start(500);setSeconds(0);setRecording(true);
   clock.current=setInterval(()=>{const elapsed=Math.floor((Date.now()-started.current)/1000);if(alive.current)setSeconds(Math.min(elapsed,60));if(elapsed>=60)stop()},250);
  }catch(e){release();if(alive.current)setError(e.name==='NotAllowedError'?'اسمح باستخدام الميكروفون من إعدادات المتصفح، ثم أعد المحاولة.':e.message||'تعذر فتح الميكروفون.')}
  finally{requesting.current=false;if(alive.current)setBusy(false)}
 };
 const send=async()=>{if(!draft||busy)return;setBusy(true);setError('');try{
  const form=new FormData();form.set('audio',draft.blob,'voice');form.set('uid',uid);form.set('seconds',String(draft.seconds));
  const response=await fetchApi('messages/audio',{method:'POST',body:form});
  if(!response.ok)throw Error((await response.json()).error||'تعذر إرسال التسجيل');
  if(alive.current){setDraft(null);setSeconds(0)}window.dispatchEvent(new Event('kk-data'));
 }catch(e){if(alive.current)setError((e.message||'لم يُرسل التسجيل.')+' التسجيل باقٍ هنا لإعادة المحاولة.')}
 finally{if(alive.current)setBusy(false)}};
 return html`<section className="voice-panel gl pad" aria-label="رسالة صوتية"><span className="eyebrow">رسالة صوتية</span><p className="mut sm">سجّل حتى دقيقة، استمع ثم أرسل. التسجيل متاح لك وللإدارة داخل هذه المحادثة.</p>
 ${!supported?html`<p className="mut">التسجيل غير مدعوم هنا. استخدم متصفحًا حديثًا عبر HTTPS أو أرسل رسالة نصية.</p>`:html`
 ${draft&&html`<audio controls src=${url} aria-label="معاينة التسجيل قبل الإرسال"/>`}
 <div className="voice-actions">${recording?html`<button type="button" className="bt recording" onClick=${stop}>إيقاف التسجيل · ${seconds} / 60 ثانية</button>`:draft?html`<button type="button" className="bt" disabled=${busy} onClick=${send}>${busy?'جارٍ إرسال الصوت…':'إرسال التسجيل'}</button><button type="button" className="bt r" disabled=${busy} onClick=${()=>{setDraft(null);setError('')}}>حذف التسجيل</button>`:html`<button type="button" className="bt r" disabled=${busy} onClick=${start}>${busy?'جارٍ فتح الميكروفون…':'بدء تسجيل صوتي'}</button>`}</div>`}
 <p role="alert" className="err">${error}</p><span className="sr-only" role="status">${recording?'التسجيل جارٍ':''}</span></section>`;
}

export function useAssistantVoice(onTranscript){
 const[listening,setListening]=S(false),[speaking,setSpeaking]=S(false),[error,setError]=S(''),[readReplies,setReadReplies]=S(true),[language,setLanguage]=S('ar-SD');
 const recognition=R(),transcript=R(onTranscript),active=R(true);transcript.current=onTranscript;
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 const canListen=!!Recognition,canSpeak='speechSynthesis' in window;
 const stopSpeaking=()=>{if(canSpeak)window.speechSynthesis.cancel();setSpeaking(false)};
 const stopListening=()=>{recognition.current?.stop()};
 E(()=>{const hide=()=>{if(document.hidden){recognition.current?.abort();stopSpeaking()}};document.addEventListener('visibilitychange',hide);return()=>{active.current=false;recognition.current?.abort();if(canSpeak)window.speechSynthesis.cancel();document.removeEventListener('visibilitychange',hide)}},[]);
 const speak=text=>{
  if(!canSpeak||!active.current||document.hidden)return;stopSpeaking();
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang=language;
  const voices=window.speechSynthesis.getVoices();utterance.voice=voices.find(v=>v.lang===language)||voices.find(v=>v.lang.startsWith('ar'))||null;
  utterance.onstart=()=>setSpeaking(true);utterance.onend=()=>setSpeaking(false);utterance.onerror=e=>{setSpeaking(false);if(!['canceled','interrupted'].includes(e.error))setError('تعذر تشغيل الرد الصوتي. يمكنك قراءة الرد هنا.')};
  window.speechSynthesis.speak(utterance);
 };
 const listen=()=>{
  if(!Recognition)return;stopSpeaking();setError('');
  const rec=new Recognition();rec.lang=language;rec.continuous=false;rec.interimResults=true;recognition.current=rec;
  rec.onstart=()=>setListening(true);rec.onend=()=>setListening(false);
  rec.onresult=e=>{const text=Array.from(e.results).map(r=>r[0].transcript).join(' ');transcript.current(text.slice(0,2000))};
  rec.onerror=e=>{setListening(false);if(e.error!=='aborted')setError(e.error==='not-allowed'?'اسمح باستخدام الميكروفون للتحدث مع المساعد.':e.error==='no-speech'?'لم أسمع سؤالًا. أعد المحاولة.':'تعذر تحويل الصوت إلى نص. أعد المحاولة أو اكتب السؤال.')};
  try{rec.start()}catch{setError('تعذر بدء الاستماع. أعد المحاولة.')}
 };
 return {listening,speaking,error,readReplies,setReadReplies,language,setLanguage,canListen,canSpeak,listen,stopListening,speak,stopSpeaking};
}
