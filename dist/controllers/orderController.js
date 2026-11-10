"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyOrders = exports.getOrderStatistics = exports.deleteOrder = exports.updateOrderStatus = exports.createOrder = exports.getOrder = exports.getAllOrders = void 0;
const Order_1 = __importStar(require("../models/Order"));
const House_1 = __importDefault(require("../models/House"));
const Conversation_1 = __importDefault(require("../models/Conversation"));
const Feedback_1 = __importDefault(require("../models/Feedback"));
const mongoose_1 = __importDefault(require("mongoose"));
const houseRef_1 = require("../utils/houseRef");
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({ success: true, message, data });
};
const errorResponse = (res, message = 'Error', statusCode = 500) => {
    res.status(statusCode).json({ success: false, message });
};
const getAllOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status || '';
        const orderType = req.query.orderType || '';
        const search = req.query.search || '';
        const userId = req.user._id;
        const userRole = req.user.role;
        const skip = (page - 1) * limit;
        const filter = {};
        // ─── ROLE BASED FILTERING ──────────────────────────────────────
        if (userRole === 'customer' || userRole === 'user') {
            filter.customerId = userId;
        }
        else if (userRole === 'agent') {
            const agentHouses = await House_1.default.find({ agentId: userId }).select('_id');
            filter.houseId = { $in: agentHouses.map(h => h._id) };
        }
        else if (userRole === 'owner') {
            const ownerHouses = await House_1.default.find({ ownerId: userId }).select('_id');
            filter.houseId = { $in: ownerHouses.map(h => h._id) };
        }
        // admin and manager see everything (no filter applied)
        // ───────────────────────────────────────────────────────────────
        if (status)
            filter.status = status;
        if (orderType)
            filter.orderType = orderType;
        if (search) {
            filter.$or = [
                { customerName: { $regex: search, $options: 'i' } },
                { customerEmail: { $regex: search, $options: 'i' } },
                { customerPhone: { $regex: search, $options: 'i' } }
            ];
        }
        const orders = await Order_1.default.find(filter)
            .populate('houseId', 'title propertyType pricing.price location.city')
            .populate('customerId', 'name email profile.phone')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);
        const totalOrders = await Order_1.default.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / limit);
        successResponse(res, {
            orders: (0, houseRef_1.hydrateHouseRefs)(orders.map(o => o.toObject())),
            pagination: {
                currentPage: page,
                totalPages,
                totalOrders,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        }, 'Orders retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching orders:', error);
        errorResponse(res, error.message, 500);
    }
};
exports.getAllOrders = getAllOrders;
const getOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return errorResponse(res, 'Invalid order ID', 400);
        }
        const order = await Order_1.default.findById(id)
            .populate('houseId', 'title description propertyType pricing location images agentId ownerId agentName')
            .populate('customerId', 'name email profile.phone profile.avatar')
            .populate('timeline.updatedBy', 'name email');
        if (!order) {
            return errorResponse(res, 'Order not found', 404);
        }
        // ─── SECURITY CHECK ────────────────────────────────────────────
        const house = order.houseId; // Type assertion since it's populated
        if (userRole === 'customer' || userRole === 'user') {
            if (order.customerId && order.customerId._id?.toString() !== userId.toString()) {
                return errorResponse(res, 'Unauthorized to view this order', 403);
            }
        }
        else if (userRole === 'agent') {
            if (house && house.agentId && house.agentId.toString() !== userId.toString()) {
                return errorResponse(res, 'Unauthorized to view this order', 403);
            }
        }
        else if (userRole === 'owner') {
            if (house && house.ownerId && house.ownerId.toString() !== userId.toString()) {
                return errorResponse(res, 'Unauthorized to view this order', 403);
            }
        }
        // admin and manager bypass this check
        // ───────────────────────────────────────────────────────────────
        successResponse(res, (0, houseRef_1.hydrateHouseRefs)(order.toObject()), 'Order retrieved successfully');
    }
    catch (error) {
        errorResponse(res, error.message, 500);
    }
};
exports.getOrder = getOrder;
const createOrder = async (req, res) => {
    try {
        const { houseId, orderType, details, totalAmount, quantity = 1 } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(houseId)) {
            return errorResponse(res, 'Invalid house ID', 400);
        }
        const house = await House_1.default.findById(houseId);
        if (!house) {
            return errorResponse(res, 'House not found', 404);
        }
        if (house.status !== 'AVAILABLE') {
            return errorResponse(res, 'House is not available for booking', 400);
        }
        let parsedDetails = details;
        if (typeof details === 'string') {
            try {
                parsedDetails = JSON.parse(details);
            }
            catch (e) {
                parsedDetails = {};
            }
        }
        parsedDetails.quantity = quantity;
        const finalTotal = Number(totalAmount) || (house.pricing.price * quantity);
        const plan = req.body.paymentPlan === 'FULL' ? 'FULL' : 'PARTIAL';
        const advanceAmt = plan === 'FULL' ? finalTotal : Math.round(finalTotal * 0.25);
        const finalAmt = plan === 'FULL' ? 0 : (finalTotal - advanceAmt);
        const newOrder = new Order_1.default({
            houseId,
            customerId: req.user._id,
            customerName: req.user.name || 'Customer',
            customerEmail: req.user.email,
            customerPhone: req.body.customerPhone || req.user.profile?.phone || '',
            orderType,
            details: parsedDetails,
            totalAmount: finalTotal,
            paymentPlan: plan,
            advanceAmount: advanceAmt,
            finalAmount: finalAmt,
            productionProgress: 0,
            productionStage: 'ORDER_PLACED',
            productionNotes: 'Order placed with MAT Engineering & Trading PLC.',
            timeline: [{
                    status: Order_1.OrderStatus.PENDING,
                    comment: `Order created for ${quantity} ${quantity > 1 ? 'units' : 'unit'} (${plan === 'FULL' ? '100% Full Payment' : '25% Partial Payment Plan'})`,
                    updatedBy: req.user._id
                }]
        });
        await newOrder.save();
        // Update house inquiries count
        await House_1.default.findByIdAndUpdate(houseId, { $inc: { inquiries: 1 } });
        // Create conversation
        const conversation = new Conversation_1.default({
            participants: [req.user._id, house.agentId],
            orderId: newOrder._id,
            houseId,
            lastMessage: `Order created: ${orderType} request for ${house.title} (${quantity} ${quantity > 1 ? 'units' : 'unit'})`,
            lastMessageAt: new Date(),
            unreadCount: new Map([[house.agentId.toString(), 1]])
        });
        await conversation.save();
        // Create feedback record for the order
        const feedback = new Feedback_1.default({
            phone: req.user.profile?.phone || '',
            email: req.user.email,
            name: req.user.name,
            subject: `Order ${newOrder._id} - ${orderType}`,
            message: `Order created for ${house.title}. Quantity: ${quantity}. Total: ${totalAmount}`,
            orderId: newOrder._id
        });
        await feedback.save();
        // Populate the response
        const populatedOrder = await Order_1.default.findById(newOrder._id)
            .populate('houseId', 'title propertyType pricing.location.city')
            .populate('customerId', 'name email');
        successResponse(res, populatedOrder, 'Order created successfully', 201);
    }
    catch (error) {
        console.error('Error creating order:', error);
        errorResponse(res, error.message || 'Failed to create order', 500);
    }
};
exports.createOrder = createOrder;
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, comment } = req.body;
        const userId = req.user._id;
        const userRole = req.user.role;
        if (!Object.values(Order_1.OrderStatus).includes(status)) {
            return errorResponse(res, 'Invalid status', 400);
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return errorResponse(res, 'Invalid order ID', 400);
        }
        const order = await Order_1.default.findById(id).populate('houseId', 'agentId ownerId title status');
        if (!order) {
            return errorResponse(res, 'Order not found', 404);
        }
        const house = order.houseId;
        // ─── SECURITY CHECK ────────────────────────────────────────────
        if (userRole === 'agent') {
            if (house && house.agentId && house.agentId.toString() !== userId.toString()) {
                return errorResponse(res, 'Unauthorized to update this order', 403);
            }
        }
        else if (userRole === 'owner') {
            if (house && house.ownerId && house.ownerId.toString() !== userId.toString()) {
                return errorResponse(res, 'Unauthorized to update this order', 403);
            }
        }
        else if (userRole === 'customer' || userRole === 'user') {
            // Customers can only CANCEL their own pending orders
            if (order.customerId.toString() !== userId.toString() || status !== Order_1.OrderStatus.CANCELLED) {
                return errorResponse(res, 'Unauthorized to update this order status', 403);
            }
        }
        // admin and manager bypass this check
        // ───────────────────────────────────────────────────────────────
        const timelineUpdate = {
            status,
            comment: comment || `Status updated to ${status}`,
            updatedBy: userId,
            timestamp: new Date()
        };
        const updatePayload = {
            status,
            $push: { timeline: timelineUpdate }
        };
        if (req.body.productionProgress !== undefined) {
            updatePayload.productionProgress = Number(req.body.productionProgress);
        }
        if (req.body.productionStage) {
            updatePayload.productionStage = req.body.productionStage;
        }
        if (req.body.productionNotes) {
            updatePayload.productionNotes = req.body.productionNotes;
        }
        if (status === Order_1.OrderStatus.COMPLETED) {
            updatePayload.productTakenAt = new Date();
            updatePayload.productionProgress = 100;
            updatePayload.productionStage = 'TAKEN_BY_CUSTOMER';
        }
        const updatedOrder = await Order_1.default.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true });
        if (status === Order_1.OrderStatus.APPROVED) {
            if (house && house.status === 'AVAILABLE') {
                const newStatus = order.orderType === 'PURCHASE' ? 'SOLD' : 'RENTED';
                await House_1.default.findByIdAndUpdate(house._id, { status: newStatus });
            }
        }
        const conversation = await Conversation_1.default.findOne({ orderId: order._id });
        if (conversation) {
            conversation.lastMessage = `Order status updated to ${status}: ${comment || ''}`;
            conversation.lastMessageAt = new Date();
            const receiverId = userId.toString() === order.customerId.toString() ? house.agentId : order.customerId;
            const currentUnread = conversation.unreadCount.get(receiverId.toString()) || 0;
            conversation.unreadCount.set(receiverId.toString(), currentUnread + 1);
            await conversation.save();
        }
        // Update feedback
        await Feedback_1.default.findOneAndUpdate({ orderId: order._id }, { status: status === 'COMPLETED' ? 'responded' : 'pending' });
        successResponse(res, updatedOrder, 'Order status updated successfully');
    }
    catch (error) {
        console.error('Error updating order status:', error);
        errorResponse(res, error.message, 500);
    }
};
exports.updateOrderStatus = updateOrderStatus;
const deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return errorResponse(res, 'Invalid order ID', 400);
        }
        const order = await Order_1.default.findById(id).populate('houseId', 'agentId ownerId');
        if (!order) {
            return errorResponse(res, 'Order not found', 404);
        }
        const house = order.houseId;
        // ─── SECURITY CHECK ────────────────────────────────────────────
        if (userRole === 'agent') {
            if (house && house.agentId && house.agentId.toString() !== userId.toString()) {
                return errorResponse(res, 'Unauthorized to delete this order', 403);
            }
        }
        else if (userRole === 'owner') {
            if (house && house.ownerId && house.ownerId.toString() !== userId.toString()) {
                return errorResponse(res, 'Unauthorized to delete this order', 403);
            }
        }
        // Customers usually don't delete orders (they cancel them via update), 
        // but if they do, we check it here.
        else if (userRole === 'customer' || userRole === 'user') {
            if (order.customerId.toString() !== userId.toString()) {
                return errorResponse(res, 'Unauthorized to delete this order', 403);
            }
        }
        // admin and manager bypass this check
        // ───────────────────────────────────────────────────────────────
        await Order_1.default.findByIdAndDelete(id);
        await Conversation_1.default.deleteMany({ orderId: order._id });
        await Feedback_1.default.deleteMany({ orderId: order._id });
        successResponse(res, null, 'Order deleted successfully');
    }
    catch (error) {
        errorResponse(res, error.message, 500);
    }
};
exports.deleteOrder = deleteOrder;
const getOrderStatistics = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        let filter = {};
        // ─── ROLE BASED FILTERING ──────────────────────────────────────
        if (userRole === 'customer' || userRole === 'user') {
            filter.customerId = userId;
        }
        else if (userRole === 'agent') {
            const agentHouses = await House_1.default.find({ agentId: userId }).select('_id');
            filter.houseId = { $in: agentHouses.map(h => h._id) };
        }
        else if (userRole === 'owner') {
            const ownerHouses = await House_1.default.find({ ownerId: userId }).select('_id');
            filter.houseId = { $in: ownerHouses.map(h => h._id) };
        }
        // ───────────────────────────────────────────────────────────────
        const totalOrders = await Order_1.default.countDocuments(filter);
        const pendingOrders = await Order_1.default.countDocuments({ ...filter, status: Order_1.OrderStatus.PENDING });
        const underReviewOrders = await Order_1.default.countDocuments({ ...filter, status: Order_1.OrderStatus.UNDER_REVIEW });
        const approvedOrders = await Order_1.default.countDocuments({ ...filter, status: Order_1.OrderStatus.APPROVED });
        const completedOrders = await Order_1.default.countDocuments({ ...filter, status: Order_1.OrderStatus.COMPLETED });
        const rejectedOrders = await Order_1.default.countDocuments({ ...filter, status: Order_1.OrderStatus.REJECTED });
        const totalRevenueResult = await Order_1.default.aggregate([
            { $match: { ...filter, status: { $in: [Order_1.OrderStatus.COMPLETED, Order_1.OrderStatus.APPROVED] } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = totalRevenueResult[0]?.total || 0;
        const ordersByType = await Order_1.default.aggregate([
            { $match: filter },
            { $group: { _id: '$orderType', count: { $sum: 1 } } }
        ]);
        const recentOrders = await Order_1.default.find(filter)
            .populate('houseId', 'title')
            .sort({ created_at: -1 })
            .limit(10);
        successResponse(res, {
            totalOrders,
            pendingOrders,
            underReviewOrders,
            approvedOrders,
            completedOrders,
            rejectedOrders,
            totalRevenue,
            ordersByType,
            recentOrders
        }, 'Order statistics retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching order stats:', error);
        errorResponse(res, error.message, 500);
    }
};
exports.getOrderStatistics = getOrderStatistics;
const getMyOrders = async (req, res) => {
    try {
        const userId = req.user._id;
        const orders = await Order_1.default.find({ customerId: userId })
            .populate('houseId', 'title propertyType pricing.price location.city images')
            .sort({ created_at: -1 });
        successResponse(res, orders, 'My orders retrieved successfully');
    }
    catch (error) {
        errorResponse(res, error.message, 500);
    }
};
exports.getMyOrders = getMyOrders;
