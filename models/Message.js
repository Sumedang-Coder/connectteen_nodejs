const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    recipient_name: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    song_id: {
      type: String,
      required: true,
    },
    song_image: {
      type: String,
      required: true,
    },
    song_artist: {
      type: String,
      required: true,
    },
    song_name: {
      type: String,
      required: true,
    },
    preview_url: {
      type: String,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    is_admin_only: {
      type: Boolean,
      default: false,
    },
    is_anonymous: {
      type: Boolean,
      default: true,
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

module.exports = mongoose.model("Message", messageSchema);
