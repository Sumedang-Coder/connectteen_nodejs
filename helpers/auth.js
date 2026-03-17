const jwt = require("jsonwebtoken");

const signJwt = (payload, expiresIn) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

const setAuthCookie = (res, token, maxAge) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge,
    path: "/",
  });
};

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatarUrl: user.avatarUrl,
  anonymous_name: user.anonymous_name,
  no_hp: user.no_hp,
  isGuest: user.isGuest,
});

const sanitizeUsers = (users) => users.map((user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatarUrl: user.avatarUrl,
  anonymous_name: user.anonymous_name,
  no_hp: user.no_hp,
  isGuest: user.isGuest,
}));

module.exports = { signJwt, setAuthCookie, sanitizeUser, sanitizeUsers };
