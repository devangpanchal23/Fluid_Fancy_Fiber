// Minimal request logger — no new dependency (morgan etc.) needed for this.
// Logs method, path, status and duration for every request so failures
// (including ones that never reach a route handler, or that hang) are
// visible in the server console instead of being invisible until a client
// eventually gives up.
export function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, originalUrl } = req;
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`[http] ${method} ${originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
}
