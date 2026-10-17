const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const results=[];
 try {
  fs.mkdirSync('visual-results',{recursive:true});
  for(const [width,height,dpr] of [[3840,2160,1],[7680,4320,1],[15360,8640,1],[3840,2160,4]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr});
   await page.route('**/*',r=>{
    const u=new URL(r.request().url());
    if(u.pathname.startsWith('/api/'))return r.fulfill({status:401,contentType:'application/json',body:'{"message":"Contrôle visuel sans opération métier"}'});
    return u.hostname==='127.0.0.1'?r.continue():r.abort();
   });
   await page.goto('http://127.0.0.1:8765');
   await page.waitForFunction(()=>document.documentElement.classList.contains('cmd16-enabled'));
   for(const id of ['accueil','jeux','machines','commande','configurations','wallet','cmdCatalogSection','cmdMods']){
    await page.locator('#nav [data-page="'+id+'"]').click();
    await page.waitForTimeout(100);
    assert(await page.locator('#'+id).isVisible());
    const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,svg:document.querySelectorAll('svg[viewBox]').length,mainWidth:document.querySelector('main').getBoundingClientRect().width,sideRight:document.getElementById('cmdSidebar').getBoundingClientRect().right,mainLeft:document.querySelector('main').getBoundingClientRect().left}));
    assert.equal(layout.overflow,false,'Horizontal overflow '+width+'/'+id);
    assert(layout.svg>0,'Vector icons missing');
    assert(layout.mainWidth<=2000,'Content must remain readable instead of stretching across 16K');
    assert(layout.mainLeft>=layout.sideRight-1,'Sidebar overlaps content');
    results.push({width,height,dpr,physicalWidth:width*dpr,physicalHeight:height*dpr,page:id,...layout});
   }
   // Crop only for review; layout above uses the complete requested viewport.
   await page.screenshot({path:`visual-results/uhd-${width}-dpr${dpr}.png`,clip:{x:0,y:0,width:1800,height:1000},scale:'css'});
   await page.close();
  }
  fs.writeFileSync('visual-results/uhd-report.json',JSON.stringify({note:'Chromium simulation, not a physical 16K monitor; raster images are not certified 16K.',results},null,2));
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
