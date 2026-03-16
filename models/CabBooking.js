const mongoose = require('mongoose');

const cabBookingSchema = new mongoose.Schema({
    guestName: {
        type: String,
        required: true,
    },
    guestPhone: {
        type: String,
        required: true,
    },
    tripType: {
        type: String,
        enum: ['roundtrip', 'oneway', 'local'],
        required: true,
    },
    pickup: {
        type: String,
        required: true,
    },
    drop: {
        type: String,
        required: true,
    },
    date: {
        type: String,
        required: true,
    },
    time: {
        type: String,
        required: true,
    },
    vehicle: {
        type: String,
        default: 'Looking for suitable vehicle'
    },
    guestEmail: { type: String },
    amount: { type: Number },
    selectedOption: { type: String }, // e.g. "Mumbai to Mahabaleshwar"
    paymentStatus: {
        type: String,
        enum: ['success', 'failed', 'pending', ''],
        default: 'pending'
    },
    paymentTxnId: { type: String, default: null },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Cancelled'],
        default: 'Pending'
    },
}, { timestamps: true });

module.exports = mongoose.model('CabBooking', cabBookingSchema);
