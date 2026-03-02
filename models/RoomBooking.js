const mongoose = require('mongoose');

const RoomBookingSchema = new mongoose.Schema({
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    guestName: { type: String, required: true },
    guestEmail: { type: String, required: true },
    guestPhone: { type: String, required: true },
    checkInDate: { type: String, required: true }, // Format YYYY-MM-DD
    checkOutDate: { type: String, required: true },
    guests: {
        adults: { type: Number, default: 1 },
        rooms: { type: Number, default: 1 },
        children: { type: Number, default: 0 }
    },
    totalAmount: { type: Number, required: true },
    advanceAmount: { type: Number, default: 0 },
    foodVeg: { type: Number, default: 0 },
    foodNonVeg: { type: Number, default: 0 },
    foodJain: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Cancelled'],
        default: 'Pending'
    },
    paymentStatus: {
        type: String,
        enum: ['success', 'partial', 'failed', 'pending', 'expired', ''],
        default: 'pending'
    },
    paymentTxnId: { type: String, default: null },
    specialRequests: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('RoomBooking', RoomBookingSchema);
