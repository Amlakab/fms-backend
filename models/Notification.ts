import mongoose, { Document, Schema } from 'mongoose';

export enum NotificationType {
  APPOINTMENT = 'APPOINTMENT',
  RENT_DUE = 'RENT_DUE',
  RENTAL_APPLICATION = 'RENTAL_APPLICATION',
  LEASE_UPDATE = 'LEASE_UPDATE',
  OFFER_UPDATE = 'OFFER_UPDATE',
  NEW_MATCHING_PROPERTY = 'NEW_MATCHING_PROPERTY',
  MAINTENANCE_UPDATE = 'MAINTENANCE_UPDATE',
  VERIFICATION = 'VERIFICATION',
  SYSTEM = 'SYSTEM'
}

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: Object.values(NotificationType),
    default: NotificationType.SYSTEM
  },
  link: String,
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

export default mongoose.model<INotification>('Notification', notificationSchema);
