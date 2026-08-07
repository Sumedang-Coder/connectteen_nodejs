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

const sanitizeMessage = (message) => {
  const senderName = message.is_anonymous 
    ? (message.user?.anonymous_name || "Anonymous") 
    : (message.user?.name || "Unknown");

  return {
    id: message.id,
    recipient_name: message.recipient_name,
    message: message.message,
    song_id: message.song_id,
    song_image: message.song_image,
    song_artist: message.song_artist,
    song_name: message.song_name,
    preview_url: message.preview_url,
    sender_name: senderName,
    is_anonymous: message.is_anonymous,
    is_admin_only: message.is_admin_only,
    reactions: message.reactions || { heart: 0, laugh: 0, like: 0, wow: 0, sad: 0 },
    created_at: message.createdAt,
    updated_at: message.updatedAt,
  };
};

const sanitizeMessages = (messages) =>
  messages.map((msg) => sanitizeMessage(msg));

const sanitizeArticle = (article) => ({
  id: article._id.toString(),
  title: article.title,
  subtitle: article.subtitle || "",
  description: article.description,
  image_url: article.image_url,
  reactions: article.reactions || { heart: 0, laugh: 0, like: 0, wow: 0, sad: 0 },
  polls: article.polls || [],
  created_at: article.createdAt,
  updated_at: article.updatedAt,
});

const sanitizeArticles = (articles) =>
  articles.map((article) => ({
    id: article._id.toString(),
    title: article.title,
    subtitle: article.subtitle || "",
    description: article.description,
    image_url: article.image_url,
    reactions: article.reactions || { heart: 0, laugh: 0, like: 0, wow: 0, sad: 0 },
    created_at: article.createdAt,
    updated_at: article.updatedAt,
  }));

const sanitizeEvent = (event, currentUserId) => ({
  id: event._id,
  event_title: event.event_title,
  description: event.description,
  date: event.date,
  location: event.location,
  is_online: event.is_online || false,
  link: event.link || "",
  time: event.time || "",
  image_url: event.image_url,
  quota: event.quota || 0,
  status: (event.status === "open" && event.quota > 0 && event.users && event.users.length >= event.quota)
    ? "full"
    : (event.status || "open"),
  visibility: event.visibility || "public",
  registration_fields: event.registration_fields || {
    reg_name: true,
    reg_phone: true,
    reg_address: true,
    reg_occupation: true,
    reg_org_experience: true,
    reg_reason: true,
    reg_transfer_proof: false,
  },
  transfer_info: event.transfer_info || "",
  registrants_count: event.users ? event.users.length : 0,
  isRegistered: currentUserId
    ? event.users.some(id => id.toString() === currentUserId.toString())
    : false,
  attendance_token: currentUserId
    ? event.attendance_tokens?.find(at => at.userId.toString() === currentUserId.toString())?.token
    : null,
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
