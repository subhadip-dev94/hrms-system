const mongoose = require('mongoose');
const Attendance = require('../attendance/attendance.model');
const Employee = require('../employee/employee.model');
const Leave = require('../leave/leave.model');
const Payslip = require('../payslip/payslip.model');
const KPI = require('../performance/kpi.model');
const Review = require('../performance/review.model');
const { getMonthDateRange, getPerformanceGrade, calculateTurnoverRate, roundToTwo } = require('../../utils/helper.util');

// ─── Attendance Report ────────────────────────────────────────────────────────
// Was: 1 + N queries (one Attendance.find per employee)
// Now: 2 queries  — Employee.find + one Attendance aggregation
async function getAttendanceReport(filters = {}) {
  const month = parseInt(filters.month, 10) || new Date().getMonth() + 1;
  const year  = parseInt(filters.year,  10) || new Date().getFullYear();
  const { startDate, endDate } = getMonthDateRange(month, year);

  const empQuery = { status: 'active' };
  if (filters.departmentId) empQuery.departmentId = new mongoose.Types.ObjectId(String(filters.departmentId));
  if (filters.employeeId)   empQuery._id          = new mongoose.Types.ObjectId(String(filters.employeeId));

  const employees = await Employee.find(empQuery).populate('departmentId', 'name').lean();
  if (!employees.length) {
    return {
      rows: [],
      summary: { totalEmployees: 0, avgAttendancePct: 0, totalPresent: 0, totalAbsent: 0, month, year },
      filters: { month, year, ...filters },
    };
  }

  const empIds = employees.map(e => e._id);

  // Single aggregation across all employees — uses { employeeId, date } compound index
  const attData = await Attendance.aggregate([
    { $match: { employeeId: { $in: empIds }, date: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id:        '$employeeId',
        present:    { $sum: { $cond: [{ $eq: ['$status', 'present']  }, 1, 0] } },
        absent:     { $sum: { $cond: [{ $eq: ['$status', 'absent']   }, 1, 0] } },
        late:       { $sum: { $cond: [{ $eq: ['$status', 'late']     }, 1, 0] } },
        onLeave:    { $sum: { $cond: [{ $eq: ['$status', 'on-leave'] }, 1, 0] } },
        holiday:    { $sum: { $cond: [{ $eq: ['$status', 'holiday']  }, 1, 0] } },
        halfDay:    { $sum: { $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0] } },
        totalHours: { $sum: { $ifNull: ['$workHours', 0] } },
        totalDays:  { $sum: 1 },
      },
    },
  ]);

  const attMap = {};
  attData.forEach(a => { attMap[String(a._id)] = a; });

  const rows = employees.map(emp => {
    const a           = attMap[String(emp._id)] || {};
    const present     = a.present  || 0;
    const absent      = a.absent   || 0;
    const late        = a.late     || 0;
    const onLeave     = a.onLeave  || 0;
    const holiday     = a.holiday  || 0;
    const halfDay     = a.halfDay  || 0;
    const totalHours  = roundToTwo(a.totalHours || 0);
    const workingDays = Math.max((a.totalDays || 0) - holiday, 1);
    const attendancePct = roundToTwo(((present + late + halfDay * 0.5) / workingDays) * 100);

    return {
      employeeId: emp._id,
      name:       `${emp.firstName} ${emp.lastName}`,
      code:       emp.employeeCode,
      department: emp.departmentId ? emp.departmentId.name : '—',
      present, absent, late, onLeave, holiday, halfDay, totalHours, attendancePct,
    };
  });

  const summary = {
    totalEmployees:  rows.length,
    avgAttendancePct: rows.length
      ? roundToTwo(rows.reduce((s, r) => s + r.attendancePct, 0) / rows.length)
      : 0,
    totalPresent: rows.reduce((s, r) => s + r.present, 0),
    totalAbsent:  rows.reduce((s, r) => s + r.absent,  0),
    month,
    year,
  };

  return { rows, summary, filters: { month, year, ...filters } };
}

// ─── Leave Report ─────────────────────────────────────────────────────────────
// Already efficient (single $in query). Kept as-is.
async function getLeaveReport(filters = {}) {
  const leaveQuery = {};
  if (filters.leaveType) leaveQuery.leaveType = filters.leaveType;
  if (filters.status)    leaveQuery.status    = filters.status;
  if (filters.dateFrom || filters.dateTo) {
    leaveQuery.startDate = {};
    if (filters.dateFrom) leaveQuery.startDate.$gte = new Date(filters.dateFrom);
    if (filters.dateTo)   leaveQuery.startDate.$lte = new Date(filters.dateTo);
  }

  const empQuery = { status: 'active' };
  if (filters.departmentId) empQuery.departmentId = filters.departmentId;
  if (filters.employeeId)   empQuery._id          = filters.employeeId;

  const employees = await Employee.find(empQuery).populate('departmentId', 'name').lean();
  const empIds    = employees.map(e => e._id);

  if (empIds.length) leaveQuery.employeeId = { $in: empIds };

  const leaves = await Leave.find(leaveQuery).lean();

  const empMap = {};
  employees.forEach(e => {
    empMap[String(e._id)] = {
      employeeId: e._id,
      name:       `${e.firstName} ${e.lastName}`,
      code:       e.employeeCode,
      department: e.departmentId ? e.departmentId.name : '—',
      casual: 0, sick: 0, earned: 0, unpaid: 0, total: 0, pending: 0,
    };
  });

  leaves.forEach(l => {
    const key  = String(l.employeeId);
    if (!empMap[key]) return;
    const days = l.totalDays || 0;
    if (l.status === 'approved') {
      empMap[key][l.leaveType] = (empMap[key][l.leaveType] || 0) + days;
      empMap[key].total += days;
    }
    if (l.status === 'pending') empMap[key].pending++;
  });

  const rows      = Object.values(empMap);
  const typeCount = { casual: 0, sick: 0, earned: 0, unpaid: 0 };
  rows.forEach(r => {
    typeCount.casual += r.casual;
    typeCount.sick   += r.sick;
    typeCount.earned += r.earned;
    typeCount.unpaid += r.unpaid;
  });

  const mostUsedType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0][0];
  const summary = {
    totalLeavesTaken:     rows.reduce((s, r) => s + r.total, 0),
    avgLeavesPerEmployee: rows.length
      ? roundToTwo(rows.reduce((s, r) => s + r.total, 0) / rows.length)
      : 0,
    mostUsedType,
    typeCount,
  };

  return { rows, summary, filters };
}

// ─── Payroll Report ───────────────────────────────────────────────────────────
// Fixed: department filter pushed into aggregation $lookup instead of in-memory JS filter
async function getPayrollReport(filters = {}) {
  const month = parseInt(filters.month, 10) || new Date().getMonth() + 1;
  const year  = parseInt(filters.year,  10) || new Date().getFullYear();

  const pipeline = [
    { $match: { month, year } },
    {
      $lookup: {
        from:         'employees',
        localField:   'employeeId',
        foreignField: '_id',
        as:           'emp',
      },
    },
    { $unwind: { path: '$emp', preserveNullAndEmpty: false } },
    {
      $lookup: {
        from:         'departments',
        localField:   'emp.departmentId',
        foreignField: '_id',
        as:           'dept',
      },
    },
    {
      $addFields: {
        deptName: { $ifNull: [{ $arrayElemAt: ['$dept.name', 0] }, 'Unassigned'] },
      },
    },
  ];

  if (filters.departmentId) {
    pipeline.push({
      $match: { 'emp.departmentId': new mongoose.Types.ObjectId(String(filters.departmentId)) },
    });
  }

  const payslips = await Payslip.aggregate(pipeline);

  const rows = payslips.map(p => ({
    name:        `${p.emp.firstName} ${p.emp.lastName}`,
    code:        p.emp.employeeCode,
    department:  p.deptName,
    designation: p.emp.designation || '—',
    basic:       p.earnings ? p.earnings.basicSalary || 0 : 0,
    gross:       p.grossSalary   || 0,
    deductions:  p.totalDeductions || 0,
    netPay:      p.netPay        || 0,
    pf:          p.deductions ? p.deductions.pf          || 0 : 0,
    esi:         p.deductions ? p.deductions.esi         || 0 : 0,
    tax:         p.deductions ? p.deductions.incomeTax   || 0 : 0,
  }));

  const totalPayroll = rows.reduce((s, r) => s + r.netPay, 0);
  const highest      = rows.length ? Math.max(...rows.map(r => r.netPay)) : 0;
  const lowest       = rows.length ? Math.min(...rows.map(r => r.netPay)) : 0;

  const deptMap = {};
  rows.forEach(r => {
    if (!deptMap[r.department]) deptMap[r.department] = { total: 0, count: 0 };
    deptMap[r.department].total += r.netPay;
    deptMap[r.department].count++;
  });
  const deptAvg = Object.entries(deptMap).map(([dept, d]) => ({
    department: dept,
    avg:        roundToTwo(d.total / d.count),
    count:      d.count,
  }));

  const summary = {
    totalPayroll:   roundToTwo(totalPayroll),
    totalEmployees: rows.length,
    highestSalary:  roundToTwo(highest),
    lowestSalary:   roundToTwo(lowest),
    avgSalary:      rows.length ? roundToTwo(totalPayroll / rows.length) : 0,
    deptAvg,
    month,
    year,
  };

  return { rows, summary, filters: { month, year, ...filters } };
}

// ─── Performance Report ───────────────────────────────────────────────────────
// Was: 1 + 2*N queries (Review.find + KPI.find per employee)
// Now: 3 queries  — Employee.find + Review.find($in) + KPI.find($in)
async function getPerformanceReport(filters = {}) {
  const empQuery = { status: 'active' };
  if (filters.departmentId) empQuery.departmentId = new mongoose.Types.ObjectId(String(filters.departmentId));
  if (filters.employeeId)   empQuery._id          = new mongoose.Types.ObjectId(String(filters.employeeId));

  const employees = await Employee.find(empQuery).populate('departmentId', 'name').lean();
  if (!employees.length) {
    return {
      rows: [],
      summary: { topPerformers: [], gradeCount: {}, deptAvgRating: [], totalEmployees: 0 },
      filters,
    };
  }

  const empIds = employees.map(e => e._id);

  const reviewQuery = { employeeId: { $in: empIds } };
  if (filters.quarter) reviewQuery.quarter = filters.quarter;
  if (filters.year)    reviewQuery.year    = parseInt(filters.year, 10);

  // Two queries cover all employees at once — uses { employeeId, status } index
  const [allReviews, allKPIs] = await Promise.all([
    Review.find(reviewQuery).lean(),
    KPI.find({ employeeId: { $in: empIds }, status: { $ne: 'cancelled' } }).lean(),
  ]);

  const reviewMap = {};
  allReviews.forEach(r => {
    const k = String(r.employeeId);
    if (!reviewMap[k]) reviewMap[k] = [];
    reviewMap[k].push(r);
  });

  const kpiMap = {};
  allKPIs.forEach(k => {
    const key = String(k.employeeId);
    if (!kpiMap[key]) kpiMap[key] = [];
    kpiMap[key].push(k);
  });

  const rows = employees.map(emp => {
    const reviews = reviewMap[String(emp._id)] || [];
    const kpis    = kpiMap[String(emp._id)]    || [];

    const avgRating = reviews.length
      ? roundToTwo(reviews.reduce((s, r) => s + (r.averageRating || 0), 0) / reviews.length)
      : 0;

    const completedKpis = kpis.filter(k => k.status === 'completed').length;
    const kpiPct        = kpis.length ? roundToTwo((completedKpis / kpis.length) * 100) : 0;

    return {
      employeeId: emp._id,
      name:       `${emp.firstName} ${emp.lastName}`,
      code:       emp.employeeCode,
      department: emp.departmentId ? emp.departmentId.name : '—',
      avgRating,
      grade:      avgRating > 0 ? getPerformanceGrade(avgRating) : '—',
      reviewCount: reviews.length,
      kpiCount:    kpis.length,
      kpiPct,
    };
  });

  const rated        = rows.filter(r => r.avgRating > 0);
  const topPerformers = [...rated].sort((a, b) => b.avgRating - a.avgRating).slice(0, 5);

  const gradeCount = {};
  rows.forEach(r => {
    if (r.grade !== '—') gradeCount[r.grade] = (gradeCount[r.grade] || 0) + 1;
  });

  const deptRatings = {};
  rated.forEach(r => {
    if (!deptRatings[r.department]) deptRatings[r.department] = { total: 0, count: 0 };
    deptRatings[r.department].total += r.avgRating;
    deptRatings[r.department].count++;
  });
  const deptAvgRating = Object.entries(deptRatings).map(([dept, d]) => ({
    department: dept,
    avg:        roundToTwo(d.total / d.count),
  }));

  const summary = { topPerformers, gradeCount, deptAvgRating, totalEmployees: rows.length };
  return { rows, summary, filters };
}

// ─── Headcount Report ─────────────────────────────────────────────────────────
async function getHeadcountReport(filters = {}) {
  const empQuery = {};
  if (filters.departmentId) empQuery.departmentId = filters.departmentId;

  const allEmployees = await Employee.find(empQuery).populate('departmentId', 'name').lean();

  const now      = new Date();
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
  const dateTo   = filters.dateTo   ? new Date(filters.dateTo)   : now;

  const newJoinings = allEmployees.filter(e => {
    const jd = new Date(e.joiningDate);
    return jd >= dateFrom && jd <= dateTo;
  }).length;

  const exits        = allEmployees.filter(e => ['resigned', 'terminated'].includes(e.status)).length;
  const active       = allEmployees.filter(e => e.status === 'active').length;
  const avgHeadcount = (active + exits) / 2 || 1;
  const turnoverRate = calculateTurnoverRate(exits, avgHeadcount);

  const deptMap = {};
  allEmployees.filter(e => e.status === 'active').forEach(e => {
    const dept = e.departmentId ? e.departmentId.name : 'Unassigned';
    deptMap[dept] = (deptMap[dept] || 0) + 1;
  });
  const deptBreakdown = Object.entries(deptMap)
    .map(([dept, count]) => ({ dept, count }))
    .sort((a, b) => b.count - a.count);

  const genderMap = { male: 0, female: 0, other: 0, 'not-specified': 0 };
  allEmployees.filter(e => e.status === 'active').forEach(e => {
    const g = e.gender || 'not-specified';
    genderMap[g] = (genderMap[g] || 0) + 1;
  });

  const desigMap = {};
  allEmployees.filter(e => e.status === 'active').forEach(e => {
    const d = e.designation || 'Not Set';
    desigMap[d] = (desigMap[d] || 0) + 1;
  });
  const designationBreakdown = Object.entries(desigMap)
    .map(([designation, count]) => ({ designation, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  let totalTenure = 0;
  let tenureCount = 0;
  allEmployees.filter(e => e.status === 'active' && e.joiningDate).forEach(e => {
    const diff = (now - new Date(e.joiningDate)) / (1000 * 60 * 60 * 24 * 365);
    totalTenure += diff;
    tenureCount++;
  });
  const avgTenure = tenureCount ? roundToTwo(totalTenure / tenureCount) : 0;

  const summary = {
    totalHeadcount: allEmployees.length,
    activeHeadcount: active,
    newJoinings,
    exits,
    turnoverRate,
    avgTenure,
    genderMap,
    deptBreakdown,
    designationBreakdown,
  };

  return { summary, filters: { dateFrom, dateTo, ...filters } };
}

// ─── Dept headcount chart ─────────────────────────────────────────────────────
// Was: full Employee.find + in-memory grouping
// Now: single aggregation with $group — no application-layer loop
async function getDeptHeadcountChart() {
  const result = await Employee.aggregate([
    { $match: { status: 'active' } },
    {
      $lookup: {
        from:         'departments',
        localField:   'departmentId',
        foreignField: '_id',
        as:           'dept',
      },
    },
    {
      $group: {
        _id:   { $ifNull: [{ $arrayElemAt: ['$dept.name', 0] }, 'Unassigned'] },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return {
    labels: result.map(d => d._id),
    data:   result.map(d => d.count),
  };
}

// ─── Attendance trend chart (last 6 months) ───────────────────────────────────
// Was: 6 months × 2 countDocuments = 12 sequential queries
// Now: 1 aggregation with $group by year+month
async function getAttendanceTrendChart() {
  const now          = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const monthNames   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const result = await Attendance.aggregate([
    { $match: { date: { $gte: sixMonthsAgo, $lte: now } } },
    {
      $group: {
        _id: {
          year:  { $year:  '$date' },
          month: { $month: '$date' },
        },
        total:   { $sum: 1 },
        present: {
          $sum: { $cond: [{ $in: ['$status', ['present', 'late', 'half-day']] }, 1, 0] },
        },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Index result by "YYYY-M" for O(1) lookup
  const resultMap = {};
  result.forEach(r => { resultMap[`${r._id.year}-${r._id.month}`] = r; });

  const labels = [];
  const data   = [];
  for (let i = 5; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m     = d.getMonth() + 1;
    const y     = d.getFullYear();
    const row   = resultMap[`${y}-${m}`];
    labels.push(`${monthNames[m - 1]} ${y}`);
    data.push(row && row.total > 0 ? roundToTwo((row.present / row.total) * 100) : 0);
  }

  return { labels, data };
}

module.exports = {
  getAttendanceReport,
  getLeaveReport,
  getPayrollReport,
  getPerformanceReport,
  getHeadcountReport,
  getDeptHeadcountChart,
  getAttendanceTrendChart,
};
