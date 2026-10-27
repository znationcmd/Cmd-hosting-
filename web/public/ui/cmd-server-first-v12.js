/* CMD HOSTING v12 — server-first mobile navigation; standalone no backend mutations.
 * Consolidates overlapping nav layers while leaving all game controls untouched.
 */
(()=>{'use strict';
if(window.__CMD_SERVER_FIRST_V12__)return;
window.__CMD_SERVER_FIRST_V12__=true;
const $=id=>document.getElementById(id);
const globalRoots=['cmdPrimary','cmdSidebar','cmdOriginalNav','nav'];
const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
 .replace(/[^\p{L}\p{N}&+ ]/gu,' ').trim().replace(/\s+/g,' ').toLowerCase();
const duplicated=new Set(['mods & workshop','mods et workshop','jeux et decors hd',
 'jeux & decors hd','boutique des jeux','boutique de jeux','changer de jeu',
 'fichiers','console','jeux et configurations','mods workshop']);
const safeAreas='#cmdRenterProfile,#hostingPanel,#cmdMods,#cmdGameSwitch,#cmdCatalogSection,#cmdIntegratedGames';
const palworldUrl='https://steamcommunity.com/app/1623730/workshop/';
let framePending=false;
function suppressGlobalDuplicates(){
 for(const id of globalRoots){
  const root=$(id);if(!root)continue;
  for(const entry of root.querySelectorAll('button,a,[role="button"]')){
   if(entry.closest(safeAreas))continue;
   const label=normalize(entry.getAttribute('aria-label')||entry.textContent);
   if(!duplicated.has(label))continue;
   entry.hidden=true;entry.dataset.cmdNavSuppressed='1';
   entry.setAttribute('aria-hidden','true');entry.tabIndex=-1;
  }
 }
}
function fullCatalog(){
 const full=$('cmdCatalogSection'),old=$('jeux');
 // Legacy twelve-game preview is retained as a fallback if the dynamic catalogue is absent.
 const hasCards=!!full?.querySelector('#cmdShopGrid>.cmd-shop-card');
 const target=full&&hasCards?full:old||full;
 if(!target)return;
 if(typeof window.show==='function')window.show(target.id);
 else document.querySelectorAll('.page').forEach(p=>p.classList.toggle('hide',p!==target));
 if(old)old.dataset.cmdLegacyPreview=String(target!==old?'1':'0');
 try{history.replaceState(null,'','#'+target.id)}catch{}
 $('cmdTitle')&&( $('cmdTitle').textContent='Jeux · catalogue complet' );
}
function serverProfile(){
 const panel=$('cmdRenterProfile');
 if(!panel)return;
 if(typeof window.show==='function')window.show(panel.id);
 else document.querySelectorAll('.page').forEach(p=>p.classList.toggle('hide',p!==panel));
 if(typeof window.CMDHostingOpenMyServersV7==='function'){
  // Opening native profile loads real rentals/agent status, not a local fake server.
  const existing=$('cmdPrimary')?.querySelector('[data-page="cmdRenterProfile"]');
  if(existing)existing.click();
 }
}
function openPalworldMods(){
 if(typeof window.CMDHostingOpenPalworldWorkshop==='function'){
  window.CMDHostingOpenPalworldWorkshop();return;
 }
 window.open(palworldUrl,'_blank','noopener,noreferrer');
}
function helpText(){
 const selected=$('cmdrpSelect')?.selectedOptions?.[0];
 const game=[selected?.dataset?.cmdGame,selected?.textContent,$('cmdrpTitle')?.textContent].filter(Boolean).join(' ');
 return /\bpalworld\b/i.test(game);
}
function profileControls(){
 const profile=$('cmdRenterProfile'),side=profile?.querySelector('.cmdrp-sidebar');
 if(!profile||!side)return;
 const selected=$('cmdrpSelect')?.selectedOptions?.[0];
 // Keep the original Mods button for game-aware DayZ, ARK, Arma and FS25 support.
 const native=[...profile.querySelectorAll('#cmdrpSettings button')].find(x=>normalize(x.textContent)==='mods'||normalize(x.textContent)==='mods & workshop');
 if(native){native.hidden=false;native.dataset.cmdProfileMods='1';native.textContent='Mods & Workshop';}
 let button=$('cmdrpPalworldWorkshop')||$('cmdrpAlwaysPalworld')||$('cmdrpPalworldOpenV6');
 if(!button){
  button=document.createElement('button');button.type='button';button.id='cmdrpPalworldWorkshop';
  side.querySelector('#cmdrpCreate')?.before(button);
  if(!button.isConnected)side.append(button);
 }
 // A visible Palworld shortcut even when no Palworld server is registered yet.
 // No fake Palworld server is added to the list.
 button.textContent=helpText()?'Palworld · Workshop officiel':'Explorer les mods Palworld';
 button.hidden=false;button.disabled=false;button.dataset.cmdProfilePalworld='1';
 button.setAttribute('aria-hidden','false');
 if(!button.dataset.cmdV12Bound){
  // Existing older layers may already own the same click listener;
  // stop in capture to open exactly once.
  button.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();openPalworldMods()},true);
  button.dataset.cmdV12Bound='1';
 }
 for(const entry of side.querySelectorAll('#cmdrpAlwaysPalworld,#cmdrpPalworldOpenV6,#cmdrpFS25ModHub')){
  if(entry!==button&&entry.id!=='cmdrpFS25ModHub'){entry.hidden=true;entry.disabled=true;}
 }
 let note=$('cmdrpV12Help');
 if(!note){note=document.createElement('p');note.id='cmdrpV12Help';note.className='cmdrp-prepared-help';button.after(note)}
 note.textContent=helpText()
   ?'Steam Workshop officiel Palworld. Le serveur Windows doit contenir des mods compatibles dans Mods/Workshop et Mods/PalModSettings.ini.'
   :'Le Workshop Palworld est consultable sans serveur associé. Aucun mod ni serveur n’est installé automatiquement.';
 // Do not claim any prepared configurations are live.
 const status=$('cmdrpStatus');
 if(status?.textContent?.includes('0 serveur'))status.title='Les configurations enregistrées sont distinctes des serveurs réellement installés sur la machine.';
}
function compactFallback(){
 const old=$('jeux'),full=$('cmdCatalogSection');
 if(!old)return;
 const hasCards=!!full?.querySelector('#cmdShopGrid>.cmd-shop-card');
 old.dataset.cmdLegacyPreview=hasCards?'1':'0';
}
function refresh(){
 suppressGlobalDuplicates();profileControls();compactFallback();
}
function schedule(){
 if(framePending)return;framePending=true;
 requestAnimationFrame(()=>{framePending=false;refresh()});
}
function routeNav(e){
 const node=e.target?.closest?.('[data-page="jeux"],[href="#jeux"],#cmdv7Catalog');
 if(!node||!node.closest('#cmdSidebar,#cmdPrimary,#cmdOriginalNav,#nav'))return;
 e.preventDefault();e.stopImmediatePropagation();fullCatalog();
}
function init(){
 refresh();
 document.addEventListener('click',routeNav,true);
 document.addEventListener('change',e=>{if(e.target?.id==='cmdrpSelect')schedule()});
 window.addEventListener('hashchange',()=>{if(location.hash==='#jeux')fullCatalog()});
 if(location.hash==='#jeux')fullCatalog();
 if(typeof MutationObserver==='function')new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.CMDHostingOpenMobileCatalog=fullCatalog;
window.CMDHostingOpenProfileModsPalworld=openPalworldMods;
})();