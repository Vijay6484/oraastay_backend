require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mahabaleshwar_db';

// Middleware
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://oraastay.com',
    'https://oraastay.com',
    'http://www.oraastay.com',
    'https://www.oraastay.com',
    'http://admin.oraastay.com',
    'https://admin.oraastay.com'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
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
const userRoutes = require('./routes/users'); // Admin Auth

app.use('/api', ratingRoutes); // Mounts /api/admin/ratings and /api/ratings
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

