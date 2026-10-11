/**
 * CMD Hosting: provider classification and integration planning.
 * Independent of the existing Lenovo, V5 and Mods agents.
 * Never claims access to a provider until a successful authenticated check.
 */
export const PROVIDERS=Object.freeze({
  local:{id:"local",type:"machine",auth:"existing-host-pairing",access:"host-agent",softwareInstall:"by-authorized-host-worker",games:"per-os-adapter"},
  oracle:{id:"oracle",type:"vm",auth:"explicit-host-enrollment",access:"host-agent",softwareInstall:"by-authorized-host-worker",games:"per-os-adapter"},
  nitrado:{id:"nitrado",type:"managed-gameserver",auth:"nitrado-api-token",access:"official-provider-api",softwareInstall:"provider-controlled",games:"per-service-entitlements"},
  genericVps:{id:"generic-vps",type:"vm",auth:"explicit-host-enrollment",access:"host-agent",softwareInstall:"by-authorized-host-worker",games:"per-os-adapter"},
  genericManaged:{id:"managed-gameserver",type:"managed-gameserver",auth:"specific-provider-credentials",access:"provider-adapter-required",softwareInstall:"provider-controlled",games:"per-service-entitlements"}
});
const aliases=new Map([
  ["local","local"],["home","local"],["lenovo","local"],["pc","local"],
  ["oci","oracle"],["oracle","oracle"],["oracle-cloud","oracle"],["oracle cloud infrastructure","oracle"],
  ["nitrado","nitrado"],["nitrado.net","nitrado"],
  ["vps","genericVps"],["vds","genericVps"],["dedicated","genericVps"],
  ["gportal","genericManaged"],["g-portal","genericManaged"],["shockbyte","genericManaged"],["other-provider","genericManaged"]
]);
export function resolveProvider(value){
  if(typeof value!=="string"||value.length>100)throw Error("Invalid hosting provider");
  const provider=aliases.get(value.toLowerCase().trim());
  if(!provider)throw Error("Hosting provider not configured");
  return {...PROVIDERS[provider]};
}
export function providerPlan({provider,platform="pc",gameKey="",accountConnected=false,vmEnrolled=false}={}){
 const p=resolveProvider(provider);
 const game=String(gameKey).trim().toLowerCase();
 const platformKey=String(platform).toLowerCase().trim();
 const consoles=new Set(["xbox","xbox-one","xbox-series","ps","ps4","ps5","playstation","switch","switch2","nintendo"]);
 const nonPC=consoles.has(platformKey);
 const isManaged=p.type==="managed-gameserver";
 const attached=isManaged?accountConnected===true:vmEnrolled===true;
 let status="requires_authorization";
 if(p.id==="nitrado"&&nonPC)status=attached?"provider_game_compatibility_required":"requires_nitrado_service_authorization";
 else if(isManaged)status=attached?"provider_service_discovery_required":"requires_provider_api_authorization";
 else if(nonPC)status="console_provider_required";
 else status=attached?"host_platform_and_game_verification_required":"requires_machine_enrollment";
 return {provider:p.id,category:p.type,gameKey:game,requestedPlatform:platformKey,
  status,accountConnected:attached,localWorkerAllowed:!isManaged&&!nonPC,
  commandsAllowed:false,gameInstalled:false,serverReady:false,
  automaticModsReady:false,automaticMapsReady:false,
  note:isManaged?
   "Managed service uses official permitted provider API. No CMD program or arbitrary SteamCMD commands on Nitrado.":
   "Owner-controlled Windows/Linux VM requires explicit agent enrollment; only supported OS/CPU/game installations may be activated.",
  next:isManaged?"Discover the authorized service, supported games, permissions, files and backup policy.":
    "Enroll VM agent and validate its operating system, CPU, RAM, disk, ports and publisher licenses."};
}
export function createProviderRegistry(){
 return Object.values(PROVIDERS).map(p=>({...p,accountConnected:false,operationsEnabled:false}));
}
