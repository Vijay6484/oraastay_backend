const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }

        const user = await User.findOne({
            $or: [{ email: email.trim().toLowerCase() }, { phoneNumber: email.trim() }],
        });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (user.status === 'inactive') {
            return res.status(403).json({ success: false, message: 'Account is inactive' });
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = signToken(user);
        return res.json({
            success: true,
            token,
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber || '',
                role: user.role,
                permissions: user.permissions || [],
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, message: 'Login failed' });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { name, email, phoneNumber, password } = req.body || {};
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email, and password required' });
        }

        const existing = await User.findOne({ email: email.trim().toLowerCase() });
        if (existing) {
            return res.status(409).json({ success: false, message: 'Email already registered' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = new User({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phoneNumber: phoneNumber || '',
            password: hashed,
            role: 'user', // Default role for app users
            status: 'active',
            permissions: [],
        });
        await user.save();

        const token = signToken(user);
        return res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber || '',
                role: user.role,
                permissions: user.permissions || [],
            },
        });
    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ success: false, message: 'Registration failed' });
    }
});

module.exports = router;
