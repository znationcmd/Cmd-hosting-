/* CMD Hosting v7: one clear server-first menu, real catalog, native Palworld Workshop.
   Presentation only: NEVER creates or claims game servers, installs mods, changes rentals or permissions. */
(()=>{'use strict';
 if(window.__cmdHostingSimpleV7)return;
 window.__cmdHostingSimpleV7=true;
 const $=id=>document.getElementById(id);
 const clean=text=>String(text||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu,'')
  .replace(/[^\p{L}\p{N} &+]/gu,' ').trim().replace(/\s+/g,' ').toLowerCase();
 const duplicateLabels=new Set([
  'mods & workshop','mods et workshop','mods workshop',
  'jeux et decors hd','jeux et decor hd','jeux & decors hd','jeux et decors',
  'boutique des jeux','boutique de jeux'
 ]);
 const menuNames={jeux:'Jeux',cmdCatalogSection:'Jeux',compte:'Mon compte',aide:'Aide'};
 function nativePage(name){
  const target=document.querySelector('#cmdOriginalNav [data-page="'+name+'"],.links [data-page="'+name+'"]');
  if(target){target.click();return true}
  if(typeof window.show==='function'&&$(name)){window.show(name);return true}
  return false;
 }
 function openProfile(){
  const profile=document.querySelector('#cmdPrimary [data-page="cmdRenterProfile"]');
  if(profile){profile.click();return}
  nativePage('cmdRenterProfile');
 }
 function openCatalog(){
  if(nativePage('cmdCatalogSection'))return;
  nativePage('jeux');
 }
 function showPalworld(){
  openProfile();
  if(typeof window.CMDHostingOpenPalworldWorkshop==='function'){
   window.CMDHostingOpenPalworldWorkshop();
   return;
  }
  window.open('https://steamcommunity.com/app/1623730/workshop/','_blank','noopener,noreferrer');
 }
 function sidebarButton(id,label,run){
  const area=$('cmdPrimary');
  if(!area)return null;
  let button=$(id);
  if(button)return button;
  button=document.createElement('button');button.type='button';button.id=id;button.className='cmd-nav cmd-nav-v7';
  const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');
  icon.textContent=id==='cmdv7Catalog'?'▤':id==='cmdv7Account'?'◉':'?';
  const text=document.createElement('span');text.textContent=label;
  button.append(icon,text);button.addEventListener('click',run);
  const advanced=$('cmdAdvancedServerTools');
  if(advanced&&advanced.parentElement===area)area.insertBefore(button,advanced);
  else area.append(button);
  return button;
 }
 function hideRedundancies(){
  const global=$('cmdOriginalNav');
  if(global){
   for(const el of global.querySelectorAll('a,button,[role="button"]')){
    const label=clean(el.getAttribute('aria-label')||el.textContent);
    if(!duplicateLabels.has(label))continue;
    el.hidden=true;el.dataset.cmdNavSuppressed='1';
    el.setAttribute('aria-hidden','true');el.setAttribute('tabindex','-1');
   }
  }
  // Never hide server-profile Mods/Fichiers/Console/Cartes actions.
  const other=$('cmdOtherSpaces');
  if(other){const summary=other.querySelector(':scope>summary');
   if(summary)summary.textContent='Autres rubriques · administration avancée';
   if(!other.dataset.cmdv7Initialized){other.open=false;other.dataset.cmdv7Initialized='1'}
  }
  const advanced=$('cmdAdvancedServerTools');
  if(advanced){const summary=advanced.querySelector(':scope>summary');
   if(summary)summary.textContent='Options techniques · sauvegardes et planification';
   if(!advanced.dataset.cmdv7Initialized){advanced.open=false;advanced.dataset.cmdv7Initialized='1'}
  }
  const shopButtons=[...document.querySelectorAll('#cmdSidebar a,#cmdSidebar button')];
  for(const el of shopButtons){
   if(el.closest('#cmdRenterProfile,#hostingPanel,#cmdMods'))continue;
   if(!duplicateLabels.has(clean(el.getAttribute('aria-label')||el.textContent)))continue;
   el.hidden=true;el.dataset.cmdNavSuppressed='1';
  }
 }
 function profileShortcut(){
  const root=$('cmdRenterProfile');
  if(!root)return;
  const sidebar=root.querySelector('.cmdrp-sidebar');
  if(!sidebar)return;
  let button=$('cmdrpPalworldWorkshop')||$('cmdrpPalworldOpenV6');
  if(button){
    button.onclick=showPalworld;
    button.textContent='Palworld · Steam Workshop';
    button.title='Parcourir le vrai Steam Workshop officiel de Palworld, sans installation fictive';
    button.hidden=false;
    button.dataset.cmdv7Palworld='1';
  }else{
    button=document.createElement('button');button.id='cmdrpPalworldWorkshop';button.type='button';
    button.textContent='Palworld · Steam Workshop';button.dataset.cmdv7Palworld='1';
    button.addEventListener('click',showPalworld);
    const before=$('cmdrpCreate');if(before)before.before(button);else sidebar.append(button);
  }
  const p=root.querySelector('.cmdrp-palworld-hint');
  if(p)p.textContent='Workshop officiel Palworld. Les mods de serveur demandent un hôte Windows et un fichier PalModSettings.ini.';
 }
 function catalogScreen(){
  // Make the full dynamic catalogue the only "Jeux" page. Legacy twelve-game cards
  // are kept for historical links but never used as the main catalogue.
  const full=$('cmdCatalogSection');
  const old=$('jeux');
  if(full&&old&&!old.dataset.cmdv7Redirect){
   old.dataset.cmdv7Redirect='1';
   const title=old.querySelector('h2');
   if(title)title.textContent='Jeux du catalogue';
  }
 }
 function render(){
  const nav=$('cmdPrimary');
  if(!nav)return;
  sidebarButton('cmdv7Catalog','Jeux · catalogue complet',openCatalog);
  sidebarButton('cmdv7Account','Mon compte',()=>nativePage('compte'));
  sidebarButton('cmdv7Help','Aide',()=>nativePage('aide'));
  hideRedundancies();profileShortcut();catalogScreen();
 }
 let scheduled=false;
 function requestRender(){
  if(scheduled)return;scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;render()});
 }
 function init(){
  render();
  if(typeof MutationObserver==='function'){
    new MutationObserver(requestRender).observe(document.body,{subtree:true,childList:true});
  }
  // Classic-script load order can create the renter profile after the shell.
  document.addEventListener('click',event=>{
    const el=event.target?.closest?.('[data-page="jeux"],[href="#jeux"]');
    if(!el||!el.closest('#cmdSidebar,#cmdPrimary,#cmdOriginalNav'))return;
    if(!$('cmdCatalogSection'))return;
    event.preventDefault();event.stopImmediatePropagation();openCatalog();
  },{capture:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 window.CMDHostingOpenFullCatalogV7=openCatalog;
 window.CMDHostingOpenMyServersV7=openProfile;
 window.CMDHostingOpenPalworldV7=showPalworld;
})();