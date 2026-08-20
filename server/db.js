const mongoose = require('mongoose');

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
    console.log(`Attempting to connect to MongoDB at: ${uri}`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500 // Don't hang on offline MongoDB
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
    mode: isMongoConnected ? 'MongoDB (Mongoose)' : 'Resilient In-Memory Database'
  };
}

module.exports = {
  connectDB,
  getStatus,
  fallbackStore,
  isMongoConnected: () => isMongoConnected
};
