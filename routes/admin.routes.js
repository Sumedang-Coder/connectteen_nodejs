const express = require("express");
const {
  authMiddleware,
  anyAdmin,
  superAdminOnly
} = require("../middleware/auth");
const {
  getAdmin,
  registerAdminOnly,
  updateAdmin,
  deleteAdmin,
  getStats,
  inviteAdmin,
  validateInvite,
  joinAdmin,
  inviteRedirect
} = require("../controllers/admin.controller");
const upload = require("../helpers/cloudinaryConfig");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management and Invitation system
 */

/**
 * @swagger
 * /api/admin:
 *   get:
 *     summary: Get all admins
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Requires authentication and super admin role.
 *     responses:
 *       200:
 *         description: List of admins retrieved successfully
 *       403:
 *         description: Access denied
 */
router.get("/admin", authMiddleware, anyAdmin, getAdmin);

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get platform statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Requires authentication and any admin role.
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get("/admin/stats", authMiddleware, anyAdmin, getStats);

/**
 * @swagger
 * /api/admin:
 *   post:
 *     summary: Register a new admin (Super Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Directly create a new admin. Requires super admin role.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               role: { type: string, enum: ["super_admin", "content_editor", "viewer"] }
 *     responses:
 *       201:
 *         description: Admin created successfully
 */
router.post("/admin", authMiddleware, superAdminOnly, registerAdminOnly);

/**
 * @swagger
 * /api/admin/{id}:
 *   put:
 *     summary: Update an admin
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               role: { type: string }
 *               status: { type: string, enum: [active, suspended] }
 *     responses:
 *       200:
 *         description: Admin updated successfully
 */
router.put("/admin/:id", authMiddleware, anyAdmin, upload.single("image"), updateAdmin);

/**
 * @swagger
 * /api/admin/{id}:
 *   delete:
 *     summary: Delete an admin
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Requires super admin role.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Admin deleted successfully
 */
router.delete("/admin/:id", authMiddleware, superAdminOnly, deleteAdmin);

/**
 * @swagger
 * /api/admin/invite-redirect:
 *   get:
 *     summary: Redirect to external browser for invitation
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       302:
 *         description: Redirects to external browser
 */
router.get("/admin/invite-redirect", inviteRedirect);

/**
 * @swagger
 * /api/admin/invite:
 *   post:
 *     summary: Invite a new admin via email
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Sends an invitation email. Requires super admin role.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, role]
 *             properties:
 *               email: { type: string }
 *               role: { type: string, enum: ["super_admin", "content_editor", "viewer"] }
 *     responses:
 *       200:
 *         description: Invitation sent successfully
 */
router.post("/admin/invite", authMiddleware, superAdminOnly, inviteAdmin);

/**
 * @swagger
 * /api/admin/validate-invite:
 *   get:
 *     summary: Validate an invitation token
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Token is valid
 *       400:
 *         description: Token invalid or expired
 */
router.get("/admin/validate-invite", validateInvite);

/**
 * @swagger
 * /api/admin/join:
 *   post:
 *     summary: Complete admin registration from invitation
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, name, password]
 *             properties:
 *               token: { type: string }
 *               name: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Registration complete
 */
router.post("/admin/join", joinAdmin);

module.exports = router;
