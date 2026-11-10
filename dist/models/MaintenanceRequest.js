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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenancePriority = exports.MaintenanceStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var MaintenanceStatus;
(function (MaintenanceStatus) {
    MaintenanceStatus["PENDING"] = "PENDING";
    MaintenanceStatus["ASSIGNED"] = "ASSIGNED";
    MaintenanceStatus["IN_PROGRESS"] = "IN_PROGRESS";
    MaintenanceStatus["COMPLETED"] = "COMPLETED";
    MaintenanceStatus["CANCELLED"] = "CANCELLED";
})(MaintenanceStatus || (exports.MaintenanceStatus = MaintenanceStatus = {}));
var MaintenancePriority;
(function (MaintenancePriority) {
    MaintenancePriority["LOW"] = "LOW";
    MaintenancePriority["MEDIUM"] = "MEDIUM";
    MaintenancePriority["HIGH"] = "HIGH";
    MaintenancePriority["EMERGENCY"] = "EMERGENCY";
})(MaintenancePriority || (exports.MaintenancePriority = MaintenancePriority = {}));
const maintenanceRequestSchema = new mongoose_1.Schema({
    houseId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'House',
        required: true,
        index: true
    },
    leaseId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'LeaseAgreement'
    },
    tenantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    tenantName: { type: String, required: true },
    tenantPhone: { type: String, required: true },
    landlordId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    category: {
        type: String,
        enum: ['PLUMBING', 'ELECTRICAL', 'HVAC_HEATING', 'APPLIANCE', 'STRUCTURAL', 'ROOF_LEAK', 'SECURITY_LOCKS', 'OTHER'],
        required: true
    },
    priority: {
        type: String,
        enum: Object.values(MaintenancePriority),
        default: MaintenancePriority.MEDIUM
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150
    },
    description: {
        type: String,
        required: true,
        maxlength: 2000
    },
    status: {
        type: String,
        enum: Object.values(MaintenanceStatus),
        default: MaintenanceStatus.PENDING
    },
    images: [String],
    assignedTechnician: String,
    technicianContact: String,
    estimatedCost: { type: Number, default: 0 },
    actualCost: { type: Number, default: 0 },
    scheduledDate: Date,
    completedAt: Date,
    resolutionNotes: String
}, {
    timestamps: true
});
maintenanceRequestSchema.index({ tenantId: 1, status: 1 });
maintenanceRequestSchema.index({ landlordId: 1, status: 1 });
maintenanceRequestSchema.index({ houseId: 1, status: 1 });
exports.default = mongoose_1.default.model('MaintenanceRequest', maintenanceRequestSchema);
