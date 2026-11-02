ARG PYTHON_IMAGE=python:3.13.15-slim-bookworm@sha256:2325bb286ec344af3e5898cc224b5844e2707ac6e26b1632516fd3edc84a5e26
FROM ${PYTHON_IMAGE} AS dependencies
WORKDIR /srv
COPY requirements.lock.txt ./
RUN python -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -r requirements.lock.txt

FROM ${PYTHON_IMAGE} AS runtime
ENV PATH=/opt/venv/bin:$PATH PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /srv
COPY --from=dependencies /opt/venv /opt/venv
COPY config.py ./
COPY data ./data
COPY configs ./configs
COPY models ./models
COPY pipeline ./pipeline
COPY scripts ./scripts
RUN useradd --uid 10001 --create-home ai && mkdir -p /srv/artifacts && chown ai:ai /srv/artifacts
USER ai
# Batch inference job. Scheduling and real-data validation are separate operator steps.
CMD ["python", "scripts/predict_once.py"]
