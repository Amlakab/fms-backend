"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const workflowController_1 = require("../controllers/workflowController");
const rentalApplicationController_1 = require("../controllers/rentalApplicationController");
const auth_1 = require("../middleware/auth");
const roleCheck_1 = require("../middleware/roleCheck");
const router = express_1.default.Router();
// Rental Lease Applications
router.get('/applications', auth_1.authenticate, rentalApplicationController_1.getRentalApplications);
router.post('/applications', auth_1.optionalAuth, rentalApplicationController_1.submitRentalApplication);
router.get('/applications/:id', auth_1.authenticate, rentalApplicationController_1.getRentalApplicationById);
router.patch('/applications/:id/status', auth_1.authenticate, rentalApplicationController_1.updateRentalApplicationStatus);
router.delete('/applications/:id', auth_1.authenticate, (0, roleCheck_1.checkRole)(['admin', 'manager']), rentalApplicationController_1.deleteRentalApplication);
// Appointments
router.get('/appointments', auth_1.authenticate, workflowController_1.getAppointments);
router.post('/appointments', auth_1.authenticate, workflowController_1.createAppointment);
router.patch('/appointments/:id/status', auth_1.authenticate, workflowController_1.updateAppointmentStatus);
// Lease Agreements & Rental
router.get('/leases', auth_1.authenticate, workflowController_1.getLeaseAgreements);
router.post('/leases', auth_1.authenticate, (0, roleCheck_1.checkRole)(['admin', 'owner', 'agent']), workflowController_1.createLeaseAgreement);
router.patch('/leases/:id/sign', auth_1.authenticate, workflowController_1.signLeaseAgreement);
router.post('/leases/:id/payments', auth_1.authenticate, workflowController_1.recordLeasePayment);
router.post('/leases/:id/submit-payment', auth_1.authenticate, workflowController_1.submitLeasePayment);
router.post('/leases/:id/request-termination', auth_1.authenticate, workflowController_1.requestLeaseTermination);
router.post('/leases/:id/respond-termination', auth_1.authenticate, workflowController_1.respondLeaseTermination);
router.post('/leases/:id/cancel-termination', auth_1.authenticate, workflowController_1.cancelLeaseTermination);
// Purchase Offers & Sales
router.get('/offers', auth_1.authenticate, workflowController_1.getPurchaseOffers);
router.post('/offers', auth_1.authenticate, workflowController_1.submitPurchaseOffer);
router.patch('/offers/:id/negotiate', auth_1.authenticate, workflowController_1.negotiatePurchaseOffer);
router.patch('/offers/:id/status', auth_1.authenticate, workflowController_1.updatePurchaseOfferStatus);
router.patch('/offers/:id/progress', auth_1.authenticate, workflowController_1.updateOfferProductionProgress);
router.post('/offers/:id/confirm-taken', auth_1.authenticate, workflowController_1.confirmProductTaken);
router.post('/offers/:id/milestone', auth_1.authenticate, workflowController_1.recordOfferMilestone);
router.post('/offers/:id/submit-milestone-payment', auth_1.authenticate, workflowController_1.submitOfferMilestonePayment);
// Maintenance Requests
router.get('/maintenance', auth_1.authenticate, workflowController_1.getMaintenanceRequests);
router.post('/maintenance', auth_1.authenticate, workflowController_1.submitMaintenanceRequest);
router.patch('/maintenance/:id/status', auth_1.authenticate, workflowController_1.updateMaintenanceStatus);
// Notifications
router.get('/notifications', auth_1.authenticate, workflowController_1.getUserNotifications);
router.patch('/notifications/:id/read', auth_1.authenticate, workflowController_1.markNotificationRead);
router.patch('/notifications/read-all', auth_1.authenticate, workflowController_1.markAllNotificationsRead);
exports.default = router;
