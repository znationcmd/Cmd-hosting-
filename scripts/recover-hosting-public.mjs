#!/usr/bin/env node
/**
 * CMD Hosting — public frontend snapshot, read-only.
 * No auth, cookies, API routes, private data, secrets or state-changing calls.
 * This is NOT a backup of Bun/Railway server functions or database.
 * Output is a temporary CI artifact only; never commit the snapshot itself.
 */
import {createHash} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve,join,dirname,sep} from "node:path";

const ORIGIN="https://cmd-hosting-web-production.up.railway.app";
const OUTPUT=resolve(process.env.CMD_PUBLIC_SNAPSHOT_DIR||"recovery-public-only");
const KNOWN=[
 "/", "/hosting-ui.js", "/catalog-ui.js", "/catalog-compat.js",
 "/console-ui.js", "/rentals-ui.js", "/wallet-ui.js", "/customer-ui.js",
 "/customer-onboard-ui.js", "/game-install-ui.js", "/game-switch-ui.js",
 "/mod-v2-ui.js", "/mod-auto-detect.js", "/mod-explorer.js",
 "/mod-manager.js", "/account-ui.js", "/profile-donations.js",
 "/manifest.webmanifest", "/sw.js", "/favicon.ico"
];
const MAX_FILE=4*1024*1024,MAX_TOTAL=40*1024*1024,MAX_FILES=60;
let total=0;const manifest={purpose:"unauthenticated-public-frontend-only",origin:ORIGIN,
 exportedAt:new Date().toISOString(),backendSourceRecovered:false,
 secretsExported:false,loginAttempted:false,items:[],errors:[]};
function isAsset(value){
 try{
  const u=new URL(value,ORIGIN);
  const base=new URL(ORIGIN);
  if(u.origin!==base.origin||!["http:","https:"].includes(u.protocol))return false;
  if(u.username||u.password||u.pathname.includes("..")||u.pathname.startsWith("/api/"))return false;
  if(u.pathname==="/")return true;
  return /^\/[a-zA-Z0-9_./-]+\.(?:js|css|webmanifest|png|ico|svg|webp|jpg|jpeg)$/.test(u.pathname);
 }catch{return false}
}
function discover(html){
 const out=[];
 for(const match of html.matchAll(/<(?:script|link)\b[^>]*>/gi)){
  const tag=match[0],m=/\b(?:src|href)\s*=\s*["']([^"']+)["']/i.exec(tag);
  if(!m)continue;
  if(/^<link/i.test(tag)&&!/\brel\s*=\s*["'](?:stylesheet|icon|manifest|modulepreload)["']/i.test(tag))continue;
  if(isAsset(m[1]))out.push(new URL(m[1],ORIGIN).pathname);
 }
 return [...new Set(out)];
}
if(process.argv.includes("--self-test")){
 if(!isAsset("/hosting-ui.js")||isAsset("/api/auth/me")||isAsset("https://evil.example/x.js")
    ||isAsset("/../../api/secret.js")||!discover('<script src="/catalog-ui.js"></script>').includes("/catalog-ui.js"))
  throw Error("unsafe snapshot URL rule");
 console.log("Public asset URL safety tests passed");process.exit(0);
}
function contentAccepted(path,type){
 if(path==="/")return type.includes("text/html");
 if(path.endsWith(".js"))return type.includes("javascript")||type.includes("text/plain");
 if(path.endsWith(".css"))return type.includes("text/css");
 if(path.endsWith(".webmanifest"))return type.includes("json")||type.includes("manifest");
 return /image\/(png|jpeg|webp|svg\+xml|x-icon|vnd.microsoft.icon)|application\/octet-stream/.test(type);
}
const pending=[...KNOWN],visited=new Set();
await mkdir(OUTPUT,{recursive:true});
while(pending.length&&visited.size<MAX_FILES){
 const path=pending.shift();
 if(!isAsset(path)||visited.has(path))continue;
 visited.add(path);
 const started=Date.now();
 try{
  const res=await fetch(ORIGIN+path,{method:"GET",redirect:"manual",
   headers:{"accept":"text/html,text/css,application/javascript,image/*","user-agent":"CMD-Hosting-Public-Frontend-Recovery/1.0"},
   signal:AbortSignal.timeout(16000)});
  const type=(res.headers.get("content-type")||"").toLowerCase();
  if(!res.ok||res.status>=300||!contentAccepted(path,type))throw Error("unavailable status="+res.status+" content-type="+type);
  const declared=Number(res.headers.get("content-length")||0);
  if(declared>MAX_FILE)throw Error("size-limit");
  const bytes=Buffer.from(await res.arrayBuffer());
  if(bytes.length>MAX_FILE||total+bytes.length>MAX_TOTAL)throw Error("size-limit");
  const file=path==="/"
   ? "index.html"
   : path.replace(/^\/+/,"");
  const target=resolve(OUTPUT,file);
  if(!target.startsWith(OUTPUT+sep))throw Error("invalid-output-path");
  await mkdir(dirname(target),{recursive:true});
  await writeFile(target,bytes);
  total+=bytes.length;
  const digest=createHash("sha256").update(bytes).digest("hex");
  manifest.items.push({path,file,bytes:bytes.length,sha256:digest,contentType:type,
   elapsedMs:Date.now()-started});
  console.log("CAPTURED "+JSON.stringify({path,bytes:bytes.length,sha256:digest}));
  if(path==="/"){
   const extra=discover(bytes.toString("utf8"));
   for(const p of extra)if(!visited.has(p)&&!pending.includes(p))pending.push(p);
  }
 }catch(e){
  manifest.errors.push({path,error:String(e?.message||e).slice(0,140)});
  console.log("SKIPPED "+JSON.stringify({path,error:String(e?.message||e).slice(0,140)}));
 }
}
manifest.summary={downloaded:manifest.items.length,missing:manifest.errors.length,
 totalBytes:total,siteHomeRetrieved:manifest.items.some(x=>x.path==="/")};
await writeFile(join(OUTPUT,"manifest.json"),JSON.stringify(manifest,null,2));
console.log("SNAPSHOT "+JSON.stringify(manifest.summary));
if(!manifest.summary.siteHomeRetrieved)process.exitCode=1;
