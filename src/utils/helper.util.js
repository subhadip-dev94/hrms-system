// ─── Shared helper functions ───────────────────────────────────────────────────

/**
 * Returns true if the given date falls on a weekend (Sat/Sun).
 * @param {Date|string} date
 * @returns {boolean}
 */
const isWeekend = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
};

/**
 * Returns true if the given date matches any date in the holidays array.
 * @param {Date|string} date
 * @param {Array}  holidays  – array of objects with a .date property
 * @returns {boolean}
 */
const isHoliday = (date, holidays = []) => {
  const d = new Date(date);
  const dStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  return holidays.some((h) => {
    const hd = new Date(h.date);
    const hStr = `${hd.getFullYear()}-${hd.getMonth()}-${hd.getDate()}`;
    return hStr === dStr;
  });
};

/**
 * Counts working days between startDate and endDate inclusive,
 * excluding weekends and the provided holidays.
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @param {Array}  holidays
 * @returns {number}
 */
const calculateWorkingDays = (startDate, endDate, holidays = []) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    if (!isWeekend(current) && !isHoliday(current, holidays)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
};

/**
 * Returns { startDate, endDate } for the given month (1-indexed) and year.
 * @param {number} month  1 = January … 12 = December
 * @param {number} year
 * @returns {{ startDate: Date, endDate: Date }}
 */
const getMonthDateRange = (month, year) => {
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999); // last day
  return { startDate, endDate };
};

/**
 * Formats a Date as HH:MM AM/PM.
 * Returns '—' for null/undefined.
 * @param {Date|string|null} date
 * @returns {string}
 */
const formatTime = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

/**
 * Returns a normalised midnight Date for the given date (local timezone).
 * Used to ensure date-only comparisons are consistent.
 * @param {Date|string} date
 * @returns {Date}
 */
const toMidnight = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Returns the full month name for a 1-indexed month number.
 * @param {number} month  1 = January … 12 = December
 * @returns {string}
 */
const getMonthName = (month) => {
  const names = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return names[month - 1] || '';
};

/**
 * Calculates Indian income tax on annual salary and returns the monthly amount.
 * New Tax Regime slabs (simplified):
 *   ≤ 3,00,000       → 0%
 *   3,00,001–6,00,000 → 5%
 *   6,00,001–9,00,000 → 10%
 *   9,00,001–12,00,000→ 15%
 *   > 12,00,000       → 20%
 * @param {number} annualSalary
 * @returns {number} monthly tax (rounded to 2 decimals)
 */
const calculateTax = (annualSalary) => {
  let tax = 0;
  if (annualSalary <= 300000) {
    tax = 0;
  } else if (annualSalary <= 600000) {
    tax = (annualSalary - 300000) * 0.05;
  } else if (annualSalary <= 900000) {
    tax = 300000 * 0.05 + (annualSalary - 600000) * 0.10;
  } else if (annualSalary <= 1200000) {
    tax = 300000 * 0.05 + 300000 * 0.10 + (annualSalary - 900000) * 0.15;
  } else {
    tax = 300000 * 0.05 + 300000 * 0.10 + 300000 * 0.15 + (annualSalary - 1200000) * 0.20;
  }
  return roundToTwo(tax / 12);
};

/**
 * Calculates Provident Fund deduction: 12% of basic salary.
 * @param {number} basicSalary  monthly basic
 * @returns {number}
 */
const calculatePF = (basicSalary) => roundToTwo(basicSalary * 0.12);

/**
 * Calculates ESI deduction: 0.75% of gross salary if gross ≤ 21000, else 0.
 * @param {number} grossSalary  monthly gross
 * @returns {number}
 */
const calculateESI = (grossSalary) => {
  if (grossSalary <= 21000) {
    return roundToTwo(grossSalary * 0.0075);
  }
  return 0;
};

/**
 * Rounds a number to 2 decimal places.
 * @param {number} number
 * @returns {number}
 */
const roundToTwo = (number) => Math.round(number * 100) / 100;

/**
 * Returns { weekStart: Monday, weekEnd: Sunday } for the week containing date.
 * @param {Date|string} date
 * @returns {{ weekStart: Date, weekEnd: Date }}
 */
const getWeekRange = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() + diffToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return { weekStart, weekEnd };
};

/**
 * Sums the hours field of all entries in an array.
 * @param {Array} entries  objects with a .hours property
 * @returns {number}
 */
const getTotalHoursByDate = (entries) =>
  entries.reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);

/**
 * Returns progress percentage (0–100) of a KPI, capped at 100.
 * @param {number} currentValue
 * @param {number} targetValue
 * @returns {number}
 */
const calculateKPIProgress = (currentValue, targetValue) => {
  if (!targetValue || targetValue === 0) return 0;
  return Math.min(100, Math.round((currentValue / targetValue) * 100));
};

/**
 * Maps an average rating (1–5) to a performance grade string.
 * @param {number} averageRating
 * @returns {string}
 */
const getPerformanceGrade = (averageRating) => {
  if (averageRating >= 5.0) return 'Outstanding';
  if (averageRating >= 4.0) return 'Exceeds Expectations';
  if (averageRating >= 3.0) return 'Meets Expectations';
  if (averageRating >= 2.0) return 'Needs Improvement';
  return 'Unsatisfactory';
};

/**
 * Returns the fiscal quarter ('Q1'–'Q4') for a given date.
 * Q1 = Jan–Mar, Q2 = Apr–Jun, Q3 = Jul–Sep, Q4 = Oct–Dec.
 * @param {Date|string} date
 * @returns {string}
 */
const getQuarter = (date) => {
  const month = new Date(date).getMonth() + 1; // 1-indexed
  if (month <= 3) return 'Q1';
  if (month <= 6) return 'Q2';
  if (month <= 9) return 'Q3';
  return 'Q4';
};

/**
 * Auto-generates the next job code (JOB001, JOB002 …).
 * Requires the Job model to be passed in to avoid circular deps.
 * @param {Model} JobModel
 * @returns {Promise<string>}
 */
const generateJobCode = async (JobModel) => {
  const jobs = await JobModel.find({}, 'jobCode').lean();
  let maxNum = 0;
  jobs.forEach((j) => {
    if (j.jobCode) {
      const match = j.jobCode.match(/^JOB(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  });
  return `JOB${String(maxNum + 1).padStart(3, '0')}`;
};

/**
 * Auto-generates the next expense code (EXP001, EXP002 …).
 * @param {Model} ExpenseModel
 * @returns {Promise<string>}
 */
const generateExpenseCode = async (ExpenseModel) => {
  const expenses = await ExpenseModel.find({}, 'expenseCode').lean();
  let maxNum = 0;
  expenses.forEach((e) => {
    if (e.expenseCode) {
      const match = e.expenseCode.match(/^EXP(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  });
  return `EXP${String(maxNum + 1).padStart(3, '0')}`;
};

/**
 * Returns the ordered array of recruitment stage names.
 * @returns {string[]}
 */
const getRecruitmentStages = () => [
  'applied',
  'screening',
  'interview',
  'technical',
  'hr-round',
  'offer',
  'offer-accepted',
  'offer-rejected',
  'joined',
];

/**
 * Returns true if transitioning from currentStage to newStage is valid
 * (forward-only; offer-rejected is a dead end; joined is terminal).
 * @param {string} currentStage
 * @param {string} newStage
 * @returns {boolean}
 */
const canTransitionStage = (currentStage, newStage) => {
  const stages = getRecruitmentStages();
  const currentIdx = stages.indexOf(currentStage);
  const newIdx = stages.indexOf(newStage);
  if (currentIdx === -1 || newIdx === -1) return false;
  // offer-rejected and joined are terminal — cannot move further
  if (currentStage === 'offer-rejected' || currentStage === 'joined') return false;
  return newIdx > currentIdx;
};

/**
 * Returns the list of valid expense categories.
 * @returns {string[]}
 */
const getExpenseCategories = () => [
  'travel',
  'food',
  'accommodation',
  'equipment',
  'training',
  'medical',
  'other',
];

/**
 * Generates a report filename from type and filters.
 * e.g. 'attendance-report-jan-2025.pdf'
 * @param {string} reportType
 * @param {object} filters   – expects optional month/year properties
 * @returns {string}
 */
const generateReportFilename = (reportType, filters = {}) => {
  const parts = [reportType, 'report'];
  if (filters.month) {
    const monthNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const m = parseInt(filters.month, 10);
    if (m >= 1 && m <= 12) parts.push(monthNames[m - 1]);
  }
  if (filters.year) parts.push(String(filters.year));
  return `${parts.join('-')}.pdf`;
};

/**
 * Returns the Indian financial year string for a given date.
 * Indian FY: April (month 4) to March (month 3 next year).
 * e.g. date in Jan 2025 → '2024-25', date in Jun 2025 → '2025-26'
 * @param {Date|string} date
 * @returns {string}
 */
const getFinancialYear = (date) => {
  const d = new Date(date);
  const month = d.getMonth() + 1; // 1-indexed
  const year = d.getFullYear();
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }
  return `${year - 1}-${String(year).slice(-2)}`;
};

/**
 * Calculates employee turnover rate as a percentage.
 * @param {number} exits        number of exits in period
 * @param {number} avgHeadcount average headcount in period
 * @returns {number} percentage rounded to 2 decimals
 */
const calculateTurnoverRate = (exits, avgHeadcount) => {
  if (!avgHeadcount || avgHeadcount === 0) return 0;
  return roundToTwo((exits / avgHeadcount) * 100);
};

/**
 * Returns the standard offboarding checklist items.
 * @returns {string[]}
 */
const getDefaultChecklist = () => [
  'Return company laptop',
  'Return access cards and keys',
  'Knowledge transfer document submitted',
  'Handover completed with team',
  'Final salary settlement processed',
  'Experience letter issued',
  'No-dues certificate issued',
  'Exit interview completed',
  'Remove from all systems and tools',
  'PF and gratuity processing initiated',
];

/**
 * Capitalises the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Formats a Date object (or ISO string) to 'DD MMM YYYY' (e.g. '05 Apr 2025').
 * Returns '' for null/undefined.
 * @param {Date|string|null} date
 * @returns {string}
 */
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

/**
 * Generates a default password of the form 'Hrms@<4-digit-year><6-digit-random>'.
 * @returns {string}
 */
const generateDefaultPassword = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `Hrms@${year}${rand}`;
};

/**
 * Auto-generates the next employee code (EMP001, EMP002 …).
 * Requires the Employee model to be passed in to avoid circular deps.
 * @param {Model} EmployeeModel
 * @returns {Promise<string>}
 */
const generateEmployeeCode = async (EmployeeModel) => {
  const employees = await EmployeeModel.find({}, 'employeeId').lean();
  let maxNum = 0;
  employees.forEach((e) => {
    if (e.employeeId) {
      const match = e.employeeId.match(/^EMP(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  });
  return `EMP${String(maxNum + 1).padStart(3, '0')}`;
};

/**
 * Extracts and validates pagination params from a query object.
 * @param {object} query  e.g. req.query
 * @returns {{ page: number, limit: number, skip: number }}
 */
const getPaginationParams = (query = {}) => {
  const page  = Math.max(1, parseInt(query.page,  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
};

module.exports = {
  isWeekend,
  isHoliday,
  calculateWorkingDays,
  getMonthDateRange,
  formatTime,
  toMidnight,
  getMonthName,
  calculateTax,
  calculatePF,
  calculateESI,
  roundToTwo,
  getWeekRange,
  getTotalHoursByDate,
  calculateKPIProgress,
  getPerformanceGrade,
  getQuarter,
  generateJobCode,
  generateExpenseCode,
  getRecruitmentStages,
  canTransitionStage,
  getExpenseCategories,
  generateReportFilename,
  getFinancialYear,
  calculateTurnoverRate,
  getDefaultChecklist,
  getPaginationParams,
  capitalizeFirst,
  formatDate,
  generateDefaultPassword,
  generateEmployeeCode,
};
