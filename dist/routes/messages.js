"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Message_1 = __importDefault(require("../models/Message"));
const auth_1 = require("../middleware/auth");
const House_1 = __importDefault(require("../models/House"));
const houseRef_1 = require("../utils/houseRef");
const router = express_1.default.Router();
// Create message (public)
router.post('/', async (req, res) => {
    try {
        const { orderId, houseId, phone, email, name, subject, message } = req.body;
        // Validate house exists
        if (!houseId) {
            return res.status(400).json({ error: 'House ID is required' });
        }
        const house = await House_1.default.findById(houseId);
        if (!house) {
            return res.status(404).json({ error: 'House not found' });
        }
        // Validate that at least one contact method is provided
        if (!phone && !email && !orderId) {
            return res.status(400).json({
                error: 'Either phone, email, or order ID is required'
            });
        }
        const messageData = {
            houseId,
            name: name || 'Anonymous',
            subject: subject || 'general',
            message,
            status: 'pending'
        };
        if (orderId)
            messageData.orderId = orderId;
        if (phone)
            messageData.phone = phone;
        if (email)
            messageData.email = email;
        const newMessage = new Message_1.default(messageData);
        await newMessage.save();
        res.status(201).json(newMessage);
    }
    catch (error) {
        console.error('Error creating message:', error);
        res.status(400).json({ error: error.message });
    }
});
// Get messages by house ID (public)
router.get('/house/:houseId', async (req, res) => {
    try {
        const { houseId } = req.params;
        if (!houseId) {
            return res.status(400).json({ error: 'House ID is required' });
        }
        const messages = await Message_1.default.find({ houseId }).sort({ createdAt: 1 });
        res.json(messages);
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get messages by order ID (authenticated)
router.get('/order/:orderId', auth_1.authenticate, async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!orderId) {
            return res.status(400).json({ error: 'Order ID is required' });
        }
        const messages = await Message_1.default.find({ orderId }).sort({ createdAt: 1 });
        res.json(messages);
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get all messages (admin only - similar to feedback admin)
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const { subject, status, houseId } = req.query;
        const userRole = req.user?.role;
        let query = {};
        if (subject)
            query.subject = subject;
        if (status)
            query.status = status;
        if (houseId)
            query.houseId = houseId;
        const messages = await Message_1.default.find(query)
            .populate('houseId', 'title location propertyType')
            .populate('orderId', 'orderType status')
            .sort({ createdAt: -1 });
        res.json((0, houseRef_1.hydrateHouseRefs)(messages.map(m => m.toObject())));
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: error.message });
    }
});
// Update message response (admin only)
router.patch('/:id/response', auth_1.authenticate, async (req, res) => {
    try {
        const { response } = req.body;
        if (!response) {
            return res.status(400).json({ error: 'Response content is required' });
        }
        const message = await Message_1.default.findByIdAndUpdate(req.params.id, { response, status: 'responded', respondedAt: new Date() }, { new: true, runValidators: true });
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        res.json(message);
    }
    catch (error) {
        console.error('Error updating response:', error);
        res.status(400).json({ error: error.message });
    }
});
// Delete message (admin only)
router.delete('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const message = await Message_1.default.findByIdAndDelete(req.params.id);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        res.json({ message: 'Message deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
