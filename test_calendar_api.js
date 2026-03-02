const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5001/api/admin/calendar';
let createdId = null;

async function runTests() {
    try {
        console.log('--- Testing /blocked-dates POST ---');
        // This simulates picking "Property A", choosing tomorrow and sending arbitrary limits
        const postData = {
            dates: ['2026-03-01', '2026-03-02'],
            reason: 'High Season Pricing',
            accommodation_id: '60c72b2f9b1d8b3a2c8e4d10', // Fake Object Id
            room_number: null,
            adult_price: 3500,
            child_price: 1500
        };

        const postRes = await fetch(`${BASE_URL}/blocked-dates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });
        const postJson = await postRes.json();
        console.log('POST Response:', postJson);

        if (postJson.success && postJson.data.length > 0) {
            createdId = postJson.data[0]._id;
        }

        console.log('\n--- Testing /blocked-dates GET ---');
        const getRes = await fetch(`${BASE_URL}/blocked-dates?accommodation_id=60c72b2f9b1d8b3a2c8e4d10`);
        const getJson = await getRes.json();
        console.log('GET Response:', getJson);

        if (createdId) {
            console.log(`\n--- Testing /blocked-dates PUT (${createdId}) ---`);
            const putData = {
                dates: ['2026-03-01'],
                reason: 'High Season Pricing (Updated)',
                accommodation_id: '60c72b2f9b1d8b3a2c8e4d10',
                adult_price: 3800
            };
            const putRes = await fetch(`${BASE_URL}/blocked-dates/${createdId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(putData)
            });
            const putJson = await putRes.json();
            console.log('PUT Response:', putJson);
        }

        console.log('\n--- Cleaning up: Testing /blocked-dates DELETE ---');
        // Clean up everything fake that was just created
        if (postJson.data) {
            for (const item of postJson.data) {
                const delRes = await fetch(`${BASE_URL}/blocked-dates/${item._id}`, { method: 'DELETE' });
                console.log(`DELETE ${item._id}:`, await delRes.json());
            }
        }

    } catch (e) {
        console.error('Test Failed:', e);
    }
}

runTests();
