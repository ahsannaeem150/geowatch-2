import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// admin-web + superadmin-web only — user-web favicon is approved as-is.
// 16/32 keep transparent corners; apple-touch-icon gets solid bg #0b1424.
for (const app of ['admin-web', 'superadmin-web']) {
  const brandDir = path.join(rootDir, `src/${app}/public/brand`);
  const svgUri = `data:image/svg+xml;base64,${fs.readFileSync(path.join(brandDir, 'intelmap24-favicon.svg')).toString('base64')}`;
  const browser = await chromium.launch({ headless: true });

  for (const [size, name, solid] of [
    [16, 'favicon-16.png', false],
    [32, 'favicon-32.png', false],
    [180, 'apple-touch-icon.png', true],
  ]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    // <img> scales the SVG to exactly the target size (direct file:// navigation
    // would honor the SVG's fixed width/height and crop instead of scaling).
    await page.setContent(
      `<body style="margin:0;${solid ? 'background:#0b1424;' : ''}"><img src="${svgUri}" style="display:block;width:${size}px;height:${size}px" alt=""></body>`
    );
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(brandDir, name),
      omitBackground: !solid, // transparent rounded-tile corners for 16/32
    });
    console.log(`${app}: rasterized ${name} (${size}x${size})${solid ? ' solid #0b1424' : ''}`);
    await page.close();
  }

  await browser.close();
}
