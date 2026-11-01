# Scheduling the AI engine

The pipeline is a script, not a server — schedule it, don't run it forever.
Hourly is a reasonable default: the NodeMCU appends one history row a
minute, so an hour brings ~60 new rows, comfortably under
`AI_MIN_NEW_ROWS_TO_RETRAIN` (100 by default) most of the time, which keeps
retraining from happening needlessly every single run once a model is
already trained.

## One-time setup

```bash
cd ai-engine
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill in your Firebase project details
python scripts/run_once.py  # test it manually first
```

## Linux (cron)

```bash
crontab -e
```
```
0 * * * * cd /path/to/voltarax-web/ai-engine && .venv/bin/python scripts/run_once.py >> /var/log/voltarax-ai.log 2>&1
```

## Linux (systemd timer — preferred if the box already runs the Node backend as a service)

`/etc/systemd/system/voltarax-ai.service`
```ini
[Unit]
Description=Voltarax AI engine — one training/prediction pass

[Service]
Type=oneshot
WorkingDirectory=/path/to/voltarax-web/ai-engine
ExecStart=/path/to/voltarax-web/ai-engine/.venv/bin/python scripts/run_once.py
```

`/etc/systemd/system/voltarax-ai.timer`
```ini
[Unit]
Description=Run the Voltarax AI engine hourly

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
```
```bash
sudo systemctl enable --now voltarax-ai.timer
```

## Windows (Task Scheduler)

Action: `Start a program`
Program: `C:\path\to\ai-engine\.venv\Scripts\python.exe`
Arguments: `scripts\run_once.py`
Start in: `C:\path\to\ai-engine`
Trigger: hourly.

## What "it starts training automatically" actually means

There is no separate step to "turn on" training once hardware is connected.
Every scheduled run always calls the same pipeline; today it publishes
`{"status": "not_enough_data", "reason": "waiting for hardware data (0/300)"}`
to `/solar_site/ai/*`, and the dashboard shows that honestly. The first run
where each model's row/daylight-row threshold (`config.py`) is met, that
model trains and starts publishing real predictions — same script, same
schedule, no redeploy needed.
