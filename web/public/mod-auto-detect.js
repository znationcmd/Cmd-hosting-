(function(){
'use strict';
const c=document.getElementById('cmdMods'),select=document.getElementById('cvServer');
if(!c||!select||document.getElementById('cvAutoGame'))return;
const info=document.createElement('div');info.id='cvAutoGame';info.setAttribute('role','status');info.style.cssText='width:100%;color:#b9d5e7;background:#18384e;border:1px solid #355e79;border-radius:8px;padding:10px 13px;font:12px/1.5 system-ui;margin:3px 0 12px';
select.closest('.cmdv-toolbar')?.after(info);
let cache=new Map(),loading=false,revision=0,loaded=false;
const status=msg=>info.textContent=msg;
const gameSources={arma:'Workshop Bohemia (Arma Reforger)',ark:'CurseForge (ARK: Survival Ascended)',dayz:'Steam Workshop (DayZ PC)'};
const getSource=g=>g.startsWith('g-arma-reforger')||g==='arma'?gameSources.arma:g.startsWith('g-ark-survival-ascended')||g==='ark'?gameSources.ark:g==='dayz'||g==='g-dayz'?gameSources.dayz:'';
const imageAlt=()=>{};
async function loadLabels(){
if(loading)return;loading=true;try{
const r=await fetch('/api/game-library',{credentials:'include',cache:'no-store'});if(!r.ok)throw Error('Connexion nécessaire');const data=await r.json();
cache=new Map((data.items||[]).map(g=>[g.id,g]));
for(const o of select.options){
 const g=cache.get(o.value);if(!g)continue;
 const name=g.game_name||g.game_key||'Jeu inconnu';
 const title=g.display_name+' — '+name;
 if(o.textContent!==title)o.textContent=title;
 o.title='Jeu détecté : '+name;
}
loaded=true;update();}catch(e){status('La détection nécessite une connexion à CMD Hosting.');}
finally{loading=false}
}
async function update(){
const id=select.value,game=cache.get(id),num=++revision;
if(!id){status('Choisis un serveur : CMD Hosting détectera automatiquement le jeu et le catalogue de mods correspondant.');return}
if(!game){status('Identification du jeu en cours…');return}
const name=game.game_name||game.game_key,provider=getSource(game.game_key||'');
status('Jeu détecté : '+name+' · Vérification des mods…');
try{
const r=await fetch('/api/mods?gameId='+encodeURIComponent(id),{credentials:'include',cache:'no-store'});
const data=await r.json();if(num!==revision)return;if(!r.ok)throw Error(data.message||'Source indisponible');
const sources=data.providers||[];
const names={arma:'Workshop Bohemia',curseforge:'CurseForge',steam:'Steam Workshop'};
const label=sources.map(k=>names[k]||k).join(' / ');
if(sources.length){
status('Jeu détecté : '+name+' · Mods : '+label+' · sélection automatique.');
if(sources.includes('curseforge')||sources.includes('steam')){
const flags=await fetch('/api/mod-provider-map',{cache:'no-store'}).then(x=>x.json()).catch(()=>null);
if(num!==revision)return;
if(sources.includes('curseforge')&&flags?.keysRequired?.curseforge)status('Jeu détecté : '+name+' · CurseForge sélectionné. La recherche directe attend la clé API CurseForge ; ajout manuel par ID possible.');
if(sources.includes('steam')&&flags?.keysRequired?.steam)status('Jeu détecté : '+name+' · Steam Workshop sélectionné. La recherche directe attend la clé Steam Web API ; ajout manuel par ID possible.');
}
}else status('Jeu détecté : '+name+' · Ce jeu n’a pas encore d’intégration de mods validée. Le nom du serveur ne permet pas d’activer un Workshop incompatible.');
}catch(e){if(num===revision)status('Jeu détecté : '+name+' · '+e.message)}
}
select.addEventListener('change',update);
const observer=new MutationObserver(()=>{if(!loaded||[...select.options].some(o=>cache.has(o.value)&&o.textContent!==cache.get(o.value).display_name+' — '+(cache.get(o.value).game_name||cache.get(o.value).game_key)))loadLabels()});
observer.observe(select,{childList:true,subtree:true,characterData:true});
document.getElementById('cvRefresh')?.addEventListener('click',()=>setTimeout(loadLabels,300));
loadLabels();
})();