require('dotenv').config();
const { sendEmail } = require('../services/emailService');

async function test() {
    console.log('Testing SMTP Configuration:');
    console.log('Host:', process.env.SMTP_HOST);
    console.log('Port:', process.env.SMTP_PORT);
    console.log('User:', process.env.SMTP_USER);
    console.log('From:', process.env.SMTP_FROM || process.env.SMTP_USER);
    
    console.log('\nSending test email...');
    const result = await sendEmail({
        to: 'oraastay@gmail.com',
        subject: 'Test Email from Mahabaleshwarn Backend',
        html: `
            <h1>Test Email</h1>
            <p>If you are receiving this email, the SMTP configuration in your .env file is working correctly!</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
        `
    });

    if (result.sent) {
        console.log('✅ Email sent successfully!');
    } else {
        console.error('❌ Failed to send email.', result.error);
    }
}

test();
