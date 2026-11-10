import express from 'express';
import Message, { IMessage } from '../models/Message';
import { authenticate } from '../middleware/auth';
import House from '../models/House';
import { hydrateHouseRefs } from '../utils/houseRef';

const router = express.Router();

// Create message (public)
router.post('/', async (req, res) => {
  try {
    const { orderId, houseId, phone, email, name, subject, message } = req.body;
    
    // Validate house exists
    if (!houseId) {
      return res.status(400).json({ error: 'House ID is required' });
    }
    
    const house = await House.findById(houseId);
    if (!house) {
      return res.status(404).json({ error: 'House not found' });
    }
    
    // Validate that at least one contact method is provided
    if (!phone && !email && !orderId) {
      return res.status(400).json({ 
        error: 'Either phone, email, or order ID is required' 
      });
    }

    const messageData: any = {
      houseId,
      name: name || 'Anonymous',
      subject: subject || 'general',
      message,
      status: 'pending'
    };
    
    if (orderId) messageData.orderId = orderId;
    if (phone) messageData.phone = phone;
    if (email) messageData.email = email;

    const newMessage = new Message(messageData);
    await newMessage.save();

    res.status(201).json(newMessage);
  } catch (error: any) {
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

    const messages = await Message.find({ houseId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get messages by order ID (authenticated)
router.get('/order/:orderId', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const messages = await Message.find({ orderId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all messages (admin only - similar to feedback admin)
router.get('/', authenticate, async (req, res) => {
  try {
    const { subject, status, houseId } = req.query;
    const userRole = (req as any).user?.role;
    
    let query: any = {};
    
    if (subject) query.subject = subject;
    if (status) query.status = status;
    if (houseId) query.houseId = houseId;
    
    const messages = await Message.find(query)
      .populate('houseId', 'title location propertyType')
      .populate('orderId', 'orderType status')
      .sort({ createdAt: -1 });
    
    res.json(hydrateHouseRefs(messages.map(m => m.toObject())));
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update message response (admin only)
router.patch('/:id/response', authenticate, async (req, res) => {
  try {
    const { response } = req.body;
    
    if (!response) {
      return res.status(400).json({ error: 'Response content is required' });
    }
    
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { response, status: 'responded', respondedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(message);
  } catch (error: any) {
    console.error('Error updating response:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete message (admin only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;