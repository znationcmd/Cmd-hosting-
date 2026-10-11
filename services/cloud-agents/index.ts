/**
 * CMD Hosting Cloud Agents — Railway cloud-side coordination API.
 * Never executes local Windows commands, launches a game or modifies an existing game file.
 * Other CMD Hosting services and bots are deliberately untouched.
 */
import { SQL } from "bun";
import { timingSafeEqual, createHash } from "node:crypto";

const PORT = Number(Bun.env.PORT || 3000);
const VERSION = "1.5.0";
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
    return send({cloud:"1.5.0",modsAgent:"4.1.0",modsAgentURL:
      "https://cmd-hosting-cloud-agents-production.up.railway.app/downloads/mods-agent-v4.1.ps1",
      windowsAutoUpdater:"1.2",mainAgent:"V5 (installed version not remotely verified)",
      offlinePCRequiresLocalStartup:true});
  }
  if(path==="/downloads/game-installer.ps1") {
    if(request.method!=="GET")return send({error:"method_not_allowed"},405);
    try {
      const upstream=await fetch("https://raw.githubusercontent.com/znationcmd/Cmd-hosting-/37f079bb842aaf208cb7d8ce0c390a62aa6cb502/scripts/Install-CMDGameServer.ps1",
       {signal:AbortSignal.timeout(12000)});
      if(!upstream.ok)throw new Error("upstream");
      const script=await upstream.text();
      if(script.length<4000||script.length>16000||!script.includes("AcceptPublisherTerms")||!script.includes("steamcmd.exe"))throw new Error("invalid_script");
      return new Response(script,{status:200,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"public, max-age=600","x-content-type-options":"nosniff"}});
    }catch(e){return send({error:"installer_download_unavailable"},503)}
  }
  if(!auth(request))return send({error:"unauthorized"},401);
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
      if(measured.machineClass==="supermicro-microcloud" && !measured.chassisId)
        return send({error:"microcloud_chassis_required"},400);
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
    const allowed={
      "dayz":{appId:"223350",minGB:25,exe:"DayZServer_x64.exe"},
      "ark-asa":{appId:"2430930",minGB:120,exe:"ShooterGame/Binaries/Win64/ArkAscendedServer.exe"},
      "ark-survival-ascended":{appId:"2430930",minGB:120,exe:"ShooterGame/Binaries/Win64/ArkAscendedServer.exe"},
      "arma-reforger":{appId:"1874900",minGB:35,exe:"ArmaReforgerServer.exe"},
      "7dtd":{appId:"294420",minGB:25,exe:"7DaysToDieServer.exe"}
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
      if(path==="/v1/provisioning/agent/report"){
        const jobId=String(data?.jobId||"");
        const resultCode=String(data?.resultCode||"");
        if(!/^[0-9a-f-]{36}$/.test(jobId)||!["binary_verified","failed","needs_attention"].includes(resultCode))
          return send({error:"invalid_report"},400);
        const rows=await db`UPDATE cmd_hosting_provision_tasks
          SET status=${resultCode==="binary_verified"?"binaries_installed":"waiting_review"},
              result_code=${resultCode},leased_until=NULL,updated_at=NOW()
          WHERE id=${jobId} AND node_id=${nodeId}
            AND status='leased' AND leased_until>NOW()
          RETURNING id,status`;
        return rows.length?send({ok:true,jobId,status:rows[0].status,gameServerStarted:false,mapVerified:false,modsVerified:false}):send({error:"job_lease_not_found"},409);
      }
      const nodeRows=await db`SELECT 1 AS valid FROM cmd_hosting_pc_nodes
       WHERE node_id::text=${nodeId} AND last_seen>NOW()-interval '25 minutes' LIMIT 1`;
      if(!nodeRows.length)return send({ok:false,status:"host_offline_or_unpaired",job:null},200);
      const verified=await db`SELECT r.game_id::text AS game_id,r.account_id::text AS account_id,
        r.agent_server_id::text AS server_id,r.paid_until,
        l.game_key,l.platform
        FROM cmd_hosting_rentals r
        JOIN cmd_hosting_game_library l ON l.id=r.game_id AND l.account_id=r.account_id
        WHERE r.agent_node_id::text=${nodeId}
          AND r.agent_server_id IS NOT NULL
          AND lower(l.platform)='pc'
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
                 ${key},'pc',${spec.appId},${r.paid_until})
          ON CONFLICT (game_id,account_id,paid_until) DO NOTHING RETURNING id`;
        if(result.length)inserted++;
      }
      const claimed=await db`UPDATE cmd_hosting_provision_tasks SET
        status='leased',leased_until=NOW()+interval '40 minutes',
        attempts=attempts+1,updated_at=NOW()
        WHERE id=(SELECT id FROM cmd_hosting_provision_tasks
          WHERE node_id=${nodeId} AND
          (status='queued' OR (status='leased' AND leased_until<NOW()))
          AND attempts<3 ORDER BY created_at ASC
          FOR UPDATE SKIP LOCKED LIMIT 1)
        RETURNING id,game_id,server_id,game_key,platform,app_id,attempts`;
      if(!claimed.length)return send({ok:true,job:null,queuedNew:inserted});
      const q=claimed[0],spec=allowed[q.game_key];
      if(!spec)return send({error:"job_unsupported"},409);
      return send({ok:true,job:{jobId:q.id,gameId:q.game_id,serverId:q.server_id,
        gameKey:q.game_key,platform:q.platform,steamAppId:q.app_id,
        minimumFreeGB:spec.minGB,expectedExecutable:spec.exe,
        attempt:q.attempts,licenseAcceptedByWorkerRequired:true,
        action:"install_steamcmd_in_isolated_rental_directory",
        automaticMaps:false,automaticMods:false},
        queuedNew:inserted,
        note:"Only validated PC rental and SteamCMD game. Worker must report actual file verification."});
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
