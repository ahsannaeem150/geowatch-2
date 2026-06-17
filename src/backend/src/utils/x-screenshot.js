import { chromium } from 'playwright';
import { fetchXEmbedMetadata } from './x-oembed.js';

const BROWSER_LAUNCH_TIMEOUT = 30000;
const RENDER_TIMEOUT = 20000;

export async function captureTweetScreenshot(sourceUrl) {
  const embed = await fetchXEmbedMetadata(sourceUrl);
  if (!embed?.html) return null;

  const browser = await chromium.launch({
    headless: true,
    timeout: BROWSER_LAUNCH_TIMEOUT,
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 650, height: 900 },
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    await page.setContent(
      `<!DOCTYPE html>
       <html>
         <head><meta charset="utf-8"></head>
         <body style="margin:0;background:#000;">
           ${embed.html}
           <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
         </body>
       </html>`,
      { waitUntil: 'networkidle' }
    );

    const iframe = await page.waitForSelector('.twitter-tweet-rendered iframe', {
      timeout: RENDER_TIMEOUT,
      state: 'attached',
    });
    await iframe.waitForElementState('visible', { timeout: RENDER_TIMEOUT });

    // Give the widget a moment to settle into final dimensions.
    await page.waitForTimeout(500);

    const buffer = await iframe.screenshot({ type: 'png' });
    return buffer;
  } catch (err) {
    console.error('[captureTweetScreenshot] failed:', err.message);
    return null;
  } finally {
    await browser.close().catch(() => {});
  }
}
