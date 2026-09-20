import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, trim: true, maxlength: 120 },
    role: { type: String, enum: ["admin"], default: "admin" },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    // Bumped when the password is changed from the profile page. Session
    // tokens carry the version they were issued under, so every older token is
    // rejected (see middleware/auth.js).
    tokenVersion: { type: Number, default: 0 }
  },
  { timestamps: true }
);

adminSchema.methods.setPassword = async function setPassword(plainPassword) {
  this.passwordHash = await bcrypt.hash(plainPassword, 12);
};

adminSchema.methods.verifyPassword = function verifyPassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

adminSchema.methods.isLocked = function isLocked() {
  return Boolean(this.lockUntil && this.lockUntil > new Date());
};

adminSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.loginAttempts;
    delete ret.lockUntil;
    delete ret.tokenVersion;
    return ret;
  }
});

export default mongoose.model("Admin", adminSchema);
