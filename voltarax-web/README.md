# Voltarax — Renewable Energy Intelligence Platform

Full-stack Voltarax corporate website + hardware-ready solar monitoring dashboard.

## Architecture

```text
BH1750 / DHT11 / INA219 / GP2Y1010AU0F
                │
                ▼
        NodeMCU ESP8266
                │ Wi-Fi + Firebase Auth
                ▼
        Firebase Realtime DB
                │
                ▼
       GoDaddy Node/Express API
                │
                └── Next.js dashboard (same origin)

ESP32-CAM ──LAN MJPEG──► Raspberry Pi / OpenCV
```

The software now follows the supplied Solar Panel Monitoring System guide using Firebase Realtime Database as the application and telemetry database. The NodeMCU writes directly to Firebase, while the GoDaddy Node API reads Firebase through the Admin SDK. MongoDB is no longer required.

## Hardware integration

See `hardware/README.md`.

The primary hardware path is direct Firebase RTDB writes. The optional bridge endpoint remains available:

`POST /api/telemetry/ingest`

It can be used for testing or non-Firebase devices. The accepted payload matches the guide's fields: voltage, current, power, lux, temperature, humidity, dust, RSSI, uptime and sensor health.

The dashboard reads:

- `/api/telemetry/latest`
- `/api/telemetry/history`
- `/api/telemetry/analysis`
- `/api/dashboard`

No Render/onrender service is required.

## Circuit considerations from the supplied guide

The guide identifies the shared ESP8266 A0 conflict between the voltage divider and dust sensor. The included NodeMCU firmware uses **Option A**: INA219 for panel voltage/current/power and A0 exclusively for the dust sensor. If the divider is retained, use an ADS1115 as described in the guide.

The guide also specifies D1/D2 I2C, D3 DHT11, D5 dust LED, BH1750 MTreg 32, appropriate INA219 calibration, 5-second latest readings and 60-second history. These are reflected in the hardware integration files.

## Local development

Backend:
```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Production / GoDaddy

Set the backend environment variables in `backend/.env`, especially:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `FIREBASE_DEVICE_UID`
- `SOLAR_SITE_ID`
- `SOLAR_PANEL_COUNT`
- panel calibration values

Run the Node backend behind HTTPS on your GoDaddy deployment. The NodeMCU can communicate directly with Firebase over Wi-Fi, so it does not need to expose your GoDaddy server credentials. Keep the Firebase service-account private key only on the GoDaddy backend.

## Chatbot

The website chatbot is deliberately local for the three supported questions and does not require an external AI API for basic use.

## Project structure

```text
voltarax-web/
├── frontend/              Next.js website + dashboard
├── backend/               Express + Firebase Admin API
├── ai-engine/             Python training/prediction pipeline (see ai-engine/README.md)
├── hardware/
│   ├── nodemcu/           ESP8266 firmware
│   ├── esp32-cam/         camera integration notes
│   └── raspberry-pi/      Pi/OpenCV reference dashboard + analysis
├── docs/
│   └── Voltarax_Project_Reference.pdf   status, roadmap, IP and fundraising plan (internal)
└── README.md
```

## Dashboard/API architecture

The Next.js dashboard uses same-origin `/api/*` URLs. `frontend/next.config.js` rewrites these requests to the local Node/Express backend. Set `BACKEND_URL` when the backend is not on `127.0.0.1:5000`. This removes the previous Render/VoltVision dependency and keeps the browser unaware of backend hostnames.
