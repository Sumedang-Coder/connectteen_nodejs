const Comment = require("../models/Comment");
const User = require("../models/User");

exports.addComment = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { name, message } = req.body;

    let commentName = name ? name.trim() : "Anonymous";
    let commentAvatar = null;
    
    if (req.user) {
      const user = await User.findById(req.user.id);
      if (user) {
        commentName = user.name || user.anonymous_name || "User";
        commentAvatar = user.avatarUrl;
      }
    }

    const commentMessage = message.trim();
    if (!commentMessage) {
      return res.status(400).json({ success: false, message: "Pesan wajib diisi" });
    }

    const newComment = await Comment.create({
      targetId: messageId,
      targetType: "Message",
      messageId,
      name: commentName,
      avatarUrl: commentAvatar,
      message: commentMessage,
    });

    res.status(201).json({
      success: true,
      data: newComment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getComments = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const comments = await Comment.find({ targetId: messageId, targetType: "Message" }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addReply = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { name, message } = req.body;

    let replyName = name ? name.trim() : "Anonymous";
    let replyAvatar = null;
    
    if (req.user) {
      const user = await User.findById(req.user.id);
      if (user) {
        replyName = user.name || user.anonymous_name || "User";
        replyAvatar = user.avatarUrl;
      }
    }

    const replyMessage = message.trim();
    if (!replyMessage) {
      return res.status(400).json({ success: false, message: "Pesan balasan wajib diisi" });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Komentar tidak ditemukan" });
    }

    comment.replies.push({ name: replyName, avatarUrl: replyAvatar, message: replyMessage });
    await comment.save();

    res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
