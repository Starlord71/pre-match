import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRateLimiter } from '../rateLimiter.js';

describe('rateLimiter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs up to the limit immediately and postpones the rest', async () => {
    vi.useFakeTimers();

    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60_000 });
    const startedAt = [];

    const tasks = [0, 1, 2].map((index) =>
      limiter.schedule(() => {
        startedAt.push(Date.now());
        return index;
      }),
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(startedAt).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(startedAt).toHaveLength(3);
    expect(startedAt[2] - startedAt[0]).toBeGreaterThanOrEqual(60_000);

    await expect(Promise.all(tasks)).resolves.toEqual([0, 1, 2]);
  });

  it('keeps queue order and survives rejected tasks', async () => {
    const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 });
    const order = [];

    const failing = limiter.schedule(() => {
      order.push('fail');
      throw new Error('boom');
    });
    const following = limiter.schedule(() => {
      order.push('next');
      return 'ok';
    });

    await expect(failing).rejects.toThrow('boom');
    await expect(following).resolves.toBe('ok');
    expect(order).toEqual(['fail', 'next']);
  });
});
