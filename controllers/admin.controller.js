const User = require("../models/User");
const Article = require("../models/Article");
const Event = require("../models/Event");
const Message = require("../models/Message");
const bcrypt = require("bcryptjs");
const { generateAnonymousName } = require("../helpers/generateAnonymousName");
const { sanitizeUser, sanitizeUsers } = require("../helpers/auth");
const crypto = require("crypto");
const cloudinary = require('cloudinary').v2;

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

    const isSelf = id === req.user.id;

    if (req.user.role === "viewer" && !isSelf) {
      return res.status(403).json({ success: false, message: "Viewer hanya dapat mengedit profilnya sendiri" });
    }

    if (name) user.name = name;

    // 🛡️ Admin cannot change their own email (must be via super admin or system)
    if (email && !isSelf) {
      user.email = email;
    } else if (email && isSelf) {
      return res.status(400).json({ success: false, message: "Email admin tidak dapat diubah secara mandiri." });
    }

    // 🛡️ Direct password change is disabled for self, must use forgot-password flow
    if (password && !isSelf) {
      user.password = await bcrypt.hash(password, 10);
    } else if (password && isSelf) {
      return res.status(400).json({ success: false, message: "Gunakan fitur reset password via email untuk mengubah kata sandi." });
    }

    if (req.file) {
      // Safe Cloudinary delete for old avatar
      if (user.cloudinary_id) {
        try {
          await cloudinary.uploader.destroy(user.cloudinary_id);
        } catch (err) {
          console.error('[CLOUDINARY_DELETE_FAIL]', user.cloudinary_id, err.message);
        }
      }

      user.avatarUrl = req.file.path;
      user.cloudinary_id = req.file.filename;
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

    // 1. Prevent self-deletion
    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: "Anda tidak dapat menghapus akun Anda sendiri" });
    }

    // 2. Protection for super_admin
    if (targetUser.role === "super_admin") {
      // Only super_admin can delete other super_admins (middleware already checks this, but extra safety)
      if (req.user.role !== "super_admin") {
        return res.status(403).json({ success: false, message: "Hanya Super Admin yang dapat menghapus Super Admin lain" });
      }

      // Check if this is the last super_admin
      const superAdminCount = await User.countDocuments({ role: "super_admin" });
      if (superAdminCount <= 1) {
        return res.status(400).json({ success: false, message: "Tidak dapat menghapus Super Admin terakhir di sistem" });
      }
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

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      email,
      role,
      status: "invited",
      invitationToken: hashedToken,
      invitationExpires: expires,
      anonymous_name: await generateAnonymousName(), // Temporary
    });

    const joinUrl = `${process.env.CLIENT_URL}/join-admin?token=${rawToken}`;
    const emailResult = await require("../helpers/emailService").sendAdminInvitationEmail(email, role, joinUrl);

    if (!emailResult.success) {
      return res.status(201).json({
        success: true,
        message: "Undangan dibuat, tetapi gagal mengirim email.",
        data: { invitationToken: rawToken, emailSent: false }
      });
    }

    res.status(201).json({
      success: true,
      message: "Undangan admin berhasil dikirim ke email " + email,
      data: { invitationToken: rawToken, emailSent: true }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const validateInvite = async (req, res) => {
  try {
    const { token } = req.query;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      invitationToken: hashedToken,
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

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password minimal 8 karakter" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      invitationToken: hashedToken,
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

const inviteRedirect = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Token is required");

    const userAgent = req.headers["user-agent"] || "";
    const isAndroid = /Android/i.test(userAgent);

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const destinationUrl = `${clientUrl}/join-admin?token=${token}`;

    if (isAndroid) {
      try {
        const urlObj = new URL(clientUrl);
        const host = urlObj.host;
        const intentUrl = `intent://${host}/join-admin?token=${token}#Intent;scheme=https;package=com.android.chrome;end`;
        return res.redirect(intentUrl);
      } catch (e) {
        // Fallback if clientUrl is not a valid URL
        return res.redirect(destinationUrl);
      }
    }

    res.redirect(destinationUrl);
  } catch (error) {
    console.error("[INVITE_REDIRECT_ERROR]", error);
    res.status(500).send("Redirect failed");
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
  joinAdmin,
  inviteRedirect
};

