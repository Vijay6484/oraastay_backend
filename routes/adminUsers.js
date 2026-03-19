const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireAdmin);

function formatUser(u) {
    if (!u) return null;
    return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        phoneNumber: u.phoneNumber || '',
        role: u.role,
        status: u.status || 'active',
        permissions: u.permissions || [],
    };
}

router.get('/', async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 }).select('-password').lean();
        res.json(users.map((u) => formatUser(u)));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid user id' });
        }
        const u = await User.findById(req.params.id).select('-password').lean();
        if (!u) return res.status(404).json({ message: 'User not found' });
        res.json(formatUser(u));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            name,
            email,
            phoneNumber,
            role = 'staff',
            status = 'active',
            password,
            permissions = [],
        } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        const existing = await User.findOne({ email: email.trim().toLowerCase() });
        if (existing) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = new User({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phoneNumber: phoneNumber || '',
            password: hashed,
            role: ['admin', 'manager', 'staff'].includes(role) ? role : 'staff',
            status: status === 'inactive' ? 'inactive' : 'active',
            permissions: role === 'staff' && Array.isArray(permissions) ? permissions : [],
        });
        await user.save();
        res.status(201).json(formatUser(user));
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid user id' });
        }
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const {
            name,
            email,
            phoneNumber,
            role,
            status,
            password,
            permissions,
        } = req.body;

        if (name !== undefined) user.name = name.trim();
        if (email !== undefined) user.email = email.trim().toLowerCase();
        if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
        if (role !== undefined && ['admin', 'manager', 'staff'].includes(role)) user.role = role;
        if (status !== undefined) user.status = status === 'inactive' ? 'inactive' : 'active';
        if (password && String(password).length > 0) {
            user.password = await bcrypt.hash(password, 10);
        }
        if (permissions !== undefined) {
            user.permissions = user.role === 'staff' && Array.isArray(permissions) ? permissions : [];
        }

        await user.save();
        res.json(formatUser(user));
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid user id' });
        }
        const deleted = await User.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'User not found' });
        res.json({ success: true, message: 'User deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
