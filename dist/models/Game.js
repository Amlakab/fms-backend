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
const gameSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    cardCount: {
        type: Number,
        required: true,
        enum: [20, 30, 40, 50, 100],
    },
    cardPrice: {
        type: Number,
        required: true,
        min: 1,
    },
    status: {
        type: String,
        enum: ['waiting', 'active', 'completed'],
        default: 'waiting',
    },
    calledNumbers: [{
            type: Number,
            min: 1,
            max: 75,
        }],
    currentNumberIndex: {
        type: Number,
        default: -1,
    },
    numberSequence: [{
            type: Number,
            min: 1,
            max: 75,
        }],
    winner: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    winningPattern: {
        type: String,
    },
    startTime: {
        type: Date,
        required: true,
    },
    endTime: {
        type: Date,
    },
}, {
    timestamps: true,
});
// Generate number sequence (1-75 shuffled) before saving
gameSchema.pre('save', function (next) {
    if (this.isNew && this.numberSequence.length === 0) {
        const numbers = Array.from({ length: 75 }, (_, i) => i + 1);
        // Fisher-Yates shuffle
        for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }
        this.numberSequence = numbers;
    }
    next();
});
// Virtual for current number
gameSchema.virtual('currentNumber').get(function () {
    if (this.currentNumberIndex >= 0 && this.currentNumberIndex < this.numberSequence.length) {
        return this.numberSequence[this.currentNumberIndex];
    }
    return null;
});
exports.default = mongoose_1.default.model('Game', gameSchema);
