import { Request, Response } from 'express';
import Order, { IOrder, OrderStatus, OrderType, PaymentStatus } from '../models/Order';
import House from '../models/House';
import Conversation from '../models/Conversation';
import Feedback from '../models/Feedback';
import mongoose from 'mongoose';
import { hydrateHouseRefs } from '../utils/houseRef';

const successResponse = (res: Response, data: any, message: string = 'Success', statusCode: number = 200) => {
  res.status(statusCode).json({ success: true, message, data });
};

const errorResponse = (res: Response, message: string = 'Error', statusCode: number = 500) => {
  res.status(statusCode).json({ success: false, message });
};

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string || '';
    const orderType = req.query.orderType as string || '';
    const search = req.query.search as string || '';
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;

    const skip = (page - 1) * limit;
    const filter: any = {};

    // ─── ROLE BASED FILTERING ──────────────────────────────────────
    if (userRole === 'customer' || userRole === 'user') {
      filter.customerId = userId;
    } 
    else if (userRole === 'agent') {
      const agentHouses = await House.find({ agentId: userId }).select('_id');
      filter.houseId = { $in: agentHouses.map(h => h._id) };
    } 
    else if (userRole === 'owner') {
      const ownerHouses = await House.find({ ownerId: userId }).select('_id');
      filter.houseId = { $in: ownerHouses.map(h => h._id) };
    }
    // admin and manager see everything (no filter applied)
    // ───────────────────────────────────────────────────────────────

    if (status) filter.status = status;
    if (orderType) filter.orderType = orderType;
    
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await Order.find(filter)
      .populate('houseId', 'title propertyType pricing.price location.city')
      .populate('customerId', 'name email profile.phone')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    successResponse(res, {
      orders: hydrateHouseRefs(orders.map(o => o.toObject())),
      pagination: {
        currentPage: page,
        totalPages,
        totalOrders,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, 'Orders retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    errorResponse(res, error.message, 500);
  }
};

export const getOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid order ID', 400);
    }

    const order = await Order.findById(id)
      .populate('houseId', 'title description propertyType pricing location images agentId ownerId agentName')
      .populate('customerId', 'name email profile.phone profile.avatar')
      .populate('timeline.updatedBy', 'name email');

    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    // ─── SECURITY CHECK ────────────────────────────────────────────
    const house = order.houseId as any; // Type assertion since it's populated

    if (userRole === 'customer' || userRole === 'user') {
      if (order.customerId && (order.customerId as any)._id?.toString() !== userId.toString()) {
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

    successResponse(res, hydrateHouseRefs(order.toObject()), 'Order retrieved successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const {
      houseId,
      orderType,
      details,
      totalAmount,
      quantity = 1
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(houseId)) {
      return errorResponse(res, 'Invalid house ID', 400);
    }

    const house = await House.findById(houseId);
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
      } catch (e) {
        parsedDetails = {};
      }
    }

    parsedDetails.quantity = quantity;

    const finalTotal = Number(totalAmount) || (house.pricing.price * quantity);
    const plan = req.body.paymentPlan === 'FULL' ? 'FULL' : 'PARTIAL';
    const advanceAmt = plan === 'FULL' ? finalTotal : Math.round(finalTotal * 0.25);
    const finalAmt = plan === 'FULL' ? 0 : (finalTotal - advanceAmt);

    const newOrder = new Order({
      houseId,
      customerId: (req as any).user._id,
      customerName: (req as any).user.name || 'Customer',
      customerEmail: (req as any).user.email,
      customerPhone: req.body.customerPhone || (req as any).user.profile?.phone || '',
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
        status: OrderStatus.PENDING,
        comment: `Order created for ${quantity} ${quantity > 1 ? 'units' : 'unit'} (${plan === 'FULL' ? '100% Full Payment' : '25% Partial Payment Plan'})`,
        updatedBy: (req as any).user._id
      }]
    });

    await newOrder.save();

    // Update house inquiries count
    await House.findByIdAndUpdate(houseId, { $inc: { inquiries: 1 } });

    // Create conversation
    const conversation = new Conversation({
      participants: [(req as any).user._id, house.agentId],
      orderId: newOrder._id,
      houseId,
      lastMessage: `Order created: ${orderType} request for ${house.title} (${quantity} ${quantity > 1 ? 'units' : 'unit'})`,
      lastMessageAt: new Date(),
      unreadCount: new Map([[house.agentId.toString(), 1]])
    });
    await conversation.save();

    // Create feedback record for the order
    const feedback = new Feedback({
      phone: (req as any).user.profile?.phone || '',
      email: (req as any).user.email,
      name: (req as any).user.name,
      subject: `Order ${newOrder._id} - ${orderType}`,
      message: `Order created for ${house.title}. Quantity: ${quantity}. Total: ${totalAmount}`,
      orderId: newOrder._id
    });
    await feedback.save();

    // Populate the response
    const populatedOrder = await Order.findById(newOrder._id)
      .populate('houseId', 'title propertyType pricing.location.city')
      .populate('customerId', 'name email');

    successResponse(res, populatedOrder, 'Order created successfully', 201);
  } catch (error: any) {
    console.error('Error creating order:', error);
    errorResponse(res, error.message || 'Failed to create order', 500);
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;

    if (!Object.values(OrderStatus).includes(status)) {
      return errorResponse(res, 'Invalid status', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid order ID', 400);
    }

    const order = await Order.findById(id).populate('houseId', 'agentId ownerId title status');
    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    const house = order.houseId as any;

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
      if (order.customerId.toString() !== userId.toString() || status !== OrderStatus.CANCELLED) {
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

    const updatePayload: any = {
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
    if (status === OrderStatus.COMPLETED) {
      updatePayload.productTakenAt = new Date();
      updatePayload.productionProgress = 100;
      updatePayload.productionStage = 'TAKEN_BY_CUSTOMER';
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true, runValidators: true }
    );

    if (status === OrderStatus.APPROVED) {
      if (house && house.status === 'AVAILABLE') {
        const newStatus = order.orderType === 'PURCHASE' ? 'SOLD' : 'RENTED';
        await House.findByIdAndUpdate(house._id, { status: newStatus });
      }
    }

    const conversation = await Conversation.findOne({ orderId: order._id });
    if (conversation) {
      conversation.lastMessage = `Order status updated to ${status}: ${comment || ''}`;
      conversation.lastMessageAt = new Date();
      
      const receiverId = userId.toString() === order.customerId.toString() ? house.agentId : order.customerId;
      const currentUnread = conversation.unreadCount.get(receiverId.toString()) || 0;
      conversation.unreadCount.set(receiverId.toString(), currentUnread + 1);
      
      await conversation.save();
    }

    // Update feedback
    await Feedback.findOneAndUpdate(
      { orderId: order._id },
      { status: status === 'COMPLETED' ? 'responded' : 'pending' }
    );

    successResponse(res, updatedOrder, 'Order status updated successfully');
  } catch (error: any) {
    console.error('Error updating order status:', error);
    errorResponse(res, error.message, 500);
  }
};

export const deleteOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid order ID', 400);
    }

    const order = await Order.findById(id).populate('houseId', 'agentId ownerId');
    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    const house = order.houseId as any;

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

    await Order.findByIdAndDelete(id);
    await Conversation.deleteMany({ orderId: order._id });
    await Feedback.deleteMany({ orderId: order._id });

    successResponse(res, null, 'Order deleted successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

export const getOrderStatistics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;

    let filter: any = {};
    
    // ─── ROLE BASED FILTERING ──────────────────────────────────────
    if (userRole === 'customer' || userRole === 'user') {
      filter.customerId = userId;
    } 
    else if (userRole === 'agent') {
      const agentHouses = await House.find({ agentId: userId }).select('_id');
      filter.houseId = { $in: agentHouses.map(h => h._id) };
    } 
    else if (userRole === 'owner') {
      const ownerHouses = await House.find({ ownerId: userId }).select('_id');
      filter.houseId = { $in: ownerHouses.map(h => h._id) };
    }
    // ───────────────────────────────────────────────────────────────

    const totalOrders = await Order.countDocuments(filter);
    const pendingOrders = await Order.countDocuments({ ...filter, status: OrderStatus.PENDING });
    const underReviewOrders = await Order.countDocuments({ ...filter, status: OrderStatus.UNDER_REVIEW });
    const approvedOrders = await Order.countDocuments({ ...filter, status: OrderStatus.APPROVED });
    const completedOrders = await Order.countDocuments({ ...filter, status: OrderStatus.COMPLETED });
    const rejectedOrders = await Order.countDocuments({ ...filter, status: OrderStatus.REJECTED });

    const totalRevenueResult = await Order.aggregate([
      { $match: { ...filter, status: { $in: [OrderStatus.COMPLETED, OrderStatus.APPROVED] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    const ordersByType = await Order.aggregate([
      { $match: filter },
      { $group: { _id: '$orderType', count: { $sum: 1 } } }
    ]);

    const recentOrders = await Order.find(filter)
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
  } catch (error: any) {
    console.error('Error fetching order stats:', error);
    errorResponse(res, error.message, 500);
  }
};

export const getMyOrders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    
    const orders = await Order.find({ customerId: userId })
      .populate('houseId', 'title propertyType pricing.price location.city images')
      .sort({ created_at: -1 });

    successResponse(res, orders, 'My orders retrieved successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};