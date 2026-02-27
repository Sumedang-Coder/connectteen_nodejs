const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getMessagesHistory,
  getOneMessage,
  getMessages,
  getSecretMessages,
  deleteMessage,
} = require("../controllers/message.controller");
const { authMiddleware, contentManager, anyAdmin, optionalAuth } = require("../middleware/auth");

router.post("/messages", authMiddleware, sendMessage);
router.get("/messages", getMessages);
router.get("/messages/secret", authMiddleware, anyAdmin, getSecretMessages);
router.get("/messages/me", authMiddleware, getMessagesHistory);
router.get("/messages/:id", optionalAuth, getOneMessage);
router.delete("/messages/:id", authMiddleware, contentManager, deleteMessage);

module.exports = router;
