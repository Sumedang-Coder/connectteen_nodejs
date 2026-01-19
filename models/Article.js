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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Article", articleSchema);