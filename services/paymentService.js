const crypto = require('crypto');

const PAYU_KEY = process.env.PAYU_MERCHANT_KEY;
const PAYU_SALT = process.env.PAYU_SALT;
const PAYU_MODE = (process.env.PAYU_MODE || 'TEST').toUpperCase();
const PAYU_ENDPOINT = PAYU_MODE === 'LIVE'
    ? 'https://secure.payu.in/_payment'
    : 'https://test.payu.in/_payment';

const generateHash = (params) => {
    const hashString = [
        params.key,
        params.txnid,
        params.amount,
        params.productinfo,
        params.firstname,
        params.email,
        params.udf1 || '',
        params.udf2 || '',
        params.udf3 || '',
        params.udf4 || '',
        params.udf5 || '',
        '', '', '', '', '', '',
        PAYU_SALT,
    ].join('|');
    return crypto.createHash('sha512').update(hashString).digest('hex');
};

const createPaymentParams = ({ txnId, amount, productInfo, firstName, email, phone, udf1, udf2, surl, furl }) => {
    const params = {
        key: PAYU_KEY,
        txnid: txnId,
        amount: String(amount),
        productinfo: productInfo,
        firstname: firstName,
        email,
        phone: phone || '9999999999',
        surl,
        furl,
        udf1: udf1 || '',
        udf2: udf2 || '',
        udf3: '',
        udf4: '',
        udf5: '',
    };
    params.hash = generateHash(params);
    return params;
};

const getPaymentFormHtml = (params) => {
    const fields = Object.entries(params)
        .map(([k, v]) => `<input type="hidden" name="${k}" value="${String(v).replace(/"/g, '&quot;')}" />`)
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
};
