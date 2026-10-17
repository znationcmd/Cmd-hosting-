const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 fs.mkdirSync('visual-results',{recursive:true});
 try {
  const report=[];
  for(const width of [390,768,1440]){
   const page=await browser.newPage({viewport:{width,height:1000}});
   await page.route('**/*',r=>{
    const u=new URL(r.request().url());
    if(u.pathname.startsWith('/api/'))return r.fulfill({status:401,contentType:'application/json',body:'{"message":"Aperçu sans connexion"}'});
    if(u.hostname!=='127.0.0.1')return r.abort();
    return r.continue();
   });
   await page.goto('http://127.0.0.1:8765');
   await page.waitForFunction(()=>document.documentElement.classList.contains('cmd16-enabled'));
   for(const id of ['accueil','jeux','infrastructure','panneau','machines','commande','configurations','offres','aide','compte']){
    if(width<=980&&await page.locator('#cmdMenu').getAttribute('aria-expanded')!=='true')await page.locator('#cmdMenu').click();
    await page.screenshot({path:`visual-results/current-${width}.png`});
    await page.locator('#nav [data-page="'+id+'"]').click();
    await page.waitForTimeout(60);
    assert(await page.locator('#'+id).isVisible(),id+' route must still work');
    const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,navX:document.getElementById('cmdSidebar').getBoundingClientRect().x}));
    assert.equal(layout.overflow,false,`${width}/${id}: horizontal overflow`);
    if(width>980)assert.equal(layout.navX,0,'Desktop sidebar must align to viewport');
    else assert.equal(await page.locator('#cmdMenu').getAttribute('aria-expanded'),'false');
    report.push({width,page:id,...layout});
    if(['accueil','machines','commande'].includes(id))await page.screenshot({path:`visual-results/${width}-${id}.png`,fullPage:true});
   }
   await page.close();
  }
  // Isolated existing controls: verify real event listeners, native controls,
  // and presentation updates after asynchronous server status changes.
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.setContent('<html><head></head><body><div class="host-block"><input type="checkbox" id="check"><div class="host-actions"><button id="start" data-act="start">▶ Démarrer</button><button id="stop" data-act="stop" disabled>■ Arrêter</button></div><span class="label" id="state">PC connecté</span><table><tr><td>Test</td></tr></table></div></body></html>');
  await page.evaluate(()=>{window.clicks=0;document.querySelector('#start').addEventListener('click',()=>window.clicks++)});
  await page.addStyleTag({path:'ui/premium-16k.css'});
  await page.addScriptTag({path:'ui/premium-16k.js'});
  await page.waitForTimeout(60);
  await page.locator('#start').click();
  assert.equal(await page.evaluate(()=>window.clicks),1,'Original click listener preserved');
  assert.equal(await page.locator('#start').textContent(),'Démarrer');
  assert.equal(await page.locator('#stop').isDisabled(),true,'Disabled action stays disabled');
  assert.equal(await page.locator('#state').getAttribute('data-cmd16-state'),'online');
  await page.locator('#state').evaluate(e=>e.textContent='PC hors ligne');
  await page.waitForTimeout(60);
  assert.equal(await page.locator('#state').getAttribute('data-cmd16-state'),'offline');
  assert.equal(await page.locator('#check').evaluate(e=>e.getBoundingClientRect().height),20,'Checkbox must not become a full-size input');
  assert.equal(await page.locator('#start svg').count(),1,'No duplicate icons');
  fs.writeFileSync('visual-results/report.json',JSON.stringify(report,null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
