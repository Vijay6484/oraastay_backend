const mongoose = require('mongoose');

const CabSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "Toyota Innova"
    type: { type: String, enum: ['Sedan', 'SUV', 'Hatchback', 'Luxury'], required: true },
    driverName: { type: String },
    driverPhone: { type: String },
    driverEmail: { type: String },
    // Legacy per-km pricing (no longer used in UI)
    pricePerKm: { type: Number },
    basePrice: { type: Number }, // For standard packages / legacy flows
    // Fixed prices for common routes/options
    mumbaiToMahabaleshwarPrice: { type: Number },
    puneToMahabaleshwarPrice: { type: Number },
    localSightseeingPrice: { type: Number },
    // Airport transfer prices: legacy single value + new from-specific values
    airportTransferPrice: { type: Number },
    airportTransferFromPunePrice: { type: Number },
    airportTransferFromMumbaiPrice: { type: Number },
    features: [{ type: String }], // e.g., "AC", "4 Seater"
    image: { type: String }, // Keep for backward compatibility
    images: [{ type: String }],
    // Legacy subcategory (header now links to unified cabs page)
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
