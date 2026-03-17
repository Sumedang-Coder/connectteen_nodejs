const jwt = require("jsonwebtoken");

/* =========================
   AUTHENTICATION
========================= */
const optionalAuth = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return next();

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    req.user = null;
  }

  next();
};

const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token tidak ditemukan",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user to check status (active/suspended)
    const user = await User.findById(decoded.id).select("role status");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Akun Anda telah ditangguhkan. Silakan hubungi Super Admin.",
      });
    }

    req.user = {
      id: user._id,
      role: user.role,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token tidak valid atau kadaluarsa",
    });
  }
};

/* =========================
   AUTHORIZATION
========================= */

const ADMIN_ROLES = ["super_admin", "content_editor", "viewer"];

const anyAdmin = (req, res, next) => {
  if (!req.user || !ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Akses ditolak. Admin access required.",
    });
  }

  // Implicitly, we should check status here if we fetch the whole user from DB,
  // but for token-based simple check, we assume token is valid. 
  // For high-security, we'd check DB status: active.

  return next();
};

const contentManager = (req, res, next) => {
  if (!req.user || !["super_admin", "content_editor"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Akses ditolak. Permission to modify content required.",
    });
  }
  return next();
};

const superAdminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "super_admin") {
    return res.status(403).json({
      success: false,
      message: "Akses ditolak. Super Admin only.",
    });
  }
  return next();
};

// Legacy support if needed, or replace
const adminOnly = anyAdmin;

module.exports = {
  authMiddleware,
  adminOnly,
  anyAdmin,
  contentManager,
  superAdminOnly,
  optionalAuth
};
