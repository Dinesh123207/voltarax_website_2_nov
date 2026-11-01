# NodeMCU monitor

The existing ESP8266 sketch and Firebase path remain in place. `src/main.cpp` wraps the same `.ino` for PlatformIO; the original sketch remains usable in the Arduino IDE.

Copy `secrets.example.h` to ignored `secrets.h` for an actual device build. Keep credentials local. The `compile_check` environment always includes the example file, even if real credentials exist. It builds only and must never be uploaded. `device` uses real local configuration.

Use a dedicated Firebase Authentication device account for USER_EMAIL/USER_PASSWORD, not a personal account. WIFI_SSID/WIFI_PASSWORD, API_KEY, DATABASE_URL, DEVICE_ID and SITE_ID are described in the example. For Arduino IDE, select NodeMCU 1.0 (ESP-12E Module) and install the Firebase ESP Client, BH1750, Adafruit INA219, DHT and Adafruit Unified Sensor libraries; PlatformIO resolves the pinned dependencies automatically.

Existing pin assignments are SDA D2/GPIO4, SCL D1/GPIO5, DHT11 D3/GPIO0, dust LED D5/GPIO14 and dust analogue output A0. INA219 supplies voltage/current/power; A0 belongs to the dust sensor. Verify the board's actual ADC divider before calibration.

Current data goes to sites/{SITE_ID}/latest, with solar_site/latest retained for the default site. History goes to readings/{SITE_ID}/{DEVICE_ID}-{capturedUnixSeconds} and the legacy solar_site/history path using the same key. No historical data was deleted or migrated by this change.

```powershell
pio run -e compile_check -j 2
pio test -e native
# Operator only, after reviewing real local configuration:
pio run -e device -j 2
```

Native tests need a host GCC compiler in PATH. They test bounded buffering, retry backoff/millis wrap, invalid-value rejection and clock readiness. They do not test sensors, Wi-Fi, Firebase credentials or electrical hardware.

Sampling runs every five seconds. Only NTP-dated history samples are buffered, at one-minute intervals. The RAM ring holds twelve samples and drops the oldest when full, with a serial notice. Reboot loses this buffer. Captured timestamps and deterministic keys survive retries, and a sample is removed only after both history writes succeed. Delayed history never overwrites current latest. This is bounded recovery, not lossless storage.

Sensor reads start unavailable each cycle. I2C presence/range checks, DHT validation and ADC rail checks suppress invalid values; these checks cannot prove every wiring fault. Dust concentration is an estimate using the existing ADC/calibration assumptions and needs calibration. No sensor accuracy is claimed by software tests.

Before flashing, complete the physical wiring/calibration and test-project steps in `../../../docs/MANUAL_STEPS.md`. No device was flashed or connected to the live database by this run. Relay support is still tracked separately in PROGRESS.md.
