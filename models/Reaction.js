const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    type: {
      type: String,
      enum: ["heart", "laugh", "like", "wow", "sad"],
      required: true,
    },
  },
  { timestamps: true }
);

// Ensure a user can only have one reaction per target
reactionSchema.index({ userId: 1, targetId: 1, targetType: 1 }, { unique: true });

module.exports = mongoose.model("Reaction", reactionSchema);
