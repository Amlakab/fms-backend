
import 'dotenv/config';
import mongoose from 'mongoose';
import House from '../models/House';

async function run() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not set in .env');
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const houseId = '6adf75a61e1ab306a0375b56';

    const house = await House.findByIdAndUpdate(
      houseId,
      { $set: { transactionType: 'BUY' } },
      { new: true, runValidators: true }
    );

    if (!house) {
      console.log('House not found.');
      return;
    }

    console.log('House updated successfully!');
    console.log('ID:', house._id.toString());
    console.log('Title:', house.title);
    console.log('Transaction Type:', house.transactionType);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
}

run().catch((error) => {
  console.error('Update failed:', error);
  process.exitCode = 1;
});
