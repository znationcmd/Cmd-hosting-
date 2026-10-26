/* CMD Hosting v11 — FS25 ModHub available from the actual server profile;
   show real authenticated PC status, never claim a machine is paired from agent poll logs. */
(()=>{'use strict';
 if(window.__cmdFS25PcV11)return;
 window.__cmdFS25PcV11=true;
 const $=id=>document.getElementById(id);
 const official='https://www.farming-simulator.com/mods.php?lang=fr&title=fs2025&platform=pc';
 const categories=['Tracteurs','Cartes','Camions','Véhicules','Bâtiments','John Deere'];
 const url=q=>q?official+'&'+new URLSearchParams({searchMod:q}).toString():official;
 function fs25Selected(){
  const selected=$('cmdrpSelect')?.selectedOptions?.[0];
  const label=[selected?.dataset?.cmdGame,selected?.textContent,$('cmdrpTitle')?.textContent].filter(Boolean).join(' ');
  return /\b(?:FS[\s-]?25|Farming[\s-]*Simulator[\s-]*25|Farming[\s-]*Simulator[\s-]*2025)\b/i.test(label);
 }
 function hasAnyServer(){return Number($('cmdrpSelect')?.options?.length||0)>0}
 function openMods(e){
  e?.preventDefault?.();
  const fn=window.CMDHostingOpenFS25ModHub;
  if(typeof fn==='function'){fn();return}
  window.open(official,'_blank','noopener,noreferrer');
 }
 function miniLink(label,query){
  const a=document.createElement('a');
  a.href=url(query);a.target='_blank';a.rel='noopener noreferrer';a.className='cmd-fs25-chip';
  a.textContent=label;return a;
 }
 function make(){
  const sidebar=$('cmdRenterProfile')?.querySelector('.cmdrp-sidebar');
  if(!sidebar)return;
  const visible=fs25Selected()||!hasAnyServer();
  let card=$('cmdFS25LocalPanelV11');
  if(!card){
   card=document.createElement('section');card.id='cmdFS25LocalPanelV11';
   card.className='cmd-fs25-local';
   const title=document.createElement('strong');title.textContent='FS25 · ModHub officiel';
   const message=document.createElement('p');
   message.textContent='Recherche et catégories des vrais mods GIANTS. Consultation possible même sans serveur installé.';
   const open=document.createElement('button');open.type='button';open.className='cmd-fs25-main';
   open.textContent='Voir les mods FS25';open.addEventListener('click',openMods);
   const entries=document.createElement('div');entries.className='cmd-fs25-categories';
   for(const category of categories)entries.append(miniLink(category,category));
   const caution=document.createElement('small');
   caution.textContent='Aucun mod installé automatiquement. Pour activer les ZIP, utilise le panneau natif GIANTS quand le serveur est arrêté.';
   card.append(title,message,open,entries,caution);
   sidebar.append(card);
  }
  card.hidden=!visible;
  // The original context-aware ModHub shortcut may have been hidden by older UI layers.
  const existing=$('cmdrpFS25ModHub');
  if(existing){existing.hidden=!visible;existing.disabled=!visible}
 }
 let lastState='';
 async function status(){
  const mods=$('cmdMods');if(!mods)return;
  const badge=mods.querySelector('.cmdv-wait');if(!badge)return;
  try{
   const response=await fetch('/api/pc/status',{credentials:'include',cache:'no-store',
     headers:{accept:'application/json'}});
   if(response.status===401||response.status===403){
    if(lastState!=='login'){badge.textContent='Connecte-toi à CMD Hosting pour associer ton PC';lastState='login'}return;
   }
   if(!response.ok){badge.textContent='État PC indisponible · vérifie Mes machines';return}
   const body=await response.json();
   const machine=body.machine;
   const online=Boolean(machine?.online);
   const count=Array.isArray(machine?.servers)?machine.servers.length:0;
   badge.textContent=online?'PC relié · '+count+' serveur'+(count>1?'s':''):'PC non associé à ce compte ou agent hors ligne';
   lastState=online?'online':'offline';
  }catch{badge.textContent='Connexion du PC : état non vérifié'}
 }
 let queued=false;
 function render(){
  if(queued)return;queued=true;
  requestAnimationFrame(()=>{queued=false;make()});
 }
 const style=document.createElement('style');
 style.textContent=[
  '#cmdRenterProfile #cmdFS25LocalPanelV11{display:grid;gap:9px;padding:13px;margin:10px 0;border:1px solid #6998de;border-radius:12px;background:linear-gradient(120deg,#113652,#302455);color:#f3f6ff;min-width:0}',
  '#cmdRenterProfile #cmdFS25LocalPanelV11[hidden]{display:none!important}',
  '#cmdFS25LocalPanelV11 strong{font-size:15px;color:#fff}',
  '#cmdFS25LocalPanelV11 p{font-size:12px;line-height:1.5;color:#cbdef0;margin:0}',
  '#cmdFS25LocalPanelV11 small{font-size:11px;line-height:1.4;color:#c4d6e6}',
  '#cmdFS25LocalPanelV11 .cmd-fs25-main{width:100%;min-height:42px;padding:7px 10px;border-radius:9px;background:linear-gradient(110deg,#2084be,#674ca4);border:1px solid #a1bafa;color:#fff;font-weight:700;cursor:pointer}',
  '#cmdFS25LocalPanelV11 .cmd-fs25-categories{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}',
  '#cmdFS25LocalPanelV11 .cmd-fs25-chip{padding:7px 5px;text-align:center;font-size:11px;color:#e7f2ff;text-decoration:none;border-radius:8px;border:1px solid #6081ac;background:#162d50;min-width:0}',
  '#cmdFS25LocalPanelV11 .cmd-fs25-chip:hover{background:#284c79}',
  '#cmdRenterProfile #cmdrpFS25ModHub[hidden]{display:none!important}'
 ].join('\n');
 document.head.append(style);
 function init(){
  render();status();
  document.addEventListener('change',e=>{if(e.target?.id==='cmdrpSelect')render()});
  document.addEventListener('click',e=>{
   const button=e.target?.closest?.('#cmdV11PCStatusLink');
   if(!button)return;
   if(typeof window.show==='function')window.show('machines');
   else location.hash='#machines';
  });
  if(typeof MutationObserver==='function')new MutationObserver(render).observe(document.body,{childList:true,subtree:true});
  // A status lookup requires the current authenticated browser session; never access secrets.
  document.addEventListener('click',e=>{
   if(e.target?.closest?.('#cmdMods,[data-page="cmdMods"],[data-page="cmdRenterProfile"]'))status();
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 window.CMDHostingOpenFS25V11=openMods;
 window.CMDHostingPCStatusV11=status;
})();
