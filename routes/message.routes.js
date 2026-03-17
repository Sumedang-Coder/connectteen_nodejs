const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getMessagesHistory,
  getOneMessage,
  getMessages,
  getSecretMessages,
  addReaction,
  deleteMessage,
} = require("../controllers/message.controller");
const { authMiddleware, contentManager, anyAdmin, optionalAuth } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: User messages and secret messages
 */

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send a new message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string }
 *               is_secret: { type: boolean, default: false }
 *     responses:
 *       201:
 *         description: Message sent successfully
 */
router.post("/messages", authMiddleware, sendMessage);

/**
 * @swagger
 * /api/messages:
 *   get:
 *     summary: Get all public messages
 *     tags: [Messages]
 *     responses:
 *       200:
 *         description: List of messages retrieved successfully
 */
router.get("/messages", getMessages);

/**
 * @swagger
 * /api/messages/secret:
 *   get:
 *     summary: Get all secret messages
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     description: Requires authentication and any admin role.
 *     responses:
 *       200:
 *         description: List of secret messages retrieved successfully
 */
router.get("/messages/secret", authMiddleware, anyAdmin, getSecretMessages);

/**
 * @swagger
 * /api/messages/me:
 *   get:
 *     summary: Get own message history
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Message history retrieved successfully
 */
router.get("/messages/me", authMiddleware, getMessagesHistory);

/**
 * @swagger
 * /api/messages/{id}:
 *   get:
 *     summary: Get a single message by ID
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Message retrieved successfully
 *       404:
 *         description: Message not found
 */
router.get("/messages/:id", optionalAuth, getOneMessage);

/**
 * @swagger
 * /api/messages/{id}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     description: Requires authentication and content manager role.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *       404:
 *         description: Message not found
 */
router.delete("/messages/:id", authMiddleware, deleteMessage);

const { addComment, getComments, addReply } = require("../controllers/comment.controller");

// ... existing routes ...

/**
 * @swagger
 * /api/messages/{id}/react:
 *   post:
 *     summary: Add a reaction to a message
 *     tags: [Messages]
 */
router.post("/messages/:id/react", authMiddleware, addReaction);

/**
 * @swagger
 * /api/messages/{id}/comments:
 *   post:
 *     summary: Add a comment to a message
 *     tags: [Messages]
 */
router.post("/messages/:id/comments", authMiddleware, addComment);

/**
 * @swagger
 * /api/messages/{id}/comments:
 *   get:
 *     summary: Get all comments for a message
 *     tags: [Messages]
 */
router.get("/messages/:id/comments", getComments);

/**
 * @swagger
 * /api/comments/{commentId}/reply:
 *   post:
 *     summary: Add a reply to a comment
 *     tags: [Messages]
 */
router.post("/comments/:commentId/reply", authMiddleware, addReply);

module.exports = router;
