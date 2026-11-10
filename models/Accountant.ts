import mongoose from 'mongoose';

const bankAccountSubSchema = new mongoose.Schema({
  bankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bank', required: true },
  bankName: { type: String, required: true, trim: true },
  bankCode: { type: String, required: true, trim: true, uppercase: true },
  accountHolderName: { type: String, required: true, trim: true },
  accountNumber: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (v: string) => /^[A-Za-z0-9]{6,25}$/.test(v),
      message: 'Account number must be 6-25 alphanumeric characters'
    }
  },
  isBlocked: { type: Boolean, default: false }
}, { _id: true, timestamps: true });

const accountantSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isBlocked: { type: Boolean, default: false },

  accounts: {
    type: [bankAccountSubSchema],
    default: [],
    validate: {
      validator: function (accounts: any[]) {
        if (!accounts || accounts.length === 0) return false;
        const bankIds = accounts.map(a => String(a.bankId));
        return new Set(bankIds).size === bankIds.length;
      },
      message: 'At least one account is required, and each bank/wallet can only appear once'
    }
  }
}, { timestamps: true });

accountantSchema.index({ ownerId: 1, isBlocked: 1 });
accountantSchema.index({ agentId: 1 });
accountantSchema.index({ 'accounts.bankId': 1 });
accountantSchema.index({ 'accounts.accountNumber': 1 });
accountantSchema.index({ 'accounts.accountHolderName': 1 });
accountantSchema.index({ createdAt: 1 });

const Accountant = mongoose.model('Accountant', accountantSchema);
export default Accountant;