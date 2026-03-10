const mongoose = require('mongoose');

const PackageSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    duration: { type: String, required: true },  // e.g. "3 Days / 2 Nights"
    numDays: { type: Number, required: true, default: 1 },  // numeric days
    price: { type: String, required: true },  // e.g. "₹12,999"
    numericPrice: { type: Number },  // for sorting
    perPerson: { type: String },  // e.g. "per couple", "per person"
    description: { type: String },
    features: [{ type: String }],
    highlights: [{ type: String }],  // bullet highlights shown on detail page
    tag: { type: String },  // e.g. "Bestseller"
    images: [{ type: String }],  // multiple images
    image: { type: String },  // primary image (backward compat)
    category: { type: String, enum: ['Couple', 'Family', 'Group', 'Adventure'], default: 'Couple' },
    subcategory: {
        type: String,
        enum: [
            'Honeymoon Packages',
            'Family Tour Packages',
            'Weekend Packages',
            'Tour Package from Mumbai',
            'Tour Package from Pune'
        ]
    },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Package', PackageSchema);
