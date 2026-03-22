const mongoose = require("mongoose");
const { sanitizeArticle, sanitizeArticles } = require("../helpers/utils");
const Article = require("../models/Article");
const Reaction = require("../models/Reaction");
const Comment = require("../models/Comment");
const User = require("../models/User");
const cloudinary = require('cloudinary').v2;
const sanitizeHtml = require('sanitize-html');

// CREATE artikel
exports.createArticle = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Judul wajib diisi" });
    }
    if (title.length > 200) {
      return res.status(400).json({ success: false, message: "Judul maksimal 200 karakter" });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: "Konten artikel wajib diisi" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Harap unggah gambar" });
    }

    // Sanitize description HTML from Tiptap
    const cleanDescription = sanitizeHtml(description, {
      allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'img'],
      allowedAttributes: { 'img': ['src', 'alt'] }
    });

    const article = new Article({
      image_url: req.file.path,
      cloudinary_id: req.file.filename,
      title: title.trim(),
      description: cleanDescription,
    });

    await article.save();

    res.status(201).json({
      success: true,
      message: "Article created successfully",
      data: sanitizeArticle(article),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// READ semua artikel dengan search, pagination, dan sort
exports.getAllArticles = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, sort = "-createdAt" } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const totalArticles = await Article.countDocuments(query);
    const totalPages = Math.ceil(totalArticles / limit);

    const articles = await Article.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    const currentPage = parseInt(page);
    const hasNextPage = currentPage < totalPages;

    res.status(200).json({
      success: true,
      message: "Articles retrieved successfully",
      data: sanitizeArticles(articles),
      pagination: {
        totalArticles,
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

// READ artikel by ID
exports.getArticleById = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    const userReaction = req.user
      ? await Reaction.findOne({ userId: req.user.id, targetId: req.params.id, targetType: "Article" })
      : null;

    res.status(200).json({
      success: true,
      message: "Article retrieved successfully",
      data: {
        ...sanitizeArticle(article),
        userReaction: userReaction ? userReaction.type : null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE artikel
exports.updateArticle = async (req, res) => {
  try {
    let article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: "Article not found" });

    if (req.body.title !== undefined && !req.body.title.trim()) {
      return res.status(400).json({ success: false, message: "Judul artikel tidak boleh kosong" });
    }
    if (req.body.description !== undefined && !req.body.description.trim() && req.body.description !== "<p></p>") {
      return res.status(400).json({ success: false, message: "Konten artikel tidak boleh kosong" });
    }

    const title = req.body.title?.trim() || article.title;
    const rawDescription = req.body.description || article.description;

    // Sanitize description if it's changing
    let cleanDescription = rawDescription;
    if (req.body.description) {
      cleanDescription = sanitizeHtml(rawDescription, {
        allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'img'],
        allowedAttributes: { 'img': ['src', 'alt'] }
      });
    }

    let data = {
      title,
      description: cleanDescription,
    };

    if (req.file) {
      // Safe Cloudinary delete
      if (article.cloudinary_id) {
        try {
          await cloudinary.uploader.destroy(article.cloudinary_id);
        } catch (err) {
          console.error('[CLOUDINARY_DELETE_FAIL]', article.cloudinary_id, err.message);
        }
      }

      data.image_url = req.file.path;
      data.cloudinary_id = req.file.filename;
    }

    article = await Article.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Article updated successfully",
      data: sanitizeArticle(article),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE artikel
exports.deleteArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({ success: false, message: "Article not found" });
    }

    // Safe Cloudinary delete
    if (article.cloudinary_id) {
      try {
        await cloudinary.uploader.destroy(article.cloudinary_id);
      } catch (err) {
        console.error('[CLOUDINARY_DELETE_FAIL]', article.cloudinary_id, err.message);
      }
    }

    // Cascade delete reactions and comments
    await Promise.all([
      Reaction.deleteMany({ targetId: req.params.id, targetType: "Article" }),
      Comment.deleteMany({ targetId: req.params.id, targetType: "Article" }),
    ]);

    await article.deleteOne();

    res.status(200).json({
      success: true,
      message: "Article and associated data deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// REACTION & COMMENT FOR ARTICLES

exports.addArticleReaction = async (req, res) => {
  try {
    const articleId = req.params.id ? req.params.id.trim() : null;
    const { type } = req.body; 
    const userId = req.user?.id;

    if (!articleId) {
      return res.status(400).json({ success: false, message: "ID Artikel wajib diisi" });
    }

    const validReactions = ["heart", "laugh", "like", "wow", "sad"];
    if (type && !validReactions.includes(type)) {
      return res.status(400).json({ success: false, message: "Tipe reaksi tidak valid" });
    }

    const existingReaction = await Reaction.findOne({ userId, targetId: articleId, targetType: "Article" });

    if (existingReaction) {
      if (!type) {
        await Reaction.findByIdAndDelete(existingReaction._id);
      } else if (existingReaction.type !== type) {
        existingReaction.type = type;
        await existingReaction.save();
      }
    } else if (type) {
      try {
        await Reaction.create({ userId, targetId: articleId, targetType: "Article", type });
      } catch (err) {
        if (err.code === 11000) {
          const raceReaction = await Reaction.findOne({ userId, targetId: articleId, targetType: "Article" });
          if (raceReaction && raceReaction.type !== type) {
            raceReaction.type = type;
            await raceReaction.save();
          }
        } else throw err;
      }
    }

    // GROUND TRUTH SYNC: Recalculate all counts for this article
    const counts = await Reaction.aggregate([
      { $match: { targetId: new mongoose.Types.ObjectId(articleId), targetType: "Article" } },
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ]);

    const newReactionCounts = { heart: 0, laugh: 0, like: 0, wow: 0, sad: 0 };
    counts.forEach(c => {
      if (newReactionCounts.hasOwnProperty(c._id)) {
        newReactionCounts[c._id] = c.count;
      }
    });

    const updatedArticle = await Article.findByIdAndUpdate(
      articleId,
      { reactions: newReactionCounts },
      { new: true }
    );

    if (!updatedArticle) {
      return res.status(404).json({ success: false, message: "Article tidak ditemukan" });
    }

    res.status(200).json({
      success: true,
      data: {
        allReactions: updatedArticle.reactions,
        userReaction: type || null
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getArticleComments = async (req, res) => {
  try {
    const { id: articleId } = req.params;
    const comments = await Comment.find({ targetId: articleId, targetType: "Article" }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addArticleComment = async (req, res) => {
  try {
    const articleId = req.params.id ? req.params.id.trim() : null;
    const { name, message } = req.body;

    if (!articleId) {
      return res.status(400).json({ success: false, message: "ID Artikel wajib diisi" });
    }

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

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Pesan wajib diisi" });
    }

    const commentMessage = message.trim();

    const newComment = await Comment.create({
      targetId: articleId,
      targetType: "Article",
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
