(function(){
"use strict";
const donationUrl="https://cmd-hosting-web-production.up.railway.app/d/cmd";
async function renderDonationProfile(){
 const area=document.getElementById("compte");if(!area)return;
 try{
  const resp=await fetch("/api/auth/me",{credentials:"include",cache:"no-store"});if(!resp.ok)return;
  const data=await resp.json();const user=data.user;
  const old=document.getElementById("cmd-founder-profile-donations");
  if(!user||user.username!=="cmd"||user.role!=="founder"){if(old)old.remove();return}
  if(old)return;
  const card=document.createElement("div");card.id="cmd-founder-profile-donations";
  card.style.cssText="margin:24px 0;padding:22px;border-radius:16px;border:1px solid #37699a;background:linear-gradient(125deg,#112d4b,#0b182d);color:#edf6ff;max-width:100%;overflow-wrap:anywhere";
  const title=document.createElement("h3");title.textContent="Profil de corsu2A · Soutenir CMD Hosting";title.style.margin="0 0 10px";
  const desc=document.createElement("p");desc.textContent="Voici ton lien public de dons. Tu peux le partager avec les joueurs. Les dons sont distincts du paiement des locations et ne créditent pas automatiquement ton portefeuille.";desc.style.cssText="font-size:14px;color:#c5d9ef;line-height:1.55";
  const a=document.createElement("a");a.href=donationUrl;a.target="_blank";a.rel="noopener noreferrer";a.textContent="❤ Ouvrir ma page de dons";a.style.cssText="display:inline-block;margin:8px 12px 8px 0;padding:12px 16px;border-radius:9px;background:#2478ba;color:white;text-decoration:none;font-weight:700";
  const copy=document.createElement("button");copy.type="button";copy.textContent="Copier mon lien";copy.style.cssText="padding:12px 16px;border:1px solid #5892ca;border-radius:9px;background:#123455;color:white;font-weight:700;cursor:pointer";
  const url=document.createElement("p");url.textContent=donationUrl;url.style.cssText="font-size:13px;color:#92d8ff;overflow-wrap:anywhere";
  copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(donationUrl);copy.textContent="Lien copié !"}catch{copy.textContent="Copie le lien affiché ci-dessous."}});
  card.append(title,desc,a,copy,url);area.append(card);
 }catch(e){console.warn("CMD Hosting donation profile unavailable",e)}
}
renderDonationProfile();
window.addEventListener("hashchange",()=>{if(location.hash==="#compte")renderDonationProfile()});
document.addEventListener("submit",e=>{if(document.getElementById("compte")?.contains(e.target)){setTimeout(renderDonationProfile,900);setTimeout(renderDonationProfile,2100)}});
})();