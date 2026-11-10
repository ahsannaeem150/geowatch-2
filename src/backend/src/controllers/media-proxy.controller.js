import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { openTwitterVideoStream } from '../services/media-proxy.service.js';

const RESPONSE_HEADERS = [
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
  'cache-control',
  'etag',
  'last-modified',
  'expires',
];

export async function proxyTwitterVideoController(req, res) {
  const { upstream, abort } = await openTwitterVideoStream(req.query.url, req.get('range'));
  res.on('close', () => {
    if (!res.writableEnded) abort();
  });

  res.status(upstream.status);
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) res.setHeader(name, value);
  }

  if (req.method === 'HEAD' || !upstream.body) {
    res.end();
    return;
  }

  try {
    await pipeline(Readable.fromWeb(upstream.body), res);
  } catch (err) {
    if (res.headersSent) {
      res.destroy(err);
      return;
    }
    throw Object.assign(new Error('Twitter video stream failed'), {
      status: 502,
      errorCode: 'VIDEO_STREAM_FAILED',
    });
  }
}
