const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { invoicePlanLabel, renderInvoice } = require('../services/invoices');
test('test receipt never sends unsupported Hindi/emoji/control glyphs to the base PDF font', async () => {
  assert.equal(invoicePlanLabel('Original ASCII plan'), 'Original ASCII plan');
  for (const name of ['सौर उपकरण योजना', 'Solar ☀️ plan', 'Plan\nnew line']) assert.match(invoicePlanLabel(name), /Unavailable in this PDF/);
  const evidence = { id: 'TEST-SYNTHETIC-UNICODE', mode: 'test', orderId: 'synthetic-order-font-review', userId: 'synthetic-buyer', gatewayOrderId: 'order_SyntheticFont',
    paymentId: 'pay_SyntheticFont', planName: 'सौर उपकरण योजना', amountPaise: 12345, currency: 'INR', confirmedAt: '2026-11-02T06:30:00.000Z', gst: null };
  const before = JSON.stringify(evidence), pdf = await renderInvoice(evidence);
  assert.equal(JSON.stringify(evidence), before, 'Original immutable evidence must not be transliterated or replaced');
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  fs.writeFileSync(path.resolve(__dirname, '../../../docs/test-results/phase08-unicode-invoice-layout-fixture.pdf'), pdf);
  await assert.rejects(renderInvoice({ ...evidence, userId: 'अमान्य-पहचानकर्ता' }), /Unsupported/);
  await assert.rejects(renderInvoice({ ...evidence, mode: 'live' }), /Invalid/);
  await assert.rejects(renderInvoice({ ...evidence, currency: 'USD' }), /Invalid/);
});
