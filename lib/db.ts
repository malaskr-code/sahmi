import mongoose from "mongoose";

const globalDb = globalThis as typeof globalThis & {
  sahmiMongo?: { connection: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};
const cache = globalDb.sahmiMongo ??= { connection: null, promise: null };

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing. Add it in Replit Secrets.");
  if (cache.connection) return cache.connection;
  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
      bufferCommands: false,
    }).catch(() => {
      cache.promise = null;
      throw new Error("Unable to connect to MongoDB. Check the database configuration and network access.");
    });
  }
  cache.connection = await cache.promise;
  return cache.connection;
}
