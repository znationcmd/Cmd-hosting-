import {test,expect,afterAll} from 'bun:test';
import {Script} from 'node:vm';
Bun.env.PORT='0';Bun.env.CMD_MODS_SELFTEST='0';Bun.env.CURSEFORGE_API_KEY='  "example-test-key"  ';
const originalFetch=fetch;let lastKey='';
globalThis.fetch=(async(url,options)=>{if(String(url).startsWith('https://api.curseforge.com/')){lastKey=options.headers['x-api-key'];return new Response('{}',{status:403})}throw Error('unexpected network call')}) as typeof fetch;
const {handle,modsServer}=await import('../services/mods-api/index.ts');
afterAll(()=>{modsServer.stop(true);globalThis.fetch=originalFetch});
test('the complete Mods page script parses',async()=>{const r=await handle(new Request('http://localhost/mods'));const html=await r.text();const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];expect(scripts.length).toBeGreaterThan(0);for(const m of scripts)expect(()=>new Script(m[1])).not.toThrow()});
test('CurseForge key formatting is normalized and a refusal is reported honestly',async()=>{
 const r=await handle(new Request('http://localhost/api/mods/curseforge/games'));const d=await r.json();expect(lastKey).toBe('example-test-key');expect(r.status).toBe(503);expect(d.error).toBe('curseforge_access_denied');expect(d.upstreamStatus).toBe(403);expect(d.requiresProviderAuthorization).toBe(true);
 const status=await (await handle(new Request('http://localhost/api/mods/status'))).json();expect(status.providers.curseforge).toBe('access_denied');
});
