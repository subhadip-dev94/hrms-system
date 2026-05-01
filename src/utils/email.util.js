// ─── Email utility — uses Nodemailer via src/config/nodemailer.js ─────────────
// All functions are non-blocking and never throw outward.
// HTML templates are inline for zero external dependencies.

const { sendMail } = require('../config/nodemailer');

const APP_NAME    = 'HRMS';
const LOGIN_URL   = `${process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`}/auth/login`;
const BRAND_COLOR = '#4e73df';

// ─── Shared HTML wrapper ──────────────────────────────────────────────────────
function htmlWrap(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f6fc;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fc;padding:30px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <!-- Header -->
      <tr><td style="background:${BRAND_COLOR};padding:24px 32px;">
        <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:1px;">${APP_NAME}</h1>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:32px;">${bodyHtml}</td></tr>
      <!-- Footer -->
      <tr><td style="background:#f8f9fc;padding:16px 32px;text-align:center;border-top:1px solid #e3e6f0;">
        <p style="margin:0;font-size:12px;color:#858796;">
          This email was sent by ${APP_NAME}. Please do not reply to this email.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function btn(url, label, color) {
  color = color || BRAND_COLOR;
  return `<a href="${url}" style="display:inline-block;margin-top:16px;padding:12px 28px;background:${color};color:#ffffff;text-decoration:none;border-radius:4px;font-size:14px;font-weight:bold;">${label}</a>`;
}

function badge(text, color) {
  const colors = { approved:'#1cc88a', rejected:'#e74a3b', pending:'#f6c23e', paid:'#36b9cc' };
  const bg = colors[text.toLowerCase()] || color || BRAND_COLOR;
  return `<span style="display:inline-block;padding:4px 12px;background:${bg};color:#fff;border-radius:4px;font-size:13px;font-weight:bold;">${text.toUpperCase()}</span>`;
}

// ─── Welcome Email ────────────────────────────────────────────────────────────
const sendWelcomeEmail = async (to, employeeName, email, password) => {
  try {
    const html = htmlWrap('Welcome to HRMS', `
      <h2 style="color:#333;margin-top:0;">Welcome, ${employeeName}! 👋</h2>
      <p style="color:#555;line-height:1.6;">Your HRMS account has been created. Here are your login credentials:</p>
      <table style="margin:16px 0;border-collapse:collapse;width:100%;">
        <tr><td style="padding:8px 0;color:#858796;width:120px;">Email</td><td style="padding:8px 0;font-weight:bold;color:#333;">${email}</td></tr>
        <tr><td style="padding:8px 0;color:#858796;">Password</td><td style="padding:8px 0;font-weight:bold;color:#333;">${password}</td></tr>
      </table>
      <p style="color:#555;">Please change your password after your first login.</p>
      ${btn(LOGIN_URL, 'Login to HRMS')}
    `);
    await sendMail({ to, subject: `Welcome to ${APP_NAME} — Your Login Credentials`, html });
  } catch (err) {
    console.error('[EMAIL ERROR] sendWelcomeEmail:', err.message);
  }
};

// ─── Leave Applied ────────────────────────────────────────────────────────────
const sendLeaveAppliedEmail = async (to, employeeName, leaveDetails) => {
  try {
    const html = htmlWrap('New Leave Request', `
      <h2 style="color:#333;margin-top:0;">New Leave Request</h2>
      <p style="color:#555;">A new leave request has been submitted and requires your approval.</p>
      <table style="margin:16px 0;border-collapse:collapse;width:100%;">
        <tr><td style="padding:6px 0;color:#858796;width:140px;">Employee</td><td style="padding:6px 0;font-weight:bold;color:#333;">${employeeName}</td></tr>
        <tr><td style="padding:6px 0;color:#858796;">Leave Type</td><td style="padding:6px 0;color:#333;">${leaveDetails.type}</td></tr>
        <tr><td style="padding:6px 0;color:#858796;">From</td><td style="padding:6px 0;color:#333;">${leaveDetails.startDate}</td></tr>
        <tr><td style="padding:6px 0;color:#858796;">To</td><td style="padding:6px 0;color:#333;">${leaveDetails.endDate}</td></tr>
        <tr><td style="padding:6px 0;color:#858796;">Days</td><td style="padding:6px 0;color:#333;">${leaveDetails.totalDays}</td></tr>
        <tr><td style="padding:6px 0;color:#858796;">Reason</td><td style="padding:6px 0;color:#555;">${leaveDetails.reason || '—'}</td></tr>
      </table>
      ${btn(`${LOGIN_URL.replace('/auth/login', '/leaves/approvals')}`, 'View Request')}
    `);
    await sendMail({ to, subject: `New Leave Request from ${employeeName}`, html });
  } catch (err) {
    console.error('[EMAIL ERROR] sendLeaveAppliedEmail:', err.message);
  }
};

// ─── Leave Status ─────────────────────────────────────────────────────────────
const sendLeaveStatusEmail = async (to, employeeName, status, comment) => {
  try {
    const html = htmlWrap('Leave Request Update', `
      <h2 style="color:#333;margin-top:0;">Leave Request Update</h2>
      <p style="color:#555;">Hi ${employeeName}, your leave request status has been updated.</p>
      <p style="margin:16px 0;">Status: ${badge(status)}</p>
      ${comment ? `<p style="color:#555;"><strong>Comment:</strong> ${comment}</p>` : ''}
      ${btn(`${LOGIN_URL.replace('/auth/login', '/leaves/my')}`, 'View My Leaves')}
    `);
    await sendMail({ to, subject: `Your Leave Request has been ${status.charAt(0).toUpperCase() + status.slice(1)}`, html });
  } catch (err) {
    console.error('[EMAIL ERROR] sendLeaveStatusEmail:', err.message);
  }
};

// ─── Leave Approval Reminder (stub — non-blocking) ────────────────────────────
const sendLeaveApprovalReminderEmail = async (to, managerName, pendingCount) => {
  try {
    const html = htmlWrap('Pending Leave Approvals', `
      <h2 style="color:#333;margin-top:0;">Pending Leave Approvals</h2>
      <p style="color:#555;">Hi ${managerName}, you have <strong>${pendingCount}</strong> leave request(s) awaiting your action.</p>
      ${btn(`${LOGIN_URL.replace('/auth/login', '/leaves/approvals')}`, 'Review Approvals')}
    `);
    await sendMail({ to, subject: `${pendingCount} Leave Request(s) Pending Your Approval`, html });
  } catch (err) {
    console.error('[EMAIL ERROR] sendLeaveApprovalReminderEmail:', err.message);
  }
};

// ─── Payslip Email ────────────────────────────────────────────────────────────
const sendPayslipEmail = async (to, employeeName, month, year, pdfBuffer) => {
  try {
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthName = monthNames[(month - 1)] || month;
    const html = htmlWrap('Your Payslip', `
      <h2 style="color:#333;margin-top:0;">Payslip for ${monthName} ${year}</h2>
      <p style="color:#555;">Hi ${employeeName}, your payslip for <strong>${monthName} ${year}</strong> is attached to this email.</p>
      ${btn(`${LOGIN_URL.replace('/auth/login', '/payslips/my')}`, 'View My Payslips')}
    `);
    const mailOptions = { to, subject: `Your Payslip for ${monthName} ${year}`, html };
    if (pdfBuffer) {
      mailOptions.attachments = [{
        filename: `payslip-${monthName.toLowerCase()}-${year}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }];
    }
    await sendMail(mailOptions);
  } catch (err) {
    console.error('[EMAIL ERROR] sendPayslipEmail:', err.message);
  }
};

// ─── Payroll Processed ────────────────────────────────────────────────────────
const sendPayrollProcessedEmail = async (to, hrName, month, year, totalEmployees) => {
  try {
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthName = monthNames[(month - 1)] || month;
    const html = htmlWrap('Payroll Processed', `
      <h2 style="color:#333;margin-top:0;">Payroll Processed — ${monthName} ${year}</h2>
      <table style="margin:16px 0;border-collapse:collapse;width:100%;">
        <tr><td style="padding:6px 0;color:#858796;width:160px;">Period</td><td style="padding:6px 0;font-weight:bold;color:#333;">${monthName} ${year}</td></tr>
        <tr><td style="padding:6px 0;color:#858796;">Employees Paid</td><td style="padding:6px 0;color:#333;">${totalEmployees}</td></tr>
        <tr><td style="padding:6px 0;color:#858796;">Processed By</td><td style="padding:6px 0;color:#333;">${hrName}</td></tr>
      </table>
      ${btn(`${LOGIN_URL.replace('/auth/login', '/payroll')}`, 'View Payroll')}
    `);
    await sendMail({ to, subject: `Payroll Processed for ${monthName} ${year}`, html });
  } catch (err) {
    console.error('[EMAIL ERROR] sendPayrollProcessedEmail:', err.message);
  }
};

// ─── KPI Assigned ─────────────────────────────────────────────────────────────
const sendKPIAssignedEmail = async (to, employeeName, kpiTitle, periodStart, periodEnd) => {
  try {
    const html = htmlWrap('New KPI Assigned', `
      <h2 style="color:#333;margin-top:0;">New KPI Assigned to You</h2>
      <p style="color:#555;">Hi ${employeeName}, a new KPI has been assigned to you.</p>
      <table style="margin:16px 0;border-collapse:collapse;width:100%;">
        <tr><td style="padding:6px 0;color:#858796;width:120px;">KPI Title</td><td style="padding:6px 0;font-weight:bold;color:#333;">${kpiTitle}</td></tr>
        <tr><td style="padding:6px 0;color:#858796;">Period</td><td style="padding:6px 0;color:#333;">${periodStart} to ${periodEnd}</td></tr>
      </table>
      ${btn(`${LOGIN_URL.replace('/auth/login', '/performance')}`, 'View My KPIs')}
    `);
    await sendMail({ to, subject: `New KPI Assigned to You — ${kpiTitle}`, html });
  } catch (err) {
    console.error('[EMAIL ERROR] sendKPIAssignedEmail:', err.message);
  }
};

// ─── Review Submitted ─────────────────────────────────────────────────────────
const sendReviewSubmittedEmail = async (to, employeeName, reviewerName, period) => {
  try {
    const html = htmlWrap('Performance Review Ready', `
      <h2 style="color:#333;margin-top:0;">Your Performance Review is Ready</h2>
      <p style="color:#555;">Hi ${employeeName}, your performance review for <strong>${period}</strong> has been submitted.</p>
      <table style="margin:16px 0;border-collapse:collapse;width:100%;">
        <tr><td style="padding:6px 0;color:#858796;width:120px;">Reviewer</td><td style="padding:6px 0;font-weight:bold;color:#333;">${reviewerName}</td></tr>
        <tr><td style="padding:6px 0;color:#858796;">Period</td><td style="padding:6px 0;color:#333;">${period}</td></tr>
      </table>
      ${btn(`${LOGIN_URL.replace('/auth/login', '/performance/my-reviews')}`, 'View Review')}
    `);
    await sendMail({ to, subject: `Your Performance Review is Ready — ${period}`, html });
  } catch (err) {
    console.error('[EMAIL ERROR] sendReviewSubmittedEmail:', err.message);
  }
};

// ─── Timesheet Reminder ───────────────────────────────────────────────────────
const sendTimesheetReminderEmail = async (to, employeeName, weekStart) => {
  try {
    const html = htmlWrap('Timesheet Reminder', `
      <h2 style="color:#333;margin-top:0;">Timesheet Fill Reminder</h2>
      <p style="color:#555;">Hi ${employeeName}, please remember to fill in your timesheet for the week starting <strong>${weekStart}</strong>.</p>
      ${btn(`${LOGIN_URL.replace('/auth/login', '/timesheet/log')}`, 'Log Work Hours')}
    `);
    await sendMail({ to, subject: `Timesheet Reminder — Week of ${weekStart}`, html });
  } catch (err) {
    console.error('[EMAIL ERROR] sendTimesheetReminderEmail:', err.message);
  }
};

// ─── Job Application Received ─────────────────────────────────────────────────
const sendJobApplicationEmail = async (to, candidateName, jobTitle) => {
  try {
    const html = htmlWrap('Application Received', `
      <h2 style="color:#333;margin-top:0;">Application Received</h2>
      <p style="color:#555;">Dear ${candidateName},</p>
      <p style="color:#555;">Thank you for applying for the position of <strong>${jobTitle}</strong> at ${APP_NAME}. We have received your application and will review it shortly.</p>
      <p style="color:#555;">We will reach out to you if your profile matches our requirements.</p>
      <p style="color:#555;margin-top:24px;">Best regards,<br><strong>${APP_NAME} Hiring Team</strong></p>
    `);
    await sendMail({ to, subject: `Application Received — ${jobTitle}`, html });
  } catch (err) {
    console.error('[EMAIL ERROR] sendJobApplicationEmail:', err.message);
  }
};

// ─── Interview Scheduled ──────────────────────────────────────────────────────
const sendInterviewScheduledEmail = async (to, candidateName, jobTitle, interviewDate, interviewMode) => {
  try {
    const html = htmlWrap('Interview Scheduled', `
      <h2 style="color:#333;margin-top:0;">Interview Scheduled</h2>
      <p style="color:#555;">Dear ${candidateName}, your interview has been scheduled.</p>
      <table style="margin:16px 0;border-collapse:collapse;width:100%;">
        <tr><td style="padding:6px 0;color:#858796;width:140px;">Position</td><td style="padding:6px 0;font-weight:bold;color:#333;">${jobTitle}</td></tr>
        <tr><td style="padding:6px 0;color:#858796;">Date &amp; Time</td><td style="padding:6px 0;color:#333;">${interviewDate}</td></tr>
        <tr><td style="padding:6px 0;color:#858796;">Mode</td><td style="padding:6px 0;color:#333;">${interviewMode}</td></tr>
      </table>
      <p style="color:#555;">Please be available on time. We look forward to meeting you!</p>
    `);
    await sendMail({ to, subject: `Interview Scheduled — ${jobTitle}`, html });
  } catch (err) {
    console.error('[EMAIL ERROR] sendInterviewScheduledEmail:', err.message);
  }
};

// ─── Offer Letter ─────────────────────────────────────────────────────────────
const sendOfferLetterEmail = async (to, candidateName, jobTitle, salary, joiningDate) => {
  try {
    const html = htmlWrap('Offer Letter', `
      <h2 style="color:#1cc88a;margin-top:0;">Congratulations, ${candidateName}! 🎉</h2>
      <p style="color:#555;">We are pleased to offer you the position of <strong>${jobTitle}</strong> at ${APP_NAME}.</p>
      <table style="margin:16px 0;border-collapse:collapse;width:100%;">
        <tr><td style="padding:6px 0;color:#858796;width:140px;">Role</td><td style="padding:6px 0;font-weight:bold;color:#333;">${jobTitle}</td></tr>
        <tr><td style="padding:6px 0;color:#858796;">Offered Salary</td><td style="padding:6px 0;font-weight:bold;color:#1cc88a;">₹ ${Number(salary).toLocaleString('en-IN')} / month</td></tr>
        <tr><td style="padding:6px 0;color:#858796;">Joining Date</td><td style="padding:6px 0;color:#333;">${joiningDate}</td></tr>
      </table>
      <p style="color:#555;">Please confirm your acceptance by replying to this email or contacting HR.</p>
    `);
    await sendMail({ to, subject: `Offer Letter — ${jobTitle}`, html });
  } catch (err) {
    console.error('[EMAIL ERROR] sendOfferLetterEmail:', err.message);
  }
};

// ─── Expense Status ───────────────────────────────────────────────────────────
const sendExpenseStatusEmail = async (to, employeeName, expenseTitle, status, comment) => {
  try {
    const html = htmlWrap('Expense Update', `
      <h2 style="color:#333;margin-top:0;">Expense Status Update</h2>
      <p style="color:#555;">Hi ${employeeName}, your expense request has been updated.</p>
      <table style="margin:16px 0;border-collapse:collapse;width:100%;">
        <tr><td style="padding:6px 0;color:#858796;width:120px;">Expense</td><td style="padding:6px 0;font-weight:bold;color:#333;">${expenseTitle}</td></tr>
        <tr><td style="padding:6px 0;color:#858796;">Status</td><td style="padding:6px 0;">${badge(status)}</td></tr>
        ${comment ? `<tr><td style="padding:6px 0;color:#858796;">Comment</td><td style="padding:6px 0;color:#555;">${comment}</td></tr>` : ''}
      </table>
      ${btn(`${LOGIN_URL.replace('/auth/login', '/expense')}`, 'View My Expenses')}
    `);
    await sendMail({ to, subject: `Expense ${status.charAt(0).toUpperCase() + status.slice(1)} — ${expenseTitle}`, html });
  } catch (err) {
    console.error('[EMAIL ERROR] sendExpenseStatusEmail:', err.message);
  }
};

// ─── Announcement ─────────────────────────────────────────────────────────────
const sendAnnouncementEmail = async (toList, title, content, postedBy) => {
  try {
    const html = htmlWrap(title, `
      <h2 style="color:#333;margin-top:0;">${title}</h2>
      <p style="color:#555;line-height:1.7;">${content}</p>
      <p style="color:#858796;font-size:13px;margin-top:16px;">Posted by: <strong>${postedBy || APP_NAME}</strong></p>
      ${btn(`${LOGIN_URL.replace('/auth/login', '/announcements')}`, 'View Announcements')}
    `);
    const recipients = Array.isArray(toList) ? toList.join(',') : toList;
    await sendMail({ to: recipients, subject: `Announcement: ${title}`, html });
  } catch (err) {
    console.error('[EMAIL ERROR] sendAnnouncementEmail:', err.message);
  }
};

// ─── Offboarding Initiated ────────────────────────────────────────────────────
const sendOffboardingInitiatedEmail = async (to, employeeName, lastWorkingDay, hrName) => {
  try {
    const html = htmlWrap('Offboarding Process Initiated', `
      <h2 style="color:#333;margin-top:0;">Offboarding Process Initiated</h2>
      <p style="color:#555;">Dear ${employeeName}, your offboarding process has been initiated.</p>
      <table style="margin:16px 0;border-collapse:collapse;width:100%;">
        <tr><td style="padding:6px 0;color:#858796;width:160px;">Last Working Day</td><td style="padding:6px 0;font-weight:bold;color:#e74a3b;">${lastWorkingDay}</td></tr>
        <tr><td style="padding:6px 0;color:#858796;">Initiated By</td><td style="padding:6px 0;color:#333;">${hrName}</td></tr>
      </table>
      <p style="color:#555;">Please complete all pending handover tasks and contact HR for further details.</p>
    `);
    await sendMail({ to, subject: 'Offboarding Process Initiated', html });
  } catch (err) {
    console.error('[EMAIL ERROR] sendOffboardingInitiatedEmail:', err.message);
  }
};

// ─── Offboarding Completed ────────────────────────────────────────────────────
const sendOffboardingCompletedEmail = async (to, employeeName, exitType, lastWorkingDay) => {
  try {
    const html = htmlWrap('Offboarding Completed — Farewell', `
      <h2 style="color:#333;margin-top:0;">Farewell, ${employeeName}!</h2>
      <p style="color:#555;">Your offboarding process has been completed. We wish you all the best in your future endeavours.</p>
      <table style="margin:16px 0;border-collapse:collapse;width:100%;">
        <tr><td style="padding:6px 0;color:#858796;width:160px;">Exit Type</td><td style="padding:6px 0;color:#333;">${exitType}</td></tr>
        <tr><td style="padding:6px 0;color:#858796;">Last Working Day</td><td style="padding:6px 0;color:#333;">${lastWorkingDay}</td></tr>
      </table>
      <p style="color:#555;">Thank you for your contributions to ${APP_NAME}. Stay in touch!</p>
    `);
    await sendMail({ to, subject: 'Offboarding Completed — Farewell', html });
  } catch (err) {
    console.error('[EMAIL ERROR] sendOffboardingCompletedEmail:', err.message);
  }
};

// ─── Exit Interview Reminder ──────────────────────────────────────────────────
const sendExitInterviewReminderEmail = async (to, employeeName, scheduledDate) => {
  try {
    const html = htmlWrap('Exit Interview Reminder', `
      <h2 style="color:#333;margin-top:0;">Exit Interview Reminder</h2>
      <p style="color:#555;">Hi ${employeeName}, your exit interview is scheduled for <strong>${scheduledDate}</strong>.</p>
      <p style="color:#555;">Please be available at the scheduled time.</p>
    `);
    await sendMail({ to, subject: 'Exit Interview Reminder', html });
  } catch (err) {
    console.error('[EMAIL ERROR] sendExitInterviewReminderEmail:', err.message);
  }
};

// ─── Document Uploaded ────────────────────────────────────────────────────────
const sendDocumentUploadedEmail = async (to, employeeName, documentType, uploadedBy) => {
  try {
    const html = htmlWrap('New Document Added', `
      <h2 style="color:#333;margin-top:0;">New Document Added to Your Profile</h2>
      <p style="color:#555;">Hi ${employeeName}, a new document has been added to your profile.</p>
      <table style="margin:16px 0;border-collapse:collapse;width:100%;">
        <tr><td style="padding:6px 0;color:#858796;width:140px;">Document Type</td><td style="padding:6px 0;font-weight:bold;color:#333;">${documentType}</td></tr>
        <tr><td style="padding:6px 0;color:#858796;">Uploaded By</td><td style="padding:6px 0;color:#333;">${uploadedBy}</td></tr>
      </table>
      ${btn(`${LOGIN_URL.replace('/auth/login', '/documents/my')}`, 'View My Documents')}
    `);
    await sendMail({ to, subject: 'New Document Added to Your Profile', html });
  } catch (err) {
    console.error('[EMAIL ERROR] sendDocumentUploadedEmail:', err.message);
  }
};

// ─── Password Changed (own) ───────────────────────────────────────────────────
const sendPasswordChangedEmail = async (to, employeeName) => {
  try {
    const html = htmlWrap('Password Changed Successfully', `
      <h2 style="color:#333;margin-top:0;">Password Changed</h2>
      <p style="color:#555;line-height:1.6;">Hi ${employeeName},</p>
      <p style="color:#555;line-height:1.6;">Your HRMS account password was successfully changed.</p>
      <p style="color:#555;line-height:1.6;">If you did not make this change, please contact your administrator immediately.</p>
      ${btn(LOGIN_URL, 'Login to HRMS')}
    `);
    await sendMail({ to, subject: `Your ${APP_NAME} Password Has Been Changed`, html });
  } catch (err) {
    console.error('[EMAIL ERROR] sendPasswordChangedEmail:', err.message);
  }
};

// ─── Password Reset Email ─────────────────────────────────────────────────────
const sendPasswordResetEmail = async (to, employeeName, newPassword) => {
  try {
    const html = htmlWrap('Your Password Has Been Reset', `
      <h2 style="color:#333;margin-top:0;">Password Reset</h2>
      <p style="color:#555;line-height:1.6;">Hello ${employeeName},</p>
      <p style="color:#555;line-height:1.6;">Your HRMS password has been reset by an administrator. Here are your new login credentials:</p>
      <table style="margin:16px 0;border-collapse:collapse;width:100%;">
        <tr><td style="padding:6px 0;color:#858796;width:140px;">Email</td><td style="padding:6px 0;font-weight:bold;color:#333;">${to}</td></tr>
        <tr><td style="padding:6px 0;color:#858796;">New Password</td><td style="padding:6px 0;font-weight:bold;color:#333;font-family:monospace;">${newPassword}</td></tr>
      </table>
      <p style="color:#e74a3b;font-size:13px;">Please log in and change your password immediately.</p>
      ${btn(LOGIN_URL, 'Log In Now')}
    `);
    await sendMail({ to, subject: 'Your HRMS Password Has Been Reset', html });
  } catch (err) {
    console.error('[EMAIL ERROR] sendPasswordResetEmail:', err.message);
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendLeaveAppliedEmail,
  sendLeaveStatusEmail,
  sendLeaveApprovalReminderEmail,
  sendPayslipEmail,
  sendPayrollProcessedEmail,
  sendKPIAssignedEmail,
  sendReviewSubmittedEmail,
  sendTimesheetReminderEmail,
  sendJobApplicationEmail,
  sendInterviewScheduledEmail,
  sendOfferLetterEmail,
  sendExpenseStatusEmail,
  sendAnnouncementEmail,
  sendOffboardingInitiatedEmail,
  sendOffboardingCompletedEmail,
  sendExitInterviewReminderEmail,
  sendDocumentUploadedEmail,
};
