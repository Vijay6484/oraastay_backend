const express = require('express');
const router = express.Router();
const Hotel = require('../models/Hotel');
const Room = require('../models/Room');
const RoomBooking = require('../models/RoomBooking');

// Helper: get dates between start and end (exclusive of end)
function getDatesBetween(startStr, endStr) {
    const dates = [];
    const start = new Date(startStr);
    const end = new Date(endStr);
    const curr = new Date(start);
    while (curr < end) {
        dates.push(curr.toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
    }
    return dates;
}

// Search hotels by dates and guests
router.get('/search', async (req, res) => {
    try {
        let { checkIn, checkOut, adults, children } = req.query;
        const totalGuests = Math.max(0, parseInt(adults || '1', 10) + parseInt(children || '0', 10)) || 1;

        if (checkOut && checkIn && new Date(checkOut) <= new Date(checkIn)) {
            const d = new Date(checkIn);
            d.setDate(d.getDate() + 1);
            checkOut = d.toISOString().split('T')[0];
        }

        let hotels = await Hotel.find();

        if (checkIn && checkOut && totalGuests > 0) {
            const dates = getDatesBetween(checkIn, checkOut);
            if (dates.length === 0) {
                return res.json([]);
            }

            const roomsByHotel = await Room.find({ hotelId: { $in: hotels.map(h => h._id) } });
            const hotelRoomsMap = {};
            const hotelInventoryMap = {};
            roomsByHotel.forEach(r => {
                const hid = r.hotelId?.toString?.() || r.hotelId;
                if (!hotelRoomsMap[hid]) hotelRoomsMap[hid] = [];
                hotelRoomsMap[hid].push(r);
                const cap = (r.capacity?.adults || 0) + (r.capacity?.children || 0) || 2;
                hotelInventoryMap[hid] = (hotelInventoryMap[hid] || 0) + (r.inventory || 1) * Math.max(1, cap);
            });

            const availableHotelIds = new Set();

            for (const hotel of hotels) {
                const hid = hotel._id.toString();
                const rooms = hotelRoomsMap[hid] || [];
                const totalCapacity = hotelInventoryMap[hid] || 0;
                if (totalCapacity < totalGuests) continue;

                const totalInventory = rooms.reduce((sum, r) => sum + (r.inventory || 1), 0);
                if (totalInventory === 0) continue;

                let allDatesAvailable = true;
                for (const d of dates) {
                    const overlapping = await RoomBooking.find({
                        hotelId: hotel._id,
                        status: { $in: ['Pending', 'Confirmed'] },
                        checkInDate: { $lte: d },
                        checkOutDate: { $gt: d }
                    });
                    const totalBooked = overlapping.reduce((sum, b) => sum + (b.guests?.rooms || 1), 0);
                    if (totalBooked >= totalInventory) {
                        allDatesAvailable = false;
                        break;
                    }
                }
                if (allDatesAvailable) availableHotelIds.add(hid);
            }

            hotels = hotels.filter(h => availableHotelIds.has(h._id.toString()));
        } else if (totalGuests > 0) {
            const roomsByHotel = await Room.find({ hotelId: { $in: hotels.map(h => h._id) } });
            const hotelCapacityMap = {};
            roomsByHotel.forEach(r => {
                const hid = r.hotelId?.toString?.() || r.hotelId;
                const cap = (r.capacity?.adults || 0) + (r.capacity?.children || 0) || 2;
                hotelCapacityMap[hid] = (hotelCapacityMap[hid] || 0) + (r.inventory || 1) * Math.max(1, cap);
            });
            hotels = hotels.filter(h => (hotelCapacityMap[h._id.toString()] || 0) >= totalGuests);
        }

        // Add subTypes for frontend filtering
        const allAssociatedRooms = await Room.find({ hotelId: { $in: hotels.map(h => h._id) } }).lean();
        const hotelSubtypesMap = {};
        allAssociatedRooms.forEach(r => {
            const hid = r.hotelId.toString();
            if (!hotelSubtypesMap[hid]) hotelSubtypesMap[hid] = new Set();
            if (r.subType) hotelSubtypesMap[hid].add(r.subType);
        });

        const formattedHotels = hotels.map(h => ({
            ...(h.toObject ? h.toObject() : h),
            subTypes: Array.from(hotelSubtypesMap[h._id.toString()] || []),
            rating: (h.rating && h.rating > 0) ? h.rating : Number((Math.random() * 0.4 + 4.5).toFixed(1))
        }));

        res.json(formattedHotels);
    } catch (err) {
        console.error('Hotel search error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get all hotels
router.get('/', async (req, res) => {
    try {
        const hotels = await Hotel.find().lean();
        const rooms = await Room.find({ hotelId: { $in: hotels.map(h => h._id) } }).lean();
        
        const hotelSubtypesMap = {};
        rooms.forEach(r => {
            const hid = r.hotelId.toString();
            if (!hotelSubtypesMap[hid]) hotelSubtypesMap[hid] = new Set();
            if (r.subType) hotelSubtypesMap[hid].add(r.subType);
        });

        const formatted = hotels.map(h => ({
            ...h,
            subTypes: Array.from(hotelSubtypesMap[h._id.toString()] || []),
            rating: (h.rating && h.rating > 0) ? h.rating : Number((Math.random() * 0.4 + 4.5).toFixed(1))
        }));
        res.json(formatted);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get single hotel
router.get('/:slug', async (req, res) => {
    try {
        const hotel = await Hotel.findOne({ slug: req.params.slug }).lean();
        if (!hotel) return res.status(404).json({ message: 'Hotel not found' });
        
        if (!hotel.rating || hotel.rating <= 0) {
            hotel.rating = Number((Math.random() * 0.4 + 4.5).toFixed(1));
        }
        res.json(hotel);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create hotel
router.post('/', async (req, res) => {
    const hotel = new Hotel(req.body);
    try {
        const newHotel = await hotel.save();
        res.status(201).json(newHotel);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update hotel
router.patch('/:id', async (req, res) => {
    try {
        const updatedHotel = await Hotel.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedHotel);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete hotel
router.delete('/:id', async (req, res) => {
    try {
        await Hotel.findByIdAndDelete(req.params.id);
        res.json({ message: 'Hotel deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
