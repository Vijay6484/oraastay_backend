const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    guestName: {
        type: String,
        required: true,
        trim: true
    },
    image: {
        type: String,
        default: 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg'
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        default: 5
    },
    review: {
        type: String,
        required: true
    },
    propertyName: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Rating', ratingSchema);
