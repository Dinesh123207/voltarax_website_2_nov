/* Voltarax ESP8266 monitor. Existing Firebase/INA219/BH1750/DHT11/dust wiring is preserved. */
#include <ESP8266WiFi.h>
#include <Wire.h>
#include <time.h>
#include <BH1750.h>
#include <Adafruit_INA219.h>
#include <DHT.h>
#include <Firebase_ESP_Client.h>
#include "include/reliability.h"
#if defined(VOLTARAX_COMPILE_CHECK)
#include "secrets.example.h"
#elif __has_include("secrets.h")
#include "secrets.h"
#else
#error "Copy secrets.example.h to local secrets.h before a device build"
#endif

#define DHT_PIN D3
#define DUST_LED_PIN D5
const char *FIRMWARE_VERSION = "3.0.0";
const uint32_t LATEST_MS = 5000, HISTORY_MS = 60000;
const float ADC_FULL_SCALE_V = 3.3, DUST_DIVIDER = 1.0, DUST_CLEAN_V = 0.9;
BH1750 lightMeter;
Adafruit_INA219 ina219;
DHT dht(DHT_PIN, DHT11);
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
voltarax::Backoff wifiRetry, uploadRetry;
struct Sample {
  uint32_t ts = 0, uptime = 0;
  int rssi = 0;
  float voltage = NAN, current = NAN, power = NAN, light = NAN, temp = NAN, humidity = NAN, dust = NAN;
  bool inaOk = false, lightOk = false, dhtOk = false, dustOk = false, wifiConnected = false;
};
Sample latestSample;
Sample readSensors();
void buildJson(FirebaseJson &j, const Sample &s);
bool uploadLatest(const Sample &s);
bool uploadHistory(const Sample &s);
voltarax::Ring<Sample, 12> historyBuffer;
bool inaStarted = false, lightStarted = false;
uint32_t lastSample = 0, lastHistory = 0, lastLatest = 0;

bool present(uint8_t address) {
  Wire.beginTransmission(address);
  return Wire.endTransmission() == 0;
}
void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) { wifiRetry.reset(); return; }
  if (!wifiRetry.due(millis())) return;
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  wifiRetry.fail(millis());
  if (wifiRetry.wait < 10000) wifiRetry.wait = 10000;
}
Sample readSensors() {
  Sample s; // Every read starts unavailable; stale successful values are never retained.
  s.ts = uint32_t(time(nullptr)); s.uptime = millis() / 1000; s.wifiConnected = WiFi.status() == WL_CONNECTED; if (s.wifiConnected) s.rssi = WiFi.RSSI();
  if (present(0x40)) {
    if (!inaStarted) { inaStarted = ina219.begin(); if (inaStarted) ina219.setCalibration_32V_1A(); }
    if (inaStarted) {
      float v = ina219.getBusVoltage_V() + ina219.getShuntVoltage_mV() / 1000.0;
      float i = ina219.getCurrent_mA(), p = ina219.getPower_mW();
      s.inaOk = voltarax::validReading(v, 0, 32) && voltarax::validReading(i, 0, 3200) && voltarax::validReading(p, 0, 102400);
      if (s.inaOk) { s.voltage = v; s.current = i; s.power = p; }
    }
  } else inaStarted = false;
  if (present(0x23)) {
    if (!lightStarted) { lightStarted = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE); if (lightStarted) lightMeter.setMTreg(32); }
    if (lightStarted) { float light = lightMeter.readLightLevel(); s.lightOk = voltarax::validReading(light, 0, 200000); if (s.lightOk) s.light = light; }
  } else lightStarted = false;
  float t = dht.readTemperature(), h = dht.readHumidity();
  s.dhtOk = voltarax::validReading(t, 0, 50) && voltarax::validReading(h, 0, 100);
  if (s.dhtOk) { s.temp = t; s.humidity = h; }
  float sum = 0; bool rail = false;
  for (int n = 0; n < 10; n++) {
    digitalWrite(DUST_LED_PIN, LOW); delayMicroseconds(280);
    int value = analogRead(A0); sum += value; rail |= value <= 1 || value >= 1022;
    delayMicroseconds(40); digitalWrite(DUST_LED_PIN, HIGH); delayMicroseconds(9680); yield();
  }
  float estimate = ((sum / 10) / 1023.0 * ADC_FULL_SCALE_V * DUST_DIVIDER - DUST_CLEAN_V) * 200.0;
  s.dustOk = !rail && isfinite(estimate); if (s.dustOk) s.dust = estimate < 0 ? 0 : estimate;
  return s;
}
void buildJson(FirebaseJson &j, const Sample &s) {
  j.set("ts", s.ts); j.set("device_id", DEVICE_ID); j.set("site_id", SITE_ID); j.set("firmware_version", FIRMWARE_VERSION);
  if (s.inaOk) { j.set("voltage_v", s.voltage); j.set("current_ma", s.current); j.set("power_mw", s.power); }
  if (s.lightOk) j.set("light_lux", s.light);
  if (s.dhtOk) { j.set("temp_c", s.temp); j.set("humidity_pct", s.humidity); }
  if (s.dustOk) j.set("dust_ugm3", s.dust);
  if (s.wifiConnected) j.set("rssi", s.rssi);
  j.set("uptime_s", s.uptime);
  j.set("sensors_ok/ina219", s.inaOk); j.set("sensors_ok/bh1750", s.lightOk); j.set("sensors_ok/dht11", s.dhtOk); j.set("sensors_ok/dust", s.dustOk);
}
bool uploadLatest(const Sample &s) {
  FirebaseJson j; buildJson(j, s);
  String target = String("/sites/") + SITE_ID + "/latest";
  bool ok = Firebase.RTDB.setJSON(&fbdo, target.c_str(), &j); yield();
  if (ok && String(SITE_ID) == "solar_site") ok = Firebase.RTDB.setJSON(&fbdo, "/solar_site/latest", &j);
  return ok;
}
bool uploadHistory(const Sample &s) {
  FirebaseJson j; buildJson(j, s);
  String key = String(DEVICE_ID) + "-" + String(s.ts);
  String target = String("/readings/") + SITE_ID + "/" + key;
  String legacy = String("/solar_site/history/") + key;
  bool ok = Firebase.RTDB.setJSON(&fbdo, target.c_str(), &j); yield();
  if (ok) ok = Firebase.RTDB.setJSON(&fbdo, legacy.c_str(), &j);
  return ok; // Keep the sample until both compatibility writes succeed.
}
void setup() {
  Serial.begin(115200); pinMode(DUST_LED_PIN, OUTPUT); digitalWrite(DUST_LED_PIN, HIGH);
  Wire.begin(D2, D1); dht.begin();
  WiFi.persistent(false); WiFi.mode(WIFI_STA); connectWifi();
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  config.api_key = API_KEY; config.database_url = DATABASE_URL;
  auth.user.email = USER_EMAIL; auth.user.password = USER_PASSWORD;
  config.timeout.socketConnection = 10000; config.timeout.serverResponse = 10000;
  fbdo.setBSSLBufferSize(4096, 1024); fbdo.setResponseSize(2048);
  Firebase.reconnectNetwork(false); Firebase.begin(&config, &auth);
}
void loop() {
  connectWifi(); bool firebaseReady = Firebase.ready();
  uint32_t now = millis();
  if (uint32_t(now - lastSample) >= LATEST_MS) {
    lastSample = now; latestSample = readSensors();
    if (voltarax::clockReady(latestSample.ts) && uint32_t(now - lastHistory) >= HISTORY_MS) {
      lastHistory = now; uint32_t dropped = historyBuffer.dropped; historyBuffer.push(latestSample);
      if (historyBuffer.dropped != dropped) Serial.println("History buffer full; oldest sample discarded");
    }
  }
  if (WiFi.status() == WL_CONNECTED && firebaseReady && voltarax::clockReady(latestSample.ts) && uploadRetry.due(now)) {
    bool ok = true;
    if (uint32_t(now - lastLatest) >= LATEST_MS) { ok = uploadLatest(latestSample); if (ok) lastLatest = now; }
    if (ok && !historyBuffer.empty()) { ok = uploadHistory(historyBuffer.front()); if (ok) historyBuffer.pop(); }
    if (ok) uploadRetry.reset(); else { uploadRetry.fail(millis()); Serial.println("Upload deferred; bounded history retained"); }
  }
  ESP.wdtFeed(); yield(); delay(1);
}
