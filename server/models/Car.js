const mongoose = require('mongoose');

const CarSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: { type: String, required: true },
  brand: { type: String, required: true },
  category: { type: String, required: true },
  pricePerDay: { type: Number, required: true },
  fuel: { type: String, default: 'Petrol' },
  transmission: { type: String, default: 'Automatic' },
  seats: { type: Number, default: 5 },
  doors: { type: Number, default: 4 },
  hasAC: { type: Boolean, default: true },
  rating: { type: Number, default: 5.0 },
  reviews: { type: Number, default: 1 },
  location: { type: String, default: 'Downtown Center' },
  image: { type: String, required: true },
  features: { type: [String], default: ['Air Conditioning', 'Power Steering', 'Bluetooth'] },
  creatorUid: { type: String, default: null },
  creatorEmail: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Car || mongoose.model('Car', CarSchema);
