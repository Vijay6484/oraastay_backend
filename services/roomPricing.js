const DEFAULT_TAX_RATE = 0.15;

function nightsBetween(checkInDate, checkOutDate) {
    const from = new Date(checkInDate);
    const to = new Date(checkOutDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 1;
    const ms = to.getTime() - from.getTime();
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Max guests allowed in one physical unit (room/villa). Falls back if unset.
 */
function effectiveMaxGuestsPerRoom(maxPersonsVilla, capacity) {
    const n = Number(maxPersonsVilla) || 0;
    if (n > 0) return n;
    const sum = (capacity?.adults || 0) + (capacity?.children || 0);
    return Math.max(2, sum || 2);
}

/**
 * Base capacity is multiplied by number of booked units (rooms).
 * Extra adults = adults beyond (baseAdults * rooms); same for children.
 * @returns totals aligned with public booking UI (15% tax on subtotal incl. extras).
 */
function computeHotelRoomBookingTotals({
    roomPrice,
    adultRate,
    childRate,
    capacity,
    maxPersonsVilla,
    rooms,
    nights,
    adults,
    children,
    taxRate = DEFAULT_TAX_RATE,
}) {
    const R = Math.max(1, Number(rooms) || 1);
    const N = Math.max(1, Number(nights) || 1);
    const A = Math.max(0, Number(adults) || 0);
    const C = Math.max(0, Number(children) || 0);
    const cap = capacity || { adults: 2, children: 0 };
    const maxPerRoom = effectiveMaxGuestsPerRoom(maxPersonsVilla, cap);
    const maxTotalGuests = maxPerRoom * R;
    const baseAdultSlots = (cap.adults ?? 2) * R;
    const baseChildSlots = (cap.children ?? 0) * R;
    const extraAdults = Math.max(0, A - baseAdultSlots);
    const extraChildren = Math.max(0, C - baseChildSlots);
    const extraNightly =
        extraAdults * (Number(adultRate) || 0) + extraChildren * (Number(childRate) || 0);
    const baseSubtotal = (Number(roomPrice) || 0) * R * N;
    const extrasSubtotal = extraNightly * N;
    const subtotal = baseSubtotal + extrasSubtotal;
    const taxes = subtotal * taxRate;
    const totalBeforeDiscount = subtotal + taxes;
    const validGuestCount = A >= 1 && A + C <= maxTotalGuests && A + C >= 1;

    return {
        maxPerRoom,
        maxTotalGuests,
        extraAdults,
        extraChildren,
        extraNightly,
        baseSubtotal,
        extrasSubtotal,
        subtotal,
        taxes,
        totalBeforeDiscount,
        validGuestCount,
    };
}

/**
 * Hotel-level add-ons: extra + food priced per person per night; cab fixed once.
 * Indices must match arrays on the Hotel document (validated server-side).
 */
function computeHotelAddonsSubtotal({
    extraServices = [],
    foodOptions = [],
    cabServices = [],
    selectedExtras = [],
    selectedFood = [],
    selectedCabs = [],
    headcount,
    nights,
}) {
    const N = Math.max(1, Number(nights) || 1);
    const H = Math.max(0, Number(headcount) || 0);
    const inRange = (arr, idx) => Number.isInteger(idx) && idx >= 0 && idx < arr.length;

    let perPersonDay = 0;
    for (const idx of selectedExtras) {
        if (inRange(extraServices, idx)) {
            perPersonDay += Number(extraServices[idx].price) || 0;
        }
    }
    for (const idx of selectedFood) {
        if (inRange(foodOptions, idx)) {
            perPersonDay += Number(foodOptions[idx].price) || 0;
        }
    }
    let cabTotal = 0;
    for (const idx of selectedCabs) {
        if (inRange(cabServices, idx)) {
            cabTotal += Number(cabServices[idx].price) || 0;
        }
    }
    const addonsSubtotal = perPersonDay * H * N + cabTotal;
    return { addonsSubtotal, perPersonDayTotal: perPersonDay, cabTotal };
}

module.exports = {
    nightsBetween,
    effectiveMaxGuestsPerRoom,
    computeHotelRoomBookingTotals,
    computeHotelAddonsSubtotal,
    DEFAULT_TAX_RATE,
};
