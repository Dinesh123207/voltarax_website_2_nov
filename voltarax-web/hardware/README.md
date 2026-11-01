# Voltarax Solar Hardware Integration

This folder turns the Solar Panel Monitoring System guide into a deployment-ready hardware interface for the Voltarax website.

## Data path

`BH1750 + DHT11 + INA219 + GP2Y1010AU0F -> NodeMCU ESP8266 -> Wi-Fi -> Firebase RTDB -> GoDaddy API -> Dashboard`

The ESP32-CAM is kept as a separate LAN camera source for the future Raspberry Pi/OpenCV pipeline.

## Important circuit point from the supplied guide

The guide identifies a critical ESP8266 ADC conflict: the voltage divider and GP2Y1010AU0F dust sensor both use A0. The firmware supplied here follows **Option A**: voltage is read from INA219 and the dust sensor keeps A0. If the voltage divider must be retained, use the guide's ADS1115 Option B instead.

The guide also specifies:
- I2C SDA D2/GPIO4 and SCL D1/GPIO5
- DHT11 DATA D3/GPIO0 with 10k pull-up
- GP2Y1010AU0F LED D5/GPIO14
- dust output A0
- BH1750 high-range MTreg 32
- INA219 calibration chosen according to panel Voc/current
- latest telemetry every 5 seconds and history at 60 seconds

## Device configuration

1. Create a dedicated Firebase device account and configure its UID in your local rules deployment copy.
2. Copy `nodemcu/secrets.example.h` to `nodemcu/secrets.h` and fill in Wi-Fi and Firebase device details locally. Never commit the populated file.
3. Install the libraries listed in `../backend/README-FIREBASE.md`, compile and flash the NodeMCU.
4. Configure and start the backend and frontend, then log in to the dashboard to inspect readings.

`HARDWARE_API_KEY` applies only to the optional HTTP bridge; the supplied NodeMCU firmware writes directly to Firebase and does not use that key or an `API_HOST` setting. See `../../docs/DEPLOY.md`.

The dashboard reads the same-origin API. There is no Render/onrender dependency.

## POST contract

`POST /api/telemetry/ingest`

Header:
`x-device-key: YOUR_HARDWARE_API_KEY`

Example body:
```json
{
  "device_id": "nodemcu-01",
  "ts": 1735689600,
  "voltage_v": 11.82,
  "current_ma": 412.5,
  "power_mw": 4876,
  "light_lux": 48210,
  "temp_c": 31.0,
  "humidity_pct": 46,
  "dust_ugm3": 38,
  "rssi": -61,
  "uptime_s": 86400,
  "sensors_ok": {
    "ina219": true,
    "bh1750": true,
    "dht11": true,
    "dust": true
  }
}
```

## API used by the website

- `GET /api/telemetry/latest`
- `GET /api/telemetry/history?limit=100`
- `GET /api/telemetry/analysis`
- `GET /api/dashboard`
- `GET /api/panels`
- `GET /api/alerts`
- `GET /api/forecast`

Dashboard GET routes require the normal JWT login. The hardware POST route requires only the device key.

## Firebase architecture

The supplied PDF uses Firebase Realtime Database as the cloud hub, and the Voltarax implementation now follows that design. The NodeMCU writes `/solar_site/latest` every 5 seconds and `/solar_site/history` every 60 seconds using a dedicated Firebase Email/Password device account. The GoDaddy Node API reads the same Firebase data using the Firebase Admin SDK and exposes authenticated same-origin dashboard APIs.

The old HTTP ingestion endpoint `/api/telemetry/ingest` remains available as an optional bridge/test endpoint, but the physical NodeMCU firmware no longer depends on it.

See `../backend/README-FIREBASE.md` for Firebase setup and security rules.
