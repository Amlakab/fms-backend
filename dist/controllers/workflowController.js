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
exports.markAllNotificationsRead = exports.markNotificationRead = exports.getUserNotifications = exports.updateMaintenanceStatus = exports.submitMaintenanceRequest = exports.getMaintenanceRequests = exports.confirmProductTaken = exports.updateOfferProductionProgress = exports.recordOfferMilestone = exports.submitOfferMilestonePayment = exports.updatePurchaseOfferStatus = exports.negotiatePurchaseOffer = exports.submitPurchaseOffer = exports.getPurchaseOffers = exports.cancelLeaseTermination = exports.respondLeaseTermination = exports.requestLeaseTermination = exports.submitLeasePayment = exports.recordLeasePayment = exports.signLeaseAgreement = exports.createLeaseAgreement = exports.getLeaseAgreements = exports.updateAppointmentStatus = exports.createAppointment = exports.getAppointments = void 0;
const Appointment_1 = __importStar(require("../models/Appointment"));
const LeaseAgreement_1 = __importStar(require("../models/LeaseAgreement"));
const PurchaseOffer_1 = __importStar(require("../models/PurchaseOffer"));
const MaintenanceRequest_1 = __importDefault(require("../models/MaintenanceRequest"));
const Notification_1 = __importStar(require("../models/Notification"));
const House_1 = __importStar(require("../models/House"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const houseRef_1 = require("../utils/houseRef");
/**
 * Returns the list of house IDs the user can access.
 *  - null → no restriction (admin / manager)
 *  - []   → no houses (customer / unknown role)
 */
const getScopedHouseIds = async (user) => {
    if (user.role === 'admin' || user.role === 'manager')
        return null;
    if (user.role === 'agent') {
        const houses = await House_1.default.find({ agentId: user._id }).select('_id').lean();
        return houses.map((h) => h._id);
    }
    if (user.role === 'owner') {
        const houses = await House_1.default.find({ ownerId: user._id }).select('_id').lean();
        return houses.map((h) => h._id);
    }
    return [];
};
/** True if the user (owner/agent/admin) may act on this house. */
const canAccessHouse = async (user, houseId) => {
    const scoped = await getScopedHouseIds(user);
    if (scoped === null)
        return true;
    if (!houseId)
        return false;
    const id = houseId._id ?? houseId;
    return scoped.some((sid) => sid.toString() === id.toString());
};
const isAdmin = (user) => user.role === 'admin' || user.role === 'manager';
/** Notify both owner and agent on a house (when present). */
const notifyHouseParties = async (house, payload) => {
    const ids = [house.ownerId, house.agentId].filter(Boolean);
    if (ids.length === 0)
        return;
    await Notification_1.default.insertMany(ids.map((uid) => ({
        userId: uid,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        link: payload.link
    })));
};
// ─── APPOINTMENTS ─────────────────────────────────────────────
const getAppointments = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        let query = {};
        if (user.role === 'customer') {
            query.customerId = user._id;
        }
        else {
            const scoped = await getScopedHouseIds(user);
            if (scoped === null) {
                // admin/manager: no filter
            }
            else if (scoped.length === 0) {
                return res.json({ success: true, data: [] });
            }
            else {
                query.houseId = { $in: scoped };
            }
        }
        const appointments = await Appointment_1.default.find(query)
            .populate('houseId', 'title location.city location.address pricing.price images ownerId agentId')
            .populate('customerId', 'name email phone')
            .populate('hostId', 'name email phone')
            .sort({ visitDate: -1 });
        res.json({ success: true, data: (0, houseRef_1.hydrateHouseRefs)(appointments.map(a => a.toObject())) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAppointments = getAppointments;
const createAppointment = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const { houseId, visitDate, timeSlot, visitType, numberOfVisitors, notes } = req.body;
        const house = await House_1.default.findById(houseId);
        if (!house)
            return res.status(404).json({ success: false, message: 'Property not found' });
        const hostId = house.agentId || house.ownerId;
        const appointment = await Appointment_1.default.create({
            houseId,
            customerId: user._id,
            customerName: user.name,
            customerEmail: user.email,
            customerPhone: user.phone || '0900000000',
            hostId,
            visitDate: new Date(visitDate),
            timeSlot,
            visitType: visitType || 'IN_PERSON',
            numberOfVisitors: numberOfVisitors || 1,
            notes,
            status: Appointment_1.AppointmentStatus.REQUESTED
        });
        await notifyHouseParties(house, {
            title: 'New Visit Request Scheduled',
            message: `${user.name} requested a viewing for "${house.title}" on ${new Date(visitDate).toLocaleDateString()} (${timeSlot})`,
            type: Notification_1.NotificationType.APPOINTMENT,
            link: '/admin/dashboard'
        });
        res.status(201).json({ success: true, data: appointment, message: 'Viewing appointment requested' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createAppointment = createAppointment;
const updateAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rescheduledDate, rescheduledTimeSlot, rescheduledReason } = req.body;
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        if (!Object.values(Appointment_1.AppointmentStatus).includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid appointment status' });
        }
        const appointment = await Appointment_1.default.findById(id);
        if (!appointment)
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        const isCustomer = appointment.customerId.toString() === user._id.toString();
        const houseAllowed = await canAccessHouse(user, appointment.houseId);
        // owner/agent on the house → full control; customer → only CANCELLED
        if (!isAdmin(user) && !houseAllowed) {
            if (!(isCustomer && status === Appointment_1.AppointmentStatus.CANCELLED)) {
                return res.status(403).json({ success: false, message: 'Unauthorized to update this appointment' });
            }
        }
        appointment.status = status;
        if (rescheduledDate)
            appointment.rescheduledDate = new Date(rescheduledDate);
        if (rescheduledTimeSlot)
            appointment.rescheduledTimeSlot = rescheduledTimeSlot;
        if (rescheduledReason)
            appointment.rescheduledReason = rescheduledReason;
        await appointment.save();
        const recipientId = isCustomer ? appointment.hostId : appointment.customerId;
        await Notification_1.default.create({
            userId: recipientId,
            title: `Viewing Appointment: ${status}`,
            message: `Appointment status has been updated to ${status}.`,
            type: Notification_1.NotificationType.APPOINTMENT,
            link: isCustomer ? '/admin/dashboard' : '/customer'
        });
        res.json({ success: true, data: appointment, message: `Appointment ${status}` });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateAppointmentStatus = updateAppointmentStatus;
// ─── LEASE AGREEMENTS ─────────────────────────────────────────
const getLeaseAgreements = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        let query = {};
        if (user.role === 'customer') {
            query.tenantId = user._id;
        }
        else {
            const scoped = await getScopedHouseIds(user);
            if (scoped === null) {
                // admin/manager
            }
            else if (scoped.length === 0) {
                return res.json({ success: true, data: [] });
            }
            else {
                query.houseId = { $in: scoped };
            }
        }
        const leases = await LeaseAgreement_1.default.find(query)
            .populate('houseId', 'title location.city location.address pricing.price images ownerId agentId')
            .populate('tenantId', 'name email phone')
            .populate('landlordId', 'name email phone')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: (0, houseRef_1.hydrateHouseRefs)(leases.map(l => l.toObject())) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getLeaseAgreements = getLeaseAgreements;
const createLeaseAgreement = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const { houseId, tenantId, tenantName, tenantEmail, tenantPhone, startDate, endDate, rentAmount, billingFrequency, securityDeposit, terms } = req.body;
        const house = await House_1.default.findById(houseId);
        if (!house)
            return res.status(404).json({ success: false, message: 'Property not found' });
        if (!isAdmin(user) && !(await canAccessHouse(user, houseId))) {
            return res.status(403).json({ success: false, message: 'Unauthorized to create lease for this property' });
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        const schedule = [];
        const cur = new Date(start);
        let installment = 1;
        while (cur < end && installment <= 24) {
            schedule.push({
                installmentNumber: installment,
                dueDate: new Date(cur),
                amount: Number(rentAmount),
                status: 'PENDING'
            });
            cur.setMonth(cur.getMonth() + 1);
            installment++;
        }
        const agreementNumber = `LEASE-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
        const lease = await LeaseAgreement_1.default.create({
            agreementNumber,
            houseId,
            tenantId,
            tenantName,
            tenantEmail,
            tenantPhone,
            landlordId: house.ownerId,
            agentId: house.agentId,
            startDate: start,
            endDate: end,
            rentAmount: Number(rentAmount),
            billingFrequency: billingFrequency || 'monthly',
            securityDeposit: Number(securityDeposit || 0),
            terms: terms || 'Standard residential tenancy contract.',
            signedByLandlord: true,
            landlordSignedAt: new Date(),
            status: LeaseAgreement_1.LeaseStatus.PENDING_SIGNATURE,
            paymentSchedule: schedule,
            moveInInspection: [
                { item: 'Main Doors and Key Locks', condition: 'good' },
                { item: 'Lighting and Electrical Fixtures', condition: 'good' },
                { item: 'Bathroom Plumbing & Water Pressure', condition: 'good' },
                { item: 'Kitchen Cabinets & Sink', condition: 'good' },
                { item: 'Wall Paint and Cleanliness', condition: 'good' }
            ]
        });
        await Notification_1.default.create({
            userId: tenantId,
            title: 'Digital Lease Agreement Ready for Review',
            message: `Your rental lease agreement for "${house.title}" has been generated. Please review and sign.`,
            type: Notification_1.NotificationType.LEASE_UPDATE,
            link: '/customer'
        });
        res.status(201).json({ success: true, data: lease, message: 'Lease agreement generated successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createLeaseAgreement = createLeaseAgreement;
const signLeaseAgreement = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const lease = await LeaseAgreement_1.default.findById(id);
        if (!lease)
            return res.status(404).json({ success: false, message: 'Lease agreement not found' });
        if (lease.tenantId.toString() !== user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Only the tenant can sign this lease' });
        }
        if (lease.signedByTenant) {
            return res.status(400).json({ success: false, message: 'Lease already signed by tenant' });
        }
        lease.signedByTenant = true;
        lease.tenantSignedAt = new Date();
        lease.status = LeaseAgreement_1.LeaseStatus.ACTIVE;
        await lease.save();
        await House_1.default.findByIdAndUpdate(lease.houseId, { status: House_1.HouseStatus.RENTED });
        res.json({ success: true, data: lease, message: 'Lease agreement signed and activated!' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.signLeaseAgreement = signLeaseAgreement;
const recordLeasePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { installmentNumber, amount, method, reference } = req.body;
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const lease = await LeaseAgreement_1.default.findById(id);
        if (!lease)
            return res.status(404).json({ success: false, message: 'Lease not found' });
        const isTenant = lease.tenantId.toString() === user._id.toString();
        const houseAllowed = await canAccessHouse(user, lease.houseId);
        if (!isAdmin(user) && !isTenant && !houseAllowed) {
            return res.status(403).json({ success: false, message: 'Unauthorized to record payment on this lease' });
        }
        const payment = lease.paymentSchedule.find(p => p.installmentNumber === Number(installmentNumber));
        if (!payment)
            return res.status(404).json({ success: false, message: 'Installment not found' });
        if (payment.status === 'PAID') {
            return res.status(400).json({ success: false, message: 'Installment already paid' });
        }
        payment.status = 'PAID';
        payment.paidAmount = Number(amount);
        payment.paidDate = new Date();
        payment.transactionReference = reference || `TX-${Date.now()}`;
        payment.receiptNumber = payment.receiptNumber || `RCP-${Date.now().toString().slice(-7)}`;
        await lease.save();
        // Check if there is an existing pending transaction for this lease installment
        const existingTx = await Transaction_1.default.findOne({
            'metadata.leaseId': lease._id,
            'metadata.installmentNumber': Number(installmentNumber),
            status: 'pending'
        });
        if (existingTx) {
            existingTx.status = 'completed';
            existingTx.completedBy = user.role || 'Admin';
            existingTx.completedAt = new Date();
            if (reference)
                existingTx.transactionId = reference;
            await existingTx.save();
        }
        else {
            await Transaction_1.default.create({
                userId: lease.tenantId,
                houseId: lease.houseId,
                class: 'rent',
                type: 'property_purchase',
                amount: Number(amount),
                status: 'completed',
                reference: payment.receiptNumber,
                description: `Rent payment for Lease #${lease.agreementNumber} (Installment ${installmentNumber})`,
                method: method || 'cbe',
                metadata: {
                    leaseId: lease._id,
                    installmentNumber: Number(installmentNumber),
                    agreementNumber: lease.agreementNumber
                }
            });
        }
        res.json({ success: true, data: payment, message: 'Rent payment recorded and official receipt issued' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.recordLeasePayment = recordLeasePayment;
const submitLeasePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { installmentNumber, method, transactionId, senderPhone, bankName, accountNumber, accountHolderName } = req.body;
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        if (!transactionId || !String(transactionId).trim()) {
            return res.status(400).json({ success: false, message: 'Transaction ID is required' });
        }
        const lease = await LeaseAgreement_1.default.findById(id).populate('houseId');
        if (!lease)
            return res.status(404).json({ success: false, message: 'Lease agreement not found' });
        const isTenant = lease.tenantId.toString() === user._id.toString();
        const houseAllowed = await canAccessHouse(user, lease.houseId);
        if (!isAdmin(user) && !isTenant && !houseAllowed) {
            return res.status(403).json({ success: false, message: 'Unauthorized to submit payment on this lease' });
        }
        const payment = lease.paymentSchedule.find(p => p.installmentNumber === Number(installmentNumber));
        if (!payment)
            return res.status(404).json({ success: false, message: 'Installment not found' });
        if (payment.status === 'PAID') {
            return res.status(400).json({ success: false, message: 'Installment is already paid' });
        }
        // Change installment status to UNDER_REVIEW
        payment.status = 'UNDER_REVIEW';
        payment.transactionReference = String(transactionId).trim();
        await lease.save();
        const house = lease.houseId;
        const reference = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        // Create pending Transaction for owner/agent review
        const transaction = await Transaction_1.default.create({
            userId: user._id,
            houseId: house?._id || lease.houseId,
            class: 'rent',
            type: 'property_purchase',
            amount: payment.amount,
            status: 'pending',
            availability: 'active',
            reference: reference,
            transactionId: String(transactionId).trim(),
            description: `Rent payment for Lease #${lease.agreementNumber} (Installment #${installmentNumber}) - ${bankName || method || 'Bank Transfer'}`,
            method: (method === 'telebirr' || method === 'cbe' || method === 'cash') ? method : 'cbe',
            senderPhone: senderPhone || user.phone || lease.tenantPhone,
            senderName: user.name || lease.tenantName,
            receiverPhone: accountNumber || '',
            receiverName: accountHolderName || '',
            metadata: {
                leaseId: lease._id,
                installmentNumber: Number(installmentNumber),
                bankName,
                accountNumber,
                accountHolderName,
                agreementNumber: lease.agreementNumber,
                houseTitle: house?.title || ''
            }
        });
        // Notify owner and agent about the new payment under review
        await notifyHouseParties(house || { ownerId: lease.landlordId, agentId: lease.agentId }, {
            title: 'Rent Payment Submitted for Approval',
            message: `${user.name || lease.tenantName} submitted ETB ${payment.amount.toLocaleString()} for Lease #${lease.agreementNumber} (Installment #${installmentNumber}). Transaction ID: ${transactionId}. Awaiting review.`,
            type: Notification_1.NotificationType.LEASE_UPDATE,
            link: '/admin/transactions/approve'
        });
        res.json({
            success: true,
            data: {
                payment,
                transaction
            },
            message: 'Rent payment submitted successfully! Status changed to Under Review.'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.submitLeasePayment = submitLeasePayment;
const requestLeaseTermination = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, effectiveDate, immediate } = req.body;
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        if (!reason || !String(reason).trim()) {
            return res.status(400).json({ success: false, message: 'Termination reason is required' });
        }
        const lease = await LeaseAgreement_1.default.findById(id).populate('houseId');
        if (!lease)
            return res.status(404).json({ success: false, message: 'Lease agreement not found' });
        const isTenant = lease.tenantId.toString() === user._id.toString();
        const houseAllowed = await canAccessHouse(user, lease.houseId);
        const isLandlordOrAgent = houseAllowed || lease.landlordId.toString() === user._id.toString() || (lease.agentId && lease.agentId.toString() === user._id.toString());
        if (!isAdmin(user) && !isTenant && !isLandlordOrAgent) {
            return res.status(403).json({ success: false, message: 'Unauthorized to request termination for this lease' });
        }
        const requestedByRole = isTenant ? 'tenant' : (user.role === 'owner' ? 'landlord' : (user.role === 'agent' ? 'agent' : 'admin'));
        const house = lease.houseId;
        // Check if immediate termination was requested by landlord/agent/admin
        if (immediate && (isLandlordOrAgent || isAdmin(user))) {
            lease.status = LeaseAgreement_1.LeaseStatus.TERMINATED;
            lease.moveOutDate = effectiveDate ? new Date(effectiveDate) : new Date();
            lease.terminatedAt = new Date();
            lease.terminatedBy = user._id;
            lease.terminationReason = String(reason).trim();
            lease.terminationRequest = {
                requestedBy: user._id,
                requestedByRole,
                requestDate: new Date(),
                effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
                reason: String(reason).trim(),
                status: 'APPROVED',
                respondedAt: new Date(),
                respondedBy: user._id,
                responseNotes: 'Immediate termination finalized.'
            };
            await lease.save();
            // IMPORTANT: House comes back to AVAILABLE for other rent
            await House_1.default.findByIdAndUpdate(lease.houseId, { status: House_1.HouseStatus.AVAILABLE });
            // Notify tenant
            await Notification_1.default.create({
                userId: lease.tenantId,
                title: 'Lease Agreement Terminated',
                message: `Your lease agreement #${lease.agreementNumber} for "${house?.title || 'Property'}" has been terminated. Reason: ${reason}. Property is now available for other rent.`,
                type: Notification_1.NotificationType.LEASE_UPDATE,
                link: '/admin/customer'
            });
            return res.json({
                success: true,
                data: lease,
                message: 'Lease agreement has been stopped immediately. Property is now available for other rent.'
            });
        }
        // Standard notice termination request
        lease.status = LeaseAgreement_1.LeaseStatus.TERMINATION_REQUESTED;
        lease.terminationRequest = {
            requestedBy: user._id,
            requestedByRole,
            requestDate: new Date(),
            effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
            reason: String(reason).trim(),
            status: 'PENDING'
        };
        await lease.save();
        // Notify the other party
        if (isTenant) {
            await notifyHouseParties(house || { ownerId: lease.landlordId, agentId: lease.agentId }, {
                title: 'Tenant Requested Lease Termination',
                message: `${lease.tenantName} submitted a stop request for Lease #${lease.agreementNumber}. Reason: ${reason}. Please review and approve/reject.`,
                type: Notification_1.NotificationType.LEASE_UPDATE,
                link: '/admin/workflows'
            });
        }
        else {
            await Notification_1.default.create({
                userId: lease.tenantId,
                title: 'Notice: Lease Termination Requested',
                message: `A stop request for Lease #${lease.agreementNumber} was initiated by the landlord/agent. Reason: ${reason}. Please review details.`,
                type: Notification_1.NotificationType.LEASE_UPDATE,
                link: '/admin/customer'
            });
        }
        res.json({
            success: true,
            data: lease,
            message: 'Lease termination request submitted successfully. Awaiting counterparty response.'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.requestLeaseTermination = requestLeaseTermination;
const respondLeaseTermination = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, notes } = req.body; // action: 'APPROVE' | 'REJECT'
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        if (!['APPROVE', 'REJECT'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Action must be APPROVE or REJECT' });
        }
        const lease = await LeaseAgreement_1.default.findById(id).populate('houseId');
        if (!lease)
            return res.status(404).json({ success: false, message: 'Lease agreement not found' });
        if (!lease.terminationRequest || lease.terminationRequest.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'No pending termination request found on this lease' });
        }
        const isTenant = lease.tenantId.toString() === user._id.toString();
        const houseAllowed = await canAccessHouse(user, lease.houseId);
        const isLandlordOrAgent = houseAllowed || lease.landlordId.toString() === user._id.toString() || (lease.agentId && lease.agentId.toString() === user._id.toString());
        const reqRole = lease.terminationRequest.requestedByRole;
        if (reqRole === 'tenant') {
            if (!isLandlordOrAgent && !isAdmin(user)) {
                return res.status(403).json({ success: false, message: 'Only landlord, agent or admin can respond to tenant termination request' });
            }
        }
        else {
            if (!isTenant && !isAdmin(user) && !isLandlordOrAgent) {
                return res.status(403).json({ success: false, message: 'Unauthorized to respond to this termination request' });
            }
        }
        const house = lease.houseId;
        if (action === 'APPROVE') {
            lease.status = LeaseAgreement_1.LeaseStatus.TERMINATED;
            lease.terminationRequest.status = 'APPROVED';
            lease.terminationRequest.responseNotes = notes;
            lease.terminationRequest.respondedAt = new Date();
            lease.terminationRequest.respondedBy = user._id;
            lease.moveOutDate = lease.terminationRequest.effectiveDate || new Date();
            lease.terminatedAt = new Date();
            lease.terminatedBy = user._id;
            lease.terminationReason = lease.terminationRequest.reason;
            await lease.save();
            // IMPORTANT: Property status updated to AVAILABLE for other rent
            await House_1.default.findByIdAndUpdate(lease.houseId, { status: House_1.HouseStatus.AVAILABLE });
            // Notify the requester
            const recipientId = lease.terminationRequest.requestedBy;
            await Notification_1.default.create({
                userId: recipientId,
                title: 'Lease Termination Approved',
                message: `The lease termination request for Lease #${lease.agreementNumber} has been approved. The property is now released and available for rent.`,
                type: Notification_1.NotificationType.LEASE_UPDATE,
                link: isTenant ? '/admin/workflows' : '/admin/customer'
            });
            return res.json({
                success: true,
                data: lease,
                message: 'Lease agreement stopped and terminated! House is now available for other rent.'
            });
        }
        else {
            // REJECT
            lease.status = LeaseAgreement_1.LeaseStatus.ACTIVE;
            lease.terminationRequest.status = 'REJECTED';
            lease.terminationRequest.responseNotes = notes;
            lease.terminationRequest.respondedAt = new Date();
            lease.terminationRequest.respondedBy = user._id;
            await lease.save();
            // Notify the requester
            const recipientId = lease.terminationRequest.requestedBy;
            await Notification_1.default.create({
                userId: recipientId,
                title: 'Lease Termination Request Rejected',
                message: `The termination request for Lease #${lease.agreementNumber} was declined. Reason/Notes: ${notes || 'Terms must be fulfilled'}. Lease remains active.`,
                type: Notification_1.NotificationType.LEASE_UPDATE,
                link: isTenant ? '/admin/workflows' : '/admin/customer'
            });
            return res.json({
                success: true,
                data: lease,
                message: 'Lease termination request was rejected. The lease agreement remains active.'
            });
        }
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.respondLeaseTermination = respondLeaseTermination;
const cancelLeaseTermination = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const lease = await LeaseAgreement_1.default.findById(id);
        if (!lease)
            return res.status(404).json({ success: false, message: 'Lease not found' });
        if (!lease.terminationRequest || lease.terminationRequest.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'No pending termination request to cancel' });
        }
        const isRequester = lease.terminationRequest.requestedBy.toString() === user._id.toString();
        if (!isRequester && !isAdmin(user)) {
            return res.status(403).json({ success: false, message: 'Only the user who requested termination or an admin can cancel it' });
        }
        lease.status = LeaseAgreement_1.LeaseStatus.ACTIVE;
        lease.terminationRequest.status = 'CANCELLED';
        await lease.save();
        res.json({
            success: true,
            data: lease,
            message: 'Lease termination request has been cancelled. Lease remains active.'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.cancelLeaseTermination = cancelLeaseTermination;
// ─── PURCHASE OFFERS ──────────────────────────────────────────
const getPurchaseOffers = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        let query = {};
        if (user.role === 'customer') {
            query.buyerId = user._id;
        }
        else {
            const scoped = await getScopedHouseIds(user);
            if (scoped === null) {
                // admin/manager
            }
            else if (scoped.length === 0) {
                return res.json({ success: true, data: [] });
            }
            else {
                query.houseId = { $in: scoped };
            }
        }
        const offers = await PurchaseOffer_1.default.find(query)
            .populate('houseId', 'title location.city location.address pricing.price images status ownerId agentId')
            .populate('buyerId', 'name email phone')
            .populate('sellerId', 'name email phone')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: (0, houseRef_1.hydrateHouseRefs)(offers.map(o => o.toObject())) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getPurchaseOffers = getPurchaseOffers;
const submitPurchaseOffer = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const { houseId, offerAmount, earnestDepositAmount, proposedClosingDate, financingType, contingencies, message, paymentPlan = 'PARTIAL', quantity = 1, productDetails } = req.body;
        const house = await House_1.default.findById(houseId);
        if (!house)
            return res.status(404).json({ success: false, message: 'Product not found' });
        const totalAmt = Number(offerAmount) > 0 ? Number(offerAmount) : (house.pricing.price * Number(quantity || 1));
        const qty = Number(quantity) || 1;
        const plan = (paymentPlan === 'FULL' || paymentPlan === 'PARTIAL') ? paymentPlan : 'PARTIAL';
        let advanceAmt = 0;
        let finalAmt = 0;
        let milestones = [];
        if (plan === 'FULL') {
            advanceAmt = totalAmt;
            finalAmt = 0;
            milestones = [
                {
                    title: 'Full Payment (100%)',
                    amount: totalAmt,
                    percentage: 100,
                    dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
                    status: 'PENDING'
                }
            ];
        }
        else {
            // Partial Payment: 25% advance + 75% on product completion & handover
            advanceAmt = Math.round(totalAmt * 0.25);
            finalAmt = totalAmt - advanceAmt;
            milestones = [
                {
                    title: 'Initial Advance Payment (25%)',
                    amount: advanceAmt,
                    percentage: 25,
                    dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
                    status: 'PENDING'
                },
                {
                    title: 'Final Settlement upon Product Completion & Handover (75%)',
                    amount: finalAmt,
                    percentage: 75,
                    dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
                    status: 'PENDING'
                }
            ];
        }
        const offer = await PurchaseOffer_1.default.create({
            houseId,
            buyerId: user._id,
            buyerName: user.name,
            buyerEmail: user.email,
            buyerPhone: user.phone || '0900000000',
            sellerId: house.ownerId || house.agentId,
            agentId: house.agentId,
            initialOfferAmount: totalAmt,
            currentOfferAmount: totalAmt,
            askingPriceAtOffer: house.pricing.price * qty,
            earnestDepositAmount: Number(earnestDepositAmount || advanceAmt),
            paymentPlan: plan,
            advancePercentage: plan === 'FULL' ? 100 : 25,
            advanceAmount: advanceAmt,
            finalAmount: finalAmt,
            productionProgress: 0,
            productionStage: 'ORDER_PLACED',
            productionNotes: 'Order received. Awaiting price negotiation confirmation and initial advance payment.',
            quantity: qty,
            productDetails: productDetails || {
                title: house.title,
                sku: house.productAttributes?.sku,
                unit: house.productAttributes?.unit || 'Piece',
                pricePerUnit: house.pricing.price
            },
            proposedClosingDate: proposedClosingDate ? new Date(proposedClosingDate) : undefined,
            financingType: financingType || 'CASH',
            status: PurchaseOffer_1.OfferStatus.OFFER_SUBMITTED,
            contingencies: contingencies || ['Quality Specification Verification', 'MAT Engineering Handover Protocol'],
            negotiationTimeline: [{
                    senderId: user._id,
                    senderRole: 'buyer',
                    proposedAmount: totalAmt,
                    message: message || `Order request submitted for ${qty} unit(s) under ${plan === 'FULL' ? '100% Full Payment' : '25% Partial Payment Plan'}.`,
                    timestamp: new Date()
                }],
            milestones
        });
        await notifyHouseParties(house, {
            title: 'New Product Order & Negotiation Request!',
            message: `${user.name} submitted an order of ETB ${totalAmt.toLocaleString()} (${plan} payment) for "${house.title}"`,
            type: Notification_1.NotificationType.OFFER_UPDATE,
            link: '/admin/workflows'
        });
        res.status(201).json({ success: true, data: offer, message: 'Product order registered successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.submitPurchaseOffer = submitPurchaseOffer;
const negotiatePurchaseOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const { proposedAmount, message, paymentPlan } = req.body;
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const offer = await PurchaseOffer_1.default.findById(id);
        if (!offer)
            return res.status(404).json({ success: false, message: 'Offer not found' });
        const buyerMatch = offer.buyerId.toString() === user._id.toString();
        const houseAllowed = await canAccessHouse(user, offer.houseId);
        if (!isAdmin(user) && !buyerMatch && !houseAllowed) {
            return res.status(403).json({ success: false, message: 'Unauthorized to negotiate this order' });
        }
        const role = buyerMatch ? 'buyer' : 'seller';
        const totalAmt = Number(proposedAmount);
        if (paymentPlan && (paymentPlan === 'FULL' || paymentPlan === 'PARTIAL')) {
            offer.paymentPlan = paymentPlan;
        }
        offer.currentOfferAmount = totalAmt;
        offer.status = PurchaseOffer_1.OfferStatus.UNDER_NEGOTIATION;
        offer.negotiationTimeline.push({
            senderId: user._id,
            senderRole: role,
            proposedAmount: totalAmt,
            message: message || `Counter-offer: ETB ${totalAmt.toLocaleString()}`,
            timestamp: new Date()
        });
        if (offer.paymentPlan === 'FULL') {
            offer.advancePercentage = 100;
            offer.advanceAmount = totalAmt;
            offer.finalAmount = 0;
            offer.milestones = [
                {
                    title: 'Full Payment (100%)',
                    amount: totalAmt,
                    percentage: 100,
                    dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
                    status: 'PENDING'
                }
            ];
        }
        else {
            const adv = Math.round(totalAmt * 0.25);
            const fin = totalAmt - adv;
            offer.advancePercentage = 25;
            offer.advanceAmount = adv;
            offer.finalAmount = fin;
            offer.milestones = [
                {
                    title: 'Initial Advance Payment (25%)',
                    amount: adv,
                    percentage: 25,
                    dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
                    status: 'PENDING'
                },
                {
                    title: 'Final Settlement upon Product Completion & Handover (75%)',
                    amount: fin,
                    percentage: 75,
                    dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
                    status: 'PENDING'
                }
            ];
        }
        await offer.save();
        const recipientId = role === 'buyer' ? offer.sellerId : offer.buyerId;
        if (recipientId) {
            await Notification_1.default.create({
                userId: recipientId,
                title: 'Price Negotiation Update',
                message: `${user.name} proposed ETB ${totalAmt.toLocaleString()} for the product order`,
                type: Notification_1.NotificationType.OFFER_UPDATE,
                link: role === 'buyer' ? '/admin/workflows' : '/admin/customer'
            });
        }
        res.json({ success: true, data: offer, message: 'Negotiation offer updated successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.negotiatePurchaseOffer = negotiatePurchaseOffer;
const updatePurchaseOfferStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, paymentPlan } = req.body;
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        if (!Object.values(PurchaseOffer_1.OfferStatus).includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid order status' });
        }
        const offer = await PurchaseOffer_1.default.findById(id);
        if (!offer)
            return res.status(404).json({ success: false, message: 'Order not found' });
        const buyerMatch = offer.buyerId.toString() === user._id.toString();
        const houseAllowed = await canAccessHouse(user, offer.houseId);
        // Allow buyer to accept seller's counter-offer or agree on price
        if (!isAdmin(user) && !houseAllowed && (!buyerMatch || (status !== PurchaseOffer_1.OfferStatus.OFFER_ACCEPTED && status !== PurchaseOffer_1.OfferStatus.PRICE_AGREED && status !== PurchaseOffer_1.OfferStatus.CANCELLED))) {
            return res.status(403).json({ success: false, message: 'Unauthorized to update this order' });
        }
        offer.status = status;
        if (paymentPlan && (paymentPlan === 'FULL' || paymentPlan === 'PARTIAL')) {
            offer.paymentPlan = paymentPlan;
        }
        const amt = offer.currentOfferAmount || offer.initialOfferAmount;
        if (status === PurchaseOffer_1.OfferStatus.OFFER_ACCEPTED || status === PurchaseOffer_1.OfferStatus.PRICE_AGREED) {
            await House_1.default.findByIdAndUpdate(offer.houseId, { status: House_1.HouseStatus.UNDER_OFFER });
            // Generate or update 25%/75% or 100% payment milestones
            if (offer.paymentPlan === 'FULL') {
                offer.advancePercentage = 100;
                offer.advanceAmount = amt;
                offer.finalAmount = 0;
                offer.milestones = [
                    {
                        title: 'Full Payment (100%)',
                        amount: amt,
                        percentage: 100,
                        dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
                        status: 'PENDING'
                    }
                ];
            }
            else {
                const adv = Math.round(amt * 0.25);
                const fin = amt - adv;
                offer.advancePercentage = 25;
                offer.advanceAmount = adv;
                offer.finalAmount = fin;
                offer.milestones = [
                    {
                        title: 'Initial Advance Payment (25%)',
                        amount: adv,
                        percentage: 25,
                        dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
                        status: 'PENDING'
                    },
                    {
                        title: 'Final Settlement upon Product Completion & Handover (75%)',
                        amount: fin,
                        percentage: 75,
                        dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
                        status: 'PENDING'
                    }
                ];
            }
            offer.productionStage = 'MATERIALS_PREPARATION';
            offer.productionNotes = `Price agreed at ETB ${amt.toLocaleString()}. Customer may now proceed with the ${offer.paymentPlan === 'FULL' ? '100% Full Payment' : '25% Advance Payment'}.`;
        }
        else if (status === PurchaseOffer_1.OfferStatus.COMPLETED_SALE || status === PurchaseOffer_1.OfferStatus.PRODUCT_TAKEN) {
            offer.completedAt = new Date();
            offer.productTakenAt = new Date();
            offer.productionProgress = 100;
            offer.productionStage = 'TAKEN_BY_CUSTOMER';
            await House_1.default.findByIdAndUpdate(offer.houseId, { status: House_1.HouseStatus.SOLD });
        }
        await offer.save();
        await Notification_1.default.create({
            userId: offer.buyerId,
            title: `Order Status: ${status}`,
            message: `Your MAT Engineering order status is now ${status}`,
            type: Notification_1.NotificationType.OFFER_UPDATE,
            link: '/admin/customer'
        });
        res.json({ success: true, data: offer, message: `Order status updated to ${status}` });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updatePurchaseOfferStatus = updatePurchaseOfferStatus;
const submitOfferMilestonePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { milestoneId, method, transactionId, senderPhone, bankName, accountNumber, accountHolderName, description } = req.body;
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        if (!transactionId || !String(transactionId).trim()) {
            return res.status(400).json({ success: false, message: 'Transaction ID is required' });
        }
        const offer = await PurchaseOffer_1.default.findById(id).populate('houseId');
        if (!offer)
            return res.status(404).json({ success: false, message: 'Product order not found' });
        const isBuyer = offer.buyerId.toString() === user._id.toString();
        if (!isAdmin(user) && !isBuyer) {
            return res.status(403).json({ success: false, message: 'Only the customer can submit payment for this order' });
        }
        const milestone = offer.milestones.find((m) => m._id?.toString() === milestoneId || m.id === milestoneId);
        if (!milestone)
            return res.status(404).json({ success: false, message: 'Payment milestone not found' });
        if (milestone.status === 'PAID' || milestone.status === 'VERIFIED') {
            return res.status(400).json({ success: false, message: 'This milestone is already paid' });
        }
        // Set milestone status to UNDER_REVIEW
        milestone.status = 'UNDER_REVIEW';
        milestone.transactionReference = String(transactionId).trim();
        milestone.method = method || 'cbe';
        await offer.save();
        const house = offer.houseId;
        const reference = `TXN-MAT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        // Create pending Transaction for financial accounting and sales staff/owner verification
        const transaction = await Transaction_1.default.create({
            userId: user._id,
            houseId: house?._id || offer.houseId,
            class: 'product_purchase',
            type: 'product_purchase',
            amount: milestone.amount,
            status: 'pending',
            availability: 'active',
            reference,
            transactionId: String(transactionId).trim(),
            description: description || `MAT Engineering & Trading Payment: ${milestone.title} for ${house?.title || 'Product'}`,
            method: (method === 'telebirr' || method === 'cbe' || method === 'cash') ? method : 'cbe',
            senderPhone: senderPhone || user.phone || offer.buyerPhone,
            senderName: user.name || offer.buyerName,
            receiverPhone: accountNumber || '',
            receiverName: accountHolderName || '',
            metadata: {
                offerId: offer._id,
                milestoneId: milestone._id || milestone.id,
                milestoneTitle: milestone.title,
                percentage: milestone.percentage,
                bankName,
                accountNumber,
                accountHolderName,
                houseTitle: house?.title || '',
                buyerName: user.name || offer.buyerName
            }
        });
        // Notify sales staff and owner
        await notifyHouseParties(house || { ownerId: offer.sellerId, agentId: offer.agentId }, {
            title: 'MAT Engineering Order Payment Awaiting Review',
            message: `${user.name || offer.buyerName} submitted ETB ${milestone.amount.toLocaleString()} for "${milestone.title}". Transaction Reference: ${transactionId}. Awaiting verification.`,
            type: Notification_1.NotificationType.OFFER_UPDATE,
            link: '/admin/transactions/approve'
        });
        res.json({
            success: true,
            data: {
                milestone,
                transaction
            },
            message: 'Payment submitted successfully! Status changed to Under Review.'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.submitOfferMilestonePayment = submitOfferMilestonePayment;
const recordOfferMilestone = async (req, res) => {
    try {
        const { id } = req.params;
        const { milestoneId, reference, amount, method } = req.body;
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const offer = await PurchaseOffer_1.default.findById(id).populate('houseId');
        if (!offer)
            return res.status(404).json({ success: false, message: 'Order not found' });
        const buyerMatch = offer.buyerId.toString() === user._id.toString();
        const houseAllowed = await canAccessHouse(user, offer.houseId);
        if (!isAdmin(user) && !buyerMatch && !houseAllowed) {
            return res.status(403).json({ success: false, message: 'Unauthorized to record milestone' });
        }
        const milestoneIndex = offer.milestones.findIndex((m) => m._id?.toString() === milestoneId || m.id === milestoneId);
        if (milestoneIndex === -1)
            return res.status(404).json({ success: false, message: 'Milestone not found' });
        const milestone = offer.milestones[milestoneIndex];
        if (milestone.status === 'PAID' || milestone.status === 'VERIFIED') {
            return res.status(400).json({ success: false, message: 'Milestone already paid' });
        }
        if (amount !== undefined && Number(amount) !== milestone.amount) {
            return res.status(400).json({ success: false, message: 'Amount does not match milestone' });
        }
        const receiptNumber = `RCP-MAT-${Date.now().toString().slice(-7)}`;
        milestone.status = 'PAID';
        milestone.paidAt = new Date();
        milestone.paidAmount = milestone.amount;
        milestone.transactionReference = reference || `TX-OFFER-${Date.now()}`;
        milestone.receiptNumber = receiptNumber;
        milestone.method = method || 'cbe';
        // Update existing transaction or create completed transaction
        const existingTx = await Transaction_1.default.findOne({
            'metadata.offerId': offer._id,
            'metadata.milestoneId': milestone._id || milestone.id,
            status: 'pending'
        });
        if (existingTx) {
            existingTx.status = 'completed';
            existingTx.completedBy = user.role || 'Sales Staff';
            existingTx.completedAt = new Date();
            if (reference)
                existingTx.transactionId = reference;
            existingTx.metadata.receiptNumber = receiptNumber;
            existingTx.markModified('metadata');
            await existingTx.save();
        }
        else {
            await Transaction_1.default.create({
                userId: offer.buyerId,
                houseId: offer.houseId,
                class: 'product_purchase',
                type: 'product_purchase',
                amount: milestone.amount,
                status: 'completed',
                reference: receiptNumber,
                description: `MAT Engineering Order Payment: ${milestone.title} for Order #${offer._id}`,
                method: method || 'cbe',
                metadata: {
                    offerId: offer._id,
                    milestoneId: milestone._id || milestone.id,
                    milestoneTitle: milestone.title,
                    receiptNumber
                }
            });
        }
        // Flow handling based on milestone index and payment plan
        const allPaid = offer.milestones.every((m) => m.status === 'PAID' || m.status === 'VERIFIED');
        if (milestoneIndex === 0) {
            // First milestone paid (either 25% advance or 100% full)
            if (offer.paymentPlan === 'FULL' || allPaid) {
                offer.status = PurchaseOffer_1.OfferStatus.FULL_PAID;
            }
            else {
                offer.status = PurchaseOffer_1.OfferStatus.ADVANCE_PAID;
            }
            if (offer.productionProgress < 25) {
                offer.productionProgress = 25;
            }
            offer.productionStage = 'IN_PRODUCTION';
            offer.productionNotes = 'Initial payment confirmed. Product has been dispatched to production & fabrication.';
        }
        else if (milestoneIndex === 1 && allPaid) {
            // Second milestone (75% remaining) paid!
            offer.status = PurchaseOffer_1.OfferStatus.READY_FOR_PICKUP;
            offer.productionNotes = '100% total payment completed. Product ready for delivery / customer acceptance.';
        }
        if (allPaid && offer.productTakenAt) {
            offer.status = PurchaseOffer_1.OfferStatus.COMPLETED_SALE;
            await House_1.default.findByIdAndUpdate(offer.houseId, { status: House_1.HouseStatus.SOLD });
        }
        await offer.save();
        // Notify customer
        await Notification_1.default.create({
            userId: offer.buyerId,
            title: 'Payment Confirmed by MAT Engineering & Trading',
            message: `Your payment of ETB ${milestone.amount.toLocaleString()} for "${milestone.title}" has been confirmed. Receipt #${receiptNumber} is ready.`,
            type: Notification_1.NotificationType.OFFER_UPDATE,
            link: '/admin/customer'
        });
        res.json({
            success: true,
            data: { milestone, offer },
            message: 'Milestone payment recorded and official receipt issued'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.recordOfferMilestone = recordOfferMilestone;
/**
 * Update production progress for MAT Engineering & Trading products (0-100%).
 * When reaching 100% or PRODUCT_FINISHED, notifies the customer to proceed
 * with the remaining 75% payment (if partial) and arrange pickup.
 */
const updateOfferProductionProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const { productionProgress, productionStage, productionNotes } = req.body;
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const offer = await PurchaseOffer_1.default.findById(id).populate('houseId');
        if (!offer)
            return res.status(404).json({ success: false, message: 'Order not found' });
        if (!isAdmin(user) && !(await canAccessHouse(user, offer.houseId))) {
            return res.status(403).json({ success: false, message: 'Unauthorized to update production progress' });
        }
        const progressNum = Math.min(100, Math.max(0, Number(productionProgress)));
        offer.productionProgress = progressNum;
        if (productionStage) {
            offer.productionStage = productionStage;
        }
        if (productionNotes !== undefined) {
            offer.productionNotes = productionNotes;
        }
        // Check if product is finished
        if (progressNum === 100 || productionStage === 'PRODUCT_FINISHED' || productionStage === 'READY_FOR_PICKUP') {
            offer.status = PurchaseOffer_1.OfferStatus.PRODUCT_FINISHED;
            if (!offer.productionStage || offer.productionStage === 'IN_PRODUCTION' || offer.productionStage === 'MATERIALS_PREPARATION') {
                offer.productionStage = 'PRODUCT_FINISHED';
            }
            await Notification_1.default.create({
                userId: offer.buyerId,
                title: '🎉 Your Product is Finished and Ready!',
                message: offer.paymentPlan === 'PARTIAL'
                    ? `Your product "${offer.houseId?.title || 'Ordered Item'}" is 100% finished! Please proceed with the remaining 75% payment (ETB ${offer.finalAmount.toLocaleString()}) to collect/receive your product.`
                    : `Your product "${offer.houseId?.title || 'Ordered Item'}" is 100% finished and ready for pickup/delivery!`,
                type: Notification_1.NotificationType.OFFER_UPDATE,
                link: '/admin/customer'
            });
        }
        await offer.save();
        res.json({
            success: true,
            data: offer,
            message: `Production progress updated to ${progressNum}% (${offer.productionStage})`
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateOfferProductionProgress = updateOfferProductionProgress;
/**
 * Customer (or Sales Staff) confirms the product has been inspected and taken/accepted.
 */
const confirmProductTaken = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const offer = await PurchaseOffer_1.default.findById(id).populate('houseId');
        if (!offer)
            return res.status(404).json({ success: false, message: 'Order not found' });
        const isBuyer = offer.buyerId.toString() === user._id.toString();
        const houseAllowed = await canAccessHouse(user, offer.houseId);
        if (!isAdmin(user) && !isBuyer && !houseAllowed) {
            return res.status(403).json({ success: false, message: 'Unauthorized to confirm product handover' });
        }
        // Verify payments if partial payment was selected
        if (offer.paymentPlan === 'PARTIAL') {
            const allPaid = offer.milestones.every((m) => m.status === 'PAID' || m.status === 'VERIFIED');
            if (!allPaid) {
                return res.status(400).json({
                    success: false,
                    message: 'The remaining 75% payment must be completed and verified before product handover can be confirmed.'
                });
            }
        }
        offer.productTakenAt = new Date();
        offer.productTakenConfirmedBy = user._id;
        offer.productionProgress = 100;
        offer.productionStage = 'TAKEN_BY_CUSTOMER';
        offer.status = PurchaseOffer_1.OfferStatus.COMPLETED_SALE;
        await offer.save();
        // Update house/product status
        await House_1.default.findByIdAndUpdate(offer.houseId, { status: House_1.HouseStatus.SOLD });
        await notifyHouseParties(offer.houseId || { ownerId: offer.sellerId, agentId: offer.agentId }, {
            title: 'Product Handover Completed!',
            message: `Customer ${user.name || offer.buyerName} has accepted and taken delivery of their order #${offer._id}.`,
            type: Notification_1.NotificationType.OFFER_UPDATE,
            link: '/admin/workflows'
        });
        res.json({
            success: true,
            data: offer,
            message: 'Product handover confirmed! Order completed successfully.'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.confirmProductTaken = confirmProductTaken;
// ─── MAINTENANCE REQUESTS ─────────────────────────────────────
const getMaintenanceRequests = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        let query = {};
        if (user.role === 'customer') {
            query.tenantId = user._id;
        }
        else {
            const scoped = await getScopedHouseIds(user);
            if (scoped === null) {
                // admin/manager
            }
            else if (scoped.length === 0) {
                return res.json({ success: true, data: [] });
            }
            else {
                query.houseId = { $in: scoped };
            }
        }
        const requests = await MaintenanceRequest_1.default.find(query)
            .populate('houseId', 'title location.city location.address ownerId agentId')
            .populate('tenantId', 'name email phone')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: (0, houseRef_1.hydrateHouseRefs)(requests.map(r => r.toObject())) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMaintenanceRequests = getMaintenanceRequests;
const submitMaintenanceRequest = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const { houseId, category, priority, title, description, leaseId } = req.body;
        const house = await House_1.default.findById(houseId);
        if (!house)
            return res.status(404).json({ success: false, message: 'Property not found' });
        const request = await MaintenanceRequest_1.default.create({
            houseId,
            leaseId,
            tenantId: user._id,
            tenantName: user.name,
            tenantPhone: user.phone || '0900000000',
            landlordId: house.ownerId || house.agentId,
            category,
            priority: priority || 'MEDIUM',
            title,
            description,
            status: 'PENDING'
        });
        await notifyHouseParties(house, {
            title: `Maintenance Request: ${priority || 'MEDIUM'} Priority`,
            message: `${user.name} reported a ${category} issue: "${title}"`,
            type: Notification_1.NotificationType.MAINTENANCE_UPDATE,
            link: '/admin/dashboard'
        });
        res.status(201).json({ success: true, data: request, message: 'Maintenance ticket created' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.submitMaintenanceRequest = submitMaintenanceRequest;
const updateMaintenanceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assignedTechnician, technicianContact, estimatedCost, actualCost, resolutionNotes } = req.body;
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const request = await MaintenanceRequest_1.default.findById(id);
        if (!request)
            return res.status(404).json({ success: false, message: 'Request not found' });
        if (!isAdmin(user) && !(await canAccessHouse(user, request.houseId))) {
            return res.status(403).json({ success: false, message: 'Unauthorized to update this request' });
        }
        request.status = status;
        if (assignedTechnician)
            request.assignedTechnician = assignedTechnician;
        if (technicianContact)
            request.technicianContact = technicianContact;
        if (estimatedCost !== undefined)
            request.estimatedCost = estimatedCost;
        if (actualCost !== undefined)
            request.actualCost = actualCost;
        if (resolutionNotes)
            request.resolutionNotes = resolutionNotes;
        if (status === 'COMPLETED')
            request.completedAt = new Date();
        await request.save();
        await Notification_1.default.create({
            userId: request.tenantId,
            title: `Maintenance Update: ${status}`,
            message: `Your request "${request.title}" is now ${status}. Notes: ${resolutionNotes || 'In progress'}`,
            type: Notification_1.NotificationType.MAINTENANCE_UPDATE,
            link: '/customer'
        });
        res.json({ success: true, data: request, message: 'Maintenance request updated' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateMaintenanceStatus = updateMaintenanceStatus;
// ─── IN-APP NOTIFICATIONS ─────────────────────────────────────
const getUserNotifications = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const notifications = await Notification_1.default.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .limit(30);
        const unreadCount = await Notification_1.default.countDocuments({ userId: user._id, isRead: false });
        res.json({ success: true, data: { notifications, unreadCount } });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getUserNotifications = getUserNotifications;
const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const notification = await Notification_1.default.findById(id);
        if (!notification)
            return res.status(404).json({ success: false, message: 'Notification not found' });
        if (notification.userId.toString() !== user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        notification.isRead = true;
        await notification.save();
        res.json({ success: true, message: 'Notification marked as read' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.markNotificationRead = markNotificationRead;
const markAllNotificationsRead = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        await Notification_1.default.updateMany({ userId: user._id, isRead: false }, { isRead: true });
        res.json({ success: true, message: 'All notifications marked as read' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.markAllNotificationsRead = markAllNotificationsRead;
