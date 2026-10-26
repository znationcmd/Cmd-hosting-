/* CMD Hosting V8 — practical mobile repair. Presentation/navigation only; never invents servers. */
(()=>{'use strict';
 if(window.__cmdServerFirstV8)return;window.__cmdServerFirstV8=true;
 const $=id=>document.getElementById(id);
 const normalized=t=>String(t||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu,'')
  .replace(/[^\p{L}\p{N}&+ ]/gu,' ').replace(/\s+/g,' ').trim().toLowerCase();
 const redundant=new Set(['mods & workshop','mods et workshop','mods workshop',
  'jeux et decors hd','jeux et decor hd','jeux & decors hd','jeux et decors',
  'boutique des jeux','boutique de jeux']);
 const keepWithin='#cmdRenterProfile,#cmdMods,#hostingPanel,#cmdGameSwitch,#cmdCatalogSection,.server-card,.game-card,.cmd-shop-card';
 const palworldUrl='https://steamcommunity.com/app/1623730/workshop/';
 function removeDuplicateNavigation(){
  const roots=['cmdSidebar','cmdOriginalNav','nav'];
  for(const id of roots){
   const node=$(id);if(!node)continue;
   for(const target of node.querySelectorAll('button,a,[role="button"]')){
    if(target.closest(keepWithin))continue;
    if(!redundant.has(normalized(target.getAttribute('aria-label')||target.textContent)))continue;
    if(target.dataset.cmdNavSuppressed!=='1'){
      target.dataset.cmdNavSuppressed='1';
      target.hidden=true;target.setAttribute('aria-hidden','true');target.tabIndex=-1;
    }
   }
  }
 }
 function openGames(){
  if($('cmdCatalogSection')&&typeof window.show==='function'){
   window.show('cmdCatalogSection');
   window.location.hash='#cmdCatalogSection';
   return;
  }
  const link=document.querySelector('[data-page="cmdCatalogSection"]');
  if(link){link.click();return}
  const fallback=document.querySelector('[data-page="jeux"]');
  if(fallback)fallback.click();
 }
 function palworld(){
  const open=window.CMDHostingOpenPalworldWorkshop;
  if(typeof open==='function'){open();return}
  window.open(palworldUrl,'_blank','noopener,noreferrer');
 }
 function palworldLink(parent,id,caption){
  if(!parent||$(id))return;
  const link=document.createElement('button');link.type='button';link.id=id;
  link.textContent=caption;
  link.title='Steam Workshop officiel Palworld. Mods serveur réservés au dédié Windows et compatibles seulement.';
  link.addEventListener('click',palworld);
  parent.append(link);
 }
 function keepWorkshopWithinServer(){
  const profile=$('cmdRenterProfile');
  if(profile){
   const area=profile.querySelector('.cmdrp-sidebar');
   if(area){
    // This is NOT a top-level duplicate Mods navigation item.
    const create=$('cmdrpCreate');
    const host=create?.parentElement===area?area:null;
    if(host&&!$('cmdV8PalworldProfile')){
      const b=document.createElement('button');b.id='cmdV8PalworldProfile';
      b.type='button';b.textContent='Palworld · Voir les mods Steam';
      b.title='Catalogue officiel consultable, même si aucun serveur Palworld n’est relié.';
      b.onclick=palworld;b.className='cmd-v8-palworld-profile';
      create.before(b);
    }
   }
  }
  const mods=$('cmdMods');
  if(mods&&!$('cmdV8Palworld')){
   const b=document.createElement('button');b.id='cmdV8Palworld';b.type='button';
   b.textContent='Palworld · Ouvrir le Steam Workshop officiel';b.addEventListener('click',palworld);
   const tools=mods.querySelector('.cmdv-toolbar')||mods.querySelector('.cmdv-head');
   if(tools)tools.after(b);else mods.prepend(b);
  }
 }
 function labelCatalog(){
  const main=$('cmdPrimary');
  if(main){
   const full=$('cmdv7Catalog');
   if(full&&full.textContent.indexOf('Jeux')<0)full.textContent='Jeux · catalogue complet';
  }
 }
 function refresh(){removeDuplicateNavigation();keepWorkshopWithinServer();labelCatalog()}
 let pending=false;
 function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;refresh()})}
 function init(){
  refresh();
  document.addEventListener('click',ev=>{
   const target=ev.target?.closest?.('#cmdSidebar [data-page="jeux"],#cmdOriginalNav [data-page="jeux"],#nav [data-page="jeux"]');
   if(!target||!$('cmdCatalogSection'))return;
   ev.preventDefault();ev.stopImmediatePropagation();openGames();
  },true);
  if(typeof MutationObserver==='function')new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 window.CMDHostingOpenPalworldWorkshopFromProfile=palworld;
})();
