import express from 'express';
import {
  getAppointments,
  createAppointment,
  updateAppointmentStatus,
  getLeaseAgreements,
  createLeaseAgreement,
  signLeaseAgreement,
  recordLeasePayment,
  submitLeasePayment,
  requestLeaseTermination,
  respondLeaseTermination,
  cancelLeaseTermination,
  getPurchaseOffers,
  submitPurchaseOffer,
  negotiatePurchaseOffer,
  updatePurchaseOfferStatus,
  recordOfferMilestone,
  submitOfferMilestonePayment,
  updateOfferProductionProgress,
  confirmProductTaken,
  getMaintenanceRequests,
  submitMaintenanceRequest,
  updateMaintenanceStatus,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../controllers/workflowController';
import {
  submitRentalApplication,
  getRentalApplications,
  getRentalApplicationById,
  updateRentalApplicationStatus,
  deleteRentalApplication
} from '../controllers/rentalApplicationController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { checkRole } from '../middleware/roleCheck';

const router = express.Router();

// Rental Lease Applications
router.get('/applications', authenticate, getRentalApplications);
router.post('/applications', optionalAuth, submitRentalApplication);
router.get('/applications/:id', authenticate, getRentalApplicationById);
router.patch('/applications/:id/status', authenticate, updateRentalApplicationStatus);
router.delete('/applications/:id', authenticate, checkRole(['admin', 'manager']), deleteRentalApplication);

// Appointments
router.get('/appointments', authenticate, getAppointments);
router.post('/appointments', authenticate, createAppointment);
router.patch('/appointments/:id/status', authenticate, updateAppointmentStatus);

// Lease Agreements & Rental
router.get('/leases', authenticate, getLeaseAgreements);
router.post('/leases', authenticate, checkRole(['admin', 'owner', 'agent']), createLeaseAgreement);
router.patch('/leases/:id/sign', authenticate, signLeaseAgreement);
router.post('/leases/:id/payments', authenticate, recordLeasePayment);
router.post('/leases/:id/submit-payment', authenticate, submitLeasePayment);
router.post('/leases/:id/request-termination', authenticate, requestLeaseTermination);
router.post('/leases/:id/respond-termination', authenticate, respondLeaseTermination);
router.post('/leases/:id/cancel-termination', authenticate, cancelLeaseTermination);

// Purchase Offers & Sales
router.get('/offers', authenticate, getPurchaseOffers);
router.post('/offers', authenticate, submitPurchaseOffer);
router.patch('/offers/:id/negotiate', authenticate, negotiatePurchaseOffer);
router.patch('/offers/:id/status', authenticate, updatePurchaseOfferStatus);
router.patch('/offers/:id/progress', authenticate, updateOfferProductionProgress);
router.post('/offers/:id/confirm-taken', authenticate, confirmProductTaken);
router.post('/offers/:id/milestone', authenticate, recordOfferMilestone);
router.post('/offers/:id/submit-milestone-payment', authenticate, submitOfferMilestonePayment);

// Maintenance Requests
router.get('/maintenance', authenticate, getMaintenanceRequests);
router.post('/maintenance', authenticate, submitMaintenanceRequest);
router.patch('/maintenance/:id/status', authenticate, updateMaintenanceStatus);

// Notifications
router.get('/notifications', authenticate, getUserNotifications);
router.patch('/notifications/:id/read', authenticate, markNotificationRead);
router.patch('/notifications/read-all', authenticate, markAllNotificationsRead);

export default router;
