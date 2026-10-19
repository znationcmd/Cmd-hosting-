import {test,expect,afterAll} from 'bun:test';
import {Script} from 'node:vm';

Bun.env.PORT='0';
Bun.env.CMD_MODS_SELFTEST='0';
const originalFetch=globalThis.fetch;
const oldSteam=Bun.env.STEAM_WEB_API_KEY;
const {handle,modsServer}=await import('../services/mods-api/index.ts');
afterAll(()=>{modsServer.stop(true);globalThis.fetch=originalFetch;if(oldSteam===undefined)delete Bun.env.STEAM_WEB_API_KEY;else Bun.env.STEAM_WEB_API_KEY=oldSteam;});
const call=async(path:string)=>{const r=await handle(new Request('http://localhost'+path));let data:any={};try{data=await r.json()}catch{}return {r,data}};
test('the existing DayZ / Arma / ARK integrations are isolated',async()=>{
 for(const game of ['DayZ','Arma Reforger','Arma 3','ARK: Survival Ascended','ARK: Survival Evolved']){
  const {data}=await call('/api/mods/games/profile?game='+encodeURIComponent(game));
  expect(data.provider).toBe('existing');
  expect(data.eligible).toBe(false);
  expect(data.autoInstall).toBe(false);
 }
});
test('every declared nonexcluded game has safe metadata, no fake installation',async()=>{
 const {r,data}=await call('/api/mods/games');
 expect(r.status).toBe(200);
 expect(data.writesEnabled).toBe(false);
 expect(data.games.length).toBeGreaterThanOrEqual(20);
 for(const profile of data.games){
  expect(profile.eligible).toBe(true);
  expect(profile.autoInstall).toBe(false);
  expect(profile.officialUrl.startsWith('https://')).toBe(true);
  expect(profile.installStatus).toBe('requires_authorized_host_agent_and_backup');
 }
});
test('FS25: native ModHub manager and console restrictions are explicit',async()=>{
 const fs=await call('/api/mods/games/profile?game=Farming%20Simulator%2025');
 expect(fs.r.status).toBe(200);
 expect(fs.data.provider).toBe('modhub-native');
 expect(fs.data.officialUrl).toContain('farming-simulator.com/mods.php');
 const page=await call('/api/mods/games/search?game=Farming%20Simulator%2025&q=tracteur');
 expect(page.r.status).toBe(200);
 expect(page.data.items).toEqual([]);
 expect(page.data.autoInstall).toBe(false);
 const xbox=await call('/api/mods/games/profile?game=Farming%20Simulator%2025&platform=xbox');
 expect(xbox.data.eligible).toBe(false);
 expect(xbox.data.reason).toBe('console_mod_support_not_verified');
});
test('unsupported game does not inherit generic Steam or CurseForge permissions',async()=>{
 const {data}=await call('/api/mods/games/profile?game=Unknown%20Unreleased%20Game');
 expect(data.eligible).toBe(false);
 expect(data.provider).toBe('review');
 const search=await call('/api/mods/games/search?game=Unknown%20Unreleased%20Game&q=x');
 expect(search.r.status).toBe(422);
});
test('Modrinth search requests only server-capable Minecraft Java mods',async()=>{
 let hit='';
 globalThis.fetch=(async(input:any)=>{hit=String(input);return new Response(JSON.stringify({hits:[{project_id:'abc',title:'Test',description:'Plugin',slug:'test-mod',author:'publisher'}],total_hits:1}),{status:200})}) as typeof fetch;
 const {r,data}=await call('/api/mods/games/search?game=Minecraft%3A%20Java%20Edition&q=forest');
 expect(r.status).toBe(200);expect(data.items.length).toBe(1);
 expect(hit.startsWith('https://api.modrinth.com/v2/search?')).toBe(true);
 expect(decodeURIComponent(hit)).toContain('environment:server_only');
 expect(data.items[0].url).toBe('https://modrinth.com/mod/test-mod');
 globalThis.fetch=originalFetch;
});
test('Factorio returns only the requested page, with explicit local filter',async()=>{
 globalThis.fetch=(async(url:any)=>new Response(JSON.stringify({results:[
 {name:'forest-pack',title:'Forest Pack',summary:'trees',latest_release:{version:'1.2.0'}},
 {name:'train-pack',title:'Train Pack'}]}),{status:200})) as typeof fetch;
 const {r,data}=await call('/api/mods/games/search?game=Factorio&q=forest');
 expect(r.status).toBe(200);
 expect(data.items.length).toBe(1);expect(data.items[0].version).toBe('1.2.0');
 expect(data.mode).toBe('recent_page_filter');
 globalThis.fetch=originalFetch;
});
test('Steam searches only allowlisted game app IDs and requires a key',async()=>{
 delete Bun.env.STEAM_WEB_API_KEY;
 const without=await call('/api/mods/games/search?game=Conan%20Exiles&q=castle');
 expect(without.r.status).toBe(503);expect(without.data.error).toBe('steam_web_api_key_required');
 Bun.env.STEAM_WEB_API_KEY='test-key';
 let called='';
 globalThis.fetch=(async(url:any)=>{called=String(url);return new Response(JSON.stringify({response:{publishedfiledetails:[
 {publishedfileid:'42',title:'Castle',consumer_app_id:440900},
 {publishedfileid:'99',title:'Wrong game',consumer_app_id:108600}],total:2}}),{status:200})}) as typeof fetch;
 const {r,data}=await call('/api/mods/games/search?game=Conan%20Exiles&q=castle');
 expect(r.status).toBe(200);
 expect(data.items.length).toBe(1);
 expect(called).toContain('appid=440900');
 expect(data.items[0].id).toBe('42');
 globalThis.fetch=originalFetch;
});
test('responsive secondary mods UI contains real search and does not claim installed',async()=>{
 const r=await handle(new Request('http://localhost/mods/autres-jeux'));
 const html=await r.text();
 expect(r.status).toBe(200);
 expect(html).toContain('id="game"');
 expect(html).toContain('id="search"');
 expect(html).toContain('/api/mods/games/catalogue');
 expect(html).toContain('Installation automatique indisponible');
 const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
 expect(scripts.length).toBe(1);
 expect(()=>new Script(scripts[0][1])).not.toThrow();
});
