require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mahabaleshwar_db';

// Middleware — CORS (browser admin + main site + env extras)
const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://oraastay.com',
    'https://oraastay.com',
    'http://www.oraastay.com',
    'https://www.oraastay.com',
    'http://admin.oraastay.com',
    'https://admin.oraastay.com',
];

const envOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

/** https://oraastay.com, https://admin.oraastay.com, https://any.sub.oraastay.com */
function isOraastayOrigin(origin) {
    return /^https?:\/\/([a-z0-9-]+\.)*oraastay\.com$/i.test(origin);
}

app.use(cors({
    origin(origin, callback) {
        // Same-origin / server-to-server / curl (no Origin header)
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin) || isOraastayOrigin(origin)) {
            return callback(null, true);
        }
        console.warn('[CORS] Blocked origin:', origin);
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Database Connection
mongoose.connect(MONGODB_URI, {
    tls: true,
})
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Basic Route
app.get('/', (req, res) => {
    res.send('Mahabaleshwar Types API Running');
});

// Import Routes
const hotelRoutes = require('./routes/hotels');
const packageRoutes = require('./routes/packages');
const activityRoutes = require('./routes/activities');
const cabRoutes = require('./routes/cabs');
const cabBookingRoutes = require('./routes/cabBookings');
const roomRoutes = require('./routes/rooms');
const roomBookingRoutes = require('./routes/roomBookings');
const adminPropertyRoutes = require('./routes/adminProperties'); // NEW
const calendarRoutes = require('./routes/calendar'); // NEW
const adminBookingsRoutes = require('./routes/bookings');
const packageBookingRoutes = require('./routes/packageBookings');
const ratingRoutes = require('./routes/ratings'); // NEW
const userRoutes = require('./routes/users'); // Legacy user listing (no passwords)
const authRoutes = require('./routes/auth');
const adminUsersRoutes = require('./routes/adminUsers');
const travelGuideRoutes = require('./routes/travelGuide');
const paymentRoutes = require('./routes/payments');
const couponRoutes = require('./routes/coupons');
const couponPublicRoutes = require('./routes/couponPublic');
const dashboardRoutes = require('./routes/dashboard');
const galleryRoutes = require('./routes/gallery');
const amenitiesRoutes = require('./routes/amenities');

app.use('/api', ratingRoutes);
app.use('/api', galleryRoutes);
app.use('/api', amenitiesRoutes);
app.use('/api/dashboard', dashboardRoutes); // Mounts /api/admin/ratings and /api/ratings
app.use('/api/hotels', hotelRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/cabs', cabRoutes);
app.use('/api/cab-bookings', cabBookingRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/room-bookings', roomBookingRoutes);
app.use('/api/admin/properties', adminPropertyRoutes);
app.use('/api/admin/calendar', calendarRoutes);
app.use('/api/bookings', adminBookingsRoutes);
app.use('/api/package-bookings', packageBookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/travel-guide', travelGuideRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin/coupons', couponRoutes);
app.use('/api/coupons', couponPublicRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

