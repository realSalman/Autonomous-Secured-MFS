import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set in environment variables');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('[DB] Connected to MongoDB');
  } catch (error) {
    console.error('[DB] Connection failed:', error);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('[DB] Runtime error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] Disconnected');
  });
}

export default mongoose;
