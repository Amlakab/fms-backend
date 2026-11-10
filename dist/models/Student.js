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
const mongoose_1 = __importStar(require("mongoose"));
const studentSchema = new mongoose_1.Schema({
    gibyGubayeId: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
    },
    middleName: {
        type: String,
        trim: true,
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
    },
    motherName: {
        type: String,
        required: [true, 'Mother name is required'],
        trim: true,
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        trim: true,
        match: [/^09\d{8}$/, 'Please enter a valid Ethiopian phone number (09XXXXXXXX)']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    gender: {
        type: String,
        enum: ['male', 'female'],
        required: [true, 'Gender is required']
    },
    block: {
        type: String,
        required: [true, 'Block is required'],
        trim: true,
    },
    dorm: {
        type: String,
        required: [true, 'Dorm is required'],
        trim: true,
    },
    university: {
        type: String,
        required: [true, 'University is required'],
        trim: true,
    },
    college: {
        type: String,
        required: [true, 'College is required'],
        trim: true,
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        trim: true,
    },
    batch: {
        type: String,
        required: [true, 'Batch is required'],
        trim: true,
    },
    region: {
        type: String,
        required: [true, 'Region is required'],
        trim: true,
    },
    zone: {
        type: String,
        required: [true, 'Zone is required'],
        trim: true,
    },
    wereda: {
        type: String,
        required: [true, 'Wereda is required'],
        trim: true,
    },
    kebele: {
        type: String,
        required: [true, 'Kebele is required'],
        trim: true,
    },
    church: {
        type: String,
        required: [true, 'Church is required'],
        trim: true,
    },
    authority: {
        type: String,
        required: [true, 'Authority is required'],
        trim: true,
    },
    job: {
        type: String,
        required: [true, 'Job is required'],
        trim: true,
    },
    motherTongue: {
        type: String,
        required: [true, 'Mother tongue is required'],
        trim: true,
    },
    additionalLanguages: {
        type: [String],
        default: [],
    },
    attendsCourse: {
        type: Boolean,
        default: false,
    },
    courseName: {
        type: String,
        trim: true,
    },
    courseChurch: {
        type: String,
        trim: true,
    },
    numberOfJob: {
        type: Number,
        default: 0,
    },
    dateOfBirth: {
        type: Date,
        required: [true, 'Date of birth is required'],
    },
    emergencyContact: {
        type: String,
        required: [true, 'Emergency contact is required'],
        trim: true,
        match: [/^09\d{8}$/, 'Please enter a valid Ethiopian phone number (09XXXXXXXX)']
    },
    photo: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
});
// Indexes for better query performance
studentSchema.index({ phone: 1 }, { unique: true });
studentSchema.index({ email: 1 }, { unique: true });
studentSchema.index({ university: 1 });
studentSchema.index({ college: 1 });
studentSchema.index({ department: 1 });
studentSchema.index({ batch: 1 });
studentSchema.index({ region: 1 });
studentSchema.index({ isActive: 1 });
// Virtual for age calculation
studentSchema.virtual('age').get(function () {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
});
// Ensure virtuals are included in JSON output
studentSchema.set('toJSON', { virtuals: true });
studentSchema.set('toObject', { virtuals: true });
exports.default = mongoose_1.default.model('Student', studentSchema);
