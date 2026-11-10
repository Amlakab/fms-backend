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
exports.FoodCategory = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var FoodCategory;
(function (FoodCategory) {
    FoodCategory["BREAKFAST"] = "BREAKFAST";
    FoodCategory["LUNCH"] = "LUNCH";
    FoodCategory["DINNER"] = "DINNER";
    FoodCategory["DRINK"] = "DRINK";
    FoodCategory["SNACK"] = "SNACK";
})(FoodCategory || (exports.FoodCategory = FoodCategory = {}));
const foodSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Food name is required'],
        trim: true,
        minlength: [3, 'Food name must be at least 3 characters'],
        maxlength: [100, 'Food name cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        minlength: [10, 'Description must be at least 10 characters'],
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    image: {
        type: String,
        default: ''
    },
    imageData: {
        data: Buffer,
        contentType: String,
        fileName: String
    },
    category: {
        type: String,
        enum: Object.values(FoodCategory),
        required: [true, 'Category is required']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    view: {
        type: Number,
        default: 0
    },
    quantity_available: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ['AVAILABLE', 'UNAVAILABLE'],
        default: 'AVAILABLE'
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for better query performance
foodSchema.index({ category: 1 });
foodSchema.index({ status: 1 });
foodSchema.index({ quantity_available: 1 });
foodSchema.index({ price: 1 });
foodSchema.index({ created_at: -1 });
foodSchema.index({ name: 'text', description: 'text' });
// Static method to increment view count
foodSchema.statics.incrementView = async function (id) {
    return this.findByIdAndUpdate(id, { $inc: { view: 1 } }, { new: true });
};
// Virtual for checking if food is available
foodSchema.virtual('isAvailable').get(function () {
    return this.status === 'AVAILABLE' && this.quantity_available === true;
});
exports.default = mongoose_1.default.model('Food', foodSchema);
