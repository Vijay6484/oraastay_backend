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
const Room = require('../models/Room');
const Hotel = require('../models/Hotel');
const {
    nightsBetween,
    computeHotelRoomBookingTotals,
    computeHotelAddonsSubtotal,
    DEFAULT_TAX_RATE,
} = require('../services/roomPricing');
const { computePackageBookingTotals } = require('../services/packagePricing');

function parseAddonIndexArray(v) {
    if (!Array.isArray(v)) return [];
    return v
        .map((x) => parseInt(x, 10))
        .filter((n) => Number.isInteger(n) && n >= 0);
}
const {
    sendCabBookingConfirmation,
    sendHotelBookingConfirmation,
    sendPackageBookingConfirmation,
} = require('../services/emailService');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://oraastay.com';

/**
 * Prefix for PayU surl/furl. Routes are mounted at /api/payments, so full path is …/api/payments/callback/…
 * Many deployments set API_BASE_URL like https://host/api (same as VITE_API_URL); appending /api again breaks callbacks.
 */
function payuCallbackApiPrefix() {
    const raw = (process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, '');
    return /\/api$/i.test(raw) ? raw : `${raw}/api`;
}
const PAYU_CALLBACK_API_PREFIX = payuCallbackApiPrefix();

/** PayU redirects with POST (form body); some clients may use GET — merge both. */
const payuCallbackParams = (req) => ({ ...req.query, ...req.body });

// Initiate cab payment
router.post('/initiate/cab', async (req, res) => {
    if (!isPayUConfigured()) {
        return res.status(503).json({ success: false, message: 'Payment gateway not configured' });
    }
    try {
        const { guestName, guestPhone, guestEmail, tripType, pickup, drop, date, time, vehicle, amount, subtotalBeforeTax } = req.body;
        if (!guestName || !guestPhone || !amount) {
            return res.status(400).json({ success: false, message: 'Missing required fields: guestName, guestPhone, amount' });
        }

        const paid = Number(amount);
        const subPre = subtotalBeforeTax != null ? Number(subtotalBeforeTax) : NaN;
        if (Number.isFinite(subPre) && subPre > 0) {
            const expected = subPre * (1 + DEFAULT_TAX_RATE);
            if (Math.abs(paid - expected) > 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment amount does not match quoted price with tax. Please refresh and try again.',
                });
            }
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
            amount: paid,
            status: 'Pending',
            paymentStatus: 'pending',
        });
        await booking.save();

        const txnId = `CAB${Date.now()}${booking._id.toString().slice(-6)}`;
        const params = createPaymentParams({
            txnId,
            amount: paid,
            productInfo: `Cab Booking - ${pickup} to ${drop}`,
            firstName: guestName,
            email: guestEmail || `${guestPhone}@booking.oraastay.com`,
            phone: guestPhone,
            udf1: 'cab',
            udf2: booking._id.toString(),
            surl: `${PAYU_CALLBACK_API_PREFIX}/payments/callback/success`,
            furl: `${PAYU_CALLBACK_API_PREFIX}/payments/callback/failure`,
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
        const {
            roomId,
            hotelId,
            guestName,
            guestEmail,
            guestPhone,
            checkInDate,
            checkOutDate,
            guests,
            totalAmount,
            discountAmount,
            specialRequests: rawSpecialRequests,
            selectedExtras: rawSelectedExtras,
            selectedFood: rawSelectedFood,
            selectedCabs: rawSelectedCabs,
        } = req.body;
        if (!roomId || !hotelId || !guestName || !guestEmail || !checkInDate || !checkOutDate || totalAmount == null) {
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

        const room = await Room.findById(roomId).lean();
        if (!room) {
            return res.status(400).json({ success: false, message: 'Room not found' });
        }
        if (String(room.hotelId) !== String(hotelId)) {
            return res.status(400).json({ success: false, message: 'Room does not belong to this property' });
        }

        const nights = nightsBetween(checkInDate, checkOutDate);
        const adults = Math.max(0, parseInt(guests?.adults, 10) || 0);
        const children = Math.max(0, parseInt(guests?.children, 10) || 0);
        const totals = computeHotelRoomBookingTotals({
            roomPrice: room.price,
            adultRate: room.adultRate,
            childRate: room.childRate,
            capacity: room.capacity,
            baseGuestsIncluded: room.baseGuestsIncluded,
            maxPersonsVilla: room.maxPersonsVilla,
            rooms: requestedRooms,
            nights,
            adults,
            children,
        });

        if (!totals.validGuestCount) {
            return res.status(400).json({
                success: false,
                message: `Guest count is invalid. Maximum ${totals.maxTotalGuests} guest(s) for this booking (up to ${totals.maxPerRoom} per unit). At least 1 adult is required.`,
            });
        }

        const hotelDoc = await Hotel.findById(hotelId).lean();
        const selectedExtras = parseAddonIndexArray(rawSelectedExtras);
        const selectedFood = parseAddonIndexArray(rawSelectedFood);
        const selectedCabs = parseAddonIndexArray(rawSelectedCabs);
        const headcount = adults + children;
        const addonCalc = computeHotelAddonsSubtotal({
            extraServices: hotelDoc?.extraServices || [],
            foodOptions: hotelDoc?.foodOptions || [],
            cabServices: hotelDoc?.cabServices || [],
            selectedExtras,
            selectedFood,
            selectedCabs,
            headcount,
            nights,
        });

        const combinedSubtotal = totals.subtotal + addonCalc.addonsSubtotal;
        const taxesOnCombined = combinedSubtotal * DEFAULT_TAX_RATE;
        const totalBeforeDiscount = combinedSubtotal + taxesOnCombined;

        const disc = Math.max(0, Number(discountAmount) || 0);
        if (disc > totalBeforeDiscount + 0.01) {
            return res.status(400).json({ success: false, message: 'Invalid discount amount' });
        }
        const expectedPay = Math.max(0, totalBeforeDiscount - disc);
        if (Math.abs(Number(totalAmount) - expectedPay) > 2) {
            return res.status(400).json({
                success: false,
                message: 'Payment amount does not match the current quote. Please refresh and try again.',
            });
        }

        let addonNotes = '';
        const es = hotelDoc?.extraServices || [];
        const fo = hotelDoc?.foodOptions || [];
        const cabs = hotelDoc?.cabServices || [];
        if (selectedExtras.length > 0) {
            const items = selectedExtras.map((i) => es[i]).filter(Boolean);
            if (items.length > 0) {
                addonNotes += `Extra Services: ${items.map((s) => `${s.title} (₹${s.price})`).join(', ')}. `;
            }
        }
        if (selectedFood.length > 0) {
            const items = selectedFood.map((i) => fo[i]).filter(Boolean);
            if (items.length > 0) {
                addonNotes += `Food Options: ${items.map((s) => `${s.title} (₹${s.price})`).join(', ')}. `;
            }
        }
        if (selectedCabs.length > 0) {
            const items = selectedCabs.map((i) => cabs[i]).filter(Boolean);
            if (items.length > 0) {
                addonNotes += `Cab (fixed): ${items.map((s) => `${s.title} (₹${s.price})`).join(', ')}. `;
            }
        }
        const userNotes = typeof rawSpecialRequests === 'string' ? rawSpecialRequests.trim() : '';
        const mergedSpecial = [addonNotes.trim(), userNotes].filter(Boolean).join('\n\n');

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
            specialRequests: mergedSpecial || undefined,
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
            surl: `${PAYU_CALLBACK_API_PREFIX}/payments/callback/success`,
            furl: `${PAYU_CALLBACK_API_PREFIX}/payments/callback/failure`,
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
            packageId,
            packageTitle,
            checkInDate,
            checkOutDate: reqCheckOutDate,
            adults,
            children,
            guests,
            primaryGuestName,
            primaryGuestEmail,
            primaryGuestPhone,
            totalGuests,
            notes,
            amount,
            selectedExtras: rawSelectedExtras,
            selectedFood: rawSelectedFood,
            selectedCabs: rawSelectedCabs,
        } = req.body;

        if (!packageId || !packageTitle || !checkInDate || !primaryGuestName || !primaryGuestEmail || !primaryGuestPhone || !amount) {
            return res.status(400).json({ success: false, message: 'Missing required fields including amount' });
        }

        const Package = require('../models/Package');
        const pkg = await Package.findById(packageId).lean();
        if (!pkg) {
            return res.status(400).json({ success: false, message: 'Package not found' });
        }

        let checkOutDate = reqCheckOutDate || '';
        if (!checkOutDate && checkInDate) {
            const numDays = pkg.numDays || 1;
            const inDate = new Date(checkInDate);
            if (!isNaN(inDate.getTime())) {
                const outDate = new Date(inDate);
                outDate.setDate(inDate.getDate() + (numDays - 1));
                checkOutDate = outDate.toISOString().split('T')[0];
            }
        }

        if (!checkOutDate) {
            return res.status(400).json({ success: false, message: 'Check-out date is required' });
        }

        const selectedExtras = parseAddonIndexArray(rawSelectedExtras);
        const selectedFood = parseAddonIndexArray(rawSelectedFood);
        const selectedCabs = parseAddonIndexArray(rawSelectedCabs);

        const quote = computePackageBookingTotals(pkg, {
            checkInDate,
            checkOutDate,
            adults: adults || 1,
            children: children || 0,
            selectedExtras,
            selectedFood,
            selectedCabs,
        });

        if (quote.error) {
            return res.status(400).json({ success: false, message: quote.error });
        }

        const paid = Number(amount);
        if (Math.abs(paid - quote.totalWithTax) > 2) {
            return res.status(400).json({
                success: false,
                message: 'Payment amount does not match the current quote (including tax). Please refresh and try again.',
            });
        }

        const booking = new PackageBooking({
            packageId,
            packageTitle,
            checkInDate,
            checkOutDate,
            adults: adults || 1,
            children: children || 0,
            guests: guests || [],
            primaryGuestName,
            primaryGuestEmail,
            primaryGuestPhone,
            totalGuests: totalGuests || (adults || 1) + (children || 0),
            notes,
            amount: paid,
            status: 'Pending',
            paymentStatus: 'pending',
        });
        await booking.save();

        const txnId = `PKG${Date.now()}${booking._id.toString().slice(-6)}`;
        const params = createPaymentParams({
            txnId,
            amount: paid,
            productInfo: `Package: ${packageTitle}`,
            firstName: primaryGuestName,
            email: primaryGuestEmail,
            phone: primaryGuestPhone || '9999999999',
            udf1: 'package',
            udf2: booking._id.toString(),
            surl: `${PAYU_CALLBACK_API_PREFIX}/payments/callback/success`,
            furl: `${PAYU_CALLBACK_API_PREFIX}/payments/callback/failure`,
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
            ).populate('roomId').populate({
                path: 'hotelId',
                populate: { path: 'managerId', select: 'email' }
            });
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

router.get('/booking-summary/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        let booking;

        if (type === 'cab') {
            booking = await CabBooking.findById(id);
        } else if (type === 'hotel') {
            booking = await RoomBooking.findById(id).populate('roomId').populate('hotelId');
        } else if (type === 'package') {
            booking = await PackageBooking.findById(id);
        } else {
            return res.status(400).json({ success: false, message: 'Invalid booking type' });
        }

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        res.json({ success: true, data: booking });
    } catch (err) {
        console.error('Error fetching booking summary:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Make sure to import all booking models at the top or inside the endpoint
router.get('/user-bookings/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        // Import necessary models
        const CabBooking = require('../models/CabBooking');
        const RoomBooking = require('../models/RoomBooking');
        const PackageBooking = require('../models/PackageBooking');

        const [cabs, rooms, packages] = await Promise.all([
            CabBooking.find({ guestEmail: email }).sort({ createdAt: -1 }).lean(),
            RoomBooking.find({ guestEmail: email }).populate('hotelId', 'name').populate('roomId', 'name').sort({ createdAt: -1 }).lean(),
            PackageBooking.find({ guestEmail: email }).populate('packageId', 'title').sort({ createdAt: -1 }).lean()
        ]);

        const formatBooking = (b, type) => ({
            _id: b._id,
            type: type,
            status: b.status,
            paymentStatus: b.paymentStatus,
            createdAt: b.createdAt,
            totalAmount: b.totalAmount || b.amount || 0,
            transactionId: b.paymentTxnId,
            referenceId: b.referenceId || b._id,
            details: type === 'cab' ? {
                pickup: b.pickup,
                drop: b.drop,
                date: b.date,
                vehicle: b.vehicle
            } : type === 'hotel' ? {
                hotelName: b.hotelId?.name || 'Hotel',
                checkIn: b.checkInDate,
                checkOut: b.checkOutDate
            } : {
                packageTitle: b.packageTitle || b.packageId?.title || 'Package',
                checkIn: b.checkInDate
            }
        });

        const allBookings = [
            ...cabs.map(b => formatBooking(b, 'cab')),
            ...rooms.map(b => formatBooking(b, 'hotel')),
            ...packages.map(b => formatBooking(b, 'package'))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({ success: true, data: allBookings });
    } catch (error) {
        console.error('Error fetching user bookings:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
