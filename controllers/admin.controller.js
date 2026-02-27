const User = require("../models/User");
const Article = require("../models/Article");
const Event = require("../models/Event");
const Message = require("../models/Message");
const bcrypt = require("bcryptjs");
const { generateAnonymousName } = require("../helpers/generateAnonymousName");
const { sanitizeUser, sanitizeUsers } = require("../helpers/auth");
const crypto = require("crypto");

const getAdmin = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      role: {
        $in: ["super_admin", "content_editor", "viewer"]
      }
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / parseInt(limit));

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const currentPage = parseInt(page);
    const hasNextPage = currentPage < totalPages;

    res.status(200).json({
      success: true,
      data: sanitizeUsers(users),
      pagination: {
        totalUsers,
        totalPages,
        currentPage,
        limit: parseInt(limit),
        hasNextPage,
        nextPage: hasNextPage ? currentPage + 1 : null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const registerAdminOnly = async (req, res) => {
  try {
    const { name, email, password, role = "content_editor" } = req.body;

    // Safety check: Only super_admin can create other super_admins
    if (role === "super_admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ success: false, message: "Hanya Super Admin yang bisa membuat Super Admin lain" });
    }

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email dan password wajib diisi" });
    }

    if (await User.findOne({ email })) {
      return res
        .status(409)
        .json({ success: false, message: "Email sudah terdaftar" });
    }

    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role,
      status: "active",
      anonymous_name: await generateAnonymousName(),
    });

    return res.status(201).json({
      success: true,
      message: "Admin berhasil dibuat",
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("[REGISTER_ADMIN]", error);
    return res
      .status(500)
      .json({ success: false, message: "Kesalahan server" });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, status } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Admin tidak ditemukan atau Anda tidak memiliki akses",
      });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    // Only super_admin can change roles or status
    if (req.user.role === "super_admin") {
      if (role) user.role = role;
      if (status) user.status = status;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Data admin berhasil diperbarui",
      data: sanitizeUser(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Admin tidak ditemukan" });
    }

    // Protection: Cannot delete super_admin unless you are also super_admin (and maybe not even then if it's the last one)
    if (targetUser.role === "super_admin") {
      return res.status(403).json({ success: false, message: "Super Admin tidak dapat dihapus secara langsung" });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Admin berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getStats = async (req, res) => {
  try {
    const [messageCount, eventCount, userCount, articleCount] = await Promise.all([
      Message.countDocuments(),
      Event.countDocuments(),
      User.countDocuments(),
      Article.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        messages: messageCount,
        events: eventCount,
        users: userCount,
        articles: articleCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const inviteAdmin = async (req, res) => {
  try {
    const { email, role = "content_editor" } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email wajib diisi" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Email sudah terdaftar" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      email,
      role,
      status: "invited",
      invitationToken: token,
      invitationExpires: expires,
      anonymous_name: await generateAnonymousName(), // Temporary
    });

    // In production, send email here. For now, return token.
    res.status(201).json({
      success: true,
      message: "Undangan admin berhasil dibuat",
      data: {
        email: user.email,
        role: user.role,
        invitationToken: token,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const validateInvite = async (req, res) => {
  try {
    const { token } = req.query;

    const user = await User.findOne({
      invitationToken: token,
      invitationExpires: { $gt: Date.now() },
      status: "invited",
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Token tidak valid atau sudah kadaluarsa" });
    }

    res.status(200).json({
      success: true,
      message: "Token valid",
      data: { email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const joinAdmin = async (req, res) => {
  try {
    const { token, name, password } = req.body;

    if (!token || !name || !password) {
      return res.status(400).json({ success: false, message: "Data tidak lengkap" });
    }

    const user = await User.findOne({
      invitationToken: token,
      invitationExpires: { $gt: Date.now() },
      status: "invited",
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Undangan tidak valid" });
    }

    user.name = name;
    user.password = await bcrypt.hash(password, 10);
    user.status = "active";
    user.invitationToken = undefined;
    user.invitationExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Akun admin berhasil diaktifkan. Silakan login.",
      data: sanitizeUser(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAdmin,
  registerAdminOnly,
  updateAdmin,
  deleteAdmin,
  getStats,
  inviteAdmin,
  validateInvite,
  joinAdmin
};

