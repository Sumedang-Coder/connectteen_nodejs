const express = require("express");
const router = express.Router();
const articleController = require("../controllers/article.controller");
const { authMiddleware, contentManager, optionalAuth } = require("../middleware/auth");

const upload = require("../helpers/cloudinaryConfig");

/**
 * @swagger
 * tags:
 *   name: Articles
 *   description: Article management
 */

/**
 * @swagger
 * /api/articles:
 *   post:
 *     summary: Create a new article
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     description: Requires authentication and content manager role.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Article created successfully
 *       400:
 *         description: Image is required
 *       500:
 *         description: Server error
 */
router.post(
  "/articles",
  authMiddleware,
  contentManager,
  upload.single("image"),
  articleController.createArticle
);

/**
 * @swagger
 * /api/articles:
 *   get:
 *     summary: Get all articles
 *     tags: [Articles]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title or description
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: -createdAt
 *         description: Sort field and order
 *     responses:
 *       200:
 *         description: Articles retrieved successfully
 *       500:
 *         description: Server error
 */
router.get(
  "/articles",
  articleController.getAllArticles
);

/**
 * @swagger
 * /api/articles/{id}:
 *   get:
 *     summary: Get article by ID
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Article ID
 *     responses:
 *       200:
 *         description: Article retrieved successfully
 *       404:
 *         description: Article not found
 *       500:
 *         description: Server error
 */
router.get(
  "/articles/:id",
  optionalAuth,
  articleController.getArticleById
);

/**
 * @swagger
 * /api/articles/{id}:
 *   put:
 *     summary: Update an article
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     description: Requires authentication and content manager role.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Article ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Article updated successfully
 *       404:
 *         description: Article not found
 *       500:
 *         description: Server error
 */
router.put(
  "/articles/:id",
  authMiddleware,
  contentManager,
  upload.single("image"),
  articleController.updateArticle
);

/**
 * @swagger
 * /api/articles/{id}:
 *   delete:
 *     summary: Delete an article
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     description: Requires authentication and content manager role.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Article ID
 *     responses:
 *       200:
 *         description: Article deleted successfully
 *       404:
 *         description: Article not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/articles/:id",
  authMiddleware,
  contentManager,
  articleController.deleteArticle
);

router.post("/articles/:id/react", authMiddleware, articleController.addArticleReaction);
router.get("/articles/:id/comments", articleController.getArticleComments);
router.post("/articles/:id/comments", optionalAuth, articleController.addArticleComment);

module.exports = router;