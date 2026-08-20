# 🚗 Get Your Drive — Luxury Car Rental Web Application

> **Fast, Simple & Verified Car Rentals**  
> A full-stack luxury car rental web application with modern dark/light glassmorphism design, interactive photo adjustment tool, MongoDB database persistence, 3-step OTP email verification, dynamic fleet search, and online booking workflows.

---

## ✨ Features

- 💎 **Luxury Glassmorphism UI**: Custom themed dark & light mode with fluid micro-animations, tailored color palettes, and modern typography.
- 🎨 **Custom Web Components**:
  - Web-themed select dropdowns with checkmark indicators.
  - Interactive calendar datepicker with 1-click booking shortcuts (`Today`, `Tomorrow`, `+3 Days`, `+7 Days`).
- ✂️ **Built-in Interactive Photo Cropper**:
  - Drag-and-pan, 1x-3x zoom slider, 90° rotation, and instant canvas compression.
  - Circular masks for user avatars & widescreen 16:10 rectangle masks for vehicles.
- 🔐 **Secure Authentication & Account Security**:
  - JWT session tokens with 30-day continuous renewal.
  - 3-step OTP verification flow for user registration.
  - Password change with current password verification & Forgot Password recovery via OTP.
- 🍃 **MongoDB & Mongoose Database**:
  - Live data sync for Users, Vehicle Fleet, Bookings, and OTP tokens.
  - In-memory fallback mode if database is offline.
- 🚙 **Fleet Management**:
  - Filter by category (Sedans, SUVs, Electric EVs, Sports, Luxury, Economy).
  - Search by model name or brand with instant client-side filtering and sorting.
  - Verified user vehicle listing (*+ List a Vehicle*) with owner-only removal protection.
- 📅 **Reservation Management**:
  - Dynamic rental price calculation based on date range.
  - Instant confirmation and booking history in *My Bookings*.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS (Custom Design System & Glassmorphism), Vanilla JavaScript ES6+, HTML5 Canvas API.
- **Backend**: Node.js, Express.js REST API.
- **Database**: MongoDB with Mongoose ODM.
- **Authentication**: JSON Web Tokens (`jsonwebtoken`), `bcryptjs`.
- **Email / OTP**: Nodemailer (Gmail App Password & SMTP) and Resend API integration.

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
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

Edit `.env` with your preferred settings:
```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/getyourdrive
JWT_SECRET=your_super_secret_jwt_key_here
JWT_VERIFY_SECRET=your_otp_verification_secret_key_here
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_16_digit_app_password
```

### 4. Run the Server
```bash
# Start backend and web server
npm start
```
Open **`http://localhost:3000`** in your browser.

---

## 📄 License & Credits

© 2026 | Built and designed by **Vasu hapani**
