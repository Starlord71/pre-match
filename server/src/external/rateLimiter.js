/**
 * Rate limiter for football-data.org.
 *
 * The free tier allows 10 requests per minute. This module serializes work
 * through a promise chain and enforces a moving 60s window: a task only runs
 * when fewer than `maxRequests` timestamps fall inside the window.
 * @module external/rateLimiter
 */

const DEFAULT_MAX_REQUESTS = 10;
const DEFAULT_WINDOW_MS = 60_000;

/**
 * @param {number} ms Milliseconds to wait.
 * @returns {Promise<void>} Resolves after the delay.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates an isolated rate limiter instance.
 * @param {object} [options] Limiter configuration.
 * @param {number} [options.maxRequests=10] Maximum requests per window.
 * @param {number} [options.windowMs=60000] Window size in milliseconds.
 * @param {() => number} [options.now=Date.now] Clock, injectable for tests.
 * @returns {{ schedule: (task: Function) => Promise<*> }} Limiter API.
 */
export function createRateLimiter({
  maxRequests = DEFAULT_MAX_REQUESTS,
  windowMs = DEFAULT_WINDOW_MS,
  now = Date.now,
} = {}) {
  /** @type {number[]} Start times of the requests inside the current window. */
  const timestamps = [];
  /** @type {Promise<*>} Tail of the queue, keeps tasks serialized. */
  let tail = Promise.resolve();

  /**
   * Drops timestamps that fell out of the moving window.
   * @param {number} current Current clock value.
   * @returns {void}
   */
  function prune(current) {
    const cutoff = current - windowMs;
    while (timestamps.length > 0 && timestamps[0] <= cutoff) {
      timestamps.shift();
    }
  }

  /**
   * Waits until a slot is free, then reserves it.
   * @returns {Promise<void>} Resolves when the caller may run.
   */
  async function acquire() {
    for (;;) {
      const current = now();
      prune(current);

      if (timestamps.length < maxRequests) {
        timestamps.push(current);
        return;
      }

      const waitFor = timestamps[0] + windowMs - current;
      await sleep(waitFor > 0 ? waitFor : 0);
    }
  }

  /**
   * Queues a task, running it once a rate-limit slot is available.
   * @template T
   * @param {() => T | Promise<T>} task Work to run under the limiter.
   * @returns {Promise<T>} Result of the task.
   */
  function schedule(task) {
    const result = tail.then(async () => {
      await acquire();
      return task();
    });

    // Keep the queue alive even when a task rejects.
    tail = result.then(
      () => undefined,
      () => undefined,
    );

    return result;
  }

  return { schedule };
}

/** Shared limiter instance used by the football-data.org client. */
export const rateLimiter = createRateLimiter();

export default rateLimiter;
