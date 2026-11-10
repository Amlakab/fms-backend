"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = __importDefault(require("mongoose"));
const House_1 = __importDefault(require("../models/House"));
async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI is not set in .env');
    }
    try {
        await mongoose_1.default.connect(uri);
        console.log('Connected to MongoDB');
        const houseId = '6adf75a61e1ab306a0375b56';
        const house = await House_1.default.findByIdAndUpdate(houseId, { $set: { transactionType: 'BUY' } }, { new: true, runValidators: true });
        if (!house) {
            console.log('House not found.');
            return;
        }
        console.log('House updated successfully!');
        console.log('ID:', house._id.toString());
        console.log('Title:', house.title);
        console.log('Transaction Type:', house.transactionType);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('MongoDB connection closed');
    }
}
run().catch((error) => {
    console.error('Update failed:', error);
    process.exitCode = 1;
});
