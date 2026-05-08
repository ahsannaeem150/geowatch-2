import https from 'https';

/**
 * Fetches oEmbed HTML for a given URL (X/Twitter, etc.).
 * Returns null if fetch fails or provider is unsupported.
 */
export async function fetchOembedHtml(url) {
  if (!url || !url.includes('x.com') && !url.includes('twitter.com')) {
    return null;
  }

  const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true&theme=dark`;

  return new Promise((resolve) => {
    https
      .get(oembedUrl, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.html || null);
          } catch {
            resolve(null);
          }
        });
      })
      .on('error', () => resolve(null))
      .setTimeout(5000, function () {
        this.destroy();
        resolve(null);
      });
  });
}
