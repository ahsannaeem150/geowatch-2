import https from 'https';

const OEMBED_BASE = 'https://publish.x.com/oembed';
const MAX_REDIRECTS = 3;

function fetch(urlStr) {
  return new Promise((resolve) => {
    const get = (urlString, redirectsLeft) => {
      const url = new URL(urlString);
      const req = https.get(
        url,
        {
          timeout: 8000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
            const next = new URL(res.headers.location, url).toString();
            get(next, redirectsLeft - 1);
            return;
          }

          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode !== 200) {
              return resolve(null);
            }
            try {
              const parsed = JSON.parse(data);
              if (!parsed.html) return resolve(null);
              resolve({
                html: parsed.html,
                authorName: parsed.author_name || null,
                authorUrl: parsed.author_url || null,
                width: parsed.width || null,
                height: parsed.height || null,
              });
            } catch {
              resolve(null);
            }
          });
        }
      );

      req.on('error', () => resolve(null));
      req.on('timeout', function () {
        this.destroy();
        resolve(null);
      });
    };

    get(urlStr, MAX_REDIRECTS);
  });
}

export async function fetchXEmbedMetadata(url) {
  if (!url || (!url.includes('x.com') && !url.includes('twitter.com'))) {
    return null;
  }

  const oembedUrl = `${OEMBED_BASE}?${new URLSearchParams({
    url,
    omit_script: 'true',
    theme: 'dark',
  }).toString()}`;

  return fetch(oembedUrl);
}
