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
#ifndef RELAY_ENABLED
#define RELAY_ENABLED 0
#endif
#ifndef RELAY_PIN
#define RELAY_PIN D6
#endif
#ifndef RELAY_ACTIVE_HIGH
#define RELAY_ACTIVE_HIGH 1
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
uint32_t lastRelayPoll = 0, lastRelayPermission = 0, lastAckTime = 0;
String lastExecutedCommand;
bool lastAckStored = false, lastAckSuccess = false, lastAckOutput = false, lastAckHasOutput = false;
const char *lastAckReason = "none";
void relayFailSafe() {
  if (RELAY_ENABLED && uint32_t(millis() - lastRelayPermission) > 15000) digitalWrite(RELAY_PIN, RELAY_ACTIVE_HIGH ? LOW : HIGH);
}

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
void pollRelay() {
  if (uint32_t(millis() - lastRelayPoll) < 5000) return;
  lastRelayPoll = millis();
  bool allowed = false;
  if (RELAY_ENABLED) {
    bool deviceEnabled = false, permission = false;
    String root = String("/devices/") + DEVICE_ID;
    bool ok = Firebase.RTDB.getBool(&fbdo, (root + "/enabled").c_str(), &deviceEnabled); relayFailSafe();
    if (ok && deviceEnabled) { ok = Firebase.RTDB.getBool(&fbdo, (root + "/relayEnabled").c_str(), &permission); relayFailSafe(); }
    allowed = ok && deviceEnabled && permission;
    if (allowed) lastRelayPermission = millis(); else digitalWrite(RELAY_PIN, RELAY_ACTIVE_HIGH ? LOW : HIGH);
  }
  FirebaseJson json; FirebaseJsonData data;
  String path = String("/relayCommands/") + DEVICE_ID;
  if (!Firebase.RTDB.getJSON(&fbdo, path.c_str(), &json)) { relayFailSafe(); return; }
  relayFailSafe();
  json.get(data, "status"); if (!data.success || data.to<String>() != "pending") return;
  json.get(data, "id"); if (!data.success) return; String id = data.to<String>();
  if (id.length() != 32) return;
  for (unsigned int n = 0; n < id.length(); n++) if (!isxdigit((unsigned char)id[n])) return;
  json.get(data, "device_id"); if (!data.success || data.to<String>() != DEVICE_ID) return;
  json.get(data, "site_id"); if (!data.success || data.to<String>() != SITE_ID) return;
  json.get(data, "created_at"); if (!data.success) return; uint32_t created = data.to<uint32_t>();
  json.get(data, "expires_at"); if (!data.success) return; uint32_t expires = data.to<uint32_t>();
  uint32_t stamp = uint32_t(time(nullptr)); if (!voltarax::commandCurrent(stamp, created, expires)) return;
  json.get(data, "channel"); if (!data.success) return; String channel = data.to<String>();
  json.get(data, "desired"); if (!data.success || data.typeNum != FirebaseJson::JSON_BOOL) return; bool wanted = data.to<bool>();
  if (lastExecutedCommand != id) {
    lastExecutedCommand = id; lastAckStored = false; lastAckTime = stamp; lastAckSuccess = false; lastAckHasOutput = false;
    if (!RELAY_ENABLED || !allowed || uint32_t(millis() - lastRelayPermission) > 15000) lastAckReason = "disabled";
    else if (channel != "load") lastAckReason = "unsupported-channel";
    else {
      if (!voltarax::commandCurrent(uint32_t(time(nullptr)), created, expires)) return;
      digitalWrite(RELAY_PIN, wanted == bool(RELAY_ACTIVE_HIGH) ? HIGH : LOW);
      lastAckOutput = digitalRead(RELAY_PIN) == (RELAY_ACTIVE_HIGH ? HIGH : LOW); lastAckHasOutput = true;
      lastAckSuccess = lastAckOutput == wanted; lastAckReason = lastAckSuccess ? "none" : "output-mismatch";
    }
  }
  if (lastAckStored) return;
  String ackPath = String("/relayAcks/") + DEVICE_ID + "/" + id;
  FirebaseJson existing;
  if (Firebase.RTDB.getJSON(&fbdo, ackPath.c_str(), &existing)) {
    existing.get(data, "command_id"); if (data.success && data.to<String>() == id) { lastAckStored = true; return; }
  }
  relayFailSafe();
  FirebaseJson ack; ack.set("command_id", id); ack.set("ts", lastAckTime); ack.set("received_at/.sv", "timestamp");
  ack.set("success", lastAckSuccess); ack.set("reason", lastAckReason); if (lastAckHasOutput) ack.set("output", lastAckOutput);
  lastAckStored = Firebase.RTDB.setJSON(&fbdo, ackPath.c_str(), &ack); relayFailSafe();
}
void setup() {
  Serial.begin(115200); pinMode(DUST_LED_PIN, OUTPUT); digitalWrite(DUST_LED_PIN, HIGH);
  Wire.begin(D2, D1); dht.begin();
  if (RELAY_ENABLED) { digitalWrite(RELAY_PIN, RELAY_ACTIVE_HIGH ? LOW : HIGH); pinMode(RELAY_PIN, OUTPUT); }
  WiFi.persistent(false); WiFi.mode(WIFI_STA); connectWifi();
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  config.api_key = API_KEY; config.database_url = DATABASE_URL;
  auth.user.email = USER_EMAIL; auth.user.password = USER_PASSWORD;
  config.timeout.socketConnection = 10000; config.timeout.serverResponse = 10000;
  fbdo.setBSSLBufferSize(4096, 1024); fbdo.setResponseSize(2048);
  Firebase.reconnectNetwork(false); Firebase.begin(&config, &auth);
}
void loop() {
  relayFailSafe(); connectWifi(); bool firebaseReady = Firebase.ready();
  uint32_t now = millis();
  if (uint32_t(now - lastSample) >= LATEST_MS) {
    lastSample = now; latestSample = readSensors();
    if (voltarax::clockReady(latestSample.ts) && uint32_t(now - lastHistory) >= HISTORY_MS) {
      lastHistory = now; uint32_t dropped = historyBuffer.dropped; historyBuffer.push(latestSample);
      if (historyBuffer.dropped != dropped) Serial.println("History buffer full; oldest sample discarded");
    }
  }
  if (WiFi.status() == WL_CONNECTED && firebaseReady && voltarax::clockReady(uint32_t(time(nullptr)))) pollRelay();
  relayFailSafe();
  if (WiFi.status() == WL_CONNECTED && firebaseReady && voltarax::clockReady(latestSample.ts) && uploadRetry.due(now)) {
    bool ok = true;
    if (uint32_t(now - lastLatest) >= LATEST_MS) { ok = uploadLatest(latestSample); if (ok) lastLatest = now; }
    if (ok && !historyBuffer.empty()) { ok = uploadHistory(historyBuffer.front()); if (ok) historyBuffer.pop(); }
    if (ok) uploadRetry.reset(); else { uploadRetry.fail(millis()); Serial.println("Upload deferred; bounded history retained"); }
  }
  ESP.wdtFeed(); yield(); delay(1);
}
