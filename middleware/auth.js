const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Hotel = require('../models/Hotel');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-oraastay';

function signToken(userDoc) {
    const payload = {
        userId: userDoc._id.toString(),
        role: userDoc.role || 'staff',
        permissions: Array.isArray(userDoc.permissions) ? userDoc.permissions : [],
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.authUser = {
            id: decoded.userId,
            role: decoded.role,
            permissions: decoded.permissions || [],
        };
        return next();
    } catch (e) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
}

function requireAdmin(req, res, next) {
    if (!req.authUser || req.authUser.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
}

/** Dashboard: admin and manager only (staff never). */
function requireDashboardAccess(req, res, next) {
    if (!req.authUser) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { role } = req.authUser;
    if (role === 'admin' || role === 'manager') return next();
    return res.status(403).json({ success: false, message: 'Dashboard access denied' });
}

const MANAGER_MODULES = new Set(['dashboard', 'properties', 'bookings', 'calendar', 'amenities', 'cities']);

/**
 * @param {string} moduleKey - permission key (e.g. 'coupons', 'properties')
 */
function requireModuleAccess(moduleKey) {
    return (req, res, next) => {
        if (!req.authUser) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { role, permissions } = req.authUser;
        if (role === 'admin') return next();
        if (role === 'manager') {
            if (MANAGER_MODULES.has(moduleKey)) return next();
            return res.status(403).json({ success: false, message: 'Access denied for this module' });
        }
        if (role === 'staff') {
            if (permissions.includes(moduleKey)) return next();
            return res.status(403).json({ success: false, message: 'Access denied for this module' });
        }
        return res.status(403).json({ success: false, message: 'Access denied' });
    };
}

/** Returns Mongo ObjectIds of hotels owned by manager, or null if not manager / no scope. */
async function getManagerHotelIds(userId) {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return [];
    const ids = await Hotel.find({ managerId: userId }).select('_id').lean();
    return ids.map((h) => h._id);
}

/**
 * For list queries: admin/staff (with access) => null (no filter). manager => ObjectId[].
 */
async function hotelScopeFilter(authUser) {
    if (!authUser) return null;
    if (authUser.role === 'manager') {
        const ids = await getManagerHotelIds(authUser.id);
        return { $in: ids };
    }
    return null;
}

async function assertManagerOwnsHotel(authUser, hotelId) {
    if (!authUser || authUser.role !== 'manager') return true;
    if (!hotelId || !mongoose.Types.ObjectId.isValid(hotelId)) return false;
    const ids = await getManagerHotelIds(authUser.id);
    return ids.some((id) => id.toString() === hotelId.toString());
}

module.exports = {
    JWT_SECRET,
    signToken,
    requireAuth,
    requireAdmin,
    requireDashboardAccess,
    requireModuleAccess,
    MANAGER_MODULES,
    getManagerHotelIds,
    hotelScopeFilter,
    assertManagerOwnsHotel,
};
