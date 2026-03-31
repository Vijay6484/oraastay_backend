const mongoose = require('mongoose');

const guestDetailSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
}, { _id: false });

const packageBookingSchema = new mongoose.Schema({
    packageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Package',
        required: true,
    },
    packageTitle: {
        type: String,
        required: true,
    },
    checkInDate: {
        type: String,
        required: true,
    },
    checkOutDate: {
        type: String,
    },
    adults: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
    },
    children: {
        type: Number,
        default: 0,
    },
    guests: [guestDetailSchema],  // detailed info for each guest
    primaryGuestName: { type: String, required: true },
    primaryGuestEmail: { type: String, required: true },
    primaryGuestPhone: { type: String, required: true },
    totalGuests: { type: Number },  // adults + children
    amount: { type: Number },
    paymentStatus: {
        type: String,
        enum: ['success', 'failed', 'pending', ''],
        default: 'pending'
    },
    paymentTxnId: { type: String, default: null },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Cancelled'],
        default: 'Pending',
    },
    notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('PackageBooking', packageBookingSchema);
