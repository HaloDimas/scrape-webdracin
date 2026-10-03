import scraper from "../scrape.cjs";
import { handleCors, send, requireGet, CACHE } from "./_lib/common.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (!requireGet(req, res)) return;
  try {
    const query = (req.query.q || "").trim();
    if (!query) return send(res, 400, { error: "need ?q=" });
    const limit = Math.min(+(req.query.limit || 24), 100);
    const data = await scraper.search(query, limit);
    return send(res, 200, data, CACHE.SHORT);
  } catch (e) {
    return send(res, 500, { error: String((e && e.message) || e) });
  }
}

