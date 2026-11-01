/*
 * Voltarax Solar Monitor — ESP8266 / NodeMCU
 * Firebase RTDB mode, aligned with the supplied Solar Panel Monitoring System guide.
 *
 * Data path:
 * Sensors -> NodeMCU -> WiFi -> Firebase RTDB -> Voltarax GoDaddy API -> Dashboard
 *
 * Option A is used: INA219 supplies panel voltage/current/power and GP2Y1010AU0F owns A0.
 * Hardware map: SDA D2/GPIO4, SCL D1/GPIO5, DHT11 D3/GPIO0, dust LED D5/GPIO14, dust OUT A0.
 */
#include <ESP8266WiFi.h>
#include <Wire.h>
#include <time.h>
#include <BH1750.h>
#include <Adafruit_INA219.h>
#include <DHT.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include "secrets.h"

#define DHT_PIN D3
#define DHT_TYPE DHT11
#define DUST_LED_PIN D5

const unsigned long LATEST_MS = 5000;
const unsigned long HISTORY_MS = 60000;
const float ADC_FULL_SCALE_V = 3.3;
const float DUST_DIVIDER = 1.0;
float DUST_CLEAN_V = 0.9;

BH1750 lightMeter;
Adafruit_INA219 ina219;
DHT dht(DHT_PIN, DHT_TYPE);
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

bool okIna = false, okBh = false;
float voltage_v = 0, current_ma = 0, power_mw = 0, lux = 0, dust_ugm3 = 0;
float temp_c = NAN, hum = NAN;
unsigned long tLatest = 0, tHistory = 0;

float readDustUgm3() {
  const int N = 10;
  float sum = 0;
  for (int i = 0; i < N; i++) {
    digitalWrite(DUST_LED_PIN, LOW);
    delayMicroseconds(280);
    sum += analogRead(A0);
    delayMicroseconds(40);
    digitalWrite(DUST_LED_PIN, HIGH);
    delayMicroseconds(9680);
  }
  float dust_v = (sum / N) / 1023.0 * ADC_FULL_SCALE_V * DUST_DIVIDER;
  float ugm3 = (dust_v - DUST_CLEAN_V) * 200.0;
  return ugm3 < 0 ? 0 : ugm3;
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 20000) delay(300);
}

void readSensors() {
  if (okIna) {
    float busV = ina219.getBusVoltage_V();
    float shuntV = ina219.getShuntVoltage_mV() / 1000.0;
    voltage_v = busV + shuntV;
    current_ma = ina219.getCurrent_mA();
    power_mw = ina219.getPower_mW();
    if (current_ma < 0) current_ma = 0;
    if (power_mw < 0) power_mw = 0;
  }
  if (okBh) {
    float l = lightMeter.readLightLevel();
    if (l >= 0) lux = l;
  }
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t)) temp_c = t;
  if (!isnan(h)) hum = h;
  dust_ugm3 = readDustUgm3();
}

void buildJson(FirebaseJson &j) {
  j.set("ts", (int)time(nullptr));
  j.set("device_id", DEVICE_ID);
  j.set("site_id", SITE_ID);
  j.set("voltage_v", voltage_v);
  j.set("current_ma", current_ma);
  j.set("power_mw", power_mw);
  j.set("light_lux", lux);
  if (!isnan(temp_c)) j.set("temp_c", temp_c);
  if (!isnan(hum)) j.set("humidity_pct", hum);
  j.set("dust_ugm3", dust_ugm3);
  j.set("rssi", (int)WiFi.RSSI());
  j.set("uptime_s", (int)(millis() / 1000));
  j.set("sensors_ok/ina219", okIna);
  j.set("sensors_ok/bh1750", okBh);
  j.set("sensors_ok/dht11", !isnan(temp_c) && !isnan(hum));
  j.set("sensors_ok/dust", true);
}

void upload(bool history) {
  if (!Firebase.ready() || time(nullptr) < 1700000000) return;
  FirebaseJson j;
  buildJson(j);
  if (!Firebase.RTDB.setJSON(&fbdo, "/solar_site/latest", &j)) {
    Serial.println(fbdo.errorReason());
    return;
  }
  String siteLatest = String("/sites/") + SITE_ID + "/latest";
  if (!Firebase.RTDB.setJSON(&fbdo, siteLatest.c_str(), &j)) Serial.println(fbdo.errorReason());
  if (history) {
    // Same key on both paths makes retries and migration idempotent.
    String key = String(DEVICE_ID) + "-" + String((uint32_t)time(nullptr));
    String partition = String("/readings/") + SITE_ID + "/" + key;
    String legacy = String("/solar_site/history/") + key;
    if (!Firebase.RTDB.setJSON(&fbdo, partition.c_str(), &j)) Serial.println(fbdo.errorReason());
    if (!Firebase.RTDB.setJSON(&fbdo, legacy.c_str(), &j)) Serial.println(fbdo.errorReason());
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(DUST_LED_PIN, OUTPUT);
  digitalWrite(DUST_LED_PIN, HIGH);
  Wire.begin(D2, D1);

  okBh = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  if (okBh) lightMeter.setMTreg(32);
  okIna = ina219.begin();
  if (okIna) ina219.setCalibration_32V_1A();
  dht.begin();

  connectWifi();
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  unsigned long started = millis();
  while (time(nullptr) < 1700000000 && millis() - started < 15000) delay(200);

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  config.token_status_callback = tokenStatusCallback;
  fbdo.setBSSLBufferSize(4096, 1024);
  Firebase.reconnectNetwork(true);
  Firebase.begin(&config, &auth);
}

void loop() {
  connectWifi();
  if (millis() - tLatest >= LATEST_MS) {
    tLatest = millis();
    readSensors();
    bool history = millis() - tHistory >= HISTORY_MS;
    if (history) tHistory = millis();
    upload(history);
    Serial.printf("V=%.2f I=%.0fmA P=%.0fmW lux=%.0f T=%.1f H=%.0f dust=%.0f\n", voltage_v, current_ma, power_mw, lux, temp_c, hum, dust_ugm3);
  }
}
