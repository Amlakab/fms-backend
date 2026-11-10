"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        const conn = await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bingo-platform');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        // Ensure Menu collection drops legacy single name_1 index if present
        try {
            const menuCollection = mongoose_1.default.connection.collection('menus');
            const indexes = await menuCollection.indexes();
            const hasName1 = indexes.some((idx) => idx.name === 'name_1');
            if (hasName1) {
                await menuCollection.dropIndex('name_1');
                console.log('Dropped obsolete name_1 index from menus collection');
            }
        }
        catch (e) {
            // ignore if collection or index doesn't exist
        }
    }
    catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
