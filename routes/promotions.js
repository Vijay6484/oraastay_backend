const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Promotion = require('../models/Promotion');
const { requireAuth, requireModuleAccess } = require('../middleware/auth');

const requirePromotionsAdmin = [requireAuth, requireModuleAccess('home_promotions')];

function toPublic(doc) {
    return {
        id: doc._id.toString(),
        image: doc.imageUrl,
        title: doc.title || 'Offer',
        link: doc.link || '/',
    };
}

function toAdmin(doc) {
    return {
        id: doc._id.toString(),
        imageUrl: doc.imageUrl,
        title: doc.title || '',
        link: doc.link || '/',
        sortOrder: doc.sortOrder ?? 0,
        isActive: doc.isActive !== false,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}

/** Public: homepage Exclusive Offers slider (no auth) */
router.get('/promotions', async (req, res) => {
    try {
        const list = await Promotion.find({ isActive: true })
            .sort({ sortOrder: 1, createdAt: -1 })
            .lean();
        res.json(list.map(toPublic));
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: e.message });
    }
});

/** Admin/staff (with home_promotions): list all */
router.get('/admin/promotions', ...requirePromotionsAdmin, async (req, res) => {
    try {
        const list = await Promotion.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
        res.json(list.map(toAdmin));
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

router.post('/admin/promotions', ...requirePromotionsAdmin, async (req, res) => {
    try {
        const { imageUrl, title, link, sortOrder, isActive } = req.body;
        if (!imageUrl || !String(imageUrl).trim()) {
            return res.status(400).json({ message: 'imageUrl is required' });
        }
        const doc = await Promotion.create({
            imageUrl: String(imageUrl).trim(),
            title: title != null ? String(title).trim() : '',
            link: link != null && String(link).trim() ? String(link).trim() : '/',
            sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
            isActive: isActive !== false,
        });
        res.status(201).json(toAdmin(doc.toObject()));
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

router.put('/admin/promotions/:id', ...requirePromotionsAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid id' });
        }
        const { imageUrl, title, link, sortOrder, isActive } = req.body;
        const update = {};
        if (imageUrl !== undefined) update.imageUrl = String(imageUrl).trim();
        if (title !== undefined) update.title = String(title).trim();
        if (link !== undefined) update.link = String(link).trim() || '/';
        if (sortOrder !== undefined) update.sortOrder = Number(sortOrder) || 0;
        if (isActive !== undefined) update.isActive = !!isActive;
        const doc = await Promotion.findByIdAndUpdate(id, update, { new: true }).lean();
        if (!doc) return res.status(404).json({ message: 'Not found' });
        res.json(toAdmin(doc));
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

router.delete('/admin/promotions/:id', ...requirePromotionsAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid id' });
        }
        const deleted = await Promotion.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: 'Not found' });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

module.exports = router;
