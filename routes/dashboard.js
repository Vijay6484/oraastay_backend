const express = require('express');
const router = express.Router();
const RoomBooking = require('../models/RoomBooking');
const CabBooking = require('../models/CabBooking');
const PackageBooking = require('../models/PackageBooking');
const Hotel = require('../models/Hotel');
const Package = require('../models/Package');
const Cab = require('../models/Cab');
const Activity = require('../models/Activity');
const Gallery = require('../models/Gallery');

// GET dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const [roomCount, cabCount, packageCount] = await Promise.all([
            RoomBooking.countDocuments(),
            CabBooking.countDocuments(),
            PackageBooking.countDocuments()
        ]);
        const totalBookings = roomCount + cabCount + packageCount;

        const [roomRevenue, cabRevenue, packageRevenue] = await Promise.all([
            RoomBooking.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
            CabBooking.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
            PackageBooking.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }])
        ]);

        const revenue = (roomRevenue[0]?.total || 0) + (cabRevenue[0]?.total || 0) + (packageRevenue[0]?.total || 0);

        // Occupancy: simplified - count confirmed room bookings vs total room nights (placeholder)
        const confirmedRoomBookings = await RoomBooking.countDocuments({ status: 'Confirmed' });
        const occupancyRate = totalBookings > 0
            ? Math.min(100, Math.round((confirmedRoomBookings / totalBookings) * 100))
            : 0;

        res.json({
            totalBookings: String(totalBookings),
            bookingChange: '+0%',
            occupancyRate: `${occupancyRate}%`,
            occupancyChange: '+0%',
            revenue: `₹${revenue.toLocaleString('en-IN')}`,
            revenueChange: '+0%',
            websiteVisitors: '0',
            visitorsChange: '+0%'
        });
    } catch (err) {
        console.error('Dashboard stats error:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET quick stats
router.get('/quick-stats', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const [accommodations, gallery, packages, cabs, todayRoom, todayCab, todayPackage] = await Promise.all([
            Hotel.countDocuments(),
            Gallery.countDocuments(),
            Package.countDocuments(),
            Cab.countDocuments(),
            RoomBooking.countDocuments({ checkInDate: today }),
            CabBooking.countDocuments({ date: today }),
            PackageBooking.countDocuments({ checkInDate: today })
        ]);

        const todayBookings = todayRoom + todayCab + todayPackage;
        const services = packages + cabs;

        res.json({
            accommodations,
            gallery,
            services,
            todayBookings
        });
    } catch (err) {
        console.error('Dashboard quick-stats error:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET recent bookings (combined room, cab, package)
router.get('/recent-bookings', async (req, res) => {
    try {
        const [roomBookings, cabBookings, packageBookings] = await Promise.all([
            RoomBooking.find().sort({ createdAt: -1 }).limit(5).populate('hotelId', 'name'),
            CabBooking.find().sort({ createdAt: -1 }).limit(5),
            PackageBooking.find().sort({ createdAt: -1 }).limit(5)
        ]);

        const mapRoom = (b) => ({
            id: b._id.toString(),
            guestName: b.guestName,
            email: b.guestEmail,
            accommodation: b.hotelId?.name || 'Room',
            checkIn: b.checkInDate,
            amount: b.totalAmount,
            status: b.status.toLowerCase()
        });

        const mapCab = (b) => ({
            id: b._id.toString(),
            guestName: b.guestName,
            email: b.guestEmail || '-',
            accommodation: `Cab: ${b.pickup} → ${b.drop}`,
            checkIn: b.date,
            amount: b.amount || 0,
            status: b.status.toLowerCase()
        });

        const mapPackage = (b) => ({
            id: b._id.toString(),
            guestName: b.primaryGuestName,
            email: b.primaryGuestEmail,
            accommodation: b.packageTitle,
            checkIn: b.checkInDate,
            amount: b.amount || 0,
            status: b.status.toLowerCase()
        });

        const combined = [
            ...roomBookings.map(mapRoom),
            ...cabBookings.map(mapCab),
            ...packageBookings.map(mapPackage)
        ]
            .sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime())
            .slice(0, 5);

        res.json(combined);
    } catch (err) {
        console.error('Dashboard recent-bookings error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
