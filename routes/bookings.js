const express = require('express');
const router = express.Router();
const RoomBooking = require('../models/RoomBooking');
const {
    requireAuth,
    requireModuleAccess,
    assertManagerOwnsHotel,
} = require('../middleware/auth');

router.use(requireAuth, requireModuleAccess('bookings'));

// Get all bookings formatted for Admin Panel
router.get('/', async (req, res) => {
    try {
        const query = {};

        if (req.authUser.role === 'manager') {
            const Hotel = require('../models/Hotel');
            const ids = await Hotel.find({ managerId: req.authUser.id }).distinct('_id');
            query.hotelId = { $in: ids };
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        if (req.query.status) {
            query.status = new RegExp(req.query.status, 'i');
        }
        if (req.query.payment_status) {
            query.paymentStatus = req.query.payment_status === 'success' ? 'success' : req.query.payment_status;
        }

        if (req.query.start_date || req.query.end_date) {
            query.checkInDate = {};
            if (req.query.start_date) query.checkInDate.$gte = req.query.start_date;
            if (req.query.end_date) query.checkInDate.$lte = req.query.end_date;
        }

        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query.$or = [
                { guestName: searchRegex },
                { guestEmail: searchRegex },
                { guestPhone: searchRegex }
            ];
        }

        const rawBookings = await RoomBooking.find(query)
            .populate('hotelId', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await RoomBooking.countDocuments(query);

        const formattedData = rawBookings.map((b) => {
            const numericId = parseInt(b._id.toString().substring(18), 16) || 1;

            return {
                id: numericId,
                _id: b._id,
                guest_name: b.guestName,
                guest_email: b.guestEmail,
                guest_phone: b.guestPhone,
                food_veg: b.foodVeg || 0,
                food_nonveg: b.foodNonVeg || 0,
                food_jain: b.foodJain || 0,
                accommodation_name: b.hotelId?.name || null,
                check_in: b.checkInDate,
                check_out: b.checkOutDate,
                adults: b.guests?.adults || 0,
                children: b.guests?.children || 0,
                rooms: b.guests?.rooms || 0,
                total_amount: b.totalAmount.toString(),
                advance_amount: (b.advanceAmount || 0).toString(),
                payment_status: b.paymentStatus || 'pending',
                payment_txn_id: b.paymentTxnId || null,
                status: b.status,
                created_at: b.createdAt
            };
        });

        res.json({
            success: true,
            data: formattedData,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Error fetching admin bookings:', err);
        res.status(500).json({ success: false, message: 'Server error fetching bookings' });
    }
});

router.get('/room-occupancy', async (req, res) => {
    try {
        const { check_in, id, room_id } = req.query;
        if (!check_in || !id) {
            return res.status(400).json({ success: false, message: 'Missing check_in or id' });
        }

        const allowed = await assertManagerOwnsHotel(req.authUser, id);
        if (!allowed) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const query = {
            hotelId: id,
            status: { $in: ['Pending', 'Confirmed'] },
            checkInDate: { $lte: check_in },
            checkOutDate: { $gt: check_in }
        };

        if (room_id) {
            query.roomId = room_id;
        }

        const overlappingBookings = await RoomBooking.find(query);
        const totalRoomsBooked = overlappingBookings.reduce((sum, b) => sum + (b.guests?.rooms || 1), 0);

        res.json({ success: true, total_rooms: totalRoomsBooked });
    } catch (err) {
        console.error('Error fetching room occupancy:', err);
        res.status(500).json({ success: false, message: 'Server error fetching room occupancy', error: err.message });
    }
});

router.post('/offline', async (req, res) => {
    try {
        const {
            guest_name, guest_email, guest_phone,
            accommodation_id, room_id,
            check_in, check_out,
            adults, children, rooms,
            food_veg, food_nonveg, food_jain,
            total_amount, advance_amount, payment_method
        } = req.body;

        const allowed = await assertManagerOwnsHotel(req.authUser, accommodation_id);
        if (!allowed) {
            return res.status(403).json({ success: false, message: 'Access denied for this property' });
        }

        const booking = new RoomBooking({
            hotelId: accommodation_id,
            roomId: room_id || accommodation_id,
            guestName: guest_name,
            guestEmail: guest_email,
            guestPhone: guest_phone || '',
            checkInDate: check_in,
            checkOutDate: check_out,
            guests: {
                adults: adults || 1,
                children: children || 0,
                rooms: rooms || 1
            },
            totalAmount: total_amount || 0,
            advanceAmount: advance_amount || 0,
            foodVeg: food_veg || 0,
            foodNonVeg: food_nonveg || 0,
            foodJain: food_jain || 0,
            status: 'Confirmed',
            paymentStatus: advance_amount > 0 ? (advance_amount >= total_amount ? 'success' : 'partial') : 'pending'
        });

        await booking.save();

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            data: {
                booking: { id: parseInt(booking._id.toString().substring(18), 16) || 1 }
            }
        });
    } catch (err) {
        console.error('Error creating offline booking:', err);
        res.status(400).json({ success: false, message: 'Failed to create offline booking', error: err.message });
    }
});

router.delete('/delete/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await RoomBooking.findById(id);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        const allowed = await assertManagerOwnsHotel(req.authUser, booking.hotelId.toString());
        if (!allowed) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        await RoomBooking.findByIdAndDelete(id);
        res.json({ success: true, message: 'Booking deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error deleting booking' });
    }
});

module.exports = router;
