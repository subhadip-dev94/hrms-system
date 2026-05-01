// ─── Centralised validation functions ─────────────────────────────────────────
// Returns an array of error strings. Empty array = valid.

const validateHoliday = (data) => {
  const errors = [];

  if (!data.name || data.name.trim() === '') {
    errors.push('Holiday name is required');
  }

  if (!data.date) {
    errors.push('Holiday date is required');
  } else {
    const holidayDate = new Date(data.date);
    if (isNaN(holidayDate.getTime())) {
      errors.push('Holiday date is invalid');
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (holidayDate < today) {
        errors.push('Holiday date cannot be in the past');
      }
    }
  }

  if (data.type && !['public', 'optional'].includes(data.type)) {
    errors.push('Holiday type must be public or optional');
  }

  return errors;
};

const validateAttendance = (data) => {
  const errors = [];

  if (!data.employeeId) {
    errors.push('Employee is required');
  }

  if (!data.date) {
    errors.push('Date is required');
  } else if (isNaN(new Date(data.date).getTime())) {
    errors.push('Date is invalid');
  }

  if (data.status) {
    const allowed = ['present', 'absent', 'half-day', 'late', 'on-leave', 'holiday'];
    if (!allowed.includes(data.status)) {
      errors.push(`Status must be one of: ${allowed.join(', ')}`);
    }
  }

  return errors;
};

const validateLeaveApplication = (data) => {
  const errors = [];

  const leaveTypes = ['casual', 'sick', 'earned', 'unpaid'];
  if (!data.leaveType) {
    errors.push('Leave type is required');
  } else if (!leaveTypes.includes(data.leaveType)) {
    errors.push(`Leave type must be one of: ${leaveTypes.join(', ')}`);
  }

  if (!data.startDate) {
    errors.push('Start date is required');
  } else if (isNaN(new Date(data.startDate).getTime())) {
    errors.push('Start date is invalid');
  }

  if (!data.endDate) {
    errors.push('End date is required');
  } else if (isNaN(new Date(data.endDate).getTime())) {
    errors.push('End date is invalid');
  }

  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (!isNaN(start) && !isNaN(end) && end < start) {
      errors.push('End date must be after or equal to start date');
    }
  }

  if (!data.reason || data.reason.trim() === '') {
    errors.push('Reason is required');
  }

  return errors;
};

const validateSalaryStructure = (data) => {
  const errors = [];

  if (!data.employeeId) {
    errors.push('Employee is required');
  }

  const basic = parseFloat(data.basicSalary);
  if (isNaN(basic) || basic <= 0) {
    errors.push('Basic salary must be a positive number');
  }

  if (!data.effectiveFrom) {
    errors.push('Effective from date is required');
  } else if (isNaN(new Date(data.effectiveFrom).getTime())) {
    errors.push('Effective from date is invalid');
  }

  return errors;
};

const validatePayrollRun = (data) => {
  const errors = [];

  const month = parseInt(data.month, 10);
  const year = parseInt(data.year, 10);

  if (isNaN(month) || month < 1 || month > 12) {
    errors.push('Month must be between 1 and 12');
  }

  if (isNaN(year) || year < 2000 || year > 2100) {
    errors.push('Year is invalid');
  }

  if (!isNaN(month) && !isNaN(year)) {
    const now = new Date();
    const runDate = new Date(year, month - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    if (runDate > thisMonth) {
      errors.push('Cannot process payroll for a future month');
    }
  }

  return errors;
};

const validateTimesheetEntry = (data) => {
  const errors = [];

  if (!data.employeeId) {
    errors.push('Employee is required');
  }

  if (!data.date) {
    errors.push('Date is required');
  } else {
    const d = new Date(data.date);
    if (isNaN(d.getTime())) {
      errors.push('Date is invalid');
    } else {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (d > today) {
        errors.push('Date cannot be in the future');
      }
    }
  }

  if (!data.projectName || data.projectName.trim().length < 2) {
    errors.push('Project name must be at least 2 characters');
  }

  const hours = parseFloat(data.hours);
  if (isNaN(hours) || hours < 0.5 || hours > 24) {
    errors.push('Hours must be between 0.5 and 24');
  }

  if (!data.taskDescription || data.taskDescription.trim().length < 5) {
    errors.push('Task description must be at least 5 characters');
  }

  if (!data.workType || !['billable', 'non-billable'].includes(data.workType)) {
    errors.push('Work type must be billable or non-billable');
  }

  return errors;
};

const validateKPI = (data) => {
  const errors = [];

  if (!data.employeeId) {
    errors.push('Employee is required');
  }

  if (!data.title || data.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters');
  }

  if (!data.description || data.description.trim() === '') {
    errors.push('Description is required');
  }

  const target = parseFloat(data.targetValue);
  if (isNaN(target) || target <= 0) {
    errors.push('Target value must be greater than 0');
  }

  if (!data.unit || !['%', 'number', 'currency'].includes(data.unit)) {
    errors.push('Unit must be %, number, or currency');
  }

  if (!data.periodStart) {
    errors.push('Period start date is required');
  } else if (isNaN(new Date(data.periodStart).getTime())) {
    errors.push('Period start date is invalid');
  }

  if (!data.periodEnd) {
    errors.push('Period end date is required');
  } else if (isNaN(new Date(data.periodEnd).getTime())) {
    errors.push('Period end date is invalid');
  }

  if (data.periodStart && data.periodEnd) {
    if (new Date(data.periodEnd) <= new Date(data.periodStart)) {
      errors.push('Period end date must be after period start date');
    }
  }

  const weightage = parseInt(data.weightage, 10);
  if (isNaN(weightage) || weightage < 1 || weightage > 100) {
    errors.push('Weightage must be between 1 and 100');
  }

  return errors;
};

const validatePerformanceReview = (data) => {
  const errors = [];

  if (!data.employeeId) {
    errors.push('Employee is required');
  }

  if (!data.reviewPeriod || data.reviewPeriod.trim() === '') {
    errors.push('Review period is required');
  }

  const ratingFields = ['productivity', 'quality', 'communication', 'teamwork', 'leadership', 'technical'];
  let hasAnyRating = false;

  ratingFields.forEach((field) => {
    if (data.ratings && data.ratings[field] !== undefined && data.ratings[field] !== '') {
      hasAnyRating = true;
      const val = parseFloat(data.ratings[field]);
      if (isNaN(val) || val < 1 || val > 5) {
        errors.push(`${field.charAt(0).toUpperCase() + field.slice(1)} rating must be between 1 and 5`);
      }
    }
  });

  if (!hasAnyRating) {
    errors.push('At least one rating is required');
  }

  if (!data.overallComment || data.overallComment.trim().length < 10) {
    errors.push('Overall comment must be at least 10 characters');
  }

  return errors;
};

const validateJobPosting = (data) => {
  const errors = [];

  if (!data.title || data.title.trim().length < 3) {
    errors.push('Job title must be at least 3 characters');
  }

  if (!data.jobType || !['full-time', 'part-time', 'contract', 'internship', 'remote'].includes(data.jobType)) {
    errors.push('Job type must be full-time, part-time, contract, internship, or remote');
  }

  const expMin = parseFloat(data.experienceMin);
  if (isNaN(expMin) || expMin < 0) {
    errors.push('Minimum experience must be 0 or more years');
  }

  const expMax = parseFloat(data.experienceMax);
  if (!isNaN(expMax) && !isNaN(expMin) && expMax > 0 && expMax < expMin) {
    errors.push('Maximum experience must be greater than or equal to minimum experience');
  }

  if (!data.applicationDeadline) {
    errors.push('Application deadline is required');
  } else {
    const deadline = new Date(data.applicationDeadline);
    if (isNaN(deadline.getTime())) {
      errors.push('Application deadline is invalid');
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deadline < today) {
        errors.push('Application deadline must be a future date');
      }
    }
  }

  if (!data.description || data.description.trim().length < 20) {
    errors.push('Description must be at least 20 characters');
  }

  return errors;
};

const validateCandidate = (data) => {
  const errors = [];

  if (!data.jobId) {
    errors.push('Job is required');
  }

  if (!data.firstName || data.firstName.trim() === '') {
    errors.push('First name is required');
  }

  if (!data.lastName || data.lastName.trim() === '') {
    errors.push('Last name is required');
  }

  if (!data.email || data.email.trim() === '') {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.push('Email format is invalid');
  }

  if (!data.phone || data.phone.trim() === '') {
    errors.push('Phone is required');
  }

  const exp = parseFloat(data.totalExperience);
  if (isNaN(exp) || exp < 0) {
    errors.push('Total experience must be 0 or more years');
  }

  const notice = parseInt(data.noticePeriod, 10);
  if (isNaN(notice) || notice < 0) {
    errors.push('Notice period must be 0 or more days');
  }

  return errors;
};

const validateExpense = (data) => {
  const errors = [];
  const categories = ['travel', 'food', 'accommodation', 'equipment', 'training', 'medical', 'other'];

  if (!data.category || !categories.includes(data.category)) {
    errors.push(`Category must be one of: ${categories.join(', ')}`);
  }

  if (!data.title || data.title.trim() === '') {
    errors.push('Title is required');
  }

  const amount = parseFloat(data.amount);
  if (isNaN(amount) || amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  if (!data.expenseDate) {
    errors.push('Expense date is required');
  } else {
    const d = new Date(data.expenseDate);
    if (isNaN(d.getTime())) {
      errors.push('Expense date is invalid');
    } else {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (d > today) {
        errors.push('Expense date cannot be in the future');
      }
    }
  }

  if (!data.description || data.description.trim().length < 5) {
    errors.push('Description must be at least 5 characters');
  }

  // Receipt validation handled in service (file upload check)
  if (!data.hasReceipt && amount > 500) {
    errors.push('Receipt is required for expenses above ₹500');
  }

  return errors;
};

const validateAnnouncement = (data) => {
  const errors = [];
  const validRoles = ['all', 'admin', 'hr', 'manager', 'employee', 'finance'];

  if (!data.title || data.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters');
  }

  if (!data.body || data.body.trim().length < 10) {
    errors.push('Body must be at least 10 characters');
  }

  // targetRoles may come as array or single string
  const roles = Array.isArray(data.targetRoles) ? data.targetRoles : [data.targetRoles];
  if (!data.targetRoles || roles.length === 0 || roles.every((r) => !r)) {
    errors.push('At least one target role must be selected');
  } else {
    const invalid = roles.filter((r) => r && !validRoles.includes(r));
    if (invalid.length > 0) {
      errors.push(`Invalid target role(s): ${invalid.join(', ')}`);
    }
  }

  return errors;
};

const validateDateRangeFilter = (data) => {
  const errors = [];

  if (!data.startDate) {
    errors.push('Start date is required');
  } else if (isNaN(new Date(data.startDate).getTime())) {
    errors.push('Start date is invalid');
  }

  if (!data.endDate) {
    errors.push('End date is required');
  } else if (isNaN(new Date(data.endDate).getTime())) {
    errors.push('End date is invalid');
  }

  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (!isNaN(start) && !isNaN(end)) {
      if (end < start) {
        errors.push('End date must be on or after start date');
      } else {
        const diffDays = (end - start) / (1000 * 60 * 60 * 24);
        if (diffDays > 366) {
          errors.push('Date range cannot exceed 366 days');
        }
      }
    }
  }

  return errors;
};

const validateDocumentUpload = (data) => {
  const errors = [];

  if (!data.employeeId) {
    errors.push('Employee is required');
  }

  const validTypes = [
    'id-proof', 'address-proof', 'education-certificate',
    'experience-letter', 'offer-letter', 'appointment-letter',
    'salary-slip', 'resignation-letter', 'nda', 'contract',
    'appraisal-letter', 'other',
  ];
  if (!data.documentType || !validTypes.includes(data.documentType)) {
    errors.push('Valid document type is required');
  }

  if (!data.title || data.title.trim() === '') {
    errors.push('Document title is required');
  }

  if (!data.hasFile) {
    errors.push('A file must be uploaded');
  }

  return errors;
};

const validateOffboarding = (data) => {
  const errors = [];

  if (!data.employeeId) {
    errors.push('Employee is required');
  }

  const validExitTypes = ['resignation', 'termination', 'retirement', 'contract-end', 'absconding', 'other'];
  if (!data.exitType || !validExitTypes.includes(data.exitType)) {
    errors.push('Exit type is required');
  }

  if (!data.lastWorkingDay) {
    errors.push('Last working day is required');
  } else {
    const lwd = new Date(data.lastWorkingDay);
    if (isNaN(lwd.getTime())) {
      errors.push('Last working day is invalid');
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (lwd < today) {
        errors.push('Last working day must be today or a future date');
      }
    }
  }

  if (!data.reason || data.reason.trim().length < 10) {
    errors.push('Reason must be at least 10 characters');
  }

  return errors;
};

const validateLogin = (data) => {
  const errors = [];

  if (!data.email || data.email.trim() === '') {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.push('Email format is invalid');
  }

  if (!data.password || data.password.trim() === '') {
    errors.push('Password is required');
  }

  return errors;
};

const validateEmployee = (data) => {
  const errors = [];

  if (!data.firstName || data.firstName.trim() === '') {
    errors.push('First name is required');
  }

  if (!data.lastName || data.lastName.trim() === '') {
    errors.push('Last name is required');
  }

  if (!data.email || data.email.trim() === '') {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.push('Email format is invalid');
  }

  if (!data.phone || data.phone.trim() === '') {
    errors.push('Phone number is required');
  }

  if (!data.departmentId) {
    errors.push('Department is required');
  }

  if (!data.designation || data.designation.trim() === '') {
    errors.push('Designation is required');
  }

  const validRoles = ['admin', 'hr', 'manager', 'employee', 'finance'];
  if (data.role && !validRoles.includes(data.role)) {
    errors.push(`Role must be one of: ${validRoles.join(', ')}`);
  }

  return errors;
};

const validateDepartment = (data) => {
  const errors = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push('Department name must be at least 2 characters');
  }

  return errors;
};

module.exports = {
  validateLogin,
  validateEmployee,
  validateDepartment,
  validateHoliday,
  validateAttendance,
  validateLeaveApplication,
  validateSalaryStructure,
  validatePayrollRun,
  validateTimesheetEntry,
  validateKPI,
  validatePerformanceReview,
  validateJobPosting,
  validateCandidate,
  validateExpense,
  validateAnnouncement,
  validateDateRangeFilter,
  validateDocumentUpload,
  validateOffboarding,
};
