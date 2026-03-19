const Room = require('../models/Room');
const RoomBooking = require('../models/RoomBooking');
const BlockedDate = require('../models/BlockedDate');

function toIsoDate(d) {
  return new Date(d).toISOString().split('T')[0];
}

function getNightsBetween(checkInDate, checkOutDate) {
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);

  // If invalid/empty range, treat as 1 night on checkInDate.
  if (!(end > start)) return [toIsoDate(start)];

  const nights = [];
  const curr = new Date(start);
  while (curr < end) {
    nights.push(toIsoDate(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return nights;
}

function pickLatestBlockedDoc(blockedDocs) {
  // Pick latest by comparing updated_at first, fallback to created_at.
  return blockedDocs.reduce((latest, current) => {
    const latestTime = new Date(latest.updated_at || latest.created_at || 0).getTime();
    const currentTime = new Date(current.updated_at || current.created_at || 0).getTime();
    return currentTime > latestTime ? current : latest;
  }, blockedDocs[0]);
}

async function getRoomAvailability({ roomId, checkInDate, checkOutDate }) {
  const room = await Room.findById(roomId);
  if (!room) {
    return { success: false, message: 'Room not found' };
  }

  const hotelId = room.hotelId;
  const totalInventory = room.inventory || 1;

  const nights = getNightsBetween(checkInDate, checkOutDate);

  // Fetch all overlapping bookings once, then compute per-night booked inventory in memory.
  const overlappingBookings = await RoomBooking.find({
    hotelId,
    roomId: room._id,
    status: { $in: ['Pending', 'Confirmed'] },
    checkInDate: { $lt: checkOutDate },
    checkOutDate: { $gt: checkInDate },
  });

  const bookedRoomsByDate = {};
  for (const dateStr of nights) {
    let bookedRooms = 0;
    for (const b of overlappingBookings) {
      if (b.checkInDate <= dateStr && b.checkOutDate > dateStr) {
        bookedRooms += b.guests?.rooms || 1;
      }
    }
    bookedRoomsByDate[dateStr] = bookedRooms;
  }

  const perDate = [];
  let minRemaining = Number.POSITIVE_INFINITY;

  for (const dateStr of nights) {
    const bookedRooms = bookedRoomsByDate[dateStr] || 0;

    // Calendar overrides: allow both room-specific and accommodation-wide (room_id = null) blocks.
    const blockedDocs = await BlockedDate.find({
      accommodation_id: hotelId,
      blocked_date: dateStr,
      $or: [{ room_id: room._id }, { room_id: null }],
    });

    let blockedFull = false;
    let blockedDelta = 0;

    if (blockedDocs.length > 0) {
      const latest = pickLatestBlockedDoc(blockedDocs);
      if (latest.rooms === null) {
        blockedFull = true;
      } else {
        blockedDelta = typeof latest.rooms === 'number' ? latest.rooms : 0;
      }
    }

    const remaining = blockedFull
      ? 0
      : Math.max(0, totalInventory + blockedDelta - bookedRooms);

    minRemaining = Math.min(minRemaining, remaining);

    perDate.push({
      date: dateStr,
      totalInventory,
      bookedRooms,
      blockedDelta,
      blockedFull,
      remaining,
    });
  }

  if (!Number.isFinite(minRemaining)) minRemaining = 0;

  return {
    success: true,
    data: {
      minRemaining,
      perDate,
    },
  };
}

module.exports = {
  getRoomAvailability,
};

