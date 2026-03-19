const express = require('express');
const router = express.Router();
const Gallery = require('../models/Gallery');
const { requireAuth, requireModuleAccess } = require('../middleware/auth');
const requireGalleryAdmin = [requireAuth, requireModuleAccess('gallery')];

// Public: GET gallery images for website (e.g. Mahabaleshwar in Frames)
router.get('/gallery', async (req, res) => {
    try {
        const items = await Gallery.find({ active: 1 }).sort({ sort_order: 1, createdAt: -1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin: GET gallery list with optional category and search
router.get('/admin/gallery', ...requireGalleryAdmin, async (req, res) => {
    try {
        const { category, search, limit = 100, offset = 0 } = req.query;
        const filter = {};
        if (category && category !== 'all') filter.category = category;
        if (search) {
            filter.$or = [
                { title: new RegExp(search, 'i') },
                { alt_text: new RegExp(search, 'i') },
                { description: new RegExp(search, 'i') },
            ];
        }
        const [images, total] = await Promise.all([
            Gallery.find(filter).sort({ sort_order: 1, createdAt: -1 }).skip(Number(offset)).limit(Number(limit)).lean(),
            Gallery.countDocuments(filter),
        ]);
        const formatted = images.map((r) => ({
            id: r._id.toString(),
            image_url: r.image_url,
            title: r.title || '',
            alt_text: r.alt_text || '',
            description: r.description || '',
            category: r.category || 'nature',
            sort_order: r.sort_order,
            active: r.active,
            created_at: r.createdAt,
            updated_at: r.updatedAt,
        }));
        res.json({ images: formatted, total, limit: Number(limit), offset: Number(offset) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin: GET gallery stats
router.get('/admin/gallery/stats', ...requireGalleryAdmin, async (req, res) => {
    try {
        const total = await Gallery.countDocuments();
        const by_category = await Gallery.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $project: { category: '$_id', count: 1, _id: 0 } },
        ]);
        res.json({ total, by_category });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin: POST gallery (save image metadata after upload to PHP)
router.post('/admin/gallery/upload', ...requireGalleryAdmin, async (req, res) => {
    try {
        const { images, category, title, alt_text, description } = req.body;
        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'images array is required' });
        }
        const saved = [];
        for (const img of images) {
            const url = img.src || img.url || img.image_url;
            if (!url) continue;
            const doc = new Gallery({
                image_url: url,
                title: title || img.alt || '',
                alt_text: alt_text || img.alt || '',
                description: description || '',
                category: category || 'nature',
            });
            await doc.save();
            saved.push({
                id: doc._id.toString(),
                image_url: doc.image_url,
                title: doc.title,
                alt_text: doc.alt_text,
                description: doc.description,
                category: doc.category,
            });
        }
        res.status(201).json({ images: saved });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin: DELETE gallery image
router.delete('/admin/gallery/:id', ...requireGalleryAdmin, async (req, res) => {
    try {
        const doc = await Gallery.findByIdAndDelete(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Image not found' });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
