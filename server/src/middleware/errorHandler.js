export function notFound(req, res) {
  const message = "The requested resource was not found.";
  res.status(404).json({ success: false, code: "NOT_FOUND", error: message, message });
}

export function errorHandler(err, req, res, next) {
  console.error("[error]", err?.stack || err);
  if (res.headersSent) return next(err);

  let status = Number(err.statusCode || err.status) || 500;
  let code = "INTERNAL_ERROR";
  let message = "Something went wrong. Please try again.";

  if (err.name === "ValidationError" || err.name === "CastError") {
    status = 400;
    code = "INVALID_INPUT";
    message = "Some submitted information is invalid. Please check it and try again.";
  } else if (err.code === 11000) {
    status = 409;
    code = "ALREADY_EXISTS";
    message = "A record with this information already exists.";
  } else if (err.name === "MulterError") {
    status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    code = status === 413 ? "FILE_TOO_LARGE" : "INVALID_UPLOAD";
    message = status === 413 ? "The uploaded file is too large." : err.message || "The uploaded file could not be accepted.";
  } else if (status === 429) {
    code = "RATE_LIMITED";
    message = "Too many requests. Please try again later.";
  } else if (status === 401) {
    code = "UNAUTHENTICATED";
    message = "Please sign in to continue.";
  } else if (status === 403) {
    code = "FORBIDDEN";
    message = "You do not have permission to do that.";
  } else if (status === 503) {
    code = "SERVICE_UNAVAILABLE";
    message = "This service is temporarily unavailable. Please try again shortly.";
  } else if (status >= 400 && status < 500) {
    code = "INVALID_REQUEST";
    message = status === 400 && typeof err.message === "string"
      ? err.message
      : "The request could not be completed. Please check your information and try again.";
  } else {
    status = 500;
  }

  res.status(status).json({
    success: false,
    code,
    error: message,
    message
  });
}

