/**
 * CMD Hosting — game-specific provisioning catalogue.
 * Preparation ONLY. It never downloads software, executes commands, grants access,
 * modifies the renter's server or pretends that an installation completed.
 *
 * This module can be joined to the live /api/catalog list at runtime: every
 * catalogue entry gets a profile, even if dedicated hosting is not yet verified.
 */
export type HostingPlatform = "pc"|"windows"|"linux"|"xbox"|"ps5"|"playstation"|"nintendo"|"crossplay"|"mobile";
export type InstallationState = "prepared-for-compatible-node"|"provider-required"|"verify-dedicated-server"|"unsupported-host-os";
export interface CatalogGame { id:number; name:string; key?:string; platforms?:string[]; appId?:number|string; }
export interface InstallerSpec {
  title:string;
  steamServerAppId?:string;
  installer:"steamcmd"|"official-publisher-download"|"java-server-distribution"|"provider-specific";
  os:("windows"|"linux")[];
  steamLogin:"anonymous"|"steam-account-may-be-required"|"not-applicable";
  docs:string;
  expectedConfigFiles:string[];
  startupBinary?:string;
  maps:"mission-template"|"launch-level"|"scenario-resource"|"game-world"|"world-save"|"provider-specific";
  mods:"steam-workshop"|"curseforge-asa"|"bohemia-workshop"|"game-mod-folder"|"publisher-supported-only";
  note:string;
}
export interface GameProvisionProfile {
  catalogId:number;gameName:string;catalogKey:string|null;requestedPlatform:string;
  state:InstallationState;installer:InstallerSpec|null;
  hostOs:string|null;dedicatedServerInstallableOnFutureNode:boolean;
  installationPerformed:false;startupVerified:false;
  installationSteps:string[];requirements:string[];
}
const specs: readonly {match:RegExp;spec:InstallerSpec}[]=[
{match:/^DayZ$/i,spec:{
 title:"DayZ Dedicated Server",installer:"steamcmd",steamServerAppId:"223350",os:["windows"],steamLogin:"anonymous",
 docs:"https://developer.valvesoftware.com/wiki/SteamCMD",
 expectedConfigFiles:["serverDZ.cfg","mpmissions/*/init.c","mpmissions/*/db/types.xml","mpmissions/*/db/events.xml"],
 startupBinary:"DayZServer_x64.exe",maps:"mission-template",mods:"steam-workshop",
 note:"Sakhal requires Frostline DLC. Modded terrain requires Workshop files, dependencies and a compatible mpmissions template; don't mix PC mods with Xbox/PlayStation."}},
{match:/^ARK: Survival Ascended$/i,spec:{
 title:"ARK Survival Ascended Dedicated Server",installer:"steamcmd",steamServerAppId:"2430930",os:["windows"],steamLogin:"anonymous",
 docs:"https://ark.wiki.gg/wiki/Dedicated_Server_Setup",
 expectedConfigFiles:["ShooterGame/Saved/Config/WindowsServer/GameUserSettings.ini","ShooterGame/Saved/Config/WindowsServer/Game.ini"],
 startupBinary:"ShooterGame/Binaries/Win64/ArkAscendedServer.exe",maps:"launch-level",mods:"curseforge-asa",
 note:"Map level name (_WP) and CurseForge ID must be validated separately. A custom map can be activated only after approved mod content exists."}},
{match:/^ARK: Survival Evolved$/i,spec:{
 title:"ARK Survival Evolved Dedicated Server",installer:"steamcmd",steamServerAppId:"376030",os:["windows","linux"],steamLogin:"anonymous",
 docs:"https://ark.wiki.gg/wiki/Dedicated_Server_Setup",
 expectedConfigFiles:["ShooterGame/Saved/Config/WindowsServer/GameUserSettings.ini","ShooterGame/Saved/Config/WindowsServer/Game.ini"],
 startupBinary:"ShooterGame/Binaries/Win64/ShooterGameServer.exe",maps:"launch-level",mods:"steam-workshop",
 note:"Steam Workshop mod IDs and map names belong to ARK Evolved, never ARK Ascended."}},
{match:/^Arma Reforger$/i,spec:{
 title:"Arma Reforger Dedicated Server",installer:"steamcmd",steamServerAppId:"1874900",os:["windows","linux"],steamLogin:"anonymous",
 docs:"https://community.bohemia.net/wiki/Arma_Reforger:Server_Hosting",
 expectedConfigFiles:["config.json"],startupBinary:"ArmaReforgerServer.exe",maps:"scenario-resource",mods:"bohemia-workshop",
 note:"Write game.scenarioId and game.mods using verified Bohemia Workshop resource identifiers. Server downloads supported mods at startup; verify scenario dependencies."}},
{match:/^Arma 3$/i,spec:{
 title:"Arma 3 Dedicated Server",installer:"steamcmd",steamServerAppId:"233780",os:["windows","linux"],steamLogin:"steam-account-may-be-required",
 docs:"https://community.bistudio.com/wiki/Arma_3:_Dedicated_Server",
 expectedConfigFiles:["server.cfg","basic.cfg","mpmissions/*.pbo"],startupBinary:"arma3server_x64.exe",maps:"mission-template",mods:"steam-workshop",
 note:"Workshop app 107410. Server mods use valid @mod directories and .bikey signatures; missions are approved .pbo packages in mpmissions."}},
{match:/^7 Days to Die$/i,spec:{
 title:"7 Days to Die Dedicated Server",installer:"steamcmd",steamServerAppId:"294420",os:["windows","linux"],steamLogin:"anonymous",
 docs:"https://wiki.7d2d.net/hosting/dedicated-server/",
 expectedConfigFiles:["serverconfig.xml"],startupBinary:"7DaysToDieServer.exe",maps:"game-world",mods:"game-mod-folder",
 note:"Set GameWorld and GameName only to an installed or generated world. Do not install unverified mods; check modinfo.xml and game version."}},
{match:/^Palworld$/i,spec:{
 title:"Palworld Dedicated Server",installer:"steamcmd",steamServerAppId:"2394010",os:["windows","linux"],steamLogin:"anonymous",
 docs:"https://docs.palworldgame.com/getting-started/deploy-dedicated-server/",
 expectedConfigFiles:["Pal/Saved/Config/WindowsServer/PalWorldSettings.ini"],startupBinary:"PalServer.exe",maps:"world-save",mods:"publisher-supported-only",
 note:"World selection is save-based, not an ARK-style map launcher. Protect .sav files; use supported server extensions only."}},
{match:/^Satisfactory$/i,spec:{
 title:"Satisfactory Dedicated Server",installer:"steamcmd",steamServerAppId:"1690800",os:["windows","linux"],steamLogin:"anonymous",
 docs:"https://satisfactory.wiki.gg/wiki/Dedicated_servers",
 expectedConfigFiles:["FactoryGame/Saved/Config/WindowsServer/Game.ini"],startupBinary:"FactoryServer.exe",maps:"world-save",mods:"publisher-supported-only",
 note:"Load a validated save/session; do not invent mod support or overwrite existing worlds."}},
{match:/^Minecraft: Bedrock Edition$/i,spec:{
 title:"Minecraft Bedrock Dedicated Server",installer:"official-publisher-download",os:["windows","linux"],steamLogin:"not-applicable",
 docs:"https://www.minecraft.net/en-us/download/server/bedrock",
 expectedConfigFiles:["server.properties","permissions.json","allowlist.json"],maps:"world-save",mods:"publisher-supported-only",
 note:"Console clients may have restrictions joining custom servers. No universal console hosting installer."}},
{match:/^Minecraft: Java Edition$/i,spec:{
 title:"Minecraft Java Dedicated Server",installer:"java-server-distribution",os:["windows","linux"],steamLogin:"not-applicable",
 docs:"https://www.minecraft.net/en-us/download/server",
 expectedConfigFiles:["server.properties","eula.txt"],maps:"world-save",mods:"publisher-supported-only",
 note:"Require Java version matching server release; Bukkit, Paper, Fabric and Forge have separate approved installers and licensing."}}
];
const baseSteps=[
 "Resolve rental and registered machine identity with per-server authorization",
 "Match game edition, requested platform and host OS",
 "Verify supported dedicated-server source, license and user entitlements",
 "Check required free disk, RAM, network ports and owner-approved install directory",
 "Install binaries inside an isolated directory, never into another rental's folder",
 "Discover the real configuration files generated by the installed software",
 "Back up any existing settings/worlds before changing them",
 "Apply validated game-specific map/scenario/mod settings with dependency checks",
 "Start using the verified official launch executable and check server logs and connectivity",
 "Report success or failure only after the host agent confirms the actual result"
];
export function createGameProvisionProfile(game:CatalogGame, platform:string="pc", hostOs:"windows"|"linux"="windows"):GameProvisionProfile {
 const requestedPlatform=platform.toLowerCase().trim();
 const pcNode=["pc","windows","linux","crossplay"].includes(requestedPlatform);
 const installed=specs.find(v=>v.match.test(game.name))?.spec??null;
 const supported=!!(pcNode&&installed?.os.includes(hostOs));
 const state:InstallationState=!pcNode?"provider-required":!installed?"verify-dedicated-server":supported?"prepared-for-compatible-node":"unsupported-host-os";
 return {
  catalogId:game.id,gameName:game.name,catalogKey:game.key??null,requestedPlatform,
  state,installer:installed,hostOs:pcNode?hostOs:null,
  dedicatedServerInstallableOnFutureNode:supported,
  installationPerformed:false,startupVerified:false,
  installationSteps:baseSteps,
  requirements:["Online enrolled host","Valid user/rental permission","Per-game publisher EULA","Verified package source","Enough free disk/RAM","Server-specific backup and rollback","Per-platform map/mod compatibility","Secrets kept in a server-side vault"]
 };
}
export function buildProvisioningRegistry(games:CatalogGame[],platform:string="pc",hostOs:"windows"|"linux"="windows") {
 return {
  schema:"cmd-hosting/install-registry-v2",
  catalogueCount:games.length,
  generatedProfiles:games.map(g=>createGameProvisionProfile(g,platform,hostOs)),
  notes:"Every catalogue game receives a plan. Only explicitly verified profiles have dedicated-server download instructions. No installation is started by this registry."
 };
}
export function approvedSteamCmdArgs(profile:GameProvisionProfile,absoluteIsolatedDirectory:string):string[]|null {
 const s=profile.installer;
 if(!profile.dedicatedServerInstallableOnFutureNode||s?.installer!=="steamcmd"||!s.steamServerAppId||s.steamLogin!=="anonymous")return null;
 if(!/^[A-Za-z]:\\[A-Za-z0-9_ .\\-]{5,220}$/.test(absoluteIsolatedDirectory))return null;
 if(/(?:^|\\)(Windows|Program Files|Users|Steam|steamapps)(?:\\|$)/i.test(absoluteIsolatedDirectory))return null;
 return ["+force_install_dir",absoluteIsolatedDirectory,"+login","anonymous","+app_update",s.steamServerAppId,"+quit"];
}
