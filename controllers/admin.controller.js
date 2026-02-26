const User = require("../models/User");
const Article = require("../models/Article");
const Event = require("../models/Event");
const Message = require("../models/Message");
const bcrypt = require("bcryptjs");
const { generateAnonymousName } = require("../helpers/generateAnonymousName");
const { sanitizeUser, sanitizeUsers } = require("../helpers/auth");

const getAdmin = async (req, res) => {
  try {
    const { search, limit = 10 } = req.query;

    const query = {
      role: {
        $eq: "admin",
        $ne: "super admin"
      }
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: sanitizeUsers(users),
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
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }

    const { name, email, password } = req.body;
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
      role: "admin",
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
    const { name, email, password } = req.body;

    const user = await User.findOne({ _id: id, role: "admin" });

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

    const deletedUser = await User.findOneAndDelete({ _id: id, role: "admin" });

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "Admin tidak ditemukan atau tidak dapat dihapus",
      });
    }

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

module.exports = { getAdmin, registerAdminOnly, updateAdmin, deleteAdmin, getStats };

