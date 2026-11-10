import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILoan extends Document {
  loanerId: string;
  name: string;
  amount: number;
  reason: string;
  loanType: 'TAKEN' | 'GIVEN';
  date: Date;
  status: 'UNPAID' | 'PAID';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const loanSchema = new Schema<ILoan>({
  loanerId: {
    type: String,
    required: [true, 'Loaner ID is required'],
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Loaner name is required'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true,
  },
  loanType: {
    type: String,
    enum: ['TAKEN', 'GIVEN'],
    required: [true, 'Loan type is required']
  },
  date: {
    type: Date,
    required: [true, 'Loan date is required'],
    default: Date.now
  },
  status: {
    type: String,
    enum: ['UNPAID', 'PAID'],
    default: 'UNPAID'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
});

// Generate loan ID before saving
loanSchema.pre('save', async function(next) {
  if (!this.isNew) return next();
  
  try {
    const Loan = mongoose.model<ILoan>('Loan');
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const baseId = `LOAN-${year}${month}${day}`;
    
    // Find the highest sequence number for today
    const lastLoan = await Loan.findOne({
      loanId: new RegExp(`^${baseId}-\\d+$`)
    }).sort({ loanId: -1 }).limit(1);
    
    let sequence = 1;


  } catch (error: any) {
    next(error);
  }
});

// Indexes for better query performance
loanSchema.index({ loanerId: 1 });
loanSchema.index({ name: 1 });
loanSchema.index({ loanType: 1 });
loanSchema.index({ status: 1 });
loanSchema.index({ date: -1 });
loanSchema.index({ createdBy: 1 });
loanSchema.index({ amount: 1 });

// Virtual for formatted date
loanSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
});

// Virtual for formatted amount
loanSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB'
  }).format(this.amount);
});

// Ensure virtuals are included in JSON output
loanSchema.set('toJSON', { virtuals: true });
loanSchema.set('toObject', { virtuals: true });

export default mongoose.model<ILoan>('Loan', loanSchema);