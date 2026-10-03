import { handleCors, UA, CACHE } from "./_lib/common.js";

// Image proxy: fixes slow / hotlink-protected covers.
// NOTE: upstream `cover_real` is often raw .heic (unrenderable in browsers),
// so the frontend must prefer `cover`. Serverless has no disk cache —
// repeat loads are served from the Vercel edge cache instead.
export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("GET only");
    return;
  }

  const target = req.query.url;
  if (!target || !/^https?:\/\//i.test(target)) {
    res.statusCode = 400;
    res.end("need ?url=");
    return;
  }

  try {
    const upstream = await fetch(target, {
      headers: { "user-agent": UA, accept: "image/avif,image/webp,image/*,*/*" },
    });
    if (!upstream.ok) {
      res.statusCode = 502;
      res.end("upstream " + upstream.status);
      return;
    }
    const ct = (upstream.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
    if (!ct.startsWith("image/")) {
      res.statusCode = 502;
      res.end("not an image");
      return;
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    if (!buf.length) {
      res.statusCode = 502;
      res.end("empty");
      return;
    }
    res.writeHead(200, {
      "Content-Type": ct,
      "Cache-Control": CACHE.IMG,
      "Access-Control-Allow-Origin": "*",
    });
    res.end(buf);
  } catch {
    res.statusCode = 502;
    res.end("img error");
  }
}

