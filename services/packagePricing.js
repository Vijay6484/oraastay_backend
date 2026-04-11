const { nightsBetween, DEFAULT_TAX_RATE } = require('./roomPricing');

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

/**
 * Package pre-tax total: base + extras/food (per person-day or per couple-day) + fixed cabs.
 * Then 15% tax on that subtotal (same model as hotel room + add-ons).
 */
function computePackageBookingTotals(pkg, input) {
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

    const days = nightsBetween(checkInDate, checkOutDate);
    const baseNumeric =
        Number(pkg.numericPrice) ||
        parseInt(String(pkg.price || '').replace(/\D/g, ''), 10) ||
        0;

    const extraServices = pkg.extraServices || [];
    const foodOptions = pkg.foodOptions || [];
    const cabServices = pkg.cabServices || [];

    const extrasFoodUnitDay =
        sumSelectedUnitPrices(extraServices, selectedExtras) +
        sumSelectedUnitPrices(foodOptions, selectedFood);
    const cabTotal = sumSelectedUnitPrices(cabServices, selectedCabs);

    const isCouple = pkg.category === 'Couple';
    let preTaxSubtotal = 0;

    if (isCouple) {
        if (children !== 0) {
            return {
                error: 'For couple packages, use adults only (2 per couple). Please contact us for special requests.',
            };
        }
        const couples = adults / 2;
        if (!Number.isInteger(couples) || couples < 1) {
            return { error: 'Couple packages need an even number of adults (2 per couple).' };
        }
        preTaxSubtotal =
            baseNumeric * couples * days + extrasFoodUnitDay * couples * days + cabTotal;
    } else {
        const headcount = adults + children;
        if (headcount < 1) {
            return { error: 'At least one guest is required.' };
        }
        preTaxSubtotal =
            (baseNumeric + extrasFoodUnitDay) * headcount * days + cabTotal;
    }

    const taxes = preTaxSubtotal * DEFAULT_TAX_RATE;
    const totalWithTax = preTaxSubtotal + taxes;

    return {
        preTaxSubtotal,
        taxes,
        totalWithTax,
        days,
        baseNumeric,
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
