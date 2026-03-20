const mongoose = require("mongoose");

const eventRegistrantSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    attendance_token: {
      type: String,
      unique: true,
      required: true,
    },
    is_attended: {
      type: Boolean,
      default: false,
    },
    attended_at: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Index for quick lookups during scanning
eventRegistrantSchema.index({ attendance_token: 1 });
// Prevent duplicate registration
eventRegistrantSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("EventRegistrant", eventRegistrantSchema);
