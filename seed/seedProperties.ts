import mongoose from 'mongoose';
import dotenv from 'dotenv';
import House, { PropertyType, TransactionType, IntendedPurpose, HouseStatus, ApprovalStatus, VerificationStatus } from '../models/House';
import User from '../models/User';
import Review from '../models/Review';
import Appointment, { AppointmentStatus, VisitType } from '../models/Appointment';
import LeaseAgreement, { LeaseStatus } from '../models/LeaseAgreement';
import PurchaseOffer, { OfferStatus } from '../models/PurchaseOffer';
import MaintenanceRequest from '../models/MaintenanceRequest';
import CategoryConfig from '../models/CategoryConfig';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms';

export const seedAdvancedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for seeding MAT Engineering & Trading PLC product catalog and orders...');

    // Find or create admin and agent/owner user
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = await User.create({
        name: 'System Administrator',
        email: 'admin@hrms.com',
        phone: '0911000001',
        password: 'Password123!',
        role: 'admin',
        isVerified: true,
        verificationStatus: 'verified'
      });
    }

    let agent = await User.findOne({ role: 'agent' });
    if (!agent) {
      agent = await User.create({
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

    let customer = await User.findOne({ role: 'customer' });
    if (!customer) {
      customer = await User.create({
        name: 'Hanan Mohammed',
        email: 'customer@hrms.com',
        phone: '0911000003',
        password: 'Password123!',
        role: 'customer',
        isVerified: true,
        verificationStatus: 'verified'
      });
    }

    // 1. Seed Dynamic Category Configurations for MAT Engineering & Trading PLC
    await CategoryConfig.deleteMany({});
    await CategoryConfig.insertMany([
      {
        categoryKey: 'APARTMENT',
        displayName: 'Certified Construction Materials',
        group: 'construction_supplies',
        allowedTransactionTypes: ['BUY', 'RENT'],
        fields: [
          { key: 'materialGrade', label: 'Material Grade / Standard (e.g. Grade 60, 42.5R)', type: 'text', required: true, filterEnabled: true },
          { key: 'unitOfMeasure', label: 'Unit of Measure (Ton, Quintal, Pcs, m²)', type: 'text', required: true, filterEnabled: true },
          { key: 'certifiedTesting', label: 'Quality Test Certificate Available', type: 'boolean', filterEnabled: true },
          { key: 'bulkDiscount', label: 'Bulk Order Discount Eligible', type: 'boolean', filterEnabled: true },
          { key: 'directDelivery', label: 'On-Site Crane Delivery Available', type: 'boolean', filterEnabled: true }
        ]
      },
      {
        categoryKey: 'VILLA',
        displayName: 'Bespoke Home & Living Furniture',
        group: 'furniture',
        allowedTransactionTypes: ['BUY'],
        fields: [
          { key: 'woodType', label: 'Timber / Wood Species', type: 'text', filterEnabled: true },
          { key: 'fabricMaterial', label: 'Upholstery & Fabric Grade', type: 'text', filterEnabled: true },
          { key: 'customFinish', label: 'Custom Stain / Lacquer Finish Option', type: 'boolean', filterEnabled: true },
          { key: 'warrantyYears', label: 'Structural Warranty (Years)', type: 'number', filterEnabled: true }
        ]
      },
      {
        categoryKey: 'OFFICE',
        displayName: 'Executive Office & Commercial Furniture',
        group: 'commercial_furniture',
        allowedTransactionTypes: ['BUY'],
        fields: [
          { key: 'ergonomicCertified', label: 'Ergonomic Certification', type: 'boolean', filterEnabled: true },
          { key: 'cableManagement', label: 'Integrated Cable Ducting', type: 'boolean', filterEnabled: true },
          { key: 'modularExpandable', label: 'Modular Layout Expandable', type: 'boolean', filterEnabled: true }
        ]
      },
      {
        categoryKey: 'WAREHOUSE',
        displayName: 'Industrial Steel Fabrication & Pre-Engineered Structures',
        group: 'steel_fabrication',
        allowedTransactionTypes: ['BUY'],
        fields: [
          { key: 'steelGrade', label: 'Structural Steel Grade (S275 / S355)', type: 'text', filterEnabled: true },
          { key: 'coatingType', label: 'Anti-Corrosion Primer & Paint', type: 'text', filterEnabled: true },
          { key: 'siteErection', label: 'Site Erection & Assembly Service Included', type: 'boolean', filterEnabled: true }
        ]
      },
      {
        categoryKey: 'LAND',
        displayName: 'General Contracting & Building Fit-Out Works',
        group: 'contracting',
        allowedTransactionTypes: ['BUY'],
        fields: [
          { key: 'contractType', label: 'Contract Execution Type (Turnkey, Fixed Price, Unit Rate)', type: 'text', filterEnabled: true },
          { key: 'licenseGrade', label: 'Ministry of Construction License Grade', type: 'text', filterEnabled: true }
        ]
      }
    ]);
    console.log('Category configurations seeded for MAT Engineering.');

    // 2. Check if rich sample properties exist
    const count = await House.countDocuments({ isVerified: true });
    if (count < 3) {
      console.log('Seeding rich MAT Engineering product inventory...');

      // Sample SVG Data URIs for product images
      const sampleImageBuffer = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="800" height="600" fill="url(#grad)" />
          <circle cx="400" cy="300" r="180" fill="#0284c7" opacity="0.15" />
          <rect x="250" y="240" width="300" height="120" rx="8" fill="#06b6d4" opacity="0.8" />
          <text x="400" y="310" fill="#0f172a" font-family="system-ui, sans-serif" font-size="24" font-weight="bold" text-anchor="middle">MAT ENGINEERING</text>
          <text x="400" y="480" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="28" font-weight="bold" text-anchor="middle">Certified Quality Standard</text>
          <text x="400" y="520" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="18" text-anchor="middle">Trading & Engineering PLC</text>
        </svg>`,
        'utf-8'
      );

      const prop1 = await House.create({
        title: 'High-Tensile Deformed Steel Rebar - Grade 60 (16mm / 12m Bars)',
        description: 'Certified Grade 60 high-tensile thermo-mechanically treated (TMT) steel rebar for heavy civil and multi-storey structural concrete works. Conforms to ASTM A615 / Ethiopian Standard specifications with full mill test certificates and elongation guarantee. Available for immediate dispatch from Addis Ababa main warehouse.',
        propertyType: PropertyType.APARTMENT,
        transactionType: TransactionType.BUY,
        intendedPurpose: IntendedPurpose.BUSINESS,
        status: HouseStatus.AVAILABLE,
        approvalStatus: ApprovalStatus.APPROVED,
        verificationStatus: VerificationStatus.VERIFIED,
        isVerified: true,
        verificationNotes: 'Mill test certificates and Ethiopian Conformity Assessment Enterprise (ECAE) verified.',
        verificationDocuments: [
          { title: 'ECAE Quality Compliance Certificate', documentType: 'TITLE_DEED', verifiedAt: new Date() },
          { title: 'Tensile & Elongation Mill Test Report', documentType: 'PERMIT', verifiedAt: new Date() }
        ],
        location: {
          address: 'MAT Engineering Central Depot, Kality Industrial Zone',
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          country: 'Ethiopia',
          zipCode: '1000',
          neighborhood: 'Kality',
          landmark: 'Kality Customs Terminal',
          coordinates: { lat: 8.9050, lng: 38.7520 }
        },
        details: {
          bedrooms: 0,
          bathrooms: 0,
          area: 12,
          lotSize: 0,
          yearBuilt: 2024,
          floors: 1,
          parkingSpaces: 0,
          furnished: false,
          furnishingStatus: 'unfurnished',
          amenities: ['ECAE Certified', 'Overhead Crane Loading', 'Immediate Dispatch', 'Batch Test Reports', 'Bulk Transport Fleet'],
          features: ['ASTM A615 Grade 60 Standard', 'High Yield Strength 420+ MPa', 'Superior Bendability']
        },
        pricing: {
          price: 125000,
          pricePerSqft: 0,
          maintenanceFee: 0,
          taxAmount: 0,
          securityDeposit: 0,
          quantity: 250
        },
        saleTerms: {
          askingPrice: 125000,
          ownershipDocType: 'Commercial Invoice & Mill Test Certificate',
          isNegotiable: true,
          escrowSupported: true,
          downPaymentMin: 31250
        },
        categoryAttributes: {
          materialGrade: 'Grade 60 (420 MPa)',
          unitOfMeasure: 'Metric Ton',
          certifiedTesting: true,
          bulkDiscount: true,
          directDelivery: true
        },
        productAttributes: {
          sku: 'MAT-RBR-16G60',
          brand: 'MAT Engineering Certified Rebar',
          material: 'Thermo-Mechanically Treated High-Tensile Steel',
          grade: 'ASTM A615 Grade 60',
          dimensions: 'Diameter: 16mm • Standard Length: 12 meters',
          unit: 'Metric Ton (approx. 53 bars/ton)',
          weight: '1,000 kg/ton',
          leadTime: 'Immediate Depot Dispatch (24–48 hours for bulk)',
          leadTimeDays: 2,
          stockQuantity: 250,
          warranty: 'Lifetime Metallurgical Quality Guarantee'
        },
        tags: ['Steel', 'Rebar', 'Grade60', 'Construction', 'Reinforcement', 'KalityWarehouse'],
        likesCount: 38,
        views: 1840,
        uniqueViews: 1120,
        inquiries: 27,
        rating: 4.9,
        numReviews: 14,
        featured: true,
        trendingScore: 96,
        images: [
          { data: sampleImageBuffer, contentType: 'image/svg+xml', fileName: 'steel_rebar.svg', isPrimary: true, caption: 'Grade 60 Steel Rebar Bundle', roomLabel: 'Stock Depot' }
        ],
        agentId: agent._id,
        ownerId: admin._id,
        agentName: agent.name,
        agentContact: agent.phone
      });

      const prop2 = await House.create({
        title: 'Executive Ergonomic Office Suite & 10-Seater Conference Set',
        description: 'Premium corporate furniture bundle manufactured with kiln-dried solid hardwood, anti-scratch melamine finish, and powder-coated heavy gauge steel frames. Includes executive presidential desk, executive leather chair, 10-seater conference table with integrated cable management, and matching storage credenza.',
        propertyType: PropertyType.OFFICE,
        transactionType: TransactionType.BUY,
        intendedPurpose: IntendedPurpose.BUSINESS,
        status: HouseStatus.AVAILABLE,
        approvalStatus: ApprovalStatus.APPROVED,
        verificationStatus: VerificationStatus.VERIFIED,
        isVerified: true,
        verificationNotes: 'Factory inspected at MAT Furniture Workshop with structural guarantee.',
        location: {
          address: 'MAT Engineering Furniture Showroom, Bole Medhanialem',
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          country: 'Ethiopia',
          zipCode: '1000',
          neighborhood: 'Bole',
          landmark: 'Bole Medhanialem Mall',
          coordinates: { lat: 8.9984, lng: 38.7885 }
        },
        details: {
          bedrooms: 0,
          bathrooms: 0,
          area: 35,
          lotSize: 0,
          yearBuilt: 2024,
          floors: 1,
          parkingSpaces: 0,
          furnished: true,
          furnishingStatus: 'furnished',
          amenities: ['Ergonomic Design', 'Integrated Cable Ports', 'Hardwood Finish', 'Modular Design', 'On-Site Assembly'],
          features: ['Executive Presidential Desk (2.4m)', '10-Seater Boardroom Table (3.6m)', 'Full Leather Executive High-Back Chair']
        },
        pricing: {
          price: 85000,
          pricePerSqft: 0,
          maintenanceFee: 0,
          taxAmount: 0,
          securityDeposit: 0,
          quantity: 15
        },
        saleTerms: {
          askingPrice: 85000,
          ownershipDocType: 'Official Warranty & Supply Invoice',
          isNegotiable: true,
          escrowSupported: true,
          downPaymentMin: 21250
        },
        categoryAttributes: {
          ergonomicCertified: true,
          cableManagement: true,
          modularExpandable: true
        },
        productAttributes: {
          sku: 'MAT-FRN-EX900',
          brand: 'MAT Bespoke Office Furniture',
          material: 'Kiln-Dried Hardwood & Powder-Coated Heavy Gauge Steel',
          grade: 'Commercial Grade A',
          dimensions: 'Desk: 240x110x76 cm • Table: 360x140x76 cm',
          unit: 'Complete Corporate Suite Set',
          weight: '380 kg total',
          leadTime: '3–5 Business Days Custom Assembly',
          leadTimeDays: 4,
          stockQuantity: 15,
          warranty: '5-Year Structural Integrity Warranty'
        },
        tags: ['Furniture', 'OfficeSuite', 'ExecutiveDesk', 'BoardroomTable', 'MATFurniture', 'BoleShowroom'],
        likesCount: 52,
        views: 2450,
        uniqueViews: 1600,
        inquiries: 41,
        rating: 4.9,
        numReviews: 18,
        featured: true,
        trendingScore: 99,
        images: [
          { data: sampleImageBuffer, contentType: 'image/svg+xml', fileName: 'office_suite.svg', isPrimary: true, caption: 'Executive Suite & Conference Set', roomLabel: 'Showroom' }
        ],
        agentId: agent._id,
        ownerId: admin._id,
        agentName: agent.name,
        agentContact: agent.phone
      });

      const prop3 = await House.create({
        title: 'Pre-Engineered Heavy Duty Industrial Steel Truss Structure (24m Span)',
        description: 'Custom fabricated structural steel roof truss and column system engineered for industrial warehouses, logistics depots, and manufacturing plants. Includes high-yield S355 steel I-beams, purlins, bracings, anchor bolts, and zinc-chromate primer finish. Engineered to Ethiopian Building Code standards.',
        propertyType: PropertyType.WAREHOUSE,
        transactionType: TransactionType.BUY,
        intendedPurpose: IntendedPurpose.BUSINESS,
        status: HouseStatus.AVAILABLE,
        approvalStatus: ApprovalStatus.APPROVED,
        verificationStatus: VerificationStatus.VERIFIED,
        isVerified: true,
        verificationNotes: 'Structural engineering calculations and welding inspection approved.',
        location: {
          address: 'MAT Heavy Fabrication Yard, Akaki-Kality',
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          country: 'Ethiopia',
          zipCode: '1000',
          neighborhood: 'Akaki',
          landmark: 'Akaki Industrial Park',
          coordinates: { lat: 8.8820, lng: 38.7750 }
        },
        details: {
          bedrooms: 0,
          bathrooms: 0,
          area: 1200,
          lotSize: 0,
          yearBuilt: 2024,
          floors: 1,
          parkingSpaces: 0,
          furnished: false,
          furnishingStatus: 'unfurnished',
          amenities: ['ECAE Certified', 'Welding NDT Inspection', 'Zinc-Chromate Coating', 'Erection Crew Available'],
          features: ['Clear Span 24m without Internal Columns', 'S355 Structural Steel', 'Engineered for High Wind & Seismic Loads']
        },
        pricing: {
          price: 420000,
          pricePerSqft: 0,
          maintenanceFee: 0,
          taxAmount: 0,
          securityDeposit: 0,
          quantity: 6
        },
        saleTerms: {
          askingPrice: 420000,
          ownershipDocType: 'Engineering Certification & Supply Contract',
          isNegotiable: true,
          escrowSupported: true,
          downPaymentMin: 105000
        },
        categoryAttributes: {
          steelGrade: 'S355 Structural Steel',
          coatingType: 'Double Zinc-Chromate Primer',
          siteErection: true
        },
        productAttributes: {
          sku: 'MAT-STL-TRS24',
          brand: 'MAT Pre-Engineered Steel Systems',
          material: 'Structural Steel S355 / Grade 50',
          grade: 'Heavy Structural Fabrication',
          dimensions: 'Span: 24 meters • Bay Spacing: 6 meters • Length: 50 meters',
          unit: 'Complete Pre-Engineered Building Framework',
          weight: '18 Metric Tons',
          leadTime: '7–14 Business Days Precision Fabrication',
          leadTimeDays: 10,
          stockQuantity: 6,
          warranty: '10-Year Structural Engineering Warranty'
        },
        tags: ['SteelFabrication', 'RoofTruss', 'WarehouseStructure', 'PreEngineered', 'MATSteel'],
        likesCount: 29,
        views: 1380,
        uniqueViews: 920,
        inquiries: 22,
        rating: 4.8,
        numReviews: 9,
        featured: true,
        trendingScore: 92,
        images: [
          { data: sampleImageBuffer, contentType: 'image/svg+xml', fileName: 'steel_truss.svg', isPrimary: true, caption: 'Industrial Steel Truss Framework', roomLabel: 'Fabrication Yard' }
        ],
        agentId: agent._id,
        ownerId: admin._id,
        agentName: agent.name,
        agentContact: agent.phone
      });

      // Seed Reviews
      await Review.create({
        houseId: prop1._id,
        userId: customer._id,
        userName: customer.name,
        userRole: 'customer',
        rating: 5,
        title: 'Top grade rebar with rapid depot dispatch!',
        comment: 'Ordered 20 metric tons of 16mm Grade 60 rebar for our commercial project. The mill certificates matched testing at ECAE, and MAT delivered straight to site with crane unloading. Highly recommended!',
        isVerifiedResident: true,
        status: 'APPROVED'
      });

      // Seed Appointment
      await Appointment.create({
        houseId: prop2._id,
        customerId: customer._id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        hostId: agent._id,
        visitDate: new Date(Date.now() + 2 * 24 * 3600 * 1000),
        timeSlot: '02:00 PM - 03:00 PM',
        visitType: VisitType.IN_PERSON,
        numberOfVisitors: 2,
        notes: 'Interested in bespoke corporate furniture set for our new Bole branch.',
        status: AppointmentStatus.CONFIRMED
      });

      // Seed Supply Contract
      const startD = new Date();
      const endD = new Date(Date.now() + 90 * 24 * 3600 * 1000);
      await LeaseAgreement.create({
        agreementNumber: 'MAT-CTR-2026-081',
        houseId: prop1._id,
        tenantId: customer._id,
        tenantName: customer.name,
        tenantEmail: customer.email,
        tenantPhone: customer.phone,
        landlordId: agent._id,
        agentId: agent._id,
        startDate: startD,
        endDate: endD,
        rentAmount: 125000,
        billingFrequency: 'one_time',
        securityDeposit: 31250,
        signedByLandlord: true,
        signedByTenant: true,
        tenantSignedAt: new Date(),
        landlordSignedAt: new Date(),
        status: LeaseStatus.ACTIVE,
        paymentSchedule: [
          {
            installmentNumber: 1,
            dueDate: startD,
            amount: 31250,
            status: 'PAID',
            paidAmount: 31250,
            paidDate: new Date(),
            receiptNumber: 'RCP-MAT-2026-001'
          },
          {
            installmentNumber: 2,
            dueDate: new Date(Date.now() + 15 * 24 * 3600 * 1000),
            amount: 93750,
            status: 'PENDING'
          }
        ]
      });

      // Seed Purchase Offer / Custom Order Flow with 25% Advance and Live Production Tracking
      await PurchaseOffer.create({
        houseId: prop2._id,
        buyerId: customer._id,
        buyerName: customer.name,
        buyerEmail: customer.email,
        buyerPhone: customer.phone,
        sellerId: admin._id,
        agentId: agent._id,
        initialOfferAmount: 80000,
        currentOfferAmount: 85000,
        askingPriceAtOffer: 85000,
        earnestDepositAmount: 21250,
        financingType: 'CASH',
        paymentPlan: 'PARTIAL',
        advancePercentage: 25,
        advanceAmount: 21250,
        finalAmount: 63750,
        productionProgress: 50,
        productionStage: 'IN_PRODUCTION',
        productionNotes: '25% advance payment (ETB 21,250) confirmed. Hardwood cutting completed; precision assembly and lacquer finish underway.',
        status: OfferStatus.IN_PRODUCTION,
        contingencies: ['Quality Inspection Certificate', 'MAT Engineering Factory Handover Protocol'],
        negotiationTimeline: [
          {
            senderId: customer._id,
            senderRole: 'buyer',
            proposedAmount: 80000,
            message: 'Order request submitted under 25% partial advance payment plan.',
            timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000)
          },
          {
            senderId: admin._id,
            senderRole: 'seller',
            proposedAmount: 85000,
            message: 'We accept ETB 85,000 including custom cable ducts and 5-year warranty. 25% advance to initiate workshop production.',
            timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000)
          },
          {
            senderId: customer._id,
            senderRole: 'buyer',
            proposedAmount: 85000,
            message: 'Agreed at ETB 85,000. 25% advance deposit dispatched.',
            timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000)
          }
        ],
        milestones: [
          {
            title: '25% Production Initiation Advance Payment',
            amount: 21250,
            percentage: 25,
            dueDate: new Date(Date.now() - 1 * 24 * 3600 * 1000),
            status: 'PAID',
            paidAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
            paidAmount: 21250,
            transactionReference: 'TXN-MAT-INIT-2026',
            receiptNumber: 'RCP-MAT-8921',
            method: 'cbe'
          },
          {
            title: '75% Final Payment upon Production Finished & Handover',
            amount: 63750,
            percentage: 75,
            dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
            status: 'PENDING'
          }
        ]
      });

      // Seed Maintenance Request / Warranty Support
      await MaintenanceRequest.create({
        houseId: prop1._id,
        tenantId: customer._id,
        tenantName: customer.name,
        tenantPhone: customer.phone,
        landlordId: agent._id,
        category: 'STRUCTURAL',
        priority: 'MEDIUM',
        title: 'On-site Rebar Dimensional Verification and Mill Certificate Request',
        description: 'Contractor requested certified mill test report and tensile inspection verification on site for project engineer signoff.',
        status: 'IN_PROGRESS',
        assignedTechnician: 'MAT Quality Assurance Team',
        technicianContact: '0911 994 405',
        estimatedCost: 0
      });

      console.log('MAT Engineering product inventory, milestones, and orders successfully seeded!');
    }

    console.log('Database seeding process complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
};

// Execute if run directly
if (require.main === module) {
  seedAdvancedData();
}
