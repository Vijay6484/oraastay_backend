const express = require('express');
const router = express.Router();
const Cab = require('../models/Cab');

// Get all cabs
router.get('/', async (req, res) => {
    try {
        const cabs = await Cab.find();
        res.json(cabs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create cab
router.post('/', async (req, res) => {
    const newCab = new Cab(req.body);
    try {
        const savedCab = await newCab.save();
        res.status(201).json(savedCab);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update cab
router.patch('/:id', async (req, res) => {
    try {
        const updatedCab = await Cab.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedCab);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete cab
router.delete('/:id', async (req, res) => {
    try {
        await Cab.findByIdAndDelete(req.params.id);
        res.json({ message: 'Cab deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
