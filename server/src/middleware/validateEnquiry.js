const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEnquiry(req, res, next) {
  const { type = "contact", name, company, email, message, lineName } = req.body || {};

  if (!["contact", "spec"].includes(type)) {
    return res.status(400).json({ error: "Invalid enquiry type." });
  }
  if (!email || !EMAIL_RE.test(String(email).trim())) {
    return res.status(400).json({ error: "Enter a valid work email." });
  }
  if (type === "contact") {
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "We need a name to address the reply." });
    }
    if (!company || !String(company).trim()) {
      return res.status(400).json({ error: "Which mill or buying house?" });
    }
  }

  req.body = {
    type,
    name: name ? String(name).trim() : undefined,
    company: company ? String(company).trim() : undefined,
    email: String(email).trim(),
    message: message ? String(message).trim() : undefined,
    lineName: lineName ? String(lineName).trim() : undefined
  };
  next();
}
