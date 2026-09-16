export function notFound(req, res) {
  const message = `Route not found: ${req.method} ${req.originalUrl}`;
  res.status(404).json({ success: false, error: message, message });
}

export function errorHandler(err, req, res, next) {
  console.error("[error]", err?.stack || err);
  const status = Number(err.status) || 500;
  const message = err.message || "Internal server error.";
  res.status(status).json({
    success: false,
    error: message,
    message
  });
}

