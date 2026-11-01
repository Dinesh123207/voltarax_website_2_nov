"""
Canonical structured schema for a single telemetry reading.

Every reading — whether it arrived via the NodeMCU writing straight to
Firebase, or through the Node backend's /api/telemetry/ingest bridge — is
stored at /solar_site/history/<pushId> in this shape (see
backend/README-FIREBASE.md and hardware/README.md for the hardware side of
this contract). The AI engine trusts this shape and nothing else: if the
hardware format ever changes, update it here first and everything downstream
(ingest -> features -> models) follows.
"""
from dataclasses import dataclass, fields
from typing import Optional

# Column name -> pandas dtype. Kept as plain floats/ints (not a strict
# pydantic/dataclass parse) because sensor payloads are occasionally missing
# a field (a sensor was briefly unavailable) — see data/ingest.py for how
# missing fields are handled (never silently invented).
TELEMETRY_COLUMNS = {
    "ts": "int64",             # epoch seconds, UTC — primary key / time axis
    "device_id": "string",
    "site_id": "string",
    "voltage_v": "float64",
    "current_ma": "float64",
    "power_mw": "float64",
    "light_lux": "float64",
    "temp_c": "float64",
    "humidity_pct": "float64",
    "dust_ugm3": "float64",
    "rssi": "float64",
    "uptime_s": "float64",
    "sensors_ok_ina219": "boolean",
    "sensors_ok_bh1750": "boolean",
    "sensors_ok_dht11": "boolean",
    "sensors_ok_dust": "boolean",
}

REQUIRED_FOR_TRAINING = ["ts", "power_mw", "light_lux"]


@dataclass
class Reading:
    ts: int
    voltage_v: Optional[float] = None
    current_ma: Optional[float] = None
    power_mw: Optional[float] = None
    light_lux: Optional[float] = None
    temp_c: Optional[float] = None
    humidity_pct: Optional[float] = None
    dust_ugm3: Optional[float] = None
    rssi: Optional[float] = None
    uptime_s: Optional[float] = None
    device_id: Optional[str] = None
    site_id: Optional[str] = None
    sensors_ok_ina219: Optional[bool] = None
    sensors_ok_bh1750: Optional[bool] = None
    sensors_ok_dht11: Optional[bool] = None
    sensors_ok_dust: Optional[bool] = None

    @classmethod
    def field_names(cls):
        return [f.name for f in fields(cls)]
