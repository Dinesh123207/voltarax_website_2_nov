"""Local health analysis matching the supplied Solar Monitor guide."""
import time
import cv2

PANEL_PMAX_W = 10.0
TEMP_COEFF = -0.004
NOCT_C = 45.0
BASELINE_PR = 0.75
LUX_PER_WM2 = 120.0
DUST_HIGH = 150.0

def evaluate(d):
    alerts, score = [], 100
    age = time.time() - d.get("ts", 0)
    g = d.get("light_lux", 0) / LUX_PER_WM2
    t_cell = d.get("temp_c", 25) + (NOCT_C - 20) / 800.0 * g
    expected_w = PANEL_PMAX_W * g / 1000.0 * (1 + TEMP_COEFF * (t_cell - 25))
    actual_w = d.get("power_mw", 0) / 1000.0
    dusty = d.get("dust_ugm3", 0) > DUST_HIGH
    pr = None
    if g > 200 and expected_w > 0:
        pr = actual_w / expected_w
        rel = pr / BASELINE_PR if BASELINE_PR else pr
        if rel < 0.6:
            score -= 40
            alerts.append("Output far below normal - check shading, wiring, connectors")
        elif rel < 0.85:
            score -= 20
            alerts.append("Output below normal" + (" - dust likely, clean panel" if dusty else ""))
    if dusty:
        score -= 10
        alerts.append("High airborne dust")
    if t_cell > 70:
        score -= 15
        alerts.append("Panel overheating")
    for name, ok in d.get("sensors_ok", {}).items():
        if not ok:
            score -= 15
            alerts.append("Sensor not responding: " + name)
    score = max(score, 0)
    status = "OK" if score >= 80 else "WARNING" if score >= 50 else "FAULT"
    if age > 60:
        status = "OFFLINE"
        alerts.insert(0, "No data for over 60 s - check NodeMCU / WiFi")
    return {"ts": int(time.time()), "status": status, "health_score": score, "alerts": alerts,
            "performance_ratio": round(pr, 3) if pr is not None else None,
            "irradiance_wm2": round(g), "cell_temp_c": round(t_cell, 1)}

def analyze_frame(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    return {"brightness": round(float(gray.mean()), 1),
            "sharpness": round(float(cv2.Laplacian(gray, cv2.CV_64F).var()), 1),
            "dark_ratio": round(float((gray < 40).mean()), 3)}
