/* CMD Hosting — navigation unique et catalogue mobile lisible.
   Menus uniquement : aucune suppression de page, profil, mod, serveur ou donnée. */
(()=>{'use strict';
 if(window.__cmdNavCleanup)return;window.__cmdNavCleanup=true;
 const duplicateLabels=/^\s*(?:[\p{Extended_Pictographic}\uFE0F\u200D\s]+)?(?:Mods\s*(?:&|et|\+)\s*Workshop|Jeux\s*et\s*d[eé]cors?\s*HD)\s*$/iu;
 function hideDuplicateEntries(){
   for(const element of document.querySelectorAll('#cmdPrimary button,#cmdSidebar button,.side-nav button,.side-menu button,.sidebar button,nav.links button,.cmd-menu button')){
     const label=(element.textContent||'').trim();
     if(!duplicateLabels.test(label))continue;
     if(element.dataset.cmdNavSuppressed==='1')continue;
     element.dataset.cmdNavSuppressed='1';
     element.hidden=true;element.style.display='none';
     element.setAttribute('aria-hidden','true');
     element.setAttribute('tabindex','-1');
   }
 }
 function install(){
   hideDuplicateEntries();
   if(typeof MutationObserver==='undefined')return;
   let pending=false;
   new MutationObserver(()=>{
     if(pending)return;pending=true;
     queueMicrotask(()=>{pending=false;hideDuplicateEntries()});
   }).observe(document.body,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
})();