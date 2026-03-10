const mongoose = require('mongoose');

const TravelGuideSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: {
        type: String,
        required: true,
        enum: [
            'Best Time to Visit',
            'Things to Do',
            'Tourist Places',
            '2 Days Itinerary',
            'How to Reach'
        ]
    },
    image: { type: String },
    content: [{
        type: { type: String, enum: ['paragraph', 'heading', 'list'] },
        text: { type: String },
        items: [{ type: String }] // For list type
    }],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('TravelGuide', TravelGuideSchema);
