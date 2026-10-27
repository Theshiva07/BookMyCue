import dotenv from 'dotenv';
import mongoose from 'mongoose';
import neo4j, { Driver } from 'neo4j-driver';

dotenv.config();

export let neo4jDriver: Driver | null = null;
export let isNeo4jConnected = false;
export let isMongoConnected = false;

export async function connectDatabases(): Promise<{ mongoConnected: boolean; neo4jConnected: boolean }> {
  // 1. Attempt MongoDB Connection
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cuemybreak';
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    isMongoConnected = true;
    console.log('✅ MongoDB connected successfully to', mongoUri);
  } catch (err) {
    console.warn('⚠️ MongoDB connection failed or not available. Using high-performance document store fallback.');
    isMongoConnected = false;
  }

  // 2. Attempt Neo4j Connection
  const neo4jUri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const neo4jUser = process.env.NEO4J_USER || 'neo4j';
  const neo4jPassword = process.env.NEO4J_PASSWORD || 'password';

  try {
    neo4jDriver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPassword));
    await neo4jDriver.verifyConnectivity();
    isNeo4jConnected = true;
    console.log('✅ Neo4j connected successfully to', neo4jUri);
  } catch (err) {
    console.warn('⚠️ Neo4j connection failed or not available. Using embedded graph database engine.');
    isNeo4jConnected = false;
    neo4jDriver = null;
  }

  return { mongoConnected: isMongoConnected, neo4jConnected: isNeo4jConnected };
}

export async function closeDatabases() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (neo4jDriver) {
    await neo4jDriver.close();
  }
}
