const { PDFDocument } = require('pdfkit');
function invoicePlanLabel(name) {
  if (typeof name !== 'string' || !name.trim()) throw Error('Invalid test invoice plan label');
  return /^[\x20-\x7e]{1,200}$/.test(name) ? name : 'Unavailable in this PDF: non-ASCII plan label. See the authenticated order for its original name.';
}
async function renderInvoice(evidence) {
  if (evidence.mode !== 'test' || evidence.currency !== 'INR' || evidence.gst !== null || !Number.isSafeInteger(evidence.amountPaise) || evidence.amountPaise < 100) throw Error('Invalid test invoice');
  const planLabel = invoicePlanLabel(evidence.planName);
  if (![evidence.id, evidence.orderId, evidence.gatewayOrderId, evidence.paymentId, evidence.userId].every(value => typeof value === 'string' && /^[\x20-\x7e]{1,180}$/.test(value))) throw Error('Unsupported test invoice identifier');
  const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: 'Voltarax test payment receipt', CreationDate: new Date(evidence.confirmedAt) } });
  const chunks = [], complete = new Promise((resolve, reject) => { doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
  doc.fontSize(22).fillColor('#12604a').text('VOLTARAX');
  doc.moveDown().fontSize(14).fillColor('#8b260c').text('TEST MODE - NO REAL PAYMENT');
  doc.moveDown().fontSize(17).fillColor('#123126').text('Test payment receipt / invoice');
  doc.moveDown().font('Helvetica').fontSize(10).fillColor('#334155');
  for (const [label, value] of [['Receipt', evidence.id], ['Order', evidence.orderId], ['Gateway order', evidence.gatewayOrderId],
    ['Payment reference', evidence.paymentId], ['Buyer account', evidence.userId], ['Plan', planLabel],
    ['Billing', 'One-time purchase; no recurring mandate'], ['Total (Calculated)', `INR ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(evidence.amountPaise / 100)}`],
    ['Server confirmed', new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short', hour12: false }).format(new Date(evidence.confirmedAt)) + ' IST']]) {
    doc.font('Helvetica-Bold').text(label).font('Helvetica').text(String(value), { width: 495 }).moveDown(0.5);
  }
  doc.moveDown().fontSize(10).text('Confirmed from a verified test-mode captured-payment webhook. This document records a test transaction; no real funds or delivery are established.');
  doc.moveDown().text('GST details: Unavailable. GST is disabled. This is not a GST tax invoice. Seller tax details and legal review are required before tax invoicing.');
  doc.moveDown().text('Language/font coverage: English ASCII text. Original non-ASCII plan names remain in the authenticated order; this PDF does not transliterate them.');
  doc.end(); return complete;
}
module.exports = { renderInvoice, invoicePlanLabel };
