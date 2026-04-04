const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Article = require("../models/Article");
const Event = require("../models/Event");
const Message = require("../models/Message");
const User = require("../models/User");

const seedFullDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for FULL scale seeding...");

        // --- PREPARE DATA POOLS ---
        const firstNames = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Christopher", "Karen"];
        const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];

        const articleTitles = [
            "The Future of AI", "Youth Wellness Guide", "Cybersecurity Basics", "Sustainable Living",
            "Modern Architecture", "Digital Nomads 2026", "Healthy Sleep Habits", "The Art of Coding",
            "Cooking for Beginners", "Financial Freedom Tips", "Psychology of Success", "Deep Space Exploration",
            "Renewable Energy Trends", "Mental Health Matters", "Urban Gardening", "Remote Work Evolution"
        ];

        const eventTitles = [
            "Global Tech Summit", "Wellness Retreat", "Code Workshop", "Startup Pitch Night",
            "Art Exhibition", "Music Festival", "Charity Gala", "Web3 Symposium",
            "Entrepreneur Seminar", "Design Thinking Workshop", "Yoga & Mindfulness", "Hackathon 2026",
            "Community Potluck", "Networking Mixer", "Leadership Bootcamp", "Eco-Friendly Expo"
        ];

        const locations = ["Jakarta", "Bandung", "Surabaya", "Bali", "Medan", "Semarang", "Yogyakarta", "Makassar", "Remote"];

        const messages = [
            "Great platform! Keep it up.", "I love the new design.", "Can we get more dark mode articles?",
            "The event last night was amazing.", "Thank you for the support.", "Is there a bug in the settings?",
            "How do I join the team?", "Love from Indonesia!", "The community is great.", "Very inspiring content."
        ];

        const songs = [
            { id: "4cOdK97xlZST91Zyd6P1iB", name: "Starboy", artist: "The Weeknd", img: "https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258cf7ac552" },
            { id: "1799B7z6p3YFMTg38py76C", name: "Sunflower", artist: "Post Malone", img: "https://i.scdn.co/image/ab67616d0000b273e351368686e584f183707248" },
            { id: "7669n9S1G5FmQj74e4XhFw", name: "Die For You", artist: "The Weeknd", img: "https://i.scdn.co/image/ab67616d0000b273806c160566580d6335d1f11c" },
            { id: "27SdWb2rFzO66WiY9vSTJv", name: "After Hours", artist: "The Weeknd", img: "https://i.scdn.co/image/ab67616d0000b27346dc0436d078b539fa739343" }
        ];

        // --- 1. SEED USERS (200) ---
        console.log("Seeding 200 Users...");
        const userData = [];
        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash("password123", salt);

        for (let i = 0; i < 200; i++) {
            const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const name = `${fName} ${lName}`;
            userData.push({
                name: name,
                email: `user${i + 1}_${Date.now()}@example.com`,
                password: password,
                role: "user",
                isGuest: false,
                anonymous_name: `${fName}${i + 1}`,
                avatarUrl: `https://i.pravatar.cc/150?u=${i + 100}`
            });
        }
        const createdUsers = await User.insertMany(userData);
        const userIds = createdUsers.map(u => u._id);
        console.log("Users Seeded.");

        // --- 2. SEED ARTICLES (200) ---
        console.log("Seeding 200 Articles...");
        const articleData = [];
        for (let i = 0; i < 200; i++) {
            articleData.push({
                title: `${articleTitles[i % articleTitles.length]} Vol. ${Math.floor(i / 16) + 1} #${i + 1}`,
                description: `This is an in-depth exploration of ${articleTitles[i % articleTitles.length].toLowerCase()}. Featuring expert insights and community feedback. This data is for full-scale platform testing.`,
                image_url: `https://picsum.photos/seed/art${i}/800/600`,
                cloudinary_id: `full_seed_article_${i + 1}`,
                createdAt: new Date(Date.now() - (i * 3600000 * 2)) // Distributed over time
            });
        }
        await Article.insertMany(articleData);
        console.log("Articles Seeded.");

        // --- 3. SEED EVENTS (200) ---
        console.log("Seeding 200 Events & Registrants...");
        const eventData = [];
        const eventStatuses = ["open", "full", "closed"];

        for (let i = 0; i < 200; i++) {
            // Randomly select 10-50 users for this event
            const registrantCount = Math.floor(Math.random() * 41) + 10;
            const shuffled = [...userIds].sort(() => 0.5 - Math.random());
            const registrants = shuffled.slice(0, registrantCount);

            eventData.push({
                event_title: `${eventTitles[i % eventTitles.length]} 2026 - #${i + 1}`,
                description: `Join us for the annual ${eventTitles[i % eventTitles.length].toLowerCase()}. This year we're focusing on innovation and inclusive community building.`,
                location: locations[i % locations.length],
                date: new Date(Date.now() + (i * 3600000 * 5)), // Future dates
                quota: 100 + (i * 2),
                status: registrants.length >= 100 + (i * 2) ? "full" : eventStatuses[i % 3],
                visibility: i % 10 === 0 ? "private" : "public",
                image_url: `https://picsum.photos/seed/ev${i}/1280/720`,
                cloudinary_id: `full_seed_event_${i + 1}`,
                users: registrants
            });
        }
        await Event.insertMany(eventData);
        console.log("Events & Registrants Seeded.");

        // --- 4. SEED SECRET MESSAGES (200) ---
        console.log("Seeding 200 Secret Messages for Admin...");
        const messageData = [];
        for (let i = 0; i < 200; i++) {
            const song = songs[Math.floor(Math.random() * songs.length)];
            const randomUser = userIds[Math.floor(Math.random() * userIds.length)];
            messageData.push({
                recipient_name: "Admin",
                message: `${messages[Math.floor(Math.random() * messages.length)]} - Support ticket ref #${i + 1000}`,
                song_id: song.id,
                song_name: song.name,
                song_artist: song.artist,
                song_image: song.img,
                user: randomUser,
                createdAt: new Date(Date.now() - (i * 3600000))
            });
        }
        await Message.insertMany(messageData);
        console.log("Secret Messages Seeded.");

        console.log("\n--- Full Scale Seeding Completed Successfully! ---");
        process.exit(0);
    } catch (error) {
        console.error("Error during full scale seeding:", error);
        process.exit(1);
    }
};

seedFullDatabase();
