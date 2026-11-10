import { Request, Response } from 'express';
import Review from '../models/Review';
import ListingReport from '../models/ListingReport';
import House, { HouseStatus } from '../models/House';
import AuditLog from '../models/AuditLog';
import Notification, { NotificationType } from '../models/Notification';
import LeaseAgreement from '../models/LeaseAgreement';
import { hydrateHouseRefs } from '../utils/houseRef';

// Get reviews for a house
export const getHouseReviews = async (req: Request, res: Response) => {
  try {
    const { houseId } = req.params;
    const reviews = await Review.find({ houseId, status: 'APPROVED' })
      .sort({ createdAt: -1 });

    // Aggregate rating breakdown
    const stats = await Review.aggregate([
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Post a review
export const addReview = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Login required to leave a review' });
    }

    const { houseId, rating, title, comment } = req.body;
    if (!houseId || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'House ID, rating, and comment are required' });
    }

    // Check if user is a verified past or present tenant/buyer
    const pastLease = await LeaseAgreement.findOne({
      houseId,
      tenantId: user._id
    });
    const isVerifiedResident = !!pastLease;

    const review = await Review.create({
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
    const agg = await Review.aggregate([
      { $match: { houseId: new (require('mongoose').Types.ObjectId)(houseId), status: 'APPROVED' } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    if (agg.length > 0) {
      await House.findByIdAndUpdate(houseId, {
        rating: Math.round(agg[0].avg * 10) / 10,
        numReviews: agg[0].count
      });
    }

    res.status(201).json({
      success: true,
      data: review,
      message: 'Review submitted successfully'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Moderate review
export const moderateReview = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { id } = req.params;
    const { status, adminNotes } = req.body; // 'APPROVED' | 'REJECTED'

    const review = await Review.findByIdAndUpdate(id, { status, adminNotes }, { new: true });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.json({ success: true, data: review, message: `Review status updated to ${status}` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Submit a listing report (flag suspicious listing)
export const submitReport = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { houseId, reason, description, evidenceUrl, reporterEmail } = req.body;

    if (!houseId || !reason || !description) {
      return res.status(400).json({ success: false, message: 'Missing required report fields' });
    }

    const report = await ListingReport.create({
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Get listing reports
export const getListingReports = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const reports = await ListingReport.find()
      .populate('houseId', 'title location.city pricing.price status isVerified')
      .populate('reporterId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: hydrateHouseRefs(reports.map(r => r.toObject())) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Update report status (e.g. suspend listing or dismiss)
export const updateReportStatus = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { id } = req.params;
    const { status, adminNotes, suspendListing } = req.body;

    const report = await ListingReport.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    report.status = status;
    report.adminNotes = adminNotes;
    report.reviewedBy = user._id;
    report.reviewedAt = new Date();
    await report.save();

    if (suspendListing && report.houseId) {
      await House.findByIdAndUpdate(report.houseId, {
        status: HouseStatus.UNAVAILABLE
      });

      await AuditLog.create({
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
