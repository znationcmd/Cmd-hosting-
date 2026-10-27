(function(){
'use strict';
const c=document.getElementById('cmdMods'),select=document.getElementById('cvServer');
if(!c||!select||document.getElementById('cvAutoGame'))return;
const info=document.createElement('div');info.id='cvAutoGame';info.setAttribute('role','status');info.style.cssText='width:100%;color:#b9d5e7;background:#18384e;border:1px solid #355e79;border-radius:8px;padding:10px 13px;font:12px/1.5 system-ui;margin:3px 0 12px';
select.closest('.cmdv-toolbar')?.after(info);
let cache=new Map(),loading=false,revision=0,loaded=false;
const status=msg=>info.textContent=msg;
const gameSources={arma:'Workshop Bohemia (Arma Reforger)',ark:'CurseForge (ARK: Survival Ascended)',dayz:'Steam Workshop (DayZ PC)',palworld:'Steam Workshop officiel (Palworld · serveur Windows)',fs25:'ModHub officiel GIANTS (Farming Simulator 25)'};
const getSource=g=>g.startsWith('g-arma-reforger')||g==='arma'?gameSources.arma:g.startsWith('g-ark-survival-ascended')||g==='ark'?gameSources.ark:g==='dayz'||g==='g-dayz'?gameSources.dayz:g==='palworld'||g.startsWith('g-palworld')?gameSources.palworld:/^(?:g-)?(?:fs25|farming-simulator-25|farming-simulator-2025)$/.test(g)?gameSources.fs25:'';
const imageAlt=()=>{};
async function loadLabels(){
if(loading)return;loading=true;try{
const r=await fetch('/api/game-library',{credentials:'include',cache:'no-store'});if(!r.ok)throw Error('Connexion nécessaire');const data=await r.json();
cache=new Map((data.items||[]).map(g=>[g.id,g]));
for(const o of select.options){
 const g=cache.get(o.value);if(!g)continue;
 const name=g.game_name||g.game_key||'Jeu inconnu';
 const title=g.display_name+' — '+name;
 if(o.textContent!==title)o.textContent=title;
 o.title='Jeu détecté : '+name;
}
loaded=true;update();}catch(e){status('La détection nécessite une connexion à CMD Hosting.');}
finally{loading=false}
}
async function update(){
const id=select.value,game=cache.get(id),num=++revision;
if(!id){status('Choisis un serveur : CMD Hosting détectera automatiquement le jeu et le catalogue de mods correspondant.');return}
if(!game){
  if(id==='__fs25_modhub__'){status('FS25 · ModHub GIANTS officiel accessible même sans machine raccordée.');return}
  if(id==='__palworld_workshop__'){status('Palworld · Steam Workshop officiel accessible même sans machine raccordée.');return}
  status('Identification du jeu en cours…');return}
const name=game.game_name||game.game_key,provider=getSource(game.game_key||'');
 const isFs25=/\b(?:fs[ -]?25|farming\s*simulator\s*(?:25|2025))\b/i.test([game.game_name,game.game_key,game.display_name,game.name].filter(Boolean).join(' '));
 if(provider===gameSources.palworld){status('Jeu détecté : Palworld · Steam Workshop officiel disponible. Seuls les mods compatibles avec le serveur dédié Windows peuvent être activés dans PalModSettings.ini.');return}
 if(isFs25||provider===gameSources.fs25){status('Jeu détecté : Farming Simulator 25 · ModHub officiel GIANTS accessible ci-dessous, même sans machine reliée. Les ZIP restent à installer sur le serveur dédié FS25.');return}
status('Jeu détecté : '+name+' · Vérification des mods…');
try{
const r=await fetch('/api/mods?gameId='+encodeURIComponent(id),{credentials:'include',cache:'no-store'});
const data=await r.json();if(num!==revision)return;if(!r.ok)throw Error(data.message||'Source indisponible');
const sources=data.providers||[];
const names={arma:'Workshop Bohemia',curseforge:'CurseForge',steam:'Steam Workshop'};
const label=sources.map(k=>names[k]||k).join(' / ');
if(sources.length){
status('Jeu détecté : '+name+' · Mods : '+label+' · sélection automatique.');
if(sources.includes('curseforge')||sources.includes('steam')){
const flags=await fetch('https://cmd-hosting-mods-api-production.up.railway.app/api/mods/status',{credentials:'omit',cache:'no-store'}).then(x=>{if(!x.ok)throw Error();return x.json()}).catch(()=>null);
if(num!==revision)return;
const state=sources.includes('curseforge')?flags?.providers?.curseforge:flags?.providers?.dayz_workshop_search;
const source=sources.includes('curseforge')?'CurseForge':'Steam Workshop';
if(state==='api_key_required')status('Jeu détecté : '+name+' · '+source+' : clé API à configurer.');
else if(state==='access_denied')status('Jeu détecté : '+name+' · '+source+' refuse la clé configurée.');
else if(state==='configured'||state==='ready')status('Jeu détecté : '+name+' · '+source+' connecté · recherche disponible.');
else status('Jeu détecté : '+name+' · '+source+' sélectionné · vérification de connexion indisponible.');
}
}else status('Jeu détecté : '+name+' · Ce jeu n’a pas encore d’intégration de mods validée. Le nom du serveur ne permet pas d’activer un Workshop incompatible.');
}catch(e){if(num===revision)status('Jeu détecté : '+name+' · '+e.message)}
}
select.addEventListener('change',update);
const observer=new MutationObserver(()=>{if(!loaded||[...select.options].some(o=>cache.has(o.value)&&o.textContent!==cache.get(o.value).display_name+' — '+(cache.get(o.value).game_name||cache.get(o.value).game_key)))loadLabels()});
observer.observe(select,{childList:true,subtree:true,characterData:true});
document.getElementById('cvRefresh')?.addEventListener('click',()=>setTimeout(loadLabels,300));
loadLabels();
})();
;(()=>{const s=document.createElement("style");s.id="cmd-hosting-blue-violet-live";s.textContent="/* CMD Hosting — blue > violet, real interactive CSS 3D.\n   Vector/resolution-independent, isolated to the existing cmd16-enabled UI.\n   Does not touch existing forms, APIs, server actions or background media. */\nhtml.cmd16-enabled{\n  --hosting-sky:#55c6ff;\n  --hosting-violet:#a573ff;\n  --hosting-dark:#080e25;\n  --hosting-bevel:inset 0 2px 1px rgba(255,255,255,.29),inset 0 -4px 8px rgba(2,5,27,.61);\n  --hosting-depth:0 10px 25px rgba(0,3,19,.67),0 3px 0 rgba(3,6,26,.8);\n  --hosting-glow:0 0 0 1px rgba(162,157,255,.95),0 0 18px rgba(80,155,255,.66),0 0 36px rgba(164,105,255,.45);\n  --hosting-view-x:0deg;\n  --hosting-view-y:0deg;\n  --hosting-bg-x:0px;\n  --hosting-bg-y:0px;\n  --cmd16-bg:#080e25;--cmd16-ink:#edf5ff;--cmd16-muted:#afc5ea;\n  --cmd16-panel:#18234a;--cmd16-line:#8894f8;--cmd16-hi:#a9d8ff;\n  --cmd16-glow:#796df4;--cmd16-shadow:#05071b;\n  --cmd16-purple:#9d76f4;--cmd16-highlight:#cae4ff;--cmd16-dark:#080c22;\n}\nhtml.cmd16-enabled body{\n  color:#edf5ff!important;\n  background:radial-gradient(ellipse 80% 55% at 5% 6%,rgba(36,116,215,.37),transparent 70%),\n    radial-gradient(ellipse 80% 60% at 90% 29%,rgba(129,62,220,.36),transparent 70%),\n    linear-gradient(120deg,#081326 0%,#132b50 34%,#2a2058 69%,#0d0e2d 100%)!important;\n  background-attachment:fixed!important;\n}\nhtml.cmd16-enabled .top,html.cmd16-enabled :is(header.top,.topbar,.navbar,.app-header,.site-header){\n  background:linear-gradient(114deg,#163a65f5 0%,#1d2a57f5 51%,#3d256cf4 100%)!important;\n  border-bottom:1px solid rgba(152,184,255,.75)!important;\n  box-shadow:inset 0 1px rgba(255,255,255,.25),0 10px 31px rgba(2,4,19,.65),0 0 15px rgba(137,109,255,.18)!important;\n  backdrop-filter:blur(18px);\n}\nhtml.cmd16-enabled :is(nav,aside,.sidebar,.side-menu,.side-nav,.menu-sidebar,[data-cmd16=\"navigation\"]){\n  background:linear-gradient(160deg,rgba(28,55,91,.97),rgba(27,34,74,.97) 52%,rgba(43,27,79,.98))!important;\n  border-color:rgba(135,172,255,.45)!important;\n}\nhtml.cmd16-enabled .brand b,html.cmd16-enabled .hero h1 em{\n  color:#9bdfff!important;text-shadow:0 0 14px rgba(74,171,255,.65),0 0 24px rgba(160,90,255,.36)!important;\n}\nhtml.cmd16-enabled .cmd-brand-logo{\n  background:linear-gradient(145deg,#165e9b,#63349b)!important;\n  border-color:rgba(151,181,255,.75)!important;\n  box-shadow:var(--hosting-bevel),0 8px 19px rgba(0,0,0,.48),0 0 17px rgba(108,146,255,.44)!important;\n}\nhtml.cmd16-enabled :is(.eyebrow,.step){color:#a5dbff!important;text-shadow:0 0 13px rgba(83,161,255,.55)!important}\nhtml.cmd16-enabled :is(h1,h2,h3){color:#f3f6ff!important}\nhtml.cmd16-enabled :is(.lead,.sub,.small,.tile p,.game p,.savedcard p,.note,.catalog-note,.account-note){color:#c0cee9!important}\nhtml.cmd16-enabled :is(.mock,.tile,.game,.metric,.auth-panel,.savedcard,.host-block,.host-msg,.note,.catalog-note,.account-note,.recap,.faq details,.cmd-ai-panel,.order-cols>.tile,.row>.tile,.host-meta>div,.host-gamepicker,.host-gamefields,.card,.panel,.server-card,.dashboard-card,.status,.host-entry){\n  color:#f0f5ff!important;\n  background:linear-gradient(145deg,rgba(23,57,96,.96),rgba(28,37,84,.98) 54%,rgba(56,34,95,.95))!important;\n  border:1.3px solid rgba(133,165,255,.64)!important;\n  box-shadow:var(--hosting-bevel),0 12px 30px rgba(0,3,18,.62),0 0 14px rgba(107,112,255,.13)!important;\n  border-radius:clamp(12px,1.1vw,19px)!important;\n}\nhtml.cmd16-enabled :is(.game,.tile,.auth-panel,.host-block,.savedcard,.metric,.host-meta>div):hover{\n  border-color:rgba(168,194,255,.94)!important;\n  box-shadow:var(--hosting-bevel),0 15px 33px rgba(0,4,19,.73),0 0 23px rgba(139,110,255,.29)!important;\n}\nhtml.cmd16-enabled .mockhead{\n  background:linear-gradient(120deg,#1b5688,#473078)!important;\n  color:#edf7ff!important;border-color:rgba(122,168,255,.46)!important;\n}\nhtml.cmd16-enabled .mockbody{background:linear-gradient(140deg,rgba(21,54,96,.84),rgba(44,30,82,.82))!important}\nhtml.cmd16-enabled :is(.empty,.metric,.host-meta>div){\n  background:linear-gradient(145deg,#214169,#2b2153)!important;\n  border-color:rgba(133,165,255,.64)!important;\n}\nhtml.cmd16-enabled :is(.metric strong,.host-meta b,.notice-count){\n  color:#a8dfff!important;text-shadow:0 0 12px rgba(91,165,255,.55)!important;\n}\nhtml.cmd16-enabled :is(.tag,.label,.status-badge,.badge){\n  background:linear-gradient(140deg,rgba(39,100,166,.63),rgba(93,52,148,.64))!important;\n  color:#e7ecff!important;border:1px solid rgba(171,161,255,.68)!important;\n}\nhtml.cmd16-enabled :is(button,.btn,.button,[role=\"button\"],input[type=\"submit\"],input[type=\"button\"]):not(.cmd16-untouched):not(:disabled){\n  position:relative;\n  border:1.5px solid rgba(172,190,255,.85)!important;\n  border-radius:13px!important;\n  background:linear-gradient(155deg,#8fdcff 0%,#368cdb 28%,#5656b7 65%,#6d348e 100%)!important;\n  color:#f9fbff!important;\n  box-shadow:var(--hosting-bevel),var(--hosting-depth)!important;\n  text-shadow:0 1px 2px rgba(2,3,33,.56);\n  transition:box-shadow .22s,filter .22s,transform .18s,border-color .22s!important;\n  -webkit-tap-highlight-color:transparent;\n  touch-action:manipulation;\n}\nhtml.cmd16-enabled :is(.ghost,.danger,button.danger,[data-variant=\"danger\"]):not(.cmd16-untouched){\n  background:linear-gradient(160deg,#704c99,#423364 65%,#2a2448)!important;\n}\nhtml.cmd16-enabled :is(button,.btn,.button,[role=\"button\"]):not(.cmd16-untouched):not(:disabled)::before{\n  content:\"\";position:absolute;inset:1px 1px auto;height:43%;border-radius:inherit;pointer-events:none;\n  background:linear-gradient(155deg,rgba(255,255,255,.32),rgba(255,255,255,.045) 72%,transparent);\n}\nhtml.cmd16-enabled :is(button,.btn,.button,[role=\"button\"],input[type=\"submit\"],input[type=\"button\"]):not(:disabled):where(:hover,:focus-visible,.hosting-click-lit){\n  border-color:#c7ddff!important;\n  box-shadow:var(--hosting-bevel),0 11px 22px rgba(0,3,18,.59),var(--hosting-glow)!important;\n  filter:brightness(1.10);\n}\nhtml.cmd16-enabled :is(button,.btn,.button,[role=\"button\"]):not(:disabled):active{\n  transform:translateY(2px) scale(.995);\n  box-shadow:inset 0 4px 9px rgba(0,2,23,.65),0 0 17px rgba(112,148,255,.52)!important;\n}\nhtml.cmd16-enabled :is(.links button,.top .links button,#nav button):where(.active,[aria-current=\"page\"],.hosting-click-lit){\n  background:linear-gradient(140deg,#2477c6,#484cad 55%,#733eac)!important;\n  box-shadow:var(--hosting-bevel),var(--hosting-glow)!important;\n  border-color:#c4dbff!important;\n}\nhtml.cmd16-enabled :is(input:not([type=\"checkbox\"]):not([type=\"radio\"]):not([type=\"range\"]),textarea,select){\n  background:linear-gradient(140deg,rgba(14,34,62,.96),rgba(37,29,77,.97))!important;\n  border-color:rgba(137,159,244,.69)!important;\n  color:#f2f5ff!important;box-shadow:inset 0 3px 9px rgba(0,4,17,.67),inset 0 1px rgba(255,255,255,.07)!important;\n}\nhtml.cmd16-enabled :is(input,textarea,select):focus-visible{\n  outline:2px solid #8dd9ff!important;outline-offset:2px;\n  box-shadow:inset 0 3px 8px rgba(0,2,21,.57),0 0 0 3px rgba(139,151,255,.26),0 0 19px rgba(125,147,255,.51)!important;\n}\nhtml.cmd16-enabled :is(dialog,[role=\"dialog\"],.modal,.dropdown,.popover){\n  background:linear-gradient(155deg,#23466ff9,#302659f9 65%,#221d46f9)!important;\n  border-color:rgba(178,181,255,.78)!important;\n  box-shadow:0 23px 52px rgba(0,2,19,.83),0 0 27px rgba(139,114,255,.3)!important;\n}\nhtml.cmd16-enabled :is(table th,table td){border-color:rgba(143,164,255,.24)!important}\nhtml.cmd16-enabled table th{color:#d4e5ff!important;background:rgba(26,68,117,.44)!important}\nhtml.cmd16-enabled .cmd16-icon{filter:drop-shadow(0 1px 2px #0a1239)}\nhtml.cmd16-enabled .page{perspective:1800px;perspective-origin:50% 40%}\nhtml.cmd16-enabled .hosting-3d-surface{\n  --hosting-card-x:var(--hosting-view-x);\n  --hosting-card-y:var(--hosting-view-y);\n  transform:perspective(1600px) rotateX(var(--hosting-card-x)) rotateY(var(--hosting-card-y));\n  transform-origin:center;transform-style:preserve-3d;backface-visibility:hidden;\n  transition:transform .3s cubic-bezier(.19,.9,.26,1),box-shadow .22s!important;\n}\nhtml.cmd16-enabled .hosting-3d-surface.hosting-3d-hover{\n  transition:transform 95ms linear,box-shadow .22s!important;\n  border-color:rgba(175,199,255,.86)!important;\n  box-shadow:var(--hosting-bevel),0 18px 37px rgba(0,3,18,.73),0 0 20px rgba(126,137,255,.34)!important;\n}\nhtml.cmd16-enabled .hosting-3d-surface::after{\n  content:\"\";position:absolute;inset:0;pointer-events:none;border-radius:inherit;\n  background:radial-gradient(circle at var(--hosting-shine-x,50%) var(--hosting-shine-y,10%),rgba(208,223,255,.19),transparent 60%);\n  opacity:0;transition:opacity .3s;\n}\nhtml.cmd16-enabled .hosting-3d-surface.hosting-3d-hover::after{opacity:1}\nhtml.cmd16-enabled .hosting-motion-switch{\n  display:inline-flex;align-items:center;justify-content:center;gap:6px;\n  min-height:44px;white-space:nowrap;font-size:12px!important;padding:8px 11px!important;\n  border:1px solid rgba(170,200,255,.85)!important;\n  background:linear-gradient(145deg,#215b9e,#593a96)!important;\n}\nhtml.cmd16-enabled .hosting-motion-switch[aria-pressed=\"true\"]{box-shadow:var(--hosting-bevel),var(--hosting-glow)!important}\n@media(min-width:2000px){\n html.cmd16-enabled .wrap{max-width:3000px}\n html.cmd16-enabled :is(.game,.tile,.host-block,.auth-panel){padding:clamp(21px,1.2vw,37px)}\n html.cmd16-enabled .hero h1{font-size:clamp(52px,3vw,100px)}\n}\n@media(max-width:880px){\n html.cmd16-enabled .hosting-motion-switch{font-size:11px!important}\n html.cmd16-enabled .hosting-3d-surface{transform:perspective(1900px) rotateX(var(--hosting-card-x)) rotateY(var(--hosting-card-y))}\n}\n@media(max-width:550px){\n html.cmd16-enabled :is(.game,.tile,.host-block,.auth-panel){border-radius:14px!important}\n html.cmd16-enabled .hosting-3d-surface.hosting-3d-hover{transform:none!important}\n}\n@media(prefers-reduced-motion:reduce){\n html.cmd16-enabled .hosting-3d-surface,html.cmd16-enabled .hosting-3d-surface.hosting-3d-hover{\n   transform:none!important;transition:none!important;\n }\n html.cmd16-enabled .hosting-3d-surface::after{display:none}\n html.cmd16-enabled :is(button,.btn,.button,.hosting-motion-switch){transition:none!important}\n}\n";document.head.appendChild(s);})();
;/* CMD Hosting 3D: dynamic button glow and perspective, no API or user data touched. */
(()=>{"use strict";
 if(window.__HOSTING_BLUE_VIOLET_3D__)return;
 window.__HOSTING_BLUE_VIOLET_3D__=true;
 document.documentElement.classList.add("cmd16-enabled");
 const reduce=window.matchMedia("(prefers-reduced-motion: reduce)");
 const mouse=window.matchMedia("(hover: hover) and (pointer: fine)");
 const root=document.documentElement;
 const surfaceSelector=".tile,.game,.mock,.metric,.auth-panel,.savedcard,.host-block,.host-entry,.host-msg,.status,.note,.catalog-note,.account-note,.cmd-ai-panel,.card,.panel,.server-card,.dashboard-card";
 let moving=null,frame=0,tilt=null,enabled=false,visible=null;
 const limit=(v,min,max)=>Math.min(max,Math.max(min,v));
 function resetCard(el){
  if(!el)return;
  el.classList.remove("hosting-3d-hover");
  for(const key of ["--hosting-card-x","--hosting-card-y","--hosting-shine-x","--hosting-shine-y"])el.style.removeProperty(key);
 }
 function onMouse(e){
  if(reduce.matches||!mouse.matches||enabled)return;
  const card=e.target?.closest?.(".hosting-3d-surface");
  if(card!==moving){resetCard(moving);moving=card}
  if(!card)return;
  const rect=card.getBoundingClientRect();
  const px=limit((e.clientX-rect.left)/Math.max(1,rect.width),0,1);
  const py=limit((e.clientY-rect.top)/Math.max(1,rect.height),0,1);
  const info={card,x:(.5-py)*9,y:(px-.5)*11,px:px*100,py:py*100};
  if(frame)cancelAnimationFrame(frame);
  frame=requestAnimationFrame(()=>{
   frame=0;if(!info.card.isConnected)return;
   card.classList.add("hosting-3d-hover");
   card.style.setProperty("--hosting-card-x",info.x.toFixed(2)+"deg");
   card.style.setProperty("--hosting-card-y",info.y.toFixed(2)+"deg");
   card.style.setProperty("--hosting-shine-x",info.px.toFixed(1)+"%");
   card.style.setProperty("--hosting-shine-y",info.py.toFixed(1)+"%");
  });
 }
 document.addEventListener("pointermove",onMouse,{passive:true});
 document.addEventListener("pointerout",e=>{
  if(moving&&!moving.contains(e.relatedTarget)){resetCard(moving);moving=null}
 },{passive:true});
 let last=null;
 document.addEventListener("click",e=>{
  const candidate=e.target?.closest?.("button,.button,.btn,[role='button']");
  if(!candidate||candidate.disabled||candidate.getAttribute("aria-disabled")==="true")return;
  if(last&&last!==candidate&&!last.matches(".links button.active,#nav button.active"))last.classList.remove("hosting-click-lit");
  candidate.classList.remove("hosting-click-lit");void candidate.offsetWidth;
  candidate.classList.add("hosting-click-lit");last=candidate;
  if(!candidate.matches(".links button.active,#nav button.active")){
   setTimeout(()=>{if(candidate.isConnected)candidate.classList.remove("hosting-click-lit")},1200);
  }
 },{capture:true});
 const supported=typeof window.DeviceOrientationEvent!=="undefined";
 const toggle=document.createElement("button");
 toggle.className="hosting-motion-switch";toggle.type="button";
 toggle.textContent="3D · inclinaison";
 toggle.setAttribute("aria-pressed","false");
 toggle.title="Activer l'effet 3D en inclinant le téléphone";
 function reflect(){
  toggle.textContent=enabled?"3D · activée":"3D · inclinaison";
  toggle.setAttribute("aria-pressed",String(enabled));
 }
 function clearMotion(){
  for(const k of ["--hosting-view-x","--hosting-view-y"])root.style.removeProperty(k);
 }
 function onGyro(event){
  if(!enabled||reduce.matches||document.hidden)return;
  if(!Number.isFinite(event.beta)||!Number.isFinite(event.gamma))return;
  tilt={x:limit((event.beta-35)*.075,-3.3,3.3),y:limit(event.gamma*.08,-3.6,3.6)};
  if(frame)return;
  frame=requestAnimationFrame(()=>{
   frame=0;if(!tilt)return;
   root.style.setProperty("--hosting-view-x",tilt.x.toFixed(2)+"deg");
   root.style.setProperty("--hosting-view-y",tilt.y.toFixed(2)+"deg");
  });
 }
 toggle.addEventListener("click",async()=>{
  if(enabled){
   enabled=false;window.removeEventListener("deviceorientation",onGyro);
   clearMotion();reflect();return;
  }
  if(reduce.matches){toggle.textContent="Animations réduites activées";return}
  if(!supported){toggle.textContent="Capteur indisponible";return}
  try{
   if(typeof window.DeviceOrientationEvent.requestPermission==="function"){
    const grant=await window.DeviceOrientationEvent.requestPermission();
    if(grant!=="granted"){toggle.textContent="Autorisation refusée";return}
   }
   resetCard(moving);moving=null;
   enabled=true;window.addEventListener("deviceorientation",onGyro,{passive:true});reflect();
  }catch{toggle.textContent="Capteur indisponible"}
 });
 function decorate(container=document){
  if(!root.classList.contains("cmd16-enabled"))return;
  const selectors=surfaceSelector.split(",").map(x=>".page "+x).join(",");
  for(const el of container.querySelectorAll(selectors)){
   if(el.classList.contains("hosting-3d-surface"))continue;
   // On dense pages prefer top-level panels for reliable form interaction.
   if(el.parentElement?.closest?.(".hosting-3d-surface"))continue;
   el.classList.add("hosting-3d-surface");
   if(visible)visible.observe(el);
  }
 }
 function install(){
  const target=document.querySelector(".top .topin")||document.querySelector(".top")||document.querySelector("header");
  if(target&&!toggle.isConnected&&(!mouse.matches||supported)){target.appendChild(toggle)}
  if("IntersectionObserver" in window){
   visible=new IntersectionObserver(entries=>{
    entries.forEach(e=>e.target.classList.toggle("hosting-3d-visible",e.isIntersecting));
   },{rootMargin:"100px",threshold:0});
  }
  decorate();
  if(!window.MutationObserver)return;
  let queued=false;
  new MutationObserver(()=>{
   if(queued)return;
   queued=true;requestAnimationFrame(()=>{queued=false;decorate()});
  }).observe(document.body,{childList:true,subtree:true});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
 reduce.addEventListener?.("change",()=>{if(reduce.matches&&enabled){enabled=false;window.removeEventListener("deviceorientation",onGyro);clearMotion();reflect()}resetCard(moving);moving=null});
})();


;(()=>{"use strict";
 const linkUrl="https://cmd-hosting-mods-api-production.up.railway.app/mods/autres-jeux";
 function addMultiGameLink(){
  const root=document.getElementById("cmdMods");
  if(!root||document.getElementById("cmdOtherGamesModsLink"))return;
  const anchor=document.createElement("a");
  anchor.id="cmdOtherGamesModsLink";
  anchor.href=linkUrl;
  anchor.target="_blank";anchor.rel="noopener noreferrer";
  anchor.textContent="Mods autres jeux · FS25, Minecraft, Conan, Factorio… ↗";
  anchor.title="Catalogue de mods multi-jeux; aucune installation automatique sans autorisation";
  anchor.style.cssText="display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 16px;margin:8px 0;border:1.5px solid #9cc9ff;border-radius:13px;background:linear-gradient(145deg,#2986ce,#7852c1);color:#fff;text-decoration:none;font:750 13px system-ui;box-shadow:inset 0 2px #ffffff4d,0 7px 19px #080c2699,0 0 12px #7c78ff66";
  (root.querySelector(".cmdv-toolbar")||root.querySelector(".cmdv-head")||root).appendChild(anchor);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",addMultiGameLink,{once:true});
 else addMultiGameLink();
 let waiting=false;new MutationObserver(()=>{if(waiting)return;waiting=true;requestAnimationFrame(()=>{waiting=false;addMultiGameLink()})}).observe(document.body,{childList:true,subtree:true});
})();

;(()=>{
 const style=document.createElement('style');style.id='cmd-mods-mobile-fix';
 style.textContent=`html.cmd-console #cmdTopbar{background:linear-gradient(135deg,#271d35,#1b1428)!important;height:auto!important;min-height:var(--cmd-head);padding-top:8px;padding-bottom:8px}html.cmd-console body{padding-top:var(--cmd-topbar-height,var(--cmd-head))!important}#cmdMods .cmdv-toolbar{min-width:0}#cmdMods .cmdv-toolbar select{max-width:100%;min-width:0}#cmdOtherGamesModsLink{box-sizing:border-box;max-width:100%;white-space:normal}`;
 document.head.appendChild(style);
 const bar=document.getElementById('cmdTopbar');
 if(bar){const sync=()=>document.documentElement.style.setProperty('--cmd-topbar-height',Math.ceil(bar.getBoundingClientRect().height)+'px');sync();if(typeof ResizeObserver!=='undefined')new ResizeObserver(sync).observe(bar);}
})();
