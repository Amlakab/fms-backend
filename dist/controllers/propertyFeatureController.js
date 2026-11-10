"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = exports.updatePropertyVerification = exports.getVerificationQueue = exports.saveCategoryConfig = exports.getCategoryConfigs = exports.deleteSavedSearch = exports.createSavedSearch = exports.getSavedSearches = exports.getTagSuggestions = exports.getSimilarProperties = exports.compareProperties = exports.toggleLikeProperty = void 0;
const House_1 = __importStar(require("../models/House"));
const SavedSearch_1 = __importDefault(require("../models/SavedSearch"));
const CategoryConfig_1 = __importDefault(require("../models/CategoryConfig"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const Notification_1 = __importStar(require("../models/Notification"));
const mongoose_1 = __importDefault(require("mongoose"));
// Toggle Like on a property
const toggleLikeProperty = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required to like' });
        }
        const house = await House_1.default.findById(id);
        if (!house) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const existingIndex = house.likes.findIndex(likeId => likeId.toString() === userId.toString());
        let liked = false;
        if (existingIndex > -1) {
            // Unlike
            house.likes.splice(existingIndex, 1);
            house.likesCount = Math.max(0, (house.likesCount || 1) - 1);
            liked = false;
        }
        else {
            // Like
            house.likes.push(userObjectId);
            house.likesCount = (house.likesCount || 0) + 1;
            liked = true;
            // Optional: notify owner
            if (house.ownerId && house.ownerId.toString() !== userId.toString()) {
                await Notification_1.default.create({
                    userId: house.ownerId,
                    title: 'New Like on your property',
                    message: `Someone liked your listing "${house.title}"`,
                    type: Notification_1.NotificationType.SYSTEM,
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
    }
    catch (error) {
        console.error('Error in toggleLikeProperty:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.toggleLikeProperty = toggleLikeProperty;
// Side-by-side comparison of 2-4 properties
const compareProperties = async (req, res) => {
    try {
        const idsQuery = req.query.ids;
        if (!idsQuery) {
            return res.status(400).json({ success: false, message: 'Provide comma-separated property IDs' });
        }
        const idList = idsQuery.split(',').filter(id => mongoose_1.default.Types.ObjectId.isValid(id.trim()));
        if (idList.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid property IDs provided' });
        }
        const houses = await House_1.default.find({ _id: { $in: idList }, isDeleted: { $ne: true } })
            .select('-images.data -threeDModels.data')
            .populate('agentId', 'name email phone');
        res.json({
            success: true,
            data: houses,
            message: `Retrieved ${houses.length} properties for comparison`
        });
    }
    catch (error) {
        console.error('Error in compareProperties:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.compareProperties = compareProperties;
// Similar listings & smart recommendations
const getSimilarProperties = async (req, res) => {
    try {
        const { id } = req.params;
        const target = await House_1.default.findById(id);
        if (!target || target.isDeleted) {
            return res.status(404).json({ success: false, message: 'Target property not found' });
        }
        const minPrice = target.pricing.price * 0.7;
        const maxPrice = target.pricing.price * 1.3;
        // Find similar properties in same category, similar price, or matching tags
        const similar = await House_1.default.find({
            _id: { $ne: target._id },
            isDeleted: { $ne: true },
            status: House_1.HouseStatus.AVAILABLE,
            approvalStatus: House_1.ApprovalStatus.APPROVED,
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
    }
    catch (error) {
        console.error('Error in getSimilarProperties:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSimilarProperties = getSimilarProperties;
// Get trending tags and tag suggestions
const getTagSuggestions = async (req, res) => {
    try {
        const search = (req.query.q || '').toLowerCase();
        // Aggregation to find all unique tags and their frequencies
        const tagStats = await House_1.default.aggregate([
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
    }
    catch (error) {
        console.error('Error in getTagSuggestions:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getTagSuggestions = getTagSuggestions;
// Saved Searches: Get user's saved searches
const getSavedSearches = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const savedSearches = await SavedSearch_1.default.find({ userId }).sort({ createdAt: -1 });
        res.json({ success: true, data: savedSearches });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSavedSearches = getSavedSearches;
// Saved Searches: Create new saved search
const createSavedSearch = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { name, filters, frequency, notificationsEnabled } = req.body;
        const newSearch = await SavedSearch_1.default.create({
            userId,
            name: name || 'My Search Alert',
            filters: filters || {},
            frequency: frequency || 'INSTANT',
            notificationsEnabled: notificationsEnabled !== undefined ? notificationsEnabled : true
        });
        res.status(201).json({ success: true, data: newSearch, message: 'Search criteria saved successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createSavedSearch = createSavedSearch;
// Saved Searches: Delete saved search
const deleteSavedSearch = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;
        await SavedSearch_1.default.findOneAndDelete({ _id: id, userId });
        res.json({ success: true, message: 'Saved search deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteSavedSearch = deleteSavedSearch;
// Dynamic Category Configurations: Get all category configs
const getCategoryConfigs = async (req, res) => {
    try {
        let configs = await CategoryConfig_1.default.find({ isActive: true });
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
            await CategoryConfig_1.default.insertMany(defaults);
            configs = await CategoryConfig_1.default.find({ isActive: true });
        }
        res.json({ success: true, data: configs });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCategoryConfigs = getCategoryConfigs;
// Admin: Save or update dynamic category config
const saveCategoryConfig = async (req, res) => {
    try {
        const user = req.user;
        if (user?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const { categoryKey, displayName, group, allowedTransactionTypes, fields } = req.body;
        const config = await CategoryConfig_1.default.findOneAndUpdate({ categoryKey }, { displayName, group, allowedTransactionTypes, fields, isActive: true }, { upsert: true, new: true });
        await AuditLog_1.default.create({
            action: 'UPDATE_CATEGORY_CONFIG',
            performedBy: user._id,
            userName: user.name,
            userRole: user.role,
            entityType: 'CONFIG',
            entityId: categoryKey,
            details: `Updated category fields schema for ${categoryKey}`
        });
        res.json({ success: true, data: config, message: 'Category attributes updated successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.saveCategoryConfig = saveCategoryConfig;
// Admin: Property Verification Queue & Action
const getVerificationQueue = async (req, res) => {
    try {
        const user = req.user;
        if (user?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const pendingProperties = await House_1.default.find({
            isDeleted: { $ne: true },
            verificationStatus: { $in: ['PENDING', 'UNVERIFIED'] }
        })
            .select('-images.data -threeDModels.data')
            .populate('ownerId', 'name email phone isVerified')
            .sort({ created_at: -1 });
        res.json({ success: true, data: pendingProperties });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getVerificationQueue = getVerificationQueue;
const updatePropertyVerification = async (req, res) => {
    try {
        const user = req.user;
        if (user?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const { id } = req.params;
        const { status, notes } = req.body; // status: 'VERIFIED' | 'REJECTED' | 'UNVERIFIED'
        const house = await House_1.default.findById(id);
        if (!house) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }
        house.verificationStatus = status;
        house.isVerified = status === 'VERIFIED';
        house.verificationNotes = notes;
        await house.save();
        await AuditLog_1.default.create({
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
            await Notification_1.default.create({
                userId: house.ownerId,
                title: `Property Verification: ${status}`,
                message: status === 'VERIFIED'
                    ? `Congratulations! Your listing "${house.title}" has been verified with official badge.`
                    : `Verification status updated to ${status} for "${house.title}". Note: ${notes || 'None'}`,
                type: Notification_1.NotificationType.VERIFICATION,
                link: `/public/houses/${house._id}`
            });
        }
        res.json({ success: true, data: house, message: `Property verification updated to ${status}` });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updatePropertyVerification = updatePropertyVerification;
// Admin: Get Audit Logs
const getAuditLogs = async (req, res) => {
    try {
        const user = req.user;
        if (user?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const logs = await AuditLog_1.default.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await AuditLog_1.default.countDocuments();
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAuditLogs = getAuditLogs;
