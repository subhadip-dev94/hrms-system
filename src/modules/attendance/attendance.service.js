const Attendance = require('./attendance.model');
const errorCodes = require('../../utils/errorCodes.util');
const { getMonthDateRange, toMidnight } = require('../../utils/helper.util');

// ─── Returns { start, end } spanning today (midnight → 23:59:59) ──────────────
const getTodayRange = () => {
  const now = new Date();
  const start = toMidnight(now);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const attendanceService = {
  getTodayRange,

  // ─── Get today's attendance record for one employee ─────────────────────────
  async getTodayAttendance(employeeId) {
    if (!employeeId) return null;
    const { start, end } = getTodayRange();
    return await Attendance.findOne({
      employeeId,
      date: { $gte: start, $lte: end },
    });
  },

  // ─── Employee checks in ─────────────────────────────────────────────────────
  async checkIn(employeeId) {
    const { start, end } = getTodayRange();

    const existing = await Attendance.findOne({
      employeeId,
      date: { $gte: start, $lte: end },
    });

    if (existing && existing.checkIn) {
      throw new Error(errorCodes.ALREADY_CHECKED_IN);
    }

    const now = new Date();
    const today = toMidnight(now);

    // Late threshold: 9:30 AM
    const lateThreshold = new Date(today);
    lateThreshold.setHours(9, 30, 0, 0);
    const isLate = now > lateThreshold;

    if (existing) {
      existing.checkIn = now;
      existing.isLate = isLate;
      existing.status = isLate ? 'late' : 'present';
      return await existing.save();
    }

    return await Attendance.create({
      employeeId,
      date: today,
      checkIn: now,
      isLate,
      status: isLate ? 'late' : 'present',
      markedBy: 'self',
    });
  },

  // ─── Employee checks out ────────────────────────────────────────────────────
  async checkOut(employeeId) {
    const { start, end } = getTodayRange();

    const attendance = await Attendance.findOne({
      employeeId,
      date: { $gte: start, $lte: end },
    });

    if (!attendance || !attendance.checkIn) {
      throw new Error(errorCodes.NOT_CHECKED_IN);
    }

    if (attendance.checkOut) {
      throw new Error(errorCodes.ALREADY_CHECKED_OUT);
    }

    const now = new Date();
    const workHours = (now - attendance.checkIn) / (1000 * 60 * 60);
    const overtime = workHours > 8 ? parseFloat((workHours - 8).toFixed(2)) : 0;

    attendance.checkOut = now;
    attendance.workHours = parseFloat(workHours.toFixed(2));
    attendance.overtime = overtime;

    return await attendance.save();
  },

  // ─── Own monthly attendance ─────────────────────────────────────────────────
  async getMyAttendance(employeeId, month, year) {
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const { startDate, endDate } = getMonthDateRange(m, y);

    return await Attendance.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate },
    })
      .sort({ date: 1 })
      .lean();
  },

  // ─── HR view: all employees + filters ──────────────────────────────────────
  async getAllAttendance(filters) {
    const query = {};

    if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.status) query.status = filters.status;

    if (filters.month && filters.year) {
      const { startDate, endDate } = getMonthDateRange(
        parseInt(filters.month),
        parseInt(filters.year)
      );
      query.date = { $gte: startDate, $lte: endDate };
    }

    return await Attendance.find(query)
      .populate('employeeId', 'firstName lastName employeeCode')
      .sort({ date: -1 })
      .lean();
  },

  // ─── HR/Admin manual mark ───────────────────────────────────────────────────
  async markAttendance(data, markedByRole) {
    const dateObj = toMidnight(data.date);
    const nextDay = new Date(dateObj.getTime() + 24 * 60 * 60 * 1000);

    const existing = await Attendance.findOne({
      employeeId: data.employeeId,
      date: { $gte: dateObj, $lt: nextDay },
    });

    const payload = {
      employeeId: data.employeeId,
      date: dateObj,
      status: data.status || 'present',
      note: data.note || '',
      markedBy: markedByRole || 'hr',
    };

    if (existing) {
      Object.assign(existing, payload);
      return await existing.save();
    }

    return await Attendance.create(payload);
  },

  // ─── Monthly report summary ─────────────────────────────────────────────────
  async getMonthlyReport(employeeId, month, year) {
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const { startDate, endDate } = getMonthDateRange(m, y);

    const records = await Attendance.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate },
    })
      .sort({ date: 1 })
      .lean();

    const summary = {
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      onLeave: 0,
      holiday: 0,
      totalWorkHours: 0,
      totalOvertime: 0,
    };

    records.forEach((r) => {
      if (r.status === 'present') summary.present++;
      else if (r.status === 'late') { summary.late++; summary.present++; }
      else if (r.status === 'absent') summary.absent++;
      else if (r.status === 'half-day') summary.halfDay++;
      else if (r.status === 'on-leave') summary.onLeave++;
      else if (r.status === 'holiday') summary.holiday++;

      summary.totalWorkHours += r.workHours || 0;
      summary.totalOvertime += r.overtime || 0;
    });

    summary.totalWorkHours = parseFloat(summary.totalWorkHours.toFixed(2));
    summary.totalOvertime = parseFloat(summary.totalOvertime.toFixed(2));

    return { summary, records };
  },

  // ─── Today summary for dashboard (HR/Admin) ─────────────────────────────────
  // Was: Attendance.find (all docs today) + 4 in-memory .filter() calls
  // Now: single aggregation — only counts returned, no documents transferred
  async getTodaySummary() {
    const { start, end } = getTodayRange();
    const [result] = await Attendance.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id:     null,
          present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
          absent:  { $sum: { $cond: [{ $eq: ['$status', 'absent']            }, 1, 0] } },
          onLeave: { $sum: { $cond: [{ $eq: ['$status', 'on-leave']          }, 1, 0] } },
          late:    { $sum: { $cond: [{ $eq: ['$status', 'late']              }, 1, 0] } },
        },
      },
    ]);
    return result
      ? { present: result.present, absent: result.absent, onLeave: result.onLeave, late: result.late }
      : { present: 0, absent: 0, onLeave: 0, late: 0 };
  },
};

module.exports = attendanceService;
