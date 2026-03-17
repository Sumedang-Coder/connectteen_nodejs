const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    event_title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    date: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    quota: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["open", "full", "closed"],
      default: "open",
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    image_url: {
      type: String,
      required: true,
    },
    cloudinary_id: {
      type: String,
      required: true,
    },
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
