/* CMD Hosting Premium — bootstrap with accessible SVG icons.
   Load after the site's existing JS to keep all original controls and event handlers. */
(()=>{"use strict";
 if(typeof document==="undefined"||window.__CMD_HOSTING_16K__)return;
 window.__CMD_HOSTING_16K__=true;
 const file=document.currentScript?.src||"";
 const href=file?new URL("./premium-16k.css",file).href:"/ui/premium-16k.css";
 if(!document.querySelector('link[data-cmd16k],link[href$="/premium-16k.css"]')){
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

// Premium SVG pictograms for the actual CMD Hosting navigation and action menus.
// Existing click handlers, data-* attributes and button types are left untouched.
Object.assign(paths,{
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 home:'<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>',
 games:'<rect x="3" y="7" width="18" height="12" rx="5"/><path d="M8 10v6M5 13h6M16 12h3M17.5 10.5v3"/>',
 infra:'<path d="M12 3 2 8l10 5 10-5zM2 12l10 5 10-5M2 16l10 5 10-5"/>',
 machines:'<rect x="4" y="3" width="16" height="15" rx="2"/><path d="M8 22h8M12 18v4M8 7h8M8 11h5"/>',
 order:'<path d="M7 3h10v3h3v15H4V6h3zM7 3v4h10V3M9 12h6M12 9v6"/>',
 plans:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 10h8M8 14h5M2 9v6M22 9v6"/>',
 account:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 refresh:'<path d="M20 8a8 8 0 0 0-13-3L4 8M4 4v4h4M4 16a8 8 0 0 0 13 3l3-3M20 20v-4h-4"/>',
 cloud:'<path d="M6 19h12a4 4 0 0 0 .4-8A6 6 0 0 0 7 9a5 5 0 0 0-1 10z"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.4"/><path d="m4 18 6-6 4 3 4-5 3 4"/>',
 search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
 check:'<path d="m4 12 5 5L20 6"/>',
 alert:'<path d="m12 3 10 18H2zM12 9v5M12 17h.01"/>',
 power:'<path d="M12 2v10M6 5a9 9 0 1 0 12 0"/>',
 plus:'<path d="M12 4v16M4 12h16"/>',
 upload:'<path d="M12 16V3m0 0-5 5m5-5 5 5M4 16v5h16v-5"/>',
 download:'<path d="M12 3v13m0 0-5-5m5 5 5-5M4 19v2h16v-2"/>',
 pencil:'<path d="m4 20 4-1 12-12-3-3L5 16zM15 6l3 3"/>',
 trash:'<path d="M4 7h16M10 3h4M6 7l1 14h10l1-14M10 11v7M14 11v7"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 filter:'<path d="M4 5h16M7 12h10M10 19h4"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18M12 3c-5 5-5 13 0 18"/>',
 history:'<path d="M3 11a9 9 0 1 1 3 7M3 4v7h7M12 7v6l4 2"/>',
 shield:'<path d="M12 2 3 6v6c0 6 4 9 9 10 5-1 9-4 9-10V6zM9 12l2 2 4-4"/>',
 link:'<path d="M10 13a5 5 0 0 0 7 .3l2-2a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.3l-2 2a5 5 0 0 0 7 7l2-2"/>',
 menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
 dollar:'<path d="M12 2v20M17 6c-1-2-9-3-10 2-1 4 10 3 10 8-1 5-9 5-11 2"/>',
 file:'<path d="M5 3h10l5 5v13H5zM15 3v6h5M8 13h9M8 17h9"/>',
 key:'<circle cx="8" cy="16" r="4"/><path d="m11 13 9-9M16 4h4v4"/>',
 wrench:'<path d="M19 5a6 6 0 0 1-8 8L5 19a2 2 0 0 1-3-3l6-6a6 6 0 0 1 8-8l-4 4 4 4z"/>'
});
const menuIcons={
 accueil:"home",jeux:"games",infrastructure:"infra",panneau:"dashboard",
 machines:"machines",commande:"order",configurations:"settings",offres:"plans",
 aide:"help",admin:"settings",compte:"account",wallet:"card",rentals:"history",hostingPanel:"server",cmdMods:"mods",cmdGameSwitch:"refresh",cmdCustomerCenter:"help"
};
function actionIcon(label){
 const s=String(label||"").trim();
 const checks=[
 [/état.*pc|machines?/i,"machines"],
 [/commandes?/i,"order"],
 [/associer/i,"link"],
 [/activer/i,"power"],
 [/ia cmd/i,"cloud"],
 [/supprimer|effacer|retirer|delete/i,"trash"],
 [/redémarrer|restart/i,"refresh"],
 [/démarrer|allumer|start\b/i,"power"],
 [/arrêter|stop\b|éteindre/i,"power"],
 [/actualiser|recharger|rafraîchir|refresh/i,"refresh"],
 [/sauvegarde|backup/i,"save"],
 [/installer|importer|ajouter|créer|nouveau|préparer|commander/i,"plus"],
 [/télécharger|download/i,"download"],
 [/envoyer|uploader|upload/i,"upload"],
 [/rechercher|chercher|recherche/i,"search"],
 [/modifier|éditer|configurer|enregistrer|changer/i,"pencil"],
 [/connexion|connecter|lien|lier|authentifier|s\u2019identifier|se connecter/i,"link"],
 [/facture|paiement|portefeuille|solde/i,"card"],
 [/profil|compte/i,"account"],
 [/joueur/i,"users"],
 [/jeu/i,"games"],
 [/serveur/i,"server"],
 [/mod\b/i,"mods"],
 [/ouvrir|afficher|voir|consulter|détails/i,"eye"],
 [/fermer|annuler/i,"close"],
 [/aide|assistance|support/i,"help"]
 ];
 return checks.find(([regex])=>regex.test(s))?.[1]||null;
}
function prefixIcon(button,key){
 if(!button||!key||!paths[key]||button.classList?.contains("cmd16-untouched"))return;
 // Reactivate after an existing script rewrites the button label.
 if(button.querySelector(":scope > .cmd16-icon"))return;
 const already=button.querySelector("svg,img");
 if(already)return;
 // Remove only leading decorative symbols, never rebuild a live control.
 for(const child of button.childNodes){
  if(child.nodeType!==3)continue;
  const clean=(child.nodeValue||"").replace(/^\s*(?:[\p{Extended_Pictographic}\uFE0F\u200D]|[↻⚙▶■✎☰✓✕×⌕▣▤▦◷≡◇◆↓↑＋+⚡])+\s*/u,"");
  if(clean!==child.nodeValue)child.nodeValue=clean;
  break;
 }
 const svg=makeIcon(key);
 button.insertBefore(svg,button.firstChild);
 button.classList.add("cmd16-leading-icon");
 button.dataset.cmd16IconApplied="1";
}
function makeToolSymbols(){
 for(const element of document.querySelectorAll(".tile > .symbol,.game > .symbol,.features .symbol,.infrastructure .symbol")){
  if(element.querySelector("svg"))continue;
  let heading=element.closest(".tile,.game")?.querySelector("h3")?.textContent||"";
  let icon=actionIcon(heading)||(/indépendant|cloud/i.test(heading)?"cloud":"server");
  element.replaceChildren(makeIcon(icon));
  element.classList.add("cmd16-symbol");
  element.setAttribute("aria-hidden","true");
 }
}
function decoratePremium(){
 const shellIcons={overview:"dashboard",settings:"settings",files:"file",backups:"save",schedule:"history",logs:"terminal",rentals:"history",wallet:"card",payments:"card"};
 for(const button of document.querySelectorAll("#cmdPrimary button")){
  const label=button.textContent;
  const key=shellIcons[button.dataset.view]||actionIcon(label)||"settings";
  const symbol=button.querySelector('span[aria-hidden="true"]')||button.querySelector("span:first-child");
  if(symbol&&symbol.nextElementSibling){if(!symbol.querySelector("svg"))symbol.replaceChildren(makeIcon(key))}
  else prefixIcon(button,key);
 }
 for(const [id,key] of [["cmdMenu","menu"],["cmdClose","close"]]){
  const button=document.getElementById(id);
  if(button&&!button.querySelector("svg"))button.replaceChildren(makeIcon(key));
 }

 const menu=document.getElementById("menu");
 if(menu && !menu.querySelector("svg")){
  menu.replaceChildren(makeIcon("menu"));
  menu.classList.add("cmd16-leading-icon");
 }
 for(const button of document.querySelectorAll("#nav button")){
  const id=button.dataset.page;
  const key=(id?menuIcons[id]:(button.id==="siteRefresh"?"refresh":null))||actionIcon(button.textContent);
  if(key && button.firstChild?.nodeType===3){
    const label=button.firstChild.nodeValue||"";
    const clean=label.replace(/^\s*[⚙↻]\s*/u,"");
    if(clean!==label)button.firstChild.nodeValue=clean;
  }
  prefixIcon(button,key);
 }
 const selectors=[
  ".actions button",".manage-actions button",".game-body button",
  ".host-actions button",".host-toolbar button",".toolbar button",
  ".savedcard button",".auth-panel button",".host-block button",
  ".admin-cards button",".provider-nav button",".row button",
  ".recap button","#cmdAiToggle",".cmd-ai-toggle",
  "[data-go]","[data-cmd-icon]","button","a.button","a.ghost"
 ];
 for(const button of document.querySelectorAll(selectors.join(","))){
  if(button.closest("#nav"))continue;
  const forced=button.getAttribute("data-cmd-icon");
  const icon=forced&&paths[forced]?forced:actionIcon(button.textContent)||({"✕":"close","×":"close","✎":"pencil"}[button.textContent.trim()]);
  prefixIcon(button,icon);
 }
 for(const anchor of document.querySelectorAll("#cmdSidebar a"))prefixIcon(anchor,actionIcon(anchor.textContent));
 for(const heading of document.querySelectorAll("h2,h3,h4")){if(/^\s*\p{Extended_Pictographic}/u.test(heading.textContent))prefixIcon(heading,actionIcon(heading.textContent)||"dashboard")}
 makeToolSymbols();
 decorateSemantics();
}
function setIfChanged(node,name,value){if(node.getAttribute(name)!==value)node.setAttribute(name,value)}
function decorateSemantics(){
 const nav=document.getElementById("nav"),menu=document.getElementById("menu");
 if(menu&&nav){setIfChanged(menu,"aria-controls","nav");setIfChanged(menu,"aria-expanded",String(nav.classList.contains("open")))}
 for(const button of document.querySelectorAll("#nav [data-page]")){
  if(button.classList.contains("active"))setIfChanged(button,"aria-current","page");
  else if(button.hasAttribute("aria-current"))button.removeAttribute("aria-current");
 }
 for(const button of document.querySelectorAll("button")){
  if(button.classList.contains("cmd16-untouched")||button.hasAttribute("data-cmd16-variant"))continue;
  const action=button.dataset.act||button.dataset.action||"";
  const label=button.textContent.trim();
  let variant=button.classList.contains("danger")||/^(stop|delete|remove)$/.test(action)||/^(supprimer|effacer|arrêter|retirer)\b/i.test(label)?"danger":
   /^(start)$/.test(action)||/^(démarrer|confirmer)\b/i.test(label)?"success":
   /^(restart|restore)$/.test(action)||/^(redémarrer|restaurer)\b/i.test(label)?"warning":
   button.classList.contains("ghost")||/^(annuler|fermer)\b/i.test(label)?"secondary":null;
  if(variant)button.dataset.cmd16Variant=variant;
 }
 for(const status of document.querySelectorAll(".label,.status-badge,#hostOnline")){
  const label=status.textContent.trim().toLocaleLowerCase();
  // Derive only from explicit status text; never assume a server is online.
  const state=/hors ligne|offline|à l’arrêt|à l'arrêt|stopped/.test(label)?"offline":
   /en marche|pc connecté|online|running/.test(label)?"online":/à configurer|en attente|pending/.test(label)?"warning":null;
  if(state)setIfChanged(status,"data-cmd16-state",state);
  else if(status.hasAttribute("data-cmd16-state"))status.removeAttribute("data-cmd16-state");
 }
 for(const table of document.querySelectorAll("table")){
  if(table.parentElement?.classList.contains("cmd16-table-scroll"))continue;
  const wrap=document.createElement("div");wrap.className="cmd16-table-scroll";
  wrap.tabIndex=0;wrap.setAttribute("role","region");wrap.setAttribute("aria-label",table.getAttribute("aria-label")||"Tableau défilant");
  table.before(wrap);wrap.append(table);
 }
 for(const option of document.querySelectorAll("#cmdLangPicker option")){
  const clean=option.textContent.replace(/^[\s\p{Regional_Indicator}]+/u,"");
  if(clean!==option.textContent)option.textContent=clean;
 }
}

 const init=()=>{decorate(document);decoratePremium();const main=document.body;
  if(!main||!window.MutationObserver)return;
  let queued=false;
  const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate(document);decoratePremium()})});
  observer.observe(main,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["class"]});
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
