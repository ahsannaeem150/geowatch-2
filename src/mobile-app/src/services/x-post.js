// Live tweet data for the native X-post cards. X's official embed needs a
// WebView and shows its own "open in app" nags, so we resolve the tweet
// through the free fxtwitter embed API (no key) and render our own native
// card — media opens in the app's own swipe gallery.
//
// Results are cached in-memory per tweet id; failures are cached too so a
// dead tweet does not refetch on every render.

const cache = new Map();

export function extractTweetRef(url) {
  const m = (url || '').match(/(?:x|twitter)\.com\/([^/]+)\/status(?:es)?\/(\d+)/i);
  return m ? { user: m[1], id: m[2] } : null;
}

export async function fetchTweet(url) {
  const ref = extractTweetRef(url);
  if (!ref) {
    return null;
  }
  if (cache.has(ref.id)) {
    return cache.get(ref.id);
  }
  let tweet = null;
  try {
    const res = await fetch(`https://api.fxtwitter.com/${ref.user}/status/${ref.id}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const t = data?.tweet;
      if (t) {
        const media = [];
        for (const p of t.media?.photos || []) {
          media.push({
            type: 'image',
            url: p.url,
            thumb: p.url,
            width: p.width || null,
            height: p.height || null,
          });
        }
        for (const v of t.media?.videos || []) {
          media.push({
            type: 'video',
            url: v.url,
            thumb: v.thumbnail_url || null,
            width: v.width || null,
            height: v.height || null,
            duration: v.duration != null ? Math.round(v.duration) : null,
          });
        }
        tweet = {
          name: t.author?.name || ref.user,
          handle: t.author?.screen_name || ref.user,
          avatar: t.author?.avatar_url || null,
          verified: t.author?.verification?.verified === true,
          verifiedType: t.author?.verification?.type || null,
          text: t.text || '',
          date: t.created_timestamp ? new Date(t.created_timestamp * 1000) : null,
          likes: t.likes ?? null,
          retweets: t.retweets ?? null,
          replies: t.replies ?? null,
          views: t.views ?? null,
          media,
        };
      }
    }
  } catch {
    tweet = null;
  }
  cache.set(ref.id, tweet);
  return tweet;
}
