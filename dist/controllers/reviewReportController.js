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
exports.updateReportStatus = exports.getListingReports = exports.submitReport = exports.moderateReview = exports.addReview = exports.getHouseReviews = void 0;
const Review_1 = __importDefault(require("../models/Review"));
const ListingReport_1 = __importDefault(require("../models/ListingReport"));
const House_1 = __importStar(require("../models/House"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const LeaseAgreement_1 = __importDefault(require("../models/LeaseAgreement"));
const houseRef_1 = require("../utils/houseRef");
// Get reviews for a house
const getHouseReviews = async (req, res) => {
    try {
        const { houseId } = req.params;
        const reviews = await Review_1.default.find({ houseId, status: 'APPROVED' })
            .sort({ createdAt: -1 });
        // Aggregate rating breakdown
        const stats = await Review_1.default.aggregate([
            { $match: { houseId: new (require('mongoose').Types.ObjectId)(houseId), status: 'APPROVED' } },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 },
                    fiveStar: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
                    fourStar: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
                    threeStar: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
                    twoStar: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
                    oneStar: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
                }
            }
        ]);
        res.json({
            success: true,
            data: {
                reviews,
                stats: stats[0] || {
                    avgRating: 0,
                    totalReviews: 0,
                    fiveStar: 0,
                    fourStar: 0,
                    threeStar: 0,
                    twoStar: 0,
                    oneStar: 0
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getHouseReviews = getHouseReviews;
// Post a review
const addReview = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'Login required to leave a review' });
        }
        const { houseId, rating, title, comment } = req.body;
        if (!houseId || !rating || !comment) {
            return res.status(400).json({ success: false, message: 'House ID, rating, and comment are required' });
        }
        // Check if user is a verified past or present tenant/buyer
        const pastLease = await LeaseAgreement_1.default.findOne({
            houseId,
            tenantId: user._id
        });
        const isVerifiedResident = !!pastLease;
        const review = await Review_1.default.create({
            houseId,
            userId: user._id,
            userName: user.name,
            userRole: user.role,
            rating: Number(rating),
            title: title || '',
            comment,
            isVerifiedResident,
            status: 'APPROVED' // Auto-approved or moderation flag
        });
        // Recalculate average rating for the house
        const agg = await Review_1.default.aggregate([
            { $match: { houseId: new (require('mongoose').Types.ObjectId)(houseId), status: 'APPROVED' } },
            { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);
        if (agg.length > 0) {
            await House_1.default.findByIdAndUpdate(houseId, {
                rating: Math.round(agg[0].avg * 10) / 10,
                numReviews: agg[0].count
            });
        }
        res.status(201).json({
            success: true,
            data: review,
            message: 'Review submitted successfully'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.addReview = addReview;
// Admin: Moderate review
const moderateReview = async (req, res) => {
    try {
        const user = req.user;
        if (user?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const { id } = req.params;
        const { status, adminNotes } = req.body; // 'APPROVED' | 'REJECTED'
        const review = await Review_1.default.findByIdAndUpdate(id, { status, adminNotes }, { new: true });
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        res.json({ success: true, data: review, message: `Review status updated to ${status}` });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.moderateReview = moderateReview;
// Submit a listing report (flag suspicious listing)
const submitReport = async (req, res) => {
    try {
        const user = req.user;
        const { houseId, reason, description, evidenceUrl, reporterEmail } = req.body;
        if (!houseId || !reason || !description) {
            return res.status(400).json({ success: false, message: 'Missing required report fields' });
        }
        const report = await ListingReport_1.default.create({
            houseId,
            reporterId: user?._id || null,
            reporterEmail: user?.email || reporterEmail || 'anonymous',
            reason,
            description,
            evidenceUrl,
            status: 'PENDING'
        });
        res.status(201).json({
            success: true,
            data: report,
            message: 'Report received. Our moderation team will investigate promptly.'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.submitReport = submitReport;
// Admin: Get listing reports
const getListingReports = async (req, res) => {
    try {
        const user = req.user;
        if (user?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const reports = await ListingReport_1.default.find()
            .populate('houseId', 'title location.city pricing.price status isVerified')
            .populate('reporterId', 'name email phone')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: (0, houseRef_1.hydrateHouseRefs)(reports.map(r => r.toObject())) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getListingReports = getListingReports;
// Admin: Update report status (e.g. suspend listing or dismiss)
const updateReportStatus = async (req, res) => {
    try {
        const user = req.user;
        if (user?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const { id } = req.params;
        const { status, adminNotes, suspendListing } = req.body;
        const report = await ListingReport_1.default.findById(id);
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }
        report.status = status;
        report.adminNotes = adminNotes;
        report.reviewedBy = user._id;
        report.reviewedAt = new Date();
        await report.save();
        if (suspendListing && report.houseId) {
            await House_1.default.findByIdAndUpdate(report.houseId, {
                status: House_1.HouseStatus.UNAVAILABLE
            });
            await AuditLog_1.default.create({
                action: 'SUSPEND_LISTING_DUE_TO_REPORT',
                performedBy: user._id,
                userName: user.name,
                userRole: user.role,
                entityType: 'HOUSE',
                entityId: report.houseId.toString(),
                details: `Listing suspended due to violation report ID: ${id}. Reason: ${report.reason}`
            });
        }
        res.json({ success: true, data: report, message: 'Report updated successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateReportStatus = updateReportStatus;
