const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Hotel = require('../models/Hotel');
const Room = require('../models/Room');
const User = require('../models/User');
const {
    requireAuth,
    requireModuleAccess,
    assertManagerOwnsHotel,
} = require('../middleware/auth');
const { syncDefaultRoomForHotel } = require('../services/syncDefaultRoom');

const requireProperties = [requireAuth, requireModuleAccess('properties')];

// Utility to generate a slug
const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
};

function formatHotelResponse(hotel, rooms) {
    return {
        id: hotel._id,
        name: hotel.name,
        type: hotel.type || 'Villa',
        description: hotel.description || '',
        price: hotel.price || 0,
        capacity: hotel.unitCapacity?.adults ? hotel.unitCapacity.adults + (hotel.unitCapacity.children || 0) : 2,
        rooms: hotel.inventory || rooms.length || 0,
        available: true,
        features: hotel.amenities || [],
        rules: hotel.rules || [],
        images: hotel.images || [],
        managerId: hotel.managerId || null,
        roomTypes: rooms.map(r => ({ id: r._id, name: r.name, type: r.type, inventory: r.inventory, price: r.price })),
        location: {
            address: hotel.location || '',
            coordinates: { latitude: null, longitude: null }
        },
        package: {
            name: null,
            description: '',
            images: [],
            pricing: { adult: '0', child: '0', maxGuests: 0 }
        },
        timestamps: {
            createdAt: hotel.createdAt,
            updatedAt: hotel.updatedAt
        }
    };
}

// CREATE Accommodation (Hotel + Rooms)
router.post('/accommodations', ...requireProperties, async (req, res) => {
    try {
        const { propertyData } = req.body;

        if (!propertyData || !propertyData.name) {
            return res.status(400).json({ message: 'Property data is required and must contain a name.' });
        }

        const propertyAmenities = propertyData.amenities || [];
        const unitAmenities = propertyData.unitAmenities || [];
        const combinedAmenities = [...new Set([...propertyAmenities, ...unitAmenities])];

        const hotelData = {
            ...propertyData,
            slug: propertyData.slug || generateSlug(propertyData.name),
            amenities: combinedAmenities,
            location: propertyData.location || propertyData.address || 'Unknown Location',
        };

        delete hotelData._id;
        delete hotelData.id;
        delete hotelData.subcategory;

        if (req.authUser.role === 'manager') {
            hotelData.managerId = new mongoose.Types.ObjectId(req.authUser.id);
        } else if (req.authUser.role === 'admin' && propertyData.managerId) {
            hotelData.managerId = mongoose.Types.ObjectId.isValid(propertyData.managerId)
                ? new mongoose.Types.ObjectId(propertyData.managerId)
                : null;
        } else {
            hotelData.managerId = hotelData.managerId || null;
        }

        const hotel = new Hotel(hotelData);
        const savedHotel = await hotel.save();

        const syncedRoom = await syncDefaultRoomForHotel(savedHotel);

        res.status(201).json({
            message: 'Accommodation created successfully',
            hotel: savedHotel,
            rooms: syncedRoom ? [syncedRoom] : [],
        });
    } catch (error) {
        console.error('Error creating accommodation:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// GET all accommodations (scoped for managers)
router.get('/accommodations', ...requireProperties, async (req, res) => {
    try {
        const filter = {};
        if (req.authUser.role === 'manager') {
            filter.managerId = req.authUser.id;
        }

        const hotels = await Hotel.find(filter).sort({ createdAt: -1 });

        const formattedHotels = await Promise.all(hotels.map(async (hotel) => {
            const rooms = await Room.find({ hotelId: hotel._id });
            return formatHotelResponse(hotel, rooms);
        }));

        res.json({
            data: formattedHotels,
            pagination: {
                total: formattedHotels.length,
                totalPages: 1,
                currentPage: 1,
                perPage: formattedHotels.length || 10,
                hasNextPage: false,
                hasPrevPage: false
            }
        });
    } catch (error) {
        console.error('Error fetching accommodations:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// GET accommodation by ID
router.get('/accommodations/:id', ...requireProperties, async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id);
        if (!hotel) return res.status(404).json({ message: 'Hotel not found' });

        const allowed = await assertManagerOwnsHotel(req.authUser, hotel._id.toString());
        if (!allowed) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const rooms = await Room.find({ hotelId: hotel._id });

        res.json({
            propertyData: {
                id: hotel._id,
                name: hotel.name,
                type: hotel.type,
                description: hotel.description,
                location: hotel.location,
                city: hotel.city || '',
                price: hotel.price,
                amenities: hotel.amenities,
                rules: hotel.rules || [],
                images: hotel.images,
                video: hotel.video,
                inventory: hotel.inventory,
                managerId: hotel.managerId || null,
                unitName: hotel.unitName,
                unitType: hotel.unitType,
                unitSubType: hotel.unitSubType,
                unitDescription: hotel.unitDescription,
                adultRate: hotel.adultRate,
                childRate: hotel.childRate,
                unitCapacity: hotel.unitCapacity || { adults: 2, children: 0 },
                maxPersonsVilla: hotel.maxPersonsVilla ?? 0,
                unitAmenities: hotel.unitAmenities || [],
                unitImages: hotel.unitImages || [],
                latitude: hotel.latitude,
                longitude: hotel.longitude,
            },
            roomsData: rooms,
        });
    } catch (error) {
        console.error('Error fetching accommodation:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// UPDATE Accommodation
router.put('/accommodations/:id', ...requireProperties, async (req, res) => {
    try {
        const { propertyData } = req.body;

        if (!propertyData) {
            return res.status(400).json({ message: 'Property data is required.' });
        }

        const hotel = await Hotel.findById(req.params.id);
        if (!hotel) return res.status(404).json({ message: 'Hotel not found' });

        const allowed = await assertManagerOwnsHotel(req.authUser, hotel._id.toString());
        if (!allowed) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const propertyAmenities = propertyData.amenities || [];
        const unitAmenities = propertyData.unitAmenities || [];
        const combinedAmenities = [...new Set([...propertyAmenities, ...unitAmenities])];

        propertyData.amenities = combinedAmenities;
        propertyData.location = propertyData.location || propertyData.address || hotel.location;
        delete propertyData.subcategory;

        if (req.authUser.role === 'manager') {
            propertyData.managerId = hotel.managerId;
        } else if (req.authUser.role === 'admin' && propertyData.managerId !== undefined) {
            propertyData.managerId = propertyData.managerId && mongoose.Types.ObjectId.isValid(propertyData.managerId)
                ? new mongoose.Types.ObjectId(propertyData.managerId)
                : null;
        }

        const updatedHotel = await Hotel.findByIdAndUpdate(req.params.id, propertyData, { new: true });

        await syncDefaultRoomForHotel(updatedHotel);

        res.json({ message: 'Accommodation updated successfully', hotel: updatedHotel });
    } catch (error) {
        console.error('Error updating accommodation:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// DELETE Accommodation
router.delete('/accommodations/:id', ...requireProperties, async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id);
        if (!hotel) return res.status(404).json({ message: 'Hotel not found' });

        const allowed = await assertManagerOwnsHotel(req.authUser, hotel._id.toString());
        if (!allowed) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await Room.deleteMany({ hotelId: hotel._id });
        await Hotel.findByIdAndDelete(req.params.id);

        res.json({ message: 'Accommodation deleted successfully' });
    } catch (error) {
        console.error('Error deleting accommodation:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// Managers list for assigning properties (admin only — others get [])
router.get('/users', requireAuth, async (req, res) => {
    try {
        if (req.authUser.role !== 'admin') {
            return res.json([]);
        }
        const users = await User.find({ role: { $in: ['manager', 'admin'] } })
            .select('name email role _id')
            .lean();
        res.json(users.map((u) => ({
            id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
        })));
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

module.exports = router;
