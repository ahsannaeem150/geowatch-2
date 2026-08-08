import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const svgPath = path.join(rootDir, 'src/user-web/public/brand/intelmap24-favicon.svg');
const outDir = path.join(rootDir, 'src/user-web/public/brand');
const svgUri = `data:image/svg+xml;base64,${fs.readFileSync(svgPath).toString('base64')}`;

const browser = await chromium.launch({ headless: true });

for (const [size, name] of [[16, 'favicon-16.png'], [32, 'favicon-32.png'], [180, 'apple-touch-icon.png']]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  // <img> scales the SVG to exactly the target size (direct file:// navigation
  // would honor the SVG's fixed width/height and crop instead of scaling).
  await page.setContent(`<img src="${svgUri}" style="display:block;width:${size}px;height:${size}px" alt="">`);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(outDir, name),
    omitBackground: true, // keep rounded-tile corners transparent
  });
  console.log(`Rasterized ${name} (${size}x${size})`);
  await page.close();
}

await browser.close();
