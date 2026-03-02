const mongoose = require('mongoose');

const blockedDateSchema = new mongoose.Schema({
    accommodation_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hotel',
        required: true,
    },
    room_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        default: null, // Null means it applies to entire accommodation or there are no specific room types
    },
    rooms: {
        type: Number,
        default: null, // If null, applies to all rooms or the base parent Accommodation
    },
    blocked_date: {
        type: String, // Stored as 'YYYY-MM-DD' cleanly
        required: true,
    },
    reason: {
        type: String,
        default: null,
    },
    adult_price: {
        type: Number,
        default: null,
    },
    child_price: {
        type: Number,
        default: null,
    },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

module.exports = mongoose.model('BlockedDate', blockedDateSchema);
