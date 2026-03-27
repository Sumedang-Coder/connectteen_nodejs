const { sanitizeEvent, sanitizeEvents } = require("../helpers/utils");
const Event = require("../models/Event");
const EventRegistrant = require("../models/EventRegistrant");
const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;

/**
 * CREATE EVENT (admin)
 */
exports.createEvent = async (req, res) => {
  try {
    const { event_title, description, location, date, quota, visibility } = req.body;

    if (!event_title || !event_title.trim()) {
      return res.status(400).json({ success: false, message: "Judul event wajib diisi" });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: "Deskripsi event wajib diisi" });
    }
    if (!location || !location.trim()) {
      return res.status(400).json({ success: false, message: "Lokasi event wajib diisi" });
    }
    if (!date) {
      return res.status(400).json({ success: false, message: "Tanggal event wajib diisi" });
    }
    if (new Date(date) < new Date()) {
      return res.status(400).json({ success: false, message: "Tanggal event tidak boleh di masa lalu" });
    }

    const quotaNum = parseInt(quota) || 0;
    if (quotaNum < 0) {
      return res.status(400).json({ success: false, message: "Kuota tidak boleh negatif" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Harap unggah poster event" });
    }

    const event = new Event({
      event_title: event_title.trim(),
      description: description.trim(),
      location: location.trim(),
      date,
      quota: quotaNum,
      visibility: visibility || "public",
      image_url: req.file.path,
      cloudinary_id: req.file.filename,
    });

    await event.save();

    res.status(201).json({
      success: true,
      message: "Event berhasil dibuat",
      data: sanitizeEvent(event),
    });
  } catch (error) {
    console.error("[CREATE_EVENT]", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET ALL EVENTS
 * Now also returns attendance_token for registered users
 */
exports.getEvents = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, sort = "-createdAt" } = req.query;
    const userId = req.user ? req.user.id : null;
    const userRole = req.user ? req.user.role : "guest";

    const query = {};
    if (search) {
      query.$or = [
        { event_title: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    const ADMIN_ROLES = ["super_admin", "content_editor", "viewer"];
    if (!ADMIN_ROLES.includes(userRole)) {
      query.visibility = "public";
    }

    const totalEvents = await Event.countDocuments(query);
    const totalPages = Math.ceil(totalEvents / limit);

    const events = await Event.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    const currentPage = parseInt(page);
    const hasNextPage = currentPage < totalPages;

    // Sanitize events
    const sanitized = sanitizeEvents(events, userId);

    // If user is logged in, attach their attendance tokens and attended counts
    if (userId) {
      const eventIds = events.map(e => e._id);

      // Get user's registrations for these events
      const userRegistrations = await EventRegistrant.find({
        event: { $in: eventIds },
        user: userId,
      }).select("event attendance_token is_attended");

      const regMap = {};
      userRegistrations.forEach(r => {
        regMap[r.event.toString()] = {
          attendance_token: r.attendance_token,
          is_attended: r.is_attended,
        };
      });

      // Attach to sanitized data
      sanitized.forEach(ev => {
        const reg = regMap[ev.id.toString()];
        if (reg) {
          ev.attendance_token = reg.attendance_token;
          ev.is_attended = reg.is_attended;
        }
      });
    }

    // Get attended counts for all events on this page
    const eventIds = events.map(e => e._id);
    const attendedCounts = await EventRegistrant.aggregate([
      { $match: { event: { $in: eventIds } } },
      { $group: { _id: "$event", attended: { $sum: { $cond: ["$is_attended", 1, 0] } } } }
    ]);
    const attendedMap = {};
    attendedCounts.forEach(a => { attendedMap[a._id.toString()] = a.attended; });

    sanitized.forEach(ev => {
      ev.attended_count = attendedMap[ev.id.toString()] || 0;
    });

    res.json({
      success: true,
      message: "Events retrieved successfully",
      data: sanitized,
      pagination: {
        totalEvents,
        totalPages,
        currentPage,
        limit: parseInt(limit),
        hasNextPage,
        nextPage: hasNextPage ? currentPage + 1 : null,
      },
    });
  } catch (error) {
    console.error("[GET_EVENTS]", error);
    res.status(500).json({ success: false, message: "Kesalahan server" });
  }
};

/**
 * DELETE EVENT (admin)
 */
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    if (event.cloudinary_id) {
      try {
        await cloudinary.uploader.destroy(event.cloudinary_id);
      } catch (err) {
        console.error('[CLOUDINARY_DELETE_FAIL]', event.cloudinary_id, err.message);
      }
    }

    await event.deleteOne();
    await EventRegistrant.deleteMany({ event: req.params.id });

    res.status(200).json({
      success: true,
      message: "Event and associated image deleted successfully",
    });
  } catch (error) {
    console.error("[DELETE_EVENT]", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET SINGLE EVENT
 */
exports.getEventById = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const userRole = req.user ? req.user.role : "guest";
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event tidak ditemukan",
      });
    }

    const ADMIN_ROLES = ["super_admin", "content_editor", "viewer"];
    if (event.visibility === "private" && !ADMIN_ROLES.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak. Event ini bersifat privat.",
      });
    }

    const sanitized = sanitizeEvent(event, userId);

    // Provide attendance token if user is registered
    if (userId && sanitized.isRegistered) {
      const registrant = await EventRegistrant.findOne({ event: event._id, user: userId });
      if (registrant) {
        sanitized.attendance_token = registrant.attendance_token;
        sanitized.is_attended = registrant.is_attended;
      }
    }

    // Get attended count
    const attendedCount = await EventRegistrant.countDocuments({
      event: event._id,
      is_attended: true,
    });
    sanitized.attended_count = attendedCount;

    res.json({
      success: true,
      data: sanitized,
    });
  } catch (error) {
    console.error("[GET_EVENT_BY_ID]", error);
    res.status(500).json({
      success: false,
      message: "Kesalahan server",
    });
  }
};

/**
 * GET REGISTRANTS EVENT (admin)
 * Fixed: count from EventRegistrant, search support, totalAttended
 */
exports.getRegistrants = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const eventId = req.params.id;

    // Verify event exists
    const event = await Event.findById(eventId).select("event_title quota");
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event tidak ditemukan",
      });
    }

    // Build query — count from EventRegistrant as the single source of truth
    let registrantsQuery = EventRegistrant.find({ event: eventId });
    let countQuery = { event: eventId };

    // If search, we need to find matching user IDs first
    if (search && search.trim()) {
      const User = require("../models/User");
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      const userIds = matchingUsers.map(u => u._id);
      registrantsQuery = registrantsQuery.where("user").in(userIds);
      countQuery.user = { $in: userIds };
    }

    const totalRegistrants = await EventRegistrant.countDocuments(countQuery);
    const totalAttended = await EventRegistrant.countDocuments({ event: eventId, is_attended: true });
    const totalPages = Math.ceil(totalRegistrants / parseInt(limit));

    const registrants = await registrantsQuery
      .populate("user", "name no_hp email avatarUrl")
      .sort("-createdAt")
      .skip(skip)
      .limit(parseInt(limit));

    const data = registrants.map((r) => ({
      registrant_id: r._id,
      id: r.user?._id || null,
      name: r.user?.name || "Unknown",
      email: r.user?.email || "Unknown",
      no_hp: r.user?.no_hp || "-",
      avatarUrl: r.user?.avatarUrl || null,
      is_attended: r.is_attended,
      attended_at: r.attended_at,
      attendance_token: r.attendance_token,
      registered_at: r.createdAt,
    }));

    const currentPage = parseInt(page);
    const hasNextPage = currentPage < totalPages;

    res.json({
      success: true,
      message: "Registrants retrieved successfully",
      data: data,
      pagination: {
        totalRegistrants,
        totalAttended,
        totalAbsent: totalRegistrants - totalAttended,
        totalPages,
        currentPage,
        limit: parseInt(limit),
        hasNextPage,
        nextPage: hasNextPage ? currentPage + 1 : null,
      },
    });
  } catch (error) {
    console.error("[GET_REGISTRANTS]", error);
    res.status(500).json({
      success: false,
      message: "Kesalahan server",
    });
  }
};

/**
 * REGISTER EVENT (user)
 * Fixed: prevent unregister if already attended
 */
exports.registerEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event tidak ditemukan",
      });
    }

    const userIndex = event.users.indexOf(userId);
    let message = "";
    let attendanceToken = null;

    if (userIndex !== -1) {
      // === UNREGISTRATION ===
      // Check if already attended — cannot unregister
      const existingRegistrant = await EventRegistrant.findOne({ event: eventId, user: userId });
      if (existingRegistrant && existingRegistrant.is_attended) {
        return res.status(400).json({
          success: false,
          message: "Tidak dapat membatalkan pendaftaran karena Anda sudah tercatat hadir di event ini.",
        });
      }

      event.users.splice(userIndex, 1);
      await EventRegistrant.findOneAndDelete({ event: eventId, user: userId });
      message = "Pendaftaran dibatalkan";
      await event.save();
    } else {
      // === REGISTRATION ===
      if (event.status === "closed") {
        return res.status(400).json({ success: false, message: "Pendaftaran event ini sudah ditutup" });
      }

      // Check quota atomically via findOneAndUpdate
      const updatedEvent = await Event.findOneAndUpdate(
        { 
          _id: eventId,
          $or: [
            { quota: 0 },
            { $expr: { $lt: [{ $size: "$users" }, "$quota"] } }
          ]
        },
        { $addToSet: { users: userId } },
        { new: true }
      );

      if (!updatedEvent) {
        return res.status(400).json({ success: false, message: "Kuota event sudah penuh" });
      }

      try {
        const token = crypto.randomBytes(16).toString("hex");
        attendanceToken = token;

        const registrant = new EventRegistrant({
          event: eventId,
          user: userId,
          attendance_token: token,
        });

        await registrant.save();
        message = "Berhasil mendaftar event";
      } catch (err) {
        // Handle race condition where EventRegistrant was already created
        if (err.code === 11000) {
          const existing = await EventRegistrant.findOne({ event: eventId, user: userId });
          return res.json({
            success: true,
            message: "Anda sudah terdaftar di event ini",
            data: {
              ...sanitizeEvent(updatedEvent, userId),
              attendance_token: existing ? existing.attendance_token : null,
            },
          });
        }
        throw err;
      }
      
      // Update local event object for response formatting
      Object.assign(event, updatedEvent);
    }

    const sanitized = sanitizeEvent(event, userId);
    if (attendanceToken) {
      sanitized.attendance_token = attendanceToken;
    }

    const sanitized = sanitizeEvent(event, userId);
    if (attendanceToken) {
      sanitized.attendance_token = attendanceToken;
    }

    res.json({
      success: true,
      message: message,
      data: sanitized,
    });
  } catch (error) {
    console.error("[TOGGLE_REGISTER_EVENT]", error);
    res.status(500).json({
      success: false,
      message: "Kesalahan server",
    });
  }
};

/**
 * VERIFY ATTENDANCE (admin)
 */
exports.verifyAttendance = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "Attendance token is required" });
    }

    const registrant = await EventRegistrant.findOne({ attendance_token: token })
      .populate("user", "name email avatarUrl")
      .populate("event", "event_title");

    if (!registrant) {
      return res.status(404).json({ success: false, message: "Token tidak valid atau registran tidak ditemukan" });
    }

    if (registrant.is_attended) {
      return res.status(400).json({ 
        success: false, 
        message: "User sudah absen sebelumnya",
        data: {
          name: registrant.user?.name || "Unknown",
          email: registrant.user?.email || "Unknown",
          avatarUrl: registrant.user?.avatarUrl || null,
          event: registrant.event?.event_title || "Unknown",
          attended_at: registrant.attended_at,
        }
      });
    }

    registrant.is_attended = true;
    registrant.attended_at = new Date();
    await registrant.save();

    res.json({
      success: true,
      message: "Absensi berhasil!",
      data: {
        name: registrant.user?.name || "Unknown",
        email: registrant.user?.email || "Unknown",
        avatarUrl: registrant.user?.avatarUrl || null,
        event: registrant.event?.event_title || "Unknown",
        attended_at: registrant.attended_at,
      }
    });
  } catch (error) {
    console.error("[VERIFY_ATTENDANCE]", error);
    res.status(500).json({ success: false, message: "Kesalahan server" });
  }
};

/**
 * UPDATE EVENT (admin)
 */
exports.updateEvent = async (req, res) => {
  try {
    let event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    const quotaNum = req.body.quota !== undefined ? parseInt(req.body.quota) : event.quota;
    if (quotaNum < 0) {
      return res.status(400).json({ success: false, message: "Kuota tidak boleh negatif" });
    }

    const updateData = {
      event_title: req.body.event_title?.trim() || event.event_title,
      description: req.body.description?.trim() || event.description,
      location: req.body.location?.trim() || event.location,
      date: req.body.date || event.date,
      quota: quotaNum,
      status: req.body.status || event.status,
      visibility: req.body.visibility || event.visibility,
    };

    if (req.file) {
      if (event.cloudinary_id) {
        try {
          await cloudinary.uploader.destroy(event.cloudinary_id);
        } catch (err) {
          console.error('[CLOUDINARY_DELETE_FAIL]', event.cloudinary_id, err.message);
        }
      }
      updateData.image_url = req.file.path;
      updateData.cloudinary_id = req.file.filename;
    }

    event = await Event.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: sanitizeEvent(event),
    });
  } catch (error) {
    console.error("[UPDATE_EVENT]", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
