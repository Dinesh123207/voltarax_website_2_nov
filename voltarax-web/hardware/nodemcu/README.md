# NodeMCU Firebase firmware

This firmware follows the supplied solar monitoring guide and writes directly to Firebase Realtime Database.

## Arduino libraries

Install:

- Firebase Arduino Client Library for ESP8266 and ESP32 (mobizt)
- BH1750
- Adafruit INA219
- DHT sensor library
- Adafruit Unified Sensor

## Configure

Copy `secrets.example.h` to `secrets.h`, then edit the local `secrets.h` values:

- `WIFI_SSID`
- `WIFI_PASSWORD`
- `API_KEY` — Firebase Web API key
- `DATABASE_URL` — Firebase RTDB URL
- `USER_EMAIL` — dedicated Firebase Authentication device user
- `USER_PASSWORD`

Do not use your personal Firebase account. Create a dedicated device account.

## Upload

Select **NodeMCU 1.0 (ESP-12E Module)** in Arduino IDE.

The firmware publishes:

- `/solar_site/latest` every 5 seconds
- `/solar_site/history/<pushId>` every 60 seconds

The payload uses the PDF's telemetry contract and includes `ts` as UTC epoch seconds.
