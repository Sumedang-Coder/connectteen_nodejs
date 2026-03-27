const express = require("express");
const router = express.Router();
const { addComment, getComments, addReply, deleteComment, deleteReply } = require("../controllers/comment.controller");
const { getArticleComments, addArticleComment } = require("../controllers/article.controller");
const { authMiddleware } = require("../middleware/auth");

// Message Comments
router.post("/messages/:id/comments", authMiddleware, addComment);
router.get("/messages/:id/comments", getComments);

// Article Comments
router.get("/articles/:id/comments", getArticleComments);
router.post("/articles/:id/comments", authMiddleware, addArticleComment);

// Standalone Comment & Reply Actions
router.post("/comments/:commentId/reply", authMiddleware, addReply);
router.delete("/comments/:commentId", authMiddleware, deleteComment);
router.delete("/comments/:commentId/reply/:replyId", authMiddleware, deleteReply);

module.exports = router;
