const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch();try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  let announcement={id:'one',title:'Community notice',body:'The welcome event starts at 5 PM. Everyone is invited.',type:'info'};
  await page.route('**/api/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({listings:[],news:[],announcements:[],spotlights:[],total:0})}));
  await page.route('**/api/announcements/active',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({announcement})}));
  await page.goto('http://127.0.0.1:4173/index.html');
  await page.waitForSelector('#siteBanner .site-banner-title');
  assert(await page.locator('#siteBanner').isVisible());
  const banner=await page.locator('#siteBanner').boundingBox();
  assert(banner.y>=0 && banner.y<900 && banner.width<=width);
  await page.locator('.site-banner-close').click();
  assert(await page.getByRole('button',{name:'Show announcement'}).isVisible());
  await page.reload();await page.getByRole('button',{name:'Show announcement'}).click();
  await page.waitForSelector('.site-banner-title');
  announcement={...announcement,id:'two',title:'New announcement'};
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(()=>document.querySelector('.site-banner-title')?.textContent==='New announcement');
  assert.equal(await page.locator('#siteBanner').count(),1);
  await page.screenshot({path:`/tmp/biscoon-announcement-${width}.png`});
  announcement=null;
  await page.evaluate(()=>checkSiteAnnouncement());
  assert.equal(await page.locator('#siteBanner').count(),0);
  // Storage restrictions must not suppress a public announcement.
  announcement={id:'three',title:'Visible without storage',body:'Storage is optional.',type:'warning'};
  await page.evaluate(()=>{const get=Storage.prototype.getItem;Storage.prototype.getItem=function(key){if(key==='biscoonDismissedAnnouncement')throw new Error('Blocked');return get.call(this,key)};});
  await page.evaluate(()=>checkSiteAnnouncement());
  assert.equal(await page.locator('.site-banner-title').textContent(),'Visible without storage');
  await page.close();console.log(`Announcement checks passed at ${width}px`);
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
