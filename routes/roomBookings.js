const express = require('express');
const router = express.Router();
const RoomBooking = require('../models/RoomBooking');

// Get all bookings (optional: can filter by hotelId in query)
router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.hotelId) {
            filter.hotelId = req.query.hotelId;
        }
        const bookings = await RoomBooking.find(filter).sort({ createdAt: -1 });
        res.json({ success: true, data: bookings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error fetching bookings' });
    }
});

// Create a new room booking
router.post('/', async (req, res) => {
    try {
        const newBooking = new RoomBooking(req.body);
        await newBooking.save();
        res.status(201).json({ success: true, data: newBooking, message: 'Room booking created successfully' });
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: 'Failed to create room booking' });
    }
});

// Update booking status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Pending', 'Confirmed', 'Cancelled'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const updatedBooking = await RoomBooking.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!updatedBooking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        res.json({ success: true, data: updatedBooking, message: `Booking status updated to ${status}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error updating booking status' });
    }
});

// Delete booking
router.delete('/delete/:id', async (req, res) => {
    try {
        const deletedBooking = await RoomBooking.findByIdAndDelete(req.params.id);
        if (!deletedBooking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        res.json({ success: true, message: 'Booking deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error deleting booking' });
    }
});

module.exports = router;
