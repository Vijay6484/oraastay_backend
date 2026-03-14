const nodemailer = require('nodemailer');

let transporter = null;

const initTransporter = () => {
    if (transporter) return transporter;
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
        console.warn('SMTP not configured. Emails will not be sent.');
        return null;
    }
    transporter = nodemailer.createTransport({
        host: host || 'smtp.gmail.com',
        port: parseInt(port || '587', 10),
        secure: port === '465',
        auth: { user, pass },
    });
    return transporter;
};

const sendEmail = async ({ to, subject, html }) => {
    const transport = initTransporter();
    if (!transport) return { sent: false, error: 'SMTP not configured' };
    try {
        await transport.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            subject,
            html,
        });
        return { sent: true };
    } catch (err) {
        console.error('Email send error:', err);
        return { sent: false, error: err.message };
    }
};

const sendCabBookingConfirmation = async (booking) => {
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;} h1{color:#1a365d;} .detail{background:#f7fafc;padding:12px;margin:8px 0;border-radius:6px;} .label{font-weight:bold;color:#4a5568;}</style></head>
<body>
<h1>Cab Booking Confirmed</h1>
<p>Dear ${booking.guestName},</p>
<p>Your cab booking has been confirmed. Here are the details:</p>
<div class="detail"><span class="label">Booking ID:</span> ${booking._id}</div>
<div class="detail"><span class="label">Trip Type:</span> ${booking.tripType}</div>
<div class="detail"><span class="label">Pickup:</span> ${booking.pickup}</div>
<div class="detail"><span class="label">Drop:</span> ${booking.drop}</div>
<div class="detail"><span class="label">Date:</span> ${booking.date}</div>
<div class="detail"><span class="label">Time:</span> ${booking.time}</div>
<div class="detail"><span class="label">Vehicle:</span> ${booking.vehicle}</div>
<div class="detail"><span class="label">Amount Paid:</span> ₹${booking.amount || 0}</div>
<p>Thank you for choosing us. For any queries, please contact us.</p>
</body>
</html>`;
    if (!booking.guestEmail) return { sent: false, error: 'No email provided' };
    return sendEmail({
        to: booking.guestEmail,
        subject: `Cab Booking Confirmed - ${booking._id}`,
        html,
    });
};

const sendHotelBookingConfirmation = async (booking, room, hotel) => {
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;} h1{color:#1a365d;} .detail{background:#f7fafc;padding:12px;margin:8px 0;border-radius:6px;} .label{font-weight:bold;color:#4a5568;}</style></head>
<body>
<h1>Hotel Booking Confirmed</h1>
<p>Dear ${booking.guestName},</p>
<p>Your room booking has been confirmed. Here are the details:</p>
<div class="detail"><span class="label">Booking ID:</span> ${booking._id}</div>
<div class="detail"><span class="label">Hotel:</span> ${hotel?.name || 'N/A'}</div>
<div class="detail"><span class="label">Room:</span> ${room?.name || 'N/A'}</div>
<div class="detail"><span class="label">Check-in:</span> ${booking.checkInDate}</div>
<div class="detail"><span class="label">Check-out:</span> ${booking.checkOutDate}</div>
<div class="detail"><span class="label">Guests:</span> ${booking.guests?.adults || 0} Adults, ${booking.guests?.children || 0} Children, ${booking.guests?.rooms || 1} Room(s)</div>
<div class="detail"><span class="label">Total Amount:</span> ₹${booking.totalAmount || 0}</div>
<p>Thank you for choosing us. For any queries, please contact us.</p>
</body>
</html>`;
    return sendEmail({
        to: booking.guestEmail,
        subject: `Hotel Booking Confirmed - ${booking._id}`,
        html,
    });
};

const sendPackageBookingConfirmation = async (booking) => {
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;} h1{color:#1a365d;} .detail{background:#f7fafc;padding:12px;margin:8px 0;border-radius:6px;} .label{font-weight:bold;color:#4a5568;}</style></head>
<body>
<h1>Package Booking Confirmed</h1>
<p>Dear ${booking.primaryGuestName},</p>
<p>Your package booking has been confirmed. Here are the details:</p>
<div class="detail"><span class="label">Booking ID:</span> ${booking._id}</div>
<div class="detail"><span class="label">Package:</span> ${booking.packageTitle}</div>
<div class="detail"><span class="label">Check-in Date:</span> ${booking.checkInDate}</div>
<div class="detail"><span class="label">Guests:</span> ${booking.adults} Adults, ${booking.children} Children (Total: ${booking.totalGuests})</div>
<div class="detail"><span class="label">Amount Paid:</span> ₹${booking.amount || 0}</div>
<p>Thank you for choosing us. For any queries, please contact us.</p>
</body>
</html>`;
    return sendEmail({
        to: booking.primaryGuestEmail,
        subject: `Package Booking Confirmed - ${booking._id}`,
        html,
    });
};

module.exports = {
    sendEmail,
    sendCabBookingConfirmation,
    sendHotelBookingConfirmation,
    sendPackageBookingConfirmation,
};
