const mongoose = require('mongoose');

const CabSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "Toyota Innova"
    type: { type: String, enum: ['Sedan', 'SUV', 'Hatchback', 'Luxury'], required: true },
    pricePerKm: { type: Number },
    basePrice: { type: Number }, // For standard packages
    features: [{ type: String }], // e.g., "AC", "4 Seater"
    image: { type: String }, // Keep for backward compatibility
    images: [{ type: String }],
    subcategory: {
        type: String,
        enum: [
            'Mumbai to Mahabaleshwar',
            'Pune to Mahabaleshwar',
            'Local Sightseeing',
            'Airport Transfer'
        ]
    },
    available: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Cab', CabSchema);
