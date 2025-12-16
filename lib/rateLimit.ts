// lib/rateLimit.ts

type LimitConfig = {
  windowMs: number;
  max: number;
};

const DEFAULT_CONFIG: LimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 perc
  max: 20,
};

const attempts = new Map<string, { count: number; expires: number }>();

export function rateLimit(
  key: string,
  config: Partial<LimitConfig> = {}
) {
  const { windowMs, max } = { ...DEFAULT_CONFIG, ...config };
  const currentTime = Date.now();
  const entry = attempts.get(key);

  if (entry && currentTime < entry.expires) {
    if (entry.count >= max) {
      return false;
    }
    entry.count++;
    attempts.set(key, entry);
    return true;
  }

  attempts.set(key, {
    count: 1,
    expires: currentTime + windowMs,
  });

  return true;
}
