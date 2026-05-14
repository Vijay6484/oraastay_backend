const mongoose = require('mongoose');

const HotelSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    location: { type: String, required: true },
    city: { type: String, default: '' },
    latitude: { type: Number },
    longitude: { type: Number },
    rating: { type: Number, default: () => Number((Math.random() * 0.4 + 4.5).toFixed(1)) },
    reviews: { type: Number, default: 0 },
    price: { type: Number, default: 1 },
    originalPrice: { type: Number },
    amenities: [{ type: String }],
    images: [{ type: String }], // Array of image URLs
    video: { type: String }, // Video URL
    featured: { type: Boolean, default: false },
    /** When false, property is hidden from public hotel listings and detail pages (admin can still manage). */
    websiteVisible: { type: Boolean, default: true },
    type: {
        type: String,
        enum: ['Villa', 'Cottage'],
        default: 'Villa'
    },
    /** Single bookable unit (synced to one Room document for checkout / availability) */
    unitName: { type: String, default: 'Standard' },
    unitType: { type: String, default: 'Standard' },
    unitSubType: { type: String, default: '' },
    unitDescription: { type: String, default: '' },
    adultRate: { type: Number, default: 0 },
    childRate: { type: Number, default: 0 },
    unitCapacity: {
        adults: { type: Number, default: 2 },
        children: { type: Number, default: 0 },
    },
    /** Total guests (adults + children) included in base nightly rate per unit; when >0, overrides split in unitCapacity for pricing */
    baseGuestsIncluded: { type: Number, default: 0 },
    /** Max total guests (adults + children) per booked unit; enforced on the website */
    maxPersonsVilla: { type: Number, default: 0 },
    unitAmenities: [{ type: String }],
    unitImages: [{ type: String }],
    inventory: { type: Number, default: 5 }, // Available rooms/units
    description: { type: String },
    rules: [{ type: String }],
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    /** Optional paid add-ons on the room booking page (same model as packages) */
    extraServices: [{
        title: { type: String, required: true },
        price: { type: Number, required: true },
    }],
    cabServices: [{
        title: { type: String, required: true },
        price: { type: Number, required: true },
    }],
    foodOptions: [{
        title: { type: String, required: true },
        price: { type: Number, required: true },
    }],
}, { timestamps: true });

module.exports = mongoose.model('Hotel', HotelSchema);
