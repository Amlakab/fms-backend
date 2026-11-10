import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Menu from '../models/Menu';
import User from '../models/User';

const VALID_ROLES = ['user', 'accountant', 'admin', 'customer', 'manager', 'owner', 'agent'];

// GET /menu           → active menus only (filtered optionally by ?type=web or ?type=mobile)
// GET /menu?all=true  → all menus incl. inactive (filtered optionally by ?type=web or ?type=mobile)
export const getMenus = async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.all === 'true';
    const typeQuery = req.query.type as string | undefined;

    const filter: any = includeInactive ? {} : { isActive: true };

    if (typeQuery && ['web', 'mobile'].includes(typeQuery)) {
      if (typeQuery === 'web') {
        // Include 'web' and legacy menus without a type
        filter.$or = [{ type: 'web' }, { type: { $exists: false } }, { type: null }];
      } else {
        filter.type = typeQuery;
      }
    }

    const menus = await Menu.find(filter).sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: menus });
  } catch (error: any) {
    console.error('Error fetching menus:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMenu = async (req: Request, res: Response) => {
  try {
    const { menuId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      return res.status(400).json({ success: false, message: 'Invalid menu ID' });
    }
    const menu = await Menu.findById(menuId);
    if (!menu) return res.status(404).json({ success: false, message: 'Menu not found' });
    res.json({ success: true, data: menu });
  } catch (error: any) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createMenu = async (req: Request, res: Response) => {
  try {
    const {
      name,
      href,
      icon,
      allowedRoles = [],
      order = 0,
      isActive = true,
      type = 'web',
    } = req.body;

    if (!name || !href || !icon) {
      return res.status(400).json({
        success: false,
        message: 'name, href, and icon are required',
      });
    }

    const cleanType = ['web', 'mobile'].includes(type) ? type : 'web';
    const cleanRoles = allowedRoles.filter((r: string) => VALID_ROLES.includes(r));

    const existing = await Menu.findOne({ name, type: cleanType });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Menu '${name}' already exists for ${cleanType}`,
      });
    }

    const menu = await Menu.create({
      name,
      href,
      icon,
      type: cleanType,
      allowedRoles: cleanRoles,
      order,
      isActive,
    });

    res.status(201).json({ success: true, data: menu, message: 'Menu created successfully' });
  } catch (error: any) {
    console.error('Error creating menu:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMenu = async (req: Request, res: Response) => {
  try {
    const { menuId } = req.params;
    const { name, href, icon, allowedRoles, order, isActive, type } = req.body;

    const menu = await Menu.findById(menuId);
    if (!menu) return res.status(404).json({ success: false, message: 'Menu not found' });

    const targetType =
      type !== undefined
        ? ['web', 'mobile'].includes(type)
          ? type
          : 'web'
        : menu.type || 'web';
    const targetName = name !== undefined ? name : menu.name;

    if (name !== undefined || type !== undefined) {
      const dup = await Menu.findOne({
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

    if (name !== undefined) menu.name = name;
    if (href !== undefined) menu.href = href;
    if (icon !== undefined) menu.icon = icon;
    if (type !== undefined && ['web', 'mobile'].includes(type)) menu.type = type;
    if (allowedRoles !== undefined) {
      menu.allowedRoles = allowedRoles.filter((r: string) => VALID_ROLES.includes(r));
    }
    if (order !== undefined) menu.order = order;
    if (isActive !== undefined) menu.isActive = isActive;

    await menu.save();

    res.json({ success: true, data: menu, message: 'Menu updated successfully' });
  } catch (error: any) {
    console.error('Error updating menu:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMenu = async (req: Request, res: Response) => {
  try {
    const { menuId } = req.params;

    const menu = await Menu.findByIdAndDelete(menuId);
    if (!menu) return res.status(404).json({ success: false, message: 'Menu not found' });

    // Cleanup: remove this menu id from every user's permissions
    await User.updateMany(
      { permissions: menuId },
      { $pull: { permissions: menuId } }
    );

    res.json({ success: true, message: 'Menu deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting menu:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};