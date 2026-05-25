const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.log('ERROR:', err.message));
  await page.goto('http://127.0.0.1:8024/index.html?v=webgl5');
  await page.waitForTimeout(5000);
  await browser.close();
})();
