/* CMD Hosting v10 — SAFE SERVER-FIRST MOBILE PATCH.
 * One compact games catalogue, profile-only mods/tools, official Palworld Workshop.
 * Does NOT create fake servers, change a rental, touch authentication, or issue game commands.
 * Can be embedded after the existing public catalog-compat.js on Railway.
 */
(()=>{'use strict';
 if(window.__cmdHostingMobileV10)return;
 window.__cmdHostingMobileV10=true;
 const $=id=>document.getElementById(id);
 const styleId='cmdHostingMobileV10';
 const menuRoots='#cmdSidebar,#cmdPrimary,#cmdOriginalNav,#nav';
 const protectedAreas='#cmdRenterProfile,#hostingPanel,#cmdMods,#cmdGameSwitch,#cmdCatalogSection,#cmdIntegratedGames,.server-card,.game-card,.game,.cmd-shop-card';
 const norm=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
   .replace(/[\u{1F300}-\u{1FAFF}\uFE0F\u200D]/gu,'')
   .replace(/[^a-zA-Z0-9&+ ]/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
 const duplicates=new Set([
   'mods & workshop','mods et workshop','mods workshop',
   'jeux et decors hd','jeux & decors hd','jeux et decor hd',
   'boutique des jeux','boutique de jeux',
   'changer de jeu','fichiers','console','workshop',
   'jeux et configurations','configurations enregistrees'
 ]);
 const css=[
 'html body #jeux #game-list{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:10px!important;max-width:100%!important}',
 'html body #jeux #game-list>.game{display:grid!important;grid-template-columns:90px minmax(0,1fr)!important;gap:10px!important;min-width:0!important;max-width:100%!important;min-height:96px!important;max-height:none!important;height:auto!important;margin:0!important;padding:9px!important;overflow:hidden!important;align-items:center!important}',
 'html body #jeux #game-list>.game>img,html body #jeux #game-list>.game>.real-game-image{display:block!important;position:static!important;grid-column:1!important;grid-row:1!important;min-width:0!important;width:90px!important;max-width:90px!important;height:74px!important;max-height:74px!important;min-height:0!important;object-fit:cover!important;aspect-ratio:auto!important;border-radius:8px!important;float:none!important;transform:none!important;margin:0!important}',
 'html body #jeux #game-list>.game>.game-body{display:flex!important;grid-column:2!important;grid-row:1!important;flex-direction:column!important;gap:5px!important;min-width:0!important;width:100%!important;height:auto!important;max-height:none!important;padding:4px!important;margin:0!important;overflow-wrap:anywhere!important}',
 'html body #jeux #game-list .game-body h3{font-size:14px!important;line-height:1.25!important;white-space:normal!important;overflow-wrap:anywhere!important;margin:0!important}',
 'html body #jeux #game-list .game-body p{font-size:11px!important;line-height:1.3!important;max-height:45px!important;overflow:hidden!important;margin:0!important}',
 'html body #cmdCatalogSection #cmdShopGrid{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:10px!important;max-width:100%!important}',
 'html body #cmdCatalogSection .cmd-shop-card{display:grid!important;grid-template-columns:90px minmax(0,1fr)!important;min-width:0!important;max-width:100%!important;height:auto!important;max-height:none!important;min-height:96px!important;padding:9px!important;overflow:hidden!important;transform:none!important;position:relative!important}',
 'html body #cmdCatalogSection .cmd-shop-cover{position:static!important;grid-column:1!important;grid-row:1!important;width:90px!important;min-width:0!important;height:74px!important;max-height:74px!important;min-height:0!important;overflow:hidden!important;transform:none!important}',
 'html body #cmdCatalogSection .cmd-shop-cover img{width:100%!important;height:100%!important;max-height:74px!important;object-fit:cover!important;position:static!important;transform:none!important}',
 'html body #cmdCatalogSection .cmd-shop-text{display:flex!important;grid-column:2!important;grid-row:1!important;flex-direction:column!important;justify-content:center!important;min-width:0!important;max-height:none!important;height:auto!important;padding:4px!important;overflow:hidden!important}',
 'html body #cmdCatalogSection .cmd-shop-name{font-size:14px!important;line-height:1.3!important;white-space:normal!important;overflow-wrap:anywhere!important}',
 'html body #cmdCatalogSection .cmd-shop-feature{max-height:155px!important;height:145px!important;overflow:hidden!important}',
 'html body #cmdRenterProfile #cmdrpAlwaysPalworld{display:block!important;width:100%!important;min-height:44px!important;padding:9px!important;white-space:normal!important;border:1px solid #779fe1!important;border-radius:9px!important;color:#f7faff!important;background:linear-gradient(115deg,#19588a,#50389d)!important;font-size:13px!important;font-weight:700!important;cursor:pointer!important}',
 'html body #cmdRenterProfile .cmdrp-sidebar{max-width:100%!important;min-width:0!important}',
 'html body [data-cmd-v10-hide="1"]{display:none!important}',
 '@media(min-width:801px){html body #jeux #game-list{grid-template-columns:repeat(auto-fill,minmax(290px,1fr))!important}html body #cmdCatalogSection #cmdShopGrid{grid-template-columns:repeat(auto-fill,minmax(250px,1fr))!important}}',
 '@media(max-width:400px){html body #jeux #game-list>.game,html body #cmdCatalogSection .cmd-shop-card{grid-template-columns:76px minmax(0,1fr)!important}html body #jeux #game-list>.game>img,html body #cmdCatalogSection .cmd-shop-cover{width:76px!important;max-width:76px!important;height:68px!important;max-height:68px!important}}'
 ].join('\n');
 function injectCss(){
   if($(styleId))return;
   const el=document.createElement('style');el.id=styleId;el.textContent=css;document.head.append(el);
 }
 function hideDuplicates(){
   const visited=new Set();
   for(const root of document.querySelectorAll(menuRoots)){
    for(const el of root.querySelectorAll('button,a,[role="button"]')){
     if(visited.has(el)){continue}visited.add(el);
     if(el.closest(protectedAreas))continue;
     const label=norm(el.getAttribute('aria-label')||el.textContent);
     if(!duplicates.has(label))continue;
     if(el.dataset.cmdV10Hide==='1')continue;
     el.dataset.cmdV10Hide='1';el.hidden=true;el.setAttribute('aria-hidden','true');el.tabIndex=-1;
    }
   }
 }
 function openFullCatalog(){
   const full=$('cmdCatalogSection')||$('jeux');
   if(!full)return;
   if(typeof window.show==='function')window.show(full.id);
   else document.querySelectorAll('.page').forEach(p=>p.classList.toggle('hide',p!==full));
   try{if(location.hash!=='#'+full.id)history.replaceState(null,'','#'+full.id)}catch{}
 }
 function openPalworld(){
   if(typeof window.CMDHostingOpenPalworldWorkshop==='function'){
     window.CMDHostingOpenPalworldWorkshop();return;
   }
   window.open('https://steamcommunity.com/app/1623730/workshop/','_blank','noopener,noreferrer');
 }
 function profileWorkshop(){
   const profile=$('cmdRenterProfile'),side=profile?.querySelector('.cmdrp-sidebar');
   if(!side)return;
   let button=$('cmdrpAlwaysPalworld');
   if(!button){
    button=document.createElement('button');button.type='button';button.id='cmdrpAlwaysPalworld';
    button.textContent='Palworld · Steam Workshop';
    button.title='Rechercher les mods Palworld, même sans machine ni serveur. Aucun téléchargement automatique.';
    button.addEventListener('click',openPalworld);
    const create=side.querySelector('#cmdrpCreate');
    if(create)create.before(button);else side.append(button);
   }
   // This is a browser/source entry, NOT a claim that any Palworld server is installed.
   button.hidden=false;button.disabled=false;
   // Prevent the old game-dependent shortcut from appearing twice.
   const old=$('cmdrpPalworldWorkshop');
   if(old&&old!==button){old.hidden=true;old.dataset.cmdV10Hide='1'}
 }
 let queued=false;
 function update(){injectCss();hideDuplicates();profileWorkshop()}
 function queue(){
  if(queued)return;queued=true;
  requestAnimationFrame(()=>{queued=false;update()});
 }
 function init(){
  update();
  document.addEventListener('click',event=>{
   const target=event.target?.closest?.('[data-page="jeux"],[href="#jeux"],#cmdv7Catalog');
   if(!target||!target.closest(menuRoots)||!$('cmdCatalogSection'))return;
   event.preventDefault();event.stopImmediatePropagation();openFullCatalog();
  },true);
  if(typeof MutationObserver==='function')new MutationObserver(queue).observe(document.body,{subtree:true,childList:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 window.CMDHostingV10OpenCatalog=openFullCatalog;
 window.CMDHostingV10OpenPalworld=openPalworld;
})();
