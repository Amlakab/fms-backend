"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = void 0;
const requireAdmin = (req, res, next) => {
    const user = req.user;
    if (!user || user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: admin access required',
        });
    }
    next();
};
exports.requireAdmin = requireAdmin;
