const mongoose = require("mongoose");
const { sanitizeMessage, sanitizeMessages } = require("../helpers/utils");
const Message = require("../models/Message");
const Reaction = require("../models/Reaction");
const Comment = require("../models/Comment");

exports.sendMessage = async (req, res) => {
  try {
    const { recipient_name, message, song_id, song_image, song_artist, song_name, is_admin_only, is_anonymous, preview_url } =
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
      is_admin_only: is_admin_only || false,
      is_anonymous: is_anonymous !== undefined ? is_anonymous : true,
      preview_url,
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
      is_admin_only: false,
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
      .limit(Number(limit))
      .populate("user", "name anonymous_name");

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
      is_admin_only: true
    };

    if (search) {
      query.$or = [{ message: { $regex: search, $options: "i" } }];
    }

    const totalMessages = await Message.countDocuments(query);
    const totalPages = Math.ceil(totalMessages / limit);

    const messages = await Message.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("user", "name anonymous_name");

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
      .populate("user", "name email anonymous_name");

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
      // Non-admins can selectively see public messages or messages they created themselves
      query.$or = [
        { recipient_name: { $nin: [/admin/i] }, is_admin_only: false },
        { user: req.user ? req.user.id : null }
      ];
    }

    const message = await Message.findOne(query).populate("user", "name anonymous_name");

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message tidak ditemukan",
      });
    }

    const userReaction = req.user 
      ? await Reaction.findOne({ userId: req.user.id, targetId: id, targetType: "Message" })
      : null;

    res.status(200).json({
      success: true,
      data: {
        ...sanitizeMessage(message),
        userReaction: userReaction ? userReaction.type : null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.addReaction = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { type } = req.body; // Target state: "heart", etc., or null to remove
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(404).json({ success: false, message: "ID Message tidak valid" });
    }

    const validReactions = ["heart", "laugh", "like", "wow", "sad"];
    if (type && !validReactions.includes(type)) {
      return res.status(400).json({ success: false, message: "Tipe reaksi tidak valid" });
    }

    const existingReaction = await Reaction.findOne({ userId, targetId: messageId, targetType: "Message" });

    if (existingReaction) {
      if (!type) {
        // Remove reaction
        await Reaction.findByIdAndDelete(existingReaction._id);
      } else if (existingReaction.type !== type) {
        // Change type
        existingReaction.type = type;
        await existingReaction.save();
      }
    } else if (type) {
      // Add new reaction with race condition protection
      try {
        await Reaction.create({ userId, targetId: messageId, targetType: "Message", type });
      } catch (err) {
        if (err.code === 11000) {
          // Double click race: ensure the type is correct if it already exists
          const raceReaction = await Reaction.findOne({ userId, targetId: messageId, targetType: "Message" });
          if (raceReaction && raceReaction.type !== type) {
            raceReaction.type = type;
            await raceReaction.save();
          }
        } else throw err;
      }
    }

    // GROUND TRUTH SYNC: Recalculate all counts for this message from actual docs
    const counts = await Reaction.aggregate([
      { $match: { targetId: new mongoose.Types.ObjectId(messageId), targetType: "Message" } },
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ]);

    const newReactionCounts = { heart: 0, laugh: 0, like: 0, wow: 0, sad: 0 };
    counts.forEach(c => {
      if (newReactionCounts.hasOwnProperty(c._id)) {
        newReactionCounts[c._id] = c.count;
      }
    });

    // Update Message model with fresh aggregate
    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      { reactions: newReactionCounts },
      { new: true }
    );

    if (!updatedMessage) {
      return res.status(404).json({ success: false, message: "Message tidak ditemukan" });
    }

    res.status(200).json({
      success: true,
      data: {
        allReactions: updatedMessage.reactions,
        userReaction: type || null
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

    // Permission check: Owner OR Admin (super_admin, content_editor)
    const isOwner = message.user && message.user.toString() === req.user.id.toString();
    const isAdmin = ["super_admin", "content_editor"].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak. Anda tidak memiliki izin untuk menghapus pesan ini.",
      });
    }

    await Message.findByIdAndDelete(id);

    // Cascade delete associated data
    await Reaction.deleteMany({ targetId: id, targetType: "Message" });
    await Comment.deleteMany({ targetId: id, targetType: "Message" });

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