const express = require('express');
const router = express.Router();
const Package = require('../models/Package');
const { requireAuth, requireModuleAccess } = require('../middleware/auth');
const requirePackagesAdmin = [requireAuth, requireModuleAccess('packages')];

// Get all packages
router.get('/', async (req, res) => {
    try {
        const packages = await Package.find({ isActive: { $ne: false } }).sort({ createdAt: -1 });
        res.json(packages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all packages (admin - includes inactive)
router.get('/admin/all', ...requirePackagesAdmin, async (req, res) => {
    try {
        const packages = await Package.find().sort({ createdAt: -1 });
        res.json(packages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get single package by ID
router.get('/:id', async (req, res) => {
    try {
        const pkg = await Package.findById(req.params.id);
        if (!pkg) return res.status(404).json({ message: 'Package not found' });
        res.json(pkg);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create package
router.post('/', ...requirePackagesAdmin, async (req, res) => {
    const data = { ...req.body };
    delete data.subcategory;
    // Generate slug from title if missing
    if (!data.slug && data.title) {
        const baseSlug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        // Append a random hash to ensure uniqueness
        data.slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
    }

    const newPackage = new Package(data);
    try {
        const savedPackage = await newPackage.save();
        res.status(201).json(savedPackage);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update package
router.patch('/:id', ...requirePackagesAdmin, async (req, res) => {
    try {
        const updateData = { ...req.body };
        delete updateData.subcategory;
        const updatedPackage = await Package.findByIdAndUpdate(
            req.params.id,
            { $set: updateData, $unset: { subcategory: 1 } },
            { new: true }
        );
        if (!updatedPackage) return res.status(404).json({ message: 'Package not found' });
        res.json(updatedPackage);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete package
router.delete('/:id', ...requirePackagesAdmin, async (req, res) => {
    try {
        await Package.findByIdAndDelete(req.params.id);
        res.json({ message: 'Package deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
