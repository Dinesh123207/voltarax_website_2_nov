# ESP32-CAM integration

The supplied guide specifies an AI-Thinker ESP32-CAM using the Arduino `CameraWebServer` example.

Recommended settings from the guide:
- `CAMERA_MODEL_AI_THINKER`
- QVGA `320x240` for the Raspberry Pi stream
- JPEG quality `12`
- fixed/reserved LAN IP (example `192.168.1.60`)
- `WiFi.setSleep(false)` for lower stream latency
- stream: `http://CAMERA_IP:81/stream`
- frame: `http://CAMERA_IP/capture`

The stream is intentionally LAN-only. The public Voltarax website should display analysis/results rather than exposing the camera directly.

Use the Arduino ESP32 CameraWebServer example and apply the settings above. The Raspberry Pi integration is in `hardware/raspberry-pi`.
