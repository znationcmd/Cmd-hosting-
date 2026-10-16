/**
 * CMD Hosting Cloud Agents — Railway cloud-side coordination API.
 * Never executes local Windows commands, launches a game or modifies an existing game file.
 * Other CMD Hosting services and bots are deliberately untouched.
 */
import { SQL } from "bun";
import { timingSafeEqual, createHash, randomBytes } from "node:crypto";

const PORT = Number(Bun.env.PORT || 3000);
const VERSION = "2.1.0";
const MAIN = "https://cmd-hosting-web-production.up.railway.app";
const MODS = "https://cmd-hosting-mods-api-production.up.railway.app";
const token = Bun.env.CMD_CLOUD_AGENT_TOKEN || "";
const dbUrl = Bun.env.CMD_CLOUD_DATABASE_URL || "";
const sql = dbUrl ? new SQL(dbUrl, {max:2, connect_timeout:8, idle_timeout:5}) : null;
let schemaPromise;

const headers = {"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer"};
function send(data, status=200) { return new Response(JSON.stringify(data),{status,headers}); }
function auth(request) {
  const supplied = request.headers.get("authorization") || "";
  const expected = "Bearer " + token;
  const left=Buffer.from(supplied); const right=Buffer.from(expected);
  return !!token && left.length===right.length && timingSafeEqual(left,right);
}

/* CMD_SCOPED_MACHINE_AUTH_V1: one-time codes, 24h validity, machine-specific monitoring credentials. */
function bearer(req){
 const value=req.headers.get("authorization")||"";
 return value.startsWith("Bearer ")?value.slice(7):"";
}
async function machineAuth(req){
 const key=bearer(req);
 if(!/^[A-Za-z0-9_-]{32,128}$/.test(key))return null;
 const hash=createHash("sha256").update(key).digest("hex");
 try{
  const db=await dbReady();
  const existing=await db`SELECT agent_id FROM cmd_hosting_cloud_machine_tokens
    WHERE token_hash=${hash} AND disabled_at IS NULL LIMIT 1`;
  return existing[0]?.agent_id||null;
 }catch{return null}
}
async function enrollmentSchema(db){
 await db`CREATE TABLE IF NOT EXISTS cmd_hosting_cloud_enroll_codes(
   code_hash CHAR(64) PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ, claimed_by VARCHAR(80))`;
 await db`CREATE TABLE IF NOT EXISTS cmd_hosting_cloud_machine_tokens(
   agent_id VARCHAR(80) PRIMARY KEY,token_hash CHAR(64) NOT NULL UNIQUE,
   issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),disabled_at TIMESTAMPTZ)`;
}
function validId(id) { return typeof id==="string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,79}$/.test(id); }
function clampInt(v,max) {return Number.isInteger(v) && v>=0 && v<=max ? v : 0;}
function safeString(s,max=80) {return typeof s==="string" ? s.slice(0,max) : "";}
async function dbReady() {
  if(!sql) throw new Error("database_not_configured");
  if(!schemaPromise) {
    schemaPromise=sql`CREATE TABLE IF NOT EXISTS cmd_hosting_cloud_agents (
      agent_id VARCHAR(80) PRIMARY KEY,
      agent_role VARCHAR(16) NOT NULL,
      agent_version VARCHAR(80) NOT NULL,
      server_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`.catch(e=>{schemaPromise=null; throw e});
  }
  await schemaPromise;
  return sql;
}
async function check(name,url) {
  const started=Date.now();
  try{
    const response=await fetch(url,{method:"GET",signal:AbortSignal.timeout(6000),headers:{"accept":"application/json,text/html"}});
    return {service:name,online:response.ok,statusCode:response.status,latencyMs:Date.now()-started};
  }catch(e){return {service:name,online:false,statusCode:null,error:"unreachable"};}
}

/* CMD_MAP_SELECTION_V1 — game-isolated maps. No service download or game install claimed. */
const GAME_MAPS={
 "dayz":{platforms:["pc"],defaultMap:"chernarusplus",items:[
  ["chernarusplus","Chernarus+","dayzOffline.chernarusplus"],
  ["livonia","Livonia","dayzOffline.enoch"],
  ["sakhal","Sakhal","dayzOffline.sakhal"],
  ["nasdara","Nasdara — Badlands","dayzOffline.nasdara"]],modProvider:"steam-workshop"},
 "ark-asa":{platforms:["pc","crossplay"],defaultMap:"the-island",items:[
  ["the-island","The Island","TheIsland_WP"],
  ["the-center","The Center","TheCenter_WP"],
  ["scorched-earth","Scorched Earth","ScorchedEarth_WP"],
  ["aberration","Aberration","Aberration_WP"],
  ["extinction","Extinction","Extinction_WP"],
  ["ragnarok","Ragnarok","Ragnarok_WP"],
  ["valguero","Valguero","Valguero_WP"],
  ["genesis-part-1","Genesis Part 1","Genesis_WP"],
  ["astraeos","Astraeos","Astraeos_WP"],
  ["lost-colony","Lost Colony","LostColony_WP"]],modProvider:"curseforge-asa"},
 "arma-reforger":{platforms:["pc","crossplay"],defaultMap:"everon-conflict",items:[
  ["everon-conflict","Everon Conflict","{ECC61978EDCC2B5A}Missions/23_Campaign.conf"],
  ["everon-gm","Everon Game Master","{59AD59368755F41A}Missions/21_GM_Eden.conf"],
  ["arland-gm","Arland Game Master","{2BBBE828037C6F4B}Missions/22_GM_Arland.conf"]],modProvider:"bohemia-workshop"},
 "7dtd":{platforms:["pc"],defaultMap:"navezgane",items:[
  ["navezgane","Navezgane","Navezgane"],
  ["random-world","Random World","RWG"]],modProvider:"publisher-review"}
};
function normalizeGameKey(key){
 const aliases={"ark":"ark-asa","ark-survival-ascended":"ark-asa","dayz-pc":"dayz",
  "reforger":"arma-reforger","7-days-to-die":"7dtd"};
 const v=String(key||"").trim().toLowerCase();
 return aliases[v]||v;
}
function validRentalContent(game,platform,mapId,modIds){
 const key=normalizeGameKey(game),profile=GAME_MAPS[key];
 if(!profile||!profile.platforms.includes(String(platform||"pc").toLowerCase()))return null;
 const map=profile.items.find(x=>x[0]===(mapId||profile.defaultMap));
 if(!map||!Array.isArray(modIds)||modIds.length>100)return null;
 const mods=[...new Set(modIds.map(x=>String(x)))];
 for(const id of mods){
   if(profile.modProvider==="bohemia-workshop"){
     if(!/^[0-9A-Fa-f]{16}$/.test(id))return null;
   }else if(profile.modProvider==="publisher-review"){
     if(mods.length)return null;
   }else if(!/^[1-9][0-9]{0,12}$/.test(id))return null;
 }
 if(map[0]==="astraeos"&&!mods.length)return null;
 return {key,mapId:map[0],mapName:map[1],value:map[2],mods,
   publisherDlcRequired:["sakhal","nasdara","lost-colony"].includes(map[0]),
   publisherModRequired:map[0]==="astraeos"};
}


/* CMD_LONG_LIFE_TOKEN_V1 — multi-year, hashed, account-scoped API tokens.
   Only trusted backend may issue/revoke/rotate. No secrets in logs/listings.
   No token is authorized to change game servers, payments, mods or files.
*/
const LONG_LIFE_SCOPES=["account:read","services:read","rentals:read"];
const LONG_LIFE_YEARS=[1,3,5,10];
async function longLifeDb(){
 const db=await dbReady();
 await db`CREATE TABLE IF NOT EXISTS cmd_hosting_long_life_tokens (
  id TEXT PRIMARY KEY,
  account_id VARCHAR(100) NOT NULL,
  label VARCHAR(80) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  token_prefix VARCHAR(24) NOT NULL,
  scopes TEXT[] NOT NULL,
  service_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
 )`;
 return db;
}
function longLifeMeta(x){
 return {id:x.id,accountId:x.account_id,label:x.label,
   scopes:x.scopes,serviceId:x.service_id,createdAt:x.created_at,
   expiresAt:x.expires_at,lastUsedAt:x.last_used_at||null,
   revoked:x.revoked_at!==null,prefix:x.token_prefix};
}
function validateLongLifeInput(v){
 if(!v||typeof v!=="object"||Array.isArray(v))return null;
 const accountId=typeof v.accountId==="string"?v.accountId.trim():"";
 const label=typeof v.label==="string"?v.label.trim():"";
 const years=v.years,scopes=v.scopes;
 const serviceId=v.serviceId===null||v.serviceId===undefined?null:String(v.serviceId);
 if(!/^[a-zA-Z0-9._-]{1,100}$/.test(accountId)
   ||label.length<1||label.length>80||/[\u0000-\u001F\u007F]/.test(label)
   ||!LONG_LIFE_YEARS.includes(years)
   ||!Array.isArray(scopes)||!scopes.length||scopes.length>LONG_LIFE_SCOPES.length
   ||!scopes.every(x=>LONG_LIFE_SCOPES.includes(x))
   ||new Set(scopes).size!==scopes.length
   ||(serviceId!==null&&!/^[a-zA-Z0-9._-]{1,100}$/.test(serviceId)))return null;
 return {accountId,label,years,scopes,serviceId};
}
async function getLongLife(request){
 const presented=bearer(request);
 if(!/^cmd_llt_[A-Za-z0-9_-]{48}$/.test(presented))return null;
 const hashed=createHash("sha256").update(presented).digest("hex");
 try{
  const db=await longLifeDb();
  const rows=await db`SELECT id,account_id,label,token_prefix,scopes,service_id,
    created_at,expires_at,last_used_at,revoked_at
    FROM cmd_hosting_long_life_tokens
    WHERE token_hash=${hashed} AND revoked_at IS NULL AND expires_at>NOW() LIMIT 1`;
  return rows[0]||null;
 }catch(e){console.error("CMD_LONG_LIFE_AUTH_UNAVAILABLE");return null}
}


/* FILE_VERIFICATION_V1 — only an authenticated host reports a completed official validation. */
function fileVerificationReason(value,appId,now=Date.now()){
 if(!value||value.schema!=="cmd-hosting/steam-validation-v1")return "missing_validation_receipt";
 if(value.appId!==appId)return "wrong_game_manifest";
 if(value.steamValidated!==true||value.manifestStateFlags!==4)return "steam_validation_incomplete";
 if(typeof value.buildId!=="string"||!/^[1-9][0-9]*$/.test(value.buildId))return "invalid_build";
 if(typeof value.manifestSha256!=="string"||!/^[0-9a-f]{64}$/i.test(value.manifestSha256))return "missing_manifest_digest";
 if(!Number.isSafeInteger(value.fileCount)||value.fileCount<2||!Number.isSafeInteger(value.totalBytes)||value.totalBytes<=0)return "empty_installation";
 const timestamp=Date.parse(value.validatedAt);
 if(!Number.isFinite(timestamp)||timestamp>now+300000||timestamp<now-3600000)return "stale_validation";
 if(value.serverReady!==false||value.gameStarted!==false)return "runtime_not_verified";
 return null;
}
/* END_FILE_VERIFICATION_V1 */

async function route(request) {
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{"allow":"GET, POST, OPTIONS"}});
  const path=new URL(request.url).pathname;
  if(path==="/health" || path==="/"){
    if(request.method!=="GET")return send({error:"method_not_allowed"},405);
    return send({ok:true,service:"CMD Hosting Cloud Agents",version:VERSION,cloud:true,
      databaseConfigured:!!sql,agentAuthConfigured:!!token,
      role:"monitoring_and_agent_coordination",localWindowsAgentStillNeeded:true});
  }

  // Public downloadable copy of the newest approved Windows mods agent.
  // GitHub is pinned to this reviewed commit, never a moving main branch.
  if(path==="/downloads/mods-agent-v4.1.ps1") {
    if(request.method!=="GET") return send({error:"method_not_allowed"},405);
    try {
      const upstream=await fetch("https://raw.githubusercontent.com/znationcmd/Cmd-hosting-/37f079bb842aaf208cb7d8ce0c390a62aa6cb502/scripts/cmd-hosting-mods-agent-v4.ps1",{
        headers:{"accept":"text/plain"},signal:AbortSignal.timeout(12000)
      });
      if(!upstream.ok)throw Error("upstream_unavailable");
      const body=await upstream.text();
      if(body.length<25000||body.length>40000||!body.includes("CMD Hosting Windows Mods Agent V4")||
         !body.includes("function InstallArma3Mod(")||!body.includes("/v1/agents/heartbeat"))throw Error("invalid_script");
      return new Response(body,{status:200,headers:{
        "content-type":"text/plain; charset=utf-8",
        "content-disposition":"attachment; filename=cmd-hosting-mods-agent-v4.1.ps1",
        "cache-control":"public, max-age=600",
        "x-content-type-options":"nosniff"
      }});
    } catch(e) { return send({error:"download_unavailable"},503); }
  }
  if(path==="/downloads/versions.json") {
    if(request.method!=="GET")return send({error:"method_not_allowed"},405);
    return send({cloud:"2.1.0",rentalWorker:"2.1.0",fileValidationRequired:true,rentalWorkerURL:"https://cmd-hosting-cloud-agents-production.up.railway.app/downloads/rental-worker-v2.ps1",modsAgent:"4.1.0",modsAgentURL:
      "https://cmd-hosting-cloud-agents-production.up.railway.app/downloads/mods-agent-v4.1.ps1",
      windowsAutoUpdater:"1.2",mainAgent:"V5 (installed version not remotely verified)",
      offlinePCRequiresLocalStartup:true});
  }
  if(path==="/downloads/game-content.ps1"||path==="/downloads/rental-worker-v2.ps1"){
    if(request.method!=="GET")return send({error:"method_not_allowed"},405);
    const file=path.endsWith("game-content.ps1")?"Configure-CMDGameContent.ps1":"CMDHostingRentalWorkerV2.ps1";
    try{
      const result=await fetch("https://raw.githubusercontent.com/znationcmd/Cmd-hosting-/7e06435c1029e25363333f2dca9dc1b62e016a98/scripts/"+file,{signal:AbortSignal.timeout(12000)});
      if(!result.ok)throw Error("download_unavailable");
      const body=await result.text();
      if(body.length<1000||body.length>60000||!body.includes("#requires -version 5.1"))throw Error("invalid_script");
      return new Response(body,{headers:{"content-type":"text/plain; charset=utf-8","cache-control":"public, max-age=600","x-content-type-options":"nosniff"}});
    }catch{return send({error:"verified_script_unavailable"},503)}
  }
  if(path==="/downloads/game-installer.ps1") {
    if(request.method!=="GET")return send({error:"method_not_allowed"},405);
    try {
      const upstream=await fetch("https://raw.githubusercontent.com/znationcmd/Cmd-hosting-/7e06435c1029e25363333f2dca9dc1b62e016a98/scripts/Install-CMDGameServer.ps1",
       {signal:AbortSignal.timeout(12000)});
      if(!upstream.ok)throw new Error("upstream");
      const script=await upstream.text();
      if(script.length<4000||script.length>16000||!script.includes("AcceptPublisherTerms")||!script.includes("steamcmd.exe"))throw new Error("invalid_script");
      return new Response(script,{status:200,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"public, max-age=600","x-content-type-options":"nosniff"}});
    }catch(e){return send({error:"installer_download_unavailable"},503)}
  }


  if(path==="/v1/provisioning/maps"){
    if(request.method!=="GET")return send({error:"method_not_allowed"},405);
    const uri=new URL(request.url);
    const gameKey=normalizeGameKey(uri.searchParams.get("game"));
    const platform=String(uri.searchParams.get("platform")||"pc").toLowerCase();
    const profile=GAME_MAPS[gameKey];
    if(!profile)return send({ok:false,error:"game_not_supported",maps:[]},404);
    if(!profile.platforms.includes(platform))
      return send({ok:false,error:"provider_required_for_platform",gameKey,maps:[]},422);
    return send({ok:true,gameKey,platform,defaultMap:profile.defaultMap,
      modProvider:profile.modProvider,
      maps:profile.items.map(([id,name,gameValue])=>({id,name,gameValue,
        requiresPublisherContent:id==="astraeos",
        requiresDlc:["sakhal","nasdara","lost-colony"].includes(id)})),
      note:"Only game-specific map choices; availability depends on publisher content and the installation on the host."});
  }
  if(path==="/v1/agents/enroll/claim"){
    if(request.method!=="POST")return send({error:"method_not_allowed"},405);
    const raw=await request.text();if(raw.length>1024)return send({error:"body_too_large"},413);
    let v;try{v=JSON.parse(raw)}catch{return send({error:"invalid_json"},400)}
    const id=v?.agentId,code=v?.code;
    if(!validId(id)||typeof code!=="string"||!/^[A-Za-z0-9_-]{32,128}$/.test(code))
      return send({error:"invalid_enrollment"},400);
    const hash=createHash("sha256").update(code).digest("hex");
    try{
      const db=await dbReady();
      await enrollmentSchema(db);
      // A one-time code cannot take over an already registered device ID.
      const existing=await db`SELECT agent_id FROM cmd_hosting_cloud_machine_tokens
        WHERE agent_id=${id} LIMIT 1`;
      if(existing.length)return send({error:"machine_already_enrolled"},409);
      const claimed=await db`UPDATE cmd_hosting_cloud_enroll_codes
        SET used_at=NOW(),claimed_by=${id}
        WHERE code_hash=${hash} AND used_at IS NULL AND expires_at>NOW()
        RETURNING code_hash`;
      if(!claimed.length)return send({error:"enrollment_code_invalid_or_used"},403);
      const secret=randomBytes(32).toString("base64url");
      const secretHash=createHash("sha256").update(secret).digest("hex");
      await db`INSERT INTO cmd_hosting_cloud_machine_tokens(agent_id,token_hash)
         VALUES(${id},${secretHash})`;
      return send({ok:true,agentId:id,machineToken:secret,scope:"monitoring_only",
        expiresCodeAfterClaim:true,gameInstallPermission:false,remoteShellPermission:false});
    }catch(e){console.error("CMD_HOST_ENROLL_ERROR",String(e?.message||e).slice(0,100));return send({error:"enrollment_unavailable"},503)}
  }

  /* Long-life token introspection and scoped rentals are authenticated by their
     own API secret, never by the cloud agent's master or Windows pairing token. */
  if(["/v1/tokens/me","/v1/tokens/account","/v1/tokens/services",
      "/v1/tokens/rentals"].includes(path)){
    if(request.method!=="GET")return send({error:"method_not_allowed"},405);
    const owner=await getLongLife(request);
    if(!owner)return send({error:"invalid_or_expired_api_token"},401);
    if(path==="/v1/tokens/me")return send({ok:true,token:longLifeMeta(owner),tokenSecretVisible:false});
    const required=path==="/v1/tokens/rentals"?"rentals:read":
      path==="/v1/tokens/services"?"services:read":"account:read";
    if(!owner.scopes.includes(required))return send({error:"insufficient_token_scope"},403);
    try{
      const db=await dbReady();
      if(path==="/v1/tokens/account"){
        return send({ok:true,accountId:owner.account_id,scope:required,
          serviceId:owner.service_id,access:"read_only"});
      }
      if(path==="/v1/tokens/services"){
        const services=await db`SELECT l.id::text AS game_id,l.game_key,l.platform,l.slots
          FROM cmd_hosting_game_library l
          WHERE l.account_id::text=${owner.account_id}
            AND (${owner.service_id}::text IS NULL OR l.id::text=${owner.service_id})
          ORDER BY l.id DESC LIMIT 100`;
        return send({ok:true,accountId:owner.account_id,scope:required,services,
          note:"Catalogue et configurations du compte; ne prouve pas que les serveurs sont démarrés."});
      }
      const rentals=await db`SELECT r.game_id::text AS game_id,
        l.game_key,l.platform,r.payment_state,r.paid_until
        FROM cmd_hosting_rentals r
        JOIN cmd_hosting_game_library l
          ON l.id=r.game_id AND l.account_id=r.account_id
        WHERE r.account_id::text=${owner.account_id}
          AND (${owner.service_id}::text IS NULL OR r.game_id::text=${owner.service_id})
        ORDER BY r.updated_at DESC LIMIT 50`;
      void db`UPDATE cmd_hosting_long_life_tokens SET last_used_at=NOW()
        WHERE id=${owner.id} AND revoked_at IS NULL`.catch(()=>{});
      return send({ok:true,accountId:owner.account_id,
        serviceId:owner.service_id,scope:required,rentals});
    }catch(e){console.error("CMD_LONG_LIFE_SCOPED_READ_ERROR");
      return send({error:"account_data_unavailable"},503)}
  }
  const master=auth(request);
  const scoped=master?null:
    (path==="/v1/agents/manifest"||path==="/v1/agents/heartbeat"||
     path==="/v1/provisioning/agent/claim"||path==="/v1/provisioning/agent/report")?await machineAuth(request):null;
  if(!master&&!scoped)return send({error:"unauthorized"},401);


  /* Admin backend issues keys; site must proxy requests after authenticating
     the real user and checking account ownership. Not a public signup endpoint. */
  if(path==="/v1/tokens/long-life" ||
     path==="/v1/tokens/long-life/revoke" ||
     path==="/v1/tokens/long-life/rotate"){
    if(!master)return send({error:"admin_backend_only"},403);
    if(path==="/v1/tokens/long-life" && request.method==="GET"){
      const url=new URL(request.url),accountId=url.searchParams.get("accountId")||"";
      if(!/^[A-Za-z0-9._-]{1,100}$/.test(accountId))return send({error:"invalid_account_id"},400);
      try{
        const db=await longLifeDb();
        const rows=await db`SELECT id,account_id,label,token_prefix,scopes,
          service_id,created_at,expires_at,last_used_at,revoked_at
          FROM cmd_hosting_long_life_tokens WHERE account_id=${accountId}
          ORDER BY created_at DESC LIMIT 50`;
        return send({ok:true,accountId,tokens:rows.map(longLifeMeta)});
      }catch(e){console.error("CMD_LONG_LIFE_LIST_ERROR");return send({error:"token_store_unavailable"},503)}
    }
    if(request.method!=="POST")return send({error:"method_not_allowed"},405);
    const body=await request.text();
    if(body.length>2048)return send({error:"body_too_large"},413);
    let input;try{input=JSON.parse(body)}catch{return send({error:"invalid_json"},400)}
    try{
      const db=await longLifeDb();
      if(path==="/v1/tokens/long-life"){
        const v=validateLongLifeInput(input);
        if(!v)return send({error:"invalid_token_request"},400);
        const accountExists=await db`SELECT 1 FROM cmd_hosting_game_library
          WHERE account_id::text=${v.accountId} LIMIT 1`;
        if(!accountExists.length)return send({error:"account_has_no_known_services"},404);
        if(v.serviceId){
          const owned=await db`SELECT 1 FROM cmd_hosting_game_library
             WHERE account_id::text=${v.accountId} AND id::text=${v.serviceId} LIMIT 1`;
          if(!owned.length)return send({error:"service_not_owned"},404);
        }
        const active=await db`SELECT COUNT(*)::int AS count FROM cmd_hosting_long_life_tokens
          WHERE account_id=${v.accountId} AND revoked_at IS NULL AND expires_at>NOW()`;
        if(Number(active[0]?.count)>=20)return send({error:"active_token_limit"},429);
        const raw="cmd_llt_"+randomBytes(36).toString("base64url");
        const hash=createHash("sha256").update(raw).digest("hex");
        const prefix=raw.slice(0,18);
        const id=crypto.randomUUID();
        const safeScopes="{"+v.scopes.join(",")+"}";
        const created=await db`INSERT INTO cmd_hosting_long_life_tokens
          (id,account_id,label,token_hash,token_prefix,scopes,service_id,expires_at)
          VALUES(${id},${v.accountId},${v.label},${hash},${prefix},${safeScopes},
             ${v.serviceId},NOW()+make_interval(years=>${v.years}))
          RETURNING id,account_id,label,token_prefix,scopes,service_id,
            created_at,expires_at,last_used_at,revoked_at`;
        return send({ok:true,token:longLifeMeta(created[0]),
          accessToken:raw,showOnlyOnce:true,notice:"Conserver cette clé en lieu sûr. Impossible de la réafficher."},201);
      }
      const accountId=String(input?.accountId||""),id=String(input?.id||"");
      if(!/^[a-zA-Z0-9._-]{1,100}$/.test(accountId) ||
         !/^[0-9a-f-]{36}$/.test(id))return send({error:"invalid_token_id"},400);
      if(path.endsWith("/revoke")){
        const done=await db`UPDATE cmd_hosting_long_life_tokens
          SET revoked_at=NOW()
          WHERE id=${id} AND account_id=${accountId} AND revoked_at IS NULL
          RETURNING id`;
        return done.length?send({ok:true,revoked:true,id}):
          send({error:"token_not_active"},404);
      }
      // Rotation preserves account, scopes, expiry and service restriction;
      // old token stops working immediately after the atomic UPDATE.
      const raw="cmd_llt_"+randomBytes(36).toString("base64url");
      const hashed=createHash("sha256").update(raw).digest("hex");
      const prefix=raw.slice(0,18);
      const changed=await db`UPDATE cmd_hosting_long_life_tokens
        SET token_hash=${hashed},token_prefix=${prefix},last_used_at=NULL
        WHERE id=${id} AND account_id=${accountId}
          AND revoked_at IS NULL AND expires_at>NOW()
        RETURNING id,account_id,label,token_prefix,scopes,service_id,
           created_at,expires_at,last_used_at,revoked_at`;
      return changed.length?send({ok:true,token:longLifeMeta(changed[0]),
        accessToken:raw,showOnlyOnce:true,previousKeyInvalidated:true}):
        send({error:"token_not_active"},404);
    }catch(e){console.error("CMD_LONG_LIFE_STORE_ERROR",String(e?.message||"unavailable").slice(0,80));
      return send({error:"token_store_unavailable"},503)}
  }

  if(path==="/v1/agents/enroll/create"){
    if(!master)return send({error:"admin_only"},403);
    if(request.method!=="POST")return send({error:"method_not_allowed"},405);
    try{
      const db=await dbReady();await enrollmentSchema(db);
      const code=randomBytes(24).toString("base64url");
      const hash=createHash("sha256").update(code).digest("hex");
      await db`INSERT INTO cmd_hosting_cloud_enroll_codes(code_hash,expires_at)
        VALUES(${hash},NOW()+interval '24 hours')`;
      return send({ok:true,code,validForHours:24,singleUse:true,
        note:"Private enrollment code. Share only with the administrator of the future rented host."});
    }catch(e){console.error("CMD_ENROLL_CREATE_ERROR",String(e?.message||e).slice(0,100));return send({error:"enrollment_unavailable"},503)}
  }
  if(path==="/v1/agents/enroll/revoke"){
    if(!master)return send({error:"admin_only"},403);
    if(request.method!=="POST")return send({error:"method_not_allowed"},405);
    let data;try{data=await request.json()}catch{return send({error:"invalid_json"},400)}
    if(!validId(data?.agentId))return send({error:"invalid_agent"},400);
    try{
      const db=await dbReady();await enrollmentSchema(db);
      const revoked=await db`UPDATE cmd_hosting_cloud_machine_tokens
        SET disabled_at=NOW() WHERE agent_id=${data.agentId} AND disabled_at IS NULL
        RETURNING agent_id`;
      return send({ok:true,revoked:revoked.length>0});
    }catch{return send({error:"enrollment_unavailable"},503)}
  }

  /* Set map and mods only through a trusted backend with rental ownership checks. */
  if(path==="/v1/provisioning/content/select"){
    if(!master)return send({error:"admin_backend_only"},403);
    if(request.method!=="POST")return send({error:"method_not_allowed"},405);
    const raw=await request.text();
    if(raw.length>4096)return send({error:"body_too_large"},413);
    let data;try{data=JSON.parse(raw)}catch{return send({error:"invalid_json"},400)}
    const gameId=String(data.gameId||""),accountId=String(data.accountId||"");
    if(!/^[a-zA-Z0-9._-]{1,80}$/.test(gameId)||!/^[a-zA-Z0-9._-]{1,80}$/.test(accountId))
      return send({error:"invalid_rental_identity"},400);
    try{
      const db=await dbReady();
      const owned=await db`SELECT game_key,platform FROM cmd_hosting_game_library
        WHERE id::text=${gameId} AND account_id::text=${accountId} LIMIT 1`;
      if(!owned.length)return send({error:"rental_not_owned"},404);
      const platform=String(owned[0].platform||"pc").toLowerCase();
      const normalized=validRentalContent(owned[0].game_key,platform,data.mapId,data.modIds||[]);
      if(!normalized)return send({error:"incompatible_game_map_or_mod"},422);
      if(normalized.publisherDlcRequired && data.publisherEntitlementApproved!==true)
        return send({error:"publisher_entitlement_required"},422);
      if(normalized.publisherModRequired && data.publisherModApproved!==true)
        return send({error:"map_mod_entitlement_required"},422);
      const tasksExist=await db`SELECT to_regclass('public.cmd_hosting_provision_tasks') AS name`;
      if(tasksExist[0]?.name){
        const existing=await db`SELECT id FROM cmd_hosting_provision_tasks
          WHERE game_id=${gameId} AND account_id=${accountId}
          AND status IN ('leased','binaries_installed','content_prepared') LIMIT 1`;
        if(existing.length)return send({error:"server_content_updates_need_backup_workflow"},409);
      }
      await db`CREATE TABLE IF NOT EXISTS cmd_hosting_rental_content_prefs(
        game_id TEXT NOT NULL, account_id TEXT NOT NULL, map_id TEXT NOT NULL,
        mod_ids TEXT[] NOT NULL DEFAULT '{}'::text[],
        publisher_approved BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (game_id,account_id)
      )`;
      await db`INSERT INTO cmd_hosting_rental_content_prefs
        (game_id,account_id,map_id,mod_ids,publisher_approved)
        VALUES(${gameId},${accountId},${normalized.mapId},${normalized.mods},${data.publisherEntitlementApproved===true||data.publisherModApproved===true})
        ON CONFLICT(game_id,account_id) DO UPDATE SET map_id=EXCLUDED.map_id,
          mod_ids=EXCLUDED.mod_ids,publisher_approved=EXCLUDED.publisher_approved,updated_at=NOW()`;
      return send({ok:true,gameId,gameKey:normalized.key,platform,
        mapId:normalized.mapId,modIds:normalized.mods,installationStarted:false});
    }catch(e){console.error("CMD_CONTENT_SELECTION_ERROR",String(e?.message||e).slice(0,140));
      return send({error:"content_selection_unavailable"},503)}
  }

  /* Installation rights are separate from the read-only monitoring token. */
  if(path==="/v1/provisioning/worker/authorize" || path==="/v1/provisioning/worker/revoke"){
    if(!master)return send({error:"admin_only"},403);
    if(request.method!=="POST")return send({error:"method_not_allowed"},405);
    let input;try{input=await request.json()}catch{return send({error:"invalid_json"},400)}
    const agentId=input?.agentId,nodeId=input?.nodeId;
    if(!validId(agentId)||typeof nodeId!=="string"||!/^[-A-Za-z0-9._:]{3,110}$/.test(nodeId))
      return send({error:"invalid_worker_mapping"},400);
    try{
      const db=await dbReady();
      await enrollmentSchema(db);
      const exists=await db`SELECT 1 FROM cmd_hosting_cloud_machine_tokens
        WHERE agent_id=${agentId} AND disabled_at IS NULL LIMIT 1`;
      if(!exists.length)return send({error:"machine_not_enrolled"},409);
      const target=await db`SELECT 1 FROM cmd_hosting_pc_nodes WHERE node_id::text=${nodeId}
         UNION SELECT 1 FROM cmd_hosting_cloud_agents
         WHERE agent_id=${nodeId} AND agent_role='host' LIMIT 1`;
      if(!target.length)return send({error:"target_machine_unknown"},404);
      await db`CREATE TABLE IF NOT EXISTS cmd_hosting_provision_worker_permissions(
        agent_id VARCHAR(80) PRIMARY KEY,node_id TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT FALSE,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      const enabled=path.endsWith("/authorize");
      await db`INSERT INTO cmd_hosting_provision_worker_permissions(agent_id,node_id,enabled)
        VALUES(${agentId},${nodeId},${enabled})
        ON CONFLICT(agent_id) DO UPDATE SET node_id=EXCLUDED.node_id,
          enabled=EXCLUDED.enabled,updated_at=NOW()`;
      return send({ok:true,agentId,nodeId,workerAuthorized:enabled,
        allowed:"verified_paid_pc_rentals_only",publisherLicenseStillRequired:true});
    }catch(e){console.error("CMD_WORKER_PERMISSION_ERROR",String(e?.message||e).slice(0,100));
      return send({error:"authorization_database_error"},503)}
  }
  if(path==="/v1/services"){
    if(request.method!=="GET")return send({error:"method_not_allowed"},405);
    const services=await Promise.all([
      check("cmd-hosting-web",MAIN+"/"),
      check("cmd-hosting-mods-api",MODS+"/api/mods/status")
    ]);
    return send({ok:services.every(x=>x.online),checkedAt:new Date().toISOString(),services});
  }
  if(path==="/v1/agents/manifest"){
    if(request.method!=="GET")return send({error:"method_not_allowed"},405);
    return send({version:VERSION,heartbeatIntervalSeconds:600,offlineAfterSeconds:1500,
      cloudHeartbeatEndpoint:"/v1/agents/heartbeat",
      mainController:MAIN,modsController:MODS,
      roles:["host","mods"],remoteShell:false,automaticGameInstall:false,
      fleetMachineClasses:["existing-pc","generic-vps","oracle-vm","dedicated-ryzen",
        "dedicated-epyc","supermicro-microcloud","supermicro-clouddc","other-x64"],
      automaticAgentDiscoveryAfterEnrollment:true,
      inventorySyncEveryHeartbeat:true,
      gameInstallRequiresSeparateWorker:true,
      localAgentStillNeeded:true,
      documentation:"Cloud service provides coordination, not direct filesystem access to the Windows host."});
  }
  if(path==="/v1/agents/heartbeat"){
    if(request.method!=="POST")return send({error:"method_not_allowed"},405);
    if(Number(request.headers.get("content-length")||0)>4096)return send({error:"body_too_large"},413);
    const body=await request.text();
    if(body.length>4096)return send({error:"body_too_large"},413);
    let data;try{data=JSON.parse(body)}catch{return send({error:"invalid_json"},400)}
    const id=data?.agentId;
    const role=data?.role;
    if(!validId(id)||!["host","mods"].includes(role))return send({error:"invalid_agent"},400);
    if(scoped && (scoped!==id || role!=="host"))return send({error:"machine_token_node_mismatch"},403);
    const version=safeString(data?.version,80);
    const count=clampInt(data?.serverCount,10000);
    if(!version)return send({error:"invalid_version"},400);
    /* CMD_PORTABLE_CAPABILITIES_V1: sanitize telemetry; not an installation permission. */
    const measured=data?.capabilities;
    if(measured!==undefined){
      if(role!=="host" || !measured || typeof measured!=="object" || Array.isArray(measured)
        || !["win32","linux","darwin"].includes(measured.os)
        || !["x64","arm64"].includes(measured.architecture)
        || !Number.isInteger(measured.logicalCpus) || measured.logicalCpus<1 || measured.logicalCpus>2048
        || typeof measured.ramGB!=="number" || !Number.isFinite(measured.ramGB) || measured.ramGB<0 || measured.ramGB>100000
        || (measured.freeGB!==null && (typeof measured.freeGB!=="number" || !Number.isFinite(measured.freeGB) || measured.freeGB<0 || measured.freeGB>1000000))
        || !Array.isArray(measured.candidateGames) || measured.candidateGames.length>30
        || !measured.candidateGames.every(x=>typeof x==="string" && /^[a-z0-9-]{2,48}$/.test(x)))
        return send({error:"invalid_machine_capabilities"},400);
      /* CMD_SUPERMICRO_FLEET_V1: all optional metadata is advisory; never an install grant. */
      const known=["existing-pc","generic-vps","oracle-vm","dedicated-ryzen",
        "dedicated-epyc","supermicro-microcloud","supermicro-clouddc","other-x64"];
      if(measured.machineClass!==undefined && !known.includes(measured.machineClass))
        return send({error:"invalid_machine_class"},400);
      if(measured.cpuFamily!==undefined && !["amd-ryzen","amd-epyc","intel","other","unknown"].includes(measured.cpuFamily))
        return send({error:"invalid_cpu_family"},400);
      if(measured.chassisId!==undefined && measured.chassisId!==null &&
         (typeof measured.chassisId!=="string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,79}$/.test(measured.chassisId)))
        return send({error:"invalid_chassis_id"},400);
      // Unknown MicroCloud chassis is permitted for monitoring only.
      // It must NOT be grouped with another node or used for automatic placement
      // until the owner configures CMD_CHASSIS_ID for each actual chassis.
    }

    try{
      const db=await dbReady();
      await db`INSERT INTO cmd_hosting_cloud_agents(agent_id,agent_role,agent_version,server_count,last_seen)
      VALUES(${id},${role},${version},${count},NOW())
      ON CONFLICT(agent_id) DO UPDATE SET agent_role=EXCLUDED.agent_role,
        agent_version=EXCLUDED.agent_version,server_count=EXCLUDED.server_count,last_seen=NOW()`;

      if(measured!==undefined){
        await db`CREATE TABLE IF NOT EXISTS cmd_hosting_cloud_host_capabilities (
          agent_id VARCHAR(80) PRIMARY KEY,host_os VARCHAR(20) NOT NULL,
          architecture VARCHAR(20) NOT NULL,logical_cpus INTEGER NOT NULL,
          ram_gb REAL NOT NULL,free_gb REAL,
          candidate_games TEXT[] NOT NULL DEFAULT '{}'::text[],
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
        await db`INSERT INTO cmd_hosting_cloud_host_capabilities
          (agent_id,host_os,architecture,logical_cpus,ram_gb,free_gb,candidate_games)
          VALUES(${id},${measured.os},${measured.architecture},${measured.logicalCpus},${measured.ramGB},${measured.freeGB},${measured.candidateGames})
          ON CONFLICT(agent_id) DO UPDATE SET
            host_os=EXCLUDED.host_os,architecture=EXCLUDED.architecture,
            logical_cpus=EXCLUDED.logical_cpus,ram_gb=EXCLUDED.ram_gb,
            free_gb=EXCLUDED.free_gb,candidate_games=EXCLUDED.candidate_games,
            updated_at=NOW()`;
        if(measured.machineClass!==undefined){
          await db`CREATE TABLE IF NOT EXISTS cmd_hosting_cloud_machine_inventory(
            agent_id VARCHAR(80) PRIMARY KEY,
            machine_class VARCHAR(40) NOT NULL,
            chassis_id VARCHAR(80),
            cpu_family VARCHAR(20) NOT NULL DEFAULT 'unknown',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )`;
          await db`INSERT INTO cmd_hosting_cloud_machine_inventory
            (agent_id,machine_class,chassis_id,cpu_family)
            VALUES(${id},${measured.machineClass},${measured.chassisId??null},${measured.cpuFamily||"unknown"})
            ON CONFLICT(agent_id) DO UPDATE SET machine_class=EXCLUDED.machine_class,
              chassis_id=EXCLUDED.chassis_id,cpu_family=EXCLUDED.cpu_family,updated_at=NOW()`;
        }
      }
      return send({ok:true,agentId:id,heartbeatAccepted:true,nextHeartbeatSeconds:600});
    }catch(e){console.error("CLOUD_AGENTS_DB_ERROR",String(e?.message||e).slice(0,160));return send({error:"database_unavailable"},503)}
  }
  if(path==="/v1/agents/status"){
    if(request.method!=="GET")return send({error:"method_not_allowed"},405);
    try {
      const db=await dbReady();
      const rows=await db`SELECT agent_id,agent_role,agent_version,server_count,last_seen,
        (last_seen > NOW() - INTERVAL '25 minutes') AS online
        FROM cmd_hosting_cloud_agents ORDER BY last_seen DESC LIMIT 100`;
      // CMD Hosting V5 has already been polling the original controller.
      // Report its known DB state read-only, without changing V5 or disclosing filenames,
      // machine names, hardware fingerprints, auth.json, raw payloads or credentials.
      let legacy=[];
      try {
        const old=await db`SELECT node_id,last_seen,ram_gb,available_gb,
          CASE WHEN jsonb_typeof(servers)='array' THEN jsonb_array_length(servers)
               WHEN jsonb_typeof(servers)='object' AND jsonb_typeof(servers->'servers')='array'
                 THEN jsonb_array_length(servers->'servers')
               ELSE 0 END AS server_count,
          (last_seen > NOW() - INTERVAL '25 minutes') AS online
          FROM cmd_hosting_pc_nodes ORDER BY last_seen DESC LIMIT 100`;
        legacy=old.map(x=>({
          id:"host-"+createHash("sha256").update(String(x.node_id)).digest("hex").slice(0,20),
          role:"host",source:"existing_cmd_hosting_v5",version:"unknown",
          serverCount:Number(x.server_count)||0,
          ramGB:x.ram_gb===null?null:Number(x.ram_gb),
          availableGB:x.available_gb===null?null:Number(x.available_gb),
          lastSeen:x.last_seen,online:!!x.online
        }));
      }catch(e){console.error("CLOUD_LEGACY_READ_ERROR",String(e?.message||e).slice(0,100));}
      const agents=rows.map(x=>({
        id:x.agent_id,role:x.agent_role,source:"cloud_heartbeat",
        version:x.agent_version,serverCount:x.server_count,
        lastSeen:x.last_seen,online:!!x.online
      }));

      /* Optional host profiles. Legacy V5 nodes keep working without this table. */
      try{
        const exists=await db`SELECT to_regclass('public.cmd_hosting_cloud_host_capabilities') AS name`;
        if(exists[0]?.name){
          const caps=await db`SELECT agent_id,host_os,architecture,logical_cpus,ram_gb,free_gb,candidate_games,updated_at
            FROM cmd_hosting_cloud_host_capabilities ORDER BY updated_at DESC LIMIT 100`;
          const byId=new Map(caps.map(x=>[x.agent_id,x]));
          for(const agent of agents){
            const p=byId.get(agent.id);
            if(p)agent.hardware={os:p.host_os,architecture:p.architecture,logicalCpus:Number(p.logical_cpus)||0,
              ramGB:Number(p.ram_gb)||0,freeGB:p.free_gb===null?null:Number(p.free_gb),
              candidateGames:p.candidate_games||[],lastChecked:p.updated_at,
              note:"Reported by agent, not a benchmark or installation guarantee."};
          }
        }
      }catch(e){console.error("CMD_PORTABLE_CAPABILITIES_READ_ERROR",String(e?.message||e).slice(0,100))}
      /* Read-only model & chassis display. Legacy agents have no fleet classification. */
      try{
        const table=await db`SELECT to_regclass('public.cmd_hosting_cloud_machine_inventory') AS name`;
        if(table[0]?.name){
          const inventory=await db`SELECT agent_id,machine_class,chassis_id,cpu_family,updated_at
            FROM cmd_hosting_cloud_machine_inventory ORDER BY updated_at DESC LIMIT 100`;
          const byId=new Map(inventory.map(x=>[x.agent_id,x]));
          for(const agent of agents){
            const hw=byId.get(agent.id);
            if(hw){
              agent.fleet={machineClass:hw.machine_class,chassisId:hw.chassis_id,
                cpuFamily:hw.cpu_family,lastReportedAt:hw.updated_at,
                nodesIndependent:true,automaticInstall:false,
                note:"Chassis labels are owner-supplied; dedicated compatibility must be verified on the host."};
            }
          }
        }
      }catch(e){console.error("CMD_FLEET_READ_ERROR",String(e?.message||e).slice(0,110))}
      const all=[...agents,...legacy];
      return send({ok:true,checkedAt:new Date().toISOString(),
        total:all.length,online:all.filter(x=>x.online).length,
        agents:all,legacyNodes:legacy.length,connectedCloudAgents:agents.length,
        note:"Online means a recent successful heartbeat or legacy poll; it does not prove game-server execution."});
    }catch(e){console.error("CLOUD_AGENTS_DB_ERROR",String(e?.message||e).slice(0,160));return send({error:"database_unavailable"},503)}
  }

  /* CMD_PROVISIONING_V1 — verify paid rental eligibility without altering games, payments, jobs or Windows. */
  if(path==="/v1/provisioning/readiness") {
    if(request.method!=="GET")return send({error:"method_not_allowed"},405);
    try {
      const db=await dbReady();
      const [totals,eligible]=await Promise.all([
        db`SELECT count(*)::int AS rentals,
          count(*) FILTER (WHERE payment_state='not_started')::int AS not_started,
          count(*) FILTER (WHERE paid_until>now())::int AS unexpired,
          count(*) FILTER(WHERE EXISTS(
            SELECT 1 FROM cmd_hosting_rental_receipts v
            WHERE v.game_id=r.game_id AND v.account_id=r.account_id AND v.verified_at IS NOT NULL
          ))::int AS with_verified_receipt
          FROM cmd_hosting_rentals r`,
        db`SELECT l.id::text AS catalog_id,l.game_key,l.platform,l.slots,
          r.agent_server_id::text AS server_id,r.agent_node_id::text AS node_id,
          n.last_seen AS host_last_seen,
          (n.last_seen > now()-interval '25 minutes') AS host_online
          FROM cmd_hosting_rentals r
          JOIN cmd_hosting_game_library l ON l.id=r.game_id AND l.account_id=r.account_id
          LEFT JOIN cmd_hosting_pc_nodes n ON n.node_id=r.agent_node_id
          WHERE r.payment_state IN ('paid','active','verified')
          AND r.paid_until > NOW()
          AND EXISTS (
            SELECT 1 FROM cmd_hosting_rental_receipts v
            WHERE v.game_id=r.game_id AND v.account_id=r.account_id AND v.verified_at IS NOT NULL
          ) ORDER BY r.updated_at DESC LIMIT 50`
      ]);
      const items=eligible.map(r=>{
        const key=String(r.game_key||"").toLowerCase();
        const pc=String(r.platform||"").toLowerCase()==="pc";
        const server=String(r.server_id||"");
        const node=String(r.node_id||"");
        const kind=pc && /^(dayz|ark-asa|ark-survival-ascended|ark-ase|arma-reforger|arma-3|7-days-to-die|7dtd|palworld|satisfactory)$/.test(key) ? "steamcmd" : "provider_or_adapter_needed";
        const hostReady=!!r.host_online && !!node && !!server;
        return {catalogId:r.catalog_id,gameKey:key,platform:String(r.platform||""),
          slots:Number(r.slots)||0,serverId:server,nodeId:node,
          hostOnline:!!r.host_online,installer:kind,
          status:!hostReady?"waiting_for_online_host":kind==="steamcmd"?"awaiting_verified_windows_installer":"unsupported_platform_or_game"};
      });
      return send({ok:true,checkedAt:new Date().toISOString(),summary:{
        rentals:Number(totals[0]?.rentals)||0,
        notStarted:Number(totals[0]?.not_started)||0,
        paidUnexpired:Number(totals[0]?.unexpired)||0,
        withVerifiedReceipt:Number(totals[0]?.with_verified_receipt)||0,
        eligibleAndVerified:items.length,
        windowsInstallerReady:items.filter(x=>x.status==="awaiting_verified_windows_installer").length
      },items,automaticProvisioningActive:false,
      note:"Paid receipt and live Windows host are required. Existing V5 cannot yet execute an install-game job; no job or files were changed."});
    }catch(e){console.error("CMD_PROVISIONING_READINESS_ERROR",String(e?.message||e).slice(0,180));return send({error:"provisioning_database_unavailable"},503)}
  }

  /* CMD_RENTAL_QUEUE_V2 - authenticated idempotent paid-rental install queue.
   * No arbitrary shell commands. Only verified PC game IDs/SteamCMD apps.
   * A separate paired Windows worker must perform actual installation.
   */
  if(path==="/v1/provisioning/agent/claim" || path==="/v1/provisioning/agent/report"){
    if(request.method!=="POST")return send({error:"method_not_allowed"},405);
    if(Number(request.headers.get("content-length")||0)>2048)return send({error:"body_too_large"},413);
    const raw=await request.text();if(raw.length>2048)return send({error:"body_too_large"},413);
    let data;try{data=JSON.parse(raw)}catch{return send({error:"invalid_json"},400)}
    const nodeId=String(data?.nodeId||"");
    if(!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,110}$/.test(nodeId))return send({error:"invalid_node"},400);
    if(!master){
      if(!scoped)return send({error:"worker_not_enrolled"},401);
      try{
        const db=await dbReady();
        const rights=await db`SELECT 1 FROM cmd_hosting_provision_worker_permissions
           WHERE agent_id=${scoped} AND node_id=${nodeId} AND enabled=TRUE LIMIT 1`;
        if(!rights.length)return send({error:"worker_not_authorized_for_node"},403);
      }catch{return send({error:"worker_permissions_unavailable"},503)}
    }
    const allowed={
      "dayz":{appId:"223350",minGB:25,minRamGB:16,exe:"DayZServer_x64.exe"},
      "ark-asa":{appId:"2430930",minGB:120,minRamGB:32,exe:"ShooterGame/Binaries/Win64/ArkAscendedServer.exe"},
      "ark-survival-ascended":{appId:"2430930",minGB:120,minRamGB:32,exe:"ShooterGame/Binaries/Win64/ArkAscendedServer.exe"},
      "arma-reforger":{appId:"1874900",minGB:35,minRamGB:16,exe:"ArmaReforgerServer.exe"},
      "7dtd":{appId:"294420",minGB:25,minRamGB:16,exe:"7DaysToDieServer.exe"}
    };
    try {
      const db=await dbReady();
      await db`CREATE TABLE IF NOT EXISTS cmd_hosting_provision_tasks(
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,account_id TEXT NOT NULL,
        node_id TEXT NOT NULL,server_id TEXT NOT NULL,
        game_key TEXT NOT NULL,platform TEXT NOT NULL,app_id TEXT NOT NULL,
        paid_until TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        attempts INTEGER NOT NULL DEFAULT 0,
        leased_until TIMESTAMPTZ,
        result_code TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(game_id,account_id,paid_until)
      )`;
      await db`ALTER TABLE cmd_hosting_provision_tasks ADD COLUMN IF NOT EXISTS file_verification JSONB`;
      if(path==="/v1/provisioning/agent/report"){
        const jobId=String(data?.jobId||"");
        const resultCode=String(data?.resultCode||"");
        if(!/^[0-9a-f-]{36}$/.test(jobId)||!["binary_verified","content_prepared","failed","needs_attention"].includes(resultCode))
          return send({error:"invalid_report"},400);
        if(resultCode==="content_prepared"){
          const task=await db`SELECT app_id FROM cmd_hosting_provision_tasks WHERE id=${jobId} AND node_id=${nodeId} AND status='leased' AND leased_until>NOW() LIMIT 1`;
          if(!task.length)return send({error:"job_lease_not_found"},409);
          const reason=fileVerificationReason(data.fileVerification,String(task[0].app_id));
          if(reason)return send({error:"game_files_not_verified",reason,serverReady:false},409);
        }
        const rows=await db`UPDATE cmd_hosting_provision_tasks
          SET file_verification=${resultCode==="content_prepared"?JSON.stringify(data.fileVerification):null}::jsonb,
              status=${resultCode==="binary_verified"?"binaries_installed":resultCode==="content_prepared"?"content_prepared":"waiting_review"},
              result_code=${resultCode},leased_until=NULL,updated_at=NOW()
          WHERE id=${jobId} AND node_id=${nodeId}
            AND status='leased' AND leased_until>NOW()
          RETURNING id,status`;
        return rows.length?send({ok:true,jobId,status:rows[0].status,filesVerified:resultCode==="content_prepared",gameServerStarted:false,mapVerified:false,modsVerified:false}):send({error:"job_lease_not_found"},409);
      }
      const nodeRows=await db`SELECT 1 AS valid FROM cmd_hosting_pc_nodes
        WHERE node_id::text=${nodeId} AND last_seen>NOW()-interval '25 minutes'
        UNION SELECT 1 AS valid FROM cmd_hosting_cloud_agents
        WHERE agent_id=${nodeId} AND agent_role='host'
          AND last_seen>NOW()-interval '25 minutes' LIMIT 1`;
      if(!nodeRows.length)return send({ok:false,status:"host_offline_or_unpaired",job:null},200);
      const verified=await db`SELECT r.game_id::text AS game_id,r.account_id::text AS account_id,
        r.agent_server_id::text AS server_id,r.paid_until,
        l.game_key,l.platform
        FROM cmd_hosting_rentals r
        JOIN cmd_hosting_game_library l ON l.id=r.game_id AND l.account_id=r.account_id
        WHERE r.agent_node_id::text=${nodeId}
          AND r.agent_server_id IS NOT NULL
          AND (lower(l.platform)='pc' OR (lower(l.platform)='crossplay' AND lower(l.game_key) IN ('ark-asa','ark-survival-ascended','arma-reforger')))
          AND r.payment_state IN ('paid','active','verified')
          AND r.paid_until>NOW()
          AND EXISTS(SELECT 1 FROM cmd_hosting_rental_receipts v
             WHERE v.game_id=r.game_id AND v.account_id=r.account_id
             AND v.verified_at IS NOT NULL AND v.provider_event_id IS NOT NULL)
        ORDER BY r.updated_at DESC LIMIT 50`;
      let inserted=0;
      for(const r of verified){
        const key=String(r.game_key||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
        const spec=allowed[key];
        if(!spec||!r.server_id||!r.game_id||!r.account_id)continue;
        const id=crypto.randomUUID();
        const result=await db`INSERT INTO cmd_hosting_provision_tasks
          (id,game_id,account_id,node_id,server_id,game_key,platform,app_id,paid_until)
          VALUES(${id},${r.game_id},${r.account_id},${nodeId},${r.server_id},
                 ${key},${String(r.platform).toLowerCase()},${spec.appId},${r.paid_until})
          ON CONFLICT (game_id,account_id,paid_until) DO NOTHING RETURNING id`;
        if(result.length)inserted++;
      }
      const claimed=await db`UPDATE cmd_hosting_provision_tasks SET
        status='leased',leased_until=NOW()+interval '8 hours',
        attempts=attempts+1,updated_at=NOW()
        WHERE id=(SELECT id FROM cmd_hosting_provision_tasks
          WHERE node_id=${nodeId} AND
          (status='queued' OR (status='leased' AND leased_until<NOW()))
          AND attempts<3 ORDER BY created_at ASC
          FOR UPDATE SKIP LOCKED LIMIT 1)
        RETURNING id,game_id,account_id,server_id,game_key,platform,app_id,attempts`;
      if(!claimed.length)return send({ok:true,job:null,queuedNew:inserted});

      const q=claimed[0],spec=allowed[q.game_key];
      if(!spec)return send({error:"job_unsupported"},409);
      const rental=await db`SELECT slots FROM cmd_hosting_game_library
        WHERE id::text=${q.game_id} AND account_id::text=${q.account_id} LIMIT 1`;
      const slots=Number(rental[0]?.slots);
      if(!Number.isInteger(slots)||slots<1||slots>200){
        await db`UPDATE cmd_hosting_provision_tasks
          SET status='waiting_review',result_code='invalid_slot_count',leased_until=NULL
          WHERE id=${q.id} AND status='leased'`;
        return send({error:"invalid_rental_slots"},409);
      }
      const profile=GAME_MAPS[normalizeGameKey(q.game_key)];
      let mapPref=profile?.defaultMap||null,selectedMods=[],publisherApproved=false;
      const existingPrefs=await db`SELECT to_regclass('public.cmd_hosting_rental_content_prefs') AS name`;
      if(existingPrefs[0]?.name){
        const prefs=await db`SELECT map_id,mod_ids,publisher_approved FROM cmd_hosting_rental_content_prefs
          WHERE game_id=${q.game_id} AND account_id=${q.account_id} LIMIT 1`;
        if(prefs.length){
          mapPref=prefs[0].map_id;selectedMods=prefs[0].mod_ids||[];
          publisherApproved=!!prefs[0].publisher_approved;
        }
      }
      const content=validRentalContent(q.game_key,q.platform,mapPref,selectedMods);
      if(!content || ((content.publisherDlcRequired||content.publisherModRequired)&&!publisherApproved))
        {
          await db`UPDATE cmd_hosting_provision_tasks SET status='waiting_review',
            result_code='content_not_authorized',leased_until=NULL,updated_at=NOW()
            WHERE id=${q.id} AND status='leased'`;
          return send({error:"rental_content_not_authorized",job:null},409);
        }
      return send({ok:true,job:{jobId:q.id,gameId:q.game_id,serverId:q.server_id,
        gameKey:q.game_key,platform:q.platform,steamAppId:q.app_id,slots,
        minimumFreeGB:spec.minGB,minimumRamGB:spec.minRamGB,expectedExecutable:spec.exe,
        attempt:q.attempts,licenseAcceptedByWorkerRequired:true,
        action:"install_steamcmd_in_isolated_rental_directory",
        mapId:content.mapId,mapValue:content.value,modIds:content.mods,
        publisherEntitlementApproved:publisherApproved,
        contentWorkflow:"prepare_map_then_download_mods_then_verify_server",
        mapConfigurationPlanned:true,modsDownloadPending:content.mods.length>0,
        automaticMaps:false,automaticMods:false},
        queuedNew:inserted,
        note:"Host worker must independently verify game binaries and map files; mods stay pending until publisher/host confirms downloads."});
    }catch(e){
      console.error("CMD_RENTAL_QUEUE_ERROR",String(e?.message||e).slice(0,170));
      return send({error:"queue_unavailable"},503)
    }
  }
  return send({error:"not_found"},404);
}
Bun.serve({port:PORT,fetch:async req=>{
  try{return await route(req)}
  catch(e){console.error("CLOUD_AGENTS_ERROR",String(e?.message||e).slice(0,150));return send({error:"internal_error"},500)}
}});
console.log("CMD Hosting Cloud Agents v"+VERSION+" listening on "+PORT);

/* Boot-time cloud-only integration tests, no game/server mutations. */
void (async () => {
  const checks=[];
  const unauth=await route(new Request("http://localhost/v1/agents/status"));
  checks.push({name:"unauthorized_rejected",pass:unauth.status===401});
  const health=await route(new Request("http://localhost/health"));
  const data=await health.json();
  checks.push({name:"cloud_health",pass:health.status===200&&data.cloud===true});
  checks.push({name:"secrets_configured",pass:!!token&&!!sql});
  try {
    const db=await dbReady();
    const rows=await db`SELECT 1 AS ping`;
    checks.push({name:"postgres_connection",pass:rows?.[0]?.ping===1});
  } catch(e) {
    checks.push({name:"postgres_connection",pass:false,reason:"unavailable"});
  }
  if(token) {
    const h={"authorization":"Bearer "+token};
    const manifest=await route(new Request("http://localhost/v1/agents/manifest",{headers:h}));
    checks.push({name:"authorized_manifest",pass:manifest.status===200});
    const monitored=await route(new Request("http://localhost/v1/services",{headers:h}));
    const status=await monitored.json();
    checks.push({name:"railway_services_reachable",pass:monitored.status===200&&status.ok===true,
      services:status.services?.map(x=>({name:x.service,online:x.online,status:x.statusCode}))||[]});
  }
  if(token && sql){const h={"authorization":"Bearer "+token};const r=await route(new Request("http://localhost/v1/agents/status",{headers:h}));const d=await r.json();checks.push({name:"existing_v5_status_query",pass:r.status===200&&Array.isArray(d.agents),legacyNodes:d.legacyNodes,online:d.online});}
  console.log("CMD_CLOUD_AGENT_SELFTEST "+JSON.stringify({pass:checks.every(x=>x.pass),checks}));
})().catch(e=>console.error("CMD_CLOUD_AGENT_SELFTEST_EXCEPTION",String(e?.message||e).slice(0,150)));

/* Safe release endpoint verification at cloud boot. */
void(async()=>{const results=[];for(const [name,path,expected] of [["version_manifest","/downloads/versions.json",200],["mods_v4.1_script","/downloads/mods-agent-v4.1.ps1",200]]){try{const res=await route(new Request("http://localhost"+path));const body=await res.text();results.push({name,pass:res.status===expected&&(name!=="mods_v4.1_script"||body.includes("/v1/agents/heartbeat")),status:res.status,bytes:body.length});}catch(e){results.push({name,pass:false,error:String(e).slice(0,150)});}}console.log("CMD_CLOUD_DISTRIBUTION_TEST "+JSON.stringify({pass:results.every(x=>x.pass),results}));})();


/* CMD_PROVISIONING_V1_SELFTEST - protected read-only tests of live database and release. */
void(async()=>{
 const x=[];
 const denied=await route(new Request("http://localhost/v1/provisioning/readiness"));
 x.push({name:"unauthorized_rejected",status:denied.status,pass:denied.status===401});
 if(token){
  const res=await route(new Request("http://localhost/v1/provisioning/readiness",{headers:{authorization:"Bearer "+token}}));
  const body=await res.json();
  x.push({name:"paid_receipt_eligibility",status:res.status,pass:res.status===200&&body.ok===true,
    summary:body.summary||null,error:body.error||null});
 }
 const dl=await route(new Request("http://localhost/downloads/game-installer.ps1"));
 const script=await dl.text();
 x.push({name:"official_steamcmd_installer",status:dl.status,pass:dl.status===200&&script.includes("AcceptPublisherTerms")&&script.includes("steamcmd.exe"),bytes:script.length});
 console.log("CMD_PROVISIONING_V1_SELFTEST "+JSON.stringify({pass:x.every(t=>t.pass),checks:x}));
})().catch(e=>console.error("CMD_PROVISIONING_V1_SELFTEST_EXCEPTION",String(e?.message||e).slice(0,160)));


/* CMD_RENTAL_QUEUE_TEST - non-destructive integration tests; NO installs. */
void(async()=>{
 const x=[],h={authorization:"Bearer "+token,"content-type":"application/json"};
 const bad=await route(new Request("http://localhost/v1/provisioning/agent/claim",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({nodeId:"UNPAIRED-TEST-NODE-0001"})}));
 x.push({name:"unauthenticated_blocked",status:bad.status,pass:bad.status===401});
 if(token){
  const invalid=await route(new Request("http://localhost/v1/provisioning/agent/claim",{method:"POST",headers:h,body:JSON.stringify({nodeId:"invalid!"})}));
  x.push({name:"invalid_node_rejected",status:invalid.status,pass:invalid.status===400});
  const offline=await route(new Request("http://localhost/v1/provisioning/agent/claim",{method:"POST",headers:h,body:JSON.stringify({nodeId:"UNPAIRED-TEST-NODE-0001"})}));
  const o=await offline.json();
  x.push({name:"unpaired_machine_blocked",status:offline.status,pass:offline.status===200&&!o.job&&o.status==="host_offline_or_unpaired",code:o.error||null});
  const fake=await route(new Request("http://localhost/v1/provisioning/agent/report",{method:"POST",headers:h,body:JSON.stringify({nodeId:"UNPAIRED-TEST-NODE-0001",jobId:"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",resultCode:"binary_verified"})}));
  x.push({name:"unclaimed_install_not_accepted",status:fake.status,pass:fake.status===409});
 }
 console.log("CMD_RENTAL_QUEUE_TEST "+JSON.stringify({pass:x.every(q=>q.pass),checks:x}));
})().catch(e=>console.log("CMD_RENTAL_QUEUE_TEST_ERROR "+String(e?.message||e).slice(0,160)));



/* CMD_LONG_LIFE_REAL_SELFTEST — an isolated synthetic account (never a customer).
 * Uses a short-lived test token (60sec), revoked and deleted in finally.
 * Logs only HTTP statuses, never secrets. No game files/payments modified.
 */
if(Bun.env.CMD_LONG_LIFE_SELFTEST==="1") void(async()=>{
 const checks=[],fakeAccount="cmd_llt_test_"+randomBytes(6).toString("hex");
 const id=crypto.randomUUID();
 let inserted=false;
 const secret="cmd_llt_"+randomBytes(36).toString("base64url");
 const keyHash=createHash("sha256").update(secret).digest("hex");
 const authHeaders={authorization:"Bearer "+secret};
 try{
  const denied=await route(new Request("http://localhost/v1/tokens/me"));
  checks.push({name:"anonymous_token_rejected",pass:denied.status===401});
  const deniedAdmin=await route(new Request("http://localhost/v1/tokens/long-life",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({accountId:fakeAccount,label:"test",years:5,scopes:["rentals:read"]})}));
  checks.push({name:"public_creation_rejected",pass:deniedAdmin.status===401});
  const db=await longLifeDb();
  const tested=validateLongLifeInput({accountId:fakeAccount,label:"Test temporaire",
    years:5,scopes:["account:read","services:read","rentals:read"],serviceId:null});
  checks.push({name:"scope_and_duration_validated",pass:!!tested&&
    !validateLongLifeInput({accountId:fakeAccount,label:"danger",
      years:100,scopes:["servers:control"]})});
  await db`INSERT INTO cmd_hosting_long_life_tokens
    (id,account_id,label,token_hash,token_prefix,scopes,expires_at)
    VALUES(${id},${fakeAccount},'Test temporaire',${keyHash},'cmd_llt_test',
      ${"{account:read,services:read,rentals:read}"},NOW()+interval '1 minute')`;
  inserted=true;
  const self=await route(new Request("http://localhost/v1/tokens/me",{headers:authHeaders}));
  const view=await self.json();
  checks.push({name:"valid_opaque_token_accepted",pass:self.status===200&&
    view?.token?.accountId===fakeAccount&&!JSON.stringify(view).includes(secret)});
  const acc=await route(new Request("http://localhost/v1/tokens/account",{headers:authHeaders}));
  checks.push({name:"account_scope",pass:acc.status===200});
  const svc=await route(new Request("http://localhost/v1/tokens/services",{headers:authHeaders}));
  const sd=await svc.json();
  checks.push({name:"synthetic_account_isolated",pass:svc.status===200&&
     Array.isArray(sd.services)&&sd.services.length===0});
  const rents=await route(new Request("http://localhost/v1/tokens/rentals",{headers:authHeaders}));
  const rd=await rents.json();
  checks.push({name:"synthetic_rentals_isolated",pass:rents.status===200&&
     Array.isArray(rd.rentals)&&rd.rentals.length===0});
  const adminHeaders={authorization:"Bearer "+token,"content-type":"application/json"};
  const listed=await route(new Request("http://localhost/v1/tokens/long-life?accountId="+fakeAccount,
    {headers:adminHeaders}));
  const listBody=await listed.json();
  checks.push({name:"admin_can_list_without_secrets",pass:listed.status===200&&
    listBody?.tokens?.length===1&&!JSON.stringify(listBody).includes(secret)&&
    !JSON.stringify(listBody).includes(keyHash)});
  const invalidCreate=await route(new Request("http://localhost/v1/tokens/long-life",{
    method:"POST",headers:adminHeaders,
    body:JSON.stringify({accountId:fakeAccount,label:"unsafe",years:10,scopes:["servers:control"]})}));
  checks.push({name:"dangerous_creation_scope_rejected",pass:invalidCreate.status===400});
  const rotated=await route(new Request("http://localhost/v1/tokens/long-life/rotate",{
    method:"POST",headers:adminHeaders,body:JSON.stringify({accountId:fakeAccount,id})}));
  const rotatedData=await rotated.json();
  const newSecret=rotatedData?.accessToken||"";
  checks.push({name:"admin_can_rotate",pass:rotated.status===200&&
    /^cmd_llt_[A-Za-z0-9_-]{48}$/.test(newSecret)&&newSecret!==secret&&rotatedData.previousKeyInvalidated===true});
  const old=await route(new Request("http://localhost/v1/tokens/me",{headers:authHeaders}));
  const newToken=await route(new Request("http://localhost/v1/tokens/me",{
    headers:{authorization:"Bearer "+newSecret}}));
  checks.push({name:"rotation_invalidates_old_secret",pass:old.status===401&&newToken.status===200});
  const revokedResponse=await route(new Request("http://localhost/v1/tokens/long-life/revoke",{
    method:"POST",headers:adminHeaders,body:JSON.stringify({accountId:fakeAccount,id})}));
  const revokedData=await revokedResponse.json();
  const after=await route(new Request("http://localhost/v1/tokens/me",{
    headers:{authorization:"Bearer "+newSecret}}));
  checks.push({name:"admin_can_revoke",pass:revokedResponse.status===200&&
    revokedData.revoked===true&&after.status===401});
 }catch(err){
  checks.push({name:"integration_error",pass:false,
    error:String(err?.message||err).slice(0,110)});
 }finally{
  if(inserted)try{
    const db=await longLifeDb();
    await db`DELETE FROM cmd_hosting_long_life_tokens WHERE id=${id} AND account_id=${fakeAccount}`;
  }catch(err){checks.push({name:"fixture_cleanup",pass:false})}
  console.log("CMD_LONG_LIFE_REAL_SELFTEST "+JSON.stringify({
    pass:checks.length>0&&checks.every(x=>x.pass),checks}));
 }
})();

/* CMD_CONTENT_FLOW_SELFTEST — all tests read-only, never create a paid rental or install anything. */
void(async()=>{
 const checks=[];
 const x=await route(new Request("http://localhost/v1/provisioning/maps?game=dayz&platform=pc"));
 const dayz=await x.json();
 checks.push({name:"dayz_pc_maps",pass:x.status===200&&dayz.gameKey==="dayz"&&
   dayz.maps.some(m=>m.id==="chernarusplus")&&!dayz.maps.some(m=>m.id==="the-island")});
 checks.push({name:"nasdara_dlc_metadata",pass:dayz.maps.some(m=>m.id==="nasdara"&&m.requiresDlc===true&&m.gameValue==="dayzOffline.nasdara")});
 const y=await route(new Request("http://localhost/v1/provisioning/maps?game=ark-asa&platform=crossplay"));
 const ark=await y.json();
 checks.push({name:"ark_asa_crossplay_maps",pass:y.status===200&&ark.maps.some(m=>m.id==="the-island")&&
   !ark.maps.some(m=>m.id==="chernarusplus")});
 const n=await route(new Request("http://localhost/v1/provisioning/maps?game=dayz&platform=ps5"));
 checks.push({name:"console_provider_required",pass:n.status===422});
 const z=await route(new Request("http://localhost/v1/provisioning/content/select",{
   method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify({gameId:"not-a-real-rental",accountId:"nobody",mapId:"the-island"})}));
 checks.push({name:"unauthenticated_map_change_blocked",pass:z.status===401});
 console.log("CMD_CONTENT_FLOW_SELFTEST "+JSON.stringify({pass:checks.every(t=>t.pass),checks}));
})().catch(e=>console.error("CMD_CONTENT_FLOW_SELFTEST_ERROR",String(e?.message||e).slice(0,150)));
