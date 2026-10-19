/* CMD Hosting 3D: dynamic button glow and perspective, no API or user data touched. */
(()=>{"use strict";
 if(window.__HOSTING_BLUE_VIOLET_3D__)return;
 window.__HOSTING_BLUE_VIOLET_3D__=true;
 const premium=document.createElement("link");
 premium.rel="stylesheet";premium.href="/ui/hosting-blue-violet-3d.css?v=20261019-1";
 premium.dataset.hosting3d="1";document.head.appendChild(premium);
 const reduce=window.matchMedia("(prefers-reduced-motion: reduce)");
 const mouse=window.matchMedia("(hover: hover) and (pointer: fine)");
 const root=document.documentElement;
 const surfaceSelector=".tile,.game,.mock,.metric,.auth-panel,.savedcard,.host-block,.host-entry,.host-msg,.status,.note,.catalog-note,.account-note,.cmd-ai-panel,.card,.panel,.server-card,.dashboard-card";
 let moving=null,frame=0,tilt=null,enabled=false,visible=null;
 const limit=(v,min,max)=>Math.min(max,Math.max(min,v));
 function resetCard(el){
  if(!el)return;
  el.classList.remove("hosting-3d-hover");
  for(const key of ["--hosting-card-x","--hosting-card-y","--hosting-shine-x","--hosting-shine-y"])el.style.removeProperty(key);
 }
 function onMouse(e){
  if(reduce.matches||!mouse.matches||enabled)return;
  const card=e.target?.closest?.(".hosting-3d-surface");
  if(card!==moving){resetCard(moving);moving=card}
  if(!card)return;
  const rect=card.getBoundingClientRect();
  const px=limit((e.clientX-rect.left)/Math.max(1,rect.width),0,1);
  const py=limit((e.clientY-rect.top)/Math.max(1,rect.height),0,1);
  const info={card,x:(.5-py)*9,y:(px-.5)*11,px:px*100,py:py*100};
  if(frame)cancelAnimationFrame(frame);
  frame=requestAnimationFrame(()=>{
   frame=0;if(!info.card.isConnected)return;
   card.classList.add("hosting-3d-hover");
   card.style.setProperty("--hosting-card-x",info.x.toFixed(2)+"deg");
   card.style.setProperty("--hosting-card-y",info.y.toFixed(2)+"deg");
   card.style.setProperty("--hosting-shine-x",info.px.toFixed(1)+"%");
   card.style.setProperty("--hosting-shine-y",info.py.toFixed(1)+"%");
  });
 }
 document.addEventListener("pointermove",onMouse,{passive:true});
 document.addEventListener("pointerout",e=>{
  if(moving&&!moving.contains(e.relatedTarget)){resetCard(moving);moving=null}
 },{passive:true});
 let last=null;
 document.addEventListener("click",e=>{
  const candidate=e.target?.closest?.("button,.button,.btn,[role='button']");
  if(!candidate||candidate.disabled||candidate.getAttribute("aria-disabled")==="true")return;
  if(last&&last!==candidate&&!last.matches(".links button.active,#nav button.active"))last.classList.remove("hosting-click-lit");
  candidate.classList.remove("hosting-click-lit");void candidate.offsetWidth;
  candidate.classList.add("hosting-click-lit");last=candidate;
  if(!candidate.matches(".links button.active,#nav button.active")){
   setTimeout(()=>{if(candidate.isConnected)candidate.classList.remove("hosting-click-lit")},1200);
  }
 },{capture:true});
 const supported=typeof window.DeviceOrientationEvent!=="undefined";
 const toggle=document.createElement("button");
 toggle.className="hosting-motion-switch";toggle.type="button";
 toggle.textContent="3D · inclinaison";
 toggle.setAttribute("aria-pressed","false");
 toggle.title="Activer l'effet 3D en inclinant le téléphone";
 function reflect(){
  toggle.textContent=enabled?"3D · activée":"3D · inclinaison";
  toggle.setAttribute("aria-pressed",String(enabled));
 }
 function clearMotion(){
  for(const k of ["--hosting-view-x","--hosting-view-y"])root.style.removeProperty(k);
 }
 function onGyro(event){
  if(!enabled||reduce.matches||document.hidden)return;
  if(!Number.isFinite(event.beta)||!Number.isFinite(event.gamma))return;
  tilt={x:limit((event.beta-35)*.075,-3.3,3.3),y:limit(event.gamma*.08,-3.6,3.6)};
  if(frame)return;
  frame=requestAnimationFrame(()=>{
   frame=0;if(!tilt)return;
   root.style.setProperty("--hosting-view-x",tilt.x.toFixed(2)+"deg");
   root.style.setProperty("--hosting-view-y",tilt.y.toFixed(2)+"deg");
  });
 }
 toggle.addEventListener("click",async()=>{
  if(enabled){
   enabled=false;window.removeEventListener("deviceorientation",onGyro);
   clearMotion();reflect();return;
  }
  if(reduce.matches){toggle.textContent="Animations réduites activées";return}
  if(!supported){toggle.textContent="Capteur indisponible";return}
  try{
   if(typeof window.DeviceOrientationEvent.requestPermission==="function"){
    const grant=await window.DeviceOrientationEvent.requestPermission();
    if(grant!=="granted"){toggle.textContent="Autorisation refusée";return}
   }
   resetCard(moving);moving=null;
   enabled=true;window.addEventListener("deviceorientation",onGyro,{passive:true});reflect();
  }catch{toggle.textContent="Capteur indisponible"}
 });
 function decorate(container=document){
  if(!root.classList.contains("cmd16-enabled"))return;
  const selectors=surfaceSelector.split(",").map(x=>".page "+x).join(",");
  for(const el of container.querySelectorAll(selectors)){
   if(el.classList.contains("hosting-3d-surface"))continue;
   // On dense pages prefer top-level panels for reliable form interaction.
   if(el.parentElement?.closest?.(".hosting-3d-surface"))continue;
   el.classList.add("hosting-3d-surface");
   if(visible)visible.observe(el);
  }
 }
 function install(){
  const target=document.querySelector(".top .topin")||document.querySelector(".top")||document.querySelector("header");
  if(target&&!toggle.isConnected&&(!mouse.matches||supported)){target.appendChild(toggle)}
  if("IntersectionObserver" in window){
   visible=new IntersectionObserver(entries=>{
    entries.forEach(e=>e.target.classList.toggle("hosting-3d-visible",e.isIntersecting));
   },{rootMargin:"100px",threshold:0});
  }
  decorate();
  if(!window.MutationObserver)return;
  let queued=false;
  new MutationObserver(()=>{
   if(queued)return;
   queued=true;requestAnimationFrame(()=>{queued=false;decorate()});
  }).observe(document.body,{childList:true,subtree:true});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
 reduce.addEventListener?.("change",()=>{if(reduce.matches&&enabled){enabled=false;window.removeEventListener("deviceorientation",onGyro);clearMotion();reflect()}resetCard(moving);moving=null});
})();
