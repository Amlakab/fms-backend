import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  performedBy: mongoose.Types.ObjectId;
  userName: string;
  userRole: string;
  entityType: 'HOUSE' | 'USER' | 'LEASE' | 'OFFER' | 'PAYMENT' | 'VERIFICATION' | 'REPORT' | 'CONFIG';
  entityId?: string;
  details: string;
  ipAddress?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  action: {
    type: String,
    required: true
  },
  performedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    required: true
  },
  entityType: {
    type: String,
    enum: ['HOUSE', 'USER', 'LEASE', 'OFFER', 'PAYMENT', 'VERIFICATION', 'REPORT', 'CONFIG'],
    required: true
  },
  entityId: String,
  details: {
    type: String,
    required: true
  },
  ipAddress: String
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ entityType: 1 });
auditLogSchema.index({ createdAt: -1 });

export default mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
