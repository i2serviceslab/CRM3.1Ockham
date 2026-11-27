const buckets = new Map<string, number[]>();

/**
 * Simple in-memory sliding-window rate limiter for auth and sensitive endpoints.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (buckets.get(key) || []).filter((ts) => ts > cutoff);

  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    buckets.set(key, timestamps);
    return { allowed: false, retryAfterSeconds };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);

  // Periodic cleanup to avoid unbounded map growth
  if (buckets.size > 2000) {
    for (const [k, list] of buckets.entries()) {
      if (list.every((ts) => ts <= cutoff)) buckets.delete(k);
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
