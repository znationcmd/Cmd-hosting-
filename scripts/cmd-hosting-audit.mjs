// CMD Hosting public, read-only smoke audit. No credentials, purchases or state-changing calls.
import { writeFileSync } from "node:fs";

const TARGETS = [
  ["site", "https://cmd-hosting-web-production.up.railway.app", [
    "/", "/api/catalog", "/api/client/readiness", "/api/auth/me",
    "/api/oauth/providers", "/api/auth/providers", "/api/account/linked",
    "/api/game-library", "/api/mods", "/api/mods/access", "/api/mods/discover",
    "/auth/steam", "/api/auth/steam", "/manifest.webmanifest", "/sw.js",
    "/favicon.ico", "/hosting-ui.js", "/catalog-ui.js", "/catalog-compat.js",
    "/console-ui.js", "/rentals-ui.js", "/wallet-ui.js", "/customer-ui.js",
    "/customer-onboard-ui.js", "/account-ui.js", "/game-install-ui.js",
    "/game-switch-ui.js", "/mod-v2-ui.js", "/mod-auto-detect.js",
    "/profile-donations.js"
  ]],
  ["mods", "https://cmd-hosting-mods-api-production.up.railway.app", [
    "/mods", "/api/mods/status", "/api/preproduction/status",
    "/api/preproduction/nintendo", "/api/preproduction/games?search=Minecraft"
  ]]
];
const out = { date:new Date().toISOString(), tests:[], buttons:[], referencedScripts:[], warning:[] };
const isOk = n=>n>=200&&n<400;
async function probe(group, base, path) {
  const url=base+path;
  const start=Date.now();
  try {
    const response=await fetch(url,{method:"GET",redirect:"follow",signal:AbortSignal.timeout(18000),headers:{"user-agent":"CMDHosting-ReadOnly-Audit/1.0"}});
    const contentType=response.headers.get("content-type")||"";
    const txt=await response.text();
    const record={group,path,status:response.status,ok:isOk(response.status),ms:Date.now()-start,type:contentType,bytes:txt.length};
    if(path==="/"||path==="/mods"){
      const buttons=[...txt.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)]
        .map(x=>x[1].replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,90))
        .filter(Boolean);
      out.buttons.push({group,path,total:buttons.length,labels:buttons.slice(0,100)});
      const scriptSrc=[...txt.matchAll(/<script[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(x=>x[1]);
      out.referencedScripts.push({group,path,scripts:scriptSrc.slice(0,100)});
    }
    if(path.endsWith(".js") && response.ok && /javascript|text\/plain|octet-stream/.test(contentType)){
      try { new Function(txt); record.syntax="ok"; }
      catch(e){ record.syntax="failed"; record.syntaxError=String(e).slice(0,150); }
    }
    out.tests.push(record);
    console.log("CHECK "+JSON.stringify(record));
    return record;
  }catch(error){
    const record={group,path,status:null,ok:false,ms:Date.now()-start,error:String(error).slice(0,180)};
    out.tests.push(record);
    console.log("CHECK "+JSON.stringify(record));
    return record;
  }
}
for(const [group,base,paths] of TARGETS){
  for(const path of paths) await probe(group,base,path);
}
for(const section of out.buttons) console.log("BUTTONS "+JSON.stringify(section));
for(const section of out.referencedScripts) console.log("SCRIPTS "+JSON.stringify(section));
const critical=out.tests.filter(t=>[
  "site:/", "site:/api/catalog", "site:/hosting-ui.js", "site:/catalog-ui.js",
  "mods:/mods", "mods:/api/mods/status"
].includes(t.group+":"+t.path)&&!t.ok);
out.summary={checks:out.tests.length,successful:out.tests.filter(t=>t.ok).length,unexpectedHttp:out.tests.filter(t=>t.status>=400).length,criticalFailures:critical.length};
console.log("SUMMARY "+JSON.stringify(out.summary));
writeFileSync("cmd-hosting-audit-results.json",JSON.stringify(out,null,2));
if(critical.length) process.exitCode=1;
