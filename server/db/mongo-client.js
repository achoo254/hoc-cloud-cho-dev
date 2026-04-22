import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hoc_cloud_cho_dev_db';

export async function connectMongo(retries = 3) {
  if (mongoose.connection.readyState === 1) return;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(MONGODB_URI, {
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 5000,
      });
      console.log('[mongo] Connected to MongoDB');
      return;
    } catch (err) {
      console.error(`[mongo] Connection attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

export async function disconnectMongo() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  console.log('[mongo] Disconnected');
}

export function getMongoStatus() {
  return {
    connected: mongoose.connection.readyState === 1,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
  };
}

export default mongoose;
