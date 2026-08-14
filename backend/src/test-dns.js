import dns from 'node:dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI;

console.log('Using connection string:', MONGO_URI);

const test = async () => {
  try {
    console.log('Attempting connection...');
    await mongoose.connect(MONGO_URI);
    console.log('Connection successful!');
    process.exit(0);
  } catch (err) {
    console.error('Connection failed:', err);
    process.exit(1);
  }
};

test();
