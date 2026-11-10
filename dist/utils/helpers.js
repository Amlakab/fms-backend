"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRandomString = exports.formatCurrency = exports.errorResponse = exports.successResponse = void 0;
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({
        success: true,
        message,
        data
    });
};
exports.successResponse = successResponse;
const errorResponse = (res, message = 'Error', statusCode = 500, errors = null) => {
    res.status(statusCode).json({
        success: false,
        message,
        errors
    });
};
exports.errorResponse = errorResponse;
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ET', {
        style: 'currency',
        currency: 'ETB',
    }).format(amount);
};
exports.formatCurrency = formatCurrency;
const generateRandomString = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};
exports.generateRandomString = generateRandomString;
