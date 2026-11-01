// India uses UTC+05:30 year-round. All inputs and outputs are Unix seconds.
const IST_OFFSET_MS = 330 * 60 * 1000;

function periodStartsIST(now = new Date()) {
  const local = new Date(now.getTime() + IST_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  const start = (month, day) => (Date.UTC(y, month, day) - IST_OFFSET_MS) / 1000;
  return { day: start(m, d), month: start(m, 1), year: start(0, 1) };
}

function integrateKwh(readings, start, end) {
  const rows = readings.filter(r => Number.isFinite(Number(r.ts)))
    .slice().sort((a, b) => Number(a.ts) - Number(b.ts));
  let energy = 0;
  for (let i = 1; i < rows.length; i++) {
    const ts = Number(rows[i - 1].ts);
    const next = Number(rows[i].ts);
    const from = Math.max(ts, start);
    const to = Math.min(next, ts + 900, end);
    const power = Number(rows[i - 1].power_mw);
    if (to > from && Number.isFinite(power)) energy += Math.max(0, power) / 1e6 * (to - from) / 3600;
  }
  return energy;
}

module.exports = { periodStartsIST, integrateKwh };
