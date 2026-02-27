const { sanitizeArticle, sanitizeArticles } = require("../helpers/utils");
const Article = require("../models/Article");
const cloudinary = require('cloudinary').v2;

// CREATE artikel
exports.createArticle = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Harap unggah gambar" });
    }

    const article = new Article({
      image_url: req.file.path,
      cloudinary_id: req.file.filename,
      title,
      description,
    });

    await article.save();

    res.status(201).json({
      message: "Article created successfully",
      data: sanitizeArticle(article),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
  }
};

// READ artikel by ID
exports.getArticleById = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    res.status(200).json({
      message: "Article retrieved successfully",
      data: sanitizeArticle(article),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE artikel
exports.updateArticle = async (req, res) => {
  try {
    let article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ message: "Article not found" });

    let data = {
      title: req.body.title || article.title,
      description: req.body.description || article.description,
    };

    if (req.file) {
      await cloudinary.uploader.destroy(article.cloudinary_id);

      data.image_url = req.file.path;
      data.cloudinary_id = req.file.filename;
    }

    article = await Article.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      message: "Article updated successfully",
      data: sanitizeArticle(article),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE artikel
exports.deleteArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    await cloudinary.uploader.destroy(article.cloudinary_id);

    await article.deleteOne();

    res.status(200).json({
      message: "Article and associated image deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
