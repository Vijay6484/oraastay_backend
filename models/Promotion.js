const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema(
    {
        imageUrl: { type: String, required: true },
        title: { type: String, default: '' },
        link: { type: String, default: '/' },
        sortOrder: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Promotion', promotionSchema);
