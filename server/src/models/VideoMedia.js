import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  provider: { type: String, enum: ['cloudinary', 'drive', 'direct'], default: 'cloudinary' },
  // For links this is an internal link:SHA256 key, never a Cloudinary asset ID.
  // Keeping the existing unique index avoids an unsafe production index migration.
  publicId: { type: String, required: true, unique: true, maxlength: 300 },
  url: { type: String, required: true },
  thumbnail: { type: new mongoose.Schema({ url: String, alt: { type: String, default: '' } }, { _id: false }), default: null },
  originalName: { type: String, required: true, maxlength: 255 },
  size: Number,
  format: String,
  duration: Number,
  // Atomic claims prevent deletion from racing a content save.
  references: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
  deleting: { type: Boolean, default: false }
}, { timestamps: true });
export default mongoose.model('VideoMedia', schema);
