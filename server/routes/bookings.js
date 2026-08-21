const express = require('express');
const router = express.Router();
const { fallbackStore } = require('../db');
const FirebaseDB = require('../firebaseDb');
const { optionalAuth } = require('../middleware/auth');

// GET /api/bookings -> Get bookings (user-specific or empty for guests from Firebase Realtime Database)
router.get('/', optionalAuth, async (req, res) => {
  try {
    let bookings = [];
    if (req.user) {
      bookings = await FirebaseDB.getUserBookings(req.user.id, req.user.email);
    } else {
      bookings = [];
    }

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (err) {
    console.error('Error fetching bookings:', err);
    return res.status(200).json({ success: true, count: 0, bookings: [] });
  }
});

// POST /api/bookings -> Create reservation in Firebase Realtime Database
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
      createdAt: new Date().toISOString()
    };

    fallbackStore.bookings.set(newBooking.id, newBooking);
    await FirebaseDB.saveBooking(newBooking);

    return res.status(201).json({
      success: true,
      message: 'Reservation created successfully!',
      booking: newBooking
    });
  } catch (err) {
    console.error('Error creating booking:', err);
    return res.status(500).json({ error: 'Failed to create reservation.' });
  }
});

// DELETE /api/bookings/:id -> Cancel reservation from Firebase Realtime Database
router.delete('/:id', async (req, res) => {
  try {
    const bookingId = req.params.id;

    fallbackStore.bookings.delete(bookingId);
    await FirebaseDB.deleteBooking(bookingId);

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
