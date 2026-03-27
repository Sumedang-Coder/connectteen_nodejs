const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  googleSignIn,
  googleSignInCallback,
  loginAdmin,
  getAuthenticated,
  guestLogin,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  updateMe,
} = require("../controllers/auth.controller");
const {
  authMiddleware,
  adminOnly,
  optionalAuth,
} = require("../middleware/auth");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { success: false, message: "Terlalu banyak percobaan login, silakan coba lagi setelah 15 menit." },
  standardHeaders: true,
  legacyHeaders: false,
});

const guestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: { success: false, message: "Terlalu banyak permintaan login tamu, silakan coba lagi nanti." },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, message: "Terlalu banyak percobaan request password, silakan coba kembali setelah 15 menit." },
  standardHeaders: true,
  legacyHeaders: false,
});

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
router.post("/admin/login", loginLimiter, loginAdmin);

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
router.post("/guest/login", guestLimiter, guestLogin);

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
 * /api/auth/me:
 *   put:
 *     summary: Update currently authenticated user profile
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               no_hp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: User not found
 */
router.put("/me", authMiddleware, updateMe);

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

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify user email with OTP code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully, user logged in
 *       400:
 *         description: Invalid OTP or expired
 *       500:
 *         description: Server error
 */
router.post("/verify-email", verifyEmail);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend verification OTP code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification code resent
 *       400:
 *         description: Email already verified or invalid
 *       429:
 *         description: Too many requests (cooldown active)
 *       500:
 *         description: Server error
 */
router.post("/resend-verification", resendVerification);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset code sent successfully
 *       404:
 *         description: Email not found
 *       429:
 *         description: Cooldown active
 */
router.post("/forgot-password", passwordLimiter, forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid OTP or expired
 */
router.post("/reset-password", passwordLimiter, resetPassword);

module.exports = router;
