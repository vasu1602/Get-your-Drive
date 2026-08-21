// =============================================================================
// DATABASE STATUS & IN-MEMORY CACHE
// Primary Cloud Database: Firebase Realtime Database
// =============================================================================

const fallbackStore = {
  users: new Map(),
  otpTokens: new Map(),
  cars: new Map(),
  bookings: new Map()
};

function getStatus() {
  return {
    provider: 'Firebase Realtime Database',
    url: 'https://getyourdrive-148f5-default-rtdb.firebaseio.com',
    status: 'online'
  };
}

module.exports = {
  getStatus,
  fallbackStore
};
