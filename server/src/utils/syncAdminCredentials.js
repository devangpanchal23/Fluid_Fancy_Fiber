import Admin from "../models/Admin.js";

/** Apply configured deployment credentials to the persistent admin record. */
export async function syncAdminCredentials(env = process.env) {
  const rawEmail = env.ADMIN_EMAIL;
  const password = env.ADMIN_PASSWORD;

  // Credentials are an optional pair. Do not silently reset the account when
  // either deployment variable is missing.
  if (!rawEmail && !password) return { status: "skipped" };
  if (!rawEmail || !password) {
    throw new Error("Both ADMIN_EMAIL and ADMIN_PASSWORD must be configured together.");
  }

  const email = String(rawEmail).trim().toLowerCase();
  if (!email || String(password).length < 8) {
    throw new Error("ADMIN_EMAIL must be valid and ADMIN_PASSWORD must be at least 8 characters.");
  }

  let admin = await Admin.findOne({ email });
  if (!admin) {
    const admins = await Admin.find().limit(2);
    if (admins.length === 1) admin = admins[0];
    else if (admins.length > 1) {
      throw new Error("Cannot sync deployment credentials because multiple admin accounts exist.");
    }
  }

  const name = env.ADMIN_NAME || "Admin";
  if (!admin) {
    admin = new Admin({ email, name });
    await admin.setPassword(String(password));
    await admin.save();
    return { status: "created" };
  }

  const passwordMatches = await admin.verifyPassword(String(password));
  const changed = admin.email !== email || admin.name !== name || !passwordMatches;
  if (!changed) return { status: "unchanged" };

  admin.email = email;
  admin.name = name;
  if (!passwordMatches) await admin.setPassword(String(password));
  admin.loginAttempts = 0;
  admin.lockUntil = null;
  admin.tokenVersion = (admin.tokenVersion || 0) + 1;
  await admin.save();
  return { status: "updated" };
}
