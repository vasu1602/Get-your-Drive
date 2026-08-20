const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  carId: { type: String },
  carName: { type: String, required: true },
  carImage: { type: String },
  pickupDate: { type: String, required: true },
  returnDate: { type: String, required: true },
  days: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  location: { type: String, required: true },
  driverName: { type: String, required: true },
  driverPhone: { type: String },
  driverEmail: { type: String, required: true },
  status: { type: String, default: 'Confirmed' },
  userId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
