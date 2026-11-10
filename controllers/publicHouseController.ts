import { Request, Response } from 'express';
import House, { HouseStatus, ApprovalStatus } from '../models/House';
import mongoose from 'mongoose';

const successResponse = (res: Response, data: any, message: string = 'Success', statusCode: number = 200) => {
  res.status(statusCode).json({ success: true, message, data });
};

const errorResponse = (res: Response, message: string = 'Error', statusCode: number = 500) => {
  res.status(statusCode).json({ success: false, message });
};

export const getPublicHouses = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const search = req.query.search as string || '';
    const propertyType = req.query.propertyType as string || '';
    const transactionType = req.query.transactionType as string || '';
    const intendedPurpose = req.query.intendedPurpose as string || '';
    const city = req.query.city as string || '';
    const neighborhood = req.query.neighborhood as string || '';
    const minPrice = parseFloat(req.query.minPrice as string) || 0;
    const maxPrice = parseFloat(req.query.maxPrice as string) || 1000000000000;
    const minBedrooms = parseInt(req.query.minBedrooms as string) || 0;
    const minBathrooms = parseInt(req.query.minBathrooms as string) || 0;
    const isVerified = req.query.isVerified as string;
    const furnishingStatus = req.query.furnishingStatus as string || '';
    const sortBy = req.query.sortBy as string || 'created_at';
    const sortOrder = req.query.sortOrder as string === 'asc' ? 1 : -1;
    const amenities = req.query.amenities ? (req.query.amenities as string).split(',').map(a => a.trim()) : [];
    const tags = req.query.tags ? (req.query.tags as string).split(',').map(t => t.trim()) : [];

    const skip = (page - 1) * limit;

    const filter: any = {
      status: HouseStatus.AVAILABLE,
      approvalStatus: ApprovalStatus.APPROVED,
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

    if (propertyType) filter.propertyType = propertyType;
    if (transactionType) filter.transactionType = transactionType;
    if (intendedPurpose) filter.intendedPurpose = intendedPurpose;
    if (city) filter['location.city'] = { $regex: city, $options: 'i' };
    if (neighborhood) filter['location.neighborhood'] = { $regex: neighborhood, $options: 'i' };
    if (isVerified === 'true') filter.isVerified = true;
    if (furnishingStatus) filter['details.furnishingStatus'] = furnishingStatus;

    if (minBedrooms > 0) filter['details.bedrooms'] = { $gte: minBedrooms };
    if (minBathrooms > 0) filter['details.bathrooms'] = { $gte: minBathrooms };
    if (amenities.length > 0) filter['details.amenities'] = { $all: amenities };
    if (tags.length > 0) filter.tags = { $in: tags };
    
    filter['pricing.price'] = { $gte: minPrice, $lte: maxPrice };

    const sort: any = {};
    if (sortBy === 'price') {
      sort['pricing.price'] = sortOrder;
    } else if (sortBy === 'most_liked') {
      sort['likesCount'] = -1;
    } else if (sortBy === 'most_viewed') {
      sort['views'] = -1;
    } else if (sortBy === 'trending') {
      sort['trendingScore'] = -1;
      sort['views'] = -1;
    } else {
      sort[sortBy] = sortOrder;
    }

    // Get houses WITHOUT binary data for rapid response
    const houses = await House.find(filter)
      .select('-images.data -threeDModels.data')
      .populate('agentId', 'name email phone agencyName isVerified')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalHouses = await House.countDocuments(filter);
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
  } catch (error: any) {
    console.error('Error fetching public houses:', error);
    errorResponse(res, error.message, 500);
  }
};

export const getTrendingHouses = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 6;
    const trending = await House.find({
      status: HouseStatus.AVAILABLE,
      approvalStatus: ApprovalStatus.APPROVED,
      isDeleted: { $ne: true }
    })
      .select('-images.data -threeDModels.data')
      .sort({ views: -1, likesCount: -1, created_at: -1 })
      .limit(limit);

    successResponse(res, trending, 'Trending listings retrieved');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

export const getPublicHouse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid house ID', 400);
    }

    const house = await House.findOne({
      _id: id,
      status: { $in: [HouseStatus.AVAILABLE, HouseStatus.UNDER_OFFER, HouseStatus.RESERVED, HouseStatus.RENTED] },
      approvalStatus: ApprovalStatus.APPROVED,
      isDeleted: { $ne: true }
    }).populate('agentId', 'name email phone agencyName isVerified');

    if (!house) {
      return errorResponse(res, 'House not found or not available', 404);
    }

    // Increment view count asynchronously
    House.findByIdAndUpdate(id, { $inc: { views: 1, uniqueViews: 1 } }).exec();

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
          } else if (typeof model.data === 'object' && model.data !== null) {
            const dataObj = model.data as any;
            if (dataObj.$binary && dataObj.$binary.base64) {
              base64Data = dataObj.$binary.base64;
            } else if (dataObj.data && Array.isArray(dataObj.data)) {
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
  } catch (error: any) {
    console.error('Error fetching public house:', error);
    errorResponse(res, error.message, 500);
  }
};

export const getHousesForMap = async (req: Request, res: Response) => {
  try {
    const { bounds, propertyType, transactionType, minPrice, maxPrice } = req.query;
    let filter: any = {
      status: HouseStatus.AVAILABLE,
      approvalStatus: ApprovalStatus.APPROVED
    };

    if (propertyType) filter.propertyType = propertyType;
    if (transactionType) filter.transactionType = transactionType;
    if (minPrice || maxPrice) {
      filter['pricing.price'] = {};
      if (minPrice) filter['pricing.price'].$gte = parseFloat(minPrice as string);
      if (maxPrice) filter['pricing.price'].$lte = parseFloat(maxPrice as string);
    }

    if (bounds) {
      try {
        const { ne, sw } = JSON.parse(bounds as string);
        filter['location.coordinates'] = {
          $geoWithin: {
            $box: [
              [sw.lng, sw.lat],
              [ne.lng, ne.lat]
            ]
          }
        };
      } catch (e) {
        // Fallback to all houses if invalid bounds
      }
    }

    const houses = await House.find(filter)
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
  } catch (error: any) {
    console.error('Error fetching map houses:', error);
    errorResponse(res, error.message, 500);
  }
};

export const getPublicFilterOptions = async (req: Request, res: Response) => {
  try {
    const baseFilter = {
      status: HouseStatus.AVAILABLE,
      approvalStatus: ApprovalStatus.APPROVED,
      isDeleted: { $ne: true }
    };

    const propertyTypes = await House.distinct('propertyType', baseFilter);

    const transactionTypes = ['RENT', 'BUY', 'SHORT_STAY'];
    const intendedPurposes = [
      'LIVING', 'FAMILY', 'STUDENT', 'TEMPORARY', 'BUSINESS', 
      'STORAGE_INDUSTRIAL', 'RESIDENTIAL_OWNERSHIP', 'COMMERCIAL_INVESTMENT', 'DEVELOPMENT', 'AGRICULTURE'
    ];

    const cities = await House.distinct('location.city', baseFilter);
    const neighborhoods = await House.distinct('location.neighborhood', baseFilter);
    const amenities = await House.distinct('details.amenities', baseFilter);
    const tags = await House.distinct('tags', baseFilter);

    const priceRange = await House.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$pricing.price' },
          maxPrice: { $max: '$pricing.price' }
        }
      }
    ]);

    const bedroomOptions = await House.aggregate([
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
  } catch (error: any) {
    console.error('Error fetching public filter options:', error);
    errorResponse(res, error.message, 500);
  }
};

export const getThreeDModel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const modelIndex = parseInt(req.query.index as string) || 0;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid house ID', 400);
    }

    const house = await House.findOne({
      _id: id,
      status: HouseStatus.AVAILABLE,
      approvalStatus: ApprovalStatus.APPROVED,
      isDeleted: { $ne: true }
    });

    if (!house || !house.threeDModels || house.threeDModels.length === 0) {
      return errorResponse(res, '3D model not found', 404);
    }

    const model = house.threeDModels[modelIndex];
    
    res.set('Content-Type', model.contentType);
    res.set('Cache-Control', 'public, max-age=31536000');
    res.send(model.data);
  } catch (error: any) {
    console.error('Error serving 3D model:', error);
    errorResponse(res, 'Internal server error', 500);
  }
};

export const getHouseImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const imageIndex = parseInt(req.query.index as string) || 0;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid house ID', 400);
    }

    const house = await House.findOne({ _id: id, isDeleted: { $ne: true } });

    if (!house || !house.images || house.images.length === 0) {
      return errorResponse(res, 'Image not found', 404);
    }

    const image = house.images[imageIndex] || house.images[0];
    
    res.set('Content-Type', image.contentType);
    res.set('Cache-Control', 'public, max-age=31536000');
    res.send(image.data);
  } catch (error: any) {
    console.error('Error serving house image:', error);
    errorResponse(res, 'Internal server error', 500);
  }
};