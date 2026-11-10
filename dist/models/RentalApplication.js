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
exports.ApplicationStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var ApplicationStatus;
(function (ApplicationStatus) {
    ApplicationStatus["PENDING"] = "PENDING";
    ApplicationStatus["APPROVED"] = "APPROVED";
    ApplicationStatus["REJECTED"] = "REJECTED";
    ApplicationStatus["CANCELLED"] = "CANCELLED";
})(ApplicationStatus || (exports.ApplicationStatus = ApplicationStatus = {}));
const documentSchema = new mongoose_1.Schema({
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
    fileName: { type: String, required: true },
    documentType: { type: String, required: true }
});
const rentalApplicationSchema = new mongoose_1.Schema({
    houseId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'House',
        required: true
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    occupation: {
        type: String,
        required: [true, 'Occupation is required'],
        trim: true
    },
    monthlyIncome: {
        type: Number,
        required: [true, 'Monthly income is required'],
        min: [0, 'Income cannot be negative']
    },
    numberOfOccupants: {
        type: Number,
        required: [true, 'Number of occupants is required'],
        min: [1, 'At least one occupant is required']
    },
    preferredMoveInDate: {
        type: Date,
        required: [true, 'Preferred move-in date is required']
    },
    message: {
        type: String,
        trim: true,
        maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    documents: [documentSchema],
    status: {
        type: String,
        enum: Object.values(ApplicationStatus),
        default: ApplicationStatus.PENDING
    },
    adminNotes: {
        type: String,
        trim: true
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});
// Indexes
rentalApplicationSchema.index({ houseId: 1 });
rentalApplicationSchema.index({ userId: 1 });
rentalApplicationSchema.index({ status: 1 });
rentalApplicationSchema.index({ email: 1 });
exports.default = mongoose_1.default.model('RentalApplication', rentalApplicationSchema);
