const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");

require("dotenv").config();

const musicRouter = require("./routes/music.routes");
const authRouter = require("./routes/auth.routes");
const messageRouter = require("./routes/message.routes");
const articleRouter = require("./routes/article.routes");
const eventRouter = require("./routes/event.routes");
const adminRouter = require("./routes/admin.routes");

const app = express();

/* =================== MIDDLEWARE =================== */
app.use(
  cors({
    origin: ["http://localhost:3000", "https://www.connectteenedu.com"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

/* =================== DATABASE =================== */
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });
    
    isConnected = db.connections[0].readyState;
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error; 
  }
};

/* =================== ROUTES =================== */
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Database connection error",
      error: error.message 
    });
  }
});

app.get("/", (req, res) => {
  res.json("Hello World - ConnectTeen API is Active");
});

app.use("/api", musicRouter);
app.use("/api/auth", authRouter);
app.use("/api", messageRouter);
app.use("/api", articleRouter);
app.use("/api", eventRouter);
app.use("/api", adminRouter);

/* =================== SERVER =================== */
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;