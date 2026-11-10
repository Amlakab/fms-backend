import mongoose, { Document, Schema } from 'mongoose';

export enum AppointmentStatus {
  REQUESTED = 'REQUESTED',
  CONFIRMED = 'CONFIRMED',
  RESCHEDULED = 'RESCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

export enum VisitType {
  IN_PERSON = 'IN_PERSON',
  VIRTUAL_TOUR = 'VIRTUAL_TOUR'
}

export interface IAppointment extends Document {
  houseId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  hostId: mongoose.Types.ObjectId; // Owner or Agent
  visitDate: Date;
  timeSlot: string; // e.g., '10:00 AM - 11:00 AM'
  visitType: VisitType;
  numberOfVisitors: number;
  notes?: string;
  status: AppointmentStatus;
  rescheduledDate?: Date;
  rescheduledTimeSlot?: string;
  rescheduledReason?: string;
  feedback?: {
    rating: number;
    interestLevel: 'high' | 'medium' | 'low' | 'not_interested';
    comments: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>({
  houseId: {
    type: Schema.Types.ObjectId,
    ref: 'House',
    required: true,
    index: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  hostId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  visitDate: {
    type: Date,
    required: true
  },
  timeSlot: {
    type: String,
    required: true
  },
  visitType: {
    type: String,
    enum: Object.values(VisitType),
    default: VisitType.IN_PERSON
  },
  numberOfVisitors: {
    type: Number,
    default: 1,
    min: 1
  },
  notes: String,
  status: {
    type: String,
    enum: Object.values(AppointmentStatus),
    default: AppointmentStatus.REQUESTED
  },
  rescheduledDate: Date,
  rescheduledTimeSlot: String,
  rescheduledReason: String,
  feedback: {
    rating: Number,
    interestLevel: {
      type: String,
      enum: ['high', 'medium', 'low', 'not_interested']
    },
    comments: String
  }
}, {
  timestamps: true
});

appointmentSchema.index({ customerId: 1, visitDate: 1 });
appointmentSchema.index({ hostId: 1, visitDate: 1 });
appointmentSchema.index({ houseId: 1, status: 1 });

export default mongoose.model<IAppointment>('Appointment', appointmentSchema);
