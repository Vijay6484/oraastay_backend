const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const Hotel = require('/Users/vijaytiwari/Documents/Mahabaleshwarn Project/backend/models/Hotel.js');

async function updateRatings() {
    try {
        await mongoose.connect('mongodb+srv://oraastay_db:NJu8OE3NkAx7FXm4@cluster0.q46hemw.mongodb.net/?appName=Cluster0');
        console.log('Connected to DB');
        const hotels = await Hotel.find({ $or: [{ rating: 0 }, { rating: { $exists: false } }, { rating: null }] });
        console.log(`Found ${hotels.length} hotels with 0 or missing rating.`);
        
        for (let hotel of hotels) {
            hotel.rating = Number((Math.random() * 0.4 + 4.5).toFixed(1));
            await hotel.save();
        }
        console.log(`Updated ${hotels.length} hotel ratings successfully!`);
        process.exit(0);
    } catch (e) {
        console.error('Error updating ratings:', e);
        process.exit(1);
    }
}

updateRatings();
