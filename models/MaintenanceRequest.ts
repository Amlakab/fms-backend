import mongoose, { Document, Schema } from 'mongoose';

export enum MaintenanceStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum MaintenancePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  EMERGENCY = 'EMERGENCY'
}

export interface IMaintenanceRequest extends Document {
  houseId: mongoose.Types.ObjectId;
  leaseId?: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  tenantName: string;
  tenantPhone: string;
  landlordId: mongoose.Types.ObjectId;
  category: 'PLUMBING' | 'ELECTRICAL' | 'HVAC_HEATING' | 'APPLIANCE' | 'STRUCTURAL' | 'ROOF_LEAK' | 'SECURITY_LOCKS' | 'OTHER';
  priority: MaintenancePriority;
  title: string;
  description: string;
  status: MaintenanceStatus;
  images?: string[];
  assignedTechnician?: string;
  technicianContact?: string;
  estimatedCost?: number;
  actualCost?: number;
  scheduledDate?: Date;
  completedAt?: Date;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const maintenanceRequestSchema = new Schema<IMaintenanceRequest>({
  houseId: {
    type: Schema.Types.ObjectId,
    ref: 'House',
    required: true,
    index: true
  },
  leaseId: {
    type: Schema.Types.ObjectId,
    ref: 'LeaseAgreement'
  },
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tenantName: { type: String, required: true },
  tenantPhone: { type: String, required: true },
  landlordId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['PLUMBING', 'ELECTRICAL', 'HVAC_HEATING', 'APPLIANCE', 'STRUCTURAL', 'ROOF_LEAK', 'SECURITY_LOCKS', 'OTHER'],
    required: true
  },
  priority: {
    type: String,
    enum: Object.values(MaintenancePriority),
    default: MaintenancePriority.MEDIUM
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: Object.values(MaintenanceStatus),
    default: MaintenanceStatus.PENDING
  },
  images: [String],
  assignedTechnician: String,
  technicianContact: String,
  estimatedCost: { type: Number, default: 0 },
  actualCost: { type: Number, default: 0 },
  scheduledDate: Date,
  completedAt: Date,
  resolutionNotes: String
}, {
  timestamps: true
});

maintenanceRequestSchema.index({ tenantId: 1, status: 1 });
maintenanceRequestSchema.index({ landlordId: 1, status: 1 });
maintenanceRequestSchema.index({ houseId: 1, status: 1 });

export default mongoose.model<IMaintenanceRequest>('MaintenanceRequest', maintenanceRequestSchema);
