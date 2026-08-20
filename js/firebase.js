// =============================================================================
// FIREBASE CONFIGURATION & AUTHENTICATION MODULE
// Replace the placeholder values below with your Firebase Project credentials!
// Get your config from: Firebase Console -> Project Settings -> General -> Your apps
// =============================================================================

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

const FirebaseAuth = {
  auth: null,
  currentUser: null,
  isDemoMode: false,
  listeners: new Set(),

  init() {
    // Check if real Firebase config is provided
    const isRealConfig = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("YOUR_API_KEY");

    if (isRealConfig && typeof firebase !== 'undefined') {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        this.auth = firebase.auth();
        this.auth.onAuthStateChanged((user) => {
          this.currentUser = user ? {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || null
          } : null;
          this.notify();
        });
        console.log("Firebase Auth initialized successfully.");
      } catch (err) {
        console.warn("Failed to initialize Firebase SDK, falling back to Demo Auth:", err);
        this.initDemoMode();
      }
    } else {
      this.initDemoMode();
    }
  },

  initDemoMode() {
    this.isDemoMode = true;
    console.log("Firebase Auth running in Demo/Offline mode. Add your Firebase keys in js/firebase.js to connect live.");
    
    // Check if user was saved in local storage
    const savedDemoUser = localStorage.getItem('apex_auth_user');
    if (savedDemoUser) {
      try {
        this.currentUser = JSON.parse(savedDemoUser);
      } catch (e) {
        this.currentUser = null;
      }
    }
    this.notify();
  },

  onAuthStateChanged(callback) {
    this.listeners.add(callback);
    callback(this.currentUser);
    return () => this.listeners.delete(callback);
  },

  notify() {
    for (const listener of this.listeners) {
      listener(this.currentUser);
    }
  },

  getCurrentUser() {
    return this.currentUser;
  },

  // 1. Sign In with Email & Password
  async signIn(email, password) {
    if (!email || !password) {
      throw new Error("Please provide both email and password.");
    }

    if (!this.isDemoMode && this.auth) {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      return userCredential.user;
    } else {
      // Demo authentication simulation
      const user = {
        uid: 'user-' + btoa(email).replace(/=/g, '').substring(0, 10),
        email: email,
        displayName: email.split('@')[0],
        photoURL: null
      };
      this.currentUser = user;
      localStorage.setItem('apex_auth_user', JSON.stringify(user));
      this.notify();
      return user;
    }
  },

  // 2. Register / Sign Up with Email & Password
  async signUp(email, password, displayName) {
    if (!email || !password) {
      throw new Error("Please provide email and password.");
    }
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }

    if (!this.isDemoMode && this.auth) {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      if (displayName && userCredential.user.updateProfile) {
        await userCredential.user.updateProfile({ displayName });
      }
      return userCredential.user;
    } else {
      // Demo registration simulation
      const user = {
        uid: 'user-' + Date.now(),
        email: email,
        displayName: displayName || email.split('@')[0],
        photoURL: null
      };
      this.currentUser = user;
      localStorage.setItem('apex_auth_user', JSON.stringify(user));
      this.notify();
      return user;
    }
  },

  // 3. Sign In with Google
  async signInWithGoogle() {
    if (!this.isDemoMode && this.auth && typeof firebase !== 'undefined') {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await this.auth.signInWithPopup(provider);
      return result.user;
    } else {
      // Demo Google Sign-In simulation
      const user = {
        uid: 'google-user-' + Math.floor(1000 + Math.random() * 9000),
        email: 'alex.google@example.com',
        displayName: 'Alex Google User',
        photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'
      };
      this.currentUser = user;
      localStorage.setItem('apex_auth_user', JSON.stringify(user));
      this.notify();
      return user;
    }
  },

  // 4. Sign Out
  async signOut() {
    if (!this.isDemoMode && this.auth) {
      await this.auth.signOut();
    } else {
      this.currentUser = null;
      localStorage.removeItem('apex_auth_user');
      this.notify();
    }
  }
};
