const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "targetType",
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "targetType",
      required: true,
    },
    targetType: {
      type: String,
      required: true,
      enum: ["Message", "Article"],
      default: "Message",
    },
    name: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
    },
    message: {
      type: String,
      required: true,
    },
    replies: [
      {
        name: { type: String, required: true },
        avatarUrl: { type: String },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);
