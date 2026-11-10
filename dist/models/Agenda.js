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
const agendaDiscussionSchema = new mongoose_1.Schema({
    question: {
        type: String,
        required: true,
        trim: true
    },
    answer: {
        type: String,
        required: true,
        trim: true
    },
    summary: {
        type: String,
        required: true,
        trim: true
    },
    discussedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });
const agendaTitleSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    discussions: {
        type: [agendaDiscussionSchema],
        default: []
    }
}, { _id: false });
const agendaSchema = new mongoose_1.Schema({
    meetingClass: {
        type: String,
        required: [true, 'Meeting class is required'],
        trim: true
    },
    location: {
        type: String,
        required: [true, 'Location is required'],
        trim: true
    },
    draftContributors: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Student', // Changed from 'User' to 'Student'
            required: true
        }],
    agendaTitles: {
        type: [agendaTitleSchema],
        required: true,
        validate: {
            validator: function (titles) {
                return titles.length > 0;
            },
            message: 'At least one agenda title is required'
        }
    },
    generalMeetingSummary: {
        type: String,
        trim: true
    },
    meetingContributors: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Student' // Changed from 'User' to 'Student'
        }],
    // Status fields
    status: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'completed'],
        default: 'draft'
    },
    draftDate: {
        type: Date,
        default: Date.now
    },
    meetingDate: {
        type: Date
    },
    // User references (remain as User)
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator is required']
    },
    approvedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for better query performance
agendaSchema.index({ status: 1 });
agendaSchema.index({ createdBy: 1 });
agendaSchema.index({ draftDate: -1 });
agendaSchema.index({ meetingDate: -1 });
agendaSchema.index({ approvedBy: 1 });
// Virtual for creator information
agendaSchema.virtual('creator', {
    ref: 'User',
    localField: 'createdBy',
    foreignField: '_id',
    justOne: true,
    options: { select: 'firstName lastName email role' }
});
// Virtual for approver information
agendaSchema.virtual('approver', {
    ref: 'User',
    localField: 'approvedBy',
    foreignField: '_id',
    justOne: true,
    options: { select: 'firstName lastName email role' }
});
// Virtual for draft contributors details
agendaSchema.virtual('draftContributorsDetails', {
    ref: 'Student',
    localField: 'draftContributors',
    foreignField: '_id',
    options: { select: 'firstName middleName lastName gender gibyGubayeId phone email' }
});
// Virtual for meeting contributors details
agendaSchema.virtual('meetingContributorsDetails', {
    ref: 'Student',
    localField: 'meetingContributors',
    foreignField: '_id',
    options: { select: 'firstName middleName lastName gender gibyGubayeId phone email' }
});
// Pre-save middleware
agendaSchema.pre('save', function (next) {
    // Set draftDate when status changes to pending
    if (this.isModified('status') && this.status === 'pending' && !this.draftDate) {
        this.draftDate = new Date();
    }
    // Set meetingDate when status changes to completed
    if (this.isModified('status') && this.status === 'completed' && !this.meetingDate) {
        this.meetingDate = new Date();
    }
    next();
});
exports.default = mongoose_1.default.model('Agenda', agendaSchema);
