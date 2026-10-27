/* CMD Hosting V11 — one navigation, one responsive catalog, one Mods space per server.
   UI only: NEVER creates or changes server/lease state, payment, mods or authentication. */
(()=>{'use strict';
if(window.__CMD_HOSTING_UNIFIED_V11__)return;
window.__CMD_HOSTING_UNIFIED_V11__=true;
const $=id=>document.getElementById(id);
const NAV_ROOTS='#cmdPrimary,#cmdSidebar,#cmdOriginalNav,#nav';
const SAFE_ACTIONS='#cmdRenterProfile,#hostingPanel,#cmdMods,#cmdGameSwitch,#cmdCatalogSection,#jeux,#cmdIntegratedGames';
const normalized=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[\u{1F300}-\u{1FAFF}\uFE0F\u200D]/gu,'').replace(/[^a-z0-9 &+]/gi,' ')
  .trim().replace(/\s+/g,' ').toLowerCase();
const HIDE=new Set(['mods & workshop','mods et workshop','mods workshop',
 'jeux et decors hd','jeux & decors hd','jeux et decor hd','jeux et decors',
 'changer de jeu','fichiers','console','boutique des jeux','boutique de jeux',
 'jeux et configurations','configurations enregistrees']);
const GAME_WORDS=/\bpalworld\b/i;
function selectedName(){
 const option=$('cmdrpSelect')?.selectedOptions?.[0];
 return [option?.dataset?.cmdGame,option?.textContent,$('cmdrpTitle')?.textContent].filter(Boolean).join(' ');
}
function isPalworld(){return GAME_WORDS.test(selectedName())}
function inGlobalNav(node){
 const root=node.closest(NAV_ROOTS);
 return !!root&&!node.closest(SAFE_ACTIONS);
}
function hideDuplicateMenu(){
 for(const root of document.querySelectorAll(NAV_ROOTS)){
  for(const item of root.querySelectorAll('button,a,[role="button"]')){
   if(!inGlobalNav(item))continue;
   const text=normalized(item.getAttribute('aria-label')||item.textContent);
   if(HIDE.has(text)){
    if(!item.hidden)item.hidden=true;
    if(item.dataset.cmdNavSuppressed!=='1')item.dataset.cmdNavSuppressed='1';
    if(item.getAttribute('aria-hidden')!=='true')item.setAttribute('aria-hidden','true');
    if(item.tabIndex!==-1)item.tabIndex=-1;
   }
  }
 }
 // Hide the obsolete visual-only catalog entry, but not its section or contents.
 const unused=$('cmdV8PalworldProfile');if(unused)unused.hidden=true;
}
function showFullCatalog(){
 const target=$('cmdCatalogSection')||$('jeux');
 if(!target)return;
 if(typeof window.show==='function')window.show(target.id);
 else document.querySelectorAll('.page').forEach(p=>p.classList.toggle('hide',p!==target));
 try{if(location.hash!=='#'+target.id)history.replaceState(null,'','#'+target.id)}catch{}
}
function openPalworld(){
 if(typeof window.CMDHostingOpenPalworldWorkshop==='function')return window.CMDHostingOpenPalworldWorkshop();
 const a=document.createElement('a');a.href='https://steamcommunity.com/app/1623730/workshop/';
 a.target='_blank';a.rel='noopener noreferrer';a.click();
}
function openSelectedMods(){
 if(isPalworld())return openPalworld();
 const option=$('cmdrpSelect')?.selectedOptions?.[0];
 if(!option){$('cmdrpStatus').textContent='Choisis d’abord un serveur ou un profil.';return}
 if(/\bfarming simulator 25\b|\bfs[ -]?25\b/i.test(selectedName()) &&
    typeof window.CMDHostingOpenFS25ModHub==='function')return window.CMDHostingOpenFS25ModHub();
 if(typeof window.CMDHostingOpenMods==='function'){
  const saved=option.value?.replace(/^r/,'');
  if(saved)try{sessionStorage.setItem('cvServer',saved)}catch{}
  return window.CMDHostingOpenMods();
 }
 $('cmdrpStatus').textContent='Le gestionnaire Mods de ce serveur est indisponible sur cette version.';
}
function profileTools(){
 if(window.__CMD_SERVER_FIRST_V12__)return;
 const panel=$('cmdRenterProfile'),sidebar=panel?.querySelector('.cmdrp-sidebar');
 if(!sidebar)return;
 const active=!!$('cmdrpSelect')?.selectedOptions?.[0];
 // Keep the native server "Mods" action exactly once, instead of duplicating it globally.
 const settings=$('cmdrpSettings');
 const native=Array.from(settings?.querySelectorAll('button')||[])
   .find(button=>normalized(button.textContent)==='mods'||normalized(button.textContent)==='mods & workshop');
 if(native){
  if(normalized(native.textContent)!=='mods & workshop')native.textContent='Mods & Workshop';
  native.title='Mods du serveur sélectionné, par source officielle compatible.';
  native.dataset.cmdProfileMods='1';
 }
 // Only create the action if the existing server controller has no Mods entry.
 let fallback=$('cmdrpOnlyMods');
 if(!native&&!fallback){
  fallback=document.createElement('button');fallback.id='cmdrpOnlyMods';fallback.type='button';
  fallback.textContent='Mods & Workshop';fallback.addEventListener('click',openSelectedMods);
  sidebar.querySelector('#cmdrpCreate')?.before(fallback);
  if(!fallback.isConnected)sidebar.append(fallback);
 }
 if(fallback){fallback.hidden=!!native||!active;fallback.disabled=!active;}
 // A single Palworld entry is shown ONLY when the selected profile belongs to Palworld.
 const palworld=Array.from(sidebar.querySelectorAll('button')).filter(b=>
   ['cmdrpPalworldWorkshop','cmdrpPalworldOpenV6','cmdrpAlwaysPalworld'].includes(b.id));
 const chosen=isPalworld()&&active;
 let primary=palworld[0];
 if(!primary&&chosen){
  primary=document.createElement('button');primary.type='button';primary.id='cmdrpPalworldWorkshop';
  primary.addEventListener('click',openPalworld);
  sidebar.querySelector('#cmdrpCreate')?.before(primary);
  if(!primary.isConnected)sidebar.append(primary);
 }
 for(const b of palworld){
  b.hidden=(!chosen||b!==primary);
  b.disabled=(!chosen||b!==primary);
  b.setAttribute('aria-hidden',String(b.hidden));
 }
 if(primary){
  if(primary.textContent!=='Palworld · Steam Workshop')primary.textContent='Palworld · Steam Workshop';
  primary.title='Consulter le Workshop officiel de Palworld. L’installation sur le serveur Windows nécessite des fichiers réels et des mods compatibles.';
  primary.hidden=!chosen;primary.disabled=!chosen;
  primary.dataset.cmdProfilePalworld='1';
 }
 const hint=sidebar.querySelector('.cmdrp-palworld-hint');
 if(hint)hint.hidden=!chosen;
 // Do not confuse a profile saved in the catalogue with a running server.
 const title=$('cmdrpDescription');
 if(title?.textContent?.includes('prepared'))title.textContent=title.textContent.replace('prepared','Profil préparé · non installé');
}
function hideLegacyGamePreview(){
 const legacy=$('jeux');
 if(!legacy||!$('cmdCatalogSection'))return;
 legacy.dataset.cmdLegacyPreview='1';
 // Keep original HTML for compatibility with old direct links, but never show 12 oversized posters.
}
let waiting=false;
function refresh(){hideDuplicateMenu();profileTools();hideLegacyGamePreview()}
function queue(){
 if(waiting)return;
 waiting=true;
 requestAnimationFrame(()=>{waiting=false;refresh()});
}
function handleNavigation(event){
 if(window.__CMD_SERVER_FIRST_V12__)return;
 const link=event.target?.closest?.('[data-page="jeux"],[href="#jeux"],#cmdv7Catalog');
 if(!link||!link.closest(NAV_ROOTS)||!$('cmdCatalogSection'))return;
 event.preventDefault();event.stopImmediatePropagation();showFullCatalog();
}
function init(){
 refresh();
 document.addEventListener('click',handleNavigation,true);
 document.addEventListener('change',e=>{if(e.target?.id==='cmdrpSelect')queue()});
 window.addEventListener('hashchange',()=>{
  if(location.hash==='#jeux'&&$('cmdCatalogSection'))showFullCatalog();
 });
 if(location.hash==='#jeux'&&$('cmdCatalogSection'))showFullCatalog();
 if(typeof MutationObserver==='function')new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.CMDHostingOpenFullCatalog=showFullCatalog;
window.CMDHostingOpenPalworldInProfile=openPalworld;
})();
