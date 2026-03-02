async function testApi() {
    try {
        const payload = {
            propertyData: {
                name: "Test Admin Resort",
                type: "Resort",
                description: "A beautiful testing resort",
                location: "Panchgani, Mahabaleshwar",
                price: 2500,
                amenities: ["WiFi", "Swimming Pool"]
            },
            roomsData: [
                {
                    name: "Deluxe Test Room",
                    price: 3000,
                    capacity: { adults: 2, children: 1 },
                    amenities: ["TV", "AC", "Mini-bar"],
                    inventory: 3
                },
                {
                    name: "Standard Test Room",
                    price: 2000,
                    capacity: { adults: 2, children: 0 },
                    amenities: ["TV"],
                    inventory: 5
                }
            ]
        };

        const postRes = await fetch('http://localhost:5001/api/admin/properties/accommodations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const postData = await postRes.json();
        console.log('POST Response:', postData);

        const createdId = postData.hotel._id;

        const getRes = await fetch(`http://localhost:5001/api/admin/properties/accommodations/${createdId}`);
        const getData = await getRes.json();
        console.log('GET Resource:', JSON.stringify(getData, null, 2));

        const delRes = await fetch(`http://localhost:5001/api/admin/properties/accommodations/${createdId}`, { method: 'DELETE' });
        const delData = await delRes.json();
        console.log('DELETE Response:', delData);

    } catch (e) {
        console.error('Error:', e);
    }
}

testApi();
