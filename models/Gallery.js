const mongoose = require('mongoose');

const GallerySchema = new mongoose.Schema({
    image_url: { type: String, required: true },
    title: { type: String, default: '' },
    alt_text: { type: String, default: '' },
    description: { type: String, default: '' },
    category: { type: String, default: 'nature', enum: ['accommodation', 'activities', 'nature', 'lakeside'] },
    sort_order: { type: Number, default: 0 },
    active: { type: Number, default: 1 },
}, { timestamps: true });

module.exports = mongoose.model('Gallery', GallerySchema);
