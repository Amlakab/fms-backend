import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bingo-platform');
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Ensure Menu collection drops legacy single name_1 index if present
    try {
      const menuCollection = mongoose.connection.collection('menus');
      const indexes = await menuCollection.indexes();
      const hasName1 = indexes.some((idx: any) => idx.name === 'name_1');
      if (hasName1) {
        await menuCollection.dropIndex('name_1');
        console.log('Dropped obsolete name_1 index from menus collection');
      }
    } catch (e: any) {
      // ignore if collection or index doesn't exist
    }
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};