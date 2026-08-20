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

const ATLAS_DEFAULT_URI = 'mongodb+srv://vasuhapani2005_db_user:yucPx0jHleCs4GOg@getyourdrive.6bawfic.mongodb.net/getyourdrive?retryWrites=true&w=majority&appName=GetYourDrive';

async function connectDB() {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    isMongoConnected = true;
    return;
  }

  const uri = process.env.MONGODB_URI || ATLAS_DEFAULT_URI;
  
  try {
    const maskedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log(`Attempting to connect to MongoDB at: ${maskedUri}`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      bufferCommands: false
    });
    isMongoConnected = true;
    console.log('✅ Connected to MongoDB Atlas Cloud Database successfully.');
  } catch (err) {
    isMongoConnected = false;
    console.warn('⚠️ MongoDB connection warning:', err.message);
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
