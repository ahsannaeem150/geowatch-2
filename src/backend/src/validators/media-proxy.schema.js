import { z } from 'zod';

export const mediaProxyQuerySchema = z.object({
  url: z.string().url().max(2048).refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:'
        && url.hostname === 'video.twimg.com'
        && !url.username
        && !url.password
        && (!url.port || url.port === '443');
    } catch {
      return false;
    }
  }, 'Only Twitter video CDN URLs are supported'),
});
