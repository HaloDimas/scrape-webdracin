import scraper from "../scrape.cjs";
import { handleCors, send, requireGet, batched, CACHE } from "./_lib/common.js";

export const config = { maxDuration: 60 };

// [{platform, ok}] — ok=false means the landing currently yields no dramas.
// Probed in small batches to avoid hammering upstream; edge-cached 30 min.
export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (!requireGet(req, res)) return;
  try {
    const plats = await scraper.getPlatforms();
    const out = await batched(plats, 6, async (pl) => {
      try {
        const items = await scraper.list(pl, 1);
        return { platform: pl, ok: items.length > 0 };
      } catch {
        return { platform: pl, ok: false };
      }
    });
    return send(res, 200, out, CACHE.MEDIUM);
  } catch (e) {
    return send(res, 500, { error: String((e && e.message) || e) });
  }
}

