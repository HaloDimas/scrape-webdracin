import * as wd from "../lib/wd.js";

// Single catch-all for the whole WebDracin backend so the Hobby plan's
// 12-function cap is never an issue (this + dramabox-proxy = 2 functions).
// URLs stay identical to the old per-file layout: /api/<action>?... .
// Exact file api/dramabox-proxy.js still takes precedence for its own route.
export const config = { maxDuration: 60 };

const ROUTES = {
  health: wd.health,
  "cache-clear": wd.cacheClear,
  platforms: wd.platforms,
  "platform-status": wd.platformStatus,
  list: wd.list,
  all: wd.all,
  search: wd.search,
  drama: wd.drama,
  watch: wd.watch,
  episode: wd.episode,
  full: wd.full,
  proxy: wd.proxy,
  img: wd.img,
};

export default async function handler(req, res) {
  if (wd.handleCors(req, res)) return;
  if (!wd.requireGet(req, res)) return;

  const parts = req.query.all;
  const action = Array.isArray(parts) ? parts[0] : parts;
  const fn = ROUTES[action];
  if (!fn) {
    return wd.send(res, 404, {
      error: "unknown api action",
      known: Object.keys(ROUTES),
    });
  }
  try {
    await fn(req, res);
  } catch (e) {
    wd.send(res, 500, { error: String((e && e.message) || e) });
  }
}
