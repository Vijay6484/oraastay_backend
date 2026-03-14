const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');

// GET applicable coupons for a hotel and amount (website)
router.get('/', async (req, res) => {
    try {
        const { hotelId, amount } = req.query;
        const amt = parseFloat(amount) || 0;

        const query = {
            active: true,
            expiryDate: { $gt: new Date() },
        };

        if (hotelId) {
            query.$or = [{ hotelId }, { hotelId: null }];
        } else {
            query.hotelId = null;
        }

        const coupons = await Coupon.find(query).populate('hotelId', 'name').sort({ discount: -1 });

        const applicable = coupons.filter((c) => {
            if (c.usageLimit != null && c.usedCount >= c.usageLimit) return false;
            if (c.minAmount != null && amt < c.minAmount) return false;
            return true;
        });

        res.json(applicable.map((c) => ({
            _id: c._id,
            code: c.code,
            discount: c.discount,
            discountType: c.discountType,
            minAmount: c.minAmount,
            maxDiscount: c.maxDiscount,
            description: c.discountType === 'percentage'
                ? `${c.discount}% off${c.minAmount ? ` on orders above ₹${c.minAmount}` : ''}`
                : `₹${c.discount} off${c.minAmount ? ` on orders above ₹${c.minAmount}` : ''}`,
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// POST validate and apply coupon
router.post('/validate', async (req, res) => {
    try {
        const { code, hotelId, amount } = req.body;
        if (!code || !amount) {
            return res.status(400).json({ success: false, message: 'Code and amount are required' });
        }

        const coupon = await Coupon.findOne({
            code: code.trim().toUpperCase(),
            active: true,
            expiryDate: { $gt: new Date() },
        }).populate('hotelId', 'name');

        if (!coupon) {
            return res.json({ success: false, message: 'Invalid or expired coupon' });
        }

        if (coupon.hotelId && hotelId && coupon.hotelId._id.toString() !== hotelId) {
            return res.json({ success: false, message: 'This coupon is not valid for this property' });
        }

        if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
            return res.json({ success: false, message: 'Coupon usage limit reached' });
        }

        if (coupon.minAmount != null && amount < coupon.minAmount) {
            return res.json({ success: false, message: `Minimum order amount is ₹${coupon.minAmount}` });
        }

        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (amount * coupon.discount) / 100;
            if (coupon.maxDiscount != null) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
        } else {
            discountAmount = Math.min(coupon.discount, amount);
        }

        res.json({
            success: true,
            discountAmount,
            finalAmount: Math.max(0, amount - discountAmount),
            coupon: {
                _id: coupon._id,
                code: coupon.code,
                discount: coupon.discount,
                discountType: coupon.discountType,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
