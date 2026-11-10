import { Request, Response } from 'express';
import Food, { IFood, FoodCategory } from '../models/Food';
import mongoose from 'mongoose';

// Helper functions
const successResponse = (res: Response, data: any, message: string = 'Success', statusCode: number = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const errorResponse = (res: Response, message: string = 'Error', statusCode: number = 500) => {
  res.status(statusCode).json({
    success: false,
    message
  });
};

// Get all foods (FOR ADMIN) - INCLUDES IMAGEDATA
export const getAllFoods = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const category = req.query.category as string || '';
    const status = req.query.status as string || '';
    const quantityAvailable = req.query.quantityAvailable as string || '';
    const minPrice = parseFloat(req.query.minPrice as string) || 0;
    const maxPrice = parseFloat(req.query.maxPrice as string) || 1000000;
    const sortBy = req.query.sortBy as string || 'created_at';
    const sortOrder = req.query.sortOrder as string === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};
    
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
    } else if (quantityAvailable === 'false') {
      filter.quantity_available = false;
    }

    // Price range filter
    filter.price = { $gte: minPrice, $lte: maxPrice };

    // Sort object
    const sort: any = {};
    sort[sortBy] = sortOrder;

    // MODIFIED: Include imageData for admin panel
    const foods = await Food.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalFoods = await Food.countDocuments(filter);
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
  } catch (error: any) {
    console.error('Error fetching foods:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get only available foods (PUBLIC API) - NOW INCLUDES IMAGEDATA
export const getAvailableFoods = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const search = req.query.search as string || '';
    const category = req.query.category as string || '';
    const minPrice = parseFloat(req.query.minPrice as string) || 0;
    const maxPrice = parseFloat(req.query.maxPrice as string) || 1000000;
    const sortBy = req.query.sortBy as string || 'created_at';
    const sortOrder = req.query.sortOrder as string === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    // Build filter object - ONLY AVAILABLE FOODS
    const filter: any = { 
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
    const sort: any = {};
    sort[sortBy] = sortOrder;

    // CHANGED: Now include imageData for public page too
    const foods = await Food.find(filter)
      // REMOVED: .select('-imageData') // Now includes imageData
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalFoods = await Food.countDocuments(filter);
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
  } catch (error: any) {
    console.error('Error fetching available foods:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get single food by ID (ADMIN) - INCLUDES IMAGEDATA
export const getFood = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid food ID', 400);
    }

    // ADMIN: Include imageData
    const food = await Food.findById(id);
    
    if (!food) {
      return errorResponse(res, 'Food not found', 404);
    }

    successResponse(res, food, 'Food retrieved successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Get public single food (only available) - EXCLUDES IMAGEDATA
export const getPublicFood = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid food ID', 400);
    }

    const food = await Food.findOne({ 
      _id: id, 
      status: 'AVAILABLE',
      quantity_available: true 
    }).select('-imageData');
    
    if (!food) {
      return errorResponse(res, 'Food not found or not available', 404);
    }

    successResponse(res, food, 'Food retrieved successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Serve food image (handles old URL format)
export const serveFoodImage = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    // Find food by image URL (exact match)
    const food = await Food.findOne({ image: `/uploads/foods/${filename}` });
    
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
  } catch (error: any) {
    console.error('Error serving food image:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get food image by ID
export const getFoodImageById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const food = await Food.findById(id);
    
    if (!food || !food.imageData || !food.imageData.data) {
      return res.status(404).json({ 
        success: false, 
        message: 'Image not found' 
      });
    }

    res.set('Content-Type', food.imageData.contentType);
    res.set('Cache-Control', 'public, max-age=31536000');
    res.send(food.imageData.data);
  } catch (error: any) {
    console.error('Error fetching food image:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Create new food (ADMIN) - INCLUDES IMAGEDATA in response
export const createFood = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      category,
      price,
      quantity_available,
      status
    } = req.body;

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

    const newFood = new Food({
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
  } catch (error: any) {
    console.error('Error creating food:', error);
    errorResponse(res, error.message, 500);
  }
};

// Update food (ADMIN) - INCLUDES IMAGEDATA in response
export const updateFood = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid food ID', 400);
    }

    const food = await Food.findById(id);
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
    const updatedFood = await Food.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true, runValidators: true }
    );

    successResponse(res, updatedFood, 'Food updated successfully');
  } catch (error: any) {
    console.error('Error updating food:', error);
    errorResponse(res, error.message, 500);
  }
};

// Update food availability status (ADMIN) - INCLUDES IMAGEDATA
export const updateFoodStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['AVAILABLE', 'UNAVAILABLE'];
    if (!validStatuses.includes(status)) {
      return errorResponse(res, 'Invalid status', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid food ID', 400);
    }

    const food = await Food.findById(id);
    if (!food) {
      return errorResponse(res, 'Food not found', 404);
    }

    // ADMIN: Include imageData in response
    const updatedFood = await Food.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    successResponse(res, updatedFood, `Food status updated to ${status} successfully`);
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Toggle quantity availability (ADMIN) - INCLUDES IMAGEDATA
export const toggleQuantityAvailable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity_available } = req.body;

    if (typeof quantity_available !== 'boolean') {
      return errorResponse(res, 'quantity_available must be a boolean value', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid food ID', 400);
    }

    const food = await Food.findById(id);
    if (!food) {
      return errorResponse(res, 'Food not found', 404);
    }

    // ADMIN: Include imageData in response
    const updatedFood = await Food.findByIdAndUpdate(
      id,
      { quantity_available },
      { new: true, runValidators: true }
    );

    successResponse(res, updatedFood, `Food quantity availability ${quantity_available ? 'enabled' : 'disabled'} successfully`);
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Delete food
export const deleteFood = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid food ID', 400);
    }

    const food = await Food.findById(id);
    if (!food) {
      return errorResponse(res, 'Food not found', 404);
    }

    await Food.findByIdAndDelete(id);

    successResponse(res, null, 'Food deleted successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Increment view count - EXCLUDES IMAGEDATA (public endpoint)
export const incrementView = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid food ID', 400);
    }

    const food = await Food.findByIdAndUpdate(
      id,
      { $inc: { view: 1 } },
      { new: true }
    ).select('-imageData');
    
    if (!food) {
      return errorResponse(res, 'Food not found', 404);
    }

    successResponse(res, food, 'View count incremented');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Get food statistics
export const getFoodStatistics = async (req: Request, res: Response) => {
  try {
    const totalFoods = await Food.countDocuments();
    const availableFoods = await Food.countDocuments({ status: 'AVAILABLE', quantity_available: true });
    const unavailableFoods = await Food.countDocuments({ status: 'UNAVAILABLE' });
    const outOfStockFoods = await Food.countDocuments({ quantity_available: false });
    
    // Calculate total views
    const totalViewsResult = await Food.aggregate([
      { 
        $group: { 
          _id: null, 
          totalViews: { $sum: '$view' } 
        } 
      }
    ]);
    const totalViews = totalViewsResult[0]?.totalViews || 0;
    
    // Group by category
    const categoryStats = await Food.aggregate([
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
    const statusStats = await Food.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Top viewed foods - EXCLUDES IMAGEDATA for performance
    const topViewedFoods = await Food.find({ status: 'AVAILABLE' })
      .select('-imageData')
      .sort({ view: -1 })
      .limit(5)
      .select('name view price category image')
      .lean();

    // Price statistics
    const priceStats = await Food.aggregate([
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
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get unique values for filters
export const getFilterOptions = async (req: Request, res: Response) => {
  try {
    const categories = Object.values(FoodCategory);
    const statuses = ['AVAILABLE', 'UNAVAILABLE'];

    successResponse(res, {
      categories,
      statuses
    }, 'Filter options retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching filter options:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get public filter options (only from available foods)
export const getPublicFilterOptions = async (req: Request, res: Response) => {
  try {
    const categories = await Food.distinct('category', { 
      status: 'AVAILABLE',
      quantity_available: true 
    });

    successResponse(res, {
      categories: categories.filter(Boolean).sort()
    }, 'Public filter options retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching public filter options:', error);
    errorResponse(res, error.message, 500);
  }
};