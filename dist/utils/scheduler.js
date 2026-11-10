"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const User_1 = __importDefault(require("../models/User"));
// Reset daily earnings at midnight
node_cron_1.default.schedule('0 0 * * *', async () => {
    try {
        await User_1.default.updateMany({}, { $set: { dailyEarnings: 0 } });
        console.log('Daily earnings reset successfully');
    }
    catch (error) {
        console.error('Error resetting daily earnings:', error);
    }
});
// Reset weekly earnings at midnight on Monday
node_cron_1.default.schedule('0 0 * * 1', async () => {
    try {
        await User_1.default.updateMany({}, { $set: { weeklyEarnings: 0 } });
        console.log('Weekly earnings reset successfully');
    }
    catch (error) {
        console.error('Error resetting weekly earnings:', error);
    }
});
