const express = require('express');
const router = express.Router();
const PackageBooking = require('../models/PackageBooking');
const { requireAuth, requireModuleAccess } = require('../middleware/auth');
const requirePkgBookingsAdmin = [requireAuth, requireModuleAccess('package_bookings')];

// Get all package bookings
router.get('/', ...requirePkgBookingsAdmin, async (req, res) => {
    try {
        const bookings = await PackageBooking.find().sort({ createdAt: -1 }).populate('hotelId', 'name slug images location').populate('roomId', 'name type');
        res.json({ success: true, data: bookings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Create a new package booking
router.post('/', async (req, res) => {
    try {
        const {
            packageId,
            packageTitle,
            checkInDate,
            adults,
            children,
            guests,
            primaryGuestName,
            primaryGuestEmail,
            primaryGuestPhone,
            notes,
        } = req.body;

        if (!packageId || !packageTitle || !checkInDate || !primaryGuestName || !primaryGuestEmail || !primaryGuestPhone) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const booking = new PackageBooking({
            packageId,
            packageTitle,
            checkInDate,
            adults: adults || 1,
            children: children || 0,
            guests: guests || [],
            primaryGuestName,
            primaryGuestEmail,
            primaryGuestPhone,
            totalGuests: (adults || 1) + (children || 0),
            notes,
            status: 'Pending',
        });

        const saved = await booking.save();
        res.status(201).json({ success: true, data: saved });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// Update booking status
router.patch('/:id/status', ...requirePkgBookingsAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Pending', 'Confirmed', 'Cancelled'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status value' });
        }
        const booking = await PackageBooking.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        res.json({ success: true, data: booking });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// Delete a booking
router.delete('/:id', ...requirePkgBookingsAdmin, async (req, res) => {
    try {
        await PackageBooking.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Booking deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
