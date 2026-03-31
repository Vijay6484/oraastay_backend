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

const escapeHtml = (s) => {
    if (s == null || s === '') return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};

const baseStyles = `
  body { font-family: Georgia, 'Times New Roman', serif; line-height: 1.55; color: #1a202c; margin: 0; padding: 0; background: #edf2f7; }
  .wrap { max-width: 640px; margin: 0 auto; padding: 24px 16px 40px; }
  .card { background: #fff; border-radius: 10px; box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08); overflow: hidden; }
  .head { background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); color: #fff; padding: 28px 24px; }
  .head h1 { margin: 0 0 8px; font-size: 22px; font-weight: 600; }
  .head p { margin: 0; opacity: 0.92; font-size: 14px; }
  .body { padding: 24px; }
  .section { margin-top: 20px; }
  .section h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: #718096; margin: 0 0 10px; font-weight: 600; }
  table.rows { width: 100%; border-collapse: collapse; font-size: 14px; }
  table.rows td { padding: 10px 0; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  table.rows td.label { color: #4a5568; width: 42%; font-weight: 600; }
  table.rows tr:last-child td { border-bottom: none; }
  .guest-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  .guest-table th, .guest-table td { padding: 8px 10px; text-align: left; border: 1px solid #e2e8f0; }
  .guest-table th { background: #f7fafc; color: #4a5568; font-weight: 600; }
  .foot { padding: 16px 24px 24px; font-size: 12px; color: #718096; border-top: 1px solid #e2e8f0; }
`;

const sendEmail = async ({ to, cc, bcc, subject, html }) => {
    const transport = initTransporter();
    if (!transport) return { sent: false, error: 'SMTP not configured' };
    try {
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            subject,
            html,
        };
        if (cc) mailOptions.cc = cc;
        if (bcc) mailOptions.bcc = bcc;

        await transport.sendMail(mailOptions);
        return { sent: true };
    } catch (err) {
        console.error('Email send error:', err);
        return { sent: false, error: err.message };
    }
};

const sendCabBookingConfirmation = async (booking, meta = {}) => {
    const { paymentRef = '', payuMode = '' } = meta;
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${baseStyles}</style></head>
<body>
<div class="wrap">
  <div class="card">
    <div class="head">
      <h1>Cab booking confirmed</h1>
      <p>Thank you — your payment was received.</p>
    </div>
    <div class="body">
      <p style="margin:0 0 16px;font-size:15px;">Dear ${escapeHtml(booking.guestName)},</p>
      <p style="margin:0 0 20px;color:#4a5568;">Your cab booking is confirmed. Summary below.</p>
      <div class="section">
        <h2>Trip & vehicle</h2>
        <table class="rows">
          <tr><td class="label">Booking reference</td><td>${escapeHtml(String(booking._id))}</td></tr>
          <tr><td class="label">Payment / PayU ref</td><td>${escapeHtml(paymentRef || '—')}</td></tr>
          ${payuMode ? `<tr><td class="label">Payment mode</td><td>${escapeHtml(payuMode)}</td></tr>` : ''}
          <tr><td class="label">Trip type</td><td>${escapeHtml(booking.tripType)}</td></tr>
          <tr><td class="label">Pickup</td><td>${escapeHtml(booking.pickup)}</td></tr>
          <tr><td class="label">Drop</td><td>${escapeHtml(booking.drop)}</td></tr>
          <tr><td class="label">Date</td><td>${escapeHtml(booking.date)}</td></tr>
          <tr><td class="label">Time</td><td>${escapeHtml(booking.time)}</td></tr>
          <tr><td class="label">Vehicle preference</td><td>${escapeHtml(booking.vehicle)}</td></tr>
        </table>
      </div>
      <div class="section">
        <h2>Your contact</h2>
        <table class="rows">
          <tr><td class="label">Phone</td><td>${escapeHtml(booking.guestPhone)}</td></tr>
          <tr><td class="label">Email</td><td>${escapeHtml(booking.guestEmail || '—')}</td></tr>
          <tr><td class="label">Amount paid</td><td>₹${escapeHtml(String(booking.amount ?? 0))}</td></tr>
        </table>
      </div>
    </div>
    <div class="foot">Questions? Reply to this email or call us. We look forward to hosting you.</div>
  </div>
</div>
</body>
</html>`;
    if (!booking.guestEmail) return { sent: false, error: 'No email provided' };
    return sendEmail({
        to: booking.guestEmail,
        cc: 'oraastay@gmail.com',
        subject: `Cab confirmed — ${booking._id}`,
        html,
    });
};

const sendHotelBookingConfirmation = async (booking, room, hotel, meta = {}) => {
    const { paymentRef = '', payuMode = '' } = meta;
    const g = booking.guests || {};
    const getHtml = (showPrice) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${baseStyles}</style></head>
<body>
<div class="wrap">
  <div class="card">
    <div class="head">
      <h1>Hotel booking confirmed</h1>
      <p>Your stay is confirmed — details inside.</p>
    </div>
    <div class="body">
      <p style="margin:0 0 16px;font-size:15px;">Dear ${escapeHtml(booking.guestName)},</p>
      <p style="margin:0 0 20px;color:#4a5568;">Thank you for booking with us. Here is your reservation summary.</p>
      <div class="section">
        <h2>Property & room</h2>
        <table class="rows">
          <tr><td class="label">Booking reference</td><td>${escapeHtml(String(booking._id))}</td></tr>
          <tr><td class="label">Payment / PayU ref</td><td>${escapeHtml(paymentRef || '—')}</td></tr>
          ${payuMode ? `<tr><td class="label">Payment mode</td><td>${escapeHtml(payuMode)}</td></tr>` : ''}
          <tr><td class="label">Hotel</td><td>${escapeHtml(hotel?.name || '—')}</td></tr>
          <tr><td class="label">Room</td><td>${escapeHtml(room?.name || '—')}</td></tr>
          <tr><td class="label">Check-in</td><td>${escapeHtml(booking.checkInDate)}</td></tr>
          <tr><td class="label">Check-out</td><td>${escapeHtml(booking.checkOutDate)}</td></tr>
        </table>
      </div>
      <div class="section">
        <h2>Guests & amounts</h2>
        <table class="rows">
          <tr><td class="label">Adults</td><td>${escapeHtml(String(g.adults ?? 0))}</td></tr>
          <tr><td class="label">Children</td><td>${escapeHtml(String(g.children ?? 0))}</td></tr>
          <tr><td class="label">Rooms</td><td>${escapeHtml(String(g.rooms ?? 1))}</td></tr>
          ${showPrice ? `<tr><td class="label">Total paid</td><td>₹${escapeHtml(String(booking.totalAmount ?? 0))}</td></tr>` : ''}
          ${(showPrice && booking.advanceAmount) ? `<tr><td class="label">Advance</td><td>₹${escapeHtml(String(booking.advanceAmount))}</td></tr>` : ''}
        </table>
      </div>
      <div class="section">
        <h2>Your contact</h2>
        <table class="rows">
          <tr><td class="label">Email</td><td>${escapeHtml(booking.guestEmail)}</td></tr>
          <tr><td class="label">Phone</td><td>${escapeHtml(booking.guestPhone || '—')}</td></tr>
        </table>
      </div>
      ${(booking.foodVeg || booking.foodNonVeg || booking.foodJain) ? `<div class="section"><h2>Meal preferences (counts)</h2><table class="rows">
          <tr><td class="label">Veg</td><td>${escapeHtml(String(booking.foodVeg || 0))}</td></tr>
          <tr><td class="label">Non-veg</td><td>${escapeHtml(String(booking.foodNonVeg || 0))}</td></tr>
          <tr><td class="label">Jain</td><td>${escapeHtml(String(booking.foodJain || 0))}</td></tr>
      </table></div>` : ''}
      ${booking.specialRequests ? `<div class="section"><h2>Special requests</h2><p style="margin:0;color:#2d3748;">${escapeHtml(booking.specialRequests)}</p></div>` : ''}
    </div>
    <div class="foot">Need to change dates? Contact us as soon as possible. See you in Mahabaleshwar.</div>
  </div>
</div>
</body>
</html>`;

    const bccList = ['oraastay@gmail.com'];
    
    const p1 = sendEmail({
        to: booking.guestEmail,
        bcc: bccList,
        subject: `Hotel confirmed — ${hotel?.name || 'Stay'} — ${booking._id}`,
        html: getHtml(true),
    });

    let p2 = Promise.resolve();
    if (hotel?.managerId?.email) {
        p2 = sendEmail({
            to: hotel.managerId.email,
            subject: `New Hotel Booking — ${hotel?.name || 'Stay'} — ${booking._id}`,
            html: getHtml(false),
        });
    }

    return Promise.all([p1, p2]);
};

const sendPackageBookingConfirmation = async (booking, meta = {}) => {
    const { paymentRef = '', payuMode = '' } = meta;
    const guestRows = Array.isArray(booking.guests) && booking.guests.length
        ? booking.guests.map((g, i) => `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(g.name)}</td>
            <td>${escapeHtml(g.email || '—')}</td>
            <td>${escapeHtml(g.phone || '—')}</td>
          </tr>`).join('')
        : '';
    const guestBlock = guestRows
        ? `<div class="section"><h2>Guest list</h2>
          <table class="guest-table"><thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th></tr></thead><tbody>${guestRows}</tbody></table></div>`
        : '';

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${baseStyles}</style></head>
<body>
<div class="wrap">
  <div class="card">
    <div class="head">
      <h1>Package booking confirmed</h1>
      <p>${escapeHtml(booking.packageTitle)}</p>
    </div>
    <div class="body">
      <p style="margin:0 0 16px;font-size:15px;">Dear ${escapeHtml(booking.primaryGuestName)},</p>
      <p style="margin:0 0 20px;color:#4a5568;">Your package is booked and paid. Details below.</p>
      <div class="section">
        <h2>Package & dates</h2>
        <table class="rows">
          <tr><td class="label">Booking reference</td><td>${escapeHtml(String(booking._id))}</td></tr>
          <tr><td class="label">Payment / PayU ref</td><td>${escapeHtml(paymentRef || '—')}</td></tr>
          ${payuMode ? `<tr><td class="label">Payment mode</td><td>${escapeHtml(payuMode)}</td></tr>` : ''}
          <tr><td class="label">Package</td><td>${escapeHtml(booking.packageTitle)}</td></tr>
          <tr><td class="label">Check-in date</td><td>${escapeHtml(booking.checkInDate)}</td></tr>
          ${booking.checkOutDate ? `<tr><td class="label">Check-out date</td><td>${escapeHtml(booking.checkOutDate)}</td></tr>` : ''}
          <tr><td class="label">Adults / children</td><td>${escapeHtml(String(booking.adults))} / ${escapeHtml(String(booking.children))}</td></tr>
          <tr><td class="label">Total guests</td><td>${escapeHtml(String(booking.totalGuests ?? ''))}</td></tr>
          <tr><td class="label">Amount paid</td><td>₹${escapeHtml(String(booking.amount ?? 0))}</td></tr>
        </table>
      </div>
      <div class="section">
        <h2>Primary contact</h2>
        <table class="rows">
          <tr><td class="label">Email</td><td>${escapeHtml(booking.primaryGuestEmail)}</td></tr>
          <tr><td class="label">Phone</td><td>${escapeHtml(booking.primaryGuestPhone)}</td></tr>
        </table>
      </div>
      ${guestBlock}
      ${booking.notes ? `<div class="section"><h2>Notes</h2><p style="margin:0;color:#2d3748;">${escapeHtml(booking.notes)}</p></div>` : ''}
    </div>
    <div class="foot">We will follow up if anything else is needed. Enjoy Mahabaleshwar.</div>
  </div>
</div>
</body>
</html>`;
    return sendEmail({
        to: booking.primaryGuestEmail,
        cc: 'oraastay@gmail.com',
        subject: `Package confirmed — ${booking.packageTitle} — ${booking._id}`,
        html,
    });
};

module.exports = {
    sendEmail,
    sendCabBookingConfirmation,
    sendHotelBookingConfirmation,
    sendPackageBookingConfirmation,
};
