const mongoose = require('mongoose');

const CabSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "Toyota Innova"
    type: { type: String, enum: ['Sedan', 'SUV', 'Hatchback', 'Luxury'], required: true },
    pricePerKm: { type: Number },
    basePrice: { type: Number }, // For standard packages
    features: [{ type: String }], // e.g., "AC", "4 Seater"
    image: { type: String },
    available: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Cab', CabSchema);
