import mongoose, { Document, Schema } from 'mongoose';

export enum PropertyType {
  // MAT Engineering & Trading PLC Core Product Categories
  CONSTRUCTION_MATERIAL = "CONSTRUCTION_MATERIAL",
  STRUCTURAL_STEEL = "STRUCTURAL_STEEL",
  CEMENT_CONCRETE = "CEMENT_CONCRETE",
  HOLLOW_BLOCKS = "HOLLOW_BLOCKS",
  ROOFING_SHEETS = "ROOFING_SHEETS",
  HOME_FURNITURE = "HOME_FURNITURE",
  OFFICE_FURNITURE = "OFFICE_FURNITURE",
  GENERAL_CONTRACTING = "GENERAL_CONTRACTING",
  STEEL_FABRICATION = "STEEL_FABRICATION",
  ELECTRICAL_PLUMBING = "ELECTRICAL_PLUMBING",
  FINISHING_MATERIALS = "FINISHING_MATERIALS",
  CUSTOM_ORDER = "CUSTOM_ORDER",
  // Legacy real estate categories for backwards compatibility
  APARTMENT = "APARTMENT",
  VILLA = "VILLA",
  CONDO = "CONDO",
  HOUSE = "HOUSE",
  LAND = "LAND",
  ROOM = "ROOM",
  FURNISHED_APARTMENT = "FURNISHED_APARTMENT",
  GUESTHOUSE = "GUESTHOUSE",
  OFFICE = "OFFICE",
  SHOP = "SHOP",
  RESTAURANT = "RESTAURANT",
  WAREHOUSE = "WAREHOUSE",
  WORKSHOP = "WORKSHOP",
  FACTORY = "FACTORY",
  COMMERCIAL_BUILDING = "COMMERCIAL_BUILDING",
  AGRICULTURAL_LAND = "AGRICULTURAL_LAND",
  HOTEL = "HOTEL",
  COWORKING = "COWORKING",
  EVENT_VENUE = "EVENT_VENUE"
}

export enum TransactionType {
  RENT = "RENT",
  BUY = "BUY",
  SHORT_STAY = "SHORT_STAY"
}

export enum IntendedPurpose {
  LIVING = "LIVING",
  FAMILY = "FAMILY",
  STUDENT = "STUDENT",
  TEMPORARY = "TEMPORARY",
  BUSINESS = "BUSINESS",
  STORAGE_INDUSTRIAL = "STORAGE_INDUSTRIAL",
  RESIDENTIAL_OWNERSHIP = "RESIDENTIAL_OWNERSHIP",
  COMMERCIAL_INVESTMENT = "COMMERCIAL_INVESTMENT",
  DEVELOPMENT = "DEVELOPMENT",
  AGRICULTURE = "AGRICULTURE",
  OTHER = "OTHER"
}

export enum HouseStatus {
  AVAILABLE = "AVAILABLE",
  SOLD = "SOLD",
  RENTED = "RENTED",
  UNAVAILABLE = "UNAVAILABLE",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  UNDER_OFFER = "UNDER_OFFER",
  RESERVED = "RESERVED"
}

export enum ApprovalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED"
}

export enum VerificationStatus {
  UNVERIFIED = "UNVERIFIED",
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED"
}

export interface IHouse extends Document {
  title: string;
  description: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  intendedPurpose: IntendedPurpose;
  status: HouseStatus;
  approvalStatus: ApprovalStatus;
  verificationStatus: VerificationStatus;
  isVerified: boolean;
  verificationNotes?: string;
  verificationDocuments: Array<{
    title: string;
    documentType: string;
    url?: string;
    verifiedAt?: Date;
  }>;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    neighborhood?: string;
    landmark?: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  details: {
    bedrooms: number;
    bathrooms: number;
    area: number;
    lotSize: number;
    yearBuilt: number;
    floors: number;
    parkingSpaces: number;
    furnished: boolean;
    furnishingStatus?: 'furnished' | 'partially_furnished' | 'unfurnished';
    amenities: string[];
    features: string[];
  };
  productAttributes?: {
    sku?: string;
    brand?: string;
    category?: string;
    subCategory?: string;
    material?: string;
    grade?: string;
    woodType?: string;
    fabric?: string;
    colorFinish?: string;
    assemblyRequired?: boolean;
    roomType?: string;
    dimensions?: string;
    unit?: string;
    weight?: string;
    stockQuantity?: number;
    leadTime?: string;
    leadTimeDays?: number;
    warranty?: string;
    specifications?: any;
  };
  pricing: {
    price: number;
    pricePerSqft: number;
    maintenanceFee: number;
    taxAmount: number;
    securityDeposit: number;
    quantity: number;
  };
  rentalPricing?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    securityDeposit: number;
    advancePayments: number;
    minLeaseDuration: number; // months or days
    maxLeaseDuration?: number;
    availableFrom?: Date;
    availableTo?: Date;
  };
  saleTerms?: {
    askingPrice: number;
    ownershipDocType: string;
    isNegotiable: boolean;
    escrowSupported: boolean;
    downPaymentMin?: number;
  };
  categoryAttributes: Record<string, any>;
  tags: string[];
  likes: mongoose.Types.ObjectId[];
  likesCount: number;
  images: Array<{
    data: Buffer;
    contentType: string;
    fileName: string;
    isPrimary: boolean;
    caption?: string;
    roomLabel?: string;
  }>;
  threeDModels: Array<{
    data: Buffer;
    contentType: string;
    fileName: string;
    thumbnail?: string;
    isDefault: boolean;
  }>;
  virtualTour: {
    enabled: boolean;
    url: string;
    embedCode: string;
  };
  videoUrl?: string;
  panoramic360?: {
    enabled: boolean;
    imageUrl?: string;
    caption?: string;
  };
  floorPlan?: {
    url?: string;
    rooms: Array<{
      name: string;
      dimensions: string;
      areaSqM: number;
    }>;
  };
  nearbyAmenities: Array<{
    name: string;
    type: 'school' | 'hospital' | 'transit' | 'shopping' | 'landmark';
    distanceKm: number;
  }>;
  inspectionChecklist: Array<{
    item: string;
    condition: 'good' | 'fair' | 'needs_repair';
    notes?: string;
  }>;
  agentId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  agentName: string;
  agentContact: string;
  views: number;
  uniqueViews: number;
  inquiries: number;
  rating: number;
  numReviews: number;
  featured: boolean;
  trendingScore: number;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const houseSchema = new Schema<IHouse>({
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
    woodType: { type: String, trim: true },
    fabric: { type: String, trim: true },
    colorFinish: { type: String, trim: true },
    assemblyRequired: { type: Boolean, default: false },
    roomType: { type: String, trim: true },
    dimensions: { type: String, trim: true },
    unit: { type: String, default: 'Piece' },
    weight: { type: String, trim: true },
    stockQuantity: { type: Number, default: 100, min: 0 },
    leadTime: { type: String, default: 'In Stock / Ready for Dispatch' },
    leadTimeDays: { type: Number, default: 3 },
    warranty: { type: String, default: 'Standard Manufacturer Warranty' },
    specifications: { type: mongoose.Schema.Types.Mixed, default: '' }
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
    type: Schema.Types.Mixed,
    default: {}
  },
  tags: {
    type: [String],
    default: [],
    index: true
  },
  likes: [{
    type: Schema.Types.ObjectId,
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
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ownerId: {
    type: Schema.Types.ObjectId,
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
  deletedBy: { type: Schema.Types.ObjectId, ref: 'User' }
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
houseSchema.statics.incrementView = async function(id: string) {
  return this.findByIdAndUpdate(id, { $inc: { views: 1, uniqueViews: 1 } }, { new: true });
};

houseSchema.statics.incrementInquiry = async function(id: string) {
  return this.findByIdAndUpdate(id, { $inc: { inquiries: 1 } }, { new: true });
};

export default mongoose.model<IHouse>('House', houseSchema);