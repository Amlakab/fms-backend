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
        throw new Error('MONGODB_URI is not set. Check your .env file.');
    }
    try {
        await mongoose_1.default.connect(uri);
        console.log('✅ Connected to MongoDB');
        const houses = await House_1.default.find({})
            .select('-images.data -threeDModels.data')
            .lean();
        console.log(`\n✅ Total houses found: ${houses.length}\n`);
        if (houses.length === 0) {
            console.log('No houses found in the database.');
            return;
        }
        for (const house of houses) {
            console.log('========================================');
            console.log(JSON.stringify(house, null, 2));
        }
        console.log('\n✅ Finished fetching all house data.');
    }
    catch (error) {
        console.error('❌ Error fetching houses:', error);
        process.exitCode = 1;
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('✅ MongoDB connection closed');
    }
}
run();
