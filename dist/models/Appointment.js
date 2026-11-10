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
exports.VisitType = exports.AppointmentStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var AppointmentStatus;
(function (AppointmentStatus) {
    AppointmentStatus["REQUESTED"] = "REQUESTED";
    AppointmentStatus["CONFIRMED"] = "CONFIRMED";
    AppointmentStatus["RESCHEDULED"] = "RESCHEDULED";
    AppointmentStatus["COMPLETED"] = "COMPLETED";
    AppointmentStatus["CANCELLED"] = "CANCELLED";
    AppointmentStatus["REJECTED"] = "REJECTED";
})(AppointmentStatus || (exports.AppointmentStatus = AppointmentStatus = {}));
var VisitType;
(function (VisitType) {
    VisitType["IN_PERSON"] = "IN_PERSON";
    VisitType["VIRTUAL_TOUR"] = "VIRTUAL_TOUR";
})(VisitType || (exports.VisitType = VisitType = {}));
const appointmentSchema = new mongoose_1.Schema({
    houseId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'House',
        required: true,
        index: true
    },
    customerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    customerName: {
        type: String,
        required: true
    },
    customerEmail: {
        type: String,
        required: true
    },
    customerPhone: {
        type: String,
        required: true
    },
    hostId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    visitDate: {
        type: Date,
        required: true
    },
    timeSlot: {
        type: String,
        required: true
    },
    visitType: {
        type: String,
        enum: Object.values(VisitType),
        default: VisitType.IN_PERSON
    },
    numberOfVisitors: {
        type: Number,
        default: 1,
        min: 1
    },
    notes: String,
    status: {
        type: String,
        enum: Object.values(AppointmentStatus),
        default: AppointmentStatus.REQUESTED
    },
    rescheduledDate: Date,
    rescheduledTimeSlot: String,
    rescheduledReason: String,
    feedback: {
        rating: Number,
        interestLevel: {
            type: String,
            enum: ['high', 'medium', 'low', 'not_interested']
        },
        comments: String
    }
}, {
    timestamps: true
});
appointmentSchema.index({ customerId: 1, visitDate: 1 });
appointmentSchema.index({ hostId: 1, visitDate: 1 });
appointmentSchema.index({ houseId: 1, status: 1 });
exports.default = mongoose_1.default.model('Appointment', appointmentSchema);
