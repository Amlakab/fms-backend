import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  orderId: mongoose.Types.ObjectId;
  houseId: mongoose.Types.ObjectId;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: Map<string, number>;
  created_at: Date;
  updated_at: Date;
}

const conversationSchema = new Schema<IConversation>({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  houseId: {
    type: Schema.Types.ObjectId,
    ref: 'House',
    required: true
  },
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ orderId: 1 });
conversationSchema.index({ lastMessageAt: -1 });

export default mongoose.model<IConversation>('Conversation', conversationSchema);