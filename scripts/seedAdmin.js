const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("../models/User");

const seedAdmin = async () => {
    try {
        // 1. Connect to DB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for seeding...");

        // 2. Define Admin Data
        const adminData = {
            name: "Super Admin",
            email: "admin@connectteen.com",
            password: "adminpassword123", // You can change this
            role: "admin",
            isGuest: false,
            anonymous_name: "MasterTeen",
        };

        // 3. Check if existing
        const existingAdmin = await User.findOne({ email: adminData.email });
        if (existingAdmin) {
            console.log(`Admin with email ${adminData.email} already exists.`);
            process.exit(0);
        }

        // 4. Hash Password
        const salt = await bcrypt.genSalt(10);
        adminData.password = await bcrypt.hash(adminData.password, salt);

        // 5. Create Admin
        await User.create(adminData);
        console.log("Admin account created successfully!");
        console.log("Email: " + adminData.email);
        console.log("Password: adminpassword123");

        process.exit(0);
    } catch (error) {
        console.error("Error seeding admin:", error);
        process.exit(1);
    }
};

seedAdmin();
