const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { generateAnonymousName } = require("../helpers/generateAnonymousName");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const seedAdmin = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error("MONGO_URI is not defined in .env file");
        }
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB...");

        const adminEmail = process.env.INITIAL_ADMIN_EMAIL || "admin@connectteen.com";
        const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || "Admin123!";

        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log("Admin already exists. Updating role to super_admin and ensuring verified.");
            existingAdmin.role = "super_admin";
            existingAdmin.isEmailVerified = true;
            existingAdmin.status = "active";
            await existingAdmin.save();
        } else {
            await User.create({
                name: "Super Admin",
                email: adminEmail,
                password: await bcrypt.hash(adminPassword, 10),
                role: "super_admin",
                isEmailVerified: true,
                isGuest: false,
                status: "active",
                anonymous_name: await generateAnonymousName(),
            });
            console.log(`Initial Admin created: ${adminEmail}`);
        }

        console.log("Seeding completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
};

seedAdmin();
