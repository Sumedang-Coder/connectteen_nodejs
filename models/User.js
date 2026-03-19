const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },

    anonymous_name: {
      type: String,
    },

    guestId: {
      type: String,
      unique: true,
      sparse: true,
    },

    no_hp: {
      type: String,
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
    },

    password: {
      type: String,
    },

    role: {
      type: String,
      enum: ["super_admin", "content_editor", "viewer", "user", "guest"],
      default: "guest",
    },

    status: {
      type: String,
      enum: ["active", "suspended", "invited"],
      default: "active",
    },

    invitationToken: {
      type: String,
      sparse: true,
    },

    invitationExpires: {
      type: Date,
    },

    lastLogin: {
      type: Date,
    },

    avatarUrl: {
      type: String,
    },
    cloudinary_id: {
      type: String,
    },

    isGuest: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    verificationOTP: {
      type: String,
    },
    verificationExpires: {
      type: Date,
    },
    lastResentAt: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ guestId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("User", userSchema);
