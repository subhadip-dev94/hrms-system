const nodemailer = require('nodemailer');

// ─── Reusable transporter ─────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   parseInt(process.env.EMAIL_PORT, 10) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

// ─── sendMail wrapper ─────────────────────────────────────────────────────────
// Never throws — returns { success: true } or { success: false, error }
async function sendMail(options) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"HRMS" <${process.env.EMAIL_USER}>`,
      ...options,
    });
    console.log(`[Nodemailer] Mail sent → ${options.to} | msgId: ${info.messageId}`);
    return { success: true };
  } catch (err) {
    console.error(`[Nodemailer] Failed → ${options.to}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { transporter, sendMail };
