const express = require("express");
const router = express.Router();
const eventController = require("../controllers/event.controller");
const { authMiddleware, contentManager, anyAdmin, optionalAuth } = require("../middleware/auth");
const upload = require("../helpers/cloudinaryConfig");

// admin
/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management
 */

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
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
 *               event_title:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *               description:
 *                 type: string
 *               quota:
 *                 type: integer
 *               visibility:
 *                 type: string
 *                 enum: [public, private]
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Event created successfully
 *       400:
 *         description: Missing required fields or image
 *       500:
 *         description: Server error
 */
router.post("/events", authMiddleware, contentManager, upload.single("image"), eventController.createEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     description: Requires authentication and content manager role.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event and image deleted successfully
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/events/:id",
  authMiddleware,
  contentManager,
  eventController.deleteEvent
);

/**
 * @swagger
 * /api/events/{id}/registrants:
 *   get:
 *     summary: Get registrants for an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     description: Requires authentication and admin role.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Registrants retrieved successfully
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.get(
  "/events/:id/registrants",
  authMiddleware,
  anyAdmin,
  eventController.getRegistrants
);

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     summary: Update an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     description: Requires authentication and content manager role.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               event_title:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *               description:
 *                 type: string
 *               quota:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [open, closed]
 *               visibility:
 *                 type: string
 *                 enum: [public, private]
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.put(
  "/events/:id",
  authMiddleware,
  contentManager,
  upload.single("image"),
  eventController.updateEvent
);

// public / user
/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get all events
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title or location
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: -createdAt
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 *       500:
 *         description: Server error
 */
router.get("/events", optionalAuth, eventController.getEvents);

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event retrieved successfully
 *       403:
 *         description: Access denied for private event
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.get("/events/:id", optionalAuth, eventController.getEventById);

/**
 * @swagger
 * /api/events/{id}/register:
 *   post:
 *     summary: Register or unregister for an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     description: Toggles registration for the authenticated user.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Registration toggled successfully
 *       400:
 *         description: Event closed or quota full
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.post(
  "/events/:id/register",
  authMiddleware,
  eventController.registerEvent
);

module.exports = router;
