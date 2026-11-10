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
exports.getPublicFilterOptions = exports.getFilterOptions = exports.getFoodStatistics = exports.incrementView = exports.deleteFood = exports.toggleQuantityAvailable = exports.updateFoodStatus = exports.updateFood = exports.createFood = exports.getFoodImageById = exports.serveFoodImage = exports.getPublicFood = exports.getFood = exports.getAvailableFoods = exports.getAllFoods = void 0;
const Food_1 = __importStar(require("../models/Food"));
const mongoose_1 = __importDefault(require("mongoose"));
// Helper functions
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({
        success: true,
        message,
        data
    });
};
const errorResponse = (res, message = 'Error', statusCode = 500) => {
    res.status(statusCode).json({
        success: false,
        message
    });
};
// Get all foods (FOR ADMIN) - INCLUDES IMAGEDATA
const getAllFoods = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const category = req.query.category || '';
        const status = req.query.status || '';
        const quantityAvailable = req.query.quantityAvailable || '';
        const minPrice = parseFloat(req.query.minPrice) || 0;
        const maxPrice = parseFloat(req.query.maxPrice) || 1000000;
        const sortBy = req.query.sortBy || 'created_at';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const skip = (page - 1) * limit;
        // Build filter object
        const filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (category) {
            filter.category = category;
        }
        if (status) {
            filter.status = status;
        }
        if (quantityAvailable === 'true') {
            filter.quantity_available = true;
        }
        else if (quantityAvailable === 'false') {
            filter.quantity_available = false;
        }
        // Price range filter
        filter.price = { $gte: minPrice, $lte: maxPrice };
        // Sort object
        const sort = {};
        sort[sortBy] = sortOrder;
        // MODIFIED: Include imageData for admin panel
        const foods = await Food_1.default.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit);
        const totalFoods = await Food_1.default.countDocuments(filter);
        const totalPages = Math.ceil(totalFoods / limit);
        successResponse(res, {
            foods,
            pagination: {
                currentPage: page,
                totalPages,
                totalFoods,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        }, 'Foods retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching foods:', error);
        errorResponse(res, error.message, 500);
    }
};
exports.getAllFoods = getAllFoods;
// Get only available foods (PUBLIC API) - NOW INCLUDES IMAGEDATA
const getAvailableFoods = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const search = req.query.search || '';
        const category = req.query.category || '';
        const minPrice = parseFloat(req.query.minPrice) || 0;
        const maxPrice = parseFloat(req.query.maxPrice) || 1000000;
        const sortBy = req.query.sortBy || 'created_at';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const skip = (page - 1) * limit;
        // Build filter object - ONLY AVAILABLE FOODS
        const filter = {
            status: 'AVAILABLE',
            quantity_available: true
        };
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (category) {
            filter.category = category;
        }
        // Price range filter
        filter.price = { $gte: minPrice, $lte: maxPrice };
        // Sort object
        const sort = {};
        sort[sortBy] = sortOrder;
        // CHANGED: Now include imageData for public page too
        const foods = await Food_1.default.find(filter)
            // REMOVED: .select('-imageData') // Now includes imageData
            .sort(sort)
            .skip(skip)
            .limit(limit);
        const totalFoods = await Food_1.default.countDocuments(filter);
        const totalPages = Math.ceil(totalFoods / limit);
        successResponse(res, {
            foods,
            pagination: {
                currentPage: page,
                totalPages,
                totalFoods,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        }, 'Available foods retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching available foods:', error);
        errorResponse(res, error.message, 500);
    }
};
exports.getAvailableFoods = getAvailableFoods;
// Get single food by ID (ADMIN) - INCLUDES IMAGEDATA
const getFood = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return errorResponse(res, 'Invalid food ID', 400);
        }
        // ADMIN: Include imageData
        const food = await Food_1.default.findById(id);
        if (!food) {
            return errorResponse(res, 'Food not found', 404);
        }
        successResponse(res, food, 'Food retrieved successfully');
    }
    catch (error) {
        errorResponse(res, error.message, 500);
    }
};
exports.getFood = getFood;
// Get public single food (only available) - EXCLUDES IMAGEDATA
const getPublicFood = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return errorResponse(res, 'Invalid food ID', 400);
        }
        const food = await Food_1.default.findOne({
            _id: id,
            status: 'AVAILABLE',
            quantity_available: true
        }).select('-imageData');
        if (!food) {
            return errorResponse(res, 'Food not found or not available', 404);
        }
        successResponse(res, food, 'Food retrieved successfully');
    }
    catch (error) {
        errorResponse(res, error.message, 500);
    }
};
exports.getPublicFood = getPublicFood;
// Serve food image (handles old URL format)
const serveFoodImage = async (req, res) => {
    try {
        const { filename } = req.params;
        // Find food by image URL (exact match)
        const food = await Food_1.default.findOne({ image: `/uploads/foods/${filename}` });
        if (!food || !food.imageData || !food.imageData.data) {
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }
        // Set proper headers and send the image
        res.set('Content-Type', food.imageData.contentType);
        res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        res.send(food.imageData.data);
    }
    catch (error) {
        console.error('Error serving food image:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.serveFoodImage = serveFoodImage;
// Get food image by ID
const getFoodImageById = async (req, res) => {
    try {
        const { id } = req.params;
        const food = await Food_1.default.findById(id);
        if (!food || !food.imageData || !food.imageData.data) {
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }
        res.set('Content-Type', food.imageData.contentType);
        res.set('Cache-Control', 'public, max-age=31536000');
        res.send(food.imageData.data);
    }
    catch (error) {
        console.error('Error fetching food image:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.getFoodImageById = getFoodImageById;
// Create new food (ADMIN) - INCLUDES IMAGEDATA in response
const createFood = async (req, res) => {
    try {
        const { name, description, category, price, quantity_available, status } = req.body;
        // Handle image upload
        let image = '';
        let imageData = undefined;
        if (req.file) {
            // Store actual data
            imageData = {
                data: req.file.buffer,
                contentType: req.file.mimetype,
                fileName: req.file.originalname
            };
            // Keep old URL format for frontend compatibility
            image = `/uploads/foods/${Date.now()}-${Math.random().toString(36).substring(2)}-${req.file.originalname}`;
        }
        const newFood = new Food_1.default({
            name,
            description,
            category,
            price: parseFloat(price),
            image, // Keep for frontend
            imageData, // Store actual data
            quantity_available: quantity_available === 'true' || quantity_available === true,
            status: status || 'AVAILABLE',
            view: 0
        });
        await newFood.save();
        // ADMIN: Return with imageData for immediate display
        successResponse(res, newFood, 'Food created successfully', 201);
    }
    catch (error) {
        console.error('Error creating food:', error);
        errorResponse(res, error.message, 500);
    }
};
exports.createFood = createFood;
// Update food (ADMIN) - INCLUDES IMAGEDATA in response
const updateFood = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return errorResponse(res, 'Invalid food ID', 400);
        }
        const food = await Food_1.default.findById(id);
        if (!food) {
            return errorResponse(res, 'Food not found', 404);
        }
        // Handle image upload
        if (req.file) {
            // Store actual data
            req.body.imageData = {
                data: req.file.buffer,
                contentType: req.file.mimetype,
                fileName: req.file.originalname
            };
            // Keep old URL format
            req.body.image = `/uploads/foods/${Date.now()}-${Math.random().toString(36).substring(2)}-${req.file.originalname}`;
        }
        // Parse price to number
        if (req.body.price) {
            req.body.price = parseFloat(req.body.price);
        }
        // Parse quantity_available to boolean
        if (req.body.quantity_available !== undefined) {
            req.body.quantity_available = req.body.quantity_available === 'true' || req.body.quantity_available === true;
        }
        // ADMIN: Include imageData in response
        const updatedFood = await Food_1.default.findByIdAndUpdate(id, { ...req.body }, { new: true, runValidators: true });
        successResponse(res, updatedFood, 'Food updated successfully');
    }
    catch (error) {
        console.error('Error updating food:', error);
        errorResponse(res, error.message, 500);
    }
};
exports.updateFood = updateFood;
// Update food availability status (ADMIN) - INCLUDES IMAGEDATA
const updateFoodStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['AVAILABLE', 'UNAVAILABLE'];
        if (!validStatuses.includes(status)) {
            return errorResponse(res, 'Invalid status', 400);
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return errorResponse(res, 'Invalid food ID', 400);
        }
        const food = await Food_1.default.findById(id);
        if (!food) {
            return errorResponse(res, 'Food not found', 404);
        }
        // ADMIN: Include imageData in response
        const updatedFood = await Food_1.default.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
        successResponse(res, updatedFood, `Food status updated to ${status} successfully`);
    }
    catch (error) {
        errorResponse(res, error.message, 500);
    }
};
exports.updateFoodStatus = updateFoodStatus;
// Toggle quantity availability (ADMIN) - INCLUDES IMAGEDATA
const toggleQuantityAvailable = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity_available } = req.body;
        if (typeof quantity_available !== 'boolean') {
            return errorResponse(res, 'quantity_available must be a boolean value', 400);
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return errorResponse(res, 'Invalid food ID', 400);
        }
        const food = await Food_1.default.findById(id);
        if (!food) {
            return errorResponse(res, 'Food not found', 404);
        }
        // ADMIN: Include imageData in response
        const updatedFood = await Food_1.default.findByIdAndUpdate(id, { quantity_available }, { new: true, runValidators: true });
        successResponse(res, updatedFood, `Food quantity availability ${quantity_available ? 'enabled' : 'disabled'} successfully`);
    }
    catch (error) {
        errorResponse(res, error.message, 500);
    }
};
exports.toggleQuantityAvailable = toggleQuantityAvailable;
// Delete food
const deleteFood = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return errorResponse(res, 'Invalid food ID', 400);
        }
        const food = await Food_1.default.findById(id);
        if (!food) {
            return errorResponse(res, 'Food not found', 404);
        }
        await Food_1.default.findByIdAndDelete(id);
        successResponse(res, null, 'Food deleted successfully');
    }
    catch (error) {
        errorResponse(res, error.message, 500);
    }
};
exports.deleteFood = deleteFood;
// Increment view count - EXCLUDES IMAGEDATA (public endpoint)
const incrementView = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return errorResponse(res, 'Invalid food ID', 400);
        }
        const food = await Food_1.default.findByIdAndUpdate(id, { $inc: { view: 1 } }, { new: true }).select('-imageData');
        if (!food) {
            return errorResponse(res, 'Food not found', 404);
        }
        successResponse(res, food, 'View count incremented');
    }
    catch (error) {
        errorResponse(res, error.message, 500);
    }
};
exports.incrementView = incrementView;
// Get food statistics
const getFoodStatistics = async (req, res) => {
    try {
        const totalFoods = await Food_1.default.countDocuments();
        const availableFoods = await Food_1.default.countDocuments({ status: 'AVAILABLE', quantity_available: true });
        const unavailableFoods = await Food_1.default.countDocuments({ status: 'UNAVAILABLE' });
        const outOfStockFoods = await Food_1.default.countDocuments({ quantity_available: false });
        // Calculate total views
        const totalViewsResult = await Food_1.default.aggregate([
            {
                $group: {
                    _id: null,
                    totalViews: { $sum: '$view' }
                }
            }
        ]);
        const totalViews = totalViewsResult[0]?.totalViews || 0;
        // Group by category
        const categoryStats = await Food_1.default.aggregate([
            { $match: { category: { $ne: null } } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    avgPrice: { $avg: '$price' }
                }
            },
            { $sort: { count: -1 } }
        ]);
        // Group by status
        const statusStats = await Food_1.default.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        // Top viewed foods - EXCLUDES IMAGEDATA for performance
        const topViewedFoods = await Food_1.default.find({ status: 'AVAILABLE' })
            .select('-imageData')
            .sort({ view: -1 })
            .limit(5)
            .select('name view price category image')
            .lean();
        // Price statistics
        const priceStats = await Food_1.default.aggregate([
            {
                $group: {
                    _id: null,
                    minPrice: { $min: '$price' },
                    maxPrice: { $max: '$price' },
                    avgPrice: { $avg: '$price' }
                }
            }
        ]);
        successResponse(res, {
            totalFoods,
            availableFoods,
            unavailableFoods,
            outOfStockFoods,
            totalViews,
            categoryStats,
            statusStats,
            topViewedFoods,
            priceStats: priceStats[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 }
        }, 'Statistics retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching stats:', error);
        errorResponse(res, error.message, 500);
    }
};
exports.getFoodStatistics = getFoodStatistics;
// Get unique values for filters
const getFilterOptions = async (req, res) => {
    try {
        const categories = Object.values(Food_1.FoodCategory);
        const statuses = ['AVAILABLE', 'UNAVAILABLE'];
        successResponse(res, {
            categories,
            statuses
        }, 'Filter options retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching filter options:', error);
        errorResponse(res, error.message, 500);
    }
};
exports.getFilterOptions = getFilterOptions;
// Get public filter options (only from available foods)
const getPublicFilterOptions = async (req, res) => {
    try {
        const categories = await Food_1.default.distinct('category', {
            status: 'AVAILABLE',
            quantity_available: true
        });
        successResponse(res, {
            categories: categories.filter(Boolean).sort()
        }, 'Public filter options retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching public filter options:', error);
        errorResponse(res, error.message, 500);
    }
};
exports.getPublicFilterOptions = getPublicFilterOptions;
