import { handleCors, send } from "./_lib/common.js";

// Compat shim: the old always-on server.js had an in-memory cache with a
// clear endpoint. Serverless functions are stateless (edge-cached instead),
// so there is nothing to clear — keep the route so old clients don't break.
export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  return send(res, 200, { ok: true, cleared: false, note: "serverless: edge cache only" });
}

