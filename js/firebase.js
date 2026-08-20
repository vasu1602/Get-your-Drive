// =============================================================================
// FIREBASE REALTIME DATABASE & AUTHENTICATION MODULE
// Live Realtime Database: https://getyourdrive-148f5-default-rtdb.firebaseio.com
// =============================================================================

const firebaseConfig = {
  projectId: "getyourdrive-148f5",
  databaseURL: "https://getyourdrive-148f5-default-rtdb.firebaseio.com",
  authDomain: "getyourdrive-148f5.firebaseapp.com"
};

const FirebaseRTDB = {
  db: null,
  
  init() {
    if (typeof firebase !== 'undefined') {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        this.db = firebase.database();
        console.log("🔥 Firebase Realtime Database connected:", firebaseConfig.databaseURL);
      } catch (err) {
        console.warn("Firebase RTDB init note:", err.message);
      }
    }
  },

  sanitizeKey(email) {
    if (!email) return 'anonymous';
    return String(email).toLowerCase().replace(/[.@#$\[\]\/]/g, '_');
  },

  // Real-time save user profile & presence
  saveUser(user) {
    if (!user || !user.email) return;
    const key = this.sanitizeKey(user.email);
    const data = {
      id: String(user.id || user._id || key),
      email: user.email.toLowerCase().trim(),
      name: user.name || user.email.split('@')[0],
      photoURL: user.photoURL || '',
      role: user.role || 'user',
      isEmailVerified: true,
      lastActive: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (this.db) {
      this.db.ref('users/' + key).update(data);
      this.logActivity('USER_LOGIN', `User signed in: ${user.email}`);
    }
  },

  // Real-time save booking
  saveBooking(booking) {
    if (!booking || !booking.id) return;
    if (this.db) {
      this.db.ref('bookings/' + booking.id).set({
        ...booking,
        updatedAt: new Date().toISOString()
      });
      this.logActivity('BOOKING_CREATED', `Reservation #${booking.id} created for ${booking.carName}`);
    }
  },

  // Real-time delete booking
  deleteBooking(bookingId) {
    if (!bookingId) return;
    if (this.db) {
      this.db.ref('bookings/' + bookingId).remove();
      this.logActivity('BOOKING_CANCELLED', `Reservation #${bookingId} cancelled`);
    }
  },

  // Real-time save car
  saveCar(car) {
    if (!car || !car.id) return;
    if (this.db) {
      this.db.ref('cars/' + car.id).set({
        ...car,
        updatedAt: new Date().toISOString()
      });
      this.logActivity('CAR_ADDED', `Vehicle listed: ${car.name}`);
    }
  },

  // Real-time delete car
  deleteCar(carId) {
    if (!carId) return;
    if (this.db) {
      this.db.ref('cars/' + carId).remove();
      this.logActivity('CAR_REMOVED', `Vehicle removed from fleet: ${carId}`);
    }
  },

  // Real-time audit log
  logActivity(type, message) {
    if (!this.db) return;
    const actId = 'act_' + Date.now();
    this.db.ref('activity/' + actId).set({
      id: actId,
      type,
      message,
      timestamp: new Date().toISOString()
    });
  }
};

// Initialize client-side Realtime Database immediately
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    FirebaseRTDB.init();
  });
}
