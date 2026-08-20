// Reactive State Management & LocalStorage Persistence
const Store = {
  KEYS: {
    FLEET: 'apex_fleet_v1',
    BOOKINGS: 'apex_bookings_v1',
    WISHLIST: 'apex_wishlist_v1',
    USER: 'apex_user_v1'
  },

  state: {
    fleet: [],
    bookings: [],
    wishlist: new Set(),
    comparison: [],
    user: {
      fullName: 'Alex Vance',
      email: 'alex.vance@example.com',
      phone: '+1 (555) 389-2910',
      licenseNumber: 'DL-CA-928419'
    },
    searchParams: {
      pickupLocation: 'Metropolitan International Airport (Terminal 1-3)',
      dropoffLocation: 'Metropolitan International Airport (Terminal 1-3)',
      pickupDate: '',
      pickupTime: '10:00',
      returnDate: '',
      returnTime: '10:00',
      category: 'all',
      fuel: 'all',
      transmission: 'all',
      seats: 'all',
      maxPrice: 400,
      searchQuery: '',
      sortBy: 'recommended'
    }
  },

  listeners: new Set(),

  init() {
    // 1. Initialize Fleet
    try {
      const savedFleet = localStorage.getItem(this.KEYS.FLEET);
      if (savedFleet) {
        this.state.fleet = JSON.parse(savedFleet);
      } else {
        this.state.fleet = [...INITIAL_FLEET];
        this.saveFleet();
      }
    } catch (e) {
      console.warn('Failed to load saved fleet, using defaults', e);
      this.state.fleet = [...INITIAL_FLEET];
    }

    // 2. Initialize Dates default (Today + 1 -> Today + 4)
    const today = new Date();
    const pickDate = new Date(today);
    pickDate.setDate(today.getDate() + 1);
    const retDate = new Date(today);
    retDate.setDate(today.getDate() + 4);

    this.state.searchParams.pickupDate = pickDate.toISOString().split('T')[0];
    this.state.searchParams.returnDate = retDate.toISOString().split('T')[0];

    // 3. Initialize Bookings with a sample active booking if empty
    try {
      const savedBookings = localStorage.getItem(this.KEYS.BOOKINGS);
      if (savedBookings) {
        this.state.bookings = JSON.parse(savedBookings);
      } else {
        // Initial demo booking for instant immersion
        const demoCar = this.state.fleet[0];
        const sampleBooking = {
          id: 'AD-89214',
          carId: demoCar.id,
          carName: demoCar.name,
          carImage: demoCar.image,
          carBrand: demoCar.brand,
          pickupLocation: 'Downtown Executive Hub (Main Station)',
          dropoffLocation: 'Downtown Executive Hub (Main Station)',
          pickupDate: this.state.searchParams.pickupDate,
          pickupTime: '10:00 AM',
          returnDate: this.state.searchParams.returnDate,
          returnTime: '10:00 AM',
          days: 3,
          dailyRate: demoCar.dailyRate,
          protectionPlan: PROTECTION_PLANS[1],
          addons: [EXTRA_ADDONS[0], EXTRA_ADDONS[3]],
          driver: { ...this.state.user },
          pricing: {
            baseTotal: demoCar.dailyRate * 3,
            protectionTotal: 24 * 3,
            addonsTotal: (9 + 18) * 3,
            subtotal: demoCar.dailyRate * 3 + 24 * 3 + 27 * 3,
            discount: 50,
            tax: Math.round((demoCar.dailyRate * 3 + 24 * 3 + 27 * 3) * 0.08),
            deposit: 250,
            grandTotal: Math.round((demoCar.dailyRate * 3 + 24 * 3 + 27 * 3) * 1.08) - 50 + 250
          },
          status: 'Active',
          createdAt: new Date().toISOString(),
          telemetry: {
            batteryPercent: 88,
            fuelLevel: '100%',
            odometer: '12,410 mi',
            isLocked: true,
            isClimateOn: false,
            temperature: 70,
            lastPing: 'Live'
          }
        };
        this.state.bookings = [sampleBooking];
        this.saveBookings();
      }
    } catch (e) {
      console.warn('Failed to load bookings', e);
      this.state.bookings = [];
    }

    // 4. Initialize Wishlist
    try {
      const savedWishlist = localStorage.getItem(this.KEYS.WISHLIST);
      if (savedWishlist) {
        this.state.wishlist = new Set(JSON.parse(savedWishlist));
      } else {
        this.state.wishlist = new Set(['car-1', 'car-2']);
        this.saveWishlist();
      }
    } catch (e) {
      this.state.wishlist = new Set();
    }

    // 5. Initialize User
    try {
      const savedUser = localStorage.getItem(this.KEYS.USER);
      if (savedUser) {
        this.state.user = { ...this.state.user, ...JSON.parse(savedUser) };
      }
    } catch (e) {}

    this.notify();
  },

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },

  notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  },

  saveFleet() {
    try {
      localStorage.setItem(this.KEYS.FLEET, JSON.stringify(this.state.fleet));
    } catch (e) {
      console.error(e);
    }
  },

  saveBookings() {
    try {
      localStorage.setItem(this.KEYS.BOOKINGS, JSON.stringify(this.state.bookings));
    } catch (e) {
      console.error(e);
    }
  },

  saveWishlist() {
    try {
      localStorage.setItem(this.KEYS.WISHLIST, JSON.stringify(Array.from(this.state.wishlist)));
    } catch (e) {
      console.error(e);
    }
  },

  saveUser(userData) {
    this.state.user = { ...this.state.user, ...userData };
    try {
      localStorage.setItem(this.KEYS.USER, JSON.stringify(this.state.user));
    } catch (e) {}
    this.notify();
  },

  // Fleet Operations
  getFleet() {
    return this.state.fleet;
  },

  getCarById(id) {
    return this.state.fleet.find(car => car.id === id);
  },

  addCar(carData) {
    const newCar = {
      id: 'car-' + Date.now(),
      rating: 5.0,
      reviewsCount: 1,
      isAvailable: true,
      isFeatured: false,
      images: [carData.image],
      ...carData
    };
    this.state.fleet.unshift(newCar);
    this.saveFleet();
    this.notify();
    return newCar;
  },

  updateCar(id, updatedData) {
    const idx = this.state.fleet.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.state.fleet[idx] = { ...this.state.fleet[idx], ...updatedData };
      this.saveFleet();
      this.notify();
    }
  },

  deleteCar(id) {
    this.state.fleet = this.state.fleet.filter(c => c.id !== id);
    this.state.wishlist.delete(id);
    this.removeFromComparison(id);
    this.saveFleet();
    this.saveWishlist();
    this.notify();
  },

  resetFleetToDefaults() {
    this.state.fleet = [...INITIAL_FLEET];
    this.saveFleet();
    this.notify();
  },

  // Bookings Operations
  getBookings() {
    return this.state.bookings;
  },

  getBookingById(id) {
    return this.state.bookings.find(b => b.id === id);
  },

  addBooking(bookingData) {
    const newBooking = {
      id: 'AD-' + Math.floor(10000 + Math.random() * 90000),
      createdAt: new Date().toISOString(),
      status: 'Confirmed',
      telemetry: {
        batteryPercent: 92,
        fuelLevel: '100%',
        odometer: `${Math.floor(5000 + Math.random() * 20000).toLocaleString()} mi`,
        isLocked: true,
        isClimateOn: false,
        temperature: 70,
        lastPing: 'Live Connected'
      },
      ...bookingData
    };
    this.state.bookings.unshift(newBooking);
    this.saveBookings();
    this.notify();
    return newBooking;
  },

  cancelBooking(id) {
    const booking = this.getBookingById(id);
    if (booking) {
      booking.status = 'Cancelled';
      this.saveBookings();
      this.notify();
      return true;
    }
    return false;
  },

  extendBooking(id, extraDays = 1) {
    const booking = this.getBookingById(id);
    if (booking && booking.status !== 'Cancelled') {
      booking.days += extraDays;
      const retDateObj = new Date(booking.returnDate);
      retDateObj.setDate(retDateObj.getDate() + extraDays);
      booking.returnDate = retDateObj.toISOString().split('T')[0];

      // recalculate pricing
      const dailyTotal = booking.dailyRate + (booking.protectionPlan ? booking.protectionPlan.pricePerDay : 0);
      booking.pricing.baseTotal += booking.dailyRate * extraDays;
      if (booking.protectionPlan) {
        booking.pricing.protectionTotal += booking.protectionPlan.pricePerDay * extraDays;
      }
      booking.pricing.grandTotal += dailyTotal;

      this.saveBookings();
      this.notify();
      return booking;
    }
    return null;
  },

  updateBookingTelemetry(id, telemetryUpdate) {
    const booking = this.getBookingById(id);
    if (booking) {
      booking.telemetry = { ...booking.telemetry, ...telemetryUpdate };
      this.saveBookings();
      this.notify();
    }
  },

  // Wishlist Operations
  toggleWishlist(id) {
    if (this.state.wishlist.has(id)) {
      this.state.wishlist.delete(id);
    } else {
      this.state.wishlist.add(id);
    }
    this.saveWishlist();
    this.notify();
  },

  isWishlisted(id) {
    return this.state.wishlist.has(id);
  },

  // Comparison Operations
  addToComparison(id) {
    if (this.state.comparison.length >= 3) {
      return { success: false, reason: 'You can compare at most 3 vehicles at once.' };
    }
    if (this.state.comparison.includes(id)) {
      return { success: false, reason: 'Car is already in comparison.' };
    }
    this.state.comparison.push(id);
    this.notify();
    return { success: true };
  },

  removeFromComparison(id) {
    this.state.comparison = this.state.comparison.filter(carId => carId !== id);
    this.notify();
  },

  clearComparison() {
    this.state.comparison = [];
    this.notify();
  },

  // Search and Filter updates
  setSearchParams(params) {
    this.state.searchParams = { ...this.state.searchParams, ...params };
    this.notify();
  },

  getFilterOptions() {
    return this.state.searchParams;
  },

  getStats() {
    const totalRevenue = this.state.bookings
      .filter(b => b.status !== 'Cancelled')
      .reduce((sum, b) => sum + (b.pricing?.grandTotal || 0), 0);
    const activeTrips = this.state.bookings.filter(b => b.status === 'Active' || b.status === 'Confirmed').length;
    const fleetCount = this.state.fleet.length;
    const avgRating = (this.state.fleet.reduce((sum, c) => sum + c.rating, 0) / (fleetCount || 1)).toFixed(2);

    return { totalRevenue, activeTrips, fleetCount, avgRating };
  }
};
