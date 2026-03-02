const express = require('express');
const router = express.Router();
const BlockedDate = require('../models/BlockedDate');
const Hotel = require('../models/Hotel'); // Used for validation/joins if needed

// GET all blocked dates
router.get('/blocked-dates', async (req, res) => {
    try {
        const query = {};
        if (req.query.accommodation_id) {
            query.accommodation_id = req.query.accommodation_id;
        }

        if (req.query.room_id) {
            query.room_id = req.query.room_id;
        }

        // We use `.populate` if we want the actual Hotel Name instead of just ID
        const blockedDates = await BlockedDate.find(query)
            .populate('accommodation_id', 'name')
            .populate('room_id', 'name')
            .sort({ blocked_date: 1 });

        // Map to standard response shape expected by Calendar.tsx
        const formatted = blockedDates.map(b => ({
            id: b._id,
            accommodation_id: b.accommodation_id?._id,
            accommodation_name: b.accommodation_id?.name || 'Unknown Property',
            room_id: b.room_id?._id,
            room_name: b.room_id?.name || null,
            rooms: b.rooms,
            blocked_date: b.blocked_date,
            reason: b.reason,
            adult_price: b.adult_price,
            child_price: b.child_price,
            created_at: b.created_at,
            updated_at: b.updated_at
        }));

        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error('Error fetching blocked dates:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// CREATE blocked date(s)
router.post('/blocked-dates', async (req, res) => {
    try {
        const {
            dates,
            reason,
            accommodation_id,
            room_id,
            room_number,
            adult_price,
            child_price
        } = req.body;

        if (!dates || !Array.isArray(dates) || dates.length === 0) {
            return res.status(400).json({ success: false, message: 'Dates array is required' });
        }
        if (!accommodation_id) {
            return res.status(400).json({ success: false, message: 'Accommodation ID is required' });
        }

        const newBlocks = [];
        for (const dateStr of dates) {
            const blocked = new BlockedDate({
                accommodation_id,
                room_id: room_id || null,
                rooms: room_number !== undefined ? room_number : null,
                blocked_date: dateStr,
                reason: reason || null,
                adult_price: adult_price !== undefined ? adult_price : null,
                child_price: child_price !== undefined ? child_price : null,
            });
            const saved = await blocked.save();
            newBlocks.push(saved);
        }

        res.status(201).json({ success: true, message: 'Saved successfully', data: newBlocks });
    } catch (error) {
        console.error('Error creating blocked dates:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// UPDATE blocked date
router.put('/blocked-dates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            dates, // Only takes dates[0]
            reason,
            accommodation_id,
            room_id,
            room_number,
            adult_price,
            child_price
        } = req.body;

        const updateData = {
            accommodation_id,
            room_id: room_id || null,
            rooms: room_number !== undefined ? room_number : null,
            reason: reason || null,
            adult_price: adult_price !== undefined ? adult_price : null,
            child_price: child_price !== undefined ? child_price : null,
        };

        if (dates && dates.length > 0) {
            updateData.blocked_date = dates[0];
        }

        const updated = await BlockedDate.findByIdAndUpdate(id, updateData, { new: true });

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Blocked date not found' });
        }

        res.json({ success: true, message: 'Updated successfully', data: updated });
    } catch (error) {
        console.error('Error updating blocked date:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// DELETE blocked date
router.delete('/blocked-dates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await BlockedDate.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Blocked date not found' });
        }

        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting blocked date:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;
