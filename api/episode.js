import scraper from "../scrape.cjs";
import { handleCors, send, requireGet, CACHE } from "./_lib/common.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (!requireGet(req, res)) return;
  try {
    const { id, ep, eid } = req.query;
    if (!id || !ep || !eid) return send(res, 400, { error: "need ?id=&ep=&eid=" });
    // Stream URLs are signed & short-lived → cache briefly only.
    const data = await scraper.episode(id, ep, eid);
    return send(res, 200, data, CACHE.EPHEMERAL);
  } catch (e) {
    return send(res, 500, { error: String((e && e.message) || e) });
  }
}

