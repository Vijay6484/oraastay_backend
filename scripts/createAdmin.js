/**
 * Create or reset the default admin user (bcrypt password on server).
 *
 * Usage:
 *   cd backend && npm run create-admin
 *
 * Set in .env (recommended):
 *   ADMIN_SEED_EMAIL=you@example.com
 *   ADMIN_SEED_PASSWORD=YourStrongPassword
 *   ADMIN_SEED_NAME=Admin Name
 *
 * If ADMIN_SEED_PASSWORD is omitted, a dev-only default is used (printed to console).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mahabaleshwar_db';
const email = (process.env.ADMIN_SEED_EMAIL || 'admin@oraastay.local').trim().toLowerCase();
const password = process.env.ADMIN_SEED_PASSWORD || 'Admin@2026!';
const name = (process.env.ADMIN_SEED_NAME || 'Super Admin').trim();

async function main() {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    const hashed = await bcrypt.hash(password, 10);

    let user = await User.findOne({ email });
    if (user) {
        user.name = name;
        user.password = hashed;
        user.role = 'admin';
        user.status = 'active';
        user.permissions = [];
        await user.save();
        console.log('Updated existing user to admin:', email);
    } else {
        await User.create({
            name,
            email,
            password: hashed,
            phoneNumber: process.env.ADMIN_SEED_PHONE || '',
            role: 'admin',
            status: 'active',
            permissions: [],
        });
        console.log('Created admin user:', email);
    }

    console.log('\n--- Login (admin panel) ---');
    console.log('Email:   ', email);
    console.log('Password:', process.env.ADMIN_SEED_PASSWORD ? '(value from ADMIN_SEED_PASSWORD in .env)' : password);
    if (!process.env.ADMIN_SEED_PASSWORD) {
        console.log('\n⚠️  Using default dev password. Set ADMIN_SEED_PASSWORD in .env and run again for production.');
    }
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
