# 🚗 Get Your Drive — Luxury Car Rental Web Application

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live_Demo-get--your--drive.netlify.app-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://get-your-drive.netlify.app)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express.js](https://img.shields.io/badge/Express.js-Backend_API-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime_Database-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Netlify](https://img.shields.io/badge/Netlify-Serverless_Functions-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://www.netlify.com)

**Fast, Simple & Verified Luxury Car Rentals**

*A modern full-stack web application featuring rich glassmorphism design, real-time Firebase Realtime Database cloud synchronization, Resend.com 6-digit OTP email verification, interactive HTML5 Canvas photo cropping, dynamic fleet management, and instant booking workflows.*

[Explore Live Demo](https://get-your-drive.netlify.app) • [View API Routes](#-api-endpoints) • [Quick Start](#-quick-start--installation)

</div>

---

## 📸 Overview & Highlights

- 🌐 **Live Production**: [https://get-your-drive.netlify.app](https://get-your-drive.netlify.app)
- 🔥 **Primary Cloud Database**: **Firebase Realtime Database** (`https://getyourdrive-148f5-default-rtdb.firebaseio.com`) with live bidirectional synchronization.
- ✉️ **OTP Verification Engine**: Powered by **Resend.com API** and dedicated SSL **Gmail SMTP**.
- 💎 **Modern Luxury UI**: Custom glassmorphism aesthetic with light/dark theme switching, fluid micro-animations, and responsive layout.

---

## ✨ Key Features

### 🔐 1. Smart Authentication & Account Security
- **3-Step OTP Verification**: Real-time 6-digit verification codes sent via Resend.com / Gmail SMTP.
- **Direct Real-Time Authentication**: Login authenticates seamlessly against Firebase Realtime Database.
- **Password Security**: Bcrypt hashing (`bcryptjs`), persistent sessions with JSON Web Tokens (`jsonwebtoken`).
- **Forgot Password Recovery**: Instant reset code verification with secure 15-minute reset tokens.

### 🔥 2. Real-Time Cloud Synchronization (Firebase Realtime Database)
- **`users/`**: Real-time user accounts, display names, profile avatars, and credentials.
- **`cars/`**: Real-time fleet vehicles with rates, categories, specifications, and owner tracking.
- **`bookings/`**: Live customer reservations, date intervals, driver details, and status.
- **`activity/`**: Live audit trail logging signups, logins, vehicle listings, and bookings.

### 🚙 3. Fleet & Vehicle Management
- **Interactive Categories**: Filter by *Sedans*, *SUVs*, *Electric EVs*, *Sports*, *Luxury*, and *Economy*.
- **Live Search & Sorting**: Real-time model/brand search with price and rating sorting.
- **List Your Own Vehicle**: Verified users can list vehicles into the fleet with owner-only deletion protection.

### 📅 4. Reservation & Booking System
- **Clean Zero-Booking State**: New users start with `My Bookings (0)`; bookings only appear upon actual reservation.
- **Dynamic Price Engine**: Real-time rate calculation based on calendar pickup and return date ranges.
- **Instant Booking Voucher**: Interactive confirmation modal with reservation reference and cancellation support.

### ✂️ 5. Built-in Interactive Photo Cropper
- **HTML5 Canvas 2D Engine**: Drag-to-pan, 1x–3x zoom slider, 90° rotation, and client-side compression.
- **Aspect Ratio Masks**: Circular masks for user avatars & widescreen 16:10 rectangle masks for vehicles.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, Vanilla CSS3 (Glassmorphism, CSS Variables), Vanilla JavaScript (ES6+), HTML5 Canvas |
| **Backend API** | Node.js, Express.js REST API |
| **Serverless Deployment** | Netlify Functions (`serverless-http`) |
| **Real-Time Database** | Firebase Realtime Database (`firebase-compat` Client SDK & HTTPS REST Backend Engine) |
| **Email & OTP** | Resend.com Cloud API (`@resend/node`), Nodemailer (Gmail SMTP SSL:465) |
| **Security & Auth** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, Rate-limiting, SHA-256 |

---

## 📡 API Endpoints

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/request-otp` | Generate and dispatch 6-digit registration OTP |
| `POST` | `/api/auth/verify-otp` | Verify registration OTP code |
| `POST` | `/api/auth/set-password` | Set password & complete account registration |
| `POST` | `/api/auth/login` | Sign in with email & password |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `PUT` | `/api/auth/profile` | Update user display name and avatar URL |
| `POST` | `/api/auth/forgot-password/request-otp` | Request password reset verification code |
| `POST` | `/api/auth/forgot-password/verify-otp` | Verify password reset code |
| `POST` | `/api/auth/forgot-password/reset-password` | Set new password with reset token |

### 🚗 Vehicles & Fleet (`/api/cars`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/cars` | Retrieve all active fleet vehicles |
| `POST` | `/api/cars` | Add a new vehicle to the fleet (Authenticated) |
| `DELETE` | `/api/cars/:id` | Remove a listed vehicle (Owner protected) |

### 📅 Bookings (`/api/bookings`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/bookings` | Retrieve user bookings (or empty for guests) |
| `POST` | `/api/bookings` | Create a new car reservation |
| `DELETE` | `/api/bookings/:id` | Cancel an existing reservation |

---

## 🚀 Quick Start & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/vasu1602/Get-your-Drive.git
cd Get-your-Drive
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
PORT=3000
FIREBASE_DATABASE_URL=https://getyourdrive-148f5-default-rtdb.firebaseio.com
JWT_SECRET=your_secure_jwt_secret
JWT_VERIFY_SECRET=your_secure_otp_secret
RESEND_API_KEY=your_resend_api_key
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
```

### 4. Run Locally
```bash
# Start local development server
npm start
```
Open **`http://localhost:3000`** in your browser.

---

## 📄 License & Author

Designed & developed with ❤️ by **[Vasu Hapani](https://github.com/vasu1602)**.

*All rights reserved © 2026 Get Your Drive.*
