import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'node:dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config();

// Attempt direct connection to shard-00-00
const directUri = 'mongodb://Divyam:DIVyam%4031@ac-wmkbihj-shard-00-00.kyihq3x.mongodb.net:27017/healthtrack-ai?ssl=true&authSource=admin&retryWrites=true&w=majority';

console.log('Testing direct URI:', directUri);

const test = async () => {
  try {
    console.log('Connecting directly to shard...');
    await mongoose.connect(directUri);
    console.log('✔ Direct connection successful!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Direct connection failed:', err);
    process.exit(1);
  }
};

test();
