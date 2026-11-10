"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const gameSchema = new mongoose_1.default.Schema({
    betAmount: {
        type: Number,
        required: true,
        min: 1,
        max: 10000
    }
}, {
    timestamps: true // This adds createdAt and updatedAt automatically
});
// Index for better query performance
gameSchema.index({ betAmount: 1 });
gameSchema.index({ createdAt: 1 });
const Games = mongoose_1.default.model('Games', gameSchema);
exports.default = Games;
