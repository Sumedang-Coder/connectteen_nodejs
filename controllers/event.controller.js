const { sanitizeEvent, sanitizeEvents } = require("../helpers/utils");
const Event = require("../models/Event");
const cloudinary = require("cloudinary").v2;

/**
 * CREATE EVENT (admin)
 */
exports.createEvent = async (req, res) => {
  try {
    const { event_title, date, location, description, quota, visibility } = req.body;

    if (!event_title || !date || !location || !req.file || !description) {
      return res.status(400).json({
        success: false,
        message: "Semua field dan gambar wajib diisi",
      });
    }

    const event = await Event.create({
      event_title,
      date: new Date(date),
      location,
      description,
      quota: parseInt(quota) || 0,
      visibility: visibility || "public",
      image_url: req.file.path,
      cloudinary_id: req.file.filename,
    });

    res.status(201).json({
      success: true,
      message: "Event berhasil dibuat",
      data: sanitizeEvent(event),
    });
  } catch (error) {
    console.error("[CREATE_EVENT]", error);
    res.status(500).json({ success: false, message: "Kesalahan server" });
  }
};

/**
 * GET ALL EVENTS
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

    // Filter by visibility if not admin
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

    res.json({
      success: true,
      message: "Events retrieved successfully",
      data: sanitizeEvents(events, userId),
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
      return res.status(404).json({
        success: false,
        message: "Event tidak ditemukan",
      });
    }

    if (event.cloudinary_id) {
      await cloudinary.uploader.destroy(event.cloudinary_id);
    }

    await event.deleteOne();

    res.json({
      success: true,
      message: "Event dan gambar berhasil dihapus",
    });
  } catch (error) {
    console.error("[DELETE_EVENT]", error);
    res.status(500).json({ success: false, message: "Kesalahan server" });
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

    // Visibility check for non-admins
    const ADMIN_ROLES = ["super_admin", "content_editor", "viewer"];
    if (event.visibility === "private" && !ADMIN_ROLES.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak. Event ini bersifat privat.",
      });
    }

    res.json({
      success: true,
      data: sanitizeEvent(event, userId),
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
 */
exports.getRegistrants = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count first
    const eventCount = await Event.findById(req.params.id).select("users");
    if (!eventCount) {
      return res.status(404).json({
        success: false,
        message: "Event tidak ditemukan",
      });
    }

    const totalRegistrants = eventCount.users.length;
    const totalPages = Math.ceil(totalRegistrants / parseInt(limit));

    // Populate with pagination
    const event = await Event.findById(req.params.id).populate({
      path: "users",
      select: "name no_hp email avatarUrl",
      options: {
        skip: skip,
        limit: parseInt(limit),
      },
    });

    const currentPage = parseInt(page);
    const hasNextPage = currentPage < totalPages;

    res.json({
      success: true,
      message: "Registrants retrieved successfully",
      data: event.users,
      pagination: {
        totalRegistrants,
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

    if (userIndex !== -1) {
      // Allow unregistration regardless of status
      event.users.splice(userIndex, 1);
      message = "Pendaftaran dibatalkan";
    } else {
      // Check if event is closed or full
      if (event.status === "closed") {
        return res.status(400).json({ success: false, message: "Pendaftaran event ini sudah ditutup" });
      }

      if (event.quota > 0 && event.users.length >= event.quota) {
        return res.status(400).json({ success: false, message: "Kuota event sudah penuh" });
      }

      event.users.push(userId);
      message = "Berhasil mendaftar event";
    }

    await event.save();

    res.json({
      success: true,
      message: message,
      data: sanitizeEvent(event, userId)
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
 * UPDATE EVENT (admin)
 */
exports.updateEvent = async (req, res) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event tidak ditemukan",
      });
    }

    const { event_title, date, location, description, quota, status, visibility } = req.body;

    let updateData = {
      event_title: event_title || event.event_title,
      date: date ? new Date(date) : event.date,
      location: location || event.location,
      description: description || event.description,
      quota: quota !== undefined ? parseInt(quota) : event.quota,
      status: status || event.status,
      visibility: visibility || event.visibility,
    };

    if (req.file) {
      if (event.cloudinary_id) {
        await cloudinary.uploader.destroy(event.cloudinary_id);
      }

      updateData.image_url = req.file.path;
      updateData.cloudinary_id = req.file.filename;
    }

    event = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    res.json({
      success: true,
      message: "Event berhasil diperbarui",
      data: sanitizeEvent(event),
    });
  } catch (error) {
    console.error("[UPDATE_EVENT]", error);
    res.status(500).json({
      success: false,
      message: "Kesalahan server saat memperbarui event",
    });
  }
};
