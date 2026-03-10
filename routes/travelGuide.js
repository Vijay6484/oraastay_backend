const express = require('express');
const router = express.Router();
const TravelGuide = require('../models/TravelGuide');

// Get all travel guide items
router.get('/', async (req, res) => {
    try {
        const items = await TravelGuide.find({ isActive: true });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get items by category
router.get('/category/:category', async (req, res) => {
    try {
        const items = await TravelGuide.find({ category: req.params.category, isActive: true });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get single item by slug
router.get('/:slug', async (req, res) => {
    try {
        const item = await TravelGuide.findOne({ slug: req.params.slug, isActive: true });
        if (!item) return res.status(404).json({ message: 'Item not found' });
        res.json(item);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin: Get all items (including inactive)
router.get('/admin/all', async (req, res) => {
    try {
        const items = await TravelGuide.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create item
router.post('/', async (req, res) => {
    const newItem = new TravelGuide(req.body);
    try {
        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update item
router.patch('/:id', async (req, res) => {
    try {
        const updatedItem = await TravelGuide.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete item
router.delete('/:id', async (req, res) => {
    try {
        await TravelGuide.findByIdAndDelete(req.params.id);
        res.json({ message: 'Item deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
