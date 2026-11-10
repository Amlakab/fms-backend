"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMenu = exports.updateMenu = exports.createMenu = exports.getMenu = exports.getMenus = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Menu_1 = __importDefault(require("../models/Menu"));
const User_1 = __importDefault(require("../models/User"));
const VALID_ROLES = ['user', 'accountant', 'admin', 'customer', 'manager', 'owner', 'agent'];
// GET /menu           → active menus only (filtered optionally by ?type=web or ?type=mobile)
// GET /menu?all=true  → all menus incl. inactive (filtered optionally by ?type=web or ?type=mobile)
const getMenus = async (req, res) => {
    try {
        const includeInactive = req.query.all === 'true';
        const typeQuery = req.query.type;
        const filter = includeInactive ? {} : { isActive: true };
        if (typeQuery && ['web', 'mobile'].includes(typeQuery)) {
            if (typeQuery === 'web') {
                // Include 'web' and legacy menus without a type
                filter.$or = [{ type: 'web' }, { type: { $exists: false } }, { type: null }];
            }
            else {
                filter.type = typeQuery;
            }
        }
        const menus = await Menu_1.default.find(filter).sort({ order: 1, createdAt: 1 });
        res.json({ success: true, data: menus });
    }
    catch (error) {
        console.error('Error fetching menus:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMenus = getMenus;
const getMenu = async (req, res) => {
    try {
        const { menuId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(menuId)) {
            return res.status(400).json({ success: false, message: 'Invalid menu ID' });
        }
        const menu = await Menu_1.default.findById(menuId);
        if (!menu)
            return res.status(404).json({ success: false, message: 'Menu not found' });
        res.json({ success: true, data: menu });
    }
    catch (error) {
        console.error('Error fetching menu:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMenu = getMenu;
const createMenu = async (req, res) => {
    try {
        const { name, href, icon, allowedRoles = [], order = 0, isActive = true, type = 'web', } = req.body;
        if (!name || !href || !icon) {
            return res.status(400).json({
                success: false,
                message: 'name, href, and icon are required',
            });
        }
        const cleanType = ['web', 'mobile'].includes(type) ? type : 'web';
        const cleanRoles = allowedRoles.filter((r) => VALID_ROLES.includes(r));
        const existing = await Menu_1.default.findOne({ name, type: cleanType });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: `Menu '${name}' already exists for ${cleanType}`,
            });
        }
        const menu = await Menu_1.default.create({
            name,
            href,
            icon,
            type: cleanType,
            allowedRoles: cleanRoles,
            order,
            isActive,
        });
        res.status(201).json({ success: true, data: menu, message: 'Menu created successfully' });
    }
    catch (error) {
        console.error('Error creating menu:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createMenu = createMenu;
const updateMenu = async (req, res) => {
    try {
        const { menuId } = req.params;
        const { name, href, icon, allowedRoles, order, isActive, type } = req.body;
        const menu = await Menu_1.default.findById(menuId);
        if (!menu)
            return res.status(404).json({ success: false, message: 'Menu not found' });
        const targetType = type !== undefined
            ? ['web', 'mobile'].includes(type)
                ? type
                : 'web'
            : menu.type || 'web';
        const targetName = name !== undefined ? name : menu.name;
        if (name !== undefined || type !== undefined) {
            const dup = await Menu_1.default.findOne({
                name: targetName,
                type: targetType,
                _id: { $ne: menuId },
            });
            if (dup) {
                return res.status(400).json({
                    success: false,
                    message: `Menu '${targetName}' already exists for ${targetType}`,
                });
            }
        }
        if (name !== undefined)
            menu.name = name;
        if (href !== undefined)
            menu.href = href;
        if (icon !== undefined)
            menu.icon = icon;
        if (type !== undefined && ['web', 'mobile'].includes(type))
            menu.type = type;
        if (allowedRoles !== undefined) {
            menu.allowedRoles = allowedRoles.filter((r) => VALID_ROLES.includes(r));
        }
        if (order !== undefined)
            menu.order = order;
        if (isActive !== undefined)
            menu.isActive = isActive;
        await menu.save();
        res.json({ success: true, data: menu, message: 'Menu updated successfully' });
    }
    catch (error) {
        console.error('Error updating menu:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateMenu = updateMenu;
const deleteMenu = async (req, res) => {
    try {
        const { menuId } = req.params;
        const menu = await Menu_1.default.findByIdAndDelete(menuId);
        if (!menu)
            return res.status(404).json({ success: false, message: 'Menu not found' });
        // Cleanup: remove this menu id from every user's permissions
        await User_1.default.updateMany({ permissions: menuId }, { $pull: { permissions: menuId } });
        res.json({ success: true, message: 'Menu deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting menu:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteMenu = deleteMenu;
