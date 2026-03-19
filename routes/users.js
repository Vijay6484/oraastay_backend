const express = require('express');
const router = express.Router();
const User = require('../models/User');

/**
 * Legacy listing — passwords are never returned. Prefer POST /api/auth/login for authentication.
 */
router.get('/', async (req, res) => {
    try {
        const users = await User.find().select('-password').lean();
        res.json(users.map((u) => ({
            id: u._id,
            name: u.name,
            email: u.email,
            phoneNumber: u.phoneNumber,
            role: u.role,
            status: u.status,
            permissions: u.permissions || [],
        })));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
