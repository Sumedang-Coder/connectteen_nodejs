const express = require("express");
const router = express.Router();
const eventController = require("../controllers/event.controller");
const { authMiddleware, contentManager, anyAdmin, optionalAuth } = require("../middleware/auth");
const upload = require("../helpers/cloudinaryConfig");

// admin
router.post("/events", authMiddleware, contentManager, upload.single("image"), eventController.createEvent);
router.delete(
  "/events/:id",
  authMiddleware,
  contentManager,
  eventController.deleteEvent
);
router.get(
  "/events/:id/registrants",
  authMiddleware,
  anyAdmin,
  eventController.getRegistrants
);
router.put(
  "/events/:id",
  authMiddleware,
  contentManager,
  upload.single("image"),
  eventController.updateEvent
);

// public / user
router.get("/events", optionalAuth, eventController.getEvents);
router.get("/events/:id", optionalAuth, eventController.getEventById);
router.post(
  "/events/:id/register",
  authMiddleware,
  eventController.registerEvent
);

module.exports = router;
