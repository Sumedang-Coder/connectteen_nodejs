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
  joinAdmin
} = require("../controllers/admin.controller");

const router = express.Router();

router.get("/admin", authMiddleware, superAdminOnly, getAdmin);
router.get("/admin/stats", authMiddleware, anyAdmin, getStats);
router.post("/admin", authMiddleware, superAdminOnly, registerAdminOnly);
router.put("/admin/:id", authMiddleware, anyAdmin, updateAdmin);
router.delete("/admin/:id", authMiddleware, superAdminOnly, deleteAdmin);

// Invitation system
router.post("/admin/invite", authMiddleware, superAdminOnly, inviteAdmin);
router.get("/admin/validate-invite", validateInvite);
router.post("/admin/join", joinAdmin);

module.exports = router;
