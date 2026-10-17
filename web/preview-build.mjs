#!/usr/bin/env node
/* CMD Hosting public visual preview: no backend, no orders, no credentials. */
import {cpSync,mkdirSync,readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
const out=resolve("web/preview-dist");
mkdirSync(out,{recursive:true});
cpSync(resolve("web/public"),out,{recursive:true,force:true});
const file=resolve(out,"index.html");
let html=readFileSync(file,"utf8");
if(!html.includes("CMD Hosting")||!html.includes("/ui/premium-16k.js"))throw Error("Frontend missing");
html=html.replace(/\b(src|href)=("|')\/(?!\/)/g,"$1=$2./");
const css='<style id="cmdPreviewCss">#cmdPreviewBanner{position:sticky;top:0;z-index:99999;padding:12px 18px;background:linear-gradient(110deg,#391966,#702faf,#3a1b62);box-shadow:0 6px 22px #0009;border-bottom:2px solid #cd9fff;color:#fff;display:flex;gap:12px;align-items:center;justify-content:center;text-align:center;font:700 14px/1.5 system-ui,-apple-system,sans-serif}#cmdPreviewBanner strong{color:#e7c7ff}#cmdPreviewBanner svg{width:20px;height:20px;stroke:#fff;fill:none;stroke-width:2}@media(max-width:600px){#cmdPreviewBanner{font-size:12px;padding:10px}}</style>';
const guard='<script id="cmdPreviewGuard">(function(){var native=window.fetch.bind(window);window.fetch=function(input,init){var method=String(init&&init.method||(typeof Request!=="undefined"&&input instanceof Request?input.method:"GET")).toUpperCase();if(!["GET","HEAD"].includes(method))return Promise.reject(new Error("Aperçu graphique : commande désactivée"));return native(input,init)};document.addEventListener("submit",function(e){e.preventDefault();e.stopImmediatePropagation();alert("Ceci est un aperçu graphique. Connexion, paiements et locations désactivés.")},true)})();</script>';
const banner='<div id="cmdPreviewBanner" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 22 21H2zM12 9v5M12 17h.01"/></svg><span><strong>APERÇU VISUEL 16K</strong> — CMD Hosting. Locations et connexion désactivées ici. <a href="https://cmd-hosting-web-production.up.railway.app" rel="noopener noreferrer" style="color:#fff;text-decoration:underline">Site officiel</a></span></div>';
html=html.replace("</head>",'<meta name="robots" content="noindex,nofollow">'+css+guard+"</head>").replace("<body>","<body>"+banner);
if(!html.includes('id="cmdPreviewBanner"')||!html.includes('id="cmdPreviewGuard"'))throw Error("Preview safeguards absent");
writeFileSync(file,html);
const mfile=resolve(out,"manifest.webmanifest");
try{const m=JSON.parse(readFileSync(mfile,"utf8"));m.start_url="./";m.scope="./";writeFileSync(mfile,JSON.stringify(m));}catch{}
writeFileSync(resolve(out,"robots.txt"),"User-agent: *\nDisallow: /\n");
console.log("Prepared premium visual-only preview; Railway untouched.");
