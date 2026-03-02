const mongoose = require('mongoose');

const HotelSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    location: { type: String, required: true },
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    amenities: [{ type: String }],
    images: [{ type: String }], // Array of image URLs
    featured: { type: Boolean, default: false },
    type: {
        type: String,
        enum: ['Hotel', 'Resort', 'Villa'],
        default: 'Hotel'
    },
    inventory: { type: Number, default: 5 }, // Available rooms/units
    description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Hotel', HotelSchema);
