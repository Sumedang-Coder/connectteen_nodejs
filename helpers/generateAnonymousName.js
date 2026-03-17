const User = require("../models/User");

async function generateAnonymousName() {
  let name;
  let exists = true;

  while (exists) {
    const random = Math.floor(10000 + Math.random() * 900000); // 6 digit
    name = `Anonymous${random}`;
    exists = await User.findOne({ anonymous_name: name });
  }

  return name;
}

module.exports = { generateAnonymousName };
