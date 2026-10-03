// Shared helpers for Vercel serverless api/* functions (Node runtime, ESM).
// Serverless has no shared memory / disk, so caching is done via
// `Cache-Control: s-maxage=...` (Vercel edge cache) instead of in-memory Maps.

export function handleCors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}

export function send(res, code, data, cache) {
  const body = typeof data === "string" ? data : JSON.stringify(data);
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Cache-Control",
    cache || "no-cache"
  );
  res.end(body);
}

// Standard CDN cache presets (edge caches GET responses with query strings).
export const CACHE = {
  NONE: "no-cache",
  SHORT: "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
  MEDIUM: "public, max-age=300, s-maxage=600, stale-while-revalidate=1800",
  LONG: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
  // Signed/short-lived stream URLs — cache briefly only.
  EPHEMERAL: "public, max-age=30, s-maxage=60, stale-while-revalidate=60",
  IMG: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400, immutable",
};

export function requireGet(req, res) {
  if (req.method !== "GET") {
    send(res, 405, { error: "GET only" });
    return false;
  }
  return true;
}

// Run async tasks with limited concurrency (gentle on upstream).
export async function batched(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    const rs = await Promise.all(
      items.slice(i, i + size).map(async (it) => {
        try {
          return await fn(it);
        } catch {
          return null;
        }
      })
    );
    out.push(...rs);
  }
  return out;
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
export { UA };
