// Device-only form preferences; never store passwords, codes, or sessions here.
const keys={email:'kk_login_email',phone:'kk_login_phone',country:'kk_login_country'};
export function recalledLogin(field){
 try{
  const entry=document.cookie.split('; ').find(value=>value.startsWith(keys[field]+'='));
  return entry?decodeURIComponent(entry.slice(entry.indexOf('=')+1)):'';
 }catch{return ''}
}
export function rememberLogin(field,value){
 try{
  document.cookie=keys[field]+'='+encodeURIComponent(value)+'; Path=/; Max-Age=31536000; SameSite=Strict'+(location.protocol==='https:'?'; Secure':'');
 }catch{/* Login still works when browser preferences are blocked. */}
}
