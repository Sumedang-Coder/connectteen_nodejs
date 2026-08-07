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
    time: {
      type: String,
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
    is_online: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String,
      default: "",
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
    registration_fields: {
      reg_name: { type: Boolean, default: true },
      reg_phone: { type: Boolean, default: true },
      reg_address: { type: Boolean, default: true },
      reg_occupation: { type: Boolean, default: true },
      reg_org_experience: { type: Boolean, default: true },
      reg_reason: { type: Boolean, default: true },
      reg_transfer_proof: { type: Boolean, default: false },
    },
    transfer_info: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
