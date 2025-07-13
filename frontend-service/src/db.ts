// YOUR CODE HERE
import { MongoClient, Db, Collection } from 'mongodb';
import { PnLCalculation } from './types';

let db: Db;
let client: MongoClient;

export async function connectToDatabase(): Promise<Db> {
  try {
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://database:27017';
    client = new MongoClient(mongoUrl);
    
    await client.connect();
    console.log('Frontend service connected to MongoDB successfully');
    
    db = client.db('trading-system');
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectToDatabase() first.');
  }
  return db;
}

export function getPnLCollection(): Collection<PnLCalculation> {
  return getDatabase().collection<PnLCalculation>('pnl-calculations');
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    console.log('Frontend service MongoDB connection closed');
  }
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('Frontend service received SIGINT, closing database connection...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Frontend service received SIGTERM, closing database connection...');
  await closeDatabase();
  process.exit(0);
});