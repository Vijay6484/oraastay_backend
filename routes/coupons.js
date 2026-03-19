const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const { requireAuth, requireModuleAccess } = require('../middleware/auth');

router.use(requireAuth, requireModuleAccess('coupons'));

const formatCoupon = (c) => ({
    id: c._id,
    _id: c._id,
    name: c.code,
    code: c.code,
    discount: c.discount,
    discountType: c.discountType,
    minAmount: c.minAmount,
    maxDiscount: c.maxDiscount,
    usageLimit: c.usageLimit,
    usedCount: c.usedCount || 0,
    active: !!c.active,
    expiryDate: c.expiryDate,
    accommodationType: c.hotelId ? c.hotelId.toString() : 'all',
    hotelId: c.hotelId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
});

// GET all coupons (admin)
router.get('/', async (req, res) => {
    try {
        const search = req.query.search;
        const query = {};
        if (search) {
            query.code = new RegExp(search, 'i');
        }
        const coupons = await Coupon.find(query).populate('hotelId', 'name').sort({ createdAt: -1 });
        res.json({ success: true, data: coupons.map(formatCoupon) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST create coupon (admin)
router.post('/', async (req, res) => {
    try {
        const { code, discount, discountType, minAmount, maxDiscount, usageLimit, active, expiryDate, accommodationType } = req.body;
        if (!code || discount == null) {
            return res.status(400).json({ success: false, message: 'Code and discount are required' });
        }

        const existing = await Coupon.findOne({ code: code.trim().toUpperCase() });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Coupon code already exists' });
        }

        const hotelId = accommodationType && accommodationType !== 'all' ? accommodationType : null;

        const coupon = new Coupon({
            code: code.trim().toUpperCase(),
            discount: Number(discount),
            discountType: discountType || 'percentage',
            minAmount: minAmount ? Number(minAmount) : null,
            maxDiscount: maxDiscount ? Number(maxDiscount) : null,
            usageLimit: usageLimit ? Number(usageLimit) : null,
            active: active !== false,
            expiryDate: new Date(expiryDate),
            hotelId,
        });
        await coupon.save();
        res.json({ success: true, data: formatCoupon(coupon), message: 'Coupon created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT update coupon (admin)
router.put('/:id', async (req, res) => {
    try {
        const { code, discount, discountType, minAmount, maxDiscount, usageLimit, active, expiryDate, accommodationType } = req.body;
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });

        if (code) coupon.code = code.trim().toUpperCase();
        if (discount != null) coupon.discount = Number(discount);
        if (discountType) coupon.discountType = discountType;
        coupon.minAmount = minAmount ? Number(minAmount) : null;
        coupon.maxDiscount = maxDiscount ? Number(maxDiscount) : null;
        coupon.usageLimit = usageLimit ? Number(usageLimit) : null;
        if (typeof active === 'boolean') coupon.active = active;
        if (expiryDate) coupon.expiryDate = new Date(expiryDate);
        coupon.hotelId = accommodationType && accommodationType !== 'all' ? accommodationType : null;

        await coupon.save();
        res.json({ success: true, data: formatCoupon(coupon), message: 'Coupon updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH toggle coupon (admin)
router.patch('/:id/toggle', async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndUpdate(
            req.params.id,
            { $set: { active: req.body.active ?? true } },
            { new: true }
        );
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
        res.json({ success: true, data: formatCoupon(coupon), message: 'Coupon status updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE coupon (admin)
router.delete('/:id', async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
        res.json({ success: true, message: 'Coupon deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
