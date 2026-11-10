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
exports.seedAdvancedData = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const House_1 = __importStar(require("../models/House"));
const User_1 = __importDefault(require("../models/User"));
const Review_1 = __importDefault(require("../models/Review"));
const Appointment_1 = __importStar(require("../models/Appointment"));
const LeaseAgreement_1 = __importStar(require("../models/LeaseAgreement"));
const PurchaseOffer_1 = __importStar(require("../models/PurchaseOffer"));
const MaintenanceRequest_1 = __importDefault(require("../models/MaintenanceRequest"));
const CategoryConfig_1 = __importDefault(require("../models/CategoryConfig"));
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms';
const seedAdvancedData = async () => {
    try {
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('Connected to MongoDB for seeding advanced real estate data...');
        // Find or create admin and agent/owner user
        let admin = await User_1.default.findOne({ role: 'admin' });
        if (!admin) {
            admin = await User_1.default.create({
                name: 'System Administrator',
                email: 'admin@hrms.com',
                phone: '0911000001',
                password: 'Password123!',
                role: 'admin',
                isVerified: true,
                verificationStatus: 'verified'
            });
        }
        let agent = await User_1.default.findOne({ role: 'agent' });
        if (!agent) {
            agent = await User_1.default.create({
                name: 'Abebe Tadesse (Sales Staff)',
                email: 'agent@hrms.com',
                phone: '0911000002',
                password: 'Password123!',
                role: 'agent',
                isVerified: true,
                verificationStatus: 'verified',
                agencyName: 'MAT Engineering & Trading PLC'
            });
        }
        let customer = await User_1.default.findOne({ role: 'customer' });
        if (!customer) {
            customer = await User_1.default.create({
                name: 'Hanan Mohammed',
                email: 'customer@hrms.com',
                phone: '0911000003',
                password: 'Password123!',
                role: 'customer',
                isVerified: true,
                verificationStatus: 'verified'
            });
        }
        // 1. Seed Dynamic Category Configurations
        await CategoryConfig_1.default.deleteMany({});
        await CategoryConfig_1.default.insertMany([
            {
                categoryKey: 'APARTMENT',
                displayName: 'Residential Apartment',
                group: 'residential',
                allowedTransactionTypes: ['RENT', 'BUY', 'SHORT_STAY'],
                fields: [
                    { key: 'floorNumber', label: 'Floor Level', type: 'number', required: true, filterEnabled: true },
                    { key: 'hasElevator', label: 'High-Speed Elevator', type: 'boolean', filterEnabled: true },
                    { key: 'hasBalcony', label: 'Balcony View', type: 'boolean', filterEnabled: true },
                    { key: 'petFriendly', label: 'Pet Friendly Policy', type: 'boolean', filterEnabled: true },
                    { key: 'backupGenerator', label: '24/7 Backup Generator', type: 'boolean', filterEnabled: true },
                    { key: 'waterTank', label: 'Backup Water Reserves', type: 'boolean', filterEnabled: true }
                ]
            },
            {
                categoryKey: 'VILLA',
                displayName: 'Luxury Standalone Villa',
                group: 'residential',
                allowedTransactionTypes: ['RENT', 'BUY'],
                fields: [
                    { key: 'compoundSize', label: 'Compound & Garden Area (m²)', type: 'number', unit: 'm²', filterEnabled: true },
                    { key: 'serviceQuarter', label: 'Maid/Service Quarters', type: 'boolean', filterEnabled: true },
                    { key: 'securityPost', label: 'Guard Post & CCTV', type: 'boolean', filterEnabled: true },
                    { key: 'swimmingPool', label: 'Private Swimming Pool', type: 'boolean', filterEnabled: true }
                ]
            },
            {
                categoryKey: 'OFFICE',
                displayName: 'Commercial Office Space',
                group: 'commercial',
                allowedTransactionTypes: ['RENT', 'BUY'],
                fields: [
                    { key: 'meetingRooms', label: 'Dedicated Meeting Rooms', type: 'number', filterEnabled: true },
                    { key: 'allocatedParking', label: 'Allocated Underground Parking Slots', type: 'number', filterEnabled: true },
                    { key: 'fiberInternet', label: 'Redundant High-Speed Fiber Internet', type: 'boolean', filterEnabled: true },
                    { key: 'fireSafetySystem', label: 'Sprinklers & Emergency Exit', type: 'boolean', filterEnabled: true }
                ]
            },
            {
                categoryKey: 'WAREHOUSE',
                displayName: 'Industrial Logistics & Storage',
                group: 'industrial',
                allowedTransactionTypes: ['RENT', 'BUY'],
                fields: [
                    { key: 'ceilingHeight', label: 'Clear Height to Eaves (meters)', type: 'number', unit: 'm', filterEnabled: true },
                    { key: 'truckAccess', label: '40ft Container Truck Accessibility', type: 'boolean', filterEnabled: true },
                    { key: 'powerCapacity', label: '3-Phase Heavy Industrial Power (KVA)', type: 'text', filterEnabled: true },
                    { key: 'loadingDocks', label: 'Hydraulic Loading Docks', type: 'number', filterEnabled: true }
                ]
            },
            {
                categoryKey: 'LAND',
                displayName: 'Development & Agricultural Land',
                group: 'land',
                allowedTransactionTypes: ['BUY'],
                fields: [
                    { key: 'zoningType', label: 'Zoning & Permitted Land Use', type: 'select', options: ['Residential', 'Commercial', 'Mixed Use', 'Industrial', 'Agricultural'], filterEnabled: true },
                    { key: 'terrain', label: 'Topography / Slope', type: 'select', options: ['Flat', 'Gentle Slope', 'Terraced'], filterEnabled: true },
                    { key: 'utilitiesConnected', label: 'Water & Electric Grid Connection', type: 'boolean', filterEnabled: true }
                ]
            }
        ]);
        console.log('Category configurations seeded.');
        // 2. Check if rich sample properties exist
        const count = await House_1.default.countDocuments({ isVerified: true });
        if (count < 3) {
            console.log('Seeding rich multi-category properties...');
            // Sample SVG Data URIs for testing images
            const sampleImageBuffer = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="800" height="600" fill="url(#grad)" />
          <circle cx="400" cy="300" r="180" fill="#0284c7" opacity="0.15" />
          <path d="M250 420 L400 230 L550 420 Z" fill="#06b6d4" opacity="0.8" />
          <rect x="350" y="340" width="100" height="80" fill="#0f172a" />
          <text x="400" y="480" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="28" font-weight="bold" text-anchor="middle">HRMS Verified Property</text>
          <text x="400" y="520" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="18" text-anchor="middle">Premium Real Estate Discovery</text>
        </svg>`, 'utf-8');
            const prop1 = await House_1.default.create({
                title: 'Modern Luxury Penthouse with Skyline Views',
                description: 'Spectacular 3-bedroom luxury penthouse in the heart of Bole. Features floor-to-ceiling panoramic glass windows, designer Italian kitchen, smart home automation, high-speed fiber internet, and 24/7 uninterrupted backup power and water reservoir. Walking distance to premium shopping, dining, and diplomatic hubs.',
                propertyType: House_1.PropertyType.APARTMENT,
                transactionType: House_1.TransactionType.RENT,
                intendedPurpose: House_1.IntendedPurpose.LIVING,
                status: House_1.HouseStatus.AVAILABLE,
                approvalStatus: House_1.ApprovalStatus.APPROVED,
                verificationStatus: House_1.VerificationStatus.VERIFIED,
                isVerified: true,
                verificationNotes: 'Physical title deed and ownership verified by Addis Ababa Land Management Office.',
                verificationDocuments: [
                    { title: 'Title Deed Certificate', documentType: 'TITLE_DEED', verifiedAt: new Date() },
                    { title: 'Municipality Building Permit', documentType: 'PERMIT', verifiedAt: new Date() }
                ],
                location: {
                    address: 'Namibia Street, Bole Medhanialem',
                    city: 'Addis Ababa',
                    state: 'Addis Ababa',
                    country: 'Ethiopia',
                    zipCode: '1000',
                    neighborhood: 'Bole',
                    landmark: 'Bole Medhanialem Cathedral',
                    coordinates: { lat: 8.9984, lng: 38.7885 }
                },
                details: {
                    bedrooms: 3,
                    bathrooms: 3,
                    area: 240,
                    lotSize: 0,
                    yearBuilt: 2023,
                    floors: 11,
                    parkingSpaces: 2,
                    furnished: true,
                    furnishingStatus: 'furnished',
                    amenities: ['Elevator', 'Security 24/7', 'Gym', 'Backup Generator', 'Water Tank', 'Balcony', 'High-Speed WiFi', 'Intercom'],
                    features: ['Skyline View', 'Master Suite with Jacuzzi', 'Walk-in Closet', 'Smart Home Lights']
                },
                pricing: {
                    price: 65000,
                    pricePerSqft: 270,
                    maintenanceFee: 2500,
                    taxAmount: 0,
                    securityDeposit: 65000,
                    quantity: 1
                },
                rentalPricing: {
                    frequency: 'monthly',
                    securityDeposit: 65000,
                    advancePayments: 3,
                    minLeaseDuration: 6,
                    maxLeaseDuration: 24,
                    availableFrom: new Date()
                },
                categoryAttributes: {
                    floorNumber: 11,
                    hasElevator: true,
                    hasBalcony: true,
                    petFriendly: true,
                    backupGenerator: true,
                    waterTank: true
                },
                tags: ['Bole', 'Furnished', 'Luxury', 'Penthouse', 'FamilyHome', 'SkylineView', 'NearAirport'],
                likesCount: 28,
                views: 1420,
                uniqueViews: 980,
                inquiries: 19,
                rating: 4.9,
                numReviews: 12,
                featured: true,
                trendingScore: 95,
                videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                panoramic360: {
                    enabled: true,
                    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80',
                    caption: '360° Panoramic View of Living Room & Balcony'
                },
                floorPlan: {
                    url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
                    rooms: [
                        { name: 'Master Bedroom', dimensions: '5.2m x 4.8m', areaSqM: 25 },
                        { name: 'Living & Dining Hall', dimensions: '8.0m x 6.5m', areaSqM: 52 },
                        { name: 'Modern Kitchen', dimensions: '4.2m x 3.6m', areaSqM: 15.1 },
                        { name: 'Guest Bedroom 1', dimensions: '4.0m x 3.8m', areaSqM: 15.2 },
                        { name: 'Guest Bedroom 2', dimensions: '3.8m x 3.5m', areaSqM: 13.3 },
                        { name: 'Panoramic Balcony', dimensions: '6.0m x 2.2m', areaSqM: 13.2 }
                    ]
                },
                nearbyAmenities: [
                    { name: 'Bole International Airport', type: 'transit', distanceKm: 1.8 },
                    { name: 'Edna Mall & Multiplex', type: 'shopping', distanceKm: 0.6 },
                    { name: 'St. Yared General Hospital', type: 'hospital', distanceKm: 1.2 },
                    { name: 'Bole Medhanialem Cathedral', type: 'landmark', distanceKm: 0.4 },
                    { name: 'Bole International School', type: 'school', distanceKm: 2.1 }
                ],
                inspectionChecklist: [
                    { item: 'Keycard access and front door smart lock', condition: 'good' },
                    { item: 'Hardwood parquet floors', condition: 'good' },
                    { item: 'Central heating and air circulation', condition: 'good' },
                    { item: 'Kitchen induction cooktop and oven', condition: 'good' }
                ],
                images: [
                    { data: sampleImageBuffer, contentType: 'image/svg+xml', fileName: 'living_room.svg', isPrimary: true, caption: 'Main Living Room', roomLabel: 'Living Room' },
                    { data: sampleImageBuffer, contentType: 'image/svg+xml', fileName: 'master_bed.svg', isPrimary: false, caption: 'Master Bedroom with Ensuite', roomLabel: 'Master Bedroom' }
                ],
                agentId: agent._id,
                ownerId: agent._id,
                agentName: agent.name,
                agentContact: agent.phone
            });
            const prop2 = await House_1.default.create({
                title: 'Executive 5-Bedroom Villa with Landscaped Garden',
                description: 'Magnificent family residence in CMC residential enclave. Boasting 5 bedrooms with ensuite bathrooms, grand reception hall, modern fitted kitchen plus traditional secondary kitchen, detached service quarters, and a manicured lush garden. Available for outright purchase with clean transferable title.',
                propertyType: House_1.PropertyType.VILLA,
                transactionType: House_1.TransactionType.BUY,
                intendedPurpose: House_1.IntendedPurpose.RESIDENTIAL_OWNERSHIP,
                status: House_1.HouseStatus.AVAILABLE,
                approvalStatus: House_1.ApprovalStatus.APPROVED,
                verificationStatus: House_1.VerificationStatus.VERIFIED,
                isVerified: true,
                verificationNotes: 'Deed search completed. Clear ownership history.',
                location: {
                    address: 'CMC Michael Residential Zone',
                    city: 'Addis Ababa',
                    state: 'Addis Ababa',
                    country: 'Ethiopia',
                    zipCode: '1000',
                    neighborhood: 'CMC',
                    landmark: 'CMC Michael Church',
                    coordinates: { lat: 9.0255, lng: 38.8340 }
                },
                details: {
                    bedrooms: 5,
                    bathrooms: 6,
                    area: 450,
                    lotSize: 500,
                    yearBuilt: 2022,
                    floors: 3,
                    parkingSpaces: 4,
                    furnished: false,
                    furnishingStatus: 'unfurnished',
                    amenities: ['Garden', 'Parking', 'Security 24/7', 'Backup Generator', 'Water Tank', 'Balcony', 'Service Quarters'],
                    features: ['Perimeter Security Fence', 'Double Height Ceiling', 'Solar Water Heating']
                },
                pricing: {
                    price: 48000000,
                    pricePerSqft: 106666,
                    maintenanceFee: 0,
                    taxAmount: 0,
                    securityDeposit: 0,
                    quantity: 1
                },
                saleTerms: {
                    askingPrice: 48000000,
                    ownershipDocType: 'Title Deed (Cartographic Map)',
                    isNegotiable: true,
                    escrowSupported: true,
                    downPaymentMin: 4800000
                },
                categoryAttributes: {
                    compoundSize: 500,
                    serviceQuarter: true,
                    securityPost: true,
                    swimmingPool: false
                },
                tags: ['CMC', 'FamilyHome', 'ExecutiveVilla', 'Garden', 'ForSale', 'Parking', 'TitleDeed'],
                likesCount: 42,
                views: 2150,
                uniqueViews: 1400,
                inquiries: 31,
                rating: 4.8,
                numReviews: 8,
                featured: true,
                trendingScore: 98,
                videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                panoramic360: {
                    enabled: true,
                    imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=80',
                    caption: '360° Panoramic View of Courtyard and Garden'
                },
                floorPlan: {
                    url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
                    rooms: [
                        { name: 'Ground Floor Grand Salon', dimensions: '10.5m x 7.2m', areaSqM: 75.6 },
                        { name: 'Formal Dining Room', dimensions: '5.5m x 4.8m', areaSqM: 26.4 },
                        { name: 'Master Suite (Level 2)', dimensions: '6.5m x 5.8m', areaSqM: 37.7 },
                        { name: 'Family Lounge (Level 2)', dimensions: '6.0m x 4.5m', areaSqM: 27 },
                        { name: 'Bedroom 2 with Ensuite', dimensions: '4.8m x 4.2m', areaSqM: 20.1 },
                        { name: 'Bedroom 3 with Ensuite', dimensions: '4.5m x 4.0m', areaSqM: 18 }
                    ]
                },
                nearbyAmenities: [
                    { name: 'CMC Light Rail Station', type: 'transit', distanceKm: 0.9 },
                    { name: 'Yerer General Hospital', type: 'hospital', distanceKm: 2.4 },
                    { name: 'Safari Academy', type: 'school', distanceKm: 1.1 },
                    { name: 'CMC Commercial Mall', type: 'shopping', distanceKm: 0.8 }
                ],
                images: [
                    { data: sampleImageBuffer, contentType: 'image/svg+xml', fileName: 'villa_front.svg', isPrimary: true, caption: 'Villa Exterior & Garden', roomLabel: 'Exterior' }
                ],
                agentId: agent._id,
                ownerId: admin._id,
                agentName: agent.name,
                agentContact: agent.phone
            });
            const prop3 = await House_1.default.create({
                title: 'Prime Commercial Office Floor in Kazanchis CBD',
                description: 'Complete 380 m² commercial open-plan office space on the 5th floor of a premier corporate tower in Kazanchis financial district. Features redundant backup generators, dedicated fiber optics, 6 executive partitioned meeting rooms, and 6 allocated basement parking slots.',
                propertyType: House_1.PropertyType.OFFICE,
                transactionType: House_1.TransactionType.RENT,
                intendedPurpose: House_1.IntendedPurpose.BUSINESS,
                status: House_1.HouseStatus.AVAILABLE,
                approvalStatus: House_1.ApprovalStatus.APPROVED,
                verificationStatus: House_1.VerificationStatus.VERIFIED,
                isVerified: true,
                location: {
                    address: 'Kazanchis Menelik II Avenue',
                    city: 'Addis Ababa',
                    state: 'Addis Ababa',
                    country: 'Ethiopia',
                    zipCode: '1000',
                    neighborhood: 'Kazanchis',
                    landmark: 'UNECA Headquarters',
                    coordinates: { lat: 9.0180, lng: 38.7660 }
                },
                details: {
                    bedrooms: 0,
                    bathrooms: 4,
                    area: 380,
                    lotSize: 0,
                    yearBuilt: 2021,
                    floors: 14,
                    parkingSpaces: 6,
                    furnished: true,
                    furnishingStatus: 'partially_furnished',
                    amenities: ['Elevator', 'Security 24/7', 'Backup Generator', 'High-Speed WiFi', 'Intercom', 'Water Tank'],
                    features: ['Central AC Ducting', 'Server Room with Fire Suppression', 'Electronic Turnstile Access']
                },
                pricing: {
                    price: 152000,
                    pricePerSqft: 400,
                    maintenanceFee: 8000,
                    taxAmount: 0,
                    securityDeposit: 304000,
                    quantity: 1
                },
                rentalPricing: {
                    frequency: 'monthly',
                    securityDeposit: 304000,
                    advancePayments: 6,
                    minLeaseDuration: 12,
                    availableFrom: new Date()
                },
                categoryAttributes: {
                    meetingRooms: 4,
                    allocatedParking: 6,
                    fiberInternet: true,
                    fireSafetySystem: true
                },
                tags: ['Kazanchis', 'OfficeSpace', 'CBD', 'Commercial', 'Parking', 'BackupGenerator', 'Elevator'],
                likesCount: 15,
                views: 890,
                uniqueViews: 650,
                inquiries: 14,
                rating: 4.7,
                numReviews: 4,
                featured: false,
                trendingScore: 78,
                nearbyAmenities: [
                    { name: 'UNECA Conference Center', type: 'landmark', distanceKm: 0.5 },
                    { name: 'Hilton Addis Ababa', type: 'landmark', distanceKm: 0.7 },
                    { name: 'Commercial Bank of Ethiopia HQ', type: 'landmark', distanceKm: 1.2 },
                    { name: 'Kazanchis Bus Terminal', type: 'transit', distanceKm: 0.3 }
                ],
                images: [
                    { data: sampleImageBuffer, contentType: 'image/svg+xml', fileName: 'office.svg', isPrimary: true, caption: 'Open-plan Office Floor', roomLabel: 'Office Space' }
                ],
                agentId: agent._id,
                ownerId: admin._id,
                agentName: agent.name,
                agentContact: agent.phone
            });
            // Seed Reviews
            await Review_1.default.create({
                houseId: prop1._id,
                userId: customer._id,
                userName: customer.name,
                userRole: 'customer',
                rating: 5,
                title: 'Outstanding experience and views!',
                comment: 'Lived here for 6 months. The building management is stellar, backup power is instantaneous, and the location in Bole is unbeatable.',
                isVerifiedResident: true,
                status: 'APPROVED'
            });
            // Seed Appointment
            await Appointment_1.default.create({
                houseId: prop1._id,
                customerId: customer._id,
                customerName: customer.name,
                customerEmail: customer.email,
                customerPhone: customer.phone,
                hostId: agent._id,
                visitDate: new Date(Date.now() + 2 * 24 * 3600 * 1000),
                timeSlot: '02:00 PM - 03:00 PM',
                visitType: Appointment_1.VisitType.IN_PERSON,
                numberOfVisitors: 2,
                notes: 'Interested in a 1-year corporate lease starting next month.',
                status: Appointment_1.AppointmentStatus.CONFIRMED
            });
            // Seed Lease Agreement
            const startD = new Date();
            const endD = new Date(Date.now() + 365 * 24 * 3600 * 1000);
            await LeaseAgreement_1.default.create({
                agreementNumber: 'LEASE-2026-081',
                houseId: prop1._id,
                tenantId: customer._id,
                tenantName: customer.name,
                tenantEmail: customer.email,
                tenantPhone: customer.phone,
                landlordId: agent._id,
                agentId: agent._id,
                startDate: startD,
                endDate: endD,
                rentAmount: 65000,
                billingFrequency: 'monthly',
                securityDeposit: 65000,
                signedByLandlord: true,
                signedByTenant: true,
                tenantSignedAt: new Date(),
                landlordSignedAt: new Date(),
                status: LeaseAgreement_1.LeaseStatus.ACTIVE,
                paymentSchedule: [
                    {
                        installmentNumber: 1,
                        dueDate: startD,
                        amount: 65000,
                        status: 'PAID',
                        paidAmount: 65000,
                        paidDate: new Date(),
                        receiptNumber: 'RCP-2026-9011'
                    },
                    {
                        installmentNumber: 2,
                        dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
                        amount: 65000,
                        status: 'PENDING'
                    }
                ]
            });
            // Seed Purchase Offer
            await PurchaseOffer_1.default.create({
                houseId: prop2._id,
                buyerId: customer._id,
                buyerName: customer.name,
                buyerEmail: customer.email,
                buyerPhone: customer.phone,
                sellerId: admin._id,
                agentId: agent._id,
                initialOfferAmount: 45000000,
                currentOfferAmount: 46500000,
                askingPriceAtOffer: 48000000,
                earnestDepositAmount: 11625000,
                financingType: 'CASH',
                paymentPlan: 'PARTIAL',
                advancePercentage: 25,
                advanceAmount: 11625000,
                finalAmount: 34875000,
                productionProgress: 35,
                productionStage: 'IN_PRODUCTION',
                productionNotes: '25% advance payment verified. Raw materials procured; fabrication underway at MAT workshop.',
                status: PurchaseOffer_1.OfferStatus.IN_PRODUCTION,
                contingencies: ['Quality Inspection Certificate', 'MAT Engineering Handover Protocol'],
                negotiationTimeline: [
                    {
                        senderId: customer._id,
                        senderRole: 'buyer',
                        proposedAmount: 45000000,
                        message: 'Order request submitted under 25% partial payment plan.',
                        timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000)
                    },
                    {
                        senderId: admin._id,
                        senderRole: 'seller',
                        proposedAmount: 47000000,
                        message: 'We can accept ETB 47M with 25% advance and 75% on completion.',
                        timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000)
                    },
                    {
                        senderId: customer._id,
                        senderRole: 'buyer',
                        proposedAmount: 46500000,
                        message: 'Agreed at ETB 46.5M. Proceeding with 25% advance deposit.',
                        timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000)
                    }
                ],
                milestones: [
                    {
                        title: 'Initial Advance Payment (25%)',
                        amount: 11625000,
                        percentage: 25,
                        dueDate: new Date(Date.now() - 1 * 24 * 3600 * 1000),
                        status: 'PAID',
                        paidAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
                        paidAmount: 11625000,
                        transactionReference: 'TXN-MAT-INIT-2026',
                        receiptNumber: 'RCP-MAT-8921',
                        method: 'cbe'
                    },
                    {
                        title: 'Final Settlement upon Product Completion & Handover (75%)',
                        amount: 34875000,
                        percentage: 75,
                        dueDate: new Date(Date.now() + 20 * 24 * 3600 * 1000),
                        status: 'PENDING'
                    }
                ]
            });
            // Seed Maintenance Request
            await MaintenanceRequest_1.default.create({
                houseId: prop1._id,
                tenantId: customer._id,
                tenantName: customer.name,
                tenantPhone: customer.phone,
                landlordId: agent._id,
                category: 'PLUMBING',
                priority: 'MEDIUM',
                title: 'Master Bathroom Shower Mixer Tap Needs Washer Replacement',
                description: 'Slight water drip from the hot water mixer in master ensuite. Appears to be an internal washer wear.',
                status: 'IN_PROGRESS',
                assignedTechnician: 'Desta Plumbing Services',
                technicianContact: '0912345678',
                estimatedCost: 1200
            });
            console.log('Advanced real estate platform data successfully seeded!');
        }
        console.log('Database seeding process complete.');
        process.exit(0);
    }
    catch (err) {
        console.error('Error seeding data:', err);
        process.exit(1);
    }
};
exports.seedAdvancedData = seedAdvancedData;
// Execute if run directly
if (require.main === module) {
    (0, exports.seedAdvancedData)();
}
