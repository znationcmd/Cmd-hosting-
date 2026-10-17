import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {Script} from "node:vm";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

const root=fileURLToPath(new URL("../web/public/",import.meta.url));
const page=readFileSync(join(root,"index.html"),"utf8");
const resources=new Set(readdirSync(root));
const scripts=[...resources].filter(x=>x.endsWith(".js"));

test("restored public frontend has the original hosting interface",()=>{
 assert.match(page,/<title>CMD Hosting/);
 assert.match(page,/Ton univers/);
 assert.ok(page.length>50000);
 assert.ok(resources.has("hosting-ui.js")&&resources.has("rentals-ui.js")&&resources.has("wallet-ui.js"));
});

test("premium SVG and 3D interface are integrated after the original assets",()=>{
 assert.match(page,/<link rel="stylesheet" href="\/ui\/premium-16k\.css">/);
 assert.match(page,/<script defer src="\/ui\/premium-16k\.js"><\/script>/);
 assert.ok(page.indexOf("/ui/premium-16k.js")>page.indexOf("/hosting-ui.js"));
 const css=readFileSync(join(root,"ui/premium-16k.css"),"utf8");
 assert.match(css,/html\.cmd16-enabled/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
});

test("every locally linked script and style is included",()=>{
 const urls=[...page.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/gi)]
  .map(x=>x[1].split("?")[0]).filter(x=>x.startsWith("/"));
 for(const path of urls){
  const target=new URL("."+path,new URL("../web/public/",import.meta.url));
  assert.doesNotThrow(()=>readFileSync(target),"Missing local asset "+path);
 }
});

test("all restored JavaScript parses without execution or credentials",()=>{
 assert.ok(scripts.length>=12);
 for(const name of scripts){
  const content=readFileSync(join(root,name),"utf8");
  assert.doesNotThrow(()=>new Script(content,{filename:name}),name);
 }
 const premium=readFileSync(join(root,"ui/premium-16k.js"),"utf8");
 assert.doesNotThrow(()=>new Script(premium,{filename:"ui/premium-16k.js"}));
});

test("restoration records missing backend and no live deployment claim",()=>{
 const doc=readFileSync(new URL("../web/README.md",import.meta.url),"utf8");
 assert.match(doc,/does not contain the Railway Function/);
 assert.match(doc,/Do not switch the Railway web service/);
});
