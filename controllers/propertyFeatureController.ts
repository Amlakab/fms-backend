import { Request, Response } from 'express';
import House, { ApprovalStatus, HouseStatus } from '../models/House';
import SavedSearch from '../models/SavedSearch';
import CategoryConfig from '../models/CategoryConfig';
import AuditLog from '../models/AuditLog';
import Notification, { NotificationType } from '../models/Notification';
import mongoose from 'mongoose';

// Toggle Like on a property
export const toggleLikeProperty = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required to like' });
    }

    const house = await House.findById(id);
    if (!house) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const existingIndex = house.likes.findIndex(likeId => likeId.toString() === userId.toString());

    let liked = false;
    if (existingIndex > -1) {
      // Unlike
      house.likes.splice(existingIndex, 1);
      house.likesCount = Math.max(0, (house.likesCount || 1) - 1);
      liked = false;
    } else {
      // Like
      house.likes.push(userObjectId);
      house.likesCount = (house.likesCount || 0) + 1;
      liked = true;

      // Optional: notify owner
      if (house.ownerId && house.ownerId.toString() !== userId.toString()) {
        await Notification.create({
          userId: house.ownerId,
          title: 'New Like on your property',
          message: `Someone liked your listing "${house.title}"`,
          type: NotificationType.SYSTEM,
          link: `/public/houses/${house._id}`
        });
      }
    }

    await house.save();

    res.json({
      success: true,
      data: {
        liked,
        likesCount: house.likesCount
      },
      message: liked ? 'Added to liked properties' : 'Removed from liked properties'
    });
  } catch (error: any) {
    console.error('Error in toggleLikeProperty:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Side-by-side comparison of 2-4 properties
export const compareProperties = async (req: Request, res: Response) => {
  try {
    const idsQuery = req.query.ids as string;
    if (!idsQuery) {
      return res.status(400).json({ success: false, message: 'Provide comma-separated property IDs' });
    }

    const idList = idsQuery.split(',').filter(id => mongoose.Types.ObjectId.isValid(id.trim()));
    if (idList.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid property IDs provided' });
    }

    const houses = await House.find({ _id: { $in: idList }, isDeleted: { $ne: true } })
      .select('-images.data -threeDModels.data')
      .populate('agentId', 'name email phone');

    res.json({
      success: true,
      data: houses,
      message: `Retrieved ${houses.length} properties for comparison`
    });
  } catch (error: any) {
    console.error('Error in compareProperties:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Similar listings & smart recommendations
export const getSimilarProperties = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const target = await House.findById(id);

    if (!target || target.isDeleted) {
      return res.status(404).json({ success: false, message: 'Target property not found' });
    }

    const minPrice = target.pricing.price * 0.7;
    const maxPrice = target.pricing.price * 1.3;

    // Find similar properties in same category, similar price, or matching tags
    const similar = await House.find({
      _id: { $ne: target._id },
      isDeleted: { $ne: true },
      status: HouseStatus.AVAILABLE,
      approvalStatus: ApprovalStatus.APPROVED,
      $or: [
        { propertyType: target.propertyType },
        { transactionType: target.transactionType },
        { tags: { $in: target.tags || [] } },
        { 'location.city': target.location.city }
      ],
      'pricing.price': { $gte: minPrice, $lte: maxPrice }
    })
      .select('-images.data -threeDModels.data')
      .sort({ likesCount: -1, views: -1 })
      .limit(6);

    res.json({
      success: true,
      data: similar,
      message: 'Similar properties retrieved'
    });
  } catch (error: any) {
    console.error('Error in getSimilarProperties:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get trending tags and tag suggestions
export const getTagSuggestions = async (req: Request, res: Response) => {
  try {
    const search = (req.query.q as string || '').toLowerCase();
    
    // Aggregation to find all unique tags and their frequencies
    const tagStats = await House.aggregate([
      { $unwind: '$tags' },
      { $match: search ? { tags: { $regex: search, $options: 'i' } } : {} },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    const defaultTags = ['Bole', 'Furnished', 'Luxury', 'FamilyHome', 'OfficeSpace', 'Parking', 'Modern', 'Garden', 'Security', 'NearAirport'];
    const tags = tagStats.length > 0 
      ? tagStats.map(t => ({ name: t._id, count: t.count })) 
      : defaultTags.map(t => ({ name: t, count: 5 }));

    res.json({
      success: true,
      data: tags
    });
  } catch (error: any) {
    console.error('Error in getTagSuggestions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Saved Searches: Get user's saved searches
export const getSavedSearches = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const savedSearches = await SavedSearch.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: savedSearches });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Saved Searches: Create new saved search
export const createSavedSearch = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { name, filters, frequency, notificationsEnabled } = req.body;
    const newSearch = await SavedSearch.create({
      userId,
      name: name || 'My Search Alert',
      filters: filters || {},
      frequency: frequency || 'INSTANT',
      notificationsEnabled: notificationsEnabled !== undefined ? notificationsEnabled : true
    });

    res.status(201).json({ success: true, data: newSearch, message: 'Search criteria saved successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Saved Searches: Delete saved search
export const deleteSavedSearch = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const { id } = req.params;

    await SavedSearch.findOneAndDelete({ _id: id, userId });
    res.json({ success: true, message: 'Saved search deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Dynamic Category Configurations: Get all category configs
export const getCategoryConfigs = async (req: Request, res: Response) => {
  try {
    let configs = await CategoryConfig.find({ isActive: true });
    
    // If no configs exist in database yet, seed standard defaults
    if (configs.length === 0) {
      const defaults = [
        {
          categoryKey: 'APARTMENT',
          displayName: 'Apartment',
          group: 'residential',
          allowedTransactionTypes: ['RENT', 'BUY', 'SHORT_STAY'],
          fields: [
            { key: 'floorNumber', label: 'Floor Level', type: 'number', required: false, filterEnabled: true },
            { key: 'hasElevator', label: 'Elevator Available', type: 'boolean', filterEnabled: true },
            { key: 'hasBalcony', label: 'Balcony', type: 'boolean', filterEnabled: true },
            { key: 'petFriendly', label: 'Pet Friendly', type: 'boolean', filterEnabled: true },
            { key: 'waterTank', label: 'Backup Water Tank', type: 'boolean', filterEnabled: true },
            { key: 'backupGenerator', label: 'Backup Generator', type: 'boolean', filterEnabled: true }
          ]
        },
        {
          categoryKey: 'VILLA',
          displayName: 'Villa / Standalone House',
          group: 'residential',
          allowedTransactionTypes: ['RENT', 'BUY'],
          fields: [
            { key: 'compoundSize', label: 'Compound / Garden Size (m²)', type: 'number', unit: 'm²', filterEnabled: true },
            { key: 'serviceQuarter', label: 'Service Quarter / Maids Room', type: 'boolean', filterEnabled: true },
            { key: 'securityPost', label: 'Security Guard Post', type: 'boolean', filterEnabled: true }
          ]
        },
        {
          categoryKey: 'OFFICE',
          displayName: 'Office Space',
          group: 'commercial',
          allowedTransactionTypes: ['RENT', 'BUY'],
          fields: [
            { key: 'meetingRooms', label: 'Number of Meeting Rooms', type: 'number', filterEnabled: true },
            { key: 'serverRoom', label: 'Dedicated Server Room', type: 'boolean', filterEnabled: true },
            { key: 'parkingRatio', label: 'Allocated Parking Slots', type: 'number', filterEnabled: true },
            { key: 'fiberInternet', label: 'Fiber Optic Ready', type: 'boolean', filterEnabled: true }
          ]
        },
        {
          categoryKey: 'WAREHOUSE',
          displayName: 'Warehouse & Logistics',
          group: 'industrial',
          allowedTransactionTypes: ['RENT', 'BUY'],
          fields: [
            { key: 'ceilingHeight', label: 'Clear Ceiling Height (meters)', type: 'number', unit: 'm', filterEnabled: true },
            { key: 'truckAccess', label: 'Heavy Truck / Container Access', type: 'boolean', filterEnabled: true },
            { key: 'powerCapacity', label: 'Electrical Power Capacity (KVA/Amps)', type: 'text', filterEnabled: true },
            { key: 'loadingDocks', label: 'Loading Docks Count', type: 'number', filterEnabled: true }
          ]
        },
        {
          categoryKey: 'LAND',
          displayName: 'Land / Plots',
          group: 'land',
          allowedTransactionTypes: ['BUY'],
          fields: [
            { key: 'zoningType', label: 'Permitted Land Use / Zoning', type: 'select', options: ['Residential', 'Commercial', 'Mixed', 'Industrial', 'Agricultural'], filterEnabled: true },
            { key: 'topography', label: 'Terrain / Topography', type: 'select', options: ['Flat', 'Gentle Slope', 'Hilly'], filterEnabled: true },
            { key: 'roadFrontage', label: 'Paved Road Access', type: 'boolean', filterEnabled: true }
          ]
        }
      ];

      await CategoryConfig.insertMany(defaults);
      configs = await CategoryConfig.find({ isActive: true });
    }

    res.json({ success: true, data: configs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Save or update dynamic category config
export const saveCategoryConfig = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { categoryKey, displayName, group, allowedTransactionTypes, fields } = req.body;
    const config = await CategoryConfig.findOneAndUpdate(
      { categoryKey },
      { displayName, group, allowedTransactionTypes, fields, isActive: true },
      { upsert: true, new: true }
    );

    await AuditLog.create({
      action: 'UPDATE_CATEGORY_CONFIG',
      performedBy: user._id,
      userName: user.name,
      userRole: user.role,
      entityType: 'CONFIG',
      entityId: categoryKey,
      details: `Updated category fields schema for ${categoryKey}`
    });

    res.json({ success: true, data: config, message: 'Category attributes updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Property Verification Queue & Action
export const getVerificationQueue = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const pendingProperties = await House.find({
      isDeleted: { $ne: true },
      verificationStatus: { $in: ['PENDING', 'UNVERIFIED'] }
    })
      .select('-images.data -threeDModels.data')
      .populate('ownerId', 'name email phone isVerified')
      .sort({ created_at: -1 });

    res.json({ success: true, data: pendingProperties });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePropertyVerification = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { id } = req.params;
    const { status, notes } = req.body; // status: 'VERIFIED' | 'REJECTED' | 'UNVERIFIED'

    const house = await House.findById(id);
    if (!house) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    house.verificationStatus = status;
    house.isVerified = status === 'VERIFIED';
    house.verificationNotes = notes;
    await house.save();

    await AuditLog.create({
      action: `PROPERTY_VERIFICATION_${status}`,
      performedBy: user._id,
      userName: user.name,
      userRole: user.role,
      entityType: 'VERIFICATION',
      entityId: id,
      details: `Property verification set to ${status}: ${notes || 'No notes'}`
    });

    // Notify owner
    if (house.ownerId) {
      await Notification.create({
        userId: house.ownerId,
        title: `Property Verification: ${status}`,
        message: status === 'VERIFIED' 
          ? `Congratulations! Your listing "${house.title}" has been verified with official badge.`
          : `Verification status updated to ${status} for "${house.title}". Note: ${notes || 'None'}`,
        type: NotificationType.VERIFICATION,
        link: `/public/houses/${house._id}`
      });
    }

    res.json({ success: true, data: house, message: `Property verification updated to ${status}` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Get Audit Logs
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments();

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
