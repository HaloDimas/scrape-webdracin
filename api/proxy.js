import { handleCors, send, UA } from "./_lib/common.js";

// Generic proxy for subtitles / covers / video fallback (fixes CORS + hotlink).
// Usage: /api/proxy?url=<encoded>&type=vtt|img|video
// Streams the upstream body through (no buffering) so video seeks stay light.
export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") return send(res, 405, { error: "GET only" });

  const target = req.query.url;
  if (!target || !/^https?:\/\//i.test(target)) {
    return send(res, 400, { error: "need ?url=https://..." });
  }

  try {
    const headers = { "user-agent": UA };
    if (req.headers.range) headers.range = req.headers.range;
    if (req.query.type === "vtt") headers.accept = "text/vtt,*/*";

    const upstream = await fetch(target, { headers });
    if (!upstream.ok && upstream.status !== 206) {
      return send(res, 502, { error: "upstream " + upstream.status });
    }

    const ct = upstream.headers.get("content-type") || "application/octet-stream";
    const out = { "Access-Control-Allow-Origin": "*", "Content-Type": ct };
    for (const h of ["content-length", "content-range", "accept-ranges"]) {
      const v = upstream.headers.get(h);
      if (v) out[h] = v;
    }
    out["Cache-Control"] = "public, max-age=3600, s-maxage=3600";
    res.writeHead(upstream.status, out);

    if (!upstream.body) {
      res.end();
      return;
    }
    const reader = upstream.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (e) {
    return send(res, 502, { error: String((e && e.message) || e) });
  }
}

