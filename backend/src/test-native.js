import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import dns from 'node:dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config();

const uri = process.env.MONGO_URI;

console.log('Testing native client with URI:', uri);

const test = async () => {
  const client = new MongoClient(uri);
  try {
    console.log('Connecting...');
    await client.connect();
    console.log('✔ Native connection successful!');
    
    // List databases to verify access
    const dbs = await client.db('admin').admin().listDatabases();
    console.log('Databases available:', dbs.databases.map(d => d.name));
    
    await client.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Native connection failed:', err);
    process.exit(1);
  }
};

test();
