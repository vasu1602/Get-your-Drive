const https = require('https');

const FIREBASE_RTDB_URL = process.env.FIREBASE_DATABASE_URL || 'https://getyourdrive-148f5-default-rtdb.firebaseio.com';

function sanitizeKey(emailOrKey) {
  if (!emailOrKey) return 'anonymous';
  return String(emailOrKey).toLowerCase().replace(/[.@#$\[\]\/]/g, '_');
}

function rtdbRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const fullPath = path.endsWith('.json') ? path : `${path}.json`;
    const url = new URL(`${FIREBASE_RTDB_URL}${fullPath.startsWith('/') ? '' : '/'}${fullPath}`);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const payload = data !== null ? JSON.stringify(data) : null;
    if (payload) {
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve(parsed);
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', (err) => {
      console.warn(`[Firebase RTDB Warning] ${method} ${path}:`, err.message);
      resolve(null); // Resilient fallback
    });

    if (payload) req.write(payload);
    req.end();
  });
}

const FirebaseDB = {
  sanitizeKey,
  
  // Users
  async saveUser(user, plainPassword = null) {
    if (!user || !user.email) return null;
    const key = sanitizeKey(user.email);
    const existing = await this.getUser(user.email);
    const userData = {
      id: String(user._id || user.id || (existing && existing.id) || key),
      email: user.email.toLowerCase().trim(),
      name: user.name || user.email.split('@')[0],
      photoURL: user.photoURL !== undefined ? user.photoURL : (existing ? existing.photoURL : ''),
      role: user.role || (existing && existing.role) || 'user',
      isEmailVerified: true,
      lastActive: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (plainPassword) {
      userData.password = String(plainPassword);
    } else if (user.password) {
      userData.password = String(user.password);
    } else if (existing && existing.password) {
      userData.password = existing.password;
    }

    if (user.passwordHash) {
      userData.passwordHash = user.passwordHash;
    } else if (existing && existing.passwordHash) {
      userData.passwordHash = existing.passwordHash;
    }

    await rtdbRequest(`/users/${key}`, 'PUT', userData);
    await this.logActivity('USER_SAVED', `User account updated: ${user.email}`, { email: user.email, name: user.name });
    return userData;
  },

  async getUser(email) {
    if (!email) return null;
    const key = sanitizeKey(email);
    return rtdbRequest(`/users/${key}`, 'GET');
  },

  async getAllUsers() {
    const data = await rtdbRequest('/users', 'GET');
    if (!data) return [];
    return Object.values(data);
  },

  // Cars / Fleet
  async saveCar(car) {
    if (!car || !car.id) return null;
    await rtdbRequest(`/cars/${car.id}`, 'PUT', {
      ...car,
      updatedAt: new Date().toISOString()
    });
    await this.logActivity('CAR_LISTED', `Vehicle listed to fleet: ${car.name}`, { carId: car.id, carName: car.name });
    return car;
  },

  async deleteCar(carId) {
    if (!carId) return null;
    await rtdbRequest(`/cars/${carId}`, 'DELETE');
    await this.logActivity('CAR_REMOVED', `Vehicle removed from fleet: ${carId}`, { carId });
    return true;
  },

  async getAllCars() {
    const data = await rtdbRequest('/cars', 'GET');
    if (!data) return [];
    return Object.values(data);
  },

  // Bookings
  async saveBooking(booking) {
    if (!booking || !booking.id) return null;
    await rtdbRequest(`/bookings/${booking.id}`, 'PUT', {
      ...booking,
      updatedAt: new Date().toISOString()
    });
    await this.logActivity('BOOKING_CREATED', `New car reservation: #${booking.id} (${booking.carName})`, {
      bookingId: booking.id,
      carName: booking.carName,
      driverName: booking.driverName,
      totalPrice: booking.totalPrice
    });
    return booking;
  },

  async deleteBooking(bookingId) {
    if (!bookingId) return null;
    await rtdbRequest(`/bookings/${bookingId}`, 'DELETE');
    await this.logActivity('BOOKING_CANCELLED', `Reservation cancelled: #${bookingId}`, { bookingId });
    return true;
  },

  async getAllBookings() {
    const data = await rtdbRequest('/bookings', 'GET');
    if (!data) return [];
    return Object.values(data);
  },

  async getUserBookings(userId, email) {
    const all = await this.getAllBookings();
    const cleanEmail = email ? email.toLowerCase().trim() : null;
    const cleanId = userId ? String(userId) : null;
    return all.filter(b => {
      if (cleanId && String(b.userId) === cleanId) return true;
      if (cleanEmail && b.driverEmail && b.driverEmail.toLowerCase().trim() === cleanEmail) return true;
      return false;
    });
  },

  // Real-time Activity Log
  async logActivity(type, message, metadata = {}) {
    const actId = 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const item = {
      id: actId,
      type,
      message,
      metadata,
      timestamp: new Date().toISOString()
    };
    await rtdbRequest(`/activity/${actId}`, 'PUT', item);
  },

  // OTP Tokens for Instant Cross-Serverless Lambda Persistence
  async saveOtp(email, data) {
    if (!email) return;
    const key = sanitizeKey(email);
    await rtdbRequest(`/otptokens/${key}`, 'PUT', data);
  },

  async getOtp(email) {
    if (!email) return null;
    const key = sanitizeKey(email);
    return rtdbRequest(`/otptokens/${key}`, 'GET');
  },

  async deleteOtp(email) {
    if (!email) return;
    const key = sanitizeKey(email);
    await rtdbRequest(`/otptokens/${key}`, 'DELETE');
  }
};

module.exports = FirebaseDB;
