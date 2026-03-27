const express = require('express');
const router = express.Router();
const CabBooking = require('../models/CabBooking');
const RoomBooking = require('../models/RoomBooking');
const PackageBooking = require('../models/PackageBooking');
const {
    createPaymentParams,
    getPaymentFormHtml,
    isPayUConfigured,
    verifyPayUReverseHash,
} = require('../services/paymentService');
const { getRoomAvailability } = require('../services/roomAvailability');
const {
    sendCabBookingConfirmation,
    sendHotelBookingConfirmation,
    sendPackageBookingConfirmation,
} = require('../services/emailService');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://oraastay.com';
const API_BASE = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

/** PayU redirects with POST (form body); some clients may use GET — merge both. */
const payuCallbackParams = (req) => ({ ...req.query, ...req.body });

// Initiate cab payment
router.post('/initiate/cab', async (req, res) => {
    if (!isPayUConfigured()) {
        return res.status(503).json({ success: false, message: 'Payment gateway not configured' });
    }
    try {
        const { guestName, guestPhone, guestEmail, tripType, pickup, drop, date, time, vehicle, amount } = req.body;
        if (!guestName || !guestPhone || !amount) {
            return res.status(400).json({ success: false, message: 'Missing required fields: guestName, guestPhone, amount' });
        }

        const booking = new CabBooking({
            guestName,
            guestPhone,
            guestEmail: guestEmail || '',
            tripType: tripType || 'roundtrip',
            pickup: pickup || 'Pune',
            drop: drop || 'Mahabaleshwar',
            date: date || new Date().toISOString().split('T')[0],
            time: time || '09:00',
            vehicle: vehicle || 'Looking for suitable vehicle',
            amount,
            status: 'Pending',
            paymentStatus: 'pending',
        });
        await booking.save();

        const txnId = `CAB${Date.now()}${booking._id.toString().slice(-6)}`;
        const params = createPaymentParams({
            txnId,
            amount,
            productInfo: `Cab Booking - ${pickup} to ${drop}`,
            firstName: guestName,
            email: guestEmail || `${guestPhone}@booking.oraastay.com`,
            phone: guestPhone,
            udf1: 'cab',
            udf2: booking._id.toString(),
            surl: `${API_BASE}/api/payments/callback/success`,
            furl: `${API_BASE}/api/payments/callback/failure`,
        });

        res.setHeader('Content-Type', 'text/html');
        res.send(getPaymentFormHtml(params));
    } catch (err) {
        console.error('Cab payment initiate error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Initiate hotel/room payment
router.post('/initiate/hotel', async (req, res) => {
    if (!isPayUConfigured()) {
        return res.status(503).json({ success: false, message: 'Payment gateway not configured' });
    }
    try {
        const { roomId, hotelId, guestName, guestEmail, guestPhone, checkInDate, checkOutDate, guests, totalAmount } = req.body;
        if (!roomId || !hotelId || !guestName || !guestEmail || !checkInDate || !checkOutDate || !totalAmount) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const requestedRooms = guests?.rooms || 1;
        const availability = await getRoomAvailability({
            roomId,
            checkInDate,
            checkOutDate,
        });

        if (!availability?.success) {
            return res.status(400).json({ success: false, message: availability?.message || 'Unable to verify availability' });
        }

        if (requestedRooms > availability.data.minRemaining) {
            return res.status(409).json({
                success: false,
                message: `Only ${availability.data.minRemaining} room(s) available for the selected dates.`,
            });
        }

        const booking = new RoomBooking({
            roomId,
            hotelId,
            guestName,
            guestEmail,
            guestPhone: guestPhone || '',
            checkInDate,
            checkOutDate,
            guests: guests || { adults: 1, children: 0, rooms: 1 },
            totalAmount,
            advanceAmount: totalAmount,
            status: 'Pending',
            paymentStatus: 'pending',
        });
        await booking.save();

        const txnId = `HTL${Date.now()}${booking._id.toString().slice(-6)}`;
        const params = createPaymentParams({
            txnId,
            amount: totalAmount,
            productInfo: `Hotel Booking - ${checkInDate} to ${checkOutDate}`,
            firstName: guestName,
            email: guestEmail,
            phone: guestPhone || '9999999999',
            udf1: 'hotel',
            udf2: booking._id.toString(),
            surl: `${API_BASE}/api/payments/callback/success`,
            furl: `${API_BASE}/api/payments/callback/failure`,
        });

        res.setHeader('Content-Type', 'text/html');
        res.send(getPaymentFormHtml(params));
    } catch (err) {
        console.error('Hotel payment initiate error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Initiate package payment
router.post('/initiate/package', async (req, res) => {
    if (!isPayUConfigured()) {
        return res.status(503).json({ success: false, message: 'Payment gateway not configured' });
    }
    try {
        const {
            packageId, packageTitle, checkInDate, adults, children, guests,
            primaryGuestName, primaryGuestEmail, primaryGuestPhone, totalGuests, notes, amount,
        } = req.body;

        if (!packageId || !packageTitle || !checkInDate || !primaryGuestName || !primaryGuestEmail || !primaryGuestPhone || !amount) {
            return res.status(400).json({ success: false, message: 'Missing required fields including amount' });
        }

        const booking = new PackageBooking({
            packageId,
            packageTitle,
            checkInDate,
            adults: adults || 1,
            children: children || 0,
            guests: guests || [],
            primaryGuestName,
            primaryGuestEmail,
            primaryGuestPhone,
            totalGuests: totalGuests || (adults || 1) + (children || 0),
            notes,
            amount,
            status: 'Pending',
            paymentStatus: 'pending',
        });
        await booking.save();

        const txnId = `PKG${Date.now()}${booking._id.toString().slice(-6)}`;
        const params = createPaymentParams({
            txnId,
            amount,
            productInfo: `Package: ${packageTitle}`,
            firstName: primaryGuestName,
            email: primaryGuestEmail,
            phone: primaryGuestPhone || '9999999999',
            udf1: 'package',
            udf2: booking._id.toString(),
            surl: `${API_BASE}/api/payments/callback/success`,
            furl: `${API_BASE}/api/payments/callback/failure`,
        });

        res.setHeader('Content-Type', 'text/html');
        res.send(getPaymentFormHtml(params));
    } catch (err) {
        console.error('Package payment initiate error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

const handleSuccessCallback = async (req, res) => {
    const params = payuCallbackParams(req);
    const bookingType = params.udf1;
    const bookingId = params.udf2;
    const status = params.status;

    if (status !== 'success' || !bookingType || !bookingId) {
        return res.redirect(`${FRONTEND_URL}/payment/failure?reason=invalid`);
    }

    if (!verifyPayUReverseHash(params)) {
        console.error('PayU reverse hash verification failed for txn:', params.txnid);
        return res.redirect(`${FRONTEND_URL}/payment/failure?reason=hash_mismatch`);
    }

    const payRef = params.mihpayid || params.txnid || '';

    try {
        if (bookingType === 'cab') {
            const booking = await CabBooking.findByIdAndUpdate(
                bookingId,
                { status: 'Confirmed', paymentStatus: 'success', paymentTxnId: payRef },
                { new: true }
            );
            if (booking && booking.guestEmail) {
                await sendCabBookingConfirmation(booking, { paymentRef: payRef, payuMode: params.mode });
            }
        } else if (bookingType === 'hotel') {
            const booking = await RoomBooking.findByIdAndUpdate(
                bookingId,
                { status: 'Confirmed', paymentStatus: 'success', paymentTxnId: payRef },
                { new: true }
            ).populate('roomId').populate('hotelId');
            if (booking && booking.guestEmail) {
                await sendHotelBookingConfirmation(booking, booking.roomId, booking.hotelId, { paymentRef: payRef, payuMode: params.mode });
            }
        } else if (bookingType === 'package') {
            const booking = await PackageBooking.findByIdAndUpdate(
                bookingId,
                { status: 'Confirmed', paymentStatus: 'success', paymentTxnId: payRef },
                { new: true }
            );
            if (booking && booking.primaryGuestEmail) {
                await sendPackageBookingConfirmation(booking, { paymentRef: payRef, payuMode: params.mode });
            }
        }
    } catch (err) {
        console.error('Callback success handler error:', err);
    }
    res.redirect(`${FRONTEND_URL}/payment/success?type=${encodeURIComponent(bookingType)}&id=${encodeURIComponent(bookingId)}`);
};

// PayU success — browser POSTs form fields to surl (GET supported for testing)
router.get('/callback/success', handleSuccessCallback);
router.post('/callback/success', handleSuccessCallback);

const handleFailureCallback = (req, res) => {
    const params = payuCallbackParams(req);
    const bookingType = params.udf1 || '';
    const bookingId = params.udf2 || '';
    const reason = params.error_Message || params.error || params.unmappedstatus || 'payment_failed';
    res.redirect(`${FRONTEND_URL}/payment/failure?type=${encodeURIComponent(bookingType)}&id=${encodeURIComponent(bookingId)}&reason=${encodeURIComponent(String(reason))}`);
};

router.get('/callback/failure', handleFailureCallback);
router.post('/callback/failure', handleFailureCallback);

module.exports = router;
