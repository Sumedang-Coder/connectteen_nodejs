const mongoose = require("mongoose");
require("dotenv").config();

const Article = require("../models/Article");
const Event = require("../models/Event");
const Message = require("../models/Message");
const User = require("../models/User");

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for large-scale seeding...");

        // 1. Get or Create a Seeder User
        let seederUser = await User.findOne({ email: "seeder@connectteen.com" });
        if (!seederUser) {
            seederUser = await User.create({
                name: "Data Seeder",
                email: "seeder@connectteen.com",
                role: "user",
                isGuest: false,
                anonymous_name: "SeedMaster"
            });
            console.log("Created Seeder User.");
        }

        const userId = seederUser._id;

        // --- SEED SECRET MESSAGES (150 records) ---
        console.log("Seeding 150 Secret Messages for Admin...");
        const adjectives = ["Anonymous", "Secret", "Hidden", "Mysterious", "Silent", "Grateful", "Curious", "Inspiring"];
        const nouns = ["Supporter", "Friend", "User", "Teen", "Member", "Contributor", "Fan"];
        const messages = [
            "Great work on the last event! Really enjoyed the vibe.",
            "Can we have more articles about mental health?",
            "Just wanted to say thanks for building this platform.",
            "The community is growing so fast, amazing to see.",
            "I have a suggestion for the events page layout.",
            "Looking forward to the next summit!",
            "Is there a way to volunteer for the team?",
            "The new UI looks very premium, love the dark mode.",
            "Keep pushing the boundaries of what's possible!",
            "Simple message to show some support for the devs."
        ];
        const songs = [
            { id: "4cOdK97xlZST91Zyd6P1iB", name: "Starboy", artist: "The Weeknd", img: "https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258cf7ac552" },
            { id: "1799B7z6p3YFMTg38py76C", name: "Sunflower", artist: "Post Malone", img: "https://i.scdn.co/image/ab67616d0000b273e351368686e584f183707248" },
            { id: "7669n9S1G5FmQj74e4XhFw", name: "Die For You", artist: "The Weeknd", img: "https://i.scdn.co/image/ab67616d0000b273806c160566580d6335d1f11c" },
            { id: "27SdWb2rFzO66WiY9vSTJv", name: "After Hours", artist: "The Weeknd", img: "https://i.scdn.co/image/ab67616d0000b27346dc0436d078b539fa739343" }
        ];

        const messageData = [];
        for (let i = 0; i < 150; i++) {
            const song = songs[Math.floor(Math.random() * songs.length)];
            messageData.push({
                recipient_name: "Admin",
                message: `${messages[Math.floor(Math.random() * messages.length)]} Part ${i + 1}`,
                song_id: song.id,
                song_name: song.name,
                song_artist: song.artist,
                song_image: song.img,
                user: userId,
                createdAt: new Date(Date.now() - (i * 3600000)) // Hourly increment history
            });
        }
        await Message.insertMany(messageData);
        console.log("Secret Messages Seeded.");

        // --- SEED ARTICLES (60 records) ---
        console.log("Seeding 60 Articles...");
        const articleTitles = ["Living Modern", "Teen Psychology", "Future of Tech", "Design Systems", "Community Spirit", "Growth Mindset"];
        const articleData = [];
        for (let i = 0; i < 60; i++) {
            articleData.push({
                title: `${articleTitles[i % articleTitles.length]} - Issue #${i + 1}`,
                description: `This is a comprehensive guide to ${articleTitles[i % articleTitles.length].toLowerCase()}. We cover all the latest trends and findings for the year 2026. This data is for stress testing pagination and search.`,
                image_url: `https://picsum.photos/seed/${i + 100}/800/600`,
                cloudinary_id: `seed_article_${i + 1}`,
                createdAt: new Date(Date.now() - (i * 86400000)) // Daily increment
            });
        }
        await Article.insertMany(articleData);
        console.log("Articles Seeded.");

        // --- SEED EVENTS (30 records) ---
        console.log("Seeding 30 Events...");
        const eventLocations = ["Jakarta", "Bandung", "Surabaya", "Bali", "Singapore", "Remote"];
        const eventStatuses = ["open", "full", "closed"];
        const eventVisibilities = ["public", "private"];
        const eventData = [];
        for (let i = 0; i < 30; i++) {
            eventData.push({
                event_title: `Digital Transformation Summit #${i + 1}`,
                description: "Join hundreds of visionaries and technologists for a deep dive into the future of digital connectivity and community building.",
                location: eventLocations[i % eventLocations.length],
                date: new Date(Date.now() + (i * 86400000)), // Future dates
                quota: 50 + (i * 10),
                status: eventStatuses[i % eventStatuses.length],
                visibility: eventVisibilities[i % eventVisibilities.length],
                image_url: `https://picsum.photos/seed/${i + 200}/1280/720`,
                cloudinary_id: `seed_event_${i + 1}`,
                createdAt: new Date(Date.now() - (i * 43200000))
            });
        }
        await Event.insertMany(eventData);
        console.log("Events Seeded.");

        console.log("--- Seeding Completed Successfully! ---");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding data:", error);
        process.exit(1);
    }
};

seedData();
