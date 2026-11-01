# Voltarax Firebase migration

The application database is now Firebase Realtime Database (RTDB). MongoDB is no longer required.

## Architecture

```text
BH1750 / DHT11 / INA219 / GP2Y1010AU0F
             |
          NodeMCU
             |
          Wi-Fi
             |
       Firebase RTDB
             |
     Voltarax Node API
             |
       GoDaddy dashboard
```

This follows the supplied Solar Panel Monitoring System guide: `latest` is overwritten every 5 seconds and `history` receives one record per minute. The NodeMCU authenticates to Firebase with a dedicated Email/Password device account.

## Firebase setup

1. Create a Firebase project.
2. Enable **Realtime Database**.
3. Create an **Email/Password** Authentication user for the NodeMCU, e.g. `device@voltarax.in`.
4. Copy the device UID into `FIREBASE_DEVICE_UID` and into `firebase.rules.json`.
5. Create a Firebase service account for the GoDaddy Node API. Never put its private key in the frontend or NodeMCU.
6. Put the service account values into `backend/.env`.
7. Deploy `firebase.rules.json` to the RTDB.
8. Run `npm install` in `backend`, then `npm run seed`.

## Data layout

```text
solar_site/
  latest/
  history/<pushId>/
  analysis/
  analysis_history/<timestamp>/
users/<uid>/
content/
  contacts/<pushId>/
  subscribers/<pushId>/
  demo_requests/<pushId>/
  posts/<pushId>/
  site_stats/<key>/
```

The telemetry fields follow the supplied guide: `ts`, `voltage_v`, `current_ma`, `power_mw`, `light_lux`, `temp_c`, `humidity_pct`, `dust_ugm3`, `rssi`, `uptime_s`, and `sensors_ok`.

## Hardware

Install these Arduino libraries:

- Firebase Arduino Client Library for ESP8266 and ESP32 (mobizt)
- BH1750
- Adafruit INA219
- DHT sensor library
- Adafruit Unified Sensor

Copy `hardware/nodemcu/secrets.example.h` to `hardware/nodemcu/secrets.h` and configure locally:

- `WIFI_SSID`
- `WIFI_PASSWORD`
- `API_KEY`
- `DATABASE_URL`
- `USER_EMAIL`
- `USER_PASSWORD`

The device writes directly to Firebase. The GoDaddy API is therefore not required for the physical sensor-to-cloud path.

## Website / dashboard

The browser still talks only to the GoDaddy same-origin `/api/*` endpoints. The Node API uses Firebase Admin SDK to read telemetry and analysis. Firebase credentials never reach the browser.

## Important security note

Do not use `.read: true` in production. The dashboard does not need public Firebase reads because the GoDaddy API is the controlled read layer. The Admin SDK bypasses RTDB rules for server-side analysis writes.
