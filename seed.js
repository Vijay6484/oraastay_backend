const path = require('path');
console.log('Current directory:', __dirname);
require('dotenv').config();
const mongoose = require('mongoose');

const Hotel = require(path.join(__dirname, 'models', 'Hotel.js'));
const Package = require(path.join(__dirname, 'models', 'Package.js'));
const Activity = require(path.join(__dirname, 'models', 'Activity.js'));
const Cab = require(path.join(__dirname, 'models', 'Cab.js'));
const Room = require(path.join(__dirname, 'models', 'Room.js'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mahabaleshwar_db';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected for seeding'))
    .catch(err => console.error(err));

const seedHotels = [
    {
        name: "Evershine Resort & Spa",
        slug: "evershine-resort-spa",
        location: "Near Venna Lake",
        rating: 4.8,
        reviews: 324,
        price: 5999,
        originalPrice: 7999,
        amenities: ["wifi", "parking", "breakfast", "restaurant"],
        featured: true,
        type: "Resort",
        images: ["/assets/hotel-1.jpg"]
    },
    {
        name: "The Valley View Heritage",
        slug: "the-valley-view-heritage",
        location: "Panchgani Road",
        rating: 4.6,
        reviews: 256,
        price: 8499,
        originalPrice: 10999,
        amenities: ["wifi", "parking", "breakfast", "restaurant"],
        type: "Hotel",
        images: ["/assets/hotel-2.jpg"]
    },
    {
        name: "Mountain Bliss Cottages",
        slug: "mountain-bliss-cottages",
        location: "Wilson Point",
        rating: 4.9,
        reviews: 189,
        price: 12999,
        originalPrice: 15999,
        amenities: ["wifi", "parking", "breakfast", "restaurant"],
        featured: true,
        type: "Villa",
        images: ["/assets/hotel-3.jpg"]
    }
];

const seedPackages = [
    {
        title: "Romantic Mahabaleshwar",
        slug: "romantic-mahabaleshwar",
        duration: "2 Nights / 3 Days",
        price: "₹12,999",
        perPerson: "per couple",
        description: "Perfect getaway for couples looking for romance and relaxation.",
        features: ["AC Sedan Car", "Welcome Drink", "Candle Light Dinner", "Flower Decoration", "Mapro Garden", "Venna Lake"],
        tag: "Bestseller",
        category: "Couple"
    },
    {
        title: "Family Fun Adventure",
        slug: "family-fun-adventure",
        duration: "3 Nights / 4 Days",
        price: "₹18,499",
        perPerson: "for family of 4",
        description: "Complete family package with activities for kids.",
        features: ["AC SUV", "Breakfast & Dinner", "Panchgani Sightseeing", "Velocity Park", "Strawberry Farm"],
        tag: "Popular",
        category: "Family"
    }
];

const seedActivities = [
    {
        name: "Paragliding",
        category: "Adventure & Thrill",
        location: "Harrison Folly Point",
        price: "From ₹2500"
    },
    {
        name: "Paddle Boating",
        category: "Lakes & Water",
        location: "Venna Lake",
        price: "From ₹500/hr"
    },
    {
        name: "Strawberry Picking",
        category: "Nature & Leisure",
        location: "Mapro / Local Farms",
        price: "Pay for what you pick"
    }
];

const seedCabs = [
    {
        name: "Toyota Etios",
        type: "Sedan",
        pricePerKm: 14,
        features: ["AC", "4 Seater", "Music System"]
    },
    {
        name: "Toyota Innova Crysta",
        type: "SUV",
        pricePerKm: 22,
        features: ["AC", "7 Seater", "Luxury Interiors"]
    }
];

const seedDB = async () => {
    try {
        await Hotel.deleteMany({});
        await Package.deleteMany({});
        await Activity.deleteMany({});
        await Cab.deleteMany({});
        await Room.deleteMany({}); // clearing rooms

        const insertedHotels = await Hotel.insertMany(seedHotels);
        await Package.insertMany(seedPackages);
        await Activity.insertMany(seedActivities);
        await Cab.insertMany(seedCabs);

        const roomTemplates = [
            {
                name: 'Standard AC Room',
                description: 'A comfortable and budget-friendly room with basic amenities.',
                priceOffset: -1500,
                capacity: { adults: 2, children: 1 },
                amenities: ['wifi', 'ac', 'tv', 'attached bathroom'],
                inventory: 8
            },
            {
                name: 'Deluxe Room',
                description: 'A cozy room with modern amenities.',
                priceOffset: 0,
                capacity: { adults: 2, children: 1 },
                amenities: ['wifi', 'ac', 'tv', 'room service', 'tea/coffee maker'],
                inventory: 5
            },
            {
                name: 'Valley View Room',
                description: 'Enjoy breathtaking views of the Mahabaleshwar valleys right from your window.',
                priceOffset: 2000,
                capacity: { adults: 2, children: 2 },
                amenities: ['wifi', 'ac', 'tv', 'room service', 'balcony', 'valley view', 'tea/coffee maker'],
                inventory: 4
            },
            {
                name: 'Family Suite',
                description: 'Spacious suite perfect for families, featuring a living area and multiple beds.',
                priceOffset: 4500,
                capacity: { adults: 4, children: 2 },
                amenities: ['wifi', 'ac', 'tv', 'room service', 'living area', 'mini fridge'],
                inventory: 3
            },
            {
                name: 'Honeymoon Suite',
                description: 'Romantic and luxurious suite with premium perks and a bathtub.',
                priceOffset: 6000,
                capacity: { adults: 2, children: 0 },
                amenities: ['wifi', 'ac', 'tv', 'minibar', 'balcony', 'bathtub', 'king bed'],
                inventory: 2
            }
        ];

        // Seed Rooms for each hotel
        for (const hotel of insertedHotels) {
            for (const template of roomTemplates) {
                await Room.create({
                    hotelId: hotel._id,
                    name: template.name,
                    description: template.description,
                    price: Math.max(1000, hotel.price + template.priceOffset), // ensure price doesn't go too low
                    capacity: template.capacity,
                    amenities: template.amenities,
                    images: hotel.images,
                    inventory: template.inventory
                });
            }
        }

        console.log('Database seeded successfully');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedDB();
