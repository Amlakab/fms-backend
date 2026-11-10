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
exports.getHouseImage = exports.getThreeDModel = exports.getPublicFilterOptions = exports.getHousesForMap = exports.getPublicHouse = exports.getTrendingHouses = exports.getPublicHouses = void 0;
const House_1 = __importStar(require("../models/House"));
const mongoose_1 = __importDefault(require("mongoose"));
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({ success: true, message, data });
};
const errorResponse = (res, message = 'Error', statusCode = 500) => {
    res.status(statusCode).json({ success: false, message });
};
const getPublicHouses = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const search = req.query.search || '';
        const propertyType = req.query.propertyType || '';
        const transactionType = req.query.transactionType || '';
        const intendedPurpose = req.query.intendedPurpose || '';
        const city = req.query.city || '';
        const neighborhood = req.query.neighborhood || '';
        const minPrice = parseFloat(req.query.minPrice) || 0;
        const maxPrice = parseFloat(req.query.maxPrice) || 1000000000000;
        const minBedrooms = parseInt(req.query.minBedrooms) || 0;
        const minBathrooms = parseInt(req.query.minBathrooms) || 0;
        const isVerified = req.query.isVerified;
        const furnishingStatus = req.query.furnishingStatus || '';
        const sortBy = req.query.sortBy || 'created_at';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const amenities = req.query.amenities ? req.query.amenities.split(',').map(a => a.trim()) : [];
        const tags = req.query.tags ? req.query.tags.split(',').map(t => t.trim()) : [];
        const skip = (page - 1) * limit;
        const filter = {
            status: House_1.HouseStatus.AVAILABLE,
            approvalStatus: House_1.ApprovalStatus.APPROVED,
            isDeleted: { $ne: true }
        };
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { 'location.address': { $regex: search, $options: 'i' } },
                { 'location.city': { $regex: search, $options: 'i' } },
                { 'location.neighborhood': { $regex: search, $options: 'i' } },
                { 'location.landmark': { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }
        if (propertyType)
            filter.propertyType = propertyType;
        if (transactionType)
            filter.transactionType = transactionType;
        if (intendedPurpose)
            filter.intendedPurpose = intendedPurpose;
        if (city)
            filter['location.city'] = { $regex: city, $options: 'i' };
        if (neighborhood)
            filter['location.neighborhood'] = { $regex: neighborhood, $options: 'i' };
        if (isVerified === 'true')
            filter.isVerified = true;
        if (furnishingStatus)
            filter['details.furnishingStatus'] = furnishingStatus;
        if (minBedrooms > 0)
            filter['details.bedrooms'] = { $gte: minBedrooms };
        if (minBathrooms > 0)
            filter['details.bathrooms'] = { $gte: minBathrooms };
        if (amenities.length > 0)
            filter['details.amenities'] = { $all: amenities };
        if (tags.length > 0)
            filter.tags = { $in: tags };
        filter['pricing.price'] = { $gte: minPrice, $lte: maxPrice };
        const sort = {};
        if (sortBy === 'price') {
            sort['pricing.price'] = sortOrder;
        }
        else if (sortBy === 'most_liked') {
            sort['likesCount'] = -1;
        }
        else if (sortBy === 'most_viewed') {
            sort['views'] = -1;
        }
        else if (sortBy === 'trending') {
            sort['trendingScore'] = -1;
            sort['views'] = -1;
        }
        else {
            sort[sortBy] = sortOrder;
        }
        // Get houses WITHOUT binary data for rapid response
        const houses = await House_1.default.find(filter)
            .select('-images.data -threeDModels.data')
            .populate('agentId', 'name email phone agencyName isVerified')
            .sort(sort)
            .skip(skip)
            .limit(limit);
        const totalHouses = await House_1.default.countDocuments(filter);
        const totalPages = Math.ceil(totalHouses / limit);
        successResponse(res, {
            houses,
            pagination: {
                currentPage: page,
                totalPages,
                totalHouses,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        }, 'Public houses retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching public houses:', error);
        errorResponse(res, error.message, 500);
    }
};
exports.getPublicHouses = getPublicHouses;
const getTrendingHouses = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 6;
        const trending = await House_1.default.find({
            status: House_1.HouseStatus.AVAILABLE,
            approvalStatus: House_1.ApprovalStatus.APPROVED,
            isDeleted: { $ne: true }
        })
            .select('-images.data -threeDModels.data')
            .sort({ views: -1, likesCount: -1, created_at: -1 })
            .limit(limit);
        successResponse(res, trending, 'Trending listings retrieved');
    }
    catch (error) {
        errorResponse(res, error.message, 500);
    }
};
exports.getTrendingHouses = getTrendingHouses;
const getPublicHouse = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return errorResponse(res, 'Invalid house ID', 400);
        }
        const house = await House_1.default.findOne({
            _id: id,
            status: { $in: [House_1.HouseStatus.AVAILABLE, House_1.HouseStatus.UNDER_OFFER, House_1.HouseStatus.RESERVED, House_1.HouseStatus.RENTED] },
            approvalStatus: House_1.ApprovalStatus.APPROVED,
            isDeleted: { $ne: true }
        }).populate('agentId', 'name email phone agencyName isVerified');
        if (!house) {
            return errorResponse(res, 'House not found or not available', 404);
        }
        // Increment view count asynchronously
        House_1.default.findByIdAndUpdate(id, { $inc: { views: 1, uniqueViews: 1 } }).exec();
        const houseWithImages = {
            ...house.toObject(),
            images: house.images.map(img => ({
                contentType: img.contentType,
                fileName: img.fileName,
                isPrimary: img.isPrimary,
                caption: img.caption,
                roomLabel: img.roomLabel,
                data: img.data ? img.data.toString('base64') : null
            })),
            threeDModels: house.threeDModels.map(model => {
                let base64Data = null;
                if (model.data) {
                    if (Buffer.isBuffer(model.data)) {
                        base64Data = model.data.toString('base64');
                    }
                    else if (typeof model.data === 'object' && model.data !== null) {
                        const dataObj = model.data;
                        if (dataObj.$binary && dataObj.$binary.base64) {
                            base64Data = dataObj.$binary.base64;
                        }
                        else if (dataObj.data && Array.isArray(dataObj.data)) {
                            base64Data = Buffer.from(dataObj.data).toString('base64');
                        }
                    }
                }
                return {
                    contentType: model.contentType,
                    fileName: model.fileName,
                    isDefault: model.isDefault,
                    data: base64Data
                };
            })
        };
        successResponse(res, houseWithImages, 'House retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching public house:', error);
        errorResponse(res, error.message, 500);
    }
};
exports.getPublicHouse = getPublicHouse;
const getHousesForMap = async (req, res) => {
    try {
        const { bounds, propertyType, transactionType, minPrice, maxPrice } = req.query;
        let filter = {
            status: House_1.HouseStatus.AVAILABLE,
            approvalStatus: House_1.ApprovalStatus.APPROVED
        };
        if (propertyType)
            filter.propertyType = propertyType;
        if (transactionType)
            filter.transactionType = transactionType;
        if (minPrice || maxPrice) {
            filter['pricing.price'] = {};
            if (minPrice)
                filter['pricing.price'].$gte = parseFloat(minPrice);
            if (maxPrice)
                filter['pricing.price'].$lte = parseFloat(maxPrice);
        }
        if (bounds) {
            try {
                const { ne, sw } = JSON.parse(bounds);
                filter['location.coordinates'] = {
                    $geoWithin: {
                        $box: [
                            [sw.lng, sw.lat],
                            [ne.lng, ne.lat]
                        ]
                    }
                };
            }
            catch (e) {
                // Fallback to all houses if invalid bounds
            }
        }
        const houses = await House_1.default.find(filter)
            .select('title propertyType transactionType pricing.price location details tags isVerified views likesCount');
        const housesWithMapData = houses.map(house => ({
            _id: house._id,
            title: house.title,
            propertyType: house.propertyType,
            transactionType: house.transactionType || 'RENT',
            price: house.pricing.price,
            isVerified: house.isVerified,
            tags: house.tags || [],
            location: {
                address: house.location.address,
                city: house.location.city,
                state: house.location.state,
                neighborhood: house.location.neighborhood,
                coordinates: house.location.coordinates
            },
            details: {
                bedrooms: house.details.bedrooms,
                bathrooms: house.details.bathrooms,
                area: house.details.area,
                furnished: house.details.furnished
            },
            likesCount: house.likesCount || 0,
            views: house.views || 0
        }));
        successResponse(res, housesWithMapData, 'Map houses retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching map houses:', error);
        errorResponse(res, error.message, 500);
    }
};
exports.getHousesForMap = getHousesForMap;
const getPublicFilterOptions = async (req, res) => {
    try {
        const baseFilter = {
            status: House_1.HouseStatus.AVAILABLE,
            approvalStatus: House_1.ApprovalStatus.APPROVED,
            isDeleted: { $ne: true }
        };
        const propertyTypes = await House_1.default.distinct('propertyType', baseFilter);
        const transactionTypes = ['RENT', 'BUY', 'SHORT_STAY'];
        const intendedPurposes = [
            'LIVING', 'FAMILY', 'STUDENT', 'TEMPORARY', 'BUSINESS',
            'STORAGE_INDUSTRIAL', 'RESIDENTIAL_OWNERSHIP', 'COMMERCIAL_INVESTMENT', 'DEVELOPMENT', 'AGRICULTURE'
        ];
        const cities = await House_1.default.distinct('location.city', baseFilter);
        const neighborhoods = await House_1.default.distinct('location.neighborhood', baseFilter);
        const amenities = await House_1.default.distinct('details.amenities', baseFilter);
        const tags = await House_1.default.distinct('tags', baseFilter);
        const priceRange = await House_1.default.aggregate([
            { $match: baseFilter },
            {
                $group: {
                    _id: null,
                    minPrice: { $min: '$pricing.price' },
                    maxPrice: { $max: '$pricing.price' }
                }
            }
        ]);
        const bedroomOptions = await House_1.default.aggregate([
            { $match: baseFilter },
            { $group: { _id: '$details.bedrooms', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        successResponse(res, {
            propertyTypes: propertyTypes.filter(Boolean).sort(),
            transactionTypes,
            intendedPurposes,
            cities: cities.filter(Boolean).sort(),
            neighborhoods: neighborhoods.filter(Boolean).sort(),
            amenities: amenities.filter(Boolean).sort(),
            tags: tags.filter(Boolean).sort(),
            priceRange: priceRange[0] || { minPrice: 0, maxPrice: 50000000 },
            bedroomOptions: bedroomOptions.filter(b => b._id !== null)
        }, 'Public filter options retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching public filter options:', error);
        errorResponse(res, error.message, 500);
    }
};
exports.getPublicFilterOptions = getPublicFilterOptions;
const getThreeDModel = async (req, res) => {
    try {
        const { id } = req.params;
        const modelIndex = parseInt(req.query.index) || 0;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return errorResponse(res, 'Invalid house ID', 400);
        }
        const house = await House_1.default.findOne({
            _id: id,
            status: House_1.HouseStatus.AVAILABLE,
            approvalStatus: House_1.ApprovalStatus.APPROVED,
            isDeleted: { $ne: true }
        });
        if (!house || !house.threeDModels || house.threeDModels.length === 0) {
            return errorResponse(res, '3D model not found', 404);
        }
        const model = house.threeDModels[modelIndex];
        res.set('Content-Type', model.contentType);
        res.set('Cache-Control', 'public, max-age=31536000');
        res.send(model.data);
    }
    catch (error) {
        console.error('Error serving 3D model:', error);
        errorResponse(res, 'Internal server error', 500);
    }
};
exports.getThreeDModel = getThreeDModel;
const getHouseImage = async (req, res) => {
    try {
        const { id } = req.params;
        const imageIndex = parseInt(req.query.index) || 0;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return errorResponse(res, 'Invalid house ID', 400);
        }
        const house = await House_1.default.findOne({ _id: id, isDeleted: { $ne: true } });
        if (!house || !house.images || house.images.length === 0) {
            return errorResponse(res, 'Image not found', 404);
        }
        const image = house.images[imageIndex] || house.images[0];
        res.set('Content-Type', image.contentType);
        res.set('Cache-Control', 'public, max-age=31536000');
        res.send(image.data);
    }
    catch (error) {
        console.error('Error serving house image:', error);
        errorResponse(res, 'Internal server error', 500);
    }
};
exports.getHouseImage = getHouseImage;
