const test = require('node:test');
const assert = require('node:assert/strict');
const { formatISTClock, startAlignedClock } = require('../../frontend/lib/clock.ts');
test('clock crosses midnight in India and pauses/resumes/cleans up without continuing hidden ticks', () => {
  let now = Date.UTC(2026, 9, 31, 18, 29, 59, 700), visible = true, listener, unlistened = false, latest;
  let job;
  const stop = startAlignedClock({ now: () => now, visible: () => visible, onTick: value => { latest = formatISTClock(value); },
    schedule: (callback, delay) => { const current = { callback, delay, cancelled: false }; job = current; return () => { current.cancelled = true; }; },
    listen: callback => { listener = callback; return () => { unlistened = true; }; } });
  assert.match(latest, /31\/10\/2026.*23:59:59 IST/); assert.equal(job.delay, 300);
  now += 300; job.callback(); assert.match(latest, /01\/11\/2026.*00:00:00 IST/);
  visible = false; listener(); assert.equal(job.cancelled, true);
  const hidden = latest; now += 120000; assert.equal(latest, hidden);
  visible = true; listener(); assert.match(latest, /00:02:00 IST/); assert.equal(job.cancelled, false);
  stop(); assert.equal(unlistened, true); assert.equal(job.cancelled, true);
});
