// Shared, side-effect-free validation for CMD Hosting provisioning.
import {resolve,relative,isAbsolute,sep} from "node:path";

export function safeGameId(value){
 const n=Number(value);
 if(!Number.isSafeInteger(n)||n<1||!(/^\d+$/.test(String(value))))throw Error("Invalid game catalogue ID");
 return n;
}
export function relativeSafePath(p){
 if(typeof p!=="string"||p.length>500||!p||p.includes("\0"))return false;
 const t=p.replaceAll("\\","/");
 if(t.startsWith("/")||/^[a-zA-Z]:/.test(t)||t.split("/").some(x=>!x||x===".."||x==="."))return false;
 return true;
}
export function contained(root,target){
 const rel=relative(resolve(root),resolve(target));
 return rel!==""&&!rel.startsWith(".."+sep)&&rel!==".."&&!isAbsolute(rel);
}
export function matchGlob(rule,path){
 if(!relativeSafePath(rule)||!relativeSafePath(path))return false;
 // Case-insensitive matching follows common Windows game-server configuration conventions.
 let rx="^",s=rule.replaceAll("\\","/");
 for(let i=0;i<s.length;i++){
  const ch=s[i];
  if(ch==="*"){
   if(s[i+1]==="*"){rx+=".*";i++}else rx+="[^/]*";
  }else if(ch==="?")rx+="[^/]";
  else rx+=/[\\^$+?.()|[\]{}]/.test(ch)?"\\"+ch:ch;
 }
 return new RegExp(rx+"$","i").test(path.replaceAll("\\","/"));
}
export function excluded(path){
 const segments=String(path).replaceAll("\\","/").toLowerCase().split("/");
 const skip=new Set(["steamapps","node_modules",".git","cache","backups","backup","logs","crashdumps"]);
 return segments.some(x=>skip.has(x)||/secret|password|token|credential/.test(x)) ||
        segments.at(-1)==="auth.json"||segments.at(-1)?.startsWith(".env")||/\.(pem|pfx|p12|key)$/i.test(path);
}
export function formatAllowed(path,formats){
 if(excluded(path))return false;
 const base=String(path).toLowerCase();
 return formats.some(ext=>base.endsWith(String(ext).toLowerCase()));
}
export function safeStem(text){
 const s=String(text||"").replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,50);
 if(!s||s==="."||s==="..")throw Error("Unsafe output name");
 return s;
}