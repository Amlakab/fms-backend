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
exports.deleteRentalApplication = exports.updateRentalApplicationStatus = exports.getRentalApplicationById = exports.getRentalApplications = exports.submitRentalApplication = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const RentalApplication_1 = __importStar(require("../models/RentalApplication"));
const House_1 = __importDefault(require("../models/House"));
const User_1 = __importDefault(require("../models/User"));
const Notification_1 = __importStar(require("../models/Notification"));
const LeaseAgreement_1 = __importStar(require("../models/LeaseAgreement"));
const houseRef_1 = require("../utils/houseRef");
// ─── SUBMIT RENTAL APPLICATION (Public / Authenticated) ────────
const submitRentalApplication = async (req, res) => {
    try {
        const { houseId, fullName, email, phone, occupation, monthlyIncome, numberOfOccupants = 1, preferredMoveInDate, message = '' } = req.body;
        // Basic validation
        if (!houseId || !mongoose_1.default.Types.ObjectId.isValid(houseId)) {
            return res.status(400).json({ success: false, message: 'Valid Property ID is required' });
        }
        if (!fullName || !email || !phone || !occupation || monthlyIncome === undefined || !preferredMoveInDate) {
            return res.status(400).json({
                success: false,
                message: 'Please provide full name, email, phone, occupation, monthly income, and preferred move-in date'
            });
        }
        // Verify property exists
        const house = await House_1.default.findById(houseId);
        if (!house) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }
        // Identify user if logged in or matching email
        const currentUser = req.user;
        let userId = currentUser?._id;
        if (!userId) {
            const existingUser = await User_1.default.findOne({ email: email.trim().toLowerCase() });
            if (existingUser) {
                userId = existingUser._id;
            }
        }
        // Create application
        const application = await RentalApplication_1.default.create({
            houseId,
            userId: userId || undefined,
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            occupation: occupation.trim(),
            monthlyIncome: Number(monthlyIncome) || 0,
            numberOfOccupants: Math.max(1, Number(numberOfOccupants) || 1),
            preferredMoveInDate: new Date(preferredMoveInDate),
            message: message ? message.trim() : '',
            status: RentalApplication_1.ApplicationStatus.PENDING
        });
        // Notify Property Owner / Agent
        const recipientId = house.agentId || house.ownerId;
        if (recipientId) {
            try {
                await Notification_1.default.create({
                    userId: recipientId,
                    title: 'New Rental Lease Application',
                    message: `${fullName} has applied for "${house.title}". Monthly income: $${monthlyIncome}.`,
                    type: Notification_1.NotificationType.RENTAL_APPLICATION,
                    link: '/admin/workflows',
                    metadata: {
                        applicationId: application._id,
                        houseId: house._id
                    }
                });
            }
            catch (notifErr) {
                console.warn('Failed to send manager notification for rental app:', notifErr);
            }
        }
        // Notify Applicant if an account exists
        if (userId) {
            try {
                await Notification_1.default.create({
                    userId,
                    title: 'Rental Application Submitted',
                    message: `Your application to rent "${house.title}" has been received and is under review.`,
                    type: Notification_1.NotificationType.RENTAL_APPLICATION,
                    link: '/admin/customer',
                    metadata: {
                        applicationId: application._id,
                        houseId: house._id
                    }
                });
            }
            catch (notifErr) {
                console.warn('Failed to send applicant notification for rental app:', notifErr);
            }
        }
        return res.status(201).json({
            success: true,
            data: application,
            message: 'Rental application submitted successfully! Our team will review it shortly.'
        });
    }
    catch (error) {
        console.error('Error submitting rental application:', error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};
exports.submitRentalApplication = submitRentalApplication;
// ─── GET RENTAL APPLICATIONS (Role Filtered) ──────────────────
const getRentalApplications = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { search, status, houseId, page = 1, limit = 10 } = req.query;
        const pageNum = Math.max(1, parseInt(String(page)) || 1);
        const limitNum = Math.max(1, parseInt(String(limit)) || 10);
        const skip = (pageNum - 1) * limitNum;
        const query = {};
        // Role-based visibility
        if (user.role === 'customer' || user.role === 'user') {
            query.$or = [{ userId: user._id }, { email: user.email.toLowerCase() }];
        }
        else if (user.role === 'owner') {
            const ownedHouses = await House_1.default.find({ ownerId: user._id }).select('_id');
            query.houseId = { $in: ownedHouses.map(h => h._id) };
        }
        else if (user.role === 'agent') {
            const managedHouses = await House_1.default.find({ agentId: user._id }).select('_id');
            query.houseId = { $in: managedHouses.map(h => h._id) };
        }
        // 'admin' and 'manager' see all applications
        // Status filter
        if (status && status !== '' && status !== 'ALL') {
            query.status = status;
        }
        // Specific house filter
        if (houseId && mongoose_1.default.Types.ObjectId.isValid(String(houseId))) {
            query.houseId = houseId;
        }
        // Search filter
        if (search && String(search).trim() !== '') {
            const searchRegex = new RegExp(String(search).trim(), 'i');
            const searchConditions = [
                { fullName: searchRegex },
                { email: searchRegex },
                { phone: searchRegex },
                { occupation: searchRegex }
            ];
            if (query.$or) {
                query.$and = [{ $or: query.$or }, { $or: searchConditions }];
                delete query.$or;
            }
            else {
                query.$or = searchConditions;
            }
        }
        const [totalApplications, applications] = await Promise.all([
            RentalApplication_1.default.countDocuments(query),
            RentalApplication_1.default.find(query)
                .populate('houseId', 'title location pricing images propertyType status ownerId agentId')
                .populate('userId', 'name email phone')
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limitNum)
        ]);
        const totalPages = Math.ceil(totalApplications / limitNum) || 1;
        return res.json({
            success: true,
            data: {
                applications: (0, houseRef_1.hydrateHouseRefs)(applications.map(a => a.toObject())),
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalApplications,
                    hasNext: pageNum < totalPages,
                    hasPrev: pageNum > 1
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching rental applications:', error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};
exports.getRentalApplications = getRentalApplications;
// ─── GET SINGLE RENTAL APPLICATION ────────────────────────────
const getRentalApplicationById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid application ID' });
        }
        const application = await RentalApplication_1.default.findById(id)
            .populate('houseId')
            .populate('userId', 'name email phone');
        if (!application) {
            return res.status(404).json({ success: false, message: 'Rental application not found' });
        }
        return res.json({ success: true, data: application });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};
exports.getRentalApplicationById = getRentalApplicationById;
// ─── UPDATE APPLICATION STATUS (Approve / Reject / Cancel) ────
const updateRentalApplicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid application ID' });
        }
        if (!Object.values(RentalApplication_1.ApplicationStatus).includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${Object.values(RentalApplication_1.ApplicationStatus).join(', ')}`
            });
        }
        const application = await RentalApplication_1.default.findById(id).populate('houseId');
        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }
        application.status = status;
        if (adminNotes !== undefined) {
            application.adminNotes = adminNotes;
        }
        await application.save();
        const house = application.houseId;
        // If approved, create or prepare a LeaseAgreement draft if applicant has a registered account
        if (status === RentalApplication_1.ApplicationStatus.APPROVED && application.userId && house) {
            try {
                const existingLease = await LeaseAgreement_1.default.findOne({
                    houseId: house._id,
                    tenantId: application.userId,
                    status: { $in: [LeaseAgreement_1.LeaseStatus.DRAFT, LeaseAgreement_1.LeaseStatus.ACTIVE, LeaseAgreement_1.LeaseStatus.PENDING_SIGNATURE] }
                });
                if (!existingLease) {
                    const startDate = application.preferredMoveInDate || new Date();
                    const endDate = new Date(startDate);
                    endDate.setFullYear(endDate.getFullYear() + 1);
                    const rentAmount = Number(house.pricing?.price) || Number(application.monthlyIncome) || 0;
                    const securityDeposit = rentAmount;
                    const schedule = [];
                    let cur = new Date(startDate);
                    let installment = 1;
                    while (cur < endDate && installment <= 12) {
                        schedule.push({
                            installmentNumber: installment,
                            dueDate: new Date(cur),
                            amount: rentAmount,
                            status: 'PENDING'
                        });
                        cur.setMonth(cur.getMonth() + 1);
                        installment++;
                    }
                    const agreementNumber = `LEASE-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
                    await LeaseAgreement_1.default.create({
                        agreementNumber,
                        houseId: house._id,
                        tenantId: application.userId,
                        tenantName: application.fullName,
                        tenantEmail: application.email,
                        tenantPhone: application.phone,
                        landlordId: house.ownerId || house.agentId,
                        agentId: house.agentId,
                        startDate,
                        endDate,
                        rentAmount,
                        billingFrequency: 'monthly',
                        securityDeposit,
                        securityDepositRefunded: false,
                        terms: 'Standard residential lease contract following approved rental application.',
                        signedByTenant: false,
                        signedByLandlord: true,
                        landlordSignedAt: new Date(),
                        status: LeaseAgreement_1.LeaseStatus.PENDING_SIGNATURE,
                        paymentSchedule: schedule
                    });
                }
            }
            catch (leaseErr) {
                console.warn('Note: Could not auto-generate lease draft for approved application:', leaseErr);
            }
        }
        // Send notification to applicant if registered
        if (application.userId) {
            try {
                const isApproved = status === RentalApplication_1.ApplicationStatus.APPROVED;
                await Notification_1.default.create({
                    userId: application.userId,
                    title: isApproved ? 'Rental Application Approved! 🎉' : `Rental Application ${status}`,
                    message: isApproved
                        ? `Great news! Your rental application for "${house?.title || 'the property'}" was approved. A lease agreement is ready for signature.`
                        : `Your application for "${house?.title || 'the property'}" has been updated to ${status}. ${adminNotes ? `Note: ${adminNotes}` : ''}`,
                    type: Notification_1.NotificationType.RENTAL_APPLICATION,
                    link: '/admin/customer',
                    metadata: {
                        applicationId: application._id,
                        status
                    }
                });
            }
            catch (notifErr) {
                console.warn('Failed to send status update notification:', notifErr);
            }
        }
        return res.json({
            success: true,
            data: application,
            message: `Rental application marked as ${status.toLowerCase()} successfully`
        });
    }
    catch (error) {
        console.error('Error updating rental application status:', error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};
exports.updateRentalApplicationStatus = updateRentalApplicationStatus;
// ─── DELETE RENTAL APPLICATION ────────────────────────────────
const deleteRentalApplication = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid application ID' });
        }
        const application = await RentalApplication_1.default.findByIdAndDelete(id);
        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }
        return res.json({ success: true, message: 'Application deleted successfully' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};
exports.deleteRentalApplication = deleteRentalApplication;
