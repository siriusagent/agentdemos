const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log(msg.text()));
  await page.goto('http://127.0.0.1:8024/index.html');
  await page.waitForTimeout(5000);
  await browser.close();
})();
