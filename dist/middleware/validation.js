"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWithdrawal = exports.validateDeposit = exports.validateLogin = exports.validateRegistration = void 0;
const express_validator_1 = require("express-validator");
exports.validateRegistration = [
    (0, express_validator_1.body)('phone')
        .isMobilePhone('any')
        .withMessage('Please provide a valid phone number'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];
exports.validateLogin = [
    (0, express_validator_1.body)('phone')
        .isMobilePhone('any')
        .withMessage('Please provide a valid phone number'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required'),
    (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];
exports.validateDeposit = [
    (0, express_validator_1.body)('amount')
        .isFloat({ min: 10 })
        .withMessage('Minimum deposit amount is 10 ETB'),
    (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];
exports.validateWithdrawal = [
    (0, express_validator_1.body)('amount')
        .isFloat({ min: 50 })
        .withMessage('Minimum withdrawal amount is 50 ETB'),
    (0, express_validator_1.body)('accountNumber')
        .notEmpty()
        .withMessage('Account number is required'),
    (0, express_validator_1.body)('bankName')
        .notEmpty()
        .withMessage('Bank name is required'),
    (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];
