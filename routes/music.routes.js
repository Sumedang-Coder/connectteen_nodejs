const express = require("express");
const router = express.Router();
const musicController = require("../controllers/music.controller");

/**
 * @swagger
 * tags:
 *   name: Music
 *   description: Music search and Spotify integration
 */

/**
 * @swagger
 * /api/music:
 *   get:
 *     summary: Search for music on Spotify
 *     tags: [Music]
 *     parameters:
 *       - in: query
 *         name: search
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for tracks
 *     responses:
 *       200:
 *         description: List of tracks retrieved successfully
 *       400:
 *         description: Query parameter 'search' is required
 */
router.get("/music", musicController.searchMusic);

module.exports = router;
