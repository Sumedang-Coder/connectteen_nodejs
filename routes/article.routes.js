const express = require("express");
const router = express.Router();
const articleController = require("../controllers/article.controller");
const { authMiddleware, adminOnly } = require("../middleware/auth");

const upload = require("../helpers/cloudinaryConfig"); 

router.post(
  "/articles",
  authMiddleware,
  adminOnly,
  upload.single("image"),
  articleController.createArticle
);

router.get(
  "/articles",
  authMiddleware,
  adminOnly,
  articleController.getAllArticles
);

router.get(
  "/articles/:id",
  authMiddleware,
  adminOnly,
  articleController.getArticleById
);

router.put(
  "/articles/:id",
  authMiddleware,
  adminOnly,
  upload.single("image"),
  articleController.updateArticle
);

router.delete(
  "/articles/:id",
  authMiddleware,
  adminOnly,
  articleController.deleteArticle
);

module.exports = router;