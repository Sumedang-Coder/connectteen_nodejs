const Comment = require("../models/Comment");
const User = require("../models/User");

exports.addComment = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { name, message } = req.body;

    let commentName = name ? name.trim() : "Anonymous";
    let commentAvatar = null;
    let commentUserId = null;
    
    if (req.user) {
      commentUserId = req.user.id;
      const user = await User.findById(req.user.id);
      if (user) {
        commentName = user.name || user.anonymous_name || "User";
        commentAvatar = user.avatarUrl;
      }
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: "Pesan wajib diisi" });
    }
    const commentMessage = message.trim();

    const newComment = await Comment.create({
      targetId: messageId,
      targetType: "Message",
      messageId,
      userId: commentUserId,
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
    let replyUserId = null;
    
    if (req.user) {
      replyUserId = req.user.id;
      const user = await User.findById(req.user.id);
      if (user) {
        replyName = user.name || user.anonymous_name || "User";
        replyAvatar = user.avatarUrl;
      }
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: "Pesan balasan wajib diisi" });
    }
    const replyMessage = message.trim();

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Komentar tidak ditemukan" });
    }

    comment.replies.push({ userId: replyUserId, name: replyName, avatarUrl: replyAvatar, message: replyMessage });
    await comment.save();

    res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({ success: false, message: "Komentar tidak ditemukan" });
    }

    const isOwner = comment.userId && comment.userId.toString() === req.user.id.toString();
    const isAdmin = ["super_admin", "content_editor"].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Akses ditolak. Anda tidak memiliki izin untuk menghapus komentar ini." });
    }

    await Comment.findByIdAndDelete(commentId);
    res.status(200).json({ success: true, message: "Komentar berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteReply = async (req, res) => {
  try {
    const { commentId, replyId } = req.params;
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({ success: false, message: "Komentar tidak ditemukan" });
    }

    const reply = comment.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ success: false, message: "Balasan tidak ditemukan" });
    }

    const isOwner = reply.userId && reply.userId.toString() === req.user.id.toString();
    const isAdmin = ["super_admin", "content_editor"].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Akses ditolak. Anda tidak memiliki izin untuk menghapus balasan ini." });
    }

    comment.replies.pull(replyId);
    await comment.save();

    res.status(200).json({ success: true, message: "Balasan berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
