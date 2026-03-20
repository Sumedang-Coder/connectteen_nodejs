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

      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("guest_id", guestId, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: "/",
      });
    }

    let guestUser = await User.findOne({ guestId });

    if (!guestUser) {
      guestUser = await User.create({
        guestId,
        role: "guest",
        isGuest: true,
        anonymous_name: await generateAnonymousName(),
      });
    }

    const token = signJwt(
      { id: guestUser._id.toString(), role: guestUser.role },
      "1d",
    );

    setAuthCookie(res, token, 24 * 60 * 60 * 1000);

    res.json({
      success: true,
      user: sanitizeUser(guestUser),
    });
  } catch (err) {
    console.error("[GUEST_LOGIN_ERROR]", err);
    res.status(500).json({ success: false, message: "Guest login failed", error: err.message });
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

const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: "Email dan kode OTP wajib diisi" });
        }

        const user = await User.findOne({ 
            email, 
            verificationOTP: otp,
            verificationExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "Kode verifikasi tidak valid atau sudah kedaluwarsa" });
        }

        user.isEmailVerified = true;
        user.verificationOTP = undefined;
        user.verificationExpires = undefined;
        user.status = "active";
        await user.save();

        // Auto login after verification
        const token = signJwt({ id: user._id, role: user.role }, "7d");
        setAuthCookie(res, token, 7 * 24 * 60 * 60 * 1000);

        return res.json({
            success: true,
            message: "Email berhasil diverifikasi!",
            user: sanitizeUser(user)
        });
    } catch (error) {
        console.error("[VERIFY_EMAIL]", error);
        return res.status(500).json({ success: false, message: "Kesalahan server" });
    }
};

const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Email wajib diisi" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "User tidak ditemukan" });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ success: false, message: "Email ini sudah diverifikasi" });
        }

        // Rate limit: 60 seconds
        const now = new Date();
        if (user.lastResentAt && (now - user.lastResentAt) < 60000) {
            const waitSeconds = Math.ceil((60000 - (now - user.lastResentAt)) / 1000);
            return res.status(429).json({ success: false, message: `Harap tunggu ${waitSeconds} detik sebelum meminta kode baru.` });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        user.verificationOTP = otp;
        user.verificationExpires = otpExpires;
        user.lastResentAt = now;
        await user.save();

        const emailResult = await require("../helpers/emailService").sendVerificationEmail(email, otp);

        if (!emailResult.success) {
            return res.status(500).json({ success: false, message: "Gagal mengirim email verifikasi" });
        }

        return res.json({
            success: true,
            message: "Kode verifikasi baru telah dikirim ke email Anda."
        });
    } catch (error) {
        console.error("[RESEND_VERIFICATION]", error);
        return res.status(500).json({ success: false, message: "Kesalahan server" });
    }
};

/* =========================
   PASSWORD RESET
   ========================= */

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email wajib diisi" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "Email tidak ditemukan" });
        }

        // Rate limit 60s
        const now = new Date();
        if (user.lastResentAt && (now - user.lastResentAt) < 60000) {
            return res.status(429).json({ success: false, message: "Harap tunggu 60 detik sebelum meminta reset baru." });
        }

        const rawToken = require("crypto").randomBytes(32).toString("hex");
        const hashedToken = require("crypto").createHash("sha256").update(rawToken).digest("hex");
        const tokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = tokenExpires;
        user.lastResentAt = now;
        await user.save();

        const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;
        const emailResult = await require("../helpers/emailService").sendPasswordResetEmail(email, resetUrl);
        
        if (!emailResult.success) {
            return res.status(500).json({ success: false, message: "Gagal mengirim email reset password" });
        }

        return res.json({ success: true, message: "Link reset password telah dikirim ke email Anda." });
    } catch (error) {
        console.error("[FORGOT_PASSWORD]", error);
        return res.status(500).json({ success: false, message: "Kesalahan server" });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: "Token dan password baru wajib diisi" });
        }

        const hashedToken = require("crypto").createHash("sha256").update(token).digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "Link reset tidak valid atau sudah kedaluwarsa" });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        return res.json({ success: true, message: "Password berhasil diperbarui. Silakan login kembali." });
    } catch (error) {
        console.error("[RESET_PASSWORD]", error);
        return res.status(500).json({ success: false, message: "Kesalahan server" });
    }
};

const updateMe = async (req, res) => {
  try {
    const { name, no_hp } = req.body;
    const userId = req.user.id;

    if (name && name.trim().length < 3) {
      return res.status(400).json({ success: false, message: "Nama minimal 3 karakter" });
    }

    if (no_hp) {
      const phoneRegex = /^(?:\+62|62|0)8[1-9][0-9]{6,11}$/;
      if (!phoneRegex.test(no_hp.trim().replace(/\s/g, ''))) {
        return res.status(400).json({ success: false, message: "Format nomor WhatsApp tidak valid" });
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan" });
    }

    if (name) user.name = name.trim();
    if (no_hp) user.no_hp = no_hp.trim();

    await user.save();

    return res.json({
      success: true,
      message: "Profil berhasil diperbarui",
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("[UPDATE_ME]", error);
    return res.status(500).json({ success: false, message: "Kesalahan server" });
  }
};

module.exports = {
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
};
