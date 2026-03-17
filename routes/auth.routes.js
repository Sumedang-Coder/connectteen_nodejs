const express = require("express");
const {
  googleSignIn,
  googleSignInCallback,
  loginAdmin,
  getAuthenticated,
  guestLogin,
  logout,
} = require("../controllers/auth.controller");
const {
  authMiddleware,
  adminOnly,
  optionalAuth,
} = require("../middleware/auth");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and Authorization
 */

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google Sign-In
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirects to Google's OAuth 2.0 consent page
 */
router.get("/google", googleSignIn);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth 2.0 callback
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: The authorization code returned by Google
 *     responses:
 *       302:
 *         description: Redirects to the client application on success
 *       400:
 *         description: Authorization code not found or invalid
 */
router.get("/google/callback", optionalAuth, googleSignInCallback);

/**
 * @swagger
 * /api/auth/admin/login:
 *   post:
 *     summary: Admin login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Email and password are required
 *       401:
 *         description: Invalid email or password
 *       403:
 *         description: Account suspended or not activated
 */
router.post("/admin/login", loginAdmin);

/**
 * @swagger
 * /api/auth/guest/login:
 *   post:
 *     summary: Login as a guest
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Guest login successful
 *       500:
 *         description: Guest login failed
 */
router.post("/guest/login", guestLogin);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get currently authenticated user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Successfully retrieved user data
 *       401:
 *         description: Not authenticated or token invalid
 */
router.get("/me", getAuthenticated);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout the current user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post("/logout", logout);

module.exports = router;
