const express = require('express');
const router = express.Router();
const CabBooking = require('../models/CabBooking');
const { requireAuth, requireModuleAccess } = require('../middleware/auth');
const requireCabBookingsAdmin = [requireAuth, requireModuleAccess('cab_bookings')];

// Get all cab bookings
router.get('/', ...requireCabBookingsAdmin, async (req, res) => {
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
        const {
            guestName,
            guestPhone,
            guestEmail,
            tripType,
            pickup,
            drop,
            date,
            time,
            vehicle,
            amount,
            selectedOption
        } = req.body;

        const newBooking = new CabBooking({
            guestName,
            guestPhone,
            guestEmail: guestEmail || undefined,
            tripType: tripType || 'roundtrip',
            pickup: pickup || 'To be confirmed',
            drop: drop || 'To be confirmed',
            date: date || new Date().toISOString().split('T')[0],
            time: time || '09:00',
            vehicle: vehicle || 'Looking for suitable vehicle',
            amount: typeof amount === 'number' ? amount : undefined,
            selectedOption: selectedOption || undefined
        });

        await newBooking.save();
        res.status(201).json({ success: true, data: newBooking, message: 'Cab booking created successfully' });
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: 'Failed to create cab booking' });
    }
});

// Update booking status
router.patch('/:id/status', ...requireCabBookingsAdmin, async (req, res) => {
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
router.delete('/delete/:id', ...requireCabBookingsAdmin, async (req, res) => {
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
