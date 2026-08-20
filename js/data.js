// =============================================================================
// CAR RENTAL DATASET & INITIAL CONFIGURATION
// You can easily add, edit, or remove vehicles below!
// =============================================================================

const DEFAULT_CARS = [
  {
    id: 'car-1',
    name: 'Tesla Model 3 Long Range',
    brand: 'Tesla',
    category: 'electric', // 'sedan' | 'suv' | 'electric' | 'sports' | 'luxury' | 'economy'
    image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80',
    pricePerDay: 79,
    fuel: 'Electric',
    transmission: 'Automatic',
    seats: 5,
    doors: 4,
    hasAC: true,
    rating: 4.9,
    reviews: 128,
    features: ['Autopilot', '350mi Range', 'Premium Audio', 'Keyless Entry'],
    location: 'Downtown Center'
  },
  {
    id: 'car-2',
    name: 'BMW 4 Series Gran Coupe',
    brand: 'BMW',
    category: 'luxury',
    image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80',
    pricePerDay: 110,
    fuel: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    doors: 4,
    hasAC: true,
    rating: 4.8,
    reviews: 94,
    features: ['Leather Seats', 'Navigation Plus', 'Apple CarPlay', 'Sunroof'],
    location: 'Airport Terminal 1'
  },
  {
    id: 'car-3',
    name: 'Mercedes-Benz C-Class',
    brand: 'Mercedes-Benz',
    category: 'sedan',
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80',
    pricePerDay: 95,
    fuel: 'Hybrid',
    transmission: 'Automatic',
    seats: 5,
    doors: 4,
    hasAC: true,
    rating: 4.9,
    reviews: 112,
    features: ['Digital Cockpit', 'Ambient Lighting', 'Heated Seats', 'Lane Assist'],
    location: 'Central Station'
  },
  {
    id: 'car-4',
    name: 'Range Rover Velar',
    brand: 'Land Rover',
    category: 'suv',
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
    pricePerDay: 135,
    fuel: 'Diesel',
    transmission: 'Automatic',
    seats: 5,
    doors: 4,
    hasAC: true,
    rating: 4.7,
    reviews: 80,
    features: ['All-Wheel Drive', 'Panoramic Roof', 'Meridian Audio', 'Large Trunk'],
    location: 'Downtown Center'
  },
  {
    id: 'car-5',
    name: 'Ford Mustang GT V8',
    brand: 'Ford',
    category: 'sports',
    image: 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=800&q=80',
    pricePerDay: 125,
    fuel: 'Petrol',
    transmission: 'Automatic',
    seats: 4,
    doors: 2,
    hasAC: true,
    rating: 4.9,
    reviews: 145,
    features: ['450 HP V8', 'Sport Exhaust', 'Track Apps', 'Brembo Brakes'],
    location: 'Marina Bay Plaza'
  },
  {
    id: 'car-6',
    name: 'Hyundai Elantra Luxury',
    brand: 'Hyundai',
    category: 'economy',
    image: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=800&q=80',
    pricePerDay: 49,
    fuel: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    doors: 4,
    hasAC: true,
    rating: 4.6,
    reviews: 180,
    features: ['38 MPG Eco', 'Touchscreen Infotainment', 'Backup Camera', 'Bluetooth'],
    location: 'Airport Terminal 2'
  },
  {
    id: 'car-7',
    name: 'Porsche Macan GTS',
    brand: 'Porsche',
    category: 'suv',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    pricePerDay: 165,
    fuel: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    doors: 4,
    hasAC: true,
    rating: 5.0,
    reviews: 73,
    features: ['Twin-Turbo V6', 'Sport Chrono', 'Air Suspension', 'Bose Audio'],
    location: 'Central Station'
  },
  {
    id: 'car-8',
    name: 'Audi e-tron Sportback',
    brand: 'Audi',
    category: 'electric',
    image: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=800&q=80',
    pricePerDay: 115,
    fuel: 'Electric',
    transmission: 'Automatic',
    seats: 5,
    doors: 4,
    hasAC: true,
    rating: 4.8,
    reviews: 88,
    features: ['Quattro AWD', 'Virtual Cockpit', 'Fast 150kW Charging', 'Matrix LED'],
    location: 'Downtown Center'
  }
];

const LOCATIONS = [
  'Downtown Center (Main Station)',
  'International Airport (Terminal 1)',
  'International Airport (Terminal 2)',
  'Central Rail Station',
  'Marina Bay Plaza',
  'North Coast Hub'
];

const PROMO_CODES = {
  'DRIVE10': 0.10, // 10% off
  'SAVE20': 0.20,  // 20% off
  'RENT50': 50     // $50 off
};
