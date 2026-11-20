import {randomUUID} from 'node:crypto';
import {getStore} from '@netlify/blobs';
import {and,eq} from 'drizzle-orm';
import {db,schema} from '../../db/client.mjs';
import {clean,rate} from './security.mjs';

const store=()=>getStore({name:'private-voice-messages',consistency:'strong'});
const types=new Set(['audio/webm','audio/ogg','audio/mp4']);
const signature=(bytes,type)=>type==='audio/webm'?bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])):type==='audio/ogg'?bytes.subarray(0,4).toString()==='OggS':bytes.subarray(4,8).toString()==='ftyp';
export function voiceRoutes(app){
 app.post('/api/messages/audio',async c=>{
  const u=c.get('user'),admin=c.get('admin');
  if(!await rate(c,'voice-upload',30,3600,u.id))return c.json({error:'بلغت حد الرسائل الصوتية لهذه الساعة. يمكنك إرسال نص.'},429);
  const form=await c.req.formData(),file=form.get('audio'),seconds=Number(form.get('seconds'));
  const uid=admin?clean(form.get('uid'),100):u.id;
  if(!file||typeof file.arrayBuffer!=='function'||!file.size||file.size>2097152||!Number.isFinite(seconds)||seconds<1||seconds>60||!uid)return c.json({error:'سجّل مقطعًا من ثانية إلى دقيقة، بحجم لا يتجاوز ٢ ميجابايت'},400);
  const type=file.type.split(';')[0].toLowerCase();
  if(!types.has(type))return c.json({error:'صيغة التسجيل غير مدعومة. جرّب متصفحًا حديثًا.'},400);
  const bytes=Buffer.from(await file.arrayBuffer());
  if(!signature(bytes,type))return c.json({error:'ملف الصوت غير صحيح. أعد التسجيل.'},400);
  const [target]=await db.select({id:schema.users.id}).from(schema.users).where(eq(schema.users.id,uid)).limit(1);
  if(!target)return c.json({error:'المحادثة غير موجودة'},404);
  const id=randomUUID(),key='messages/'+id;
  await store().set(key,bytes);
  try{
   await db.insert(schema.messages).values({id,uid,from:admin?'admin':'user',name:admin?'كركبة':clean(u.user_metadata?.full_name||u.name,100)||u.email,text:'رسالة صوتية',audioKey:key,audioType:type,audioSeconds:Math.ceil(seconds)});
  }catch(error){await store().delete(key).catch(()=>{});throw error}
  return c.json({id},201);
 });
 app.get('/api/messages/:id/audio',async c=>{
  const id=c.req.param('id');
  if(!/^[0-9a-f-]{36}$/i.test(id))return c.notFound();
  const conditions=[eq(schema.messages.id,id)];
  if(!c.get('admin'))conditions.push(eq(schema.messages.uid,c.get('user').id));
  const [row]=await db.select().from(schema.messages).where(and(...conditions)).limit(1);
  if(!row?.audioKey||!types.has(row.audioType))return c.json({error:'التسجيل غير موجود أو غير متاح لهذا الحساب'},404);
  const audio=await store().get(row.audioKey,{type:'arrayBuffer'});
  if(!audio)return c.json({error:'تعذر تحميل التسجيل. أعد المحاولة.'},404);
  c.header('Content-Type',row.audioType);c.header('X-Content-Type-Options','nosniff');
  c.header('Content-Disposition','inline; filename="voice-message"');
  return c.body(audio);
 });
}
