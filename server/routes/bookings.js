const express = require('express');
const router = express.Router();
const { isMongoConnected, fallbackStore } = require('../db');
const Booking = require('../models/Booking');
const FirebaseDB = require('../firebaseDb');
const { optionalAuth, authenticateToken } = require('../middleware/auth');

// Initial default booking
const DEFAULT_BOOKING = {
  id: 'BK-1092',
  carName: 'Tesla Model 3 Long Range',
  carImage: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80',
  pickupDate: '2026-08-22',
  returnDate: '2026-08-25',
  days: 3,
  totalPrice: 237,
  location: 'Downtown Center (Main Station)',
  driverName: 'Alex Vance',
  driverEmail: 'alex.vance@example.com',
  status: 'Confirmed',
  userId: 'user-demo'
};

fallbackStore.bookings.set(DEFAULT_BOOKING.id, DEFAULT_BOOKING);

// GET /api/bookings -> Get bookings (all or user-specific)
router.get('/', optionalAuth, async (req, res) => {
  try {
    let bookings = [];
    if (isMongoConnected()) {
      if (req.user) {
        bookings = await Booking.find({
          $or: [{ userId: req.user.id }, { driverEmail: req.user.email }]
        }).sort({ createdAt: -1 });
      } else {
        bookings = await Booking.find().sort({ createdAt: -1 });
      }
    } else {
      bookings = Array.from(fallbackStore.bookings.values());
      if (req.user) {
        bookings = bookings.filter(b => b.userId === req.user.id || b.driverEmail === req.user.email);
      }
    }
    return res.status(200).json({ bookings });
  } catch (err) {
    console.error('Error fetching bookings:', err);
    return res.status(500).json({ error: 'Failed to fetch bookings.' });
  }
});

// POST /api/bookings -> Create reservation
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { carId, carName, carImage, pickupDate, returnDate, days, totalPrice, location, driverName, driverPhone, driverEmail } = req.body;

    if (!carName || !pickupDate || !returnDate || !totalPrice) {
      return res.status(400).json({ error: 'Missing required booking details.' });
    }

    const newBooking = {
      id: 'BK-' + Math.floor(1000 + Math.random() * 9000),
      carId,
      carName,
      carImage: carImage || 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80',
      pickupDate,
      returnDate,
      days: parseInt(days, 10) || 1,
      totalPrice: parseFloat(totalPrice) || 0,
      location: location || 'Downtown Center',
      driverName: driverName || 'Guest Driver',
      driverPhone: driverPhone || '',
      driverEmail: driverEmail || (req.user ? req.user.email : ''),
      status: 'Confirmed',
      userId: req.user ? String(req.user.id) : null,
      createdAt: new Date()
    };

    let createdBooking;
    if (isMongoConnected()) {
      createdBooking = await Booking.create(newBooking);
    } else {
      fallbackStore.bookings.set(newBooking.id, newBooking);
      createdBooking = newBooking;
    }

    // Sync to Firebase Realtime Database
    FirebaseDB.saveBooking(createdBooking).catch(e => console.warn('Firebase RTDB booking sync:', e.message));

    return res.status(201).json({
      success: true,
      message: 'Reservation created successfully!',
      booking: createdBooking
    });
  } catch (err) {
    console.error('Error creating booking:', err);
    return res.status(500).json({ error: 'Failed to create reservation.' });
  }
});

// DELETE /api/bookings/:id -> Cancel reservation
router.delete('/:id', async (req, res) => {
  try {
    const bookingId = req.params.id;

    if (isMongoConnected()) {
      const result = await Booking.deleteOne({ id: bookingId });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Reservation not found.' });
      }
    } else {
      if (!fallbackStore.bookings.has(bookingId)) {
        return res.status(404).json({ error: 'Reservation not found.' });
      }
      fallbackStore.bookings.delete(bookingId);
    }

    // Sync deletion to Firebase Realtime Database
    FirebaseDB.deleteBooking(bookingId).catch(e => console.warn('Firebase RTDB booking delete sync:', e.message));

    return res.status(200).json({
      success: true,
      message: 'Reservation cancelled successfully.'
    });
  } catch (err) {
    console.error('Error cancelling booking:', err);
    return res.status(500).json({ error: 'Failed to cancel reservation.' });
  }
});

module.exports = router;
