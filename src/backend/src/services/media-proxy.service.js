const TWITTER_VIDEO_HOST = 'video.twimg.com';

export async function openTwitterVideoStream(value, range) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:'
    || url.hostname !== TWITTER_VIDEO_HOST
    || url.username
    || url.password
    || (url.port && url.port !== '443')
  ) {
    throw Object.assign(new Error('Unsupported video URL'), {
      status: 400,
      errorCode: 'INVALID_VIDEO_URL',
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let upstream;
  try {
    upstream = await fetch(url, {
      signal: controller.signal,
      redirect: 'manual',
      headers: {
        Accept: 'video/mp4,video/*;q=0.9,*/*;q=0.1',
        'User-Agent': 'IntelMap24/1.0 (https://intelmap24.com)',
        ...(range ? { Range: range } : {}),
      },
    });
  } catch {
    throw Object.assign(new Error('Twitter video is unavailable'), {
      status: 502,
      errorCode: 'VIDEO_UPSTREAM_UNAVAILABLE',
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!upstream.ok) {
    upstream.body?.cancel().catch(() => {});
    throw Object.assign(new Error('Twitter video is unavailable'), {
      status: 502,
      errorCode: 'VIDEO_UPSTREAM_UNAVAILABLE',
    });
  }

  return { upstream, abort: () => controller.abort() };
}
