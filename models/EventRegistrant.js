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
    // Registration form data (per-event)
    reg_name: {
      type: String,
      default: "",
    },
    reg_phone: {
      type: String,
      default: "",
    },
    reg_address: {
      type: String,
      default: "",
    },
    reg_occupation: {
      type: String,
      enum: ["", "kerja", "sekolah", "kuliah"],
      default: "",
    },
    reg_org_experience: {
      type: String,
      default: "",
    },
    reg_reason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Index for quick lookups during scanning
eventRegistrantSchema.index({ attendance_token: 1 });
// Prevent duplicate registration
eventRegistrantSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("EventRegistrant", eventRegistrantSchema);
