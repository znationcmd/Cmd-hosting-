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

const hostingCss=readFileSync(new URL('../web/public/ui/hosting-blue-violet-3d.css',import.meta.url),'utf8');
const hostingJs=readFileSync(new URL('../web/public/ui/hosting-blue-violet-3d.js',import.meta.url),'utf8');
const hostingIndex=readFileSync(new URL('../web/public/index.html',import.meta.url),'utf8');

test('blue-violet 3D visual layer loads without replacing existing backend or handlers',()=>{
 assert.doesNotThrow(()=>new Script(hostingJs,{filename:'web/public/ui/hosting-blue-violet-3d.js'}));
 assert.match(hostingIndex,/src="\/ui\/premium-16k\.js"/);
 assert.match(hostingIndex,/src="\/ui\/hosting-blue-violet-3d\.js\?v=20261026-menu-1"/);
 assert.match(hostingCss,/html\.cmd16-enabled/);
 assert.match(hostingCss,/#55c6ff/);
 assert.match(hostingCss,/#a573ff/);
 assert.match(hostingCss,/linear-gradient\(120deg/);
 assert.match(hostingCss,/hosting-click-lit/);
 assert.match(hostingCss,/hosting-3d-surface/);
 assert.match(hostingCss,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(hostingJs,/fetch\(|XMLHttpRequest|localStorage\.setItem|stopPropagation\(|preventDefault\(|\.onclick\s*=/);
});

test('real 3D perspective reacts to pointer and opt-in phone orientation only',()=>{
 assert.match(hostingJs,/pointermove/);
 assert.match(hostingJs,/deviceorientation/);
 assert.match(hostingJs,/requestPermission/);
 assert.match(hostingJs,/aria-pressed/);
 assert.match(hostingJs,/MutationObserver/);
 assert.match(hostingJs,/capture:true/);
 assert.match(hostingCss,/perspective\(1600px\)/);
});
