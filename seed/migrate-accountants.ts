import 'dotenv/config';
import mongoose from 'mongoose';
import Accountant from '../models/Accountant';
import Bank from '../models/Bank';
import User from '../models/User';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set. Check your .env file.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(`✅ Connected to MongoDB: ${mongoose.connection.host}`);

  // 1. Find an admin to assign ownership of legacy records to
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.error('❌ No admin user found. Create an admin user first, then re-run.');
    process.exit(1);
  }
  console.log(`👤 Using admin: ${(admin as any).email || (admin as any).name || admin._id}`);

  // 2. Load all banks to resolve legacy bankName strings
  const banks = await Bank.find({});
  if (banks.length === 0) {
    console.error('❌ No banks found. Run seed-banks.ts first.');
    process.exit(1);
  }

  const findBank = (name: string) =>
    banks.find(b => b.name.toLowerCase() === String(name || '').toLowerCase()) ||
    banks.find(b => b.code === 'CBE');

  // 3. Find legacy accountants (no accounts[] or empty accounts[])
  const legacy = await Accountant.find({
    $or: [
      { accounts: { $exists: false } },
      { accounts: { $size: 0 } }
    ]
  });

  console.log(`🔍 Found ${legacy.length} legacy accountants to migrate`);

  let migrated = 0, skipped = 0;
  const unmatched: string[] = [];

  for (const doc of legacy) {
    const anyDoc: any = doc.toObject();

    if (!anyDoc.accountNumber || !anyDoc.bankName) {
      skipped++;
      continue;
    }

    const bank = findBank(anyDoc.bankName);
    if (!bank) {
      unmatched.push(anyDoc.bankName);
      skipped++;
      continue;
    }

    // Skip if this (bankId, accountNumber) already exists on another doc
    const num = String(anyDoc.accountNumber).trim().toUpperCase();
    const clash = await Accountant.findOne({
      _id: { $ne: doc._id },
      'accounts.bankId': bank._id,
      'accounts.accountNumber': num
    });
    if (clash) {
      console.warn(`⚠️  Skipping ${doc._id} — account ${num} already exists elsewhere`);
      skipped++;
      continue;
    }

    await Accountant.updateOne(
      { _id: doc._id },
      {
        $set: {
          ownerId: admin._id,
          agentId: admin._id,
          createdBy: admin._id,
          isBlocked: anyDoc.isBlocked ?? false,
          accounts: [{
            bankId: bank._id,
            bankName: bank.name,
            bankCode: bank.code,
            accountHolderName: anyDoc.fullName || 'Unknown',
            accountNumber: num,
            isBlocked: false
          }]
        },
        $unset: {
          fullName: '',
          phoneNumber: '',
          accountNumber: '',
          bankName: ''
        }
      }
    );
    migrated++;
  }

  console.log(`\n✅ Migration complete`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Skipped:  ${skipped}`);
  if (unmatched.length > 0) {
    console.log(`   Unmatched bank names:`, unmatched);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error('❌ Migration failed:', e);
  process.exit(1);
});