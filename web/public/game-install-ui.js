(function(){
'use strict';
const switchPage=document.getElementById('cmdGameSwitch'),server=document.getElementById('switchServer'),game=document.getElementById('switchTarget'),quote=document.getElementById('switchQuote');
if(!switchPage||!server||!game||!quote||document.getElementById('cmdAutoInstallPanel'))return;
const section=document.createElement('div');section.id='cmdAutoInstallPanel';section.className='switch-panel';
section.innerHTML='<div class="cmd-install-header"><div><small>CMD HOSTING · GESTION DES FICHIERS</small><h3>Installation automatique des jeux</h3><p>Comme chez Nitrado : installer les fichiers d’un jeu, revenir à un jeu précédent et conserver les modifications.</p></div><span id="cmd-install-ready">Machine en attente</span></div><div class="cmd-install-chips"><span>Jusqu’à 5 jeux installés</span><span>1 seul jeu actif</span><span>Sauvegarde avant changement</span></div><div class="cmd-install-steps"><div><b>1</b><span>Arrêter le serveur actif</span></div><div><b>2</b><span>Sauvegarder tous les fichiers</span></div><div><b>3</b><span>Télécharger le nouveau jeu</span></div><div><b>4</b><span>Configurer et vérifier le démarrage</span></div></div><div id="cmd-install-information">Sélectionne le serveur et le nouveau jeu pour vérifier son installateur.</div><div class="cmd-install-actions"><button type="button" id="cmd-install-check">Vérifier les fichiers du jeu</button><button type="button" id="cmd-install-run" disabled>Installer automatiquement</button></div><p class="cmd-install-hint">Les jeux qui n’ont pas d’installateur validé ou exigent une licence commerciale supplémentaire restent bloqués. Aucune action ne démarre avant la machine, l’autorisation et un vrai devis.</p>';
quote.closest('.switch-panel')?.after(section);
const css=document.createElement('style');css.textContent='.cmd-install-header{display:flex;gap:15px;align-items:start;justify-content:space-between}.cmd-install-header small{font:700 10px system-ui;letter-spacing:.1em;color:#78cffc}.cmd-install-header p,.cmd-install-hint{font:12px/1.55 system-ui;color:#aac6d7}.cmd-install-header h3{margin:7px 0!important}.cmd-install-header>span{font:11px system-ui;white-space:nowrap;color:#eed09a;border:1px solid #715c43;border-radius:20px;padding:5px 10px}.cmd-install-chips{display:flex;flex-wrap:wrap;gap:8px;margin:13px 0}.cmd-install-chips span{font:11px system-ui;background:#1d4257;color:#d1e8f7;padding:6px 9px;border-radius:15px}.cmd-install-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0}.cmd-install-steps div{background:#17334a;border:1px solid #3e637d;border-radius:8px;padding:11px 8px;display:flex;align-items:center;gap:7px;min-width:0}.cmd-install-steps b{background:#1e7cb1;color:white;border-radius:50%;font:700 11px system-ui;display:flex;width:22px;height:22px;align-items:center;justify-content:center;flex:none}.cmd-install-steps span{font:11px/1.35 system-ui;color:#c9e1ef}.cmd-install-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:13px}.cmd-install-actions button:disabled{cursor:not-allowed!important;opacity:.55}#cmd-install-information{padding:14px;border:1px solid #3d5d75;background:#142d42;border-radius:8px;white-space:pre-wrap;font:12px/1.65 system-ui;color:#d0e8f9}.cmd-install-hint{margin:12px 0 0}@media(max-width:760px){.cmd-install-steps{grid-template-columns:repeat(2,minmax(0,1fr))}.cmd-install-header{display:block}.cmd-install-header>span{display:inline-block;margin-top:9px}}';document.head.append(css);
const info=document.getElementById('cmd-install-information'),check=document.getElementById('cmd-install-check');
let requestId=0;
async function inspect(){
const id=server.value,target=game.value,current=++requestId;
document.getElementById('cmd-install-run').disabled=true;
if(!id||!target){info.textContent='Sélectionne un serveur et un nouveau jeu.';return}
info.textContent='Vérification de l’installation disponible…';check.disabled=true;
try{
const api=new URL('/api/installer/preflight',location.origin);api.searchParams.set('serverId',id);api.searchParams.set('game',target);
const response=await fetch(api,{credentials:'include',cache:'no-store'});const data=await response.json();if(current!==requestId)return;
if(!response.ok)throw Error(data.message||'Configuration introuvable');
const prepared=data.sourceVerified?'Profil SteamCMD prévu pour ce jeu.':'Aucun installateur officiel validé pour ce jeu.';
const rights=data.commercialLicenseRequired?'Attention : licence d’hébergement commercial obligatoire.':'';
const machine=data.machineReady?'Machine reconnue.':'Machine de jeux non raccordée.';
info.textContent=data.game+' — '+prepared+'\n'+machine+'\nSauvegardes : '+data.archivesDirectory+'\nFichiers : '+data.filesDirectory+'\nInstallation exécutée : NON.\n'+rights;
}catch(e){if(current===requestId)info.textContent=e.message}finally{check.disabled=false}
}
check.onclick=inspect;
server.addEventListener('change',()=>{info.textContent='Choisis le nouveau jeu pour vérifier son installation.';requestId++});
game.addEventListener('change',()=>{requestId++;inspect()});
if(location.hash==='#cmdGameSwitch')setTimeout(inspect,700);
})();