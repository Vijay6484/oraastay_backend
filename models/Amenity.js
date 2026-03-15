const mongoose = require('mongoose');

const AmenitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    icon: { type: String, default: 'wifi' },
    active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Amenity', AmenitySchema);
