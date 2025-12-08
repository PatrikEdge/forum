type LimitConfig = {
  windowMs: number;
  max: number;
};

const attempts = new Map<string, { count: number; expires: number }>();

export function rateLimit(key: string, { windowMs, max }: LimitConfig) {
  const currentTime = Date.now();
  const entry = attempts.get(key);

  if (entry) {
    if (currentTime < entry.expires) {
      if (entry.count >= max) {
        return false;
      }
      entry.count++;
      attempts.set(key, entry);
      return true;
    }
  }

  attempts.set(key, {
    count: 1,
    expires: currentTime + windowMs,
  });

  return true;
}
