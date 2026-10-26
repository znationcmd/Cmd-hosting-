/* CMD Hosting V9: one game catalogue and one server workspace, no duplicate menu pages.
   UI-only: never invents rentals, real installations or mod availability. */
(()=>{'use strict';
 if(window.__cmdHostingServerFirstV9)return;
 window.__cmdHostingServerFirstV9=true;
 const $=id=>document.getElementById(id);
 const clean=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
   .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu,'')
   .replace(/[^\p{L}\p{N}&+ ]/gu,' ').replace(/\s+/g,' ').trim().toLowerCase();
 const duplicates=new Set([
   'mods & workshop','mods et workshop','mods workshop',
   'jeux et decors hd','jeux & decors hd','jeux et decor hd','jeux et decors',
   'boutique des jeux','boutique de jeux',
   'changer de jeu','fichiers','console','mods','workshop',
   'jeux et configurations','configurations enregistrees'
 ]);
 const navRoots=['cmdSidebar','cmdOriginalNav','cmdPrimary','nav'];
 const exclude='#cmdRenterProfile,#cmdMods,#hostingPanel,#cmdGameSwitch,#cmdCatalogSection,#cmdIntegratedGames,#jeux,.server-card,.game-card,.game,.cmd-shop-card';
 function hideMenuDuplicates(){
   for(const id of navRoots){
     const root=$(id);if(!root)continue;
     for(const el of root.querySelectorAll('a,button,[role="button"]')){
       if(el.closest(exclude))continue;
       const label=clean(el.getAttribute('aria-label')||el.textContent);
       if(!duplicates.has(label))continue;
       // Only duplicate global links are suppressed: real actions inside a server remain available.
       el.hidden=true;
       el.dataset.cmdNavSuppressed='1';
       el.setAttribute('aria-hidden','true');
       el.tabIndex=-1;
     }
   }
   const oldShortcut=$('cmdV8PalworldProfile');
   if(oldShortcut){oldShortcut.remove()}
 }
 function fullGames(){
   const full=$('cmdCatalogSection'),old=$('jeux');
   const page=full||old;
   if(!page)return;
   if(typeof window.show==='function')window.show(page.id);
   else{
     for(const other of document.querySelectorAll('.page'))other.classList.toggle('hide',other!==page);
   }
   if(page.id==='cmdCatalogSection'){
     // A full catalogue replaces the legacy 12-image teaser.
     for(const button of document.querySelectorAll('[data-page].active'))button.classList.remove('active');
   }
   if(location.hash!=='#'+page.id)history.replaceState(null,'','#'+page.id);
 }
 function linkPrimaryGames(){
   for(const rootId of navRoots){
     const nav=$(rootId);if(!nav)continue;
     for(const link of nav.querySelectorAll('[data-page="jeux"],[href="#jeux"]')){
       if(link.dataset.cmdV9Games==='1')continue;
       link.dataset.cmdV9Games='1';
       link.addEventListener('click',event=>{
         if(!$('cmdCatalogSection'))return;
         event.preventDefault();event.stopImmediatePropagation();
         fullGames();
       },true);
     }
   }
 }
 function palworldLink(){
   const profile=$('cmdRenterProfile');
   if(!profile)return;
   const side=profile.querySelector('.cmdrp-sidebar');
   if(!side)return;
   // One authoritative shortcut, in the server workspace only.
   const native=$('cmdrpPalworldWorkshop')||$('cmdrpPalworldOpenV6');
   const duplicate=$('cmdV8PalworldProfile');
   if(duplicate)duplicate.remove();
   if(!native)return;
   const selection=$('cmdrpSelect')?.selectedOptions?.[0];
   const game=String(selection?.dataset?.cmdGame||'');
   const label=String(selection?.textContent||'');
   const heading=String($('cmdrpTitle')?.textContent||'');
   const chosen=/\bpalworld\b/i.test(game||label+' '+heading);
   const noServer=!selection || !$('cmdrpSelect')?.options.length;
   native.hidden=!(chosen||noServer);
   native.disabled=!(chosen||noServer);
   native.setAttribute('aria-hidden',String(native.hidden));
   native.textContent='Palworld · Steam Workshop officiel';
   native.title='Catalogue officiel Palworld, accessible même sans machine. Installation uniquement sur serveur compatible.';
   native.style.removeProperty('display');
   const hint=profile.querySelector('.cmdrp-palworld-hint');
   if(hint)hint.hidden=native.hidden;
 }
 // The catalogue heading must always describe the catalogue, not 12 legacy pictures.
 function catalogLabel(){
   const button=$('cmdv7Catalog');
   if(button)button.setAttribute('aria-label','Jeux du catalogue complet');
   const old=$('jeux');
   if(old){old.dataset.cmdLegacyPreview='1'}
 }
 function update(){hideMenuDuplicates();linkPrimaryGames();palworldLink();catalogLabel()}
 let scheduled=false;
 function schedule(){
   if(scheduled)return;
   scheduled=true;
   requestAnimationFrame(()=>{scheduled=false;update()});
 }
 function init(){
   update();
   if(typeof MutationObserver==='function')new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});
   document.addEventListener('change',event=>{if(event.target?.id==='cmdrpSelect')schedule()});
   document.addEventListener('click',event=>{
     if(event.target?.closest?.('#cmdv7Catalog')){event.preventDefault();event.stopImmediatePropagation();fullGames()}
   },true);
   window.addEventListener('hashchange',()=>{
     if(location.hash==='#jeux'&&$('cmdCatalogSection'))fullGames()
   });
   if(location.hash==='#jeux'&&$('cmdCatalogSection'))fullGames();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 window.CMDHostingOpenFullCatalog=fullGames;
})();