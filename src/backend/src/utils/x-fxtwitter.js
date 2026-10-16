import https from 'https';

const FXTWITTER_BASE = 'https://api.fxtwitter.com';

function extractTweetRef(url) {
  const m = (url || '').match(/(?:x|twitter)\.com\/([^/]+)\/status(?:es)?\/(\d+)/i);
  return m ? { user: m[1], id: m[2] } : null;
}

function getJson(urlStr) {
  return new Promise((resolve) => {
    const url = new URL(urlStr);
    const req = https.get(
      url,
      {
        timeout: 8000,
        headers: {
          'User-Agent': 'IntelMap24-availability-check/1.0',
          Accept: 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(data);
          } catch {
            /* non-JSON body */
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', () => resolve({ status: 0, body: null }));
    req.on('timeout', function () {
      this.destroy();
      resolve({ status: 0, body: null });
    });
  });
}

/**
 * Resolve a tweet through fxtwitter (the same API the frontends render from).
 * Returns:
 *  - { ok: true, metadata }          tweet exists
 *  - { ok: false }                   tweet deleted/protected (definitive 404)
 *  - { ok: false, networkError: 1 }  fxtwitter itself unreachable / unexpected
 */
export async function fetchFxTweet(url) {
  const ref = extractTweetRef(url);
  if (!ref) return { ok: false, networkError: 1 };

  const { status, body } = await getJson(`${FXTWITTER_BASE}/${ref.user}/status/${ref.id}`);

  if (status === 200 && body?.tweet) {
    return {
      ok: true,
      metadata: {
        authorName: body.tweet.author?.name || null,
        authorUrl: body.tweet.author?.url || null,
        html: null,
      },
    };
  }

  if (status === 404) {
    return { ok: false };
  }

  return { ok: false, networkError: 1 };
}
