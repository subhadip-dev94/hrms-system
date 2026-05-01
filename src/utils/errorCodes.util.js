// ─── Centralised error message registry ───────────────────────────────────────
// All modules must pull error text from here — never hard-code messages.

const errorCodes = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_INACTIVE: 'Your account has been deactivated. Please contact admin.',

  // ── General ───────────────────────────────────────────────────────────────
  NOT_FOUND: 'Record not found',
  UNAUTHORIZED: 'You do not have permission to perform this action',
  VALIDATION_ERROR: 'Please fix the validation errors below',
  DUPLICATE: 'A record with this value already exists',
  DEFAULT_ERROR: 'An unexpected error occurred. Please try again.',

  // ── Attendance ────────────────────────────────────────────────────────────
  ALREADY_CHECKED_IN: 'You have already checked in today',
  NOT_CHECKED_IN: 'You have not checked in yet',
  ALREADY_CHECKED_OUT: 'You have already checked out today',

  // ── Leave ─────────────────────────────────────────────────────────────────
  LEAVE_OVERLAP: 'You already have a leave for this date range',
  INSUFFICIENT_LEAVE_BALANCE: 'Insufficient leave balance',
  INVALID_DATE_RANGE: 'End date must be after or equal to start date',
  LEAVE_NOT_PENDING: 'This leave is no longer in pending state',
  WEEKEND_NOT_ALLOWED: 'Cannot apply leave on weekends',
  HOLIDAY_NOT_ALLOWED: 'Cannot apply leave on a holiday',
  CANNOT_CANCEL_APPROVED: 'Approved leave cannot be cancelled after it has started',
  LEAVE_BALANCE_NOT_FOUND: 'Leave balance record not found. Please contact HR.',

  // ── Holiday ───────────────────────────────────────────────────────────────
  HOLIDAY_EXISTS: 'A holiday already exists for this date',
  HOLIDAY_DATE_PAST: 'Holiday date cannot be in the past',

  // ── Salary / Payroll / Payslip ────────────────────────────────────────────
  SALARY_NOT_ASSIGNED: 'Salary structure not assigned to this employee',
  PAYROLL_ALREADY_RUN: 'Payroll already processed for this month',
  PAYROLL_NOT_FOUND: 'Payroll record not found',
  PAYSLIP_NOT_FOUND: 'Payslip not found',
  INVALID_MONTH: 'Invalid month or year',
  SALARY_REVISION_EXISTS: 'A salary revision already exists for this period',
  NO_ATTENDANCE_DATA: 'No attendance data found for this period',

  // ── Recruitment ───────────────────────────────────────────────────────────
  JOB_NOT_FOUND: 'Job posting not found',
  JOB_CLOSED: 'This job posting is closed',
  CANDIDATE_NOT_FOUND: 'Candidate not found',
  CANDIDATE_ALREADY_EXISTS: 'Candidate with this email already applied',
  INVALID_STAGE: 'Invalid recruitment stage transition',
  CONVERT_NOT_ELIGIBLE: 'Candidate must be in offer-accepted stage to convert',

  // ── Expense ───────────────────────────────────────────────────────────────
  EXPENSE_NOT_FOUND: 'Expense not found',
  EXPENSE_NOT_PENDING: 'Expense is no longer in pending state',
  EXPENSE_LIMIT_EXCEEDED: 'Expense amount exceeds allowed limit',
  CANNOT_EDIT_EXPENSE: 'Submitted expense cannot be edited',
  RECEIPT_REQUIRED: 'Receipt is required for expenses above ₹500',

  // ── Announcement ──────────────────────────────────────────────────────────
  ANNOUNCEMENT_NOT_FOUND: 'Announcement not found',

  // ── Timesheet ─────────────────────────────────────────────────────────────
  TIMESHEET_ALREADY_EXISTS: 'Timesheet entry already exists for this date and project',
  TIMESHEET_NOT_FOUND: 'Timesheet entry not found',
  TIMESHEET_LOCKED: 'Timesheet is locked and cannot be edited',
  INVALID_HOURS: 'Hours must be between 0.5 and 24',
  TOTAL_HOURS_EXCEEDED: 'Total logged hours for this date cannot exceed 24',

  // ── Reports ───────────────────────────────────────────────────────────────
  REPORT_NO_DATA: 'No data found for the selected filters',
  INVALID_DATE_FILTER: 'Start date must be before end date',
  EXPORT_FAILED: 'Report export failed. Please try again.',

  // ── Documents ─────────────────────────────────────────────────────────────
  DOCUMENT_NOT_FOUND: 'Document not found',
  DOCUMENT_UPLOAD_FAILED: 'Document upload failed',
  DOCUMENT_TYPE_NOT_ALLOWED: 'This document type is not allowed',

  // ── Offboarding ───────────────────────────────────────────────────────────
  OFFBOARDING_EXISTS: 'Offboarding already initiated for this employee',
  OFFBOARDING_NOT_FOUND: 'Offboarding record not found',
  EMPLOYEE_ALREADY_INACTIVE: 'Employee is already inactive',
  CHECKLIST_ITEM_NOT_FOUND: 'Checklist item not found',
  CANNOT_OFFBOARD_ADMIN: 'Admin account cannot be offboarded',

  // ── Performance / KPI / Review ────────────────────────────────────────────
  KPI_NOT_FOUND: 'KPI not found',
  KPI_ALREADY_EXISTS: 'KPI already assigned for this employee and period',
  REVIEW_NOT_FOUND: 'Performance review not found',
  REVIEW_ALREADY_SUBMITTED: 'Review already submitted for this period',
  CANNOT_REVIEW_SELF: 'You cannot submit a review for yourself',
  KPI_PERIOD_INVALID: 'KPI period start date must be before end date',
  NOT_YOUR_TEAM: 'This employee is not in your team',
};

module.exports = errorCodes;
