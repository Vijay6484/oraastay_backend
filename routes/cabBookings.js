const express = require('express');
const router = express.Router();
const CabBooking = require('../models/CabBooking');

// Get all cab bookings
router.get('/', async (req, res) => {
    try {
        const bookings = await CabBooking.find().sort({ createdAt: -1 });
        // Return a response structure matches what `Bookings.tsx` expects, just to be safe if that pattern is reused, but here we can return simple array if we prefer.
        // Assuming we return { success: true, data: bookings } for consistency with newer parts.
        res.json({ success: true, data: bookings, pagination: { total: bookings.length, page: 1, limit: bookings.length, totalPages: 1 } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error fetching cab bookings' });
    }
});

// Create cab booking
router.post('/', async (req, res) => {
    try {
        const { guestName, guestPhone, tripType, pickup, drop, date, time, vehicle } = req.body;

        const newBooking = new CabBooking({
            guestName,
            guestPhone,
            tripType,
            pickup,
            drop,
            date,
            time,
            vehicle
        });

        await newBooking.save();
        res.status(201).json({ success: true, data: newBooking, message: 'Cab booking created successfully' });
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: 'Failed to create cab booking' });
    }
});

// Update booking status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        if (!['Pending', 'Confirmed', 'Cancelled'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const updatedBooking = await CabBooking.findByIdAndUpdate(
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
        const deletedBooking = await CabBooking.findByIdAndDelete(req.params.id);

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
