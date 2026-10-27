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
  expect(profile.eligible).toBe(profile.provider!=="publisher-review"&&profile.provider!=="workforge-local");
  expect(profile.autoInstall).toBe(false);
  expect(profile.officialUrl.startsWith('https://')).toBe(true);
  expect(profile.installStatus).toBe('requires_authorized_host_agent_and_backup');
 }
});
test('ANOMALIA WorkForge is visible but server mod installation is not falsely enabled',async()=>{
 const {r,data}=await call('/api/mods/games/profile?game=ANOMALIA%20PRIMEVAL%20OUTBOUNDUN&platform=pc');
 expect(r.status).toBe(200);
 expect(data.provider).toBe('workforge-local');
 expect(data.eligible).toBe(false);
 expect(data.autoInstall).toBe(false);
 expect(data.reason).toBe('workforge_game_loader_not_verified');
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


test('FS25 direct ModHub keyword search returns official browse URL and never invents installed mods',async()=>{
 const result=await call('/api/mods/games/search?game=Farming%20Simulator%2025&q=John%20Deere');
 expect(result.r.status).toBe(200);
 expect(result.data.mode).toBe('official_modhub_search');
 expect(result.data.items).toEqual([]);
 expect(result.data.autoInstall).toBe(false);
 expect(result.data.browseUrl).toContain('www.farming-simulator.com/mods.php?');
 expect(result.data.browseUrl).toContain('title=fs2025');
 expect(result.data.browseUrl).toContain('searchMod=John+Deere');
 const url=new URL(result.data.browseUrl);
 expect(url.searchParams.get('searchMod')).toBe('John Deere');
 const pal=await call('/api/mods/games/profile?game=Palworld');
 expect(pal.r.status).toBe(200);
 expect(pal.data.officialUrl).toBe('https://steamcommunity.com/app/1623730/workshop/');
 expect(pal.data.autoInstall).toBe(false);
});
test('FS25 mobile page actually submits to genuine GIANTS ModHub without auto-install or spoofed results',async()=>{
 const page=await handle(new Request('http://localhost/mods/fs25'));
 expect(page.status).toBe(200);
 const html=await page.text();
 expect(html).toContain('action="/mods/fs25/search"');
 expect(html).toContain('name="q"');
 expect(html).toContain('Farming Simulator 25');
 expect(html).toContain('Aucune installation');
 const result=await handle(new Request('http://localhost/mods/fs25/search?q=John%20Deere'));
 expect(result.status).toBe(303);
 const dest=new URL(result.headers.get('location')!);
 expect(dest.host).toBe('www.farming-simulator.com');
 expect(dest.pathname).toBe('/mods.php');
 expect(dest.searchParams.get('title')).toBe('fs2025');
 expect(dest.searchParams.get('searchMod')).toBe('John Deere');
 const empty=await handle(new Request('http://localhost/mods/fs25/search?q='));
 expect(empty.status).toBe(303);
 expect(empty.headers.get('location')).toBe('/mods/fs25');
});

test('Palworld: real Steam Workshop discovery, strict Windows eligibility and no fake installation',async()=>{
 const pal=await call('/api/mods/games/profile?game=Palworld&platform=pc');
 expect(pal.r.status).toBe(200);
 expect(pal.data.provider).toBe('steam');
 expect(pal.data.steamAppId).toBe(1623730);
 expect(pal.data.autoInstall).toBe(false);
 const linux=await call('/api/mods/games/profile?game=Palworld&platform=linux');
 expect(linux.data.eligible).toBe(false);
 expect(linux.data.reason).toBe('palworld_server_mods_windows_only');
 const xbox=await call('/api/mods/games/profile?game=Palworld&platform=xbox');
 expect(xbox.data.eligible).toBe(false);
 const priorFetch=globalThis.fetch,priorKey=Bun.env.STEAM_WEB_API_KEY;
 Bun.env.STEAM_WEB_API_KEY='TEST_KEY_ONLY';
 let upstreamUrl='';
 try{
  globalThis.fetch=(async(input:any)=>{
   upstreamUrl=String(input);
   return new Response(JSON.stringify({response:{total:1,publishedfiledetails:[{
     publishedfileid:'1234567',title:'Verified provider listing',short_description:'Real provider metadata',
     consumer_app_id:1623730,preview_url:'https://steamcommunity.com/img.webp'
   }]}}),{status:200});
  }) as typeof fetch;
  const found=await call('/api/mods/games/search?game=Palworld&platform=pc&q=FarmingQuivern');
  expect(found.r.status).toBe(200);
  expect(found.data.items.length).toBe(1);
  expect(found.data.items[0].id).toBe('1234567');
  expect(found.data.items[0].url).toBe('https://steamcommunity.com/sharedfiles/filedetails/?id=1234567');
  expect(found.data.autoInstall).toBe(false);
  const upstream=new URL(upstreamUrl);
  expect(upstream.origin).toBe('https://api.steampowered.com');
  expect(upstream.searchParams.get('appid')).toBe('1623730');
  expect(upstream.searchParams.get('search_text')).toBe('FarmingQuivern');
  const catalogue=await call('/api/mods/games/search?game=Palworld&platform=pc&q=');
  expect(catalogue.r.status).toBe(200);
  expect(new URL(upstreamUrl).searchParams.get('query_type')).toBe('0');
 }finally{
  globalThis.fetch=priorFetch;
  if(priorKey===undefined)delete Bun.env.STEAM_WEB_API_KEY;
  else Bun.env.STEAM_WEB_API_KEY=priorKey;
 }
});
