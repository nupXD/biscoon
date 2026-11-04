const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const base = process.env.FORMS_BASE_URL || 'http://127.0.0.1:4173';
(async () => {
 const browser = await chromium.launch();
 try {
  for (const width of [390, 1440]) {
   const page = await browser.newPage({ viewport: { width, height: 900 } });
   await page.route('**/api/**', route => route.fulfill({status:200, contentType:'application/json', body:JSON.stringify({listings:[],news:[],discussions:[],announcements:[],spotlights:[],notifications:[],total:0})}));
   await page.goto(`${base}/pages/auth/signup.html`);
   await page.locator('#password').fill('example-password');
   await page.locator('button[aria-controls="password"]').click();
   assert.equal(await page.locator('#password').getAttribute('type'), 'text');
   assert.equal(await page.locator('#password').inputValue(), 'example-password');
   await page.locator('button[aria-controls="password"]').click();
   assert.equal(await page.locator('#password').getAttribute('type'), 'password');
   await page.locator('button[type="submit"]').last().click();
   assert.equal(await page.locator('#name').getAttribute('aria-invalid'), 'true');
   await page.locator('#name').fill('Test Person');
   assert.equal(await page.locator('#name').getAttribute('aria-invalid'), 'false');
   assert(await page.locator('#name-error').isHidden());
   assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
   await page.screenshot({path:`/tmp/biscoon-signup-${width}.png`,fullPage:true});
   for (const path of ['pages/auth/login.html','pages/auth/forgot-password.html','pages/auth/reset-password.html','pages/admin/login.html','pages/community/discussions.html','pages/community/date-converter.html','pages/post/listing.html','pages/news/index.html','pages/donate.html']) {
    await page.goto(`${base}/${path}`);
    await page.waitForFunction(() => !!document.querySelector('[data-guided]'));
    const unlabeled = await page.locator('input:not([type=hidden]):not([type=submit]),select,textarea').evaluateAll(fields=>fields.filter(f=>f.getClientRects().length && !f.labels?.length && !f.getAttribute('aria-label') && !f.getAttribute('aria-labelledby')).map(f=>f.id));
    assert.deepEqual(unlabeled,[],`${path} has unlabeled fields`);
   }
   // Dynamically inserted controls receive the same support as initial page fields.
   await page.evaluate(() => { const form=document.createElement('form'); form.innerHTML='<label for="dynamicEmail">Contact email</label><input id="dynamicEmail" type="email" required>'; document.body.append(form); });
   await page.waitForSelector('#dynamicEmail[data-guided]');
   await page.locator('#dynamicEmail').evaluate(f => f.reportValidity());
   assert.equal(await page.locator('#dynamicEmail').getAttribute('aria-invalid'),'true');
   await page.goto(`${base}/pages/news/index.html`);
   await page.evaluate(() => { localStorage.setItem('biscoonToken','form-test'); submitReport('listing','test-id'); });
   await page.locator('#reportReason').selectOption('scam');
   await page.locator('#reportDetails').fill('Please check this listing.');
   await page.route('**/api/moderation/reports', route => route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Please try again later.'})}));
   await page.locator('#reportSubmit').click();
   await page.waitForFunction(() => document.getElementById('reportError')?.textContent === 'Please try again later.');
   assert.equal(await page.locator('#reportDetails').inputValue(),'Please check this listing.');
   await page.route('**/api/moderation/reports', route => route.fulfill({contentType:'application/json',body:'{}'}));
   await page.locator('#reportSubmit').click();
   await page.waitForSelector('#reportDialog',{state:'detached'});
   // Exercise admin modal validation with a mocked admin session, without data writes.
   await page.addInitScript(() => localStorage.setItem('biscoonAdminToken', 'form-test'));
   await page.route('**/api/auth/me', route => route.fulfill({contentType:'application/json',body:JSON.stringify({user:{id:'test',name:'Form tester',role:'super-admin',permissions:[]}})}));
   await page.goto(`${base}/pages/admin/dashboard.html`);
   await page.waitForFunction(() => typeof openModal === 'function');
   await page.evaluate(() => openModal('Create Event', eventFormHtml(), async () => { window.formTestSaved = true; }));
   await page.locator('#adminModalSave').click();
   assert.equal(await page.locator('#evTitle').getAttribute('aria-invalid'),'true');
   assert.equal(await page.evaluate(() => !!window.formTestSaved),false);
   await page.locator('#evTitle').fill('Community gathering');
   await page.locator('#evEmail').fill('not-an-email');
   await page.locator('#adminModalSave').click();
   assert.equal(await page.locator('#evEmail').getAttribute('aria-invalid'),'true');
   await page.locator('#evEmail').fill('organizer@example.com');
   await page.locator('#adminModalSave').click();
   await page.waitForFunction(() => window.formTestSaved === true);
   await page.close();
   console.log(`Form checks passed at ${width}px`);
  }
 } finally { await browser.close(); }
})().catch(err => {console.error(err);process.exit(1);});
