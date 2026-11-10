import { Request, Response } from 'express';
import mongoose from 'mongoose';
import RentalApplication, { ApplicationStatus } from '../models/RentalApplication';
import House from '../models/House';
import User from '../models/User';
import Notification, { NotificationType } from '../models/Notification';
import LeaseAgreement, { LeaseStatus } from '../models/LeaseAgreement';
import { hydrateHouseRefs } from '../utils/houseRef';

// ─── SUBMIT RENTAL APPLICATION (Public / Authenticated) ────────
export const submitRentalApplication = async (req: Request, res: Response) => {
  try {
    const {
      houseId,
      fullName,
      email,
      phone,
      occupation,
      monthlyIncome,
      numberOfOccupants = 1,
      preferredMoveInDate,
      message = ''
    } = req.body;

    // Basic validation
    if (!houseId || !mongoose.Types.ObjectId.isValid(houseId)) {
      return res.status(400).json({ success: false, message: 'Valid Property ID is required' });
    }

    if (!fullName || !email || !phone || !occupation || monthlyIncome === undefined || !preferredMoveInDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email, phone, occupation, monthly income, and preferred move-in date'
      });
    }

    // Verify property exists
    const house = await House.findById(houseId);
    if (!house) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Identify user if logged in or matching email
    const currentUser = (req as any).user;
    let userId = currentUser?._id;

    if (!userId) {
      const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
      if (existingUser) {
        userId = existingUser._id;
      }
    }

    // Create application
    const application = await RentalApplication.create({
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
      status: ApplicationStatus.PENDING
    });

    // Notify Property Owner / Agent
    const recipientId = house.agentId || house.ownerId;
    if (recipientId) {
      try {
        await Notification.create({
          userId: recipientId,
          title: 'New Rental Lease Application',
          message: `${fullName} has applied for "${house.title}". Monthly income: $${monthlyIncome}.`,
          type: NotificationType.RENTAL_APPLICATION,
          link: '/admin/workflows',
          metadata: {
            applicationId: application._id,
            houseId: house._id
          }
        });
      } catch (notifErr) {
        console.warn('Failed to send manager notification for rental app:', notifErr);
      }
    }

    // Notify Applicant if an account exists
    if (userId) {
      try {
        await Notification.create({
          userId,
          title: 'Rental Application Submitted',
          message: `Your application to rent "${house.title}" has been received and is under review.`,
          type: NotificationType.RENTAL_APPLICATION,
          link: '/admin/customer',
          metadata: {
            applicationId: application._id,
            houseId: house._id
          }
        });
      } catch (notifErr) {
        console.warn('Failed to send applicant notification for rental app:', notifErr);
      }
    }

    return res.status(201).json({
      success: true,
      data: application,
      message: 'Rental application submitted successfully! Our team will review it shortly.'
    });
  } catch (error: any) {
    console.error('Error submitting rental application:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// ─── GET RENTAL APPLICATIONS (Role Filtered) ──────────────────
export const getRentalApplications = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { search, status, houseId, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const limitNum = Math.max(1, parseInt(String(limit)) || 10);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    // Role-based visibility
    if (user.role === 'customer' || user.role === 'user') {
      query.$or = [{ userId: user._id }, { email: user.email.toLowerCase() }];
    } else if (user.role === 'owner') {
      const ownedHouses = await House.find({ ownerId: user._id }).select('_id');
      query.houseId = { $in: ownedHouses.map(h => h._id) };
    } else if (user.role === 'agent') {
      const managedHouses = await House.find({ agentId: user._id }).select('_id');
      query.houseId = { $in: managedHouses.map(h => h._id) };
    }
    // 'admin' and 'manager' see all applications

    // Status filter
    if (status && status !== '' && status !== 'ALL') {
      query.status = status;
    }

    // Specific house filter
    if (houseId && mongoose.Types.ObjectId.isValid(String(houseId))) {
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
      } else {
        query.$or = searchConditions;
      }
    }

    const [totalApplications, applications] = await Promise.all([
      RentalApplication.countDocuments(query),
      RentalApplication.find(query)
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
        applications: hydrateHouseRefs(applications.map(a => a.toObject())),
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalApplications,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching rental applications:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// ─── GET SINGLE RENTAL APPLICATION ────────────────────────────
export const getRentalApplicationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid application ID' });
    }

    const application = await RentalApplication.findById(id)
      .populate('houseId')
      .populate('userId', 'name email phone');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Rental application not found' });
    }

    return res.json({ success: true, data: application });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// ─── UPDATE APPLICATION STATUS (Approve / Reject / Cancel) ────
export const updateRentalApplicationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid application ID' });
    }

    if (!Object.values(ApplicationStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${Object.values(ApplicationStatus).join(', ')}`
      });
    }

    const application = await RentalApplication.findById(id).populate('houseId');
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    application.status = status;
    if (adminNotes !== undefined) {
      application.adminNotes = adminNotes;
    }
    await application.save();

    const house = application.houseId as any;

    // If approved, create or prepare a LeaseAgreement draft if applicant has a registered account
    if (status === ApplicationStatus.APPROVED && application.userId && house) {
      try {
        const existingLease = await LeaseAgreement.findOne({
          houseId: house._id,
          tenantId: application.userId,
          status: { $in: [LeaseStatus.DRAFT, LeaseStatus.ACTIVE, LeaseStatus.PENDING_SIGNATURE] }
        });

        if (!existingLease) {
          const startDate = application.preferredMoveInDate || new Date();
          const endDate = new Date(startDate);
          endDate.setFullYear(endDate.getFullYear() + 1);

          const rentAmount = Number(house.pricing?.price) || Number(application.monthlyIncome) || 0;
          const securityDeposit = rentAmount;

          const schedule: any[] = [];
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

          await LeaseAgreement.create({
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
            status: LeaseStatus.PENDING_SIGNATURE,
            paymentSchedule: schedule
          });
        }
      } catch (leaseErr) {
        console.warn('Note: Could not auto-generate lease draft for approved application:', leaseErr);
      }
    }

    // Send notification to applicant if registered
    if (application.userId) {
      try {
        const isApproved = status === ApplicationStatus.APPROVED;
        await Notification.create({
          userId: application.userId,
          title: isApproved ? 'Rental Application Approved! 🎉' : `Rental Application ${status}`,
          message: isApproved
            ? `Great news! Your rental application for "${house?.title || 'the property'}" was approved. A lease agreement is ready for signature.`
            : `Your application for "${house?.title || 'the property'}" has been updated to ${status}. ${adminNotes ? `Note: ${adminNotes}` : ''}`,
          type: NotificationType.RENTAL_APPLICATION,
          link: '/admin/customer',
          metadata: {
            applicationId: application._id,
            status
          }
        });
      } catch (notifErr) {
        console.warn('Failed to send status update notification:', notifErr);
      }
    }

    return res.json({
      success: true,
      data: application,
      message: `Rental application marked as ${status.toLowerCase()} successfully`
    });
  } catch (error: any) {
    console.error('Error updating rental application status:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// ─── DELETE RENTAL APPLICATION ────────────────────────────────
export const deleteRentalApplication = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid application ID' });
    }

    const application = await RentalApplication.findByIdAndDelete(id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    return res.json({ success: true, message: 'Application deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
