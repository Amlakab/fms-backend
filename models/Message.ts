import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  orderId?: mongoose.Types.ObjectId;
  houseId: mongoose.Types.ObjectId;
  phone?: string;
  email?: string;
  name?: string;
  subject: string;
  message: string;
  response?: string;
  status: 'pending' | 'responded';
  isRead: boolean;
  createdAt: Date;
  respondedAt?: Date;
}

const messageSchema = new Schema<IMessage>({
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: false
  },
  houseId: {
    type: Schema.Types.ObjectId,
    ref: 'House',
    required: true
  },
  phone: {
    type: String,
    required: function(this: IMessage) {
      return !this.email && !this.orderId;
    },
    match: [/^09\d{8}$/, 'Please enter a valid Ethiopian phone number'],
    sparse: true
  },
  email: {
    type: String,
    required: function(this: IMessage) {
      return !this.phone && !this.orderId;
    },
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    sparse: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  subject: {
    type: String,
    required: true,
    enum: [
      'general',
      'property-inquiry',
      'booking-request',
      'payment-issue',
      'order-message',
      'support',
      'other'
    ],
    default: 'general'
  },

  message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  response: {
    type: String,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['pending', 'responded'],
    default: 'pending'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  respondedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Update respondedAt when response is added
messageSchema.pre('save', function(next) {
  if (this.isModified('response') && this.response && this.response.length > 0) {
    this.status = 'responded';
    this.respondedAt = new Date();
  }
  next();
});

// Indexes
messageSchema.index({ houseId: 1 });
messageSchema.index({ orderId: 1 });
messageSchema.index({ createdAt: -1 });

export default mongoose.model<IMessage>('Message', messageSchema);