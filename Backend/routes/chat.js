const express = require("express");
const mongoose = require("mongoose");
const Booking = require("../models/BookingMachine.js");
const ChatMessage = require("../models/ChatMessage.js");
const { isLoggedIn } = require("../middleware/auth.js");

const router = express.Router();

async function getChatBooking(req, res) {
  if (!mongoose.isValidObjectId(req.params.bookingId)) {
    res.status(400).json({ success: false, message: "Invalid booking ID." });
    return null;
  }

  const booking = await Booking.findById(req.params.bookingId).select("owner customer status");
  if (!booking) {
    res.status(404).json({ success: false, message: "Booking not found." });
    return null;
  }

  const isParticipant = [booking.owner, booking.customer].some(
    (participant) => String(participant) === String(req.user._id)
  );
  if (!isParticipant) {
    res.status(403).json({ success: false, message: "You are not a participant in this chat." });
    return null;
  }
  if (!["Accepted", "Completed"].includes(booking.status)) {
    res.status(403).json({ success: false, message: "Chat becomes available after the booking is accepted." });
    return null;
  }

  return booking;
}

router.get("/:bookingId", isLoggedIn, async (req, res) => {
  try {
    const booking = await getChatBooking(req, res);
    if (!booking) return;

    const messages = await ChatMessage.find({ booking: booking._id })
      .sort({ createdAt: 1 })
      .populate("sender", "fullName role isAdmin");
    return res.json({ success: true, messages });
  } catch (error) {
    console.error("GET CHAT:", error);
    return res.status(500).json({ success: false, message: "Chat could not be loaded." });
  }
});

router.post("/:bookingId", isLoggedIn, async (req, res) => {
  try {
    const booking = await getChatBooking(req, res);
    if (!booking) return;

    const text = String(req.body.text || "").trim();
    if (!text) return res.status(400).json({ success: false, message: "Message cannot be empty." });

    const message = await ChatMessage.create({ booking: booking._id, sender: req.user._id, text });
    await message.populate("sender", "fullName role isAdmin");
    return res.status(201).json({ success: true, message });
  } catch (error) {
    console.error("SEND CHAT:", error);
    return res.status(500).json({ success: false, message: "Message could not be sent." });
  }
});

module.exports = router;