const WINDOW_MS = 15 * 60 * 1000;
const buckets = new Map();
const speechBuckets = new Map();

function maxRequests() {
  const value = Number(process.env.AI_CHAT_RATE_LIMIT_MAX);
  return Number.isFinite(value) && value > 0 ? value : 20;
}

/**
 * In-memory limiter for the Nova chat route. Resets when the process restarts.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function aiChatLimiter(req, res, next) {
  const key = String(req.user?.id || req.user?._id || req.ip || 'anonymous');
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.start >= WINDOW_MS) {
    bucket = { start: now, count: 0 };
    buckets.set(key, bucket);
  }
  bucket.count += 1;

  if (buckets.size > 5000) {
    for (const [id, entry] of buckets) {
      if (now - entry.start >= WINDOW_MS) buckets.delete(id);
    }
  }

  if (bucket.count > maxRequests()) {
    return res.status(429).json({
      success: false,
      error: 'Too many Nova requests. Please wait and try again.',
      message: 'Too many Nova requests. Please wait and try again.',
    });
  }
  return next();
}

/**
 * Separate limiter so spoken replies do not use up the chat allowance.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function aiSpeechLimiter(req, res, next) {
  const key = String(req.user?.id || req.user?._id || req.ip || 'anonymous');
  const now = Date.now();
  let bucket = speechBuckets.get(key);
  if (!bucket || now - bucket.start >= WINDOW_MS) {
    bucket = { start: now, count: 0 };
    speechBuckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > 40) {
    return res.status(429).json({
      success: false,
      error: 'Too many Nova requests. Please wait and try again.',
      message: 'Too many Nova requests. Please wait and try again.',
    });
  }
  return next();
}

export function resetAiRateLimit() {
  buckets.clear();
  speechBuckets.clear();
}
