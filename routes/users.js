const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET all users (needed by AuthContext.tsx for login mapping)
router.get('/', async (req, res) => {
    try {
        const users = await User.find();
        // Return .id property mapping for AuthContext
        res.json(users.map(u => ({
            id: u._id,
            name: u.name,
            email: u.email,
            phoneNumber: u.phoneNumber,
            password: u.password,
            role: u.role
        })));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
