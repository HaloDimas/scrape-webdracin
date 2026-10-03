import { handleCors, send, UA } from "./_lib/common.js";

// Vercel port of supabase/functions/dramabox-proxy (Deno edge function).
// Same query interface so the DramaStream frontend works unchanged:
//   /api/dramabox-proxy?endpoint=<name>&source=<dramabox|melolo|netshort|dramadash|dramawave|freereels|starshot>&params=<...>
//   /api/dramabox-proxy?videoUrl=<encoded>   (CORS-blocked video streams, m3u8-aware)
//   /api/dramabox-proxy?imageUrl=<encoded>   (hotlink-protected images)

const DRAMABOX_API = "https://dramabox.sansekai.my.id/api/dramabox";
const MELOLO_API = "https://melolo-api-azure.vercel.app/api/melolo";
const NETSHORT_API = "https://netshort.sansekai.my.id/api/netshort";
const DRAPI_BASE = "https://drapi.finnsyde.lol/api";

const DRAPI_SOURCES = new Set(["dramadash", "dramawave", "freereels", "starshot"]);

// Tiny per-instance cache (each serverless instance keeps its own).
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  if (cache.size > 100) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

function proxyBase(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  return `${proto}://${host}/api/dramabox-proxy?videoUrl=`;
}

async function handleVideo(req, res, videoUrl) {
  try {
    const upstream = await fetch(videoUrl, {
      headers: {
        "user-agent": UA,
        Accept: "*/*",
        Referer: "https://dramabox.com/",
        Origin: "https://dramabox.com",
      },
    });
    if (!upstream.ok) {
      res.writeHead(upstream.status, { "Access-Control-Allow-Origin": "*" });
      res.end();
      return;
    }

    const contentType =
      upstream.headers.get("content-type") || "application/vnd.apple.mpegurl";
    const isM3u8 =
      videoUrl.includes(".m3u8") ||
      contentType.includes("mpegurl") ||
      contentType.includes("x-mpegURL");

    if (isM3u8) {
      const text = await upstream.text();
      const baseUrl = videoUrl.substring(0, videoUrl.lastIndexOf("/") + 1);
      const base = proxyBase(req);
      const rewritten = text
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("#") || trimmed === "") return line;
          if (!trimmed.startsWith("http")) return base + encodeURIComponent(baseUrl + trimmed);
          return base + encodeURIComponent(trimmed);
        })
        .join("\n");
      res.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "public, max-age=60, s-maxage=60",
      });
      res.end(rewritten);
      return;
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    });
    res.end(buf);
  } catch (e) {
    send(res, 502, { error: "Failed to proxy video" });
  }
}

async function handleImage(res, imageUrl) {
  try {
    const upstream = await fetch(imageUrl, {
      headers: { "user-agent": UA, Accept: "image/*", Referer: "https://melolo.tv/" },
    });
    if (!upstream.ok) {
      res.writeHead(upstream.status, { "Access-Control-Allow-Origin": "*" });
      res.end();
      return;
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    });
    res.end(buf);
  } catch {
    send(res, 502, { error: "Failed to proxy image" });
  }
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") return send(res, 405, { error: "GET only" });

  try {
    const { endpoint, params = "", source = "dramabox", imageUrl, videoUrl } = req.query;

    if (videoUrl) return handleVideo(req, res, videoUrl);
    if (imageUrl) return handleImage(res, imageUrl);

    if (!endpoint) return send(res, 400, { error: "Missing endpoint parameter" });

    let apiUrl;
    switch (source) {
      case "melolo":
        apiUrl = `${MELOLO_API}/${endpoint}`;
        if (params) apiUrl += `?${params}`;
        break;
      case "netshort":
        apiUrl = `${NETSHORT_API}/${endpoint}`;
        if (params) apiUrl += `?${params}`;
        break;
      case "dramadash":
      case "dramawave":
      case "freereels":
      case "starshot":
        if (params && (endpoint === "episodes" || endpoint === "watch")) {
          apiUrl = `${DRAPI_BASE}/v1/sources/${source}/${endpoint}/${params}`;
        } else if (params && endpoint === "search") {
          apiUrl = `${DRAPI_BASE}/v1/sources/${source}/${endpoint}?${params}`;
        } else {
          apiUrl = `${DRAPI_BASE}/v1/sources/${source}/${endpoint}`;
        }
        break;
      default:
        apiUrl = `${DRAMABOX_API}/${endpoint}`;
        if (params) apiUrl += `?${params}`;
    }

    const isDrapi = DRAPI_SOURCES.has(source);
    const cacheKey = `${source}:${endpoint}:${params}`;
    if (isDrapi) {
      const cached = getCached(cacheKey);
      if (cached) {
        res.setHeader("X-Cache", "HIT");
        return send(res, 200, cached, "public, max-age=300, s-maxage=300");
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const upstream = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "user-agent": UA,
          Referer: "https://drapi.finnsyde.lol/",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!upstream.ok) {
        return send(res, upstream.status, { error: `API returned ${upstream.status}` });
      }

      const data = await upstream.json();
      if (isDrapi) setCache(cacheKey, data);
      const cacheMaxAge = isDrapi ? 300 : 60;
      return send(res, 200, data, `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}`);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError && fetchError.name === "AbortError") {
        return send(res, 504, { error: "Request timeout" });
      }
      throw fetchError;
    }
  } catch (e) {
    return send(res, 500, { error: String((e && e.message) || e) });
  }
}

