const { sanitizeMessage, sanitizeMessages } = require("../helpers/utils");
const Message = require("../models/Message");

exports.sendMessage = async (req, res) => {
  try {
    const { recipient_name, message, song_id, song_image, song_artist, song_name } =
      req.body;

    if (
      !recipient_name ||
      !message ||
      !song_id ||
      !song_image ||
      !song_artist ||
      !song_name
    ) {
      return res.status(400).json({
        success: false,
        message: "Semua field wajib diisi",
      });
    }

    const newMessage = await Message.create({
      recipient_name,
      message,
      song_id,
      song_image,
      song_artist,
      song_name,
      user: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: sanitizeMessage(newMessage),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, sort = "-createdAt" } = req.query;

    const query = {
      recipient_name: { $nin: [/admin/i] }
    };

    // Search within public messages
    if (search) {
      query.$or = [
        { message: { $regex: search, $options: "i" } },
      ];
    }

    const totalMessages = await Message.countDocuments(query);
    const totalPages = Math.ceil(totalMessages / limit);

    const messages = await Message.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const currentPage = parseInt(page);
    const hasNextPage = currentPage < totalPages;

    res.status(200).json({
      success: true,
      message: "Messages retrieved successfully",
      data: sanitizeMessages(messages),
      pagination: {
        totalMessages,
        totalPages,
        currentPage,
        limit: parseInt(limit),
        hasNextPage,
        nextPage: hasNextPage ? currentPage + 1 : null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getSecretMessages = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, sort = "-createdAt" } = req.query;

    const query = {
      recipient_name: { $regex: "^admin$", $options: "i" }
    };

    if (search) {
      query.$or = [{ message: { $regex: search, $options: "i" } }];
    }

    const totalMessages = await Message.countDocuments(query);
    const totalPages = Math.ceil(totalMessages / limit);

    const messages = await Message.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const currentPage = parseInt(page);
    const hasNextPage = currentPage < totalPages;

    res.status(200).json({
      success: true,
      data: sanitizeMessages(messages),
      pagination: {
        totalMessages,
        totalPages,
        currentPage,
        limit: parseInt(limit),
        hasNextPage,
        nextPage: hasNextPage ? currentPage + 1 : null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMessagesHistory = async (req, res) => {
  try {
    const messages = await Message.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    res.status(200).json({
      success: true,
      data: sanitizeMessages(messages),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const mongoose = require("mongoose");

exports.getOneMessage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Message tidak ditemukan",
      });
    }

    const ADMIN_ROLES = ["super_admin", "content_editor", "viewer", "user"];
    const isAdmin = req.user && ADMIN_ROLES.includes(req.user.role);

    const query = { _id: id };
    if (!isAdmin) {
      // Non-admins can only see public messages
      query.recipient_name = { $nin: [/admin/i] };
    }

    const message = await Message.findOne(query);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message tidak ditemukan",
      });
    }

    res.status(200).json({
      success: true,
      data: sanitizeMessage(message),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Format ID tidak valid",
      });
    }

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message tidak ditemukan",
      });
    }

    await Message.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Message berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};