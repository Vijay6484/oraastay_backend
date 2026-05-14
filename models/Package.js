const mongoose = require('mongoose');

const PackageSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    duration: { type: String, required: true },  // e.g. "3 Days / 2 Nights"
    numDays: { type: Number, required: true, default: 1 },  // numeric days
    price: { type: String, default: '' },  // legacy display; package totals use selected hotel rates
    numericPrice: { type: Number },  // legacy / optional sorting
    perPerson: { type: String },  // legacy optional label
    description: { type: String },
    features: [{ type: String }],
    extraServices: [{
        title: { type: String, required: true },
        price: { type: Number, required: true }
    }],
    cabServices: [{
        title: { type: String, required: true },
        price: { type: Number, required: true }
    }],
    foodOptions: [{
        title: { type: String, required: true },
        price: { type: Number, required: true }
    }],
    highlights: [{ type: String }],  // bullet highlights shown on detail page
    tag: { type: String },  // e.g. "Bestseller"
    images: [{ type: String }],  // multiple images
    image: { type: String },  // primary image (backward compat)
    category: { type: String, enum: ['Couple', 'Family', 'Group', 'Adventure'], default: 'Couple' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Package', PackageSchema);
