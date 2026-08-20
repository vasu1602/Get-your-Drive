require('dotenv').config();
const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const { connectDB, getStatus } = require('../../server/db');

const authRoutes = require('../../server/routes/auth');
const carRoutes = require('../../server/routes/cars');
const bookingRoutes = require('../../server/routes/bookings');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Connect to DB (cached across warm lambda invocations)
let dbPromise = null;
app.use(async (req, res, next) => {
  if (!dbPromise) {
    dbPromise = connectDB().catch(err => {
      console.warn('DB connection error in serverless function:', err.message);
    });
  }
  try {
    await dbPromise;
  } catch (e) {
    // Graceful fallback
  }
  next();
});

// API Router
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/cars', carRoutes);
apiRouter.use('/bookings', bookingRoutes);

apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'Netlify Functions',
    brand: 'Get Your Drive',
    timestamp: new Date().toISOString(),
    database: getStatus()
  });
});

// Mount router on multiple common paths
app.use('/.netlify/functions/api', apiRouter);
app.use('/api', apiRouter);
app.use('/', apiRouter);

module.exports.handler = serverless(app);
