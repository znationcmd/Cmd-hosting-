/* v10 Railway compact override: additive UI only; real servers and databases untouched. */
(()=>{'use strict';if(window.__cmdHostingRailwayV10)return;window.__cmdHostingRailwayV10=true;
const $=id=>document.getElementById(id);
const css=`
html body #jeux #game-list,html body #cmdCatalogSection #cmdShopGrid{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:9px!important;max-width:100%!important}
html body #jeux #game-list>.game,html body #cmdCatalogSection .cmd-shop-card{display:grid!important;grid-template-columns:90px minmax(0,1fr)!important;align-items:center!important;gap:9px!important;min-width:0!important;max-width:100%!important;min-height:95px!important;height:auto!important;max-height:none!important;overflow:hidden!important;padding:8px!important;margin:0!important;transform:none!important;position:relative!important}
html body #jeux #game-list>.game>img,html body #jeux #game-list>.game>.real-game-image,html body #cmdCatalogSection .cmd-shop-cover{grid-column:1!important;grid-row:1!important;display:block!important;position:static!important;width:90px!important;max-width:90px!important;min-width:0!important;height:74px!important;max-height:74px!important;min-height:0!important;aspect-ratio:auto!important;object-fit:cover!important;overflow:hidden!important;margin:0!important;transform:none!important}
html body #cmdCatalogSection .cmd-shop-cover img{display:block!important;position:static!important;width:100%!important;height:100%!important;max-height:74px!important;object-fit:cover!important}
html body #jeux #game-list>.game>.game-body,html body #cmdCatalogSection .cmd-shop-text{grid-column:2!important;grid-row:1!important;display:flex!important;flex-direction:column!important;justify-content:center!important;gap:4px!important;min-width:0!important;max-width:100%!important;height:auto!important;max-height:none!important;overflow:hidden!important;padding:4px!important;margin:0!important}
html body #jeux #game-list .game-body h3,html body #cmdCatalogSection .cmd-shop-name{font-size:14px!important;line-height:1.25!important;white-space:normal!important;overflow-wrap:anywhere!important}
html body #jeux #game-list .game-body p{font-size:11px!important;max-height:40px!important;overflow:hidden!important}
html body #cmdCatalogSection .cmd-shop-feature{max-height:150px!important;overflow:hidden!important}
html body [data-cmd-v10-hide="1"]{display:none!important}
html body #cmdRenterProfile #cmdrpRailwayPalworld{display:block!important;width:100%!important;min-height:44px!important;background:linear-gradient(110deg,#16568a,#473b90)!important;border:1px solid #80a8ec!important;color:#fff!important;border-radius:9px!important;font-size:13px!important;font-weight:700!important;cursor:pointer!important}
@media(min-width:800px){html body #jeux #game-list{grid-template-columns:repeat(auto-fill,minmax(280px,1fr))!important}html body #cmdCatalogSection #cmdShopGrid{grid-template-columns:repeat(auto-fill,minmax(245px,1fr))!important}}
`;
function apply(){
 if(!$('cmdRailwayCssV10')){const st=document.createElement('style');st.id='cmdRailwayCssV10';st.textContent=css;document.head.append(st)}
 const area=$('cmdRenterProfile')?.querySelector('.cmdrp-sidebar');
 if(area&&!$('cmdrpRailwayPalworld')){
  const b=document.createElement('button');b.id='cmdrpRailwayPalworld';b.type='button';
  b.textContent='Palworld · Steam Workshop';
  b.title='Consulter le Workshop Palworld même sans serveur. Ne télécharge pas automatiquement de mods.';
  b.addEventListener('click',()=>{if(typeof window.CMDHostingOpenPalworldWorkshop==='function')window.CMDHostingOpenPalworldWorkshop();
   else window.open('https://steamcommunity.com/app/1623730/workshop/','_blank','noopener,noreferrer')});
  const anchor=area.querySelector('#cmdrpCreate');if(anchor)anchor.before(b);else area.append(b);
 }
 const unneeded=new Set(['mods & workshop','mods et workshop','jeux et decors hd','jeux & decors hd','boutique des jeux','boutique de jeux','changer de jeu','jeux et configurations']);
 for(const menu of document.querySelectorAll('#cmdSidebar,#cmdPrimary,#cmdOriginalNav,#nav')){
  for(const el of menu.querySelectorAll('button,a')){
   if(el.closest('#cmdRenterProfile,#cmdMods,#hostingPanel,#cmdGameSwitch,#cmdCatalogSection,#jeux'))continue;
   const label=String(el.getAttribute('aria-label')||el.textContent||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9&+ ]/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
   if(!unneeded.has(label)||el.dataset.cmdV10Hide)return;
   el.dataset.cmdV10Hide='1';el.hidden=true;el.setAttribute('aria-hidden','true');
  }
 }
}
function openFullCatalog(){
 const target=$('cmdCatalogSection')||$('jeux');if(!target)return;
 if(typeof window.show==='function')window.show(target.id);
 else document.querySelectorAll('.page').forEach(p=>p.classList.toggle('hide',p!==target));
 try{history.replaceState(null,'','#'+target.id)}catch{}
}
function init(){
 apply();let queued=false;
 if(typeof MutationObserver==='function')new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}).observe(document.body,{subtree:true,childList:true});
 document.addEventListener('click',e=>{
  const button=e.target?.closest?.('[data-page="jeux"],[href="#jeux"]');
  if(!button||!button.closest('#cmdSidebar,#cmdPrimary,#cmdOriginalNav,#nav')||!$('cmdCatalogSection'))return;
  e.preventDefault();e.stopImmediatePropagation();openFullCatalog();
 },true);
 if(location.hash==='#jeux'&&$('cmdCatalogSection'))openFullCatalog();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
