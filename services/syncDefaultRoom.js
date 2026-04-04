const Room = require('../models/Room');

/**
 * Ensures exactly one Room exists per hotel, synced from hotel "unit" fields (single bookable unit model).
 */
async function syncDefaultRoomForHotel(hotel) {
    if (!hotel || !hotel._id) return null;
    const doc = hotel.toObject ? hotel.toObject() : hotel;
    const hid = doc._id;

    const roomPayload = {
        hotelId: hid,
        name: doc.unitName || doc.name || 'Standard',
        type: doc.unitType || doc.type || 'Villa',
        subType: doc.unitSubType || '',
        description: (doc.unitDescription && doc.unitDescription.trim()) || doc.description || '',
        price: doc.price,
        adultRate: doc.adultRate ?? 0,
        childRate: doc.childRate ?? 0,
        baseGuestsIncluded: Number(doc.baseGuestsIncluded) > 0 ? Number(doc.baseGuestsIncluded) : 0,
        capacity:
            Number(doc.baseGuestsIncluded) > 0
                ? { adults: 0, children: 0 }
                : (doc.unitCapacity || { adults: 2, children: 0 }),
        maxPersonsVilla: doc.maxPersonsVilla != null ? doc.maxPersonsVilla : 0,
        amenities:
            Array.isArray(doc.unitAmenities) && doc.unitAmenities.length > 0
                ? doc.unitAmenities
                : doc.amenities || [],
        images:
            Array.isArray(doc.unitImages) && doc.unitImages.length > 0
                ? doc.unitImages
                : doc.images || [],
        inventory: doc.inventory != null ? doc.inventory : 5,
    };

    if (roomPayload.price == null || Number.isNaN(Number(roomPayload.price))) {
        roomPayload.price = 0;
    }

    await Room.deleteMany({ hotelId: hid });
    const created = await Room.create(roomPayload);
    return Array.isArray(created) ? created[0] : created;
}

module.exports = { syncDefaultRoomForHotel };
