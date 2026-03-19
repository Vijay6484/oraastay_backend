const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const { getRoomAvailability } = require('../services/roomAvailability');

// Get all rooms for a specific hotel
router.get('/hotel/:hotelId', async (req, res) => {
    try {
        const rooms = await Room.find({ hotelId: req.params.hotelId });
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get remaining inventory for a room across selected dates
// Remaining = room.inventory + latestCalendarDelta - bookedInventory(Pending+Confirmed)
router.get('/availability', async (req, res) => {
  try {
    const { room_id, check_in, check_out } = req.query;
    if (!room_id || !check_in || !check_out) {
      return res.status(400).json({ success: false, message: 'Missing room_id/check_in/check_out' });
    }

    const result = await getRoomAvailability({
      roomId: room_id,
      checkInDate: check_in,
      checkOutDate: check_out,
    });

    return res.json(result);
  } catch (err) {
    console.error('Room availability error:', err);
    return res.status(500).json({ success: false, message: 'Server error calculating availability', error: err.message });
  }
});

// Get a single room
router.get('/:id', async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) return res.status(404).json({ message: 'Room not found' });
        res.json(room);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new room
router.post('/', async (req, res) => {
    const room = new Room(req.body);
    try {
        const newRoom = await room.save();
        res.status(201).json(newRoom);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update a room
router.patch('/:id', async (req, res) => {
    try {
        const updatedRoom = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedRoom);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a room
router.delete('/:id', async (req, res) => {
    try {
        await Room.findByIdAndDelete(req.params.id);
        res.json({ message: 'Room deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
