const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mahabaleshwar_db';

async function seed() {
    await mongoose.connect(MONGODB_URI);

    // Create demo user
    const pswd = await bcrypt.hash('123456', 10);
    const existing = await User.findOne({ email: 'demo@admin.com' });
    if (!existing) {
        await User.create({
            name: 'Demo Admin',
            email: 'demo@admin.com',
            phoneNumber: '0000000000',
            password: pswd,
            role: 'admin'
        });
        console.log('Demo user created! Email: demo@admin.com, Password: 123456');
    } else {
        existing.password = pswd;
        await existing.save();
        console.log('Demo user updated! Email: demo@admin.com, Password: 123456');
    }

    mongoose.connection.close();
}

seed().catch(console.error);
