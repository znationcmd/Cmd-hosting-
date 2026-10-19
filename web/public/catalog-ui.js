(function(){
'use strict';
if(document.getElementById('cmdCatalogSection'))return;
const pagesRef=typeof pages!=='undefined'?pages:null;
if(Array.isArray(pagesRef))pagesRef.push('cmdCatalogSection');
const main=document.querySelector('main.wrap')||document.querySelector('main');
if(!main)return;
const section=document.createElement('section');
section.id='cmdCatalogSection';section.className='page section hide';
section.innerHTML='<div class="cmd-shop-top"><div><span class="cmd-kicker">CMD HOSTING / CATALOGUE DES JEUX</span><h2>Boutique de serveurs</h2><p>Explore les jeux prévus pour CMD Hosting. Les commandes seront ouvertes après la mise en place et les essais de notre machine.</p></div><div class="cmd-shop-pending"><span class="cmd-shop-dot"></span> Locations non ouvertes</div></div><div class="cmd-shop-feature"><div class="cmd-shop-feature-cover"></div><div class="cmd-shop-feature-content"><span class="cmd-shop-chip">BOUTIQUE CMD HOSTING</span><h3>ANOMALIA.<br>Survie · RP · PVP · PVE.</h3><p>ANOMALIA PRIMEVAL OUTBOUNDUN : zombies, dinosaures, construction et ANOMALIA Editor. Présentation du jeu CMD en pré-alpha ; hébergement dédié à valider.</p><small>Jeux compatibles en couleur · versions à vérifier en gris · aucun prix tant que le service n\'est pas ouvert.</small></div></div><div class="cmd-shop-tools"><label class="cmd-shop-search-label"><span>⌕</span><input id="cmdShopSearch" type="search" aria-label="Rechercher un jeu" placeholder="Rechercher parmi les jeux…" autocomplete="off"></label><div id="cmdShopPlatforms" class="cmd-shop-platforms" role="group" aria-label="Plateformes"></div></div><div class="cmd-shop-bottom"><div><strong id="cmdShopCount">Catalogue des jeux</strong><span id="cmdShopLegend"> &nbsp;•&nbsp; Sélectionne un jeu pour les détails</span></div><select id="cmdShopStatus" aria-label="Filtrer selon la compatibilité"><option value="all">Tous les jeux</option><option value="dedicated">Serveur dédié possible</option><option value="review">À vérifier</option><option value="restricted">Accès restreint</option></select></div><div id="cmdShopGrid" class="cmd-shop-grid" aria-live="polite"></div><p class="cmd-shop-disclaimer">Les images correspondent aux jeux, pas à une promesse de disponibilité. Les versions console et mobile nécessitent parfois une autorisation d\'éditeur ou un fournisseur exclusif. Aucun paiement ni provisionnement n\'est actif ici.</p>';
main.append(section);
const styles=document.createElement('style');
styles.textContent=[
'#cmdCatalogSection{max-width:1500px;margin:0 auto;--shop-border:#2b384a;--shop-muted:#a5b8ca;color:#eaf1f7}',
'.cmd-shop-top{display:flex;justify-content:space-between;align-items:center;gap:18px;margin:2px 0 24px}',
'.cmd-kicker{font-size:11px;letter-spacing:.16em;color:#6cc7f9;font-weight:800}',
'.cmd-shop-top h2{font-size:clamp(26px,4vw,38px);margin:8px 0 7px!important;color:white}',
'.cmd-shop-top p{margin:0;color:#a7b7c9;line-height:1.5;max-width:660px}',
'.cmd-shop-pending{display:flex;align-items:center;gap:9px;padding:9px 13px;border:1px solid #426078;background:#162636;border-radius:9px;color:#b6d7ef;white-space:nowrap;font-size:12px;font-weight:700}',
'.cmd-shop-dot{width:8px;height:8px;border-radius:50%;background:#fbbf70;box-shadow:0 0 0 4px #fbbf7019}',
'.cmd-shop-feature{height:258px;position:relative;overflow:hidden;border-radius:15px;border:1px solid #34485d;background:radial-gradient(circle at 78% 20%,#254c65 0%,transparent 54%),linear-gradient(130deg,#132339,#101b2b 72%);margin-bottom:26px}',
'.cmd-shop-feature-cover{position:absolute;inset:-35% -8% -40% 42%;opacity:.4;background:linear-gradient(90deg,#142538,transparent 65%),url(/anomalia-promo-preview.jpg) center/cover no-repeat;transform:rotate(-8deg);animation:cmdShopFloat 11s ease-in-out infinite alternate;filter:saturate(1.2)}',
'.cmd-shop-feature-content{position:relative;z-index:1;max-width:560px;padding:30px 34px}',
'.cmd-shop-chip{font-size:10px;border:1px solid #499bc7;color:#7fdaff;padding:6px 9px;border-radius:5px;letter-spacing:.13em;font-weight:800}',
'.cmd-shop-feature h3{color:#fff;font-size:clamp(24px,3.4vw,38px);letter-spacing:-.04em;line-height:1.1;margin:13px 0 8px}',
'.cmd-shop-feature p{color:#d4e2f2;font-size:13px;line-height:1.5;margin:6px 0 8px;max-width:480px}',
'.cmd-shop-feature small{font-size:11px;color:#9cb9c8}',
'@keyframes cmdShopFloat{from{transform:scale(1) rotate(-8deg) translate(-2%,0)}to{transform:scale(1.13) rotate(-8deg) translate(3%,-2%)}}',
'.cmd-shop-tools{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:19px}',
'.cmd-shop-search-label{display:flex;align-items:center;gap:8px;background:#101e2d;border:1px solid #34455c;border-radius:9px;padding:0 14px;min-height:44px;flex:1 1 235px;max-width:370px;color:#a7b7c9}',
'.cmd-shop-search-label span{font-size:23px;line-height:1}',
'#cmdShopSearch{min-width:80px;flex:1;background:transparent;border:0!important;outline:none!important;color:#f0f7ff!important;font:inherit;font-size:13px;box-shadow:none!important}',
'.cmd-shop-platforms{display:flex;flex-wrap:wrap;gap:7px}',
'.cmd-shop-platforms button{color:#b3c6da!important;background:#172739!important;border:1px solid #34455a!important;border-radius:8px!important;min-height:38px!important;padding:6px 12px!important;font-size:12px!important;font-weight:650!important}',
'.cmd-shop-platforms button[aria-pressed=true]{background:#16466a!important;color:#fff!important;border-color:#47bdfb!important}',
'.cmd-shop-bottom{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:14px 0 17px;font-size:13px}',
'.cmd-shop-bottom strong{color:#f6f8fb}.cmd-shop-bottom span{color:#98adbe}',
'#cmdShopStatus{width:auto;min-width:145px;max-width:260px;height:37px;background:#112235;color:#c9dce9;border:1px solid #354a5f;border-radius:7px;padding:0 10px}',
'.cmd-shop-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:17px}',
'.cmd-shop-card{min-width:0;background:#122033;border:1px solid #2b4055;border-radius:12px;overflow:hidden;text-align:left;color:#eff7ff;cursor:pointer;transition:transform .26s cubic-bezier(.2,.65,.3,1),border-color .22s,box-shadow .22s;position:relative;padding:0!important;font-family:inherit}',
'.cmd-shop-card:hover,.cmd-shop-card:focus-visible{transform:translateY(-6px);border-color:#409acf;box-shadow:0 17px 35px #0006;outline:none}',
'.cmd-shop-cover{height:128px;overflow:hidden;position:relative;background:linear-gradient(145deg,#30485f,#0a1725)}',
'.cmd-shop-cover img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .55s ease,filter .35s;animation:cmdShopAppear 650ms ease both}',
'.cmd-shop-card:hover .cmd-shop-cover img,.cmd-shop-card:focus-visible .cmd-shop-cover img{transform:scale(1.115) translateY(-2px)}',
'.cmd-shop-shine{position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 26%,#fff0 35%,#ffffff38 48%,#fff0 59%,transparent 70%);transform:translateX(-160%);transition:transform .6s ease}',
'.cmd-shop-card:hover .cmd-shop-shine{transform:translateX(160%)}',
'.cmd-shop-card.is-muted .cmd-shop-cover img{filter:grayscale(.56) saturate(.65) brightness(.82)}',
'.cmd-shop-card.is-muted{border-color:#303d4a;background:#17212e}',
'.cmd-shop-flag{position:absolute;bottom:8px;left:9px;font-size:10px;background:#071323db;color:#e8f4ff;border:1px solid #667a8a73;border-radius:4px;padding:4px 7px;max-width:calc(100% - 18px)}',
'.cmd-shop-text{padding:13px 13px 15px;min-height:98px;display:flex;flex-direction:column;gap:6px}',
'.cmd-shop-name{font-size:14px;font-weight:760;line-height:1.35;min-height:36px;overflow-wrap:anywhere}',
'.cmd-shop-tags{font-size:10px;letter-spacing:.04em;color:#8eb2ca;text-transform:uppercase}',
'.cmd-shop-state{font-size:11px;color:#93e0bb;margin-top:auto}',
'.is-muted .cmd-shop-state{color:#a0adbc}',
'@keyframes cmdShopAppear{from{opacity:0;transform:scale(1.035)}to{opacity:1;transform:scale(1)}}',
'.cmd-shop-disclaimer{margin:28px 0;color:#98aabc;font-size:12px;line-height:1.6}',
'.cmd-shop-empty{grid-column:1/-1;padding:40px;text-align:center;border:1px dashed #496077;border-radius:10px;color:#afbdce}',
'.cmd-shop-modal{position:fixed;inset:0;z-index:1500;background:#000b;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}',
'.cmd-shop-dialog{width:min(100%,490px);max-height:90vh;overflow:auto;background:#14243a;border:1px solid #3b5871;border-radius:14px;color:#ecf5fd;box-shadow:0 28px 90px #000a}',
'.cmd-shop-dialog img{width:100%;aspect-ratio:460/215;object-fit:cover;background:#273c52}',
'.cmd-shop-dialog-content{padding:22px}.cmd-shop-dialog h3{margin:0 0 9px;font-size:23px;color:white}',
'.cmd-shop-dialog p{font-size:13px;line-height:1.6;color:#bfd0e2}',
'.cmd-shop-dialog .cmd-shop-actions{display:flex;justify-content:space-between;flex-wrap:wrap;align-items:center;gap:12px;margin-top:20px}',
'.cmd-shop-dialog button,.cmd-shop-dialog a{padding:9px 12px;border-radius:7px;border:1px solid #446b85;background:#1c3a50;color:#e5f7ff;text-decoration:none;font:600 12px system-ui;cursor:pointer}',
'@media(max-width:740px){.cmd-shop-top{align-items:flex-start;flex-direction:column}.cmd-shop-feature{height:250px}.cmd-shop-feature-content{padding:23px}.cmd-shop-feature-cover{opacity:.25;inset:-8% -30% -8% 5%}.cmd-shop-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cmd-shop-cover{height:100px}.cmd-shop-text{padding:10px;min-height:106px}.cmd-shop-name{font-size:12px}.cmd-shop-bottom span{display:none}.cmd-shop-platforms button{font-size:11px!important;padding:6px 9px!important}}',
'@media(prefers-reduced-motion:reduce){.cmd-shop-feature-cover,.cmd-shop-cover img,.cmd-shop-card,.cmd-shop-shine{animation:none!important;transition:none!important}}'
].join('\n');
document.head.append(styles);
const originalNav=document.querySelector('#cmdOriginalNav .links')||document.querySelector('.links');
if(originalNav){
 const navBtn=document.createElement('button');navBtn.type='button';navBtn.dataset.page='cmdCatalogSection';navBtn.textContent='🎮 Boutique de jeux';navBtn.addEventListener('click',()=>openShop());originalNav.prepend(navBtn);
}
const side=document.getElementById('cmdPrimary');
if(side){
 const button=document.createElement('button');button.type='button';button.className='cmd-nav';button.dataset.shop='yes';
 const ico=document.createElement('span');ico.textContent='🎮';const label=document.createElement('span');label.textContent='Boutique des jeux';
 button.append(ico,label);button.onclick=()=>openShop();
 const header=document.createElement('span');header.className='cmd-group-title';header.textContent='BOUTIQUE';
 side.prepend(button);side.prepend(header);
}
const platforms=[['all','Tous'],['pc','PC'],['ps','PlayStation'],['xbox','Xbox'],['switch','Nintendo'],['mobile','Mobile']];
let records=[],activePlatform='all',currentQuery='',activeStatus='all';
const filters=document.getElementById('cmdShopPlatforms'),grid=document.getElementById('cmdShopGrid');
const labels={dedicated:'Dédié possible · en préparation',restricted:'Accès éditeur / fournisseur requis',review:'Installation à vérifier'};
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const platformName={pc:'PC',ps:'PlayStation',xbox:'Xbox',switch:'Nintendo Switch',mobile:'Mobile'};
for(const [key,name]of platforms){
 const btn=document.createElement('button');btn.type='button';btn.textContent=name;btn.setAttribute('aria-pressed',String(key==='all'));
 btn.onclick=()=>{activePlatform=key;for(const b of filters.children)b.setAttribute('aria-pressed',String(b===btn));render()};
 filters.append(btn);
}
document.getElementById('cmdShopSearch').addEventListener('input',e=>{currentQuery=e.target.value.toLocaleLowerCase('fr').trim();render()});
document.getElementById('cmdShopStatus').addEventListener('change',e=>{activeStatus=e.target.value;render()});
function openShop(){
 if(typeof show==='function')show('cmdCatalogSection');
 else{for(const p of document.querySelectorAll('.page'))p.classList.add('hide');section.classList.remove('hide')}
 const label=document.getElementById('cmdTitle');if(label)label.textContent='Boutique des jeux';
 const menu=document.getElementById('cmdSidebar');if(menu){document.documentElement.classList.remove('cmd-menu-open');document.getElementById('cmdMenu')?.setAttribute('aria-expanded','false')}
 window.location.hash='cmdCatalogSection';
 section.scrollIntoView({block:'start',behavior:'instant'});
}
function modal(game){
 const overlay=document.createElement('div');overlay.className='cmd-shop-modal';overlay.setAttribute('role','presentation');
 const desc=game.id==='anomalia-cmd'?'ANOMALIA PRIMEVAL OUTBOUNDUN est en pré-alpha Windows. Le multijoueur, la construction et ANOMALIA Editor évoluent. La location de serveurs CMD Hosting pour ce jeu n’est pas encore disponible.':game.status==='dedicated'?'Une version serveur dédié existe pour ce titre. CMD Hosting doit encore préparer son installateur, son contrôle et sa machine avant de pouvoir le louer.':game.status==='restricted'?'Cet hébergement exige des droits, une infrastructure ou un fournisseur particulier. Cette version reste non commandable et n\'a pas de prix.':'Ce jeu est en cours de vérification technique ou contractuelle. Pas de location avant validation de son installation.';
 const cover=game.cover?'<img src="'+escapeHTML(game.cover)+'" alt="Visuel du jeu '+escapeHTML(game.name)+'">':'';
 const link=game.storeUrl?'<a href="'+escapeHTML(game.storeUrl)+'" target="_blank" rel="noopener noreferrer">'+(game.id==='anomalia-cmd'?'Projet ANOMALIA sur GitHub ↗':'Page officielle sur Steam ↗')+'</a>':'';
 overlay.innerHTML='<div class="cmd-shop-dialog" role="dialog" aria-modal="true" aria-label="'+escapeHTML(game.name)+'">'+cover+'<div class="cmd-shop-dialog-content"><h3>'+escapeHTML(game.name)+'</h3><div class="cmd-shop-tags">'+game.platforms.map(p=>escapeHTML(platformName[p]||p)).join(' · ')+'</div><p>'+escapeHTML(desc)+'</p><p><strong>Prix :</strong> non affiché · <strong>Installation CMD :</strong> non disponible pour le moment.</p><div class="cmd-shop-actions">'+link+'<button type="button" data-close-dialog>Fermer</button></div></div></div>';
 const dismiss=()=>{overlay.remove();document.removeEventListener('keydown',onKey)};
 const onKey=e=>{if(e.key==='Escape')dismiss()};
 overlay.querySelector('[data-close-dialog]').onclick=dismiss;
 overlay.addEventListener('click',e=>{if(e.target===overlay)dismiss()});
 document.addEventListener('keydown',onKey);
 document.body.append(overlay);overlay.querySelector('[data-close-dialog]').focus();
}
function render(){
 const subset=records.filter(x=>(activePlatform==='all'||x.platforms.includes(activePlatform))&&(activeStatus==='all'||x.status===activeStatus)&&(!currentQuery||(x.name+' '+x.genre).toLocaleLowerCase('fr').includes(currentQuery)));
 document.getElementById('cmdShopCount').textContent=subset.length+' jeux affichés';
 grid.replaceChildren();
 if(!subset.length){const p=document.createElement('p');p.className='cmd-shop-empty';p.textContent='Aucun jeu ne correspond à ces filtres.';grid.append(p);return;}
 const fragment=document.createDocumentFragment();
 for(const game of subset){
 const btn=document.createElement('button');btn.type='button';btn.className='cmd-shop-card'+(game.status!=='dedicated'?' is-muted':'');btn.setAttribute('aria-label','Détails de '+game.name);
 const imgHTML=game.cover?'<img loading="lazy" decoding="async" src="'+escapeHTML(game.cover)+'" alt="" onerror="this.style.display=\'none\'">':'';
 btn.innerHTML='<div class="cmd-shop-cover">'+imgHTML+'<span class="cmd-shop-shine"></span><span class="cmd-shop-flag">'+escapeHTML(game.genre)+'</span></div><div class="cmd-shop-text"><span class="cmd-shop-name">'+escapeHTML(game.name)+'</span><span class="cmd-shop-tags">'+escapeHTML(game.platforms.map(p=>platformName[p]||p).join(' · '))+'</span><span class="cmd-shop-state">'+escapeHTML(labels[game.status]||'À vérifier')+'</span></div>';
 btn.onclick=()=>modal(game);fragment.append(btn);
 }
 grid.append(fragment);
}
fetch('/api/catalog',{cache:'no-store'}).then(r=>r.json()).then(d=>{records=(d.games||[]).slice();if(!records.some(g=>String(g.name||'').toLowerCase().includes('anomalia')))records.push({id:'anomalia-cmd',name:'ANOMALIA PRIMEVAL OUTBOUNDUN',genre:'Survie · Zombies · Dinosaures · RP/PVP/PVE',platforms:['pc'],status:'review',cover:'/anomalia-promo-preview.jpg',storeUrl:'https://github.com/znationcmd/ANOMALIA-PRIMEVAL-OUTBOUNDUN'});records.sort((a,b)=>a.name.localeCompare(b.name,'fr'));render()}).catch(()=>{grid.innerHTML='<p class="cmd-shop-empty">Catalogue momentanément indisponible. Actualise la page.</p>'});
if(window.location.hash==='#cmdCatalogSection')openShop();
})();

/* CMD_HOSTING_INTEGRATED_GAME_CATALOG_V1 — additive extension; original shop preserved */
;(function() {
"use strict";
const id="cmdIntegratedGames",marker="cmdIntegratedGamesFrame";
if(document.getElementById(id)||typeof document==="undefined")return;
const root=document.querySelector("main.wrap")||document.querySelector("main");
if(!root)return;
const pagesList=(typeof pages!=="undefined"&&Array.isArray(pages))?pages:null;
if(pagesList&&!pagesList.includes(id))pagesList.push(id);
const s=document.createElement("section");
s.id=id;s.className="page section hide";s.setAttribute("aria-label","Bibliothèque des jeux CMD Hosting");
s.innerHTML='<div class="cmdg-head"><div><small>CMD HOSTING / JEUX ET CONFIGURATIONS</small><h2>Mes jeux — Bibliothèque HD</h2><p>173 jeux, chacun avec son visuel, ses cartes et ses fichiers de configuration lorsque le jeu les permet.</p></div><span>Préproduction • Serveurs conservés</span></div><div class="cmdg-frame"><iframe id="'+marker+'" title="Catalogue des jeux CMD Hosting avec leurs images et configurations" src="https://cmd-hosting-mods-api-production.up.railway.app/preproduction/jeux?embed=1" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups" allow="clipboard-write"></iframe></div><p class="cmdg-foot">Les jeux sont préparés pour une machine future. Ce catalogue ne déclenche aucun paiement et ne modifie pas vos serveurs. <a target="_blank" rel="noopener noreferrer" href="https://cmd-hosting-mods-api-production.up.railway.app/preproduction/jeux">Ouvrir le catalogue en pleine page ↗</a></p>';
root.appendChild(s);
const st=document.createElement("style");
st.textContent=[
"#cmdIntegratedGames{max-width:1660px;margin:0 auto;color:#f0f3ff}",
".cmdg-head{display:flex;justify-content:space-between;align-items:center;gap:15px;flex-wrap:wrap;margin-bottom:17px;padding:18px 21px;border-radius:13px;background:linear-gradient(130deg,#101f38,#1c2342);border:1px solid #3a416e}",
".cmdg-head h2{margin:2px 0 5px;font-size:clamp(23px,3vw,34px);color:white}",
".cmdg-head small{color:#9c9dff;letter-spacing:.12em;font-size:11px;font-weight:800}",
".cmdg-head p{margin:0;color:#a4b8d7;max-width:660px}",
".cmdg-head>span{background:#333049;color:#dbcaff;padding:7px 12px;border-radius:30px;font-size:12px;white-space:nowrap}",
".cmdg-frame{min-height:730px;border:1px solid #344467;background:#0b1324;border-radius:14px;overflow:hidden}",
"#cmdIntegratedGamesFrame{width:100%;height:min(86vh,1070px);min-height:730px;border:0;background:#080d1a;display:block}",
".cmdg-foot{font-size:12px;color:#9aabc9;margin:14px 0}",
".cmdg-foot a{color:#9fc5ff}",
"@media(max-width:740px){.cmdg-head{padding:13px}.cmdg-frame{min-height:700px}#cmdIntegratedGamesFrame{height:85vh;min-height:700px}}"
].join("\n");document.head.appendChild(st);
function open(){
  if(typeof show==="function")show(id);
  else{for(const v of document.querySelectorAll(".page"))v.classList.add("hide");s.classList.remove("hide")}
  const title=document.getElementById("cmdTitle");if(title)title.textContent="Jeux et configurations";
  document.documentElement.classList.remove("cmd-menu-open");
  document.getElementById("cmdMenu")?.setAttribute("aria-expanded","false");
  history.replaceState(null,"","#"+id);
  s.scrollIntoView({block:"start",behavior:"auto"});
}
function addNav(parent,text,prepend){
 if(!parent)return;
 const btn=document.createElement("button");btn.type="button";btn.dataset.page=id;btn.dataset.cmdGamesHd="1";
 btn.textContent=text;btn.addEventListener("click",open);
 if(prepend)parent.prepend(btn);else parent.append(btn);
}
addNav(document.querySelector("#cmdOriginalNav .links")||document.querySelector(".links"),"🎮 Jeux et décors HD",true);
const side=document.getElementById("cmdPrimary");
if(side){const b=document.createElement("button");b.type="button";b.className="cmd-nav";b.dataset.cmdGamesHd="1";const ico=document.createElement("span");ico.textContent="🎨";const name=document.createElement("span");name.textContent="Jeux et décors HD";b.append(ico,name);b.addEventListener("click",open);side.prepend(b)}
const shop=document.querySelector("#cmdCatalogSection .cmd-shop-top");
if(shop){const b=document.createElement("button");b.type="button";b.textContent="🎨 173 jeux et leurs cartes";b.className="ghost";b.addEventListener("click",open);shop.appendChild(b)}
if(location.hash==="#"+id)open();
})();
