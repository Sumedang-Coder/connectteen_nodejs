const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const resetDb = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error("MONGO_URI is not defined in .env file");
        }

        console.log("Connecting to MongoDB...");
        await mongoose.connect(mongoUri);
        console.log("Connected successfully.");

        const dbName = mongoose.connection.name;
        console.log(`⚠️  WARNING: You are about to DROP the database: "${dbName}"`);
        
        // In a real production environment, you might want more safety checks here.
        // For development, we'll proceed with dropping the database.
        
        await mongoose.connection.dropDatabase();
        console.log(`✅ Database "${dbName}" dropped successfully.`);

        console.log("Closing connection...");
        await mongoose.connection.close();
        
        console.log("Database reset complete.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Database reset failed:", error);
        process.exit(1);
    }
};

resetDb();
