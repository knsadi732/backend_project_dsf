const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  if (!env.smtp.user || !env.smtp.pass) {
    throw new Error('SMTP_USER/SMTP_PASS are not configured — cannot send email.');
  }
  return getTransporter().sendMail({ from: env.smtp.from, to, subject, text, html });
}

module.exports = { sendMail };
