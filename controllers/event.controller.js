const { sanitizeEvent, sanitizeEvents } = require("../helpers/utils");
const Event = require("../models/Event");
const cloudinary = require('cloudinary').v2;

/**
 * CREATE EVENT (admin)
 */
exports.createEvent = async (req, res) => {
  try {
    const { event_title, date, location, description } = req.body;

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
    const events = await Event.find().sort({ date: 1 });
    res.json({
      success: true,
      data: sanitizeEvents(events),
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
 * GET SINGLE EVENT (optional tapi berguna)
 */
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: sanitizeEvent(event),
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
    const event = await Event.findById(req.params.id).populate(
      "users",
      "name no_hp email avatarUrl"
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event tidak ditemukan",
      });
    }

    res.json({
      success: true,
      total: event.users.length,
      data: event.users,
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
    const userId = req.user.id; // dari auth middleware

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event tidak ditemukan",
      });
    }

    // Cegah double register
    if (event.users.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "User sudah terdaftar",
      });
    }

    event.users.push(userId);
    await event.save();

    res.json({
      success: true,
      message: "Berhasil mendaftar event",
    });
  } catch (error) {
    console.error("[REGISTER_EVENT]", error);
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

    const { event_title, date, location, description } = req.body;
    
    let updateData = {
      event_title: event_title || event.event_title,
      date: date ? new Date(date) : event.date,
      location: location || event.location,
      description: description || event.description,
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
      { new: true, runValidators: true }
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