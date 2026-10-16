import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const css=readFileSync(new URL('../ui/premium-16k.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../ui/premium-16k.js',import.meta.url),'utf8');

test('premium launcher is valid JavaScript',()=>{
 assert.doesNotThrow(()=>new Script(js,{filename:'ui/premium-16k.js'}));
});

test('styles require explicit opt-in and preserve reduced motion',()=>{
 assert.match(css,/html\.cmd16-enabled/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/#d2a8ff/);
});

test('icons stay scalable and menu handlers are preserved',()=>{
 assert.match(js,/createElementNS\("http:\/\/www\.w3\.org\/2000\/svg","svg"\)/);
 assert.match(js,/setAttribute\("viewBox","0 0 24 24"\)/);
 assert.match(js,/MutationObserver/);
 assert.doesNotMatch(js,/\.onclick\s*=|addEventListener\(["']click["']/);
});

test('no Railway secrets or external API calls are introduced',()=>{
 assert.doesNotMatch(js+"\n"+css,/fetch\(|XMLHttpRequest|localStorage\.setItem|DATABASE_URL|CMD_CONTROL_ADMIN_KEY/);
});
