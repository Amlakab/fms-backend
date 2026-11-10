"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/feedback.ts
const express_1 = __importDefault(require("express"));
const Feedback_1 = __importDefault(require("../models/Feedback"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Create feedback (public)
router.post('/', async (req, res) => {
    try {
        const { phone, email, name, subject, message } = req.body;
        // Validate that at least one contact method is provided
        if (!phone && !email) {
            return res.status(400).json({
                error: 'Either phone or email is required'
            });
        }
        const feedback = new Feedback_1.default({
            phone,
            email,
            name,
            subject,
            message
        });
        await feedback.save();
        res.status(201).json(feedback);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Get feedback by phone or email (protected)
router.get('/search', async (req, res) => {
    try {
        const { phone, email } = req.query;
        if (!phone && !email) {
            return res.status(400).json({
                error: 'Phone or email query parameter is required'
            });
        }
        let query = {};
        if (phone)
            query.phone = phone;
        if (email)
            query.email = email;
        const feedbacks = await Feedback_1.default.find(query).sort({ createdAt: -1 });
        res.json(feedbacks);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get all feedback (admin only)
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const { subject, status } = req.query;
        let query = {};
        if (subject)
            query.subject = subject;
        if (status)
            query.status = status;
        const feedbacks = await Feedback_1.default.find(query).sort({ createdAt: -1 });
        res.json(feedbacks);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update feedback response (admin only)
router.patch('/:id/response', auth_1.authenticate, async (req, res) => {
    try {
        const { response } = req.body;
        const feedback = await Feedback_1.default.findByIdAndUpdate(req.params.id, { response, status: 'responded', respondedAt: new Date() }, { new: true, runValidators: true });
        if (!feedback) {
            return res.status(404).json({ error: 'Feedback not found' });
        }
        res.json(feedback);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Delete feedback (admin only)
router.delete('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const feedback = await Feedback_1.default.findByIdAndDelete(req.params.id);
        if (!feedback) {
            return res.status(404).json({ error: 'Feedback not found' });
        }
        res.json({ message: 'Feedback deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
