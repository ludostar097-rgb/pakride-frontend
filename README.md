# 📱 PakRide Frontend & Mobile App (Web + Android APK)

The official client application for **PakRide** (Next-Gen Pakistani Ride-Hailing Platform with Real-Time Bidding & 0% Commission).

Built with **React 18 + Vite 6 + Tailwind CSS + Capacitor 7 + Leaflet Maps + Socket.io Client**.

---

## 🌟 The 3 Integrated Interfaces in One App
1. **🚗 Passenger App**: Propose custom fares, receive live driver counter-bids, choose vehicle (Car, Rickshaw, Motorcycle), 4-digit ride verification PIN, family WhatsApp sharing, Police 15 SOS, and live in-ride chat.
2. **🚕 Driver App**: Instant Online/Offline availability toggle, real-time nearby ride request radar, quick +20/+50/+100 PKR counteroffer pills, passenger PIN verification modal, and 0% commission daily savings tracker.
3. **🛡️ Admin Console**: Dynamic city & zone registry management, driver CNIC/license document approval queue, real-time network trip monitor, and transparent cash reconciliation ledger.
4. **🇵🇰 Urdu RTL / English Toggle**: Instant 1-click header switcher with native Nastaliq typography support.

---

## 📲 Download & Build the Android APK

### Option 1: Automated Cloud Build (GitHub Actions)
Every push to `main` automatically builds a fresh debug APK:
1. Go to the [Actions tab](https://github.com/ludostar097-rgb/pakride-frontend/actions) of this repository.
2. Click the latest **Build PakRide Android APK** workflow run.
3. Download the **PakRide-Debug-APK** artifact zip.
4. Install `app-debug.apk` directly on any Android phone!

### Option 2: Build Locally with Android Studio
1. Install project dependencies & build web bundle:
   ```bash
   npm install
   npm run build
   npx cap sync android
   ```
2. Open the `android` folder in Android Studio.
3. Select **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**.

---

## 🌐 Deploy to Vercel (Web Version)
1. Go to [vercel.com](https://vercel.com) and click **Add New Project**.
2. Import this repository: `ludostar097-rgb/pakride-frontend`.
3. Set the Environment Variable:
   ```env
   VITE_API_BASE_URL=https://pakride-backend.onrender.com
   ```
4. Click **Deploy**.

---

## 💻 Local Development
```bash
npm install
npm run dev
# Running on http://localhost:3000
```
