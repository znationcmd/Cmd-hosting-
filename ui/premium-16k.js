/* CMD Hosting Premium — bootstrap with accessible SVG icons.
   Load after the site's existing JS to keep all original controls and event handlers. */
(()=>{"use strict";
 if(typeof document==="undefined"||window.__CMD_HOSTING_16K__)return;
 window.__CMD_HOSTING_16K__=true;
 const file=document.currentScript?.src||"";
 const href=file?new URL("./premium-16k.css",file).href:"/ui/premium-16k.css";
 if(!document.querySelector('link[data-cmd16k]')){
   const link=document.createElement("link");link.rel="stylesheet";link.href=href;
   link.dataset.cmd16k="1";document.head.append(link);
 }
 document.documentElement.classList.add("cmd16-enabled");
 const paths={
   dashboard:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
   server:'<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01M11 6.5h7M11 17.5h7"/>',
   shop:'<path d="M4 9h16l-1 12H5L4 9zM3 9l2-6h14l2 6"/><path d="M9 12v3a3 3 0 0 0 6 0v-3"/>',
   plus:'<path d="M12 4v16M4 12h16"/>',
   mods:'<path d="M4 3h6a3 3 0 0 0 6 0h4v7a3 3 0 0 0 0 6v5h-7a3 3 0 0 0-6 0H4v-7a3 3 0 0 0 0-6z"/>',
   file:'<path d="M5 3h10l5 5v13H5zM15 3v6h5M8 13h9M8 17h9"/>',
   save:'<path d="M5 3h12l4 4v14H3V3h2zM7 3v7h10V3M7 21v-8h10v8"/>',
   terminal:'<rect x="2" y="3" width="20" height="18" rx="2"/><path d="m6 8 4 4-4 4M12 16h6"/>',
   users:'<circle cx="9" cy="8" r="4"/><path d="M2 21v-2a7 7 0 0 1 14 0v2M17 5a4 4 0 0 1 0 7M22 21v-2a6 6 0 0 0-4-5.7"/>',
   settings:'<circle cx="12" cy="12" r="3"/><path d="m19 13 2 1-2 4-2-1-2 1-1 2h-4l-1-2-2-1-2 1-2-4 2-1v-2l-2-1 2-4 2 1 2-1 1-2h4l1 2 2 1 2-1 2 4-2 1z"/>',
   card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h5"/>',
   help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2l-2 2v2M12 18h.01"/>'
 };
 const patterns=[
  [/(tableau de bord|dashboard)/i,"dashboard"],[/(mes serveurs|serveurs|servers)/i,"server"],
  [/(boutique|shop)/i,"shop"],[/(nouvelle location|louer|nouveau serveur)/i,"plus"],
  [/(mods|modifications|workshop)/i,"mods"],[/(fichiers|files)/i,"file"],
  [/(sauvegardes|backups)/i,"save"],[/(console|terminal)/i,"terminal"],
  [/(joueurs|players|membres)/i,"users"],[/(paramètres|settings)/i,"settings"],
  [/(facturation|portefeuille|wallet|billing)/i,"card"],[/(assistance|support)/i,"help"]
 ];
 function makeIcon(key){
   const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
   svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("aria-hidden","true");
   svg.setAttribute("focusable","false");svg.classList.add("cmd16-icon");
   svg.innerHTML=paths[key];return svg;
 }
 function decorate(root){
  const items=root.querySelectorAll('nav a,aside a,.sidebar a,.side-nav a,[data-cmd-icon]');
  for(const element of items){
   if(element.dataset.cmd16IconApplied==="1"||element.querySelector("svg,img,.cmd16-icon"))continue;
   const forced=element.getAttribute("data-cmd-icon");
   const key=forced&&paths[forced]?forced:patterns.find(([re])=>re.test((element.textContent||"").trim()))?.[1];
   if(!key)continue;element.prepend(makeIcon(key));element.dataset.cmd16IconApplied="1";
  }
 }
 const init=()=>{decorate(document);const main=document.body;
  if(!main||!window.MutationObserver)return;
  let queued=false;
  const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate(document)})});
  observer.observe(main,{childList:true,subtree:true});
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();