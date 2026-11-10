"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredOTPs = exports.verifyOTP = exports.storeOTP = exports.generateOTP = void 0;
// In-memory store for OTPs (use Redis in production)
const otpStore = new Map();
const generateOTP = (length = 6) => {
    const digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < length; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
};
exports.generateOTP = generateOTP;
const storeOTP = (phone, otp, expiresInMinutes = 5) => {
    const expires = Date.now() + expiresInMinutes * 60 * 1000;
    otpStore.set(phone, { otp, expires });
};
exports.storeOTP = storeOTP;
const verifyOTP = (phone, otp) => {
    const storedOtp = otpStore.get(phone);
    if (!storedOtp || storedOtp.otp !== otp || Date.now() > storedOtp.expires) {
        return false;
    }
    // Remove OTP after verification
    otpStore.delete(phone);
    return true;
};
exports.verifyOTP = verifyOTP;
const cleanupExpiredOTPs = () => {
    const now = Date.now();
    for (const [phone, { expires }] of otpStore.entries()) {
        if (now > expires) {
            otpStore.delete(phone);
        }
    }
};
exports.cleanupExpiredOTPs = cleanupExpiredOTPs;
// Clean up expired OTPs every hour
setInterval(exports.cleanupExpiredOTPs, 60 * 60 * 1000);
