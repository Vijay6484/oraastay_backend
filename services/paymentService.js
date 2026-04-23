const crypto = require('crypto');

const PAYU_KEY = (process.env.PAYU_MERCHANT_KEY || '').trim();
const PAYU_SALT = (process.env.PAYU_SALT || '').trim();
const PAYU_MODE = (process.env.PAYU_MODE || 'TEST').toUpperCase();
const PAYU_ENDPOINT = PAYU_MODE === 'LIVE'
    ? 'https://secure.payu.in/_payment'
    : 'https://test.payu.in/_payment';

/** PayU expects amount as a decimal string with two places (e.g. "10.00"). */
const formatAmountForPayU = (amount) => {
    const n = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/,/g, ''));
    if (Number.isNaN(n)) return '0.00';
    return n.toFixed(2);
};

/**
 * Hash input fields must be plain strings and must not contain pipe delimiters.
 * PayU uses "|" as the field separator, so a raw "|" inside a value corrupts hash layout.
 */
const normalizeHashField = (value) => String(value ?? '').replace(/\|/g, ' ').trim();

/**
 * Forward hash for hosted checkout — must match:
 * sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
 * (five empty segments between udf5 and salt — exactly "||||||" in the docs)
 */
const generatePaymentRequestHash = (params) => {
    const key = normalizeHashField(params.key);
    const txnid = normalizeHashField(params.txnid);
    const amount = normalizeHashField(params.amount);
    const productinfo = normalizeHashField(params.productinfo);
    const firstname = normalizeHashField(params.firstname);
    const email = normalizeHashField(params.email);
    const udf1 = normalizeHashField(params.udf1);
    const udf2 = normalizeHashField(params.udf2);
    const udf3 = normalizeHashField(params.udf3);
    const udf4 = normalizeHashField(params.udf4);
    const udf5 = normalizeHashField(params.udf5);
    const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${PAYU_SALT}`;
    return crypto.createHash('sha512').update(hashString, 'utf8').digest('hex');
};

/**
 * Validates PayU response per docs:
 * sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 * With additional_charges: sha512(additional_charges|SALT|status||||||...)
 */
const verifyPayUReverseHash = (params) => {
    if (!PAYU_SALT) return false;
    const received = (params.hash || '').toLowerCase();
    if (!received) return false;
    const salt = normalizeHashField(PAYU_SALT);
    const status = normalizeHashField(params.status);
    const udf5 = normalizeHashField(params.udf5);
    const udf4 = normalizeHashField(params.udf4);
    const udf3 = normalizeHashField(params.udf3);
    const udf2 = normalizeHashField(params.udf2);
    const udf1 = normalizeHashField(params.udf1);
    const email = normalizeHashField(params.email);
    const firstname = normalizeHashField(params.firstname);
    const productinfo = normalizeHashField(params.productinfo);
    const amount = normalizeHashField(params.amount != null ? String(params.amount) : '');
    const txnid = normalizeHashField(params.txnid);
    const key = normalizeHashField(params.key || PAYU_KEY);
    const additionalCharges = normalizeHashField(params.additionalCharges ?? params.additional_charges ?? '');
    let hashString;
    if (additionalCharges) {
        hashString = `${additionalCharges}|${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
    } else {
        hashString = `${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
    }
    const calculated = crypto.createHash('sha512').update(hashString, 'utf8').digest('hex');
    return calculated === received;
};

const createPaymentParams = ({ txnId, amount, productInfo, firstName, email, phone, udf1, udf2, surl, furl }) => {
    const amountStr = formatAmountForPayU(amount);
    const params = {
        key: normalizeHashField(PAYU_KEY),
        txnid: normalizeHashField(txnId),
        amount: amountStr,
        productinfo: normalizeHashField(productInfo),
        firstname: normalizeHashField(firstName),
        email: normalizeHashField(email),
        phone: normalizeHashField(phone || '9999999999'),
        surl: String(surl || ''),
        furl: String(furl || ''),
        udf1: normalizeHashField(udf1 || ''),
        udf2: normalizeHashField(udf2 || ''),
        udf3: '',
        udf4: '',
        udf5: '',
    };
    params.hash = generatePaymentRequestHash(params);
    return params;
};

const escapeHtmlAttr = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const getPaymentFormHtml = (params) => {
    const fields = Object.entries(params)
        .map(([k, v]) => `<input type="hidden" name="${escapeHtmlAttr(k)}" value="${escapeHtmlAttr(v)}" />`)
        .join('\n');
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Redirecting to PayU...</title></head>
<body>
<p>Redirecting to payment gateway...</p>
<form id="payuForm" method="post" action="${PAYU_ENDPOINT}">
${fields}
</form>
<script>document.getElementById('payuForm').submit();</script>
</body>
</html>`;
};

const isPayUConfigured = () => !!(PAYU_KEY && PAYU_SALT);

module.exports = {
    createPaymentParams,
    getPaymentFormHtml,
    isPayUConfigured,
    PAYU_ENDPOINT,
    formatAmountForPayU,
    verifyPayUReverseHash,
};
