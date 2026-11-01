param(
  [string]$BaseUrl = "https://voltarax.in",
  [string]$DeviceKey = "YOUR_HARDWARE_API_KEY"
)

$payload = @{
  device_id = "nodemcu-test"
  ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  voltage_v = 11.82
  current_ma = 412.5
  power_mw = 4876
  light_lux = 48210
  temp_c = 31.0
  humidity_pct = 46
  dust_ugm3 = 38
  rssi = -61
  uptime_s = 120
  sensors_ok = @{ ina219 = $true; bh1750 = $true; dht11 = $true; dust = $true }
} | ConvertTo-Json -Depth 4

Invoke-RestMethod -Method Post `
  -Uri "$BaseUrl/api/telemetry/ingest" `
  -Headers @{ "x-device-key" = $DeviceKey } `
  -ContentType "application/json" `
  -Body $payload
