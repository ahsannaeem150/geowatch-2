import { getSystemHealth } from '../services/system.service.js';

export async function getHealthController(req, res) {
  const health = await getSystemHealth();
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
  res.status(statusCode).apiSuccess(health);
}

function isTwitterUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === 'twitter.com' || hostname === 'www.twitter.com' || hostname === 'x.com' || hostname === 'www.x.com';
  } catch {
    return false;
  }
}

function extractTweetId(url) {
  try {
    const match = url.match(/(?:twitter|x)\.com\/[^/]+\/status\/(\d+)/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function buildTwitterEmbedHtml(url, theme = 'dark') {
  const tweetId = extractTweetId(url);
  if (!tweetId) return '';

  const bg = theme === 'dark' ? '#000000' : '#ffffff';
  return `<blockquote class="twitter-tweet" data-theme="${theme}"><a href="${url}"></a></blockquote>`;
}

export async function getOEmbedController(req, res) {
  const url = req.query.url;
  if (!url) {
    return res.apiError('Missing url parameter', 'BAD_REQUEST', 400);
  }

  if (!isTwitterUrl(url)) {
    return res.apiError('Unsupported oEmbed provider', 'BAD_REQUEST', 400);
  }

  const tweetId = extractTweetId(url);
  if (!tweetId) {
    return res.apiError('Could not extract tweet ID from URL', 'BAD_REQUEST', 400);
  }

  // Return a Twitter embed blockquote. The frontend loads widgets.js to render it.
  const html = buildTwitterEmbedHtml(url, req.query.theme || 'dark');
  res.apiSuccess({ html });
}
