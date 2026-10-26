/* CMD Hosting — unified navigation & Palworld workshop v6.
   Presentation only: never changes accounts, mods, local files, payment or live server status. */
(()=>{'use strict';
 if(window.__cmdUnifiedExperienceV6)return;
 window.__cmdUnifiedExperienceV6=true;
 const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[\u{1F000}-\u{1FFFF}\u2600-\u27BF\uFE0F]/gu,'')
  .replace(/[^a-z0-9&+ ]/gi,' ').toLowerCase().replace(/\s+/g,' ').trim();
 const redundant=new Set(['mods & workshop','mods et workshop','mods workshop','jeux et decors hd',
  'jeux & decors hd','jeux et decor hd','jeux et decors','boutique des jeux','boutique de jeux']);
 function mainNavigation(el){
  if(el.closest('#cmdRenterProfile,#cmdMods,#hostingPanel,#cmdGameSwitch,#cmdCatalogSection,#jeux,#panneau,#machines,#commande,#rentals,.server-card,.game-card,.cmd-shop-card'))return false;
  if(el.closest('#cmdSidebar,#cmdPrimary,#cmdNav,#cmdMenu,#nav,.links,.sidebar,.side-nav,.side-menu,.cmd-sidebar,[role=navigation],nav,aside'))return true;
  return false;
 }
 function deduplicateNav(){
  for(const el of document.querySelectorAll('button,a,[role=button]')){
   if(!mainNavigation(el))continue;
   const text=normalize(el.getAttribute('aria-label')||el.textContent);
   if(!redundant.has(text))continue;
   // Keep the only game catalogue access if the main Jeux button does not exist.
   if(text.startsWith('boutique')&&!document.querySelector('[data-page="jeux"],[data-page="cmdCatalogSection"]'))continue;
   el.dataset.cmdNavSuppressed='1';el.hidden=true;el.setAttribute('aria-hidden','true');
   el.tabIndex=-1;el.style.setProperty('display','none','important');
  }
 }
 function openPalworld(){
  if(typeof window.CMDHostingOpenPalworldWorkshop==='function'){
   window.CMDHostingOpenPalworldWorkshop();
   const field=document.getElementById('cvSearch');
   if(field)field.placeholder='Rechercher un mod Palworld dans Steam Workshop';
  }else{
   window.open('https://steamcommunity.com/app/1623730/workshop/','_blank','noopener,noreferrer');
  }
 }
 function installPalworld(){
  const profile=document.getElementById('cmdRenterProfile');
  const side=profile?.querySelector('.cmdrp-sidebar');
  if(side){
   const old=side.querySelector('#cmdrpPalworldWorkshop');
   if(old){
    if(old.textContent!=='Palworld · Steam Workshop')old.textContent='Palworld · Steam Workshop';
    old.title='Voir les mods Palworld compatibles Steam, même sans serveur connecté';
    old.classList.add('cmdrp-palworld-open');
   }else if(!side.querySelector('#cmdrpPalworldOpenV6')){
    const btn=document.createElement('button');
    btn.type='button';btn.id='cmdrpPalworldOpenV6';btn.className='cmdrp-palworld-open';
    btn.textContent='Mods Palworld · Workshop Steam';btn.onclick=openPalworld;
    const create=side.querySelector('#cmdrpCreate');if(create)create.before(btn);else side.append(btn);
   }
   if(!side.querySelector('.cmdrp-palworld-hint')){
    const hint=document.createElement('p');hint.className='cmdrp-palworld-hint';
    hint.textContent='Mods Palworld accessibles ici, même sans machine. Installation réelle après connexion du PC.';
    const target=side.querySelector('#cmdrpPalworldWorkshop,#cmdrpPalworldOpenV6');if(target)target.after(hint);else side.append(hint);
   }
  }
  const mods=document.getElementById('cmdMods');
  if(mods&&!mods.querySelector('#cvQuickPalworld')&&!mods.querySelector('#cmdPalworldWorkshopV6')){
   const heading=mods.querySelector('.cmdv-head');
   const b=document.createElement('button');b.type='button';b.id='cmdPalworldWorkshopV6';
   b.textContent='Palworld · Steam Workshop';b.onclick=openPalworld;
   if(heading)heading.after(b);else mods.prepend(b);
  }
  const quick=mods?.querySelector('#cvQuickPalworld');
  if(quick){if(quick.hidden)quick.hidden=false;if(quick.style.display)quick.style.removeProperty('display');if(quick.textContent!=='Voir les mods Palworld')quick.textContent='Voir les mods Palworld';}
 }
 function clampCovers(){
  if(!window.matchMedia('(max-width:780px)').matches)return;
  const clamp=(el,max)=>{
   if(!el)return;
   for(const [k,v] of Object.entries({maxHeight:max+'px',height:max+'px',minHeight:'0px',objectFit:'cover'})){
    const css=k.replace(/[A-Z]/g,x=>'-'+x.toLowerCase());
    if(el.style.getPropertyValue(css)!==v)el.style.setProperty(css,v,'important');
   }
  };
  document.querySelectorAll('#jeux #game-list .game > img.real-game-image').forEach(el=>clamp(el,88));
  document.querySelectorAll('#cmdCatalogSection .cmd-shop-cover img').forEach(el=>clamp(el,89));
 }
 function update(){
  deduplicateNav();installPalworld();clampCovers();
 }
 let scheduled=false;
 function schedule(){
  if(scheduled)return;scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;update()});
 }
 function init(){
  update();
  if(typeof MutationObserver==='function')new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});
  window.addEventListener('resize',schedule,{passive:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
