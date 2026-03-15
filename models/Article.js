const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema(
  {
    image_url: {
      type: String,
      required: true,
    },
    cloudinary_id: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    reactions: {
      heart: { type: Number, default: 0 },
      laugh: { type: Number, default: 0 },
      like: { type: Number, default: 0 },
      wow: { type: Number, default: 0 },
      sad: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Article", articleSchema);