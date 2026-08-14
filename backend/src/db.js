import mongoose from 'mongoose';
import dns from 'node:dns';

// Fix for SRV DNS resolution failures on some local networks
dns.setServers(['8.8.8.8', '1.1.1.1']);

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not defined in the environment variables.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error('If this is an IP Whitelist error, please ensure your IP is whitelisted on MongoDB Atlas (Network Access -> Add IP -> 0.0.0.0/0).');
    process.exit(1);
  }
};
