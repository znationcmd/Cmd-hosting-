/* CMD Hosting — single navigation, no duplicated Mods / Workshop or gallery.
   Keep the existing server profile, mods, settings and user data intact. */
(()=>{'use strict';
 if(window.__cmdNavCleanup)return;window.__cmdNavCleanup=true;
 const NAV_SELECTORS=[
   '#cmdPrimary button','#cmdPrimary a','#cmdSidebar button','#cmdSidebar a',
   '#nav button','#nav a','nav.links button','nav.links a',
   '.side-nav button','.side-nav a','.side-menu button','.side-menu a',
   '.sidebar button','.sidebar a','.app-sidebar button','.app-sidebar a','#sidebar button','#sidebar a',
   '.navigation button','.navigation a','.cmd-menu button','.cmd-menu a',
   '.menu-sidebar button','.menu-sidebar a','[data-cmd16="navigation"] button'
 ].join(',');
 const duplicate=/^(?:mods\s*(?:&|et|\+|and)\s*workshop|jeux\s*et\s*decors?\s*hd)$/i;
 function cleaned(node){
  return String(node.getAttribute('aria-label')||node.textContent||'')
   .replace(/[\p{Extended_Pictographic}\uFE0F\u200D\uFE0E]/gu,'')
   .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
   .replace(/[^a-zA-Z0-9&+]+/g,' ').trim().replace(/\s+/g,' ');
 }
 function hideDuplicateEntries(){
  for(const element of document.querySelectorAll(NAV_SELECTORS)){
   // Hide only standalone global navigation. Never hide controls inside a profile.
   if(element.closest('#cmdRenterProfile,.cmdrp,#cmdMods,.cmdv-toolbar,.cmdv-block,[data-server-profile]'))continue;
   if(!duplicate.test(cleaned(element)))continue;
   element.classList.add('cmd-nav-duplicate-hidden');
   element.dataset.cmdNavSuppressed='1';
   element.hidden=true;
   element.style.setProperty('display','none','important');
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