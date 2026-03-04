const express = require('express');
const router = express.Router();
const Hotel = require('../models/Hotel');
const Room = require('../models/Room');

// Utility to generate a slug
const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
};

// CREATE Accommodation (Hotel + Rooms)
router.post('/accommodations', async (req, res) => {
    try {
        const { propertyData, roomsData } = req.body;

        if (!propertyData || !propertyData.name) {
            return res.status(400).json({ message: 'Property data is required and must contain a name.' });
        }

        // Gather all amenities from property and rooms to combine them
        const propertyAmenities = propertyData.amenities || [];
        const roomAmenities = (roomsData || []).reduce((acc, room) => [...acc, ...(room.amenities || [])], []);

        // Combine into unique set
        const combinedAmenities = [...new Set([...propertyAmenities, ...roomAmenities])];

        const hotelData = {
            ...propertyData,
            slug: propertyData.slug || generateSlug(propertyData.name),
            amenities: combinedAmenities,
            // Fallbacks for mapping if frontend sends `address` instead of `location`
            location: propertyData.location || propertyData.address || 'Unknown Location',
        };

        const hotel = new Hotel(hotelData);
        const savedHotel = await hotel.save();

        const savedRooms = [];
        if (roomsData && Array.isArray(roomsData) && roomsData.length > 0) {
            for (const roomItem of roomsData) {
                const roomData = {
                    ...roomItem,
                    hotelId: savedHotel._id,
                };
                const room = new Room(roomData);
                const savedRoom = await room.save();
                savedRooms.push(savedRoom);
            }
        }

        res.status(201).json({
            message: 'Accommodation created successfully',
            hotel: savedHotel,
            rooms: savedRooms
        });
    } catch (error) {
        console.error('Error creating accommodation:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// GET all accommodations
router.get('/accommodations', async (req, res) => {
    try {
        const hotels = await Hotel.find().sort({ createdAt: -1 });

        // Map to an array of objects that the admin panel frontend expects
        // Admin panel expects items with id, name, type, description, price, capacity, rooms, available, features, images, address etc

        const formattedHotels = await Promise.all(hotels.map(async (hotel) => {
            // Count actual rooms or use inventory
            const rooms = await Room.find({ hotelId: hotel._id });

            return {
                id: hotel._id, // Map _id to id
                name: hotel.name,
                type: hotel.type || 'Hotel',
                description: hotel.description || '',
                price: hotel.price || 0,
                capacity: hotel.capacity || 2, // Dummy fallback if not in model
                rooms: hotel.inventory || rooms.length || 0,
                available: true,
                features: hotel.amenities || [],
                images: hotel.images || [],
                roomTypes: rooms.map(r => ({ id: r._id, name: r.name, type: r.type, inventory: r.inventory, price: r.price })),
                location: {
                    address: hotel.location || '',
                    coordinates: {
                        latitude: null,
                        longitude: null
                    }
                },
                package: {
                    name: null,
                    description: '',
                    images: [],
                    pricing: {
                        adult: '0',
                        child: '0',
                        maxGuests: 0
                    }
                },
                timestamps: {
                    createdAt: hotel.createdAt,
                    updatedAt: hotel.updatedAt
                }
            };
        }));

        // Return pagination wrapper expected by frontend
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

// GET accommodation by ID (with rooms)
router.get('/accommodations/:id', async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id);
        if (!hotel) return res.status(404).json({ message: 'Hotel not found' });

        const rooms = await Room.find({ hotelId: hotel._id });

        res.json({
            propertyData: {
                id: hotel._id,
                name: hotel.name,
                type: hotel.type,
                description: hotel.description,
                location: hotel.location,
                price: hotel.price,
                amenities: hotel.amenities,
                images: hotel.images,
                inventory: hotel.inventory,
            },
            roomsData: rooms
        });
    } catch (error) {
        console.error('Error fetching accommodation:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// UPDATE Accommodation
router.put('/accommodations/:id', async (req, res) => {
    try {
        const { propertyData, roomsData } = req.body;

        if (!propertyData) {
            return res.status(400).json({ message: 'Property data is required.' });
        }

        const hotel = await Hotel.findById(req.params.id);
        if (!hotel) return res.status(404).json({ message: 'Hotel not found' });

        // Re-calculate amenities
        const propertyAmenities = propertyData.amenities || [];
        const roomAmenities = (roomsData || []).reduce((acc, room) => [...acc, ...(room.amenities || [])], []);
        const combinedAmenities = [...new Set([...propertyAmenities, ...roomAmenities])];

        propertyData.amenities = combinedAmenities;
        propertyData.location = propertyData.location || propertyData.address || hotel.location;

        // Update hotel Document
        const updatedHotel = await Hotel.findByIdAndUpdate(req.params.id, propertyData, { new: true });

        // Handle rooms - easiest way: Delete existing and add new if roomsData provided
        if (roomsData) {
            await Room.deleteMany({ hotelId: updatedHotel._id });
            for (const roomItem of roomsData) {
                const roomData = {
                    ...roomItem,
                    hotelId: updatedHotel._id,
                };
                delete roomData._id; // Remove old IDs of updated
                const room = new Room(roomData);
                await room.save();
            }
        }

        res.json({ message: 'Accommodation updated successfully', hotel: updatedHotel });
    } catch (error) {
        console.error('Error updating accommodation:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// DELETE Accommodation
router.delete('/accommodations/:id', async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id);
        if (!hotel) return res.status(404).json({ message: 'Hotel not found' });

        await Room.deleteMany({ hotelId: hotel._id });
        await Hotel.findByIdAndDelete(req.params.id);

        res.json({ message: 'Accommodation deleted successfully' });
    } catch (error) {
        console.error('Error deleting accommodation:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// Additional info routes required by frontend
router.get('/users', (req, res) => res.json([]));
router.get('/cities', (req, res) => res.json([]));

module.exports = router;
