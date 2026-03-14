const express = require('express');
const router = express.Router();
const Rating = require('../models/Rating');

// GET all ratings for admin
router.get('/admin/ratings', async (req, res) => {
    try {
        const ratings = await Rating.find().sort({ createdAt: -1 });
        // Map to format expected by Admin Panel
        const formattedRatings = ratings.map(r => ({
            id: r._id,
            guestName: r.guestName,
            image: r.image,
            rating: r.rating,
            review: r.review,
            propertyName: r.propertyName,
            date: r.date,
            isActive: r.isActive
        }));
        res.json(formattedRatings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST a new rating
router.post('/admin/ratings', async (req, res) => {
    try {
        const newRating = new Rating({
            guestName: req.body.guestName,
            image: req.body.image || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg',
            rating: req.body.rating || 5,
            review: req.body.review,
            propertyName: req.body.propertyName,
            date: req.body.date || new Date()
        });

        const savedRating = await newRating.save();

        res.status(201).json({
            id: savedRating._id,
            guestName: savedRating.guestName,
            image: savedRating.image,
            rating: savedRating.rating,
            review: savedRating.review,
            propertyName: savedRating.propertyName,
            date: savedRating.date,
            isActive: savedRating.isActive
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PATCH - toggle isActive (show/hide on website)
router.patch('/admin/ratings/:id', async (req, res) => {
    try {
        const { isActive } = req.body;
        const rating = await Rating.findByIdAndUpdate(
            req.params.id,
            { isActive: isActive !== false },
            { new: true }
        );
        if (!rating) return res.status(404).json({ message: 'Rating not found' });
        res.json({
            id: rating._id,
            guestName: rating.guestName,
            image: rating.image,
            rating: rating.rating,
            review: rating.review,
            propertyName: rating.propertyName,
            date: rating.date,
            isActive: rating.isActive
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE a rating
router.delete('/admin/ratings/:id', async (req, res) => {
    try {
        const rating = await Rating.findByIdAndDelete(req.params.id);
        if (!rating) return res.status(404).json({ message: 'Rating not found' });
        res.json({ message: 'Rating deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET active ratings for public website
router.get('/ratings', async (req, res) => {
    try {
        // Find only active ratings
        const ratings = await Rating.find({ isActive: true }).sort({ createdAt: -1 });
        res.json(ratings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
