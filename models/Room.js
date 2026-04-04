const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    name: { type: String, required: true },
    type: { type: String, default: 'Standard' },
    subType: { type: String },
    description: { type: String },
    price: { type: Number, required: true },
    adultRate: { type: Number, default: 0 },
    childRate: { type: Number, default: 0 },
    capacity: {
        adults: { type: Number, default: 2 },
        children: { type: Number, default: 0 }
    },
    maxPersonsVilla: { type: Number, default: 0 },
    amenities: [{ type: String }],
    images: [{ type: String }], // Array of image URLs
    inventory: { type: Number, default: 1 } // Number of such rooms available
}, { timestamps: true });

module.exports = mongoose.model('Room', RoomSchema);
