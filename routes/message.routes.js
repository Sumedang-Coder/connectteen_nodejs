const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getMessagesHistory,
  getOneMessage,
  getMessages,
  deleteMessage,
} = require("../controllers/message.controller");
const { authMiddleware, contentManager, anyAdmin } = require("../middleware/auth");

router.post("/messages", authMiddleware, sendMessage);
router.get("/messages", authMiddleware, anyAdmin, getMessages);
router.get("/messages/me", authMiddleware, getMessagesHistory);
router.get("/messages/:id", authMiddleware, anyAdmin, getOneMessage);
router.delete("/messages/:id", authMiddleware, contentManager, deleteMessage);

module.exports = router;
