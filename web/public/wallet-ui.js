(function(){
if(typeof pages==='undefined'||typeof show!=='function'||document.getElementById('wallet'))return;
pages.push('wallet');
const nav=document.querySelector('.links'),link=document.createElement('button');
link.textContent='💳 Portefeuille';link.type='button';link.dataset.page='wallet';
const refresh=document.getElementById('siteRefresh');
if(nav){if(refresh&&refresh.parentElement===nav)nav.insertBefore(link,refresh);else nav.append(link)}
const main=document.querySelector('main.wrap')||document.querySelector('main');
const s=document.createElement('section');s.id='wallet';s.className='page section hide';
s.innerHTML='<span class="eyebrow">CMD HOSTING · MON COMPTE</span><h2>💳 Mon portefeuille</h2><p class="sub">Solde, recharges, dons et renouvellement mensuel. Les réglages sont sauvegardés. Les paiements ne seront crédités qu’après confirmation du prestataire.</p>'+
'<div class="host-dashboard">'+
'<div class="host-block"><h3>Mon solde CMD</h3><h2 id="wBalance" style="font-size:42px">— €</h2><p id="wStatus" class="small"></p><p class="small">Les crédits sont ajoutés uniquement après validation réelle du paiement.</p></div>'+
'<div class="host-block"><h3>Recharger mon solde</h3><label>Montant à recharger<select id="wAmount"><option>5 €</option><option>10 €</option><option>20 €</option><option>50 €</option><option>100 €</option></select></label><p class="small">Moyens de paiement prévus :</p><div class="wMethods"><button disabled>💳 Carte bancaire</button><button type="button" id="wPaypalTopup" class="button" disabled>PayPal — bientôt disponible</button><button disabled>PaysafeCard</button></div><p id="wTopupMessage" class="small">Recharges désactivées pendant la préparation. Aucun paiement réel pour les locations.</p><a id="wTopupLink" class="button" target="_blank" rel="noopener noreferrer" hidden>Continuer vers PayPal ↗</a><p class="small">La préparation d’une recharge ne constitue pas un paiement confirmé et n’ajoute aucun crédit.</p></div>'+
'<div class="host-block"><h3>Mon mode de paiement</h3><label>Moyen préféré<select id="wProvider"><option value="card">Carte bancaire</option><option value="paypal">PayPal</option><option value="paysafecard">PaysafeCard — recharge ponctuelle</option></select></label><label class="wCheck"><input type="checkbox" id="wRenew"> Je souhaite un renouvellement automatique tous les mois</label><button type="button" class="button" id="wPrefSave">Enregistrer mes préférences</button><p id="wPrefStatus" class="small"></p><p class="small">Aucun paiement automatique n’est actif. L’enregistrement sécurisé d’une carte ou d’un mandat PayPal devra se faire chez le prestataire avec ton accord.</p></div>'+
'<div class="host-block"><h3>Recevoir des dons pour mon serveur</h3><p class="small">Chaque client CMD Hosting possède son lien de dons public. Les dons PayPal.Me arrivent directement sur le PayPal du bénéficiaire et ne créditent pas automatiquement son solde CMD.</p><label>Mon lien PayPal.Me<input id="wPaypal" type="url" placeholder="https://paypal.me/MonPseudo"></label><button type="button" class="button" id="wPaypalSave">Enregistrer mon PayPal</button><p class="small" id="wPaypalStatus"></p><p class="small">Mon lien public à partager :</p><a id="wDonate" target="_blank" rel="noopener noreferrer" style="color:#8adfff;overflow-wrap:anywhere"></a><p><button type="button" class="ghost" id="wCopy">Copier mon lien de dons</button></p></div>'+
'<div class="host-block"><h3>Historique des transactions</h3><div id="wHistory">Aucune transaction chargée.</div></div>'+
'<div class="host-block"><h3>Mes serveurs</h3><p>Retrouve les commandes, les fichiers et les configurations de tes serveurs ARK, DayZ et Arma.</p><button type="button" class="button" id="wMachines">Gérer mes serveurs</button></div>'+
'</div>';
if(!main)return;main.append(s);
const css=document.createElement('style');
css.textContent='#wallet label{display:block;font-weight:600;color:#cde6fa;font-size:14px;margin:14px 0}#wallet input:not([type="checkbox"]),#wallet select{display:block;width:100%;max-width:500px;box-sizing:border-box;padding:12px;margin-top:8px;background:#0b1a2c;color:white;border:1px solid #497499;border-radius:10px}#wallet .wCheck{display:flex;align-items:center;gap:9px}#wallet .wCheck input{width:20px;height:20px}#wallet .wMethods{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}#wallet .wMethods button{padding:12px;border-radius:10px;border:1px solid #37638b;background:#18314d;color:#b9cedf;cursor:not-allowed}#wallet .host-block{min-width:0}#wallet .host-block h2{color:#8bd9ff}#machines #hostInstances .host-entry{background:linear-gradient(140deg,#112944,#091d32);border:1px solid #315e86;border-radius:15px;box-shadow:0 6px 18px #0003}#machines #hostInstances .host-actions button{min-height:42px}';
document.head.append(css);
const el=id=>document.getElementById(id);
const set=(id,value)=>{el(id).textContent=value};
async function loadWallet(){
try{const r=await fetch('/api/wallet',{credentials:'include',cache:'no-store'}),j=await r.json();
if(!r.ok)throw Error(j.message||'Connexion requise');
set('wBalance',(Number(j.balanceCents||0)/100).toFixed(2)+' €');
set('wStatus','Paiements automatiques non activés.');
el('wPaypal').value=j.paypalMe||'';
el('wProvider').value=j.preferredProvider||'card';
el('wRenew').checked=!!j.autoRenewIntent;
const a=el('wDonate');a.textContent=j.donationLink||'';a.href=j.donationLink||'#';
const history=el('wHistory');history.replaceChildren();
for(const t of Array.isArray(j.entries)?j.entries:[]){const p=document.createElement('p');p.textContent=new Date(t.created_at).toLocaleDateString()+' · '+(Number(t.cents)/100).toFixed(2)+' €';history.append(p)}
for(const t of Array.isArray(j.pending)?j.pending:[]){const p=document.createElement('p');p.textContent=new Date(t.created_at).toLocaleDateString()+' · '+(Number(t.amount_cents)/100).toFixed(2)+' € · Don en attente';history.append(p)}
for(const t of Array.isArray(j.topups)?j.topups:[]){const p=document.createElement('p');p.textContent=new Date(t.created_at).toLocaleDateString()+' · '+(Number(t.cents)/100).toFixed(2)+' € · Recharge '+t.method+' '+t.status;history.append(p)}
if(!history.childElementCount)history.textContent='Aucune transaction confirmée.';
}catch(e){set('wStatus',e.message);set('wBalance','— €')}
}
link.onclick=()=>{show('wallet');loadWallet()};
el('wPaypalTopup').onclick=async()=>{
 const button=el('wPaypalTopup'),message=el('wTopupMessage'),link=el('wTopupLink');
 button.disabled=true;link.hidden=true;
 try{
 const amount=parseInt(el('wAmount').value,10);
 const r=await fetch('/api/wallet/topup',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount,method:'paypal'})});
 const data=await r.json();if(!r.ok)throw Error(data.message||'Recharge impossible');
 message.textContent='Recharge en attente : '+data.reference+'. Indique cette référence lors du paiement si possible. Aucun crédit avant validation.';
 if(data.paypalUrl){const u=new URL(data.paypalUrl);if(u.protocol==='https:'&&u.hostname==='www.paypal.me'){link.href=u.href;link.hidden=false}}
 await loadWallet();
 }catch(e){message.textContent=e.message}finally{button.disabled=false}
};
el('wMachines').onclick=()=>show('machines');
el('wCopy').onclick=async()=>{try{await navigator.clipboard.writeText(el('wDonate').href);set('wPaypalStatus','Lien copié !')}catch{set('wPaypalStatus','Sélectionne le lien pour le copier.')}};
el('wProvider').onchange=()=>{if(el('wProvider').value==='paysafecard'){el('wRenew').checked=false;set('wPrefStatus','PaysafeCard : recharge ponctuelle uniquement.')}};
el('wPrefSave').onclick=async()=>{const b=el('wPrefSave');b.disabled=true;try{const r=await fetch('/api/wallet/preferences',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:el('wProvider').value,autoRenewIntent:el('wRenew').checked})}),j=await r.json();if(!r.ok)throw Error(j.message);set('wPrefStatus',j.message)}catch(e){set('wPrefStatus',e.message)}finally{b.disabled=false}};
el('wPaypalSave').onclick=async()=>{const b=el('wPaypalSave');b.disabled=true;try{const r=await fetch('/api/wallet/paypal',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({link:el('wPaypal').value.trim()})}),j=await r.json();if(!r.ok)throw Error(j.message);set('wPaypalStatus','Lien PayPal enregistré.');await loadWallet()}catch(e){set('wPaypalStatus',e.message)}finally{b.disabled=false}};
if(location.hash==='#wallet'){show('wallet');loadWallet()}
})();