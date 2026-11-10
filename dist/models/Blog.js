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
const blogSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        minlength: [10, 'Title must be at least 10 characters'],
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        minlength: [50, 'Description must be at least 50 characters'],
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    content: {
        type: String,
        default: ''
    },
    image: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Author is required']
    },
    blogDate: {
        type: Date,
        default: Date.now
    },
    slug: {
        type: String,
        required: [true, 'Slug is required'],
        unique: true,
        trim: true,
        lowercase: true
    },
    status: {
        type: String,
        enum: ['draft', 'pending', 'published', 'archived', 'rejected'],
        default: 'draft'
    },
    tags: {
        type: [String],
        default: []
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    viewsCount: {
        type: Number,
        default: 0
    },
    metaTitle: {
        type: String,
        trim: true
    },
    metaDescription: {
        type: String,
        trim: true,
        maxlength: [160, 'Meta description cannot exceed 160 characters']
    },
    metaKeywords: {
        type: [String],
        default: []
    },
    readingTime: {
        type: Number,
        default: 0
    },
    approvalNotes: {
        type: String,
        default: ''
    },
    approvedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for better query performance
blogSchema.index({ slug: 1 }, { unique: true });
blogSchema.index({ status: 1 });
blogSchema.index({ category: 1 });
blogSchema.index({ createdBy: 1 });
blogSchema.index({ isFeatured: 1 });
blogSchema.index({ blogDate: -1 });
blogSchema.index({ viewsCount: -1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ approvedBy: 1 });
// Generate slug from title before saving
blogSchema.pre('save', function (next) {
    if (!this.isModified('title'))
        return next();
    // Generate slug from title
    this.slug = this.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
    // Generate meta title if not provided
    if (!this.metaTitle) {
        this.metaTitle = this.title;
    }
    // Generate meta description if not provided
    if (!this.metaDescription) {
        this.metaDescription = this.description.substring(0, 150);
    }
    // Generate reading time estimate (200 words per minute)
    if (this.content) {
        const wordCount = this.content.split(/\s+/).length;
        this.readingTime = Math.ceil(wordCount / 200);
    }
    next();
});
// Virtual for author information
blogSchema.virtual('author', {
    ref: 'User',
    localField: 'createdBy',
    foreignField: '_id',
    justOne: true
});
// Virtual for approver information
blogSchema.virtual('approver', {
    ref: 'User',
    localField: 'approvedBy',
    foreignField: '_id',
    justOne: true
});
// Static method to increment view count
blogSchema.statics.incrementViews = async function (slug) {
    return this.findOneAndUpdate({ slug }, { $inc: { viewsCount: 1 } }, { new: true });
};
exports.default = mongoose_1.default.model('Blog', blogSchema);
