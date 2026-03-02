const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true }, // e.g., "Adventure & Thrill"
    location: { type: String },
    price: { type: String },
    image: { type: String },
    description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Activity', ActivitySchema);
