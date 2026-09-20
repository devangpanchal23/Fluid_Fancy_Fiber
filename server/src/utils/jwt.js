import jwt from "jsonwebtoken";

const TOKEN_TTL = "8h";
export const TOKEN_MAX_AGE_MS = 8 * 60 * 60 * 1000;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET is not set (or too short). Set a strong random secret in your environment.");
  }
  return secret;
}

export function signAdminToken(admin) {
  return jwt.sign({ sub: admin._id.toString(), email: admin.email, v: admin.tokenVersion || 0 }, getSecret(), { expiresIn: TOKEN_TTL });
}

export function verifyAdminToken(token) {
  return jwt.verify(token, getSecret());
}
