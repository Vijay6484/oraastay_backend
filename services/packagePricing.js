const {
    nightsBetween,
    DEFAULT_TAX_RATE,
    effectiveMaxGuestsPerRoom,
    computeHotelRoomBookingTotals,
} = require('./roomPricing');

function parseIndexArray(v) {
    if (!Array.isArray(v)) return [];
    return v
        .map((x) => parseInt(x, 10))
        .filter((n) => Number.isInteger(n) && n >= 0);
}

function sumSelectedUnitPrices(list, indices) {
    let sum = 0;
    for (const idx of indices) {
        if (Number.isInteger(idx) && idx >= 0 && idx < list.length) {
            sum += Number(list[idx].price) || 0;
        }
    }
    return sum;
}

function minRoomsForGuests(roomDoc, adults, children) {
    const cap = roomDoc.capacity || { adults: 2, children: 0 };
    const bg = Number(roomDoc.baseGuestsIncluded) || 0;
    const maxPerRoom = effectiveMaxGuestsPerRoom(
        roomDoc.maxPersonsVilla,
        cap,
        {
            adultRate: roomDoc.adultRate,
            childRate: roomDoc.childRate,
            baseGuestsIncluded: bg > 0 ? bg : 0,
        },
    );
    const headcount = adults + children;
    return Math.max(1, Math.ceil(headcount / maxPerRoom));
}

/**
 * Package pre-tax total: selected hotel stay (room rate × units × nights, incl. extra-guest charges)
 * + package extras/food (per person-day or per couple-day) + fixed cabs.
 * Then 15% tax on that subtotal.
 * @param {object|null} roomDoc — Room document for the selected hotel (required for website bookings).
 */
function computePackageBookingTotals(pkg, input, roomDoc) {
    const {
        checkInDate,
        checkOutDate,
        adults: rawAdults,
        children: rawChildren,
        selectedExtras: rawExtras,
        selectedFood: rawFood,
        selectedCabs: rawCabs,
    } = input;

    const adults = Math.max(0, parseInt(rawAdults, 10) || 0);
    const children = Math.max(0, parseInt(rawChildren, 10) || 0);
    const selectedExtras = parseIndexArray(rawExtras);
    const selectedFood = parseIndexArray(rawFood);
    const selectedCabs = parseIndexArray(rawCabs);

    if (!checkInDate || !checkOutDate) {
        return { error: 'Check-in and check-out dates are required.' };
    }

    if (!roomDoc) {
        return { error: 'Please select a hotel to calculate the package price.' };
    }

    const days = nightsBetween(checkInDate, checkOutDate);

    const extraServices = pkg.extraServices || [];
    const foodOptions = pkg.foodOptions || [];
    const cabServices = pkg.cabServices || [];

    const extrasFoodUnitDay =
        sumSelectedUnitPrices(extraServices, selectedExtras) +
        sumSelectedUnitPrices(foodOptions, selectedFood);
    const cabTotal = sumSelectedUnitPrices(cabServices, selectedCabs);

    const isCouple = pkg.category === 'Couple';
    let couples = 0;
    let headcount = 0;

    if (isCouple) {
        if (children !== 0) {
            return {
                error: 'For couple packages, use adults only (2 per couple). Please contact us for special requests.',
            };
        }
        couples = adults / 2;
        if (!Number.isInteger(couples) || couples < 1) {
            return { error: 'Couple packages need an even number of adults (2 per couple).' };
        }
        headcount = adults;
    } else {
        headcount = adults + children;
        if (headcount < 1) {
            return { error: 'At least one guest is required.' };
        }
    }

    const rooms = minRoomsForGuests(roomDoc, adults, children);
    const hotelTotals = computeHotelRoomBookingTotals({
        roomPrice: roomDoc.price,
        adultRate: roomDoc.adultRate,
        childRate: roomDoc.childRate,
        capacity: roomDoc.capacity || { adults: 2, children: 0 },
        baseGuestsIncluded: roomDoc.baseGuestsIncluded,
        maxPersonsVilla: roomDoc.maxPersonsVilla,
        rooms,
        nights: days,
        adults,
        children,
    });

    if (!hotelTotals.validGuestCount) {
        return {
            error: 'Guest count does not fit the selected accommodation. Try another property or adjust guests.',
        };
    }

    const hotelPreTax = hotelTotals.subtotal;
    let packageAddonsPreTax = 0;
    if (isCouple) {
        packageAddonsPreTax = extrasFoodUnitDay * couples * days + cabTotal;
    } else {
        packageAddonsPreTax = extrasFoodUnitDay * headcount * days + cabTotal;
    }

    const preTaxSubtotal = hotelPreTax + packageAddonsPreTax;
    const taxes = preTaxSubtotal * DEFAULT_TAX_RATE;
    const totalWithTax = preTaxSubtotal + taxes;

    return {
        preTaxSubtotal,
        taxes,
        totalWithTax,
        days,
        hotelPreTax,
        packageAddonsPreTax,
        roomsBooked: rooms,
        extrasFoodUnitDay,
        cabTotal,
        isCouple,
        taxRate: DEFAULT_TAX_RATE,
    };
}

module.exports = {
    computePackageBookingTotals,
    parsePackageIndexArray: parseIndexArray,
};
