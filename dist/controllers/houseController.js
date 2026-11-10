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
exports.getAdminHouseModel = exports.debugHouseImage = exports.getAdminHouseImage = exports.incrementView = exports.getFilterOptions = exports.getHouseStatistics = exports.updateHouseStatus = exports.approveHouse = exports.deleteHouse = exports.updateHouse = exports.createHouse = exports.getHouse = exports.getAllHouses = void 0;
const House_1 = __importStar(require("../models/House"));
const mongoose_1 = __importDefault(require("mongoose"));
const Appointment_1 = __importStar(require("../models/Appointment"));
const RentalApplication_1 = __importStar(require("../models/RentalApplication"));
const LeaseAgreement_1 = __importStar(require("../models/LeaseAgreement"));
const PurchaseOffer_1 = __importStar(require("../models/PurchaseOffer"));
const MaintenanceRequest_1 = __importStar(require("../models/MaintenanceRequest"));
const ListingReport_1 = __importDefault(require("../models/ListingReport"));
const Order_1 = __importStar(require("../models/Order"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const User_1 = __importDefault(require("../models/User"));
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({ success: true, message, data });
};
const errorResponse = (res, message = 'Error', statusCode = 500) => {
    res.status(statusCode).json({ success: false, message });
};
// ─── Helpers ────────────────────────────────────────────────────────
/** Safely parse a JSON field that may arrive as a string or already-parsed object. */
const parseJsonField = (value, fallback = undefined) => {
    if (value === undefined || value === null || value === '')
        return fallback;
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        }
        catch {
            throw new Error('Invalid JSON data in request');
        }
    }
    return value;
};
/** Coerce "true"/"false"/boolean into a boolean. */
const toBool = (value, fallback = false) => {
    if (value === undefined || value === null || value === '')
        return fallback;
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'string')
        return value.toLowerCase() === 'true';
    return Boolean(value);
};
/** Normalize tags: accepts "a,b,c", ["a","b"], or undefined. */
const normalizeTags = (value) => {
    if (!value)
        return [];
    if (Array.isArray(value))
        return value.map((t) => String(t).trim()).filter(Boolean);
    if (typeof value === 'string') {
        return value
            .split(',')
            .map((t) => t.trim().replace(/^#/, ''))
            .filter(Boolean);
    }
    return [];
};
/** Build the image array from multer files. */
const buildImagesFromFiles = (files) => {
    if (!files || files.length === 0)
        return undefined;
    return files.map((file, index) => ({
        data: file.buffer,
        contentType: file.mimetype,
        fileName: file.originalname,
        isPrimary: index === 0,
    }));
};
/** Build the 3D-model array from multer files. */
const buildModelsFromFiles = (files) => {
    if (!files || files.length === 0)
        return undefined;
    return files.map((file, index) => ({
        data: file.buffer,
        contentType: file.mimetype || 'model/gltf-binary',
        fileName: file.originalname,
        isDefault: index === 0,
    }));
};
// ─── LIST (admin / agent / owner) ──────────────────────────────────
const getAllHouses = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const search = req.query.search || '';
        const propertyType = req.query.propertyType || '';
        const status = req.query.status || '';
        const approvalStatus = req.query.approvalStatus || '';
        const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
        const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
        const minBedrooms = parseInt(req.query.minBedrooms) || 0;
        const minBathrooms = parseInt(req.query.minBathrooms) || 0;
        const amenities = req.query.amenities
            ? req.query.amenities.split(',')
            : [];
        const sortBy = req.query.sortBy || 'created_at';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const skip = (page - 1) * limit;
        const filter = {};
        if (req.query.isDeleted === 'true') {
            filter.isDeleted = true;
        }
        else {
            filter.isDeleted = { $ne: true };
        }
        // ─── ROLE BASED FILTERING ──────────────────────────────────────
        const user = req.user;
        if (user) {
            if (user.role === 'agent') {
                filter.agentId = user._id;
            }
            else if (user.role === 'owner') {
                filter.ownerId = user._id;
            }
            else if (user.role === 'customer' || user.role === 'user') {
                filter.approvalStatus = House_1.ApprovalStatus.APPROVED;
            }
        }
        else {
            filter.approvalStatus = House_1.ApprovalStatus.APPROVED;
        }
        // ───────────────────────────────────────────────────────────────
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { 'location.address': { $regex: search, $options: 'i' } },
                { 'location.city': { $regex: search, $options: 'i' } },
            ];
        }
        if (propertyType)
            filter.propertyType = propertyType;
        if (status)
            filter.status = status;
        if (approvalStatus)
            filter.approvalStatus = approvalStatus;
        if (minBedrooms > 0)
            filter['details.bedrooms'] = { $gte: minBedrooms };
        if (minBathrooms > 0)
            filter['details.bathrooms'] = { $gte: minBathrooms };
        if (amenities.length > 0)
            filter['details.amenities'] = { $all: amenities };
        if (minPrice !== null || maxPrice !== null) {
            filter['pricing.price'] = {};
            if (minPrice !== null)
                filter['pricing.price'].$gte = minPrice;
            if (maxPrice !== null)
                filter['pricing.price'].$lte = maxPrice;
        }
        const sort = {};
        if (sortBy === 'price')
            sort['pricing.price'] = sortOrder;
        else if (sortBy === '-pricing.price')
            sort['pricing.price'] = -1;
        else if (sortBy === 'views')
            sort.views = sortOrder;
        else
            sort[sortBy] = sortOrder;
        const houses = await House_1.default.find(filter)
            .select('-images.data -threeDModels.data')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate('agentId', 'name email profile.phone')
            .populate('ownerId', 'name email profile.phone');
        const totalHouses = await House_1.default.countDocuments(filter);
        const totalPages = Math.ceil(totalHouses / limit);
        successResponse(res, {
            houses,
            pagination: {
                currentPage: page,
                totalPages,
                totalHouses,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        }, 'Houses retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching houses:', error);
        errorResponse(res, error.message, 500);
    }
};
exports.getAllHouses = getAllHouses;
// ─── GET ONE ───────────────────────────────────────────────────────
const getHouse = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return errorResponse(res, 'Invalid house ID', 400);
        }
        const house = await House_1.default.findById(id)
            .populate('agentId', 'name email profile.phone')
            .populate('ownerId', 'name email profile.phone');
        if (!house)
            return errorResponse(res, 'House not found', 404);
        if (house.isDeleted) {
            const user = req.user;
            const isAdminUser = user && (user.role === 'admin' || user.role === 'manager');
            const agentIdStr = house.agentId?._id?.toString() || house.agentId?.toString();
            const ownerIdStr = house.ownerId?._id?.toString() || house.ownerId?.toString();
            const userIdStr = user?._id?.toString();
            const isOwnerOrAgent = Boolean(userIdStr && (agentIdStr === userIdStr || ownerIdStr === userIdStr));
            if (!isAdminUser && !isOwnerOrAgent) {
                return errorResponse(res, 'House not found or has been deleted', 404);
            }
        }
        // ─── PERMISSION CHECK ──────────────────────────────────────────
        const user = req.user;
        const isApproved = house.approvalStatus === House_1.ApprovalStatus.APPROVED;
        const agentIdStr = house.agentId?._id?.toString() || house.agentId?.toString();
        const ownerIdStr = house.ownerId?._id?.toString() || house.ownerId?.toString();
        const userIdStr = user?._id?.toString();
        if (!isApproved) {
            if (!user)
                return errorResponse(res, 'House not found or not approved', 404);
            if (user.role === 'customer' || user.role === 'user') {
                return errorResponse(res, 'House not found or not approved', 404);
            }
            if (user.role === 'agent' && (!agentIdStr || agentIdStr !== userIdStr)) {
                return errorResponse(res, 'Unauthorized to view this unapproved house', 403);
            }
            if (user.role === 'owner' && (!ownerIdStr || ownerIdStr !== userIdStr)) {
                return errorResponse(res, 'Unauthorized to view this unapproved house', 403);
            }
        }
        // ───────────────────────────────────────────────────────────────
        const houseObj = house.toObject();
        const responseData = {
            ...houseObj,
            images: [],
            threeDModels: [],
        };
        if (Array.isArray(houseObj.images)) {
            responseData.images = houseObj.images.map((img, index) => ({
                _id: img._id,
                contentType: img.contentType,
                fileName: img.fileName,
                isPrimary: img.isPrimary,
                url: `/api/houses/${id}/image?index=${index}`,
            }));
        }
        if (Array.isArray(houseObj.threeDModels)) {
            responseData.threeDModels = houseObj.threeDModels.map((model, index) => ({
                _id: model._id,
                contentType: model.contentType,
                fileName: model.fileName,
                isDefault: model.isDefault,
                url: `/api/houses/${id}/model?index=${index}`,
            }));
        }
        successResponse(res, responseData, 'House retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching house:', error);
        errorResponse(res, error.message, 500);
    }
};
exports.getHouse = getHouse;
// ─── CREATE ────────────────────────────────────────────────────────
const createHouse = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return errorResponse(res, 'Unauthorized', 401);
        const { title, description, propertyType, transactionType, intendedPurpose, isVerified, tags, location, details, pricing, rentalPricing, saleTerms, virtualTour, panoramic360, videoUrl, floorPlan, agentName, agentContact, quantity, } = req.body;
        // ─── OWNER & AGENT LOGIC ──────────────────────────────────────
        let agentId = req.body.agentId || user._id;
        let ownerId = req.body.ownerId || user._id;
        if (user.role === 'agent') {
            agentId = user._id;
            ownerId = user.ownerId || user._id;
        }
        else if (user.role === 'owner') {
            ownerId = user._id;
            agentId = req.body.agentId || user._id;
        }
        // ──────────────────────────────────────────────────────────────
        const files = (req.files || {});
        const images = buildImagesFromFiles(files.images) || [];
        const threeDModels = buildModelsFromFiles(files.threeDModels) || [];
        // Parse JSON-ish fields
        let parsedLocation, parsedDetails, parsedPricing, parsedVirtualTour;
        let parsedRentalPricing, parsedSaleTerms, parsedPanoramic360, parsedFloorPlan, parsedProductAttributes;
        try {
            parsedLocation = parseJsonField(location);
            parsedDetails = parseJsonField(details);
            parsedPricing = parseJsonField(pricing);
            parsedVirtualTour = parseJsonField(virtualTour, { enabled: false, url: '', embedCode: '' });
            parsedRentalPricing = parseJsonField(rentalPricing);
            parsedSaleTerms = parseJsonField(saleTerms);
            parsedPanoramic360 = parseJsonField(panoramic360);
            parsedFloorPlan = parseJsonField(floorPlan);
            parsedProductAttributes = parseJsonField(req.body.productAttributes);
        }
        catch (e) {
            return errorResponse(res, e.message || 'Invalid JSON data in request', 400);
        }
        if (!parsedPricing)
            parsedPricing = {};
        if (quantity !== undefined && quantity !== '') {
            parsedPricing.quantity = parseInt(quantity, 10) || 1;
        }
        else if (!parsedPricing.quantity) {
            parsedPricing.quantity = 1;
        }
        const newHouse = new House_1.default({
            title,
            description,
            propertyType,
            transactionType: transactionType || undefined,
            intendedPurpose: intendedPurpose || undefined,
            isVerified: toBool(isVerified, false),
            tags: normalizeTags(tags),
            location: parsedLocation,
            details: parsedDetails,
            productAttributes: parsedProductAttributes,
            pricing: parsedPricing,
            rentalPricing: parsedRentalPricing,
            saleTerms: parsedSaleTerms,
            virtualTour: parsedVirtualTour,
            panoramic360: parsedPanoramic360,
            videoUrl: videoUrl || undefined,
            floorPlan: parsedFloorPlan,
            images,
            threeDModels,
            agentId,
            ownerId,
            agentName: agentName || user.name,
            agentContact: agentContact || user.email,
            views: 0,
            inquiries: 0,
        });
        await newHouse.save();
        const { images: _savedImages, threeDModels: _savedModels, ...savedHouse } = newHouse.toObject();
        successResponse(res, savedHouse, 'House created successfully', 201);
    }
    catch (error) {
        console.error('Error creating house:', error);
        if (error.code === 'LIMIT_FILE_SIZE') {
            return errorResponse(res, 'File too large. Maximum file size is 50MB', 400);
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err) => err.message);
            return errorResponse(res, messages.join(', '), 400);
        }
        errorResponse(res, error.message || 'Failed to create house', 500);
    }
};
exports.createHouse = createHouse;
// ─── UPDATE ────────────────────────────────────────────────────────
const updateHouse = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return errorResponse(res, 'Invalid house ID', 400);
        }
        const house = await House_1.default.findById(id);
        if (!house)
            return errorResponse(res, 'House not found', 404);
        // ─── PERMISSION CHECK ──────────────────────────────────────────
        if (user.role === 'agent') {
            const agentIdStr = house.agentId?._id?.toString() || house.agentId?.toString();
            if (!agentIdStr || agentIdStr !== user._id.toString()) {
                return errorResponse(res, 'Unauthorized to update this house', 403);
            }
        }
        if (user.role === 'owner') {
            const ownerIdStr = house.ownerId?._id?.toString() || house.ownerId?.toString();
            if (!ownerIdStr || ownerIdStr !== user._id.toString()) {
                return errorResponse(res, 'Unauthorized to update this house', 403);
            }
        }
        // ───────────────────────────────────────────────────────────────
        const body = { ...req.body };
        // Never allow these via body
        delete body.ownerId;
        delete body.agentId;
        const updateData = {};
        // Scalar fields
        if (body.title !== undefined)
            updateData.title = body.title;
        if (body.description !== undefined)
            updateData.description = body.description;
        if (body.propertyType !== undefined)
            updateData.propertyType = body.propertyType;
        if (body.transactionType !== undefined)
            updateData.transactionType = body.transactionType;
        if (body.intendedPurpose !== undefined)
            updateData.intendedPurpose = body.intendedPurpose;
        if (body.isVerified !== undefined)
            updateData.isVerified = toBool(body.isVerified);
        if (body.tags !== undefined)
            updateData.tags = normalizeTags(body.tags);
        if (body.videoUrl !== undefined)
            updateData.videoUrl = body.videoUrl;
        // JSON fields
        try {
            if (body.location !== undefined)
                updateData.location = parseJsonField(body.location);
            if (body.details !== undefined)
                updateData.details = parseJsonField(body.details);
            if (body.virtualTour !== undefined)
                updateData.virtualTour = parseJsonField(body.virtualTour);
            if (body.rentalPricing !== undefined)
                updateData.rentalPricing = parseJsonField(body.rentalPricing);
            if (body.saleTerms !== undefined)
                updateData.saleTerms = parseJsonField(body.saleTerms);
            if (body.panoramic360 !== undefined)
                updateData.panoramic360 = parseJsonField(body.panoramic360);
            if (body.floorPlan !== undefined)
                updateData.floorPlan = parseJsonField(body.floorPlan);
            if (body.productAttributes !== undefined)
                updateData.productAttributes = parseJsonField(body.productAttributes);
        }
        catch (e) {
            return errorResponse(res, e.message || 'Invalid JSON data in request', 400);
        }
        // Pricing (handle quantity override)
        if (body.pricing !== undefined) {
            const parsedPricing = parseJsonField(body.pricing);
            if (!parsedPricing.quantity && house.pricing?.quantity) {
                parsedPricing.quantity = house.pricing.quantity;
            }
            updateData.pricing = parsedPricing;
        }
        if (body.quantity !== undefined && body.quantity !== '') {
            if (!updateData.pricing)
                updateData.pricing = { ...house.pricing };
            updateData.pricing.quantity = parseInt(body.quantity, 10) || 1;
        }
        // ─── Images: keep + append new ────────────────────────────────
        const files = (req.files || {});
        let finalImages = house.images ? [...house.images] : [];
        let finalModels = house.threeDModels ? [...house.threeDModels] : [];
        // keepImages: JSON array of _id strings (from the edit page)
        if (body.keepImages !== undefined) {
            let keepIds = [];
            try {
                keepIds = parseJsonField(body.keepImages, []) || [];
            }
            catch {
                return errorResponse(res, 'Invalid keepImages payload', 400);
            }
            const keepSet = new Set(keepIds.map(String));
            finalImages = finalImages.filter((img) => keepSet.has(String(img._id)));
        }
        if (body.keepModels !== undefined) {
            let keepModelIds = [];
            try {
                keepModelIds = parseJsonField(body.keepModels, []) || [];
            }
            catch {
                return errorResponse(res, 'Invalid keepModels payload', 400);
            }
            const keepSet = new Set(keepModelIds.map(String));
            finalModels = finalModels.filter((m) => keepSet.has(String(m._id)));
        }
        // Append new uploads
        const newImages = buildImagesFromFiles(files.images);
        if (newImages) {
            const hadPrimary = finalImages.some((img) => img.isPrimary);
            newImages.forEach((img, idx) => {
                if (finalImages.length === 0 && idx === 0 && !hadPrimary)
                    img.isPrimary = true;
                finalImages.push(img);
            });
        }
        const newModels = buildModelsFromFiles(files.threeDModels);
        if (newModels) {
            const hadDefault = finalModels.some((m) => m.isDefault);
            newModels.forEach((m, idx) => {
                if (finalModels.length === 0 && idx === 0 && !hadDefault)
                    m.isDefault = true;
                finalModels.push(m);
            });
        }
        if (body.keepImages !== undefined || files.images)
            updateData.images = finalImages;
        if (body.keepModels !== undefined || files.threeDModels)
            updateData.threeDModels = finalModels;
        const updatedHouse = await House_1.default.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });
        if (!updatedHouse)
            return errorResponse(res, 'House not found', 404);
        const { images: _updatedImages, threeDModels: _updatedModels, ...updatedWithoutImages } = updatedHouse.toObject();
        successResponse(res, updatedWithoutImages, 'House updated successfully');
    }
    catch (error) {
        console.error('Error updating house:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err) => err.message);
            return errorResponse(res, messages.join(', '), 400);
        }
        errorResponse(res, error.message, 500);
    }
};
exports.updateHouse = updateHouse;
// ─── DELETE ────────────────────────────────────────────────────────
const deleteHouse = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return errorResponse(res, 'Invalid house ID', 400);
        }
        const house = await House_1.default.findById(id);
        if (!house || house.isDeleted)
            return errorResponse(res, 'House not found', 404);
        // ─── PERMISSION CHECK ──────────────────────────────────────────
        if (user.role === 'agent') {
            const agentIdStr = house.agentId?._id?.toString() || house.agentId?.toString();
            if (!agentIdStr || agentIdStr !== user._id.toString()) {
                return errorResponse(res, 'Unauthorized to delete this house', 403);
            }
        }
        if (user.role === 'owner') {
            const ownerIdStr = house.ownerId?._id?.toString() || house.ownerId?.toString();
            if (!ownerIdStr || ownerIdStr !== user._id.toString()) {
                return errorResponse(res, 'Unauthorized to delete this house', 403);
            }
        }
        // ───────────────────────────────────────────────────────────────
        // ─── BLOCK IF ACTIVE DEPENDENCIES EXIST ────────────────────────
        const [activeLeases, openOffers, pendingApplications, upcomingAppointments, openMaintenance, activeOrders, pendingTransactions, pendingReports,] = await Promise.all([
            LeaseAgreement_1.default.countDocuments({
                houseId: id,
                status: {
                    $in: [
                        LeaseAgreement_1.LeaseStatus.ACTIVE,
                        LeaseAgreement_1.LeaseStatus.PENDING_SIGNATURE,
                        LeaseAgreement_1.LeaseStatus.TERMINATION_REQUESTED,
                        LeaseAgreement_1.LeaseStatus.DRAFT,
                    ],
                },
            }),
            PurchaseOffer_1.default.countDocuments({
                houseId: id,
                status: {
                    $nin: [
                        PurchaseOffer_1.OfferStatus.OFFER_REJECTED,
                        PurchaseOffer_1.OfferStatus.CANCELLED,
                        PurchaseOffer_1.OfferStatus.COMPLETED_SALE,
                    ],
                },
            }),
            RentalApplication_1.default.countDocuments({
                houseId: id,
                status: {
                    $in: [RentalApplication_1.ApplicationStatus.PENDING, RentalApplication_1.ApplicationStatus.APPROVED],
                },
            }),
            Appointment_1.default.countDocuments({
                houseId: id,
                status: {
                    $in: [
                        Appointment_1.AppointmentStatus.REQUESTED,
                        Appointment_1.AppointmentStatus.CONFIRMED,
                        Appointment_1.AppointmentStatus.RESCHEDULED,
                    ],
                },
            }),
            MaintenanceRequest_1.default.countDocuments({
                houseId: id,
                status: {
                    $nin: [MaintenanceRequest_1.MaintenanceStatus.COMPLETED, MaintenanceRequest_1.MaintenanceStatus.CANCELLED],
                },
            }),
            Order_1.default.countDocuments({
                houseId: id,
                $or: [
                    {
                        status: {
                            $in: [
                                Order_1.OrderStatus.PENDING,
                                Order_1.OrderStatus.UNDER_REVIEW,
                                Order_1.OrderStatus.APPROVED,
                            ],
                        },
                    },
                    {
                        paymentStatus: {
                            $in: [Order_1.PaymentStatus.PENDING, Order_1.PaymentStatus.PARTIAL],
                        },
                    },
                ],
            }),
            Transaction_1.default.countDocuments({
                houseId: id,
                status: 'pending',
            }),
            ListingReport_1.default.countDocuments({
                houseId: id,
                status: { $in: ['PENDING', 'UNDER_REVIEW'] },
            }),
        ]);
        const blockers = [];
        if (activeLeases)
            blockers.push(`${activeLeases} active lease(s)`);
        if (openOffers)
            blockers.push(`${openOffers} open purchase offer(s)`);
        if (pendingApplications)
            blockers.push(`${pendingApplications} pending/approved rental application(s)`);
        if (upcomingAppointments)
            blockers.push(`${upcomingAppointments} upcoming appointment(s)`);
        if (openMaintenance)
            blockers.push(`${openMaintenance} open maintenance ticket(s)`);
        if (activeOrders)
            blockers.push(`${activeOrders} active order(s)`);
        if (pendingTransactions)
            blockers.push(`${pendingTransactions} pending transaction(s)`);
        if (pendingReports)
            blockers.push(`${pendingReports} unresolved listing report(s)`);
        if (blockers.length > 0) {
            return errorResponse(res, `Cannot delete this property because it has active items: ${blockers.join(', ')}. ` +
                `Please resolve, complete, or cancel these active items before deleting the property.`, 409);
        }
        // ───────────────────────────────────────────────────────────────
        // ─── UNLINK USER SAVED PROPERTIES ──────────────────────────────
        await User_1.default.updateMany({ savedProperties: id }, { $pull: { savedProperties: id } });
        // ─── SOFT DELETE THE HOUSE ─────────────────────────────────────
        // Keep the document in the DB with isDeleted: true so that all
        // historical relationships (leases, offers, applications, orders,
        // transactions, receipts, messages, reviews) remain intact with
        // valid references and never cause errors when queried or populated.
        await House_1.default.findByIdAndUpdate(id, {
            isDeleted: true,
            status: House_1.HouseStatus.UNAVAILABLE,
            deletedAt: new Date(),
            deletedBy: user?._id,
        });
        successResponse(res, null, 'House deleted successfully');
    }
    catch (error) {
        console.error('deleteHouse error:', error);
        errorResponse(res, error.message, 500);
    }
};
exports.deleteHouse = deleteHouse;
// ─── APPROVE ───────────────────────────────────────────────────────
const approveHouse = async (req, res) => {
    try {
        const { id } = req.params;
        const { approvalStatus, status } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return errorResponse(res, 'Invalid house ID', 400);
        }
        const updateData = {};
        if (approvalStatus)
            updateData.approvalStatus = approvalStatus;
        if (status)
            updateData.status = status;
        if (approvalStatus === House_1.ApprovalStatus.APPROVED && !updateData.status) {
            updateData.status = House_1.HouseStatus.AVAILABLE;
        }
        const updatedHouse = await House_1.default.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });
        if (!updatedHouse)
            return errorResponse(res, 'House not found', 404);
        const { images, threeDModels, ...updatedWithoutImages } = updatedHouse.toObject();
        successResponse(res, updatedWithoutImages, 'House approval status updated successfully');
    }
    catch (error) {
        errorResponse(res, error.message, 500);
    }
};
exports.approveHouse = approveHouse;
// ─── STATUS ────────────────────────────────────────────────────────
const updateHouseStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!Object.values(House_1.HouseStatus).includes(status)) {
            return errorResponse(res, 'Invalid status', 400);
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return errorResponse(res, 'Invalid house ID', 400);
        }
        const updatedHouse = await House_1.default.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
        if (!updatedHouse)
            return errorResponse(res, 'House not found', 404);
        const { images, threeDModels, ...updatedWithoutImages } = updatedHouse.toObject();
        successResponse(res, updatedWithoutImages, `House status updated to ${status} successfully`);
    }
    catch (error) {
        errorResponse(res, error.message, 500);
    }
};
exports.updateHouseStatus = updateHouseStatus;
// ─── STATS ─────────────────────────────────────────────────────────
const getHouseStatistics = async (req, res) => {
    try {
        const notDeleted = { isDeleted: { $ne: true } };
        const totalHouses = await House_1.default.countDocuments(notDeleted);
        const availableHouses = await House_1.default.countDocuments({
            ...notDeleted,
            status: House_1.HouseStatus.AVAILABLE,
            approvalStatus: House_1.ApprovalStatus.APPROVED,
        });
        const soldHouses = await House_1.default.countDocuments({ ...notDeleted, status: House_1.HouseStatus.SOLD });
        const rentedHouses = await House_1.default.countDocuments({ ...notDeleted, status: House_1.HouseStatus.RENTED });
        const pendingApproval = await House_1.default.countDocuments({
            ...notDeleted,
            approvalStatus: House_1.ApprovalStatus.PENDING,
        });
        const totalViewsResult = await House_1.default.aggregate([
            { $match: notDeleted },
            { $group: { _id: null, totalViews: { $sum: '$views' } } },
        ]);
        const totalViews = totalViewsResult[0]?.totalViews || 0;
        const propertyTypeStats = await House_1.default.aggregate([
            { $match: { ...notDeleted, propertyType: { $ne: null } } },
            {
                $group: {
                    _id: '$propertyType',
                    count: { $sum: 1 },
                    avgPrice: { $avg: '$pricing.price' },
                },
            },
            { $sort: { count: -1 } },
        ]);
        const priceStats = await House_1.default.aggregate([
            { $match: notDeleted },
            {
                $group: {
                    _id: null,
                    minPrice: { $min: '$pricing.price' },
                    maxPrice: { $max: '$pricing.price' },
                    avgPrice: { $avg: '$pricing.price' },
                },
            },
        ]);
        const topViewedHouses = await House_1.default.find({
            ...notDeleted,
            approvalStatus: House_1.ApprovalStatus.APPROVED,
        })
            .sort({ views: -1 })
            .limit(5)
            .select('title views pricing.price propertyType location.city');
        successResponse(res, {
            totalHouses,
            availableHouses,
            soldHouses,
            rentedHouses,
            pendingApproval,
            totalViews,
            propertyTypeStats,
            priceStats: priceStats[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 },
            topViewedHouses,
        }, 'Statistics retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching stats:', error);
        errorResponse(res, error.message, 500);
    }
};
exports.getHouseStatistics = getHouseStatistics;
// ─── FILTER OPTIONS (admin) ────────────────────────────────────────
const getFilterOptions = async (req, res) => {
    try {
        const notDeleted = { isDeleted: { $ne: true } };
        const propertyTypes = Object.values(House_1.PropertyType);
        const statuses = Object.values(House_1.HouseStatus);
        const approvalStatuses = Object.values(House_1.ApprovalStatus);
        const amenities = await House_1.default.distinct('details.amenities', notDeleted);
        const features = await House_1.default.distinct('details.features', notDeleted);
        const priceRange = await House_1.default.aggregate([
            { $match: notDeleted },
            {
                $group: {
                    _id: null,
                    minPrice: { $min: '$pricing.price' },
                    maxPrice: { $max: '$pricing.price' },
                },
            },
        ]);
        const bedroomOptions = await House_1.default.aggregate([
            { $match: notDeleted },
            { $group: { _id: '$details.bedrooms', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);
        const bathroomOptions = await House_1.default.aggregate([
            { $match: notDeleted },
            { $group: { _id: '$details.bathrooms', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);
        successResponse(res, {
            propertyTypes,
            statuses,
            approvalStatuses,
            amenities: amenities.filter(Boolean).sort(),
            features: features.filter(Boolean).sort(),
            priceRange: priceRange[0] || { minPrice: 0, maxPrice: 10000000 },
            bedroomOptions: bedroomOptions.filter((b) => b._id !== null && b._id !== undefined),
            bathroomOptions: bathroomOptions.filter((b) => b._id !== null && b._id !== undefined),
        }, 'Filter options retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching filter options:', error);
        errorResponse(res, error.message, 500);
    }
};
exports.getFilterOptions = getFilterOptions;
// ─── INCREMENT VIEW ────────────────────────────────────────────────
const incrementView = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return errorResponse(res, 'Invalid house ID', 400);
        }
        const house = await House_1.default.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true }).select('-images.data -threeDModels.data');
        if (!house)
            return errorResponse(res, 'House not found', 404);
        successResponse(res, house, 'View count incremented');
    }
    catch (error) {
        errorResponse(res, error.message, 500);
    }
};
exports.incrementView = incrementView;
// ─── IMAGE SERVING (admin) ─────────────────────────────────────────
const getAdminHouseImage = async (req, res) => {
    try {
        const { id } = req.params;
        const imageIndex = parseInt(req.query.index) || 0;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid house ID' });
        }
        const house = await House_1.default.findById(id);
        if (!house || !house.images || house.images.length === 0) {
            return res.status(404).json({ success: false, message: 'Image not found' });
        }
        const image = house.images[imageIndex];
        if (!image || !image.data) {
            return res.status(404).json({ success: false, message: 'Image data not found' });
        }
        let imageBuffer;
        if (Buffer.isBuffer(image.data)) {
            imageBuffer = image.data;
        }
        else if (typeof image.data === 'object' && image.data !== null) {
            const dataObj = image.data;
            if (dataObj.$binary && dataObj.$binary.base64) {
                imageBuffer = Buffer.from(dataObj.$binary.base64, 'base64');
            }
            else if (dataObj.data && Array.isArray(dataObj.data)) {
                imageBuffer = Buffer.from(dataObj.data);
            }
            else {
                return res.status(500).json({ success: false, message: 'Unsupported image format' });
            }
        }
        else if (typeof image.data === 'string') {
            imageBuffer = Buffer.from(image.data, 'base64');
        }
        else {
            return res.status(500).json({ success: false, message: 'Unsupported image format' });
        }
        res.setHeader('Content-Type', image.contentType || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.send(imageBuffer);
    }
    catch (error) {
        console.error('Error serving admin house image:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getAdminHouseImage = getAdminHouseImage;
// ─── DEBUG IMAGE ───────────────────────────────────────────────────
const debugHouseImage = async (req, res) => {
    try {
        const { id } = req.params;
        const house = await House_1.default.findById(id);
        if (!house)
            return res.json({ error: 'House not found' });
        res.json({
            hasImages: !!house.images,
            imageCount: house.images?.length || 0,
            firstImageType: house.images?.[0] ? typeof house.images[0].data : 'none',
            firstImageKeys: house.images?.[0] ? Object.keys(house.images[0].data || {}) : [],
            contentType: house.images?.[0]?.contentType,
        });
    }
    catch (error) {
        res.json({ error: error.message });
    }
};
exports.debugHouseImage = debugHouseImage;
// ─── SERVE 3D MODEL (admin) ────────────────────────────────────────
const getAdminHouseModel = async (req, res) => {
    try {
        const { id } = req.params;
        const modelIndex = parseInt(req.query.index) || 0;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid house ID' });
        }
        const house = await House_1.default.findById(id);
        if (!house || !house.threeDModels || house.threeDModels.length === 0) {
            return res.status(404).json({ success: false, message: 'Model not found' });
        }
        const model = house.threeDModels[modelIndex];
        if (!model || !model.data) {
            return res.status(404).json({ success: false, message: 'Model data not found' });
        }
        let modelBuffer;
        if (Buffer.isBuffer(model.data)) {
            modelBuffer = model.data;
        }
        else if (typeof model.data === 'object' && model.data !== null) {
            const dataObj = model.data;
            if (dataObj.$binary && dataObj.$binary.base64) {
                modelBuffer = Buffer.from(dataObj.$binary.base64, 'base64');
            }
            else if (dataObj.data && Array.isArray(dataObj.data)) {
                modelBuffer = Buffer.from(dataObj.data);
            }
            else {
                return res.status(500).json({ success: false, message: 'Unsupported model format' });
            }
        }
        else {
            return res.status(500).json({ success: false, message: 'Unsupported model format' });
        }
        res.setHeader('Content-Type', model.contentType || 'model/gltf-binary');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.send(modelBuffer);
    }
    catch (error) {
        console.error('Error serving admin house model:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getAdminHouseModel = getAdminHouseModel;
