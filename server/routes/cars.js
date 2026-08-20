const express = require('express');
const router = express.Router();
const { isMongoConnected, fallbackStore } = require('../db');
const Car = require('../models/Car');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Default initial fleet
const DEFAULT_CARS = [
  {
    id: 'car-1',
    name: 'Tesla Model 3 Long Range',
    brand: 'Tesla',
    category: 'electric',
    pricePerDay: 79,
    fuel: 'Electric',
    transmission: 'Automatic',
    seats: 5,
    doors: 4,
    hasAC: true,
    rating: 4.9,
    reviews: 128,
    features: ['Autopilot', 'Fast Charging', 'Glass Roof', 'Premium Sound'],
    location: 'Downtown Center',
    image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80',
    creatorUid: null,
    creatorEmail: null
  },
  {
    id: 'car-2',
    name: 'BMW 4 Series Gran Coupe',
    brand: 'BMW',
    category: 'sedan',
    pricePerDay: 85,
    fuel: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    doors: 4,
    hasAC: true,
    rating: 4.8,
    reviews: 94,
    features: ['Sport Mode', 'Leather Seats', 'Apple CarPlay', 'Parking Assist'],
    location: 'Airport Terminal 1',
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
    creatorUid: null,
    creatorEmail: null
  },
  {
    id: 'car-3',
    name: 'Mercedes-Benz GLC 300',
    brand: 'Mercedes-Benz',
    category: 'suv',
    pricePerDay: 99,
    fuel: 'Hybrid',
    transmission: 'Automatic',
    seats: 5,
    doors: 5,
    hasAC: true,
    rating: 4.9,
    reviews: 110,
    features: ['Panoramic Sunroof', 'AWD', 'Burmester Audio', 'Ambient Lighting'],
    location: 'North Station Hub',
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80',
    creatorUid: null,
    creatorEmail: null
  },
  {
    id: 'car-4',
    name: 'Porsche 911 Carrera',
    brand: 'Porsche',
    category: 'sports',
    pricePerDay: 189,
    fuel: 'Petrol',
    transmission: 'PDK Auto',
    seats: 4,
    doors: 2,
    hasAC: true,
    rating: 5.0,
    reviews: 82,
    features: ['Sport Chrono', 'Active Exhaust', 'Launch Control', 'Bose Surround'],
    location: 'Financial District Plaza',
    image: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=80',
    creatorUid: null,
    creatorEmail: null
  },
  {
    id: 'car-5',
    name: 'Range Rover Sport HSE',
    brand: 'Land Rover',
    category: 'luxury',
    pricePerDay: 135,
    fuel: 'Diesel',
    transmission: 'Automatic',
    seats: 7,
    doors: 5,
    hasAC: true,
    rating: 4.8,
    reviews: 76,
    features: ['Air Suspension', 'Massage Seats', 'Heads-up Display', 'Cooler Box'],
    location: 'Westside Marina Bay',
    image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=800&q=80',
    creatorUid: null,
    creatorEmail: null
  },
  {
    id: 'car-6',
    name: 'Toyota Corolla Hybrid',
    brand: 'Toyota',
    category: 'economy',
    pricePerDay: 49,
    fuel: 'Hybrid',
    transmission: 'Automatic',
    seats: 5,
    doors: 4,
    hasAC: true,
    rating: 4.7,
    reviews: 145,
    features: ['Ultra Fuel Saver', 'Adaptive Cruise', 'Lane Assist', 'CarPlay'],
    location: 'Downtown Center',
    image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80',
    creatorUid: null,
    creatorEmail: null
  }
];

// Initialize default cars in fallback store
DEFAULT_CARS.forEach(car => fallbackStore.cars.set(car.id, { ...car }));

// GET /api/cars -> Get all available fleet vehicles
router.get('/', async (req, res) => {
  try {
    let cars = [];
    if (isMongoConnected()) {
      cars = await Car.find().sort({ createdAt: -1 });
      // If DB is empty, seed defaults
      if (cars.length === 0) {
        await Car.insertMany(DEFAULT_CARS);
        cars = await Car.find().sort({ createdAt: -1 });
      }
    } else {
      cars = Array.from(fallbackStore.cars.values());
    }
    return res.status(200).json({ cars });
  } catch (err) {
    console.error('Error fetching cars:', err);
    return res.status(500).json({ error: 'Failed to fetch vehicles.' });
  }
});

// POST /api/cars -> Add a custom vehicle (Auth-Protected)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, brand, category, pricePerDay, fuel, transmission, seats, image, location } = req.body;

    if (!name || !brand || !pricePerDay) {
      return res.status(400).json({ error: 'Name, brand, and daily price are required.' });
    }

    const newCarData = {
      id: 'car-' + Date.now(),
      name: name.trim(),
      brand: brand.trim(),
      category: category || 'sedan',
      pricePerDay: parseFloat(pricePerDay) || 75,
      fuel: fuel || 'Petrol',
      transmission: transmission || 'Automatic',
      seats: parseInt(seats, 10) || 5,
      doors: 4,
      hasAC: true,
      rating: 5.0,
      reviews: 1,
      location: location || 'Downtown Center',
      image: image || 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80',
      features: ['Air Conditioning', 'Power Steering', 'Bluetooth'],
      creatorUid: String(req.user.id),
      creatorEmail: req.user.email,
      createdAt: new Date()
    };

    let createdCar;
    if (isMongoConnected()) {
      createdCar = await Car.create(newCarData);
    } else {
      fallbackStore.cars.set(newCarData.id, newCarData);
      createdCar = newCarData;
    }

    return res.status(201).json({
      success: true,
      message: `Vehicle "${createdCar.name}" listed successfully.`,
      car: createdCar
    });
  } catch (err) {
    console.error('Error creating car:', err);
    return res.status(500).json({ error: 'Failed to list vehicle.' });
  }
});

// DELETE /api/cars/:id -> Remove vehicle (Strictly Owner-Protected)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const carId = req.params.id;

    let car = null;
    if (isMongoConnected()) {
      car = await Car.findOne({ id: carId });
    } else {
      car = fallbackStore.cars.get(carId);
    }

    if (!car) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    // Strict Ownership Check
    const isOwner = Boolean(
      (car.creatorUid && String(car.creatorUid) === String(req.user.id)) ||
      (car.creatorEmail && car.creatorEmail === req.user.email)
    );

    if (!isOwner) {
      return res.status(403).json({
        error: 'Permission denied: You can only remove vehicles that you listed.'
      });
    }

    if (isMongoConnected()) {
      await Car.deleteOne({ id: carId });
    } else {
      fallbackStore.cars.delete(carId);
    }

    return res.status(200).json({
      success: true,
      message: `"${car.name}" has been removed from the fleet.`
    });
  } catch (err) {
    console.error('Error deleting car:', err);
    return res.status(500).json({ error: 'Failed to delete vehicle.' });
  }
});

module.exports = router;
