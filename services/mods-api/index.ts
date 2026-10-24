
/**
* CMD Hosting Mods API — standalone, read-only provider gateway.
* Steam Workshop DayZ appid: 221100. All API keys are server-side.
* No modification to the existing CMD Hosting Bun Function.
*/
const PORT = Number(Bun.env.PORT || 3000);
const DAYZ_APP_ID = 221100;
function curseForgeKey(){
let key=(Bun.env.CURSEFORGE_API_KEY||"").trim();
if((key.startsWith('"')&&key.endsWith('"'))||(key.startsWith("'")&&key.endsWith("'")))key=key.slice(1,-1).trim();
return key.includes("${{")?"":key;
}
let curseForgeCheck={status:"not_tested",upstreamStatus:null,checkedAt:null};
function curseForgeDenied(status){curseForgeCheck={status:"access_denied",upstreamStatus:status,checkedAt:new Date().toISOString()};}
const ALLOWED_ORIGINS = new Set([
"https://cmd-hosting-web-production.up.railway.app",
"https://cmd-sphere.up.railway.app",
...(Bun.env.CMD_MODS_ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean)
]);
const cache = new Map();
const limits = new Map();
const TTL_MS = 180000;
const WINDOW_MS = 600000;
const MAX_REQUESTS = 80;
function cors(origin) {
const headers = {"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"};
if (origin && ALLOWED_ORIGINS.has(origin)) {
headers["access-control-allow-origin"] = origin;
headers["vary"] = "Origin";
headers["access-control-allow-methods"] = "GET, OPTIONS";
headers["access-control-allow-headers"] = "Content-Type";
}
return headers;
}
function answer(payload,status=200,origin="") {
return new Response(JSON.stringify(payload),{status,headers:cors(origin)});
}
function positiveId(value,maxDigits=20) {
return typeof value === "string" && /^[1-9][0-9]*$/.test(value) && value.length <= maxDigits;
}
function bounded(value,def,min,max) {
const n = Number(value);
return Number.isSafeInteger(n) && n >= min && n <= max ? n : def;
}
function throttle(req) {
const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "global").split(",")[0].slice(0,100);
const now = Date.now();
if (limits.size > 4000) {
for (const [k,v] of limits) if (now-v.start > WINDOW_MS) limits.delete(k);
}
let entry = limits.get(ip);
if (!entry || now-entry.start > WINDOW_MS) entry = {start:now,count:0};
entry.count++;
limits.set(ip,entry);
return entry.count <= MAX_REQUESTS;
}
async function upstream(url, options, cacheKey) {
const prior = cache.get(cacheKey);
if (prior && prior.until > Date.now()) return prior.data;
const res = await fetch(url,{...options,signal:AbortSignal.timeout(12000)});
if (!res.ok) {
const error = new Error("Provider responded with "+res.status);
error.providerStatus = res.status;
throw error;
}
const data = await res.json();
if (cache.size >= 300) cache.clear();
cache.set(cacheKey,{until:Date.now()+TTL_MS,data});
return data;
}
function readiness() {
return {
service:"CMD Hosting Mods API",
version:"1.2.0",
providers:{
dayz_workshop_details:"ready",
dayz_workshop_collections:"ready",
dayz_workshop_search:Bun.env.STEAM_WEB_API_KEY ? "configured" : "api_key_required",
curseforge:curseForgeKey() ? (curseForgeCheck.status==="access_denied" ? "access_denied" : "configured") : "api_key_required"
},
curseforgeCheck:{...curseForgeCheck},
writes_enabled:false,
dayz_workshop_app_id:DAYZ_APP_ID
};
}
/* CMD_HOSTING_OTHER_GAMES_MODS_V1: authorised catalogues, discovery only.
* Existing DayZ / Arma / ARK routes and module state remain unchanged.
* No remote installation, no downloads, no arbitrary provider URLs. */
const OTHER_GAME_MOD_PROVIDERS=[
[/^ANOMALIA(?: PRIMEVAL OUTBOUNDUN)?$/i,"ANOMALIA PRIMEVAL OUTBOUNDUN","workforge-local","https://github.com/znationcmd/ANOMALIA-PRIMEVAL-OUTBOUNDUN",0,"ANOMALIA WorkForge : catalogue de mods locaux et export de manifestes. Aucun serveur dédié UE5, téléchargement ni chargement distant de mods vérifié."],
[/^Farming Simulator 25$/i,"Farming Simulator 25","modhub-native","https://www.farming-simulator.com/mods.php",0,"Gestionnaire de mods du serveur dédié GIANTS; ZIP vérifiés et serveur arrêté."],
[/^Farming Simulator 22$/i,"Farming Simulator 22","modhub-native","https://www.farming-simulator.com/mods.php",0,"Utiliser le gestionnaire ModHub natif de la version du serveur."],
[/^Minecraft:?(?: Java Edition| Java)$/i,"Minecraft: Java Edition","modrinth","https://modrinth.com/mods",0,"Contrôler version du jeu, chargeur, dépendances et compatibilité serveur."],
[/^Minecraft:?(?: Bedrock Edition| Bedrock)$/i,"Minecraft: Bedrock Edition","local","https://www.minecraft.net/marketplace",0,"Add-ons packs Bedrock seulement, pas de mods Java."],
[/^Factorio$/i,"Factorio","factorio","https://mods.factorio.com/",0,"Mod Portal officiel. Téléchargement authentifié seulement sur l'hôte autorisé."],
[/^Project Zomboid$/i,"Project Zomboid","steam","https://steamcommunity.com/app/108600/workshop/",108600,"Workshop et listes Mods/WorkshopItems du serveur."],
[/^Conan Exiles$/i,"Conan Exiles","steam","https://steamcommunity.com/app/440900/workshop/",440900,"Respecter l'ordre du fichier modlist.txt et les droits d'utilisation."],
[/^Space Engineers$/i,"Space Engineers","steam","https://steamcommunity.com/app/244850/workshop/",244850,"Workshop; vérifier le monde et ses dépendances."],
[/^Unturned$/i,"Unturned","steam","https://steamcommunity.com/app/304930/workshop/",304930,"Installation Workshop serveur et configuration associée."],
[/^Garry.s Mod$/i,"Garry's Mod","steam","https://steamcommunity.com/app/4000/workshop/",4000,"Ateliers et collections; vérifier les ressources serveur."],
[/^Squad$/i,"Squad","steam","https://steamcommunity.com/app/393380/workshop/",393380,"Contrôler que le serveur dédié accepte la version du mod."],
[/^Starbound$/i,"Starbound","steam","https://steamcommunity.com/app/211820/workshop/",211820,"Modifications serveur et dépendances Workshop à vérifier."],
[/^Don.t Starve Together$/i,"Don't Starve Together","steam","https://steamcommunity.com/app/322330/workshop/",322330,"Configurer dedicated_server_mods_setup.lua hors partie."],
[/^7 Days to Die$/i,"7 Days to Die","local","https://7daystodie.com/",0,"Modlets dans Mods/; sauvegarde du monde; attention au cross-play."],
[/^Valheim$/i,"Valheim","thunderstore-guided","https://thunderstore.io/c/valheim/",0,"Vérifier BepInEx et les dépendances sur serveur et clients."],
[/^Terraria$/i,"Terraria","local","https://store.steampowered.com/app/1281930/tModLoader/",0,"Mods uniquement si le serveur est installé avec tModLoader."],
[/^Rust$/i,"Rust","local","https://umod.org/games/rust",0,"Plugins uMod/Oxide seulement si le chargeur est présent."],
[/^Satisfactory$/i,"Satisfactory","local","https://ficsit.app/",0,"Contrôler SML, le jeu et le support serveur dédié."],
[/^V Rising$/i,"V Rising","thunderstore-guided","https://thunderstore.io/c/v-rising/",0,"Chargeur et version du serveur à contrôler avant import."],
[/^Palworld$/i,"Palworld","local","https://www.pocketpair.jp/",0,"Support serveur du mod à vérifier; pas d'activation automatique."],
[/^Core Keeper$/i,"Core Keeper","local","https://mod.io/",0,"Support mod et serveur à vérifier avec l'éditeur."],
[/^Enshrouded$/i,"Enshrouded","publisher-review","https://enshrouded.com/",0,"Aucune intégration de mods serveur validée sans accord/support éditeur."],
[/^Farming Simulator 19$/i,"Farming Simulator 19","modhub-native","https://www.farming-simulator.com/mods.php",0,"ModHub FS19 natif, archives ZIP conformes à la version serveur."],
[/^Euro Truck Simulator 2$/i,"Euro Truck Simulator 2","local","https://eurotrucksimulator2.com/",0,"Synchronisation des mods multijoueur et serveur dédié à vérifier dans la configuration SCS."],
[/^American Truck Simulator$/i,"American Truck Simulator","local","https://americantrucksimulator.com/",0,"Compatibilité des mods sur serveur Convoy dédié à vérifier."],
[/^Assetto Corsa$/i,"Assetto Corsa","local","https://assettocorsa.gg/",0,"Fichiers piste/voiture validés et mêmes versions sur serveur et clients."],
[/^FiveM \(GTA V RP\)$|^FiveM \(Grand Theft Auto V\)$/i,"FiveM (GTA V RP)","local","https://docs.fivem.net/docs/scripting-manual/introduction/creating-your-first-script/",0,"Ressources FXServer dans resources/ avec fxmanifest.lua; permissions et serveur arrêté avant mise à jour."],
[/^RedM \(Red Dead RP\)$|^RedM \(Red Dead Redemption 2\)$/i,"RedM (Red Dead RP)","local","https://docs.fivem.net/docs/scripting-manual/introduction/creating-your-first-script/",0,"Ressources RedM autorisées dans resources/; dépendances et permissions à vérifier."],
[/^Minecraft: BungeeCord \(proxy multi-serveurs\)$/i,"Minecraft: BungeeCord (proxy multi-serveurs)","local","https://www.spigotmc.org/wiki/bungeecord-plugin-development/",0,"Plugins BungeeCord côté proxy; ne pas confondre avec les mods Java du serveur."],
[/^Garry.s Mod \(GMod\)$/i,"Garry's Mod (GMod)","steam","https://steamcommunity.com/app/4000/workshop/",4000,"Collections Workshop et addons pour GMod; vérifier le serveur dédié."],
[/^Barotrauma$/i,"Barotrauma","steam","https://steamcommunity.com/app/602960/workshop/",602960,"Modules Workshop et ordre de chargement côté serveur et clients."],
[/^Avorion$/i,"Avorion","steam","https://steamcommunity.com/app/445220/workshop/",445220,"Mods Workshop; synchronisation et scripts serveur à valider."],
[/^Killing Floor 2$/i,"Killing Floor 2","steam","https://steamcommunity.com/app/232090/workshop/",232090,"Modifications serveur Steam Workshop à vérifier pour la version du jeu."],
[/^Left 4 Dead 2$/i,"Left 4 Dead 2","steam","https://steamcommunity.com/app/550/workshop/",550,"Addons serveur et SourceMod; les mods purement client ne sont pas installés automatiquement."],
[/^Wurm Unlimited$/i,"Wurm Unlimited","steam","https://steamcommunity.com/app/366220/workshop/",366220,"Mods/Workshop à valider selon version et configuration du serveur."],
[/^Counter-Strike 2$/i,"Counter-Strike 2","local","https://www.sourcemm.net/",0,"Plugins serveur via MetaMod/SourceMod compatibles CS2; Steam Workshop non équivalent."],
[/^Counter-Strike: Source$|^Counter-Strike: Global Offensive \(CS:GO\)$|^Counter-Strike: Condition Zero$/i,"Counter-Strike: Source","local","https://www.sourcemod.net/",0,"SourceMod et plugins selon le moteur Source/GoldSrc du titre exact."],
[/^Team Fortress 2$/i,"Team Fortress 2","local","https://www.sourcemod.net/",0,"Plugins serveur SourceMod autorisés, pas de redistribution automatique de mods client."],
[/^Risk of Rain 2$/i,"Risk of Rain 2","thunderstore-guided","https://thunderstore.io/c/riskofrain2/",0,"Chargeur mod BepInEx/R2API et compatibilité multijoueur à vérifier."],
[/^Vintage Story$/i,"Vintage Story","native-guided","https://mods.vintagestory.at/",0,"Catalogue des mods Vintage Story; compatibilité serveur et version à contrôler."],
[/^Path of Titans$/i,"Path of Titans","native-guided","https://support.alderongames.com/",0,"Mods via l'écosystème officiel du jeu et options du serveur, API publique non présumée."],
[/^Eco$/i,"Eco","local","https://play.eco/",0,"Importer uniquement les mods Eco validés pour la version et le serveur."],
[/^Squad 44$/i,"Squad 44","native-guided","https://store.steampowered.com/app/736220/Squad_44/",0,"Vérifier le support de mods côté serveur et les règles éditeur avant activation."],
[/^Stationeers$/i,"Stationeers","local","https://store.steampowered.com/app/544550/Stationeers/",0,"Modules/Workshop compatibles serveur uniquement après revue."],
[/^Wreckfest$/i,"Wreckfest","local","https://store.steampowered.com/app/228380/Wreckfest/",0,"Mods/Workshop compatibles serveur dédiés à valider; pas d'activation automatique."],
[/^Empyrion: Galactic Survival$/i,"Empyrion: Galactic Survival","steam","https://steamcommunity.com/app/383120/workshop/",383120,"Workshop de scénarios et mods serveur selon configuration des mondes."],
[/^Necesse$/i,"Necesse","native-guided","https://store.steampowered.com/app/1169040/Necesse/",0,"Support serveur des mods à vérifier; les mods client ne sont pas automatiquement compatibles."],
[/^The Forest$/i,"The Forest","local","https://endnightgames.com/",0,"Mods non officiels: support dédié et compatibilité réseau à vérifier."],
[/^Abiotic Factor$/i,"Abiotic Factor","local","https://store.steampowered.com/app/427410/Abiotic_Factor/",0,"Compatibilité et chargeur communautaires à vérifier avant toute importation."],
[/^Atlas$/i,"Atlas","steam","https://steamcommunity.com/app/834910/workshop/",834910,"Mods Workshop avec précautions de compatibilité de cluster."],
[/^Mount and Blade 2: Bannerlord$/i,"Mount and Blade 2: Bannerlord","local","https://www.taleworlds.com/",0,"Modules de serveur multijoueur à vérifier; tous les mods solo ne conviennent pas."]
];
function otherGameModProfile(game,platform="pc"){
const title=String(game||"").trim().slice(0,120),p=String(platform||"pc").trim().toLowerCase().slice(0,25);
if(/^(?:DayZ|Arma(?:\s|$|-)|ARK(?::|\s|-))/i.test(title))return {game:title,platform:p,eligible:false,provider:"existing",reason:"existing_provider_retained",autoInstall:false};
const item=OTHER_GAME_MOD_PROVIDERS.find(r=>r[0].test(title));
if(!item)return {game:title,platform:p,eligible:false,provider:"review",reason:"publisher_mod_support_not_verified",autoInstall:false};
const allowed=["pc","windows","linux","steam"].includes(p)&&item[2]!=="publisher-review"&&item[2]!=="workforge-local";
return {game:title,platform:p,eligible:allowed,provider:item[2],officialName:item[1],officialUrl:item[3],
steamAppId:item[4]||null,note:item[5],autoInstall:false,installStatus:"requires_authorized_host_agent_and_backup",
reason:allowed?"catalogue_only":item[2]==="workforge-local"?"workforge_game_loader_not_verified":"console_mod_support_not_verified"};
}
async function otherGameModLookup(profile,q,page,origin){
if(!profile.eligible)return answer({error:profile.reason,profile},422,origin);
if(q.length>100)return answer({error:"invalid_search_query"},400,origin);
const empty=()=>answer({profile,items:[],mode:"open_official_manager_or_authorized_import",note:profile.note,autoInstall:false},200,origin);
if(!["modrinth","factorio","steam"].includes(profile.provider))return empty();
if(profile.provider==="modrinth"){
const facets=JSON.stringify([["project_type:mod"],["environment:server_only","environment:server_only_client_optional","environment:client_and_server","environment:dedicated_server_only"]]);
const opts=new URLSearchParams({query:q,limit:"20",offset:String((page-1)*20),facets});
const d=await upstream("https://api.modrinth.com/v2/search?"+opts,{headers:{"user-agent":"CMDHosting/1.0 mod-catalogue","accept":"application/json"}},"other:modrinth:"+opts);
const items=(d.hits||[]).map(x=>({id:x.project_id,title:x.title,description:String(x.description||"").slice(0,240),author:x.author,url:"https://modrinth.com/mod/"+encodeURIComponent(x.slug||x.project_id),downloads:x.downloads}));
return answer({profile,items,page,total:d.total_hits||0,mode:"catalogue",autoInstall:false},200,origin);
}
if(profile.provider==="factorio"){
const opts=new URLSearchParams({page:String(page),page_size:"50",sort:"updated_at",sort_order:"desc"});
const d=await upstream("https://mods.factorio.com/api/mods?"+opts,{headers:{"user-agent":"CMDHosting/1.0 mod-catalogue"}},"other:factorio:"+opts);
const hits=(d.results||[]).filter(x=>!q||(String(x.title||"")+" "+String(x.name||"")).toLowerCase().includes(q.toLowerCase())).slice(0,20);
return answer({profile,items:hits.map(x=>({id:x.name,title:x.title||x.name,description:x.summary,version:x.latest_release?.version||null,url:"https://mods.factorio.com/mod/"+encodeURIComponent(x.name)})),page,mode:"recent_page_filter",note:"Le filtre ne cherche que dans cette page de 50 mods; ouvrir le portail pour une recherche globale.",autoInstall:false},200,origin);
}
if(!Bun.env.STEAM_WEB_API_KEY)return answer({error:"steam_web_api_key_required",profile},503,origin);
if(!q)return answer({error:"search_query_required"},400,origin);
const appid=profile.steamAppId;
const opts=new URLSearchParams({key:Bun.env.STEAM_WEB_API_KEY,query_type:"12",appid:String(appid),creator_appid:String(appid),search_text:q,page:String(page),numperpage:"20",return_short_description:"true",return_previews:"true"});
const d=await upstream("https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/?"+opts,{},"other:steam:"+appid+":"+q.toLowerCase()+":"+page);
const items=(d.response?.publishedfiledetails||[]).filter(x=>Number(x.consumer_app_id||x.creator_app_id)===appid).map(x=>({id:String(x.publishedfileid),title:x.title,description:String(x.short_description||"").slice(0,240),url:"https://steamcommunity.com/sharedfiles/filedetails/?id="+encodeURIComponent(x.publishedfileid),imageUrl:x.preview_url||null}));
return answer({profile,items,page,total:d.response?.total||0,mode:"catalogue",autoInstall:false},200,origin);
}
const cmdOtherModsPage="<!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>CMD Hosting — Mods autres jeux</title><style>body{font:15px system-ui;color:white;background:linear-gradient(130deg,#174375,#473079);margin:auto;padding:24px;max-width:1200px}input,select,button,article{padding:12px;border-radius:12px;border:1px solid #9aaaff}button{background:#6054c0;color:white}a{color:#b6dfff}</style></head><body><main><div class=\"row\"><h1>CMD Hosting · Mods multi-jeux</h1><a class=\"btn\" href=\"https://cmd-hosting-web-production.up.railway.app/d/cmd\">Retour CMD Hosting</a></div><p>DayZ, Arma et ARK gardent leurs intégrations existantes. Pour les autres jeux, ce panneau affiche le catalogue autorisé ou l'accès au gestionnaire officiel. Installer nécessite un agent et une sauvegarde validés.</p><section class=\"box\"><div class=\"row\"><label>Jeu<select id=\"game\"><option>Chargement…</option></select></label><label>Plateforme<select id=\"platform\"><option value=\"pc\">PC</option><option value=\"ps5\">PS5</option><option value=\"xbox\">Xbox</option><option value=\"crossplay\">Cross-play</option></select></label><label>Nom d'un mod<input id=\"query\" maxlength=\"100\" placeholder=\"Nom du mod\"></label><button id=\"search\" type=\"button\">Rechercher</button></div><p id=\"info\" class=\"notice\" role=\"status\">Chargement…</p><a id=\"official\" class=\"btn\" href=\"#\" target=\"_blank\" rel=\"noopener noreferrer\" hidden>Catalogue officiel ↗</a></section><h2>Mods proposés</h2><div id=\"results\"></div></main><script>(()=>{\"use strict\";const e=id=>document.getElementById(id),n=(t,v)=>{const x=document.createElement(t);if(v!=null)x.textContent=String(v);return x};async function get(url){const r=await fetch(url),d=await r.json();if(!r.ok)throw Error(d.error||\"HTTP \"+r.status);return d}const say=t=>e(\"info\").textContent=t;function profile(p){e(\"official\").hidden=!p.officialUrl;if(p.officialUrl)e(\"official\").href=p.officialUrl;say(p.game+\": \"+(p.note||p.reason)+\" · Installation automatique indisponible sans agent autorisé.\")}async function inspect(){const game=e(\"game\").value;if(!game)return;try{profile(await get(\"/api/mods/games/profile?\"+new URLSearchParams({game,platform:e(\"platform\").value})))}catch(x){say(x.message)}}e(\"game\").onchange=inspect;e(\"platform\").onchange=inspect;e(\"search\").onclick=async()=>{const game=e(\"game\").value;if(!game)return;e(\"search\").disabled=true;try{const d=await get(\"/api/mods/games/search?\"+new URLSearchParams({game,platform:e(\"platform\").value,q:e(\"query\").value}));profile(d.profile);const box=e(\"results\");box.replaceChildren();for(const m of d.items||[]){const card=n(\"article\");card.className=\"result\";card.append(n(\"h3\",m.title||m.id));if(m.url?.startsWith(\"https://\")){const a=n(\"a\",\"Fiche officielle ↗\");a.href=m.url;a.target=\"_blank\";a.rel=\"noopener noreferrer\";card.append(a)}box.append(card)}if(!box.children.length)box.append(n(\"p\",d.note||\"Voir le catalogue officiel.\"))}catch(x){say(x.message)}finally{e(\"search\").disabled=false}};(async()=>{try{const d=await get(\"/api/mods/games/catalogue\"),select=e(\"game\");select.replaceChildren();const first=n(\"option\",\"Choisis un jeu\");first.value=\"\";select.append(first);for(const p of d.mods){const o=n(\"option\",p.catalogueName);o.value=p.catalogueName;select.append(o)}say(d.total+\" jeux recensés, dont \"+d.mods.filter(x=>x.eligible).length+\" fiches de mods PC.\")}catch(x){say(x.message)}})()})();</script></body></html>";
/* CMD HOSTING PREPRODUCTION GAME BLUEPRINTS v1
* Non-destructive, no false installations, independent of hardware.
* Game list is mirrored from the existing 173-item CMD Hosting public catalogue.
* Existing applications, jobs, user accounts and payments remain untouched.
*/
let cmdGameCatalogCache={until:0,games:[]};
async function cmdGameCatalog(){
if(cmdGameCatalogCache.until>Date.now() && cmdGameCatalogCache.games.length) return cmdGameCatalogCache.games;
const response=await fetch("https://cmd-hosting-web-production.up.railway.app/api/catalog",{signal:AbortSignal.timeout(12500)});
if(!response.ok) throw Object.assign(new Error("CMD Hosting catalogue unreachable"),{upstreamStatus:response.status});
const catalog=await response.json();
if(!Array.isArray(catalog.games)||catalog.games.length<150) throw new Error("CMD Hosting catalogue incomplete");
const games=catalog.games.filter(g=>Number.isInteger(g.id)&&g.id>0&&typeof g.name==="string");
cmdGameCatalogCache={until:Date.now()+120000,games};
return games;
}
const cmdBlueprintFiles=[
[/^ARK: Survival Ascended$/i,["ShooterGame/Saved/Config/WindowsServer/GameUserSettings.ini","ShooterGame/Saved/Config/WindowsServer/Game.ini"]],
[/^ARK: Survival Evolved/i,["ShooterGame/Saved/Config/WindowsServer/GameUserSettings.ini","ShooterGame/Saved/Config/WindowsServer/Game.ini"]],
[/^DayZ$/i,["serverDZ.cfg","mpmissions/*/init.c","mpmissions/*/db/events.xml","mpmissions/*/db/types.xml"]],
[/^Arma Reforger/i,["config.json"]],
[/^Arma 3$/i,["server.cfg","basic.cfg"]],
[/^7 Days to Die$/i,["serverconfig.xml"]],
[/^Conan Exiles$/i,["ConanSandbox/Saved/Config/WindowsServer/ServerSettings.ini","ConanSandbox/Saved/Config/WindowsServer/Engine.ini"]],
[/^Minecraft: Java Edition$/i,["server.properties","eula.txt","bukkit.yml","spigot.yml"]],
[/^Minecraft: Bedrock Edition$/i,["server.properties","permissions.json","allowlist.json"]],
[/^Minecraft.*BungeeCord/i,["config.yml"]],
[/^Rust$/i,["server/*/cfg/server.cfg","server/*/cfg/users.cfg"]],
[/^Valheim$/i,[]],
[/^Palworld$/i,["Pal/Saved/Config/WindowsServer/PalWorldSettings.ini"]],
[/^Project Zomboid$/i,["Zomboid/Server/*.ini","Zomboid/Server/*_SandboxVars.lua"]],
[/^Satisfactory$/i,["FactoryGame/Saved/Config/WindowsServer/Game.ini","FactoryGame/Saved/Config/WindowsServer/Engine.ini"]],
[/^Terraria$/i,["serverconfig.txt"]],
[/^V Rising$/i,["VRisingServer_Data/StreamingAssets/Settings/ServerHostSettings.json","VRisingServer_Data/StreamingAssets/Settings/ServerGameSettings.json"]],
[/^Enshrouded$/i,["enshrouded_server.json"]],
[/^Core Keeper$/i,["Game.cfg"]],
[/^Space Engineers$/i,["SpaceEngineers-Dedicated.cfg"]],
[/^Astroneer$/i,["Astro/Saved/Config/WindowsServer/Engine.ini","Astro/Saved/Config/WindowsServer/AstroServerSettings.ini"]],
[/^Counter-Strike/i,["game/csgo/cfg/server.cfg"]],
[/^Garry.s Mod/i,["garrysmod/cfg/server.cfg"]],
[/^Unturned$/i,["Servers/*/Server/Commands.dat","Servers/*/Server/Config.json"]],
[/^Factorio$/i,["server-settings.json","map-gen-settings.json"]],
[/^The Forest$/i,["ds/Server.cfg"]],
[/^Farming Simulator/i,["dedicatedServer.xml"]],
[/^Euro Truck Simulator 2$/i,["server_config.sii"]],
[/^American Truck Simulator$/i,["server_config.sii"]],
[/^Squad( 44)?$/i,["SquadGame/ServerConfig/Server.cfg","SquadGame/ServerConfig/MapRotation.cfg"]],
[/^Insurgency: Sandstorm$/i,["Insurgency/Config/Server/Admins.txt","Insurgency/Saved/Config/WindowsServer/Game.ini"]]
];
/* Nintendo compatibility is game-specific. Avoid implying public rental is operational.
* Official Minecraft documentation lists Nintendo Switch and Switch 2 as Bedrock clients.
* Connection methods for custom addresses on Switch must be verified in-game.
*/
const cmdNintendoBedrock={
platforms:["Nintendo Switch","Nintendo Switch 2"],
serverSoftware:"Minecraft Bedrock Dedicated Server",
softwareCompatibility:"documented-by-minecraft",
consoleConnectionStatus:"requires-test-on-switch-console",
customServerEntry:"may-be-restricted-on-switch-client",
publicRentalEnabled:false,
installationVerified:false,
nintendoDeveloperApiRequiredForServerHosting:false,
note:"Minecraft indique que son serveur dedie Bedrock accepte les joueurs sur Switch et Switch 2. L'acces depuis la console et l'installation doivent etre testes avant une offre de location."
};
function cmdNintendoForGame(game){
return /^Minecraft: Bedrock Edition$/i.test(String(game.name||"")) ? {...cmdNintendoBedrock} : null;
}
const cmdArkAscendedMaps=[
["The Island","TheIsland_WP"],["The Center","TheCenter_WP"],
["Scorched Earth","ScorchedEarth_WP"],["Aberration","Aberration_WP"],
["Extinction","Extinction_WP"],["Ragnarok","Ragnarok_WP"],
["Valguero","Valguero_WP"],["Genesis: Part 1","Genesis_WP"],
["Astraeos","Astraeos_WP"],["Lost Colony","LostColony_WP"]
].map(([name,launchName])=>({name,launchName,kind:"official"}));
const cmdArkEvolvedMaps=[
["The Island","TheIsland"],["The Center","TheCenter"],["Scorched Earth","ScorchedEarth_P"],
["Ragnarok","Ragnarok"],["Aberration","Aberration_P"],["Extinction","Extinction"],
["Valguero","Valguero_P"],["Crystal Isles","CrystalIsles"],["Genesis: Part 1","Genesis"],
["Genesis: Part 2","Gen2"],["Lost Island","LostIsland"],["Fjordur","Fjordur"]
].map(([name,launchName])=>({name,launchName,kind:"official"}));
function cmdBlueprintForGame(game){
const name=String(game.name||"");
const originalStatus=String(game.status||"review");
const files=(cmdBlueprintFiles.find(([re])=>re.test(name))||[])[1]||[];
let mapControl={mode:"none",choices:[],customAllowed:false,customSyntax:null,modRequirement:null,notes:"Carte à sélectionner seulement si le logiciel serveur fournit ce réglage."};
let modSource=null;
if(/^ARK: Survival Ascended$/i.test(name)){
mapControl={mode:"launch-map",choices:cmdArkAscendedMaps,customAllowed:true,customSyntax:"^[A-Za-z][A-Za-z0-9_]{0,79}$",
modRequirement:"Une carte personnalisée nécessite son mod CurseForge compatible ARK ASA; le serveur doit télécharger le mod avant de lancer la carte.",
notes:"Entrer le nom interne EXACT du level (_WP selon le créateur), pas le titre commercial. Exemple non vérifié : Appalachia_Official_WP. Ne changer la carte que serveur arrêté."};
modSource="curseforge";
}else if(/^ARK: Survival Evolved$/i.test(name)){
mapControl={mode:"launch-map",choices:cmdArkEvolvedMaps,customAllowed:true,customSyntax:"^[A-Za-z][A-Za-z0-9_]{0,79}$",
modRequirement:"La carte communautaire doit être téléchargée depuis Steam Workshop et installée sur le serveur PC.",
notes:"Noms de carte différents de ceux d'ARK Survival Ascended."};
modSource="steam-workshop";
}else if(/^DayZ$/i.test(name)){
mapControl={mode:"mission-map",choices:[{name:"Chernarus",launchName:"dayzOffline.chernarusplus",kind:"official"},{name:"Livonia",launchName:"dayzOffline.enoch",kind:"official"},{name:"Sakhal (Frostline)",launchName:"dayzOffline.sakhal",kind:"official",dlc:"Frostline"},{name:"Nasdara (Badlands)",launchName:"dayzOffline.nasdara",kind:"official",dlc:"Badlands",minVersion:"1.30"}],
customAllowed:true,customSyntax:"^[A-Za-z0-9_.-]{2,120}$",
modRequirement:"Installer le terrain Workshop, la mission et leurs dépendances sur PC; ne jamais réutiliser les mods PC sur console.",
notes:"Pour Nasdara, mettre à jour le serveur DayZ en 1.30+, sauvegarder les mondes, puis sélectionner template=dayzOffline.nasdara dans serverDZ.cfg. Nasdara est une carte officielle Badlands (pas un mod Steam Workshop). Les joueurs doivent disposer de l’extension appropriée. Les sauvegardes et réglages sont séparés par mission."};
modSource="steam-workshop";
}else if(/^Arma Reforger/i.test(name)){
mapControl={mode:"scenario-resource",choices:[{name:"Everon",launchName:"Everon",kind:"display-only"},{name:"Arland",launchName:"Arland",kind:"display-only"}],
customAllowed:true,customSyntax:"^.{4,150}$",
modRequirement:"Un scénario Workshop et son identifiant de ressource valide sont requis pour changer le scénario.",
notes:"Sélectionner le SCÉNARIO/ID de ressource Enfusion; le nom de la carte ne suffit pas à lancer un serveur."};
modSource="bohemia-workshop";
}else if(/^7 Days to Die$/i.test(name)){
mapControl={mode:"world-name",choices:[{name:"Navezgane",launchName:"Navezgane",kind:"official"}],
customAllowed:true,customSyntax:"^[A-Za-z0-9_ -]{1,90}$",modRequirement:null,
notes:"La carte ou le monde doit exister sur le serveur; les mondes générés sont version-dépendants."};
}else if(/^Minecraft: (Java|Bedrock) Edition$/i.test(name)){
mapControl={mode:"world-folder",choices:[],customAllowed:true,customSyntax:"^[A-Za-z0-9_ -]{1,90}$",modRequirement:null,
notes:"Sélection du dossier/nom de monde existant dans server.properties (level-name)."};
}else if(/^Rust$/i.test(name)){
mapControl={mode:"seed-or-custom-url",choices:[],customAllowed:true,customSyntax:null,modRequirement:null,
notes:"Sélectionner une graine procedural map ou une URL de carte personnalisée de confiance (server.levelurl)."};
}else if(/^Project Zomboid$/i.test(name)){
mapControl={mode:"world-list",choices:[{name:"Muldraugh",launchName:"Muldraugh, KY",kind:"official"}],
customAllowed:true,customSyntax:"^[A-Za-z0-9_,. -]{1,140}$",
modRequirement:"Vérifier les dépendances Workshop des cartes personnalisées.",
notes:"La liste Map se renseigne dans le profil du serveur; ordre et fichiers Workshop à contrôler."};
modSource="steam-workshop";
}else if(/^Valheim$/i.test(name)){
mapControl={mode:"world-name",choices:[],customAllowed:true,customSyntax:"^[A-Za-z0-9_ -]{1,100}$",modRequirement:null,notes:"Nom du monde Valheim à fournir au lancement; sauvegarde obligatoire avant modification."};
}
return {
catalogId:game.id,catalogKey:game.key,gameName:name,steamAppId:game.appId??null,
visual:{imageUrl:(typeof game.cover==="string"&&/^https:\/\/shared\.fastly\.steamstatic\.com\/store_item_assets\/steam\/apps\/[0-9]+\/header\.jpg$/i.test(game.cover))?game.cover:null,uniqueThemeKey:"game-"+game.id},
declaredPlatforms:Array.isArray(game.platforms)?game.platforms:[],
...(cmdNintendoForGame(game)?{nintendoCompatibility:cmdNintendoForGame(game)}:{}),
originalCatalogueStatus:originalStatus,
preproductionProfile:"prepared",publicOrderingEnabled:false,paymentRequired:false,
machineInstallationVerified:false,readyToLaunch:false,
dedicatedServerSupport:originalStatus==="dedicated"?"listed-needs-verification":"requires-review",
requirements:["Machine compatible et agent raccordé","Serveur dédié légalement disponible","Exécutable et fichiers existants contrôlés"],
configFiles:files.map(relativePath=>({relativePath,activateWhenPresent:true,autoCreate:false,protectExisting:true})),
fileDiscovery:{enabled:true,readOnlyUntilPathVerified:true,root:"server-install-directory",wildcardsAccepted:true},
mapSelection:mapControl,modProvider:modSource,
note:"Préconfiguré pour une future machine; aucun serveur n'est installé ni activé par cette fiche."
};
}
async function cmdBlueprintsApi(path,query,origin){
try{
const all=await cmdGameCatalog();
if(path==="/api/preproduction/nintendo"){
const compatible=all.filter(g=>cmdNintendoForGame(g));
return answer({platforms:["Nintendo Switch","Nintendo Switch 2"],verifiedServerCandidates:compatible.map(g=>({catalogId:g.id,gameName:g.name,compatibility:cmdNintendoForGame(g)})),otherGamesStatus:"case-by-case-verification-required",nintendoUniversalHostingApi:false,publicRentalEnabled:false,sourceDocumentation:"https://www.minecraft.net/fr-fr/download/server/bedrock",developerPortal:"https://developer.nintendo.com/"},200,origin);
}
if(path==="/api/preproduction/status")return answer({ok:true,catalogueCount:all.length,profileCount:all.length,preproduction:true,existingHostingUnaffected:true,allGamesProfilesPrepared:true,realInstallationsActivated:false,paymentsActivated:false},200,origin);
const detail=path.match(/^\/api\/preproduction\/games\/([0-9]+)$/);
if(detail){
const id=Number(detail[1]);const game=all.find(g=>g.id===id);
if(!game)return answer({error:"game_not_found"},404,origin);
return answer({profile:cmdBlueprintForGame(game)},200,origin);
}
if(path==="/api/preproduction/games"){
const search=(query.get("search")||"").trim().toLowerCase().slice(0,80);
const filtered=search?all.filter(g=>g.name.toLowerCase().includes(search)):all;
return answer({count:filtered.length,total:all.length,kind:"preproduction-configuration-not-live-installation",
games:filtered.map(cmdBlueprintForGame)},200,origin);
}
return answer({error:"not_found"},404,origin);
}catch(e){
console.log("CMD_BLUEPRINT_CATALOG_ERROR "+String(e).slice(0,180));
return answer({error:"catalogue_unavailable",details:"Profiles require the existing CMD Hosting public catalog"},503,origin);
}
}
/*CMD_PREPRODUCTION_GAMES_UI_V1*/
const cmdUiMarkup="<!doctype html>\n<html lang=\"fr\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<meta name=\"color-scheme\" content=\"dark\"><title>CMD Hosting — Catalogue de préproduction</title>\n<style>\n:root{color-scheme:dark;--bg:#080d1a;--nav:#0b1428;--panel:#121c31;--panel2:#16223a;--line:#263754;--txt:#eef4ff;--sub:#9eafcc;--blue:#6a91ff;--violet:#9b78ff}\n*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--txt);font:14px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}button,input,select{font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #9cbaff;outline-offset:2px}\n.shell{display:grid;grid-template-columns:250px minmax(0,1fr);min-height:100vh}.side{background:var(--nav);border-right:1px solid var(--line);position:sticky;top:0;height:100vh;display:flex;flex-direction:column;padding:21px 14px;gap:20px}.brand{display:flex;align-items:center;gap:11px;padding:4px 11px;font-weight:900;font-size:21px}.brand b{background:linear-gradient(135deg,#6393ff,#a679ff);padding:7px 11px;border-radius:12px}.menu{display:grid;gap:5px}.nav{border:0;background:transparent;color:var(--sub);padding:12px 14px;border-radius:10px;text-align:left}.nav.active{background:#223b67;color:white;font-weight:700}.nav:not(.active):hover{background:#1a2944;color:white}.sidefoot{margin-top:auto;color:var(--sub);padding:10px 12px;border-top:1px solid var(--line);font-size:12px}.sidefoot a{color:#b4caff}.main{min-width:0}.topbar{display:flex;justify-content:space-between;align-items:center;padding:16px 30px;background:#0a1121;border-bottom:1px solid var(--line);gap:10px}.topbar .label{color:#c7d4ed;font-weight:700}.stage{color:#f0dba4;background:#463b25;border:1px solid #7b6238;border-radius:20px;padding:5px 10px;font-size:12px}.content{max-width:1660px;margin:auto;padding:26px 30px 50px}.intro{display:flex;justify-content:space-between;align-items:end;gap:18px;flex-wrap:wrap;margin-bottom:24px}.intro h1{font-size:clamp(26px,3vw,38px);margin:0}.muted{color:var(--sub)}.intro p{margin:5px 0 0;max-width:700px}.count{background:#152541;border:1px solid #34517f;border-radius:12px;padding:12px 17px;font-weight:700}.layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,355px);gap:20px;align-items:start}\n.toolbar{display:flex;gap:10px;margin-bottom:15px}.toolbar input,.toolbar select{background:#16233a;color:#eef4ff;border:1px solid #344563;border-radius:10px;padding:12px 13px;min-width:0}.toolbar input{flex:1}.toolbar select{width:175px}\n.games{display:grid;grid-template-columns:repeat(auto-fill,minmax(255px,1fr));gap:13px}.game{position:relative;border:1px solid #283955;background:var(--panel);border-radius:16px;overflow:hidden;text-align:left;color:var(--txt);width:100%;min-height:210px;padding:0;transition:transform .12s,border-color .12s}.game:hover{transform:translateY(-2px);border-color:#678eed}.game.selected{border-color:#9b78ff;box-shadow:0 0 0 2px #9b78ff30}.game .art{height:115px;position:relative;overflow:hidden;background:var(--grad,linear-gradient(125deg,#183759,#453068))}.game .art img{width:100%;height:100%;object-fit:cover;opacity:.78;filter:saturate(1.08)}.game .art:after{content:\"\";position:absolute;inset:0;background:linear-gradient(0deg,#121c31 0%,transparent 86%)}.game .meta{padding:0 14px 13px;margin-top:-10px;position:relative}.game .meta b{display:block;font-size:15px;min-height:27px}.game .meta small{color:var(--sub);display:block}.game .meta .state{font-size:10px;color:#c1a7ff;background:#322750;display:inline-block;padding:3px 8px;border-radius:20px;margin-top:8px}\n.detail{position:sticky;top:20px;border:1px solid #334666;border-radius:17px;background:var(--panel);overflow:hidden}.detailcover{height:160px;background:linear-gradient(130deg,#1d3062,#59317c);position:relative}.detailcover img{height:100%;width:100%;object-fit:cover;opacity:.8}.detailcover:after{content:\"\";position:absolute;inset:0;background:linear-gradient(0deg,#121c31,transparent 85%)}.detail .inner{padding:18px}.detail h2{margin:0;font-size:22px;line-height:1.24}.pills{display:flex;gap:7px;flex-wrap:wrap;margin:11px 0}.pill{padding:4px 8px;border-radius:7px;background:#202f4b;color:#c5d8ff;font-size:11px;border:1px solid #314b72}.hr{height:1px;background:var(--line);margin:17px 0}.detail h3{font-size:14px;margin:14px 0 7px}.detail ul{margin:0;padding-left:18px;color:#cad4e9}.detail li{margin-bottom:5px;overflow-wrap:anywhere}.detail select,.detail input{background:#1e2d49;color:#fff;border:1px solid #49628d;border-radius:8px;width:100%;padding:10px;margin:6px 0}.action{display:block;border:1px solid #5678be;background:#284b86;color:white;border-radius:10px;padding:10px 12px;width:100%;margin-top:10px;font-weight:700}.action:hover{background:#3564ad}.action.ghost{background:transparent;border-color:#3b5375;color:#c6d6fa}.small{font-size:12px;color:var(--sub)}.notice{background:#1b2235;border:1px solid #42526e;border-radius:10px;padding:11px 12px;margin:12px 0;font-size:12px;color:#b8c6e0}.empty{padding:28px;color:var(--sub);border:1px dashed #4a5b7d;border-radius:12px}.foot{font-size:12px;color:#91a4c6;margin-top:26px}.foot a{color:#a5c2ff}\n@media(max-width:1100px){.layout{grid-template-columns:1fr}.detail{position:relative;top:0}.games{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}}@media(max-width:700px){.shell{grid-template-columns:1fr}.side{position:relative;height:auto;padding:10px 12px;gap:6px}.brand{font-size:17px}.menu{display:flex;overflow:auto}.nav{white-space:nowrap;padding:8px 10px}.sidefoot{display:none}.topbar{padding:10px 15px}.content{padding:18px 14px}.toolbar{flex-wrap:wrap}.toolbar input{flex-basis:100%}.toolbar select{width:100%}.games{grid-template-columns:repeat(2,minmax(0,1fr))}.game{min-height:200px}.game .meta b{font-size:13px}.game .art{height:100px}}\n<style>html.cmd-embedded .shell{grid-template-columns:minmax(0,1fr)}html.cmd-embedded .side,html.cmd-embedded .topbar{display:none}html.cmd-embedded .content{padding:16px 18px 30px;max-width:none}html.cmd-embedded .intro h1{font-size:26px}html.cmd-embedded .layout{grid-template-columns:minmax(0,1fr) minmax(270px,360px)}</style><script>if(new URLSearchParams(location.search).get('embed')==='1')document.documentElement.classList.add('cmd-embedded');</script></head><body>\n<div class=\"shell\"><aside class=\"side\"><div class=\"brand\"><b>◆</b> CMD Hosting</div><nav class=\"menu\" aria-label=\"Navigation\"><button class=\"nav active\" type=\"button\">🎮 Jeux et décors</button><button class=\"nav\" type=\"button\" id=\"navSite\">↗ Site CMD Hosting</button><button class=\"nav\" type=\"button\" id=\"navJson\">⚙ Fiches API</button></nav><div class=\"sidefoot\">Catalogue de préparation<br>Les serveurs réels restent gérés sur <a href=\"https://cmd-hosting-web-production.up.railway.app/\" rel=\"noopener\">CMD Hosting</a>.</div></aside>\n<main class=\"main\"><header class=\"topbar\"><div class=\"label\">CMD HOSTING / Catalogue des jeux</div><span class=\"stage\">Préproduction — aucun serveur fictif</span></header>\n<div class=\"content\"><div class=\"intro\"><div><h1>Un fond pour chaque jeu.</h1><p class=\"muted\">Les 173 jeux du catalogue CMD Hosting, avec leur visuel individuel, leurs cartes et leurs fichiers de configuration lorsqu'ils existent.</p></div><div class=\"count\"><span id=\"count\">Chargement…</span> fiches</div></div>\n<div class=\"layout\"><section aria-label=\"Jeux\"><div class=\"toolbar\"><input id=\"query\" type=\"search\" autocomplete=\"off\" aria-label=\"Rechercher un jeu\" placeholder=\"Rechercher un jeu (ARK, DayZ, Minecraft…)\"><select id=\"filter\" aria-label=\"Filtrer les jeux\"><option value=\"all\">Tous les jeux</option><option value=\"maps\">Cartes configurables</option><option value=\"files\">Fichiers connus</option><option value=\"dedicated\">Serveur dédié référencé</option></select></div><div id=\"games\" class=\"games\"><div class=\"empty\">Chargement des jeux…</div></div></section>\n<aside class=\"detail\" id=\"detail\" aria-live=\"polite\"><div class=\"detailcover\" id=\"detailCover\"></div><div class=\"inner\"><h2 id=\"detailTitle\">Choisis un jeu</h2><div id=\"detailPills\" class=\"pills\"></div><p id=\"detailMessage\" class=\"muted\">Sélectionne une fiche pour afficher les cartes et les fichiers disponibles.</p><div id=\"detailBody\"></div></div></aside></div>\n<footer class=\"foot\">Visuels associés à chaque jeu, à partir des jaquettes connues dans le catalogue existant. Pour un jeu sans illustration disponible, un fond dégradé distinct est affiché. Cette page prépare la configuration : elle n'installe aucun logiciel serveur, ne crée aucun compte et ne modifie pas tes machines.</footer></div></main></div>\n<script>\n(() => {\n\"use strict\";\nconst $=id=>document.getElementById(id);\nlet games=[],selected=null;const qs=new URLSearchParams(location.search);\nfunction gradient(id){let a=(Number(id)*37)%360,b=(a+72)%360;return 'linear-gradient(115deg,hsl('+a+' 44% 24%),hsl('+b+' 39% 17%))'}\nfunction element(tag,cls,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n}\nfunction safeCover(x){if(!x)return null;try{let u=new URL(x);return u.protocol===\"https:\"&&[\"shared.fastly.steamstatic.com\",\"cdn.cloudflare.steamstatic.com\"].includes(u.hostname)?u.href:null}catch{return null}}\nfunction art(profile,size){let holder=element(\"div\",size===\"big\"?\"detailcover\":\"art\");holder.style.setProperty(\"--grad\",gradient(profile.catalogId));holder.style.background=gradient(profile.catalogId);let src=safeCover(profile.visual?.imageUrl);if(src){let img=document.createElement(\"img\");img.src=src;img.alt=\"\";img.loading=size===\"big\"?\"eager\":\"lazy\";img.referrerPolicy=\"no-referrer\";holder.appendChild(img)}return holder}\nfunction show(profile){selected=profile;const name=profile.gameName;document.querySelectorAll('.game').forEach(g=>g.classList.toggle('selected',Number(g.dataset.id)===profile.catalogId));$('detailCover').replaceWith(Object.assign(art(profile,'big'),{id:'detailCover'}));$('detailTitle').textContent=name;$('detailPills').replaceChildren();\n[profile.declaredPlatforms?.join(\" / \")||\"Plateforme à confirmer\",profile.originalCatalogueStatus===\"dedicated\"?\"Dédié référencé\":\"Support à vérifier\"].forEach(s=>$('detailPills').appendChild(element('span','pill',s)));\n$('detailMessage').textContent=\"Profil prêt pour une future machine • serveur non installé\";\nconst body=$('detailBody');body.replaceChildren();\nconst addTitle=s=>body.appendChild(element(\"h3\",\"\",s));\naddTitle(\"Cartes et scénarios\");\nconst map=profile.mapSelection||{};if(map.mode===\"none\"){body.appendChild(element(\"p\",\"small\",\"Aucun sélecteur de carte universel pour ce jeu. Les réglages sont spécifiques au logiciel serveur.\"))}\nelse{const opts=element('select');opts.id=\"mapChoice\";opts.setAttribute('aria-label','Carte ou scénario');opts.appendChild(new Option(\"Choisir une carte ou un scénario\",\"\"));(map.choices||[]).forEach(c=>opts.add(new Option(c.name+\" — \"+c.launchName,c.launchName)));if(map.customAllowed)opts.add(new Option(\"Carte personnalisée…\",\"__custom__\"));body.appendChild(opts);const custom=element('input');custom.id=\"mapCustom\";custom.placeholder=\"Nom technique exact, par ex. Appalachia_Official_WP\";custom.hidden=true;opts.addEventListener('change',()=>{custom.hidden=opts.value!=='__custom__'});body.appendChild(custom);const copy=element(\"button\",\"action\",\"Copier ce choix de carte\");copy.type=\"button\";copy.onclick=async()=>{const value=opts.value==='__custom__'?custom.value.trim():opts.value;if(!value){copy.textContent='Choisis une carte';return}if(opts.value==='__custom__'&&map.customSyntax&&!(new RegExp(map.customSyntax)).test(value)){copy.textContent='Nom technique invalide';return}try{await navigator.clipboard.writeText(JSON.stringify({catalogId:profile.catalogId,game:name,mapMode:map.mode,launchName:value,modRequired:!!map.modRequirement},null,2));copy.textContent='Choix copié';setTimeout(()=>copy.textContent='Copier ce choix de carte',1500)}catch{copy.textContent='Copie indisponible'}};body.appendChild(copy)}\nif(map.notes)body.appendChild(element('p','small',map.notes));if(map.modRequirement)body.appendChild(element('div','notice',map.modRequirement));\nbody.appendChild(element('div','hr'));\naddTitle(\"Fichiers de configuration\");if(!profile.configFiles?.length){body.appendChild(element('p','small',\"Fichiers à identifier selon l'éditeur et la version du serveur.\"))}else{const ul=element('ul');profile.configFiles.forEach(f=>ul.appendChild(element('li','',f.relativePath)));body.appendChild(ul)}\nbody.appendChild(element('div','notice',\"Aucun fichier n'est créé ou modifié ici. La détection devra vérifier les vrais chemins avant d'autoriser l'édition.\"));\nconst api=element('a','small','Voir la fiche technique JSON ↗');api.href='/api/preproduction/games/'+profile.catalogId;api.target='_blank';api.rel='noopener';body.appendChild(api);\nhistory.replaceState(null,'','?jeu='+profile.catalogId);\n}\nfunction render(){const q=$('query').value.trim().toLocaleLowerCase('fr');let filtered=games.filter(g=>g.gameName.toLocaleLowerCase('fr').includes(q));const filter=$('filter').value;if(filter==='maps')filtered=filtered.filter(g=>g.mapSelection?.mode!=='none');if(filter==='files')filtered=filtered.filter(g=>g.configFiles?.length>0);if(filter==='dedicated')filtered=filtered.filter(g=>g.originalCatalogueStatus==='dedicated');const out=$('games');out.replaceChildren();if(!filtered.length){out.appendChild(element('div','empty','Aucun jeu trouvé.'));return}const fragment=document.createDocumentFragment();for(const g of filtered){let card=element('button','game');card.type='button';card.dataset.id=g.catalogId;card.appendChild(art(g));let m=element('div','meta');m.appendChild(element('b','',g.gameName));m.appendChild(element('small','',(g.declaredPlatforms||[]).join(' • ').toUpperCase()));m.appendChild(element('span','state','Profil préparé'));card.appendChild(m);card.addEventListener('click',()=>show(g));fragment.appendChild(card)}out.appendChild(fragment);if(selected)document.querySelectorAll('.game').forEach(el=>el.classList.toggle('selected',Number(el.dataset.id)===selected.catalogId))}\n$('query').addEventListener('input',render);$('filter').addEventListener('change',render);\n$('navSite').addEventListener('click',()=>location.href='https://cmd-hosting-web-production.up.railway.app/');$('navJson').addEventListener('click',()=>location.href='/api/preproduction/games');\nasync function start(){try{const res=await fetch('/api/preproduction/games',{headers:{accept:'application/json'}});if(!res.ok)throw Error(\"API \"+res.status);const doc=await res.json();if(!Array.isArray(doc.games))throw Error(\"Catalogue incomplet\");games=doc.games;$('count').textContent=games.length.toLocaleString('fr-FR');render();show(games.find(g=>g.catalogId===Number(qs.get('jeu')))||games[0])}catch(e){$('count').textContent='0';$('games').replaceChildren(element('div','empty','Le catalogue est momentanément indisponible : '+e.message))}}\nstart();\n})();\n</script></body></html>";
async function handle(request) {
const origin = request.headers.get("origin") || "";
if(request.method==="OPTIONS") return new Response(null,{status:204,headers:cors(origin)});
if(request.method!=="GET" && request.method!=="POST") return answer({error:"method_not_allowed"},405,origin);
if(!throttle(request)) return answer({error:"rate_limited"},429,origin);
const url = new URL(request.url);
const path = url.pathname;
const query = url.searchParams;
if(path==="/mods/autres-jeux")return new Response(cmdOtherModsPage,{status:200,headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","content-security-policy":"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
if(path==="/preproduction/jeux") {
if(request.method!=="GET")return answer({error:"method_not_allowed"},405,origin);
return new Response(cmdUiMarkup,{status:200,headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","content-security-policy":"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' https://shared.fastly.steamstatic.com https://cdn.cloudflare.steamstatic.com; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors https://cmd-hosting-web-production.up.railway.app "}});
}
if(path==="/api/preproduction/nintendo"||path==="/api/preproduction/status"||path==="/api/preproduction/games"||/^\/api\/preproduction\/games\/[0-9]+$/.test(path)){
if(request.method!=="GET")return answer({error:"method_not_allowed"},405,origin);
return cmdBlueprintsApi(path,query,origin);
}
if(["/api/mods/games","/api/mods/games/catalogue","/api/mods/games/profile","/api/mods/games/search"].includes(path)){
if(request.method!=="GET")return answer({error:"method_not_allowed"},405,origin);
const game=(query.get("game")||"").trim(),platform=query.get("platform")||"pc";
if(path==="/api/mods/games")return answer({version:"1.0",writesEnabled:false,excluded:["DayZ","Arma","ARK"],games:OTHER_GAME_MOD_PROVIDERS.map(x=>otherGameModProfile(x[1]))},200,origin);
if(path==="/api/mods/games/catalogue"){
try{const games=await cmdGameCatalog();return answer({total:games.length,mods:games.map(g=>({catalogId:g.id,catalogueName:g.name,gameKey:g.key,...otherGameModProfile(g.name,platform)})),writesEnabled:false},200,origin);}
catch{return answer({error:"catalogue_unavailable"},503,origin);}
}
if(!game||game.length>120)return answer({error:"game_required"},400,origin);
const profile=otherGameModProfile(game,platform);
if(path==="/api/mods/games/profile")return answer(profile,200,origin);
try{return await otherGameModLookup(profile,(query.get("q")||"").trim(),bounded(query.get("page"),1,1,100),origin);}
catch(e){if(["TimeoutError","AbortError"].includes(e?.name))return answer({error:"provider_timeout",profile},504,origin);
return answer({error:"provider_unavailable",providerStatus:e?.providerStatus||null,profile},502,origin);}
}
/*CMD_MODS_WINDOWS_AGENT_DISTRIBUTION_V2*/
/*CMD_MODS_WINDOWS_INSTALLER_CMD_V1*/
if(path==="/installer-cmd-hosting-mods.cmd") return new Response("@echo off\nsetlocal\nchcp 65001 >nul\ntitle CMD Hosting - Installation et diagnostic des mods\nset \"SCRIPT=%TEMP%\\cmd-hosting-mods-agent.ps1\"\nset \"SOURCE=https://cmd-hosting-mods-api-production.up.railway.app/cmd-hosting-mods-agent.ps1\"\necho.\necho ===== CMD HOSTING : AGENT MODS =====\necho Telechargement du fichier actuel depuis Railway...\npowershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"$ProgressPreference='SilentlyContinue'; try { Invoke-WebRequest -UseBasicParsing -Uri '%SOURCE%' -OutFile '%SCRIPT%' -TimeoutSec 30; exit 0 } catch { Write-Host $_.Exception.Message; exit 1 }\"\nif errorlevel 1 (\n echo Impossible de recuperer l'agent depuis Railway.\n pause\n exit /b 1\n)\nif not exist \"%SCRIPT%\" (\n echo Fichier absent apres telechargement.\n pause\n exit /b 1\n)\necho.\necho ===== DIAGNOSTIC =====\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File \"%SCRIPT%\" -Diagnose\necho.\nchoice /C ON /M \"Installer l'agent mods sur ce PC ? O=oui, N=non\"\nif errorlevel 2 exit /b 0\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File \"%SCRIPT%\" -Install\nif errorlevel 1 (\n echo.\n echo Installation impossible. Consulte le message d'erreur ci-dessus.\n) else (\n echo.\n echo Agent installe. Les mods seront synchronises quand les jeux seront configures.\n)\npause\n",{status:200,headers:{"content-type":"application/octet-stream","content-disposition":"attachment; filename=Installer_CMD_Hosting_Mods.cmd","cache-control":"no-store","x-content-type-options":"nosniff"}});
if(path==="/cmd-hosting-mods-agent.ps1") return new Response("# CMD Hosting - Mods Agent for Windows (DayZ PC / ARK Survival Ascended)\n# Run -Install once. Thereafter Windows Task Scheduler runs -Once every 10 minutes.\n# Never stores a Steam password or restarts a game while players may be connected.\n[CmdletBinding()]\nparam(\n [switch]$Install,\n [switch]$Once,\n [switch]$Diagnose,\n [string]$ServersFile = '',\n [string]$SteamCmdExe = '',\n [string]$SteamUser = '',\n [string]$ApiUrl = 'https://cmd-hosting-mods-api-production.up.railway.app'\n)\nSet-StrictMode -Version Latest\n$ErrorActionPreference = 'Stop'\n$homeFolder = Join-Path $env:LOCALAPPDATA 'CMDHosting\\ModsAgent'\n$settingsFile = Join-Path $homeFolder 'settings.json'\n$secretFile = Join-Path $homeFolder 'agent-token.dpapi'\n$stateFile = Join-Path $homeFolder 'state.json'\n$logFile = Join-Path $homeFolder 'history.log'\nNew-Item -ItemType Directory -Path $homeFolder -Force | Out-Null\n\nfunction Log($message) {\n $line = '{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), [string]$message\n Write-Host $line\n Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8\n}\nfunction LoadJson($file, $fallback) {\n if (!(Test-Path -LiteralPath $file -PathType Leaf)) { return $fallback }\n try { return (Get-Content -LiteralPath $file -Raw -Encoding UTF8 | ConvertFrom-Json) }\n catch { throw \"Invalid JSON file: $file\" }\n}\nfunction SaveJson($file,$data) {\n $tmp = $file + '.tmp'\n $json = ConvertTo-Json -InputObject $data -Depth 24\n [IO.File]::WriteAllText($tmp,$json,([System.Text.UTF8Encoding]::new($false)))\n Move-Item -LiteralPath $tmp -Destination $file -Force\n}\nfunction PlainToken($secure) {\n $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)\n try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }\n finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }\n}\nfunction FindServersFile {\n $candidates=@(\n (Join-Path $env:LOCALAPPDATA 'CMDHosting\\servers.json'),\n (Join-Path $env:LOCALAPPDATA 'CMD-Hosting\\servers.json'),\n (Join-Path $env:APPDATA 'CMDHosting\\servers.json'),\n (Join-Path $env:ProgramData 'CMDHosting\\servers.json'),\n 'C:\\CMD-Hosting\\servers.json',\n 'C:\\CMD-Servers\\servers.json'\n )\n foreach ($candidate in $candidates) {\n if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }\n }\n return ''\n}\n\nfunction Show-Diagnostics {\n Write-Host 'CMD Hosting Mods Agent - Diagnostic Windows' -ForegroundColor Cyan\n Write-Host ('PowerShell version : '+$PSVersionTable.PSVersion)\n $found=$ServersFile\n if (!$found) {$found=FindServersFile}\n if (!$found -or !(Test-Path -LiteralPath $found -PathType Leaf)) {\n Write-Warning 'servers.json introuvable. La machine peut etre connectee a Railway mais aucun serveur de jeu localise.'\n Write-Host 'Relance avec -ServersFile \"C:\\chemin\\servers.json\".'\n return\n }\n Write-Host ('Fichier des serveurs : '+$found)\n try {$data=LoadJson $found $null}\n catch {Write-Warning ('JSON invalide : '+$_.Exception.Message);return}\n $entries=@($data.servers | Where-Object {$null -ne $_})\n Write-Host ('Nombre de serveurs declares : '+$entries.Count)\n if (!$entries.Count) {Write-Warning 'ZERO SERVEUR. Aucun mod ne pourra etre installe avant de configurer un serveur dans CMD Hosting Agent.'}\n foreach ($entry in $entries) {\n $exe=[string]$entry.exe\n $game=if($exe -match 'DayZServer_x64[.]exe$'){'DayZ PC'}elseif($exe -match 'ArkAscendedServer[.]exe$'){'ARK ASA'}else{'Non configure'}\n $valid=!!($exe -and (Test-Path -LiteralPath $exe -PathType Leaf))\n Write-Host (' - '+[string]$entry.id+' : '+$game+' ; executable trouve : '+$valid)\n }\n Write-Host ('Module installe : '+(Test-Path -LiteralPath $settingsFile))\n Write-Host ('Jeton enregistre : '+(Test-Path -LiteralPath $secretFile))\n if ((Test-Path -LiteralPath $settingsFile) -and (Test-Path -LiteralPath $secretFile)) {\n try {\n $saved=LoadJson $settingsFile $null\n $secure=(Get-Content -LiteralPath $secretFile -Raw | ConvertTo-SecureString)\n $key=PlainToken $secure\n $uri=([string]$saved.apiUrl).TrimEnd('/')+'/api/mods/agent/manifest'\n $result=Invoke-RestMethod -Uri $uri -Method Get -Headers @{Authorization=('Bearer '+$key)} -TimeoutSec 20\n Write-Host ('Connexion API : OK ; mods a traiter : '+@($result.items).Count) -ForegroundColor Green\n } catch {Write-Warning ('Connexion API refusee : '+$_.Exception.Message)}\n }\n try {\n $task=Get-ScheduledTask -TaskName 'CMDHostingModsAgent' -ErrorAction Stop\n Write-Host ('Tache Windows : '+$task.State)\n }catch{Write-Host 'Tache Windows : non installee'}\n}\nif ($Diagnose) {Show-Diagnostics; exit 0}\n\nif ($Install) {\n if (!$ServersFile) { $ServersFile=FindServersFile }\n if (!$ServersFile) { $ServersFile=Read-Host 'Full path to existing CMD Hosting servers.json' }\n if (!(Test-Path -LiteralPath $ServersFile -PathType Leaf)) {\n throw 'CMD Hosting servers.json not found. Configure the existing CMD Hosting Agent first.'\n }\n $detected=LoadJson $ServersFile $null\n $entries=@($detected.servers | Where-Object {$null -ne $_})\n if (!$entries.Count) {\n Write-Warning 'Machine associee, mais ZERO serveur dans servers.json.'\n throw 'Configure le chemin du serveur DayZ PC ou ARK ASA dans CMD Hosting Agent avant d installer ce module.'\n }\n foreach ($entry in $entries) {\n $exe=[string]$entry.exe\n if ($exe -and !(Test-Path -LiteralPath $exe -PathType Leaf)) {\n Write-Warning ('Serveur '+$entry.id+' : executable introuvable '+$exe)\n }\n }\n Write-Host 'Diagnostic initial :'\n Show-Diagnostics\n\n if (!$SteamCmdExe) {\n foreach($candidate in @('C:\\SteamCMD\\steamcmd.exe','C:\\steamcmd\\steamcmd.exe','C:\\CMD-Servers\\steamcmd\\steamcmd.exe')) {\n if (Test-Path -LiteralPath $candidate -PathType Leaf) { $SteamCmdExe=$candidate;break }\n }\n }\n if (!$SteamCmdExe) { $SteamCmdExe=Read-Host 'Full path to steamcmd.exe (required for DayZ PC)' }\n if (!$SteamUser) { $SteamUser=Read-Host 'Steam account name used by SteamCMD (password is never stored)' }\n if (!(Test-Path -LiteralPath $secretFile -PathType Leaf)) {\n Write-Host 'Get CMD_MODS_AGENT_TOKEN from Railway > CMD Hosting > cmd-hosting-mods-api > Variables.'\n $credential=Read-Host 'Private CMD Mods Agent token' -AsSecureString\n if (!$credential -or !(PlainToken $credential)) { throw 'Pairing token missing' }\n ConvertFrom-SecureString -SecureString $credential | Set-Content -LiteralPath $secretFile -Encoding UTF8\n }\n SaveJson $settingsFile @{\n apiUrl=$ApiUrl.TrimEnd('/'); serversFile=(Resolve-Path -LiteralPath $ServersFile).Path\n steamCmdExe=$SteamCmdExe; steamUser=$SteamUser\n }\n $installedFile=Join-Path $homeFolder 'cmd-hosting-mods-agent.ps1'\n if ($PSCommandPath -ne $installedFile) { Copy-Item -LiteralPath $PSCommandPath -Destination $installedFile -Force }\n $engine=Join-Path $env:SystemRoot 'System32\\WindowsPowerShell\\v1.0\\powershell.exe'\n $action=New-ScheduledTaskAction -Execute $engine -Argument ('-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File \"'+$installedFile+'\" -Once')\n $trigger=New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(2)) -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration (New-TimeSpan -Days 3650)\n $principal=New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited\n\n # Confirme les droits et la communication avant la tache planifiee.\n try {\n $sec=(Get-Content -LiteralPath $secretFile -Raw | ConvertTo-SecureString)\n $token=PlainToken $sec\n $manifest=Invoke-RestMethod -Uri ($ApiUrl.TrimEnd('/')+'/api/mods/agent/manifest') -Method Get -Headers @{Authorization=('Bearer '+$token)} -TimeoutSec 20\n Write-Host ('Connexion API : OK. Mods en attente : '+@($manifest.items).Count) -ForegroundColor Green\n } catch {\n throw ('Connexion du module impossible. Verifie CMD_MODS_AGENT_TOKEN dans Railway. Detail : '+$_.Exception.Message)\n }\n Register-ScheduledTask -TaskName 'CMDHostingModsAgent' -Description 'Automatic DayZ PC and ARK ASA mod synchronization for CMD Hosting' -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null\n Log 'Tache Windows installee. Aucun fichier de jeu modifie pendant la configuration.'\n exit 0\n}\nif (!(Test-Path -LiteralPath $settingsFile) -or !(Test-Path -LiteralPath $secretFile)) {\n throw 'Run this script once with -Install, then select a CMD Hosting server.'\n}\n$config=LoadJson $settingsFile $null\nif (!$config -or !$config.serversFile) { throw 'Missing settings' }\n$secureToken=(Get-Content -LiteralPath $secretFile -Raw -Encoding UTF8).Trim() | ConvertTo-SecureString\n$apiKey=PlainToken $secureToken\n$api=([string]$config.apiUrl).TrimEnd('/')\n$headers=@{Authorization='Bearer '+$apiKey}\n$apiKey=$null\n\nfunction ReportResult($mod,$status) {\n try {\n $payload=@{modId=[string]$mod.modId;state=[string]$status} | ConvertTo-Json -Compress\n Invoke-RestMethod -Method Post -Uri \"$api/api/mods/agent/report\" -Headers $headers -ContentType 'application/json' -Body $payload -TimeoutSec 20 | Out-Null\n } catch { Log ('Failed to send installation status: '+$_.Exception.Message) }\n}\nfunction IsGameRunning($executable) {\n if (!$executable) { return $false }\n $name=[IO.Path]::GetFileNameWithoutExtension([string]$executable)\n return @((Get-Process -Name $name -ErrorAction SilentlyContinue)).Count -gt 0\n}\nfunction BackupServers($path) {\n Copy-Item -LiteralPath $path -Destination ($path+'.mods-backup-'+(Get-Date -Format 'yyyyMMddHHmmss')) -ErrorAction Stop\n}\nfunction MatchServer($target,$entries,$gameKey) {\n $matches=@($entries | Where-Object {$_.id -eq $target})\n if ($matches.Count -eq 1) { return $matches[0] }\n $fallback=@($entries | Where-Object {$_.id -eq $gameKey})\n if ($fallback.Count -eq 1) { return $fallback[0] }\n return $null\n}\nfunction FindSteamCmd($candidate) {\n if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {return (Resolve-Path -LiteralPath $candidate).Path}\n $known=Get-Command steamcmd.exe -ErrorAction SilentlyContinue\n if ($known) {return $known.Source}\n return $null\n}\nfunction InstallDayZ($mod,$server,$steamExe,$steamAccount) {\n $id=[string]$mod.itemId\n if ($id -notmatch '^[1-9][0-9]{0,19}$') {throw 'Invalid Steam Workshop mod ID'}\n if (!$steamExe) {throw 'SteamCMD is not configured'}\n if (!$steamAccount) {throw 'Steam username is not configured'}\n $serverExe=[string]$server.exe\n if ([IO.Path]::GetFileName($serverExe) -ine 'DayZServer_x64.exe') {\n throw 'This server is not configured as a DayZ PC dedicated server'\n }\n if (!(Test-Path -LiteralPath $serverExe -PathType Leaf)) {throw 'DayZ server executable not found'}\n $root=[string]$server.cwd\n if (!$root) {$root=Split-Path -Parent $serverExe}\n if (!(Test-Path -LiteralPath $root -PathType Container)) {throw 'DayZ server directory missing'}\n if (IsGameRunning $serverExe) {return 'waiting'}\n Log ('SteamCMD DayZ 221100 workshop item '+$id)\n & $steamExe '+force_install_dir' $root '+login' $steamAccount '+workshop_download_item' '221100' $id 'validate' '+quit' | Out-Null\n if ($LASTEXITCODE -ne 0) {throw ('SteamCMD failed (exit '+$LASTEXITCODE+'). Log in to SteamCMD interactively first if Steam Guard is required.')}\n $steamRoot=Split-Path -Parent $steamExe\n $sources=@(\n (Join-Path $root ('steamapps\\workshop\\content\\221100\\'+$id)),\n (Join-Path $steamRoot ('steamapps\\workshop\\content\\221100\\'+$id))\n )\n $src=$null\n foreach ($candidate in $sources) {\n if (Test-Path -LiteralPath $candidate -PathType Container) {$src=$candidate;break}\n }\n if (!$src) {throw 'Workshop download directory not found; check SteamCMD installation path'}\n $name='@CMD_'+$id\n $link=Join-Path $root $name\n if (!(Test-Path -LiteralPath $link)) {\n New-Item -ItemType Junction -Path $link -Target $src -ErrorAction Stop | Out-Null\n }\n $keysDir=Join-Path $root 'keys'\n New-Item -ItemType Directory -Path $keysDir -Force | Out-Null\n Get-ChildItem -LiteralPath $src -Filter '*.bikey' -Recurse -File | ForEach-Object {\n $target=Join-Path $keysDir $_.Name\n if (!(Test-Path -LiteralPath $target)) { Copy-Item -LiteralPath $_.FullName -Destination $target }\n }\n $rawArgs=[string]$server.args\n $rx='(?i)(?:^|\\s)-mod=(?:\"([^\"]*)\"|(\\S+))'\n $existing=@()\n $match=[regex]::Match($rawArgs,$rx)\n if ($match.Success) {\n $value=($match.Groups[1].Value + $match.Groups[2].Value)\n $existing=@($value.Split(';') | Where-Object {$_})\n }\n if ($existing -notcontains $name) {$existing+= $name}\n $argsWithoutMods=[regex]::Replace($rawArgs,$rx,'').Trim()\n $server.args=($argsWithoutMods+' -mod=\"'+($existing -join ';')+'\"').Trim()\n return 'installed'\n}\nfunction ConfigureArk($group,$server,$oldState,$gameId) {\n $exe=[string]$server.exe\n if ([IO.Path]::GetFileName($exe) -ine 'ArkAscendedServer.exe') {throw 'Not an ARK Survival Ascended server'}\n if (!(Test-Path -LiteralPath $exe -PathType Leaf)) {throw 'ARK ASA executable missing'}\n if (IsGameRunning $exe) {return 'waiting'}\n $valid=@($group | Where-Object {$_.itemId -match '^[1-9][0-9]{0,12}$'})\n if ($valid.Count -ne $group.Count) {throw 'Invalid CurseForge ID in ARK configuration'}\n $wanted=@($valid | ForEach-Object {[string]$_.itemId} | Select-Object -Unique)\n $allArgs=[string]$server.args\n $rx='(?i)(?:^|\\s)-mods=(?:\"([0-9,]*)\"|([0-9,]*))'\n $hit=[regex]::Match($allArgs,$rx)\n $existing=@()\n if ($hit.Success) { $existing=@(($hit.Groups[1].Value+$hit.Groups[2].Value).Split(',') | Where-Object {$_}) }\n $previous=@($oldState.arkManagedByGame[$gameId] | ForEach-Object {[string]$_})\n $external=@($existing | Where-Object {$previous -notcontains $_})\n $combined=@($external + $wanted | Select-Object -Unique)\n $without=[regex]::Replace($allArgs,$rx,'').Trim()\n if ($combined.Count) { $server.args=($without+' -mods='+($combined -join ',')).Trim() }\n else {$server.args=$without}\n $oldState.arkManagedByGame[$gameId]=@($wanted)\n return 'configured' # ARK itself downloads the selected mods at its next startup.\n}\n\ntry {\n $manifest=Invoke-RestMethod -Uri \"$api/api/mods/agent/manifest\" -Method Get -Headers $headers -TimeoutSec 25\n if (!$manifest -or !$manifest.items) {Log 'No enabled DayZ PC / ARK mods require synchronization.';exit 0}\n $items=@($manifest.items)\n $agentFile=[string]$config.serversFile\n if (!(Test-Path -LiteralPath $agentFile -PathType Leaf)) {throw 'Original CMD Hosting servers.json is unavailable'}\n $settings=LoadJson $agentFile $null\n $servers=@($settings.servers)\n if (!$servers.Count) {Log 'No game server declared by CMD Hosting Agent. No mod installation was attempted.';exit 0}\n $state=LoadJson $stateFile $null\n if (!$state) { $state=@{records=@{};arkManagedByGame=@{}} }\n # ConvertFrom-Json returns PSCustomObject; make the mutable state a hashtable.\n $records=@{}\n if ($state.records) {\n if ($state.records -is [System.Collections.IDictionary]) {foreach ($key in $state.records.Keys) {$records[$key]=$state.records[$key]}}\n else {foreach ($property in $state.records.PSObject.Properties) {$records[$property.Name]=$property.Value}}\n }\n $arkManagedByGame=@{}\n if ($state.arkManagedByGame) {\n if ($state.arkManagedByGame -is [System.Collections.IDictionary]) {foreach($key in $state.arkManagedByGame.Keys){$arkManagedByGame[$key]=@($state.arkManagedByGame[$key])}}\n else {foreach($property in $state.arkManagedByGame.PSObject.Properties){$arkManagedByGame[$property.Name]=@($property.Value)}}\n }\n $state=@{records=$records;arkManagedByGame=$arkManagedByGame}\n $changed=$false\n $steamExe=FindSteamCmd ([string]$config.steamCmdExe)\n $steamAccount=[string]$config.steamUser\n foreach ($group in ($items | Group-Object gameId)) {\n $members=@($group.Group)\n $first=$members[0]\n $server=MatchServer ([string]$first.serverId) $servers ([string]$first.gameKey)\n if (!$server) {\n Log ('Server not mapped for '+[string]$first.gameName+'. No files changed.')\n foreach ($m in $members) {ReportResult $m 'waiting'}\n continue\n }\n if ($first.gameKey -eq 'dayz') {\n foreach ($mod in $members) {\n $entryKey=[string]$mod.modId\n $frequency=[Math]::Max(30,[Math]::Min(1440,[int]$mod.frequencyMinutes))\n $previous=$records[$entryKey]\n if ($previous -and (!$mod.autoUpdate) -and $previous.status -eq 'installed' -and $previous.version -eq ([string]$mod.version)) {continue}\n if ($previous -and $previous.status -eq 'installed' -and $previous.version -eq ([string]$mod.version)) {\n $elapsed=(Get-Date)-(Get-Date $previous.at)\n if ($elapsed.TotalMinutes -lt $frequency) {continue}\n }\n try {\n $beforeArgs=[string]$server.args\n $status=InstallDayZ $mod $server $steamExe $steamAccount\n if ([string]$server.args -ne $beforeArgs) {$changed=$true}\n if ($status -eq 'installed') {\n $records[$entryKey]=@{version=[string]$mod.version;status=$status;at=(Get-Date).ToString('o')}\n Log ('DayZ mod installed on disk and configured: '+[string]$mod.itemId)\n }\n ReportResult $mod $status\n } catch {\n Log ('DayZ mod '+[string]$mod.itemId+': '+$_.Exception.Message)\n ReportResult $mod 'failed'\n }\n }\n } elseif ($first.gameKey -eq 'ark') {\n try {\n $oldArgs=[string]$server.args\n $status=ConfigureArk $members $server $state ([string]$first.gameId)\n if ([string]$server.args -ne $oldArgs) {$changed=$true}\n foreach ($mod in $members) {\n $records[[string]$mod.modId]=@{version=[string]$mod.version;status=$status;at=(Get-Date).ToString('o')}\n ReportResult $mod $status\n }\n Log ('ARK CurseForge mods '+$status+'. ARK downloads them on next successful startup.')\n } catch {\n Log ('ARK configuration: '+$_.Exception.Message)\n foreach ($mod in $members) {ReportResult $mod 'failed'}\n }\n }\n }\n if ($changed) {\n BackupServers $agentFile\n SaveJson $agentFile $settings\n Log 'CMD Hosting servers.json updated safely (backup kept). Restart games during maintenance.'\n }\n SaveJson $stateFile $state\n} catch {\n Log ('Synchronization error: '+$_.Exception.Message)\n exit 1\n}",{status:200,headers:{"content-type":"text/plain; charset=utf-8","content-disposition":"attachment; filename=cmd-hosting-mods-agent.ps1","cache-control":"no-store","x-content-type-options":"nosniff"}});
if(path==="/api/mods/agent/manifest"||path==="/api/mods/agent/report") {
const expected=Bun.env.CMD_MODS_AGENT_TOKEN||"";
const supplied=request.headers.get("authorization")||"";
const required="Bearer "+expected;
let matched=!!expected&&supplied.length===required.length;
if(matched){let diff=0;for(let i=0;i<required.length;i++)diff|=supplied.charCodeAt(i)^required.charCodeAt(i);matched=diff===0;}
if(!matched) return answer({error:"agent_not_authorized"},401,origin);
if(!Bun.env.CMD_MODS_DATABASE_URL) return answer({error:"mods_database_not_configured"},503,origin);
const {SQL}=await import("bun");
const db=new SQL(Bun.env.CMD_MODS_DATABASE_URL,{max:1,connect_timeout:8,idle_timeout:3});
try {
if(path==="/api/mods/agent/manifest") {
if(request.method!=="GET")return answer({error:"method_not_allowed"},405,origin);
const rows=await db`select m.id as mod_id,g.id as game_id,g.game_key,g.platform,g.display_name,
coalesce(nullif(g.agent_server_id,''),'cmd-'||g.game_key||'-'||substring(g.id::text,1,8)) as agent_server_id,
m.provider,m.item_id,m.app_id,m.title,m.version,m.install_state,m.auto_update,
m.updated_at,p.frequency_minutes,p.restart_policy
from cmd_hosting_mods m
join cmd_hosting_game_library g on g.id=m.game_id and g.account_id=m.account_id
left join cmd_hosting_mod_preferences p on p.game_id=g.id and p.account_id=g.account_id
where m.enabled=true and ((g.game_key='dayz' and g.platform='pc' and m.provider='steam') or
(g.game_key='ark' and m.provider='curseforge'))
order by g.id,m.created_at limit 300`;
return answer({service:"CMD Hosting Mods Agent",version:"2.0.0",
generatedAt:new Date().toISOString(),items:rows.map(r=>({
modId:String(r.mod_id),gameId:String(r.game_id),gameKey:r.game_key,
platform:r.platform,gameName:r.display_name,serverId:r.agent_server_id,
provider:r.provider,itemId:r.item_id,appId:r.app_id,title:r.title,
version:r.version||"",installState:r.install_state||"pending",
autoUpdate:r.auto_update!==false,updatedAt:r.updated_at,
frequencyMinutes:Number(r.frequency_minutes)||60,
restartPolicy:r.restart_policy||"manual"
}))},200,origin);
}
if(request.method!=="POST")return answer({error:"method_not_allowed"},405,origin);
const raw=await request.text();
if(raw.length>2048)return answer({error:"request_too_large"},413,origin);
let payload={};try{payload=JSON.parse(raw)}catch{return answer({error:"invalid_json"},400,origin)}
const id=String(payload.modId||"");
const state=String(payload.state||"");
if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(id)||!["installed","configured","failed","waiting"].includes(state))
return answer({error:"invalid_install_result"},400,origin);
const rows=await db`update cmd_hosting_mods m set install_state=${state}
where m.id=${id}::uuid and m.enabled=true and exists(
select 1 from cmd_hosting_game_library g
where g.id=m.game_id and g.account_id=m.account_id
and ((g.game_key='dayz' and g.platform='pc' and m.provider='steam')
or (g.game_key='ark' and m.provider='curseforge')))
returning id`;
if(!rows.length)return answer({error:"mod_not_found"},404,origin);
console.log("CMD_MODS_AGENT_REPORT "+JSON.stringify({modId:id,state}).slice(0,150));
return answer({ok:true,state},200,origin);
}catch(err){
console.log("CMD_MODS_AGENT_DB_ERROR "+String(err).slice(0,180));
return answer({error:"agent_database_error"},503,origin);
}finally{try{await db.close()}catch{}}
}
if(path==="/" || path==="/mods") return new Response("<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>CMD Hosting - Mods</title><style>\n*{box-sizing:border-box}body{margin:0;background:#080e1d;color:#e7eaff;font:16px/1.55 system-ui,sans-serif}main{max-width:1000px;margin:auto;padding:30px 16px}header{display:flex;justify-content:space-between;align-items:center;gap:15px}h1{margin:0;font-size:1.85rem}h2{font-size:1.22rem}.muted{color:#aebfdd}.panel{padding:22px;margin:18px 0;background:#131d34;border:1px solid #2c3c61;border-radius:15px}input{display:block;width:100%;max-width:600px;margin:8px 0 12px;border-radius:8px;border:1px solid #53658b;background:#0b1325;color:white;padding:11px;font:inherit}button,.btn{display:inline-block;border:1px solid #9b81ed;border-radius:10px;background:#603ac2;color:white;font:bold 15px system-ui;padding:11px 15px;margin:2px;cursor:pointer;text-decoration:none}.row{display:flex;flex-wrap:wrap;gap:5px}.tabs{margin-top:25px}.tab{background:#1e2944}.tab[aria-selected=true]{background:#603ac2}.hide{display:none}.msg{padding:10px 12px;border-radius:8px;background:#24334c;margin:12px 0}.bad{color:#ffb7b7}.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin-top:12px}.card{border:1px solid #405171;border-radius:12px;padding:15px;background:#0d1528}.card img{width:100%;height:130px;object-fit:cover;border-radius:6px}.card h3{margin:10px 0 0;font-size:1rem}a{color:#cdb5ff}label{font-weight:bold}@media(max-width:500px){header{display:block}h1{font-size:1.4rem}}\n</style></head><body><main><header><div><strong style=\"color:#ad8aff\">CMD HOSTING</strong><h1>Gestion des mods</h1></div><a class=\"btn\" href=\"https://cmd-hosting-web-production.up.railway.app/d/cmd\">Retour à Hosting</a></header>\n<p class=\"muted\">Catalogue officiel DayZ / Steam Workshop et CurseForge. Les clés API restent sur Railway. Pour DayZ PC, un script d'installation SteamCMD est disponible ; l'agent automatique du serveur n'est pas encore relié.</p>\n<div id=\"status\" class=\"msg\">Vérification des API…</div>\n<div class=\"tabs\" role=\"tablist\"><button class=\"tab\" id=\"bdayz\" aria-selected=\"true\">DayZ PC / Workshop</button><button class=\"tab\" id=\"bcurse\" aria-selected=\"false\">CurseForge</button></div>\n<section id=\"dayz\" class=\"panel\"><h2>Rechercher un mod DayZ</h2><label for=\"id\">ID Steam Workshop</label><input id=\"id\" inputmode=\"numeric\" placeholder=\"ID numérique du Workshop\"><div class=\"row\"><button id=\"byid\">Afficher et installer</button><a class=\"btn\" target=\"_blank\" rel=\"noopener\" href=\"https://steamcommunity.com/app/221100/workshop/\">Ouvrir Steam Workshop</a></div>\n<label for=\"q\">Nom du mod</label><input id=\"q\" placeholder=\"Nom du mod\"><div class=\"row\"><button id=\"search\">Recherche API</button><button id=\"websearch\">Recherche Steam sans clé</button></div><div id=\"dayzresult\" role=\"status\"></div></section>\n<section id=\"curse\" class=\"panel hide\"><h2>Mods CurseForge</h2><p class=\"muted\">L'API CurseForge nécessite une clé développeur et un identifiant de jeu pris dans son catalogue.</p><label for=\"game\">Identifiant du jeu</label><input id=\"game\" inputmode=\"numeric\" placeholder=\"ID du jeu dans CurseForge\"><label for=\"cq\">Nom du mod</label><input id=\"cq\" placeholder=\"Nom du mod\"><div class=\"row\"><button id=\"games\">Lister les jeux</button><button id=\"cs\">Rechercher</button></div><div id=\"curseresult\" role=\"status\"></div></section>\n<p class=\"muted\">DayZ PlayStation et Xbox : les mods Steam Workshop ne sont pas compatibles avec les versions consoles. Les commandes de modification des serveurs distants restent désactivées tant qu'un agent autorisé n'est pas connecté.</p>\n</main><script>\n(()=>{'use strict';const $=x=>document.getElementById(x), node=(tag,t)=>{let e=document.createElement(tag);if(t!=null)e.textContent=String(t);return e}, set=(x,t,err=false)=>{x.replaceChildren();let e=node('p',t);if(err)e.className='bad';x.append(e);},list=(x)=>{x.replaceChildren();let d=node('div');d.className='cards';x.append(d);return d};\nconst btn=(t,fn)=>{let e=node('button',t);e.onclick=fn;return e;},a=(t,u)=>{let e=node('a',t);e.href=u;e.target='_blank';e.rel='noopener';return e;};\nasync function call(u){let r=await fetch(u,{credentials:'omit'}),v=await r.json();if(!r.ok)throw Error(v.error==='steam_web_api_key_required'?'Clé Steam nécessaire sur Railway ; utilise la recherche Steam sans clé.':v.error==='curseforge_api_key_required'?'Clé CurseForge nécessaire sur Railway.':v.message||v.error||('HTTP '+r.status));return v}\nfunction card(i,target,kind){let c=node('article');c.className='card';let img=kind==='dayz'?i.preview_url:i.logo?.thumbnailUrl;if(img){let m=node('img');m.src=img;m.alt='';m.loading='lazy';c.append(m)}c.append(node('h3',i.title||i.name||'Mod'));if(kind==='dayz'){c.append(node('p','Workshop ID : '+i.publishedfileid));c.append(a('Voir sur Steam','https://steamcommunity.com/sharedfiles/filedetails/?id='+i.publishedfileid));c.append(node('p'));c.append(btn('Installation DayZ PC (.ps1)',()=>{location.href='/api/mods/dayz/install.ps1?ids='+i.publishedfileid}))}else{c.append(node('p',(i.summary||'').slice(0,180)));c.append(btn('Voir les fichiers',async()=>{try{let r=await call('/api/mods/curseforge/mod/'+i.id+'/files');c.replaceChildren(node('h3',i.name));for(let f of (r.data||[]).slice(0,30)){let b=node('div');b.className='msg';b.append(node('div',f.fileName||f.id));b.append(btn('Téléchargement',async()=>{try{let u=await call('/api/mods/curseforge/mod/'+i.id+'/files/'+f.id+'/download-url');if(u.data)window.open(u.data,'_blank','noopener');else alert('Téléchargement non autorisé pour ce fichier')}catch(e){alert(e.message)}}));c.append(b)}}catch(e){set(target,e.message,true)}}))}return c}\nfunction tabs(curse){$('dayz').classList.toggle('hide',curse);$('curse').classList.toggle('hide',!curse);$('bdayz').setAttribute('aria-selected',String(!curse));$('bcurse').setAttribute('aria-selected',String(curse))}\n$('bdayz').onclick=()=>tabs(false);$('bcurse').onclick=()=>tabs(true);\n$('byid').onclick=async()=>{let id=$('id').value.trim(),t=$('dayzresult');if(!/^[1-9][0-9]{0,19}$/.test(id))return set(t,'Identifiant Workshop invalide.',true);set(t,'Chargement…');try{let r=await call('/api/mods/dayz/mod/'+id);list(t).append(card(r.item,t,'dayz'))}catch(e){set(t,e.message,true)}};\n$('websearch').onclick=()=>{window.open('https://steamcommunity.com/workshop/browse/?appid=221100&searchtext='+encodeURIComponent($('q').value.trim()),'_blank','noopener')};\n$('search').onclick=async()=>{let q=$('q').value.trim(),t=$('dayzresult');if(!q)return set(t,'Entre le nom du mod.',true);set(t,'Recherche…');try{let r=await call('/api/mods/dayz/search?q='+encodeURIComponent(q));let d=list(t);for(let i of(r.results?.publishedfiledetails||[]))d.append(card(i,t,'dayz'));if(!d.children.length)set(t,'Aucun mod trouvé')}catch(e){set(t,e.message,true)}};\n$('games').onclick=async()=>{let t=$('curseresult');set(t,'Chargement…');try{let r=await call('/api/mods/curseforge/games'),d=list(t);for(let g of(r.data||[]).slice(0,100)){let c=node('div');c.className='card';c.append(node('h3',g.name));c.append(node('p','ID : '+g.id));c.append(btn('Choisir',()=>{$('game').value=g.id}));d.append(c)}}catch(e){set(t,e.message,true)}};\n$('cs').onclick=async()=>{let id=$('game').value.trim(),q=$('cq').value.trim(),t=$('curseresult');if(!/^[1-9][0-9]{0,9}$/.test(id))return set(t,'ID de jeu invalide.',true);set(t,'Recherche…');try{let r=await call('/api/mods/curseforge/search?gameId='+id+'&q='+encodeURIComponent(q)),d=list(t);for(let i of(r.data||[]))d.append(card(i,t,'curse'));if(!d.children.length)set(t,'Aucun mod trouvé')}catch(e){set(t,e.message,true)}};\ncall('/api/mods/status').then(r=>{let p=r.providers;set($('status'),'DayZ par ID : prêt · Recherche Steam : '+(p.dayz_workshop_search==='configured'?'configurée':'clé nécessaire')+' · CurseForge : '+(p.curseforge==='access_denied'?'accès refusé':p.curseforge==='configured'?'clé présente, accès à vérifier':'clé nécessaire'))}).catch(e=>set($('status'),e.message,true));\n})();\n</script></body></html>",{status:200,headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","content-security-policy":"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src https:; base-uri 'none'; object-src 'none'"}});
if(path==="/api/mods/dayz/install.ps1") {
const ids=(query.get("ids")||"").split(",").map(x=>x.trim()).filter(Boolean);
if(!ids.length || ids.length>20 || ids.some(x=>!positiveId(x))) return answer({error:"invalid_mod_ids"},400,origin);
const uniques=[...new Set(ids)];
const script="# CMD Hosting DayZ PC Workshop Installer\n# Installer uniquement sur la machine qui heberge le serveur DayZ.\nparam([string]$ServerDir=\"\", [string]$SteamCmdExe=\"steamcmd.exe\",[string]$SteamUser=\"\")\n$ErrorActionPreference=\"Stop\"\n$ModIds=@(__IDS__)\nif (-not $ServerDir) {$ServerDir=Read-Host \"Dossier du serveur DayZ PC\"}\nif (-not (Test-Path -LiteralPath $ServerDir -PathType Container)) {throw \"Dossier introuvable\"}\n$ServerDir=(Resolve-Path -LiteralPath $ServerDir).Path\nif (-not (Get-Command $SteamCmdExe -ErrorAction SilentlyContinue)) {$SteamCmdExe=Read-Host \"Chemin de steamcmd.exe\"}\nif (-not (Get-Command $SteamCmdExe -ErrorAction SilentlyContinue)) {throw \"SteamCMD introuvable\"}\nif (-not $SteamUser) {$SteamUser=Read-Host \"Compte Steam utilise pour les mods\"}\nif (-not $SteamUser) {throw \"Compte Steam requis\"}\n$modPaths=New-Object System.Collections.Generic.List[string]\nforeach ($id in $ModIds) {\n Write-Host \"Telechargement Steam Workshop $id\"\n & $SteamCmdExe +force_install_dir $ServerDir +login $SteamUser +workshop_download_item 221100 $id validate +quit\n if ($LASTEXITCODE -ne 0) {throw \"Echec SteamCMD pour $id\"}\n $steamRoot=Split-Path -Parent ((Get-Command $SteamCmdExe).Source)\n $sources=@((Join-Path $ServerDir \"steamapps\\workshop\\content\\221100\\$id\"),(Join-Path $steamRoot \"steamapps\\workshop\\content\\221100\\$id\"))\n $src=$null\n foreach ($try in $sources) {if(Test-Path -LiteralPath $try -PathType Container){$src=$try;break}}\n if (-not $src) {Write-Warning \"Mod $id : dossier Steam Workshop introuvable\";continue}\n $name=\"@CMD_$id\";$dest=Join-Path $ServerDir $name\n if (-not (Test-Path -LiteralPath $dest)) {New-Item -ItemType Junction -Path $dest -Target $src | Out-Null}\n $keys=Join-Path $ServerDir \"keys\"\n if (-not (Test-Path -LiteralPath $keys)) {New-Item -ItemType Directory -Path $keys | Out-Null}\n Get-ChildItem -LiteralPath $src -Recurse -File -Filter \"*.bikey\" | ForEach-Object {\n $target=Join-Path $keys $_.Name\n if (-not (Test-Path -LiteralPath $target)) {Copy-Item -LiteralPath $_.FullName -Destination $target}\n }\n $modPaths.Add($name)\n Write-Host \"Mod installe : $name\"\n}\nif ($modPaths.Count) {\n Write-Host \"A ajouter a la commande de demarrage (avec les mods deja presents) :\"\n Write-Host (\"-mod=\"+($modPaths -join \";\"))\n Write-Host \"Verifier les dependances et redemarrer le serveur hors session.\"\n} else {Write-Warning \"Aucun mod installe. Verifier SteamCMD.\"}\n".replace("__IDS__",uniques.map(x=>"'"+x+"'").join(","));
return new Response(script,{status:200,headers:{"content-type":"application/octet-stream","content-disposition":"attachment; filename=cmd-dayz-mods.ps1","cache-control":"no-store","x-content-type-options":"nosniff"}});
}
if(path==="/" || path==="/health" || path==="/api/mods/status") {
return answer({...readiness(), routes:[
"GET /api/mods/dayz/mod/{workshopId}",
"GET /api/mods/dayz/collection/{collectionId}",
"GET /api/mods/dayz/search?q={text}&page=1",
"GET /api/mods/curseforge/games",
"GET /api/mods/curseforge/search?gameId={id}&q={text}",
"GET /api/mods/curseforge/mod/{modId}",
"GET /api/mods/curseforge/mod/{modId}/files",
"GET /api/mods/curseforge/mod/{modId}/files/{fileId}/download-url"
]},200,origin);
}
try {
let match = path.match(/^\/api\/mods\/dayz\/mod\/([0-9]+)$/);
if(match) {
const id=match[1];
if(!positiveId(id)) return answer({error:"invalid_workshop_id"},400,origin);
const body = new URLSearchParams({"itemcount":"1","publishedfileids[0]":id});
const data = await upstream("https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/",{
method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body
},"dayz:mod:"+id);
const item = data?.response?.publishedfiledetails?.[0];
if(!item || Number(item.result)!==1 || ![DAYZ_APP_ID].includes(Number(item.consumer_app_id||item.creator_app_id))) {
return answer({error:"dayz_workshop_item_not_found"},404,origin);
}
return answer({provider:"steam_workshop",game:"DayZ",appId:DAYZ_APP_ID,item},200,origin);
}
match = path.match(/^\/api\/mods\/dayz\/collection\/([0-9]+)$/);
if(match) {
const id=match[1];
if(!positiveId(id)) return answer({error:"invalid_collection_id"},400,origin);
const body = new URLSearchParams({"collectioncount":"1","publishedfileids[0]":id});
const data=await upstream("https://api.steampowered.com/ISteamRemoteStorage/GetCollectionDetails/v1/",{
method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body
},"dayz:collection:"+id);
const collection=data?.response?.collectiondetails?.[0];
if(!collection || Number(collection.result)!==1) return answer({error:"collection_not_found"},404,origin);
return answer({provider:"steam_workshop",game:"DayZ",collection},200,origin);
}
if(path==="/api/mods/dayz/search") {
if(!Bun.env.STEAM_WEB_API_KEY) return answer({error:"steam_web_api_key_required",variable:"STEAM_WEB_API_KEY"},503,origin);
const q=(query.get("q")||"").trim();
if(!q || q.length>100) return answer({error:"invalid_search_query"},400,origin);
const page=bounded(query.get("page"),1,1,50);
const p=new URLSearchParams({
key:Bun.env.STEAM_WEB_API_KEY,query_type:"12",appid:String(DAYZ_APP_ID),
creator_appid:String(DAYZ_APP_ID),search_text:q,page:String(page),
numperpage:"24",return_short_description:"true",return_previews:"true"
});
const data=await upstream("https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/?"+p.toString(),{},
"dayz:search:"+page+":"+q.toLowerCase());
return answer({provider:"steam_workshop",game:"DayZ",page,results:data?.response||{}},200,origin);
}
if(path.startsWith("/api/mods/curseforge/")) {
if(!curseForgeKey()) return answer({error:"curseforge_api_key_required",variable:"CURSEFORGE_API_KEY"},503,origin);
let endpoint="";
if(path==="/api/mods/curseforge/games") endpoint="/v1/games";
else if(path==="/api/mods/curseforge/search") {
const gameId=query.get("gameId")||"";
if(!positiveId(gameId,10)) return answer({error:"gameId_required"},400,origin);
const q=(query.get("q")||"").trim();
if(q.length>100) return answer({error:"search_too_long"},400,origin);
const opts=new URLSearchParams({gameId,pageSize:String(bounded(query.get("pageSize"),24,1,50)),
index:String(bounded(query.get("index"),0,0,9950))});
if(q) opts.set("searchFilter",q);
endpoint="/v1/mods/search?"+opts.toString();
} else {
match=path.match(/^\/api\/mods\/curseforge\/mod\/([0-9]+)(?:\/files(?:\/([0-9]+)\/download-url)?)?$/);
if(!match || !positiveId(match[1],10) || (match[2]&&!positiveId(match[2],10))) {
return answer({error:"unknown_endpoint"},404,origin);
}
endpoint="/v1/mods/"+match[1];
if(path.includes("/files")) endpoint+="/files"+(match[2]?"/"+match[2]+"/download-url":"");
}
const data=await upstream("https://api.curseforge.com"+endpoint,{
headers:{"accept":"application/json","x-api-key":curseForgeKey(),"user-agent":"CMD-Hosting-Mods/1.2"}
},"curseforge:"+endpoint);
return answer({provider:"curseforge",data:data?.data??data,pagination:data?.pagination??null},200,origin);
}
return answer({error:"not_found"},404,origin);
} catch(err) {
if(err?.name==="TimeoutError" || err?.name==="AbortError") return answer({error:"provider_timeout"},504,origin);
if(path.startsWith("/api/mods/curseforge/")&&[401,403].includes(err?.providerStatus)){
curseForgeDenied(err.providerStatus);
return answer({error:"curseforge_access_denied",message:"CurseForge refuse la clé API ou ses autorisations. Vérifier son activation dans la console développeur CurseForge.",upstreamStatus:err.providerStatus,requiresProviderAuthorization:true},503,origin);
}
return answer({error:"provider_unavailable",upstreamStatus:err?.providerStatus||null},502,origin);
}
}
export {handle};
export const modsServer=Bun.serve({port:PORT,fetch:handle});
console.log("CMD Hosting Mods API ready on port "+PORT);
if (Bun.env.CMD_MODS_SELFTEST !== "off") {
(async () => {
const cases = [
["status", "/api/mods/status", 200],
["interface", "/mods", 200],
["windows-installer", "/api/mods/dayz/install.ps1?ids=1559212036", 200],
["invalid-mod-id", "/api/mods/dayz/mod/abc", 404],
["invalid-installer-id", "/api/mods/dayz/install.ps1?ids=abc", 400],
["steam-item-live", "/api/mods/dayz/mod/1559212036", 200]
];
for (const [label, path, expected] of cases) {
try {
const response = await handle(new Request("http://127.0.0.1:"+PORT+path));
const body = await response.text();
const pass = response.status===expected && (label!=="windows-installer" || body.includes("workshop_download_item 221100"));
console.log("CMD_MODS_SELFTEST "+JSON.stringify({test:label,pass,status:response.status,expected,bytes:body.length}));
} catch(error) {
console.log("CMD_MODS_SELFTEST "+JSON.stringify({test:label,pass:false,error:String(error).slice(0,150)}));
}
}
})();
}
/*CMD_MODS_AGENT_REGRESSION*/
if(Bun.env.CMD_MODS_SELFTEST!=="0") void(async()=>{
const tests=[
["unauthorized",new Request("http://127.0.0.1:"+PORT+"/api/mods/agent/manifest"),401],
["authorized-manifest",new Request("http://127.0.0.1:"+PORT+"/api/mods/agent/manifest",{headers:{"authorization":"Bearer "+(Bun.env.CMD_MODS_AGENT_TOKEN||"")}}),200],
["invalid-report",new Request("http://127.0.0.1:"+PORT+"/api/mods/agent/report",{method:"POST",headers:{"authorization":"Bearer "+(Bun.env.CMD_MODS_AGENT_TOKEN||"")} ,body:JSON.stringify({modId:"invalid",state:"installed"})}),400]
];
for(const [name,req,expected] of tests){
try{
const resp=await handle(req);
const json=await resp.json();
const pass=resp.status===expected && (name!=="authorized-manifest"||Array.isArray(json.items));
console.log("CMD_MODS_AGENT_TEST "+JSON.stringify({name,pass,status:resp.status,expected,items:name==="authorized-manifest"?json.items?.length:undefined}));
}catch(e){console.log("CMD_MODS_AGENT_TEST "+JSON.stringify({name,pass:false,error:String(e).slice(0,200)}))}
}
})();
/*CMD_MODS_WINDOWS_DOWNLOAD_SMOKETEST*/
if(Bun.env.CMD_MODS_SELFTEST!=="0") void(async()=>{try{const r=await handle(new Request("http://127.0.0.1:"+PORT+"/cmd-hosting-mods-agent.ps1"));const body=await r.text();const pass=r.status===200&&body.includes("[switch]$Diagnose")&&body.includes("CMD_MODS_AGENT_TOKEN")&&body.includes("New-ScheduledTaskTrigger")&&r.headers.get("content-disposition")?.includes("cmd-hosting-mods-agent.ps1");console.log("CMD_MODS_WINDOWS_DOWNLOAD_TEST "+JSON.stringify({pass,status:r.status,characters:body.length,hasDiagnostic:body.includes("Show-Diagnostics")}));}catch(error){console.log("CMD_MODS_WINDOWS_DOWNLOAD_TEST "+JSON.stringify({pass:false,error:String(error)}))}})();
/*CMD_WINDOWS_INSTALLER_TEST*/
if(Bun.env.CMD_MODS_SELFTEST!=="0") void(async()=>{for(const [path,expect] of [["/installer-cmd-hosting-mods.cmd","-Diagnose"],["/cmd-hosting-mods-agent.ps1","[switch]$Diagnose"]]){try{const r=await handle(new Request("http://localhost:"+PORT+path));const body=await r.text();console.log("CMD_WINDOWS_INSTALLER_TEST "+JSON.stringify({path,status:r.status,pass:r.status===200&&body.includes(expect)&&r.headers.get("content-disposition")?.includes("attachment"),bytes:body.length}));}catch(e){console.log("CMD_WINDOWS_INSTALLER_TEST "+JSON.stringify({path,pass:false,error:String(e)}))}}})();
/*CMD_PREPRODUCTION_TESTS_20261010*/
if(Bun.env.CMD_MODS_SELFTEST!=="0") void(async()=>{
const checks=[
["all-173","/api/preproduction/games",200,d=>d.total===173&&d.games?.length===173&&d.games.every(g=>g.preproductionProfile==="prepared")],
["status-173","/api/preproduction/status",200,d=>d.catalogueCount===173&&!d.realInstallationsActivated],
["asa-custom-map","/api/preproduction/games/5",200,d=>d.profile?.mapSelection.customAllowed&&d.profile?.mapSelection.choices.some(m=>m.launchName==="Astraeos_WP")],
["dayz-missions","/api/preproduction/games/29",200,d=>d.profile?.mapSelection.mode==="mission-map"&&d.profile?.configFiles.some(f=>f.relativePath==="serverDZ.cfg")],
["game-173","/api/preproduction/games/173",200,d=>d.profile?.catalogId===173&&d.profile.readyToLaunch===false],
["invalid-id","/api/preproduction/games/999999",404,d=>d.error==="game_not_found"],
["old-mod-status","/api/mods/status",200,d=>!!d.providers]
];
for(const [name,path,expected,test] of checks){
try{const res=await handle(new Request("http://127.0.0.1:"+PORT+path,{headers:{"x-forwarded-for":"selftest-20261010"}}));
const data=await res.json();const pass=res.status===expected&&!!test(data);
console.log("CMD_PREPRODUCTION_TEST "+JSON.stringify({name,pass,status:res.status,expected,catalogueCount:data.total??data.catalogueCount??null,code:data.error??null}));
}catch(e){console.log("CMD_PREPRODUCTION_TEST "+JSON.stringify({name,pass:false,error:String(e).slice(0,160)}))}
}
})();
/*CMD_GAME_VISUAL_REGRESSION_V1*/
if(Bun.env.CMD_MODS_SELFTEST!=="0") void(async()=>{const checks=[
["catalogue-ui","/preproduction/jeux",r=>r.status===200&&r.headers.get("content-type")?.includes("text/html")],
["catalogue-api","/api/preproduction/games",async r=>{const d=await r.json();return r.status===200&&d.games?.length===173&&d.games.every(g=>g.visual?.uniqueThemeKey==="game-"+g.catalogId)}],
["ark-profile","/api/preproduction/games/5",async r=>{const d=await r.json();return r.status===200&&d.profile?.mapSelection?.customAllowed&&d.profile?.visual?.uniqueThemeKey==="game-5"}]
];for(const [name,path,check] of checks){try{const r=await handle(new Request("http://localhost:"+PORT+path,{headers:{"x-forwarded-for":"visual-checks"}}));const pass=!!await check(r);console.log("CMD_GAME_VISUAL_REGRESSION "+JSON.stringify({name,pass,status:r.status}))}catch(e){console.log("CMD_GAME_VISUAL_REGRESSION "+JSON.stringify({name,pass:false,error:String(e).slice(0,240)}))}}})();
