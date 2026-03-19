const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phoneNumber: { type: String },
    role: { type: String, default: 'admin', enum: ['admin', 'manager', 'staff'] },
    status: { type: String, default: 'active', enum: ['active', 'inactive'] },
    permissions: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
