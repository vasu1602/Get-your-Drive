const mongoose = require('mongoose');
const dns = require('dns');

// Configure public DNS for MongoDB Atlas SRV lookup reliability
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore in environments where custom DNS servers cannot be set
}

let isMongoConnected = false;

// In-memory / persistent fallback storage if MongoDB is not reachable
const fallbackStore = {
  users: new Map(),
  otpTokens: new Map(),
  cars: new Map(),
  bookings: new Map()
};

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/getyourdrive';
  
  try {
    const maskedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log(`Attempting to connect to MongoDB at: ${maskedUri}`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    isMongoConnected = true;
    console.log('✅ Connected to MongoDB Database successfully.');
  } catch (err) {
    isMongoConnected = false;
    console.warn('⚠️ MongoDB connection could not be established:', err.message);
    console.log('🔄 Running in resilient In-Memory/Data Store mode. Connect to MongoDB anytime by setting MONGODB_URI.');
  }
}

function getStatus() {
  return {
    isMongoConnected,
    mode: isMongoConnected ? 'MongoDB (Atlas Cloud)' : 'Resilient In-Memory Database'
  };
}

module.exports = {
  connectDB,
  getStatus,
  fallbackStore,
  isMongoConnected: () => isMongoConnected
};
