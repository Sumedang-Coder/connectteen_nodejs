const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { google } = require("googleapis");
const { oauth2Client, authorizationUrl } = require("../helpers/utils");
const { generateAnonymousName } = require("../helpers/generateAnonymousName");
const { signJwt, setAuthCookie, sanitizeUser, sanitizeUsers } = require("../helpers/auth");

/* =========================
   GOOGLE AUTH
========================= */
const googleSignIn = (_, res) => {
  return res.redirect(authorizationUrl);
};

const googleSignInCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code tidak ditemukan",
      });
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    if (!data?.email) {
      return res.status(400).json({
        success: false,
        message: "Data Google tidak valid",
      });
    }

    let user;

    // 🔑 1. CEK APAKAH SUDAH LOGIN SEBAGAI GUEST
    if (req.user && req.user.role === "guest") {
      // cek apakah email sudah dipakai user lain
      const emailUsed = await User.findOne({ email: data.email });

      if (emailUsed && emailUsed._id.toString() !== req.user.id) {
        return res.status(400).json({
          success: false,
          message: "Email sudah terdaftar",
        });
      }

      // 🔁 UPGRADE GUEST → USER
      user = await User.findByIdAndUpdate(
        req.user.id,
        {
          name: data.name,
          email: data.email,
          avatarUrl: data.picture,
          role: "user",
          isGuest: false,
        },
        { new: true },
      );
    } else {
      // 🔄 FLOW LAMA (Bukan guest)
      user = await User.findOne({ email: data.email });

      if (!user) {
        user = await User.create({
          name: data.name,
          email: data.email,
          avatarUrl: data.picture,
          anonymous_name: await generateAnonymousName(),
          role: "user",
          isGuest: false,
        });
      }
    }

    // 🔐 BUAT JWT BARU
    const token = signJwt({ id: user._id, role: user.role }, "7d");

    setAuthCookie(res, token, 7 * 24 * 60 * 60 * 1000);

    return res.redirect(process.env.CLIENT_URL);
  } catch (error) {
    console.error("[GOOGLE_CALLBACK]", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


/* =========================
   ADMIN LOGIN
========================= */
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email dan password wajib diisi" });
    }

    const adminRoles = ["super_admin", "content_editor", "viewer"];
    const user = await User.findOne({
      email,
      role: { $in: adminRoles }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ success: false, message: "Email atau password salah" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ success: false, message: "Akun Anda telah ditangguhkan. Silakan hubungi Super Admin." });
    }

    if (user.status === "invited") {
      return res.status(403).json({ success: false, message: "Akun Anda belum diaktifkan. Silakan cek email undangan Anda." });
    }

    // 🕒 Update Last Login
    user.lastLogin = new Date();
    await user.save();

    const token = signJwt({ id: user._id, role: user.role }, "1d");

    setAuthCookie(res, token, 24 * 60 * 60 * 1000);

    return res.json({
      success: true,
      message: "Login admin berhasil",
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("[LOGIN_ADMIN]", error);
    return res
      .status(500)
      .json({ success: false, message: "Kesalahan server" });
  }
};

/* =========================
   AUTH
========================= */
const getAuthenticated = async (req, res) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Tidak terautentikasi" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "User tidak ditemukan" });
      }

      return res.json({
        success: true,
        user: sanitizeUser(user),
      });
    } catch (err) {
      return res
        .status(401)
        .json({ success: false, message: "Token tidak valid" });
    }
  } catch (error) {
    console.error("[GET_AUTH]", error);
    return res
      .status(500)
      .json({ success: false, message: "Kesalahan server" });
  }
};

const guestLogin = async (req, res) => {
  try {
    let guestId = req.cookies.guest_id;

    if (!guestId) {
      guestId = `guest_${Date.now()}`;

      res.cookie("guest_id", guestId, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    let guestUser = await User.findOne({ guestId });

    if (!guestUser) {
      guestUser = await User.create({
        guestId,
        role: "guest",
        anonymous_name: await generateAnonymousName(),
      });
    }

    const token = jwt.sign(
      { id: guestUser._id, role: guestUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user: sanitizeUser(guestUser),
    });
  } catch (err) {
    res.status(500).json({ message: "Guest login failed" });
  }
};

const logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });

  res.json({ success: true, message: "Logout berhasil" });
};


module.exports = {
  googleSignIn,
  googleSignInCallback,
  loginAdmin,
  getAuthenticated,
  guestLogin,
  logout,
};
