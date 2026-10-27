/* CMD Hosting — menu unifié. Conserve les fonctions dans « Mes serveurs → Profil ».
   Cette couche ne modifie jamais les permissions, locations, sauvegardes ou serveurs. */
(()=>{'use strict';
 if(window.__cmdNavCleanup)return;
 window.__cmdNavCleanup=true;
 const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu,'')
  .replace(/[^a-zA-Z0-9&+ ]/g,' ').trim().replace(/\s+/g,' ').toLowerCase();
 const globalRedundancies=new Set([
  'mods & workshop','mods et workshop','mods workshop',
  'jeux et decors hd','jeux et decor hd','jeux & decors hd','jeux et decors',
  'boutique des jeux','boutique de jeux'
 ]);
 const profileSelectors='#cmdRenterProfile,#cmdMods,.cmdrp,#cmdv,.cmdv-toolbar,.cmdv-block,'+
  '[data-server-profile],#hostingPanel,#cmdGameSwitch';
 function isGlobalNav(element){
  if(element.closest(profileSelectors))return false;
  if(element.matches('#cmdPrimary button,#cmdPrimary a,#cmdSidebar button,#cmdSidebar a'))return true;
  const zone=element.closest('nav,aside,[role="navigation"],.side-menu,.side-nav,.sidebar,'+
   '.side-menu,.menu-sidebar,.navigation,#sidebar,#nav,#cmdNav,.cmd-menu');
  if(!zone)return false;
  // Never hide a genuine action inside a file manager or game card.
  if(element.closest('.game,.card,.tile,.server-card,.host-block,.cmd-shop-card'))return false;
  return true;
 }
 function clean(){
  for(const element of document.querySelectorAll('button,a,[role="button"]')){
   if(!isGlobalNav(element))continue;
   const label=normalize(element.getAttribute('aria-label')||element.textContent||'');
   if(!globalRedundancies.has(label))continue;
   // On layouts where Jeux is absent, retain an entry to the catalog.
   if(label.startsWith('boutique')&&!document.querySelector('[data-page="jeux"],[data-page="cmdCatalogSection"]'))continue;
   element.hidden=true;
   element.dataset.cmdNavSuppressed='1';
   element.setAttribute('aria-hidden','true');
   element.setAttribute('tabindex','-1');
   element.style.setProperty('display','none','important');
  }
 }
 let scheduled=false;
 const schedule=()=>{
  if(scheduled)return;scheduled=true;
  queueMicrotask(()=>{scheduled=false;clean();});
 };
 function openFullCatalog(event){
  if(window.__CMD_SERVER_FIRST_V12__)return;
  const nav=event.target?.closest?.('[data-page="jeux"],[href="#jeux"]');
  if(!nav||!isGlobalNav(nav)||!document.getElementById('cmdCatalogSection'))return;
  if(typeof window.show!=='function')return;
  // The original "Jeux" links to only a few static images. Use the full
  // catalog page without deleting the old form or losing any server action.
  event.preventDefault();
  event.stopImmediatePropagation();
  window.show('cmdCatalogSection');
  for(const button of document.querySelectorAll('[data-page].active'))button.classList.remove('active');
  nav.classList.add('active');
  try{history.replaceState(null,'','#cmdCatalogSection')}catch{}
 }
 function start(){
  clean();
  document.addEventListener('click',openFullCatalog,{capture:true});
  if(typeof MutationObserver==='undefined')return;
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
