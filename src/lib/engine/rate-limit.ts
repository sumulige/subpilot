/**
 * RateLimit：并发限制 + RPS Token Bucket
 */

/**
 * 速率限制器 (Token Bucket)
 * rps <= 0 时为 no-op
 */
export function createRateLimiter(rps: number): () => Promise<void> {
  if (rps <= 0) return () => Promise.resolve();

  const interval = 1000 / rps;
  let lastRequestTime = 0;
  const queue: Array<() => void> = [];

  const processQueue = () => {
    const now = Date.now();
    const timeSinceLast = now - lastRequestTime;

    if (queue.length === 0) return;

    if (timeSinceLast >= interval) {
      const resolve = queue.shift();
      lastRequestTime = Date.now();
      resolve?.();

      if (queue.length > 0) {
        setTimeout(processQueue, interval);
      }
    } else {
      const delay = interval - timeSinceLast;
      setTimeout(processQueue, delay);
    }
  };

  return () => {
    return new Promise<void>((resolve) => {
      queue.push(resolve);
      if (queue.length === 1) {
        processQueue();
      }
    });
  };
}

/**
 * 并发限制器
 */
export function createLimiter(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (queue.length > 0 && active < concurrency) {
      const fn = queue.shift();
      if (fn) fn();
    }
  };

  return <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      const run = async () => {
        active++;
        try {
          const result = await fn();
          resolve(result);
        } catch (e) {
          reject(e);
        } finally {
          active--;
          next();
        }
      };

      if (active < concurrency) {
        run();
      } else {
        queue.push(run);
      }
    });
  };
}
