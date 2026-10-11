/**
 * CMD Hosting — exact game-specific content definitions.
 * Safe planning only; never treats map/config selection as downloaded/installed.
 * Custom community maps need verified publisher content and installed dependencies.
 */
export const GAME_CONTENT_VERSION="1.0.0";
const stock=(id,name,options={})=>({id,name,type:"official",download:"with_server_or_authorized_dlc",...options});
const published=(id,name,options={})=>({id,name,type:"publisher_workshop",download:"publisher_managed_on_start",...options});
const CATALOG=Object.freeze({
 "dayz":{aliases:["dayz-pc"],platforms:["pc"],installer:"steamcmd",mods:"steam-workshop",
   maps:[stock("chernarusplus","Chernarus+",{mission:"dayzOffline.chernarusplus"}),
     stock("livonia","Livonia",{mission:"dayzOffline.enoch",missionRequired:true}),
     stock("sakhal","Sakhal",{mission:"dayzOffline.sakhal",missionRequired:true,dlc:"Frostline"})],
   defaultMap:"chernarusplus",modIdKind:"steam_221100"},
 "ark-asa":{aliases:["ark-survival-ascended","ark"],platforms:["pc","crossplay"],installer:"steamcmd",mods:"curseforge-asa",
   maps:[stock("the-island","The Island",{level:"TheIsland_WP"}),
      stock("the-center","The Center",{level:"TheCenter_WP"}),
      stock("scorched-earth","Scorched Earth",{level:"ScorchedEarth_WP"}),
      stock("aberration","Aberration",{level:"Aberration_WP"}),
      stock("extinction","Extinction",{level:"Extinction_WP"}),
      stock("ragnarok","Ragnarok",{level:"Ragnarok_WP"}),
      stock("valguero","Valguero",{level:"Valguero_WP"}),
      stock("genesis-part-1","Genesis Part 1",{level:"Genesis_WP"}),
      published("astraeos","Astraeos",{level:"Astraeos_WP",requiresPublishedContent:true}),
      stock("lost-colony","Lost Colony",{level:"LostColony_WP",dlc:"Lost Colony"})],
   defaultMap:"the-island",modIdKind:"curseforge_project"},
 "arma-reforger":{aliases:["reforger"],platforms:["pc","crossplay"],installer:"steamcmd",mods:"bohemia-workshop",
   maps:[stock("everon-conflict","Everon — Conflict",{scenarioId:"{ECC61978EDCC2B5A}Missions/23_Campaign.conf"}),
     stock("everon-gm","Everon — Game Master",{scenarioId:"{59AD59368755F41A}Missions/21_GM_Eden.conf"}),
     stock("arland-gm","Arland — Game Master",{scenarioId:"{2BBBE828037C6F4B}Missions/22_GM_Arland.conf"})],
   defaultMap:"everon-conflict",modIdKind:"bohemia_guid"},
 "7dtd":{aliases:["7-days-to-die"],platforms:["pc","crossplay"],installer:"steamcmd",mods:"publisher_supported_folder",
   maps:[stock("navezgane","Navezgane",{world:"Navezgane"}),
     stock("random-world","Random World",{world:"RWG",generated:true})],
   defaultMap:"navezgane",modIdKind:"manual_review"},
 "palworld":{aliases:[],platforms:["pc","crossplay"],installer:"steamcmd",mods:"publisher_supported_only",
   maps:[stock("existing-world","Existing World",{saveBased:true})],
   defaultMap:"existing-world",modIdKind:"manual_review"},
 "ark-ase":{aliases:["ark-survival-evolved"],platforms:["pc"],installer:"steamcmd",mods:"steam-workshop",
   maps:[stock("the-island","The Island",{level:"TheIsland"}),
     stock("ragnarok","Ragnarok",{level:"Ragnarok"}),
     stock("scorched-earth","Scorched Earth",{level:"ScorchedEarth_P"}),
     stock("aberration","Aberration",{level:"Aberration_P"}),
     stock("extinction","Extinction",{level:"Extinction"})],
   defaultMap:"the-island",modIdKind:"steam_346110"}
});
const ALIASES=new Map(Object.entries(CATALOG).flatMap(([id,g])=>[id,...g.aliases].map(a=>[a,id])));
export function gameKey(value){
 const key=String(value??"").toLowerCase().trim();
 return ALIASES.get(key)||null;
}
export function mapsForGame(game,platform="pc"){
 const key=gameKey(game);
 if(!key)return {status:"unsupported_game",gameKey:null,maps:[],autoInstall:false};
 const g=CATALOG[key];
 if(!g.platforms.includes(String(platform).toLowerCase()))
   return {status:"platform_provider_required",gameKey:key,maps:[],autoInstall:false};
 return {status:"supported_catalogue",gameKey:key,defaultMap:g.defaultMap,
   modProvider:g.mods,modIdKind:g.modIdKind,
   maps:g.maps.map(m=>({...m,gameKey:key})),autoInstall:false,
   note:"Listing does not grant publisher DLC/license and does not prove files exist on host."};
}
export function validateContentSelection({game,platform="pc",mapId,mods=[]}={}){
 const offered=mapsForGame(game,platform);
 if(offered.status!=="supported_catalogue")
   return {ok:false,reason:offered.status,autoInstalled:false};
 const map=offered.maps.find(x=>x.id===String(mapId||offered.defaultMap));
 if(!map)return {ok:false,reason:"map_not_available_for_game",autoInstalled:false};
 if(!Array.isArray(mods)||mods.length>100)
   return {ok:false,reason:"invalid_mod_count",autoInstalled:false};
 const unique=new Set(),clean=[];
 for(const raw of mods){
  const str=String(raw);
  let valid=false;
  if(["steam_221100","steam_346110","curseforge_project"].includes(offered.modIdKind))
    valid=/^[1-9][0-9]{0,12}$/.test(str);
  else if(offered.modIdKind==="bohemia_guid")valid=/^[0-9A-Fa-f]{16}$/.test(str);
  else return {ok:false,reason:"mods_require_publisher_review",autoInstalled:false};
  if(!valid)return {ok:false,reason:"invalid_mod_id",autoInstalled:false};
  const normalized=offered.modIdKind==="bohemia_guid"?str.toUpperCase():str;
  if(!unique.has(normalized)){clean.push(normalized);unique.add(normalized)}
 }
 if(map.requiresPublishedContent && clean.length===0)
   return {ok:false,reason:"map_publisher_mod_required",autoInstalled:false};
 return {ok:true,gameKey:offered.gameKey,platform,map,modProvider:offered.modProvider,
   modIds:clean,contentInstalled:false,mapConfigured:false,modsVerified:false,
   restartRequired:true,dlcOrEntitlementVerificationRequired:!!map.dlc,
   publisherDownloadRequired:map.type==="publisher_workshop",
   note:"Validation only. New map must be applied on host, then publisher downloads and logs verified."};
}
