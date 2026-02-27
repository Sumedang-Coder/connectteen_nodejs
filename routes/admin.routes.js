const express = require("express");
const {
  authMiddleware,
  adminOnly,
} = require("../middleware/auth");
const { getAdmin, registerAdminOnly, updateAdmin, deleteAdmin, getStats } = require("../controllers/admin.controller");

const router = express.Router();

router.get("/admin", authMiddleware, adminOnly, getAdmin);
router.get("/admin/stats", authMiddleware, adminOnly, getStats);
router.post("/admin", authMiddleware, adminOnly, registerAdminOnly);
router.put("/admin/:id", authMiddleware, adminOnly, updateAdmin);
router.delete("/admin/:id", authMiddleware, adminOnly, deleteAdmin);

module.exports = router;
