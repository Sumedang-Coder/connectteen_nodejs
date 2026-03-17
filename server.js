const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

require("dotenv").config();

const musicRouter = require("./routes/music.routes");
const authRouter = require("./routes/auth.routes");
const messageRouter = require("./routes/message.routes");
const articleRouter = require("./routes/article.routes");
const eventRouter = require("./routes/event.routes");
const adminRouter = require("./routes/admin.routes");
const User = require("./models/User");
const { swaggerUi, specs, swaggerOptions } = require("./config/swagger");

const app = express();

// Trust proxy is needed if behind Nginx/Vercel/Heroku
app.set('trust proxy', 1);

/* =================== MIDDLEWARE =================== */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti."
  }
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak percobaan, silakan coba lagi dalam satu jam."
  }
});

app.use(limiter); // Global limiter for all routes
app.use("/api/auth/admin/login", authLimiter);
app.use("/api/admin/invite", authLimiter);

app.use(
  cors({
    origin: ["http://localhost:3000", "https://www.connectteenedu.com"],
    credentials: true,
  })
);


app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "res.cloudinary.com"],
        fontSrc: ["'self'", "fonts.gstatic.com"],
      },
    },
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

    // Sync indexes to ensure sparse and unique constraints are applied
    User.syncIndexes().catch((err) => {
      console.error("Mongoose Index Sync Error:", err.message);
    });
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

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

app.use("/api", musicRouter);
app.use("/api/auth", authRouter);
app.use("/api", messageRouter);
app.use("/api", articleRouter);
app.use("/api", eventRouter);
app.use("/api", adminRouter);

// Global Error Handler
const errorHandler = require("./middleware/error.middleware");
app.use(errorHandler);

/* =================== SERVER =================== */
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;