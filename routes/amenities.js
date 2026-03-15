const express = require('express');
const router = express.Router();
const Amenity = require('../models/Amenity');

// Public: list active amenities (for property form, website)
router.get('/amenities', async (req, res) => {
    try {
        const items = await Amenity.find({ active: true }).sort({ name: 1 }).lean();
        res.json(items.map((r) => ({
            id: r._id.toString(),
            name: r.name,
            icon: r.icon || 'wifi',
            active: !!r.active,
        })));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin: list all amenities
router.get('/admin/amenities', async (req, res) => {
    try {
        const items = await Amenity.find().sort({ name: 1 }).lean();
        res.json(items.map((r) => ({
            id: r._id.toString(),
            name: r.name,
            icon: r.icon || 'wifi',
            active: !!r.active,
        })));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin: create amenity
router.post('/admin/amenities', async (req, res) => {
    try {
        const { name, icon, active } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ message: 'Name is required' });
        const doc = new Amenity({
            name: name.trim(),
            icon: icon || 'wifi',
            active: active !== false,
        });
        await doc.save();
        res.status(201).json({
            id: doc._id.toString(),
            name: doc.name,
            icon: doc.icon,
            active: doc.active,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin: update amenity
router.put('/admin/amenities/:id', async (req, res) => {
    try {
        const { name, icon, active } = req.body;
        const update = {};
        if (name !== undefined) update.name = name.trim();
        if (icon !== undefined) update.icon = icon;
        if (active !== undefined) update.active = !!active;
        const doc = await Amenity.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!doc) return res.status(404).json({ message: 'Amenity not found' });
        res.json({
            id: doc._id.toString(),
            name: doc.name,
            icon: doc.icon,
            active: doc.active,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin: delete amenity
router.delete('/admin/amenities/:id', async (req, res) => {
    try {
        const doc = await Amenity.findByIdAndDelete(req.params.id);
        if (!doc) return res.status(404).json({ message: 'Amenity not found' });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
