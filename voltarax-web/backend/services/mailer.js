const React = require('react');
const { render, toPlainText } = require('@react-email/render');
const nodemailer = require('nodemailer');

function mailConfigured(env = process.env) {
  return env.EMAIL_ENABLED === 'true' && !!(env.SMTP_HOST && env.SMTP_FROM && env.SMTP_USER && env.SMTP_PASS);
}
async function otpMessage({ code, purpose, expiresMinutes }) {
  const action = purpose === 'registration' ? 'verify your email address' : 'confirm the requested action';
  const html = await render(React.createElement('html', { lang: 'en' }, React.createElement('body', { style: { fontFamily: 'Arial, sans-serif', padding: '24px' } },
    React.createElement('h1', null, 'Voltarax verification'),
    React.createElement('p', null, `Use this code to ${action}:`),
    React.createElement('p', { style: { fontSize: '32px', letterSpacing: '6px' } }, code),
    React.createElement('p', null, `Expires in ${expiresMinutes} minutes. Do not share it. If you did not request this, ignore this message.`))));
  return { subject: 'Voltarax verification code', html, text: toPlainText(html) };
}
async function sendOtp(data) {
  if (!mailConfigured()) throw new Error('Email verification is not configured');
  const port = Number(process.env.SMTP_PORT || 587);
  if (![465, 587].includes(port)) throw new Error('SMTP requires a TLS port');
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465,
    requireTLS: true, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false,
    connectionTimeout: 10000, socketTimeout: 15000 });
  await transport.sendMail({ from: process.env.SMTP_FROM, to: data.email, ...(await otpMessage(data)) });
}
module.exports = { mailConfigured, otpMessage, sendOtp };
