import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const checker = 'background-image:linear-gradient(45deg,#666 25%,transparent 25%),linear-gradient(-45deg,#666 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#666 75%),linear-gradient(-45deg,transparent 75%,#666 75%);background-size:16px 16px;background-color:#999;';

const browser = await chromium.launch({ headless: true });
for (const app of ['admin-web', 'superadmin-web']) {
  const dir = `src/${app}/public/brand`;
  const b64 = (f) => fs.readFileSync(path.join(dir, f)).toString('base64');
  const svg = `data:image/svg+xml;base64,${b64('intelmap24-favicon.svg')}`;
  const p16 = `data:image/png;base64,${b64('favicon-16.png')}`;
  const p32 = `data:image/png;base64,${b64('favicon-32.png')}`;
  const p180 = `data:image/png;base64,${b64('apple-touch-icon.png')}`;
  const page = await browser.newPage({ viewport: { width: 760, height: 420 } });
  await page.setContent(`<body style="margin:0;padding:24px;font:14px monospace;${checker}">
    <div style="display:flex;gap:32px;align-items:flex-end">
      <div style="text-align:center"><img src="${svg}" style="width:240px;height:240px;display:block"><span>svg 240</span></div>
      <div style="text-align:center"><img src="${p180}" style="width:180px;height:180px;display:block"><span>apple 180</span></div>
      <div style="text-align:center"><img src="${p32}" style="width:32px;height:32px;display:block"><span>32</span></div>
      <div style="text-align:center"><img src="${p16}" style="width:16px;height:16px;display:block"><span>16</span></div>
    </div>
    <div style="margin-top:16px;display:flex;gap:32px;align-items:flex-end;background:#fff;padding:12px">
      <img src="${svg}" style="width:96px;height:96px;display:block">
      <img src="${p32}" style="width:32px;height:32px;display:block">
      <img src="${p16}" style="width:16px;height:16px;display:block">
      <span>on white</span>
    </div>
  </body>`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `temp_screenshots/favicon-fix/${app}-verify.png` });
  await page.close();
  console.log(`${app} verify shot`);
}
await browser.close();
