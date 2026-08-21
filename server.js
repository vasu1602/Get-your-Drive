require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { getStatus } = require('./server/db');

const authRoutes = require('./server/routes/auth');
const carRoutes = require('./server/routes/cars');
const bookingRoutes = require('./server/routes/bookings');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/bookings', bookingRoutes);

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    brand: 'Get Your Drive',
    timestamp: new Date().toISOString(),
    database: getStatus()
  });
});

// Single Page Application Fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚗 GET YOUR DRIVE Server running on http://localhost:${PORT}`);
  console.log(`🔥 Realtime Cloud Database: Firebase Realtime Database`);
  console.log(`📡 REST API active on http://localhost:${PORT}/api/`);
  console.log(`======================================================\n`);
});
