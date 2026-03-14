const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
    code: { type: String, required: true, uppercase: true, trim: true },
    discount: { type: Number, required: true, min: 0 },
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    minAmount: { type: Number, default: null },
    maxDiscount: { type: Number, default: null },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    expiryDate: { type: Date, required: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', default: null }, // null = all properties
}, { timestamps: true });

CouponSchema.index({ code: 1 });
CouponSchema.index({ hotelId: 1, active: 1 });

module.exports = mongoose.model('Coupon', CouponSchema);
