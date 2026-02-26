const { google } = require("googleapis");

require("dotenv").config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI,
);

const scopes = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

const authorizationUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: scopes,
  include_granted_scopes: true,
});

const sanitizeMessage = (message) => ({
  id: message.id,
  recipient_name: message.recipient_name,
  message: message.message,
  song_id: message.song_id,
  song_image: message.song_image,
  song_artist: message.song_artist,
  song_name: message.song_name,
  created_at: message.createdAt,
  updated_at: message.updatedAt,
});

const sanitizeMessages = (messages) =>
  messages.map((msg) => ({
    id: msg.id,
    recipient_name: msg.recipient_name,
    message: msg.message,
    song_id: msg.song_id,
    song_image: msg.song_image,
    song_artist: msg.song_artist,
    song_name: msg.song_name,
    created_at: msg.createdAt,
    updated_at: msg.updatedAt,
  }));

const sanitizeArticle = (article) => ({
  id: article._id,
  title: article.title,
  description: article.description,
  image_url: article.image_url,
  // cloudinary_id: article.cloudinary_id, // Masukkan ini jika frontend admin membutuhkannya
  created_at: article.createdAt,
  updated_at: article.updatedAt,
});

const sanitizeArticles = (articles) =>
  articles.map((article) => ({
    id: article._id,
    title: article.title,
    description: article.description,
    image_url: article.image_url,
    created_at: article.createdAt,
    updated_at: article.updatedAt,
  }));

const sanitizeEvent = (event, currentUserId) => ({
  id: event._id,
  event_title: event.event_title,
  description: event.description,
  date: event.date,
  location: event.location,
  image_url: event.image_url,
  quota: event.quota || 0,
  status: (event.status === "open" && event.quota > 0 && event.users && event.users.length >= event.quota)
    ? "full"
    : (event.status || "open"),
  visibility: event.visibility || "public",
  registrants_count: event.users ? event.users.length : 0,
  isRegistered: currentUserId
    ? event.users.some(id => id.toString() === currentUserId.toString())
    : false,
  created_at: event.createdAt,
});

const sanitizeEvents = (events, currentUserId) =>
  events.map((event) => sanitizeEvent(event, currentUserId));

module.exports = {
  authorizationUrl,
  oauth2Client,
  sanitizeMessage,
  sanitizeMessages,
  sanitizeArticle,
  sanitizeArticles,
  sanitizeEvent,
  sanitizeEvents
};
