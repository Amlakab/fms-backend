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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationStatus = exports.ApprovalStatus = exports.HouseStatus = exports.IntendedPurpose = exports.TransactionType = exports.PropertyType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var PropertyType;
(function (PropertyType) {
    // MAT Engineering & Trading PLC Core Product Categories
    PropertyType["CONSTRUCTION_MATERIAL"] = "CONSTRUCTION_MATERIAL";
    PropertyType["STRUCTURAL_STEEL"] = "STRUCTURAL_STEEL";
    PropertyType["CEMENT_CONCRETE"] = "CEMENT_CONCRETE";
    PropertyType["HOLLOW_BLOCKS"] = "HOLLOW_BLOCKS";
    PropertyType["ROOFING_SHEETS"] = "ROOFING_SHEETS";
    PropertyType["HOME_FURNITURE"] = "HOME_FURNITURE";
    PropertyType["OFFICE_FURNITURE"] = "OFFICE_FURNITURE";
    PropertyType["GENERAL_CONTRACTING"] = "GENERAL_CONTRACTING";
    PropertyType["STEEL_FABRICATION"] = "STEEL_FABRICATION";
    PropertyType["ELECTRICAL_PLUMBING"] = "ELECTRICAL_PLUMBING";
    PropertyType["FINISHING_MATERIALS"] = "FINISHING_MATERIALS";
    PropertyType["CUSTOM_ORDER"] = "CUSTOM_ORDER";
    // Legacy real estate categories for backwards compatibility
    PropertyType["APARTMENT"] = "APARTMENT";
    PropertyType["VILLA"] = "VILLA";
    PropertyType["CONDO"] = "CONDO";
    PropertyType["HOUSE"] = "HOUSE";
    PropertyType["LAND"] = "LAND";
    PropertyType["ROOM"] = "ROOM";
    PropertyType["FURNISHED_APARTMENT"] = "FURNISHED_APARTMENT";
    PropertyType["GUESTHOUSE"] = "GUESTHOUSE";
    PropertyType["OFFICE"] = "OFFICE";
    PropertyType["SHOP"] = "SHOP";
    PropertyType["RESTAURANT"] = "RESTAURANT";
    PropertyType["WAREHOUSE"] = "WAREHOUSE";
    PropertyType["WORKSHOP"] = "WORKSHOP";
    PropertyType["FACTORY"] = "FACTORY";
    PropertyType["COMMERCIAL_BUILDING"] = "COMMERCIAL_BUILDING";
    PropertyType["AGRICULTURAL_LAND"] = "AGRICULTURAL_LAND";
    PropertyType["HOTEL"] = "HOTEL";
    PropertyType["COWORKING"] = "COWORKING";
    PropertyType["EVENT_VENUE"] = "EVENT_VENUE";
})(PropertyType || (exports.PropertyType = PropertyType = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["RENT"] = "RENT";
    TransactionType["BUY"] = "BUY";
    TransactionType["SHORT_STAY"] = "SHORT_STAY";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var IntendedPurpose;
(function (IntendedPurpose) {
    IntendedPurpose["LIVING"] = "LIVING";
    IntendedPurpose["FAMILY"] = "FAMILY";
    IntendedPurpose["STUDENT"] = "STUDENT";
    IntendedPurpose["TEMPORARY"] = "TEMPORARY";
    IntendedPurpose["BUSINESS"] = "BUSINESS";
    IntendedPurpose["STORAGE_INDUSTRIAL"] = "STORAGE_INDUSTRIAL";
    IntendedPurpose["RESIDENTIAL_OWNERSHIP"] = "RESIDENTIAL_OWNERSHIP";
    IntendedPurpose["COMMERCIAL_INVESTMENT"] = "COMMERCIAL_INVESTMENT";
    IntendedPurpose["DEVELOPMENT"] = "DEVELOPMENT";
    IntendedPurpose["AGRICULTURE"] = "AGRICULTURE";
    IntendedPurpose["OTHER"] = "OTHER";
})(IntendedPurpose || (exports.IntendedPurpose = IntendedPurpose = {}));
var HouseStatus;
(function (HouseStatus) {
    HouseStatus["AVAILABLE"] = "AVAILABLE";
    HouseStatus["SOLD"] = "SOLD";
    HouseStatus["RENTED"] = "RENTED";
    HouseStatus["UNAVAILABLE"] = "UNAVAILABLE";
    HouseStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    HouseStatus["UNDER_OFFER"] = "UNDER_OFFER";
    HouseStatus["RESERVED"] = "RESERVED";
})(HouseStatus || (exports.HouseStatus = HouseStatus = {}));
var ApprovalStatus;
(function (ApprovalStatus) {
    ApprovalStatus["PENDING"] = "PENDING";
    ApprovalStatus["APPROVED"] = "APPROVED";
    ApprovalStatus["REJECTED"] = "REJECTED";
})(ApprovalStatus || (exports.ApprovalStatus = ApprovalStatus = {}));
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["UNVERIFIED"] = "UNVERIFIED";
    VerificationStatus["PENDING"] = "PENDING";
    VerificationStatus["VERIFIED"] = "VERIFIED";
    VerificationStatus["REJECTED"] = "REJECTED";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
const houseSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        minlength: [5, 'Title must be at least 5 characters'],
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        minlength: [20, 'Description must be at least 20 characters'],
        maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    propertyType: {
        type: String,
        enum: Object.values(PropertyType),
        required: [true, 'Property type is required']
    },
    transactionType: {
        type: String,
        enum: Object.values(TransactionType),
        default: TransactionType.RENT
    },
    intendedPurpose: {
        type: String,
        enum: Object.values(IntendedPurpose),
        default: IntendedPurpose.LIVING
    },
    status: {
        type: String,
        enum: Object.values(HouseStatus),
        default: HouseStatus.PENDING_APPROVAL
    },
    approvalStatus: {
        type: String,
        enum: Object.values(ApprovalStatus),
        default: ApprovalStatus.PENDING
    },
    verificationStatus: {
        type: String,
        enum: Object.values(VerificationStatus),
        default: VerificationStatus.UNVERIFIED
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationNotes: String,
    verificationDocuments: [{
            title: String,
            documentType: String,
            url: String,
            verifiedAt: Date
        }],
    location: {
        address: {
            type: String,
            required: [true, 'Address is required']
        },
        city: {
            type: String,
            required: [true, 'City is required']
        },
        state: {
            type: String,
            required: [true, 'State is required']
        },
        country: {
            type: String,
            required: [true, 'Country is required']
        },
        zipCode: String,
        neighborhood: String,
        landmark: String,
        coordinates: {
            lat: { type: Number, required: true, default: 9.03 },
            lng: { type: Number, required: true, default: 38.74 }
        }
    },
    details: {
        bedrooms: { type: Number, default: 0, min: 0 },
        bathrooms: { type: Number, default: 0, min: 0 },
        area: { type: Number, default: 0, min: 0 },
        lotSize: { type: Number, default: 0 },
        yearBuilt: { type: Number, min: 1800, max: new Date().getFullYear() + 2, default: new Date().getFullYear() },
        floors: { type: Number, default: 1, min: 1 },
        parkingSpaces: { type: Number, default: 0 },
        furnished: { type: Boolean, default: false },
        furnishingStatus: {
            type: String,
            enum: ['furnished', 'partially_furnished', 'unfurnished'],
            default: 'unfurnished'
        },
        amenities: [String],
        features: [String]
    },
    productAttributes: {
        sku: { type: String, trim: true },
        brand: { type: String, default: 'MAT Engineering & Trading PLC' },
        category: { type: String, trim: true },
        subCategory: { type: String, trim: true },
        material: { type: String, trim: true },
        grade: { type: String, trim: true },
        dimensions: { type: String, trim: true },
        unit: { type: String, default: 'Piece' },
        weight: { type: String, trim: true },
        stockQuantity: { type: Number, default: 100, min: 0 },
        leadTime: { type: String, default: 'In Stock / Ready for Dispatch' },
        warranty: { type: String, default: 'Standard Manufacturer Warranty' },
        specifications: [{
                key: String,
                value: String
            }]
    },
    pricing: {
        price: { type: Number, required: true, min: 0 },
        pricePerSqft: { type: Number, default: 0 },
        maintenanceFee: { type: Number, default: 0 },
        taxAmount: { type: Number, default: 0 },
        securityDeposit: { type: Number, default: 0 },
        quantity: { type: Number, default: 1, min: 1 }
    },
    rentalPricing: {
        frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'monthly' },
        securityDeposit: { type: Number, default: 0 },
        advancePayments: { type: Number, default: 1 },
        minLeaseDuration: { type: Number, default: 1 },
        maxLeaseDuration: Number,
        availableFrom: Date,
        availableTo: Date
    },
    saleTerms: {
        askingPrice: { type: Number, default: 0 },
        ownershipDocType: { type: String, default: 'Title Deed' },
        isNegotiable: { type: Boolean, default: true },
        escrowSupported: { type: Boolean, default: true },
        downPaymentMin: { type: Number, default: 0 }
    },
    categoryAttributes: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    },
    tags: {
        type: [String],
        default: [],
        index: true
    },
    likes: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User'
        }],
    likesCount: {
        type: Number,
        default: 0,
        index: true
    },
    images: [{
            data: Buffer,
            contentType: String,
            fileName: String,
            isPrimary: { type: Boolean, default: false },
            caption: String,
            roomLabel: String
        }],
    threeDModels: [{
            data: Buffer,
            contentType: String,
            fileName: String,
            thumbnail: String,
            isDefault: { type: Boolean, default: false }
        }],
    virtualTour: {
        enabled: { type: Boolean, default: false },
        url: String,
        embedCode: String
    },
    videoUrl: String,
    panoramic360: {
        enabled: { type: Boolean, default: false },
        imageUrl: String,
        caption: String
    },
    floorPlan: {
        url: String,
        rooms: [{
                name: String,
                dimensions: String,
                areaSqM: Number
            }]
    },
    nearbyAmenities: [{
            name: String,
            type: {
                type: String,
                enum: ['school', 'hospital', 'transit', 'shopping', 'landmark']
            },
            distanceKm: Number
        }],
    inspectionChecklist: [{
            item: String,
            condition: {
                type: String,
                enum: ['good', 'fair', 'needs_repair'],
                default: 'good'
            },
            notes: String
        }],
    agentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ownerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    agentName: String,
    agentContact: String,
    views: { type: Number, default: 0, index: true },
    uniqueViews: { type: Number, default: 0 },
    inquiries: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },
    featured: { type: Boolean, default: false, index: true },
    trendingScore: { type: Number, default: 0, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes
houseSchema.index({ 'location.coordinates': '2dsphere' });
houseSchema.index({ propertyType: 1 });
houseSchema.index({ transactionType: 1 });
houseSchema.index({ intendedPurpose: 1 });
houseSchema.index({ status: 1 });
houseSchema.index({ approvalStatus: 1 });
houseSchema.index({ isVerified: 1 });
houseSchema.index({ isDeleted: 1 });
houseSchema.index({ 'pricing.price': 1 });
houseSchema.index({ created_at: -1 });
houseSchema.index({ likesCount: -1 });
houseSchema.index({ views: -1 });
houseSchema.index({ tags: 1 });
houseSchema.index({ title: 'text', description: 'text', 'location.neighborhood': 'text', 'location.landmark': 'text' });
// Static methods
houseSchema.statics.incrementView = async function (id) {
    return this.findByIdAndUpdate(id, { $inc: { views: 1, uniqueViews: 1 } }, { new: true });
};
houseSchema.statics.incrementInquiry = async function (id) {
    return this.findByIdAndUpdate(id, { $inc: { inquiries: 1 } }, { new: true });
};
exports.default = mongoose_1.default.model('House', houseSchema);
