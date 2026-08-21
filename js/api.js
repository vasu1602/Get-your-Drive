// =============================================================================
// GET YOUR DRIVE - CLIENT API BRIDGE
// Communicates with the Express + Firebase Realtime Database REST API
// =============================================================================

const Api = {
  baseUrl: '/api',

  getToken() {
    return localStorage.getItem('getyourdrive_token');
  },

  setToken(token) {
    if (token) localStorage.setItem('getyourdrive_token', token);
    else localStorage.removeItem('getyourdrive_token');
  },

  getUser() {
    try {
      const user = localStorage.getItem('getyourdrive_user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    if (user) localStorage.setItem('getyourdrive_user', JSON.stringify(user));
    else localStorage.removeItem('getyourdrive_user');
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      return data;
    } catch (err) {
      throw err;
    }
  },

  // ---------------------------------------------------------------------------
  // AUTHENTICATION APIs
  // ---------------------------------------------------------------------------

  // STEP 1: Request OTP
  async requestOtp(email, name) {
    return this.request('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email, name })
    });
  },

  // STEP 2: Verify OTP
  async verifyOtp(email, otp) {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    });
  },

  // STEP 3: Set Password & Create Account
  async setPassword(verificationToken, password, name) {
    const data = await this.request('/auth/set-password', {
      method: 'POST',
      body: JSON.stringify({ verificationToken, password, name })
    });

    if (data.token && data.user) {
      this.setToken(data.token);
      this.setUser(data.user);
    }
    return data;
  },

  // Standard Login
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (data.token && data.user) {
      this.setToken(data.token);
      this.setUser(data.user);
    }
    return data;
  },

  // Logout
  logout() {
    this.setToken(null);
    this.setUser(null);
  },

  // Get Current User Profile (Persistent Session)
  async getMe() {
    const user = this.getUser();
    const token = this.getToken();
    if (!user && !token) return null;

    try {
      const data = await this.request('/auth/me');
      if (data && data.user) {
        this.setUser(data.user);
        if (data.token) this.setToken(data.token);
        return data.user;
      }
      return user;
    } catch (err) {
      // Keep existing stored user session active so page refresh never logs out!
      return user;
    }
  },

  // Update Profile (Name & Avatar)
  async updateProfile(name, photoURL) {
    const user = this.getUser();
    const data = await this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, photoURL, email: user?.email })
    });
    if (data.user) {
      this.setUser(data.user);
    }
    return data;
  },

  // Change Password (with Current Password)
  async changePassword(currentPassword, newPassword) {
    const user = this.getUser();
    const data = await this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword,
        newPassword,
        email: user?.email
      })
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  // Forgot Password: Step 1 Request OTP
  async requestForgotOtp(email) {
    return this.request('/auth/forgot-password/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  // Forgot Password: Step 2 Verify OTP
  async verifyForgotOtp(email, otp) {
    return this.request('/auth/forgot-password/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    });
  },

  // Forgot Password: Step 3 Reset Password
  async resetPasswordWithToken(resetToken, newPassword) {
    return this.request('/auth/forgot-password/reset-password', {
      method: 'POST',
      body: JSON.stringify({ resetToken, newPassword })
    });
  },

  // ---------------------------------------------------------------------------
  // VEHICLE & FLEET APIs
  // ---------------------------------------------------------------------------
  async getCars() {
    return this.request('/cars');
  },

  async addCar(carData) {
    return this.request('/cars', {
      method: 'POST',
      body: JSON.stringify(carData)
    });
  },

  async deleteCar(carId) {
    return this.request(`/cars/${carId}`, {
      method: 'DELETE'
    });
  },

  // ---------------------------------------------------------------------------
  // BOOKINGS APIs
  // ---------------------------------------------------------------------------
  async getBookings() {
    return this.request('/bookings');
  },

  async createBooking(bookingData) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
  },

  async cancelBooking(bookingId) {
    return this.request(`/bookings/${bookingId}`, {
      method: 'DELETE'
    });
  }
};
