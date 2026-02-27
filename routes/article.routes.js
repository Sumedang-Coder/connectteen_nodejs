const express = require("express");
const router = express.Router();
const articleController = require("../controllers/article.controller");
const { authMiddleware, contentManager } = require("../middleware/auth");

const upload = require("../helpers/cloudinaryConfig");

router.post(
  "/articles",
  authMiddleware,
  contentManager,
  upload.single("image"),
  articleController.createArticle
);

router.get(
  "/articles",
  articleController.getAllArticles
);

router.get(
  "/articles/:id",
  articleController.getArticleById
);

router.put(
  "/articles/:id",
  authMiddleware,
  contentManager,
  upload.single("image"),
  articleController.updateArticle
);

router.delete(
  "/articles/:id",
  authMiddleware,
  contentManager,
  articleController.deleteArticle
);

module.exports = router;