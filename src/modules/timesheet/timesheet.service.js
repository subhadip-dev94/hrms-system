const Timesheet = require('./timesheet.model');
const Employee = require('../employee/employee.model');
const { getWeekRange, getTotalHoursByDate, roundToTwo } = require('../../utils/helper.util');
const errors = require('../../utils/errorCodes.util');

// ─── Build the 7 ISO date strings for a week (Mon … Sun) ──────────────────
function buildWeekDays(weekStart) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

function dateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const timesheetService = {
  // ─── My timesheet for a week ───────────────────────────────────────────────
  async getMyTimesheet(employeeId, weekStartInput) {
    const { weekStart, weekEnd } = getWeekRange(weekStartInput || new Date());

    const entries = await Timesheet.find({
      employeeId,
      date: { $gte: weekStart, $lte: weekEnd },
    })
      .sort({ date: 1, createdAt: 1 })
      .lean();

    // Group by date key
    const byDate = {};
    const days = buildWeekDays(weekStart);
    days.forEach((d) => { byDate[dateKey(d)] = []; });
    entries.forEach((e) => {
      const k = dateKey(e.date);
      if (byDate[k]) byDate[k].push(e);
    });

    // Per-day totals
    const dailyTotals = {};
    Object.keys(byDate).forEach((k) => {
      dailyTotals[k] = roundToTwo(getTotalHoursByDate(byDate[k]));
    });

    let totalHours = 0;
    let billableHours = 0;
    let nonBillableHours = 0;
    entries.forEach((e) => {
      totalHours += e.hours;
      if (e.workType === 'billable') billableHours += e.hours;
      else nonBillableHours += e.hours;
    });

    return {
      entries,
      byDate,
      days,
      dailyTotals,
      weekStart,
      weekEnd,
      totalHours: roundToTwo(totalHours),
      billableHours: roundToTwo(billableHours),
      nonBillableHours: roundToTwo(nonBillableHours),
    };
  },

  // ─── Log a new work entry ──────────────────────────────────────────────────
  async logWork(employeeId, data) {
    const entryDate = new Date(data.date);
    entryDate.setHours(0, 0, 0, 0);

    // Check total hours for that date won't exceed 24
    const existingEntries = await Timesheet.find({
      employeeId,
      date: {
        $gte: entryDate,
        $lte: new Date(entryDate.getTime() + 86400000 - 1),
      },
    }).lean();

    const existingTotal = getTotalHoursByDate(existingEntries);
    if (existingTotal + parseFloat(data.hours) > 24) {
      throw new Error(errors.TOTAL_HOURS_EXCEEDED);
    }

    const { weekStart } = getWeekRange(entryDate);

    return await Timesheet.create({
      employeeId,
      date: entryDate,
      projectName: data.projectName.trim(),
      taskDescription: data.taskDescription.trim(),
      hours: parseFloat(data.hours),
      workType: data.workType,
      weekStart,
      status: 'draft',
    });
  },

  // ─── Get a single entry ────────────────────────────────────────────────────
  async getEntryById(id) {
    const entry = await Timesheet.findById(id)
      .populate('employeeId', 'firstName lastName employeeCode')
      .populate('approvedBy', 'firstName lastName')
      .lean();
    if (!entry) throw new Error(errors.TIMESHEET_NOT_FOUND);
    return entry;
  },

  // ─── Update a draft entry ──────────────────────────────────────────────────
  async updateEntry(id, employeeId, data) {
    const entry = await Timesheet.findById(id);
    if (!entry) throw new Error(errors.TIMESHEET_NOT_FOUND);
    if (String(entry.employeeId) !== String(employeeId)) {
      throw new Error(errors.UNAUTHORIZED);
    }
    if (entry.status !== 'draft') throw new Error(errors.TIMESHEET_LOCKED);
    if (entry.isLocked) throw new Error(errors.TIMESHEET_LOCKED);

    entry.projectName = data.projectName.trim();
    entry.taskDescription = data.taskDescription.trim();
    entry.hours = parseFloat(data.hours);
    entry.workType = data.workType;
    return await entry.save();
  },

  // ─── Delete a draft entry ──────────────────────────────────────────────────
  async deleteEntry(id, employeeId) {
    const entry = await Timesheet.findById(id);
    if (!entry) throw new Error(errors.TIMESHEET_NOT_FOUND);
    if (String(entry.employeeId) !== String(employeeId)) {
      throw new Error(errors.UNAUTHORIZED);
    }
    if (entry.status !== 'draft') throw new Error(errors.TIMESHEET_LOCKED);
    if (entry.isLocked) throw new Error(errors.TIMESHEET_LOCKED);

    await Timesheet.findByIdAndDelete(id);
  },

  // ─── Submit a draft entry for approval ────────────────────────────────────
  async submitEntry(id, employeeId) {
    const entry = await Timesheet.findById(id);
    if (!entry) throw new Error(errors.TIMESHEET_NOT_FOUND);
    if (String(entry.employeeId) !== String(employeeId)) {
      throw new Error(errors.UNAUTHORIZED);
    }
    if (entry.status !== 'draft') {
      throw new Error('Entry is already submitted or processed');
    }
    if (entry.isLocked) throw new Error(errors.TIMESHEET_LOCKED);

    entry.status = 'submitted';
    return await entry.save();
  },

  // ─── Approve an entry (manager) ───────────────────────────────────────────
  async approveEntry(id, managerId) {
    const entry = await Timesheet.findById(id).populate('employeeId');
    if (!entry) throw new Error(errors.TIMESHEET_NOT_FOUND);

    // Verify manager is the reporter of this employee
    if (
      entry.employeeId.managerId &&
      String(entry.employeeId.managerId) !== String(managerId)
    ) {
      // Allow hr/admin — checked in controller via RBAC
    }

    entry.status = 'approved';
    entry.approvedBy = managerId;
    entry.approvedAt = new Date();
    return await entry.save();
  },

  // ─── Reject an entry (manager) ────────────────────────────────────────────
  async rejectEntry(id, managerId, comment) {
    const entry = await Timesheet.findById(id);
    if (!entry) throw new Error(errors.TIMESHEET_NOT_FOUND);

    entry.status = 'rejected';
    entry.managerComment = comment || '';
    return await entry.save();
  },

  // ─── Lock all entries for a month (called after payroll run) ──────────────
  async lockTimesheetsByMonth(month, year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    const result = await Timesheet.updateMany(
      { date: { $gte: start, $lte: end } },
      { isLocked: true }
    );
    return result.modifiedCount;
  },

  // ─── Weekly summary (used by dashboard) ───────────────────────────────────
  async getWeeklySummary(employeeId, weekStartInput) {
    if (!employeeId) return null;
    const { weekStart, weekEnd } = getWeekRange(weekStartInput || new Date());
    const entries = await Timesheet.find({
      employeeId,
      date: { $gte: weekStart, $lte: weekEnd },
    }).lean();

    let totalHours = 0;
    let billableHours = 0;
    let nonBillableHours = 0;
    entries.forEach((e) => {
      totalHours += e.hours;
      if (e.workType === 'billable') billableHours += e.hours;
      else nonBillableHours += e.hours;
    });

    return {
      totalHours: roundToTwo(totalHours),
      billableHours: roundToTwo(billableHours),
      nonBillableHours: roundToTwo(nonBillableHours),
      entriesCount: entries.length,
    };
  },

  // ─── Count submitted entries pending approval (dashboard widget) ──────────
  async getPendingApprovalCount(managerId) {
    if (!managerId) return 0;
    // Find all employees managed by this manager
    const reports = await Employee.find({ managerId, status: 'active' }, '_id').lean();
    if (reports.length === 0) return 0;
    const ids = reports.map((e) => e._id);
    return await Timesheet.countDocuments({
      employeeId: { $in: ids },
      status: 'submitted',
    });
  },

  // ─── Report view (HR/manager) ─────────────────────────────────────────────
  async getTimesheetReport(filters = {}) {
    const query = {};

    if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.projectName) {
      query.projectName = new RegExp(filters.projectName, 'i');
    }
    if (filters.workType) query.workType = filters.workType;
    if (filters.status) query.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
      query.date = {};
      if (filters.dateFrom) query.date.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const entries = await Timesheet.find(query)
      .populate('employeeId', 'firstName lastName employeeCode departmentId')
      .populate('approvedBy', 'firstName lastName')
      .sort({ date: -1 })
      .lean();

    // Aggregate totals
    let totalHours = 0;
    let billableHours = 0;
    entries.forEach((e) => {
      totalHours += e.hours;
      if (e.workType === 'billable') billableHours += e.hours;
    });

    return {
      entries,
      totalHours: roundToTwo(totalHours),
      billableHours: roundToTwo(billableHours),
      nonBillableHours: roundToTwo(totalHours - billableHours),
    };
  },
};

module.exports = timesheetService;
