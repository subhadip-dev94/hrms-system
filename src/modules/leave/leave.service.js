const Leave = require('./leave.model');
const LeaveBalance = require('./leaveBalance.model');
const Holiday = require('../holiday/holiday.model');
const errorCodes = require('../../utils/errorCodes.util');
const { calculateWorkingDays, isWeekend, toMidnight } = require('../../utils/helper.util');
const { sendLeaveAppliedEmail, sendLeaveStatusEmail } = require('../../utils/email.util');

const leaveService = {
  // ─── Initialise leave balance for a new employee ────────────────────────────
  async initLeaveBalance(employeeId) {
    const existing = await LeaveBalance.findOne({ employeeId });
    if (existing) return existing;

    return await LeaveBalance.create({
      employeeId,
      year: new Date().getFullYear(),
      casual: { total: 12, used: 0, remaining: 12 },
      sick: { total: 12, used: 0, remaining: 12 },
      earned: { total: 15, used: 0, remaining: 15 },
    });
  },

  // ─── Apply leave ────────────────────────────────────────────────────────────
  async applyLeave(employeeId, data) {
    const start = toMidnight(data.startDate);
    const end = toMidnight(data.endDate);

    if (end < start) throw new Error(errorCodes.INVALID_DATE_RANGE);

    // Must not be entirely on weekends
    if (isWeekend(start) && isWeekend(end) && start.getTime() === end.getTime()) {
      throw new Error(errorCodes.WEEKEND_NOT_ALLOWED);
    }

    // Get holidays in range
    const holidays = await Holiday.find({
      date: { $gte: start, $lte: end },
    }).lean();

    // Check if start date is a holiday (single day check)
    const isStartHoliday = holidays.some((h) => {
      const hd = toMidnight(h.date);
      return hd.getTime() === start.getTime();
    });
    if (start.getTime() === end.getTime() && isStartHoliday) {
      throw new Error(errorCodes.HOLIDAY_NOT_ALLOWED);
    }

    // Check for overlapping leave
    const overlap = await Leave.findOne({
      employeeId,
      status: { $nin: ['rejected', 'cancelled'] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    });
    if (overlap) throw new Error(errorCodes.LEAVE_OVERLAP);

    // Calculate actual working days
    const totalDays = calculateWorkingDays(start, end, holidays);
    if (totalDays === 0) {
      throw new Error('The selected dates fall entirely on weekends or holidays');
    }

    // Check leave balance (skip for unpaid)
    if (data.leaveType !== 'unpaid') {
      const balance = await LeaveBalance.findOne({ employeeId });
      if (!balance) throw new Error(errorCodes.LEAVE_BALANCE_NOT_FOUND);

      const typeBalance = balance[data.leaveType];
      if (!typeBalance || typeBalance.remaining < totalDays) {
        throw new Error(
          `${errorCodes.INSUFFICIENT_LEAVE_BALANCE}. Available: ${typeBalance ? typeBalance.remaining : 0} days`
        );
      }
    }

    const leave = await Leave.create({
      employeeId,
      leaveType: data.leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason: data.reason,
      status: 'pending',
    });

    // Notify manager → fallback to HR if no manager (non-blocking)
    const Employee = require('../employee/employee.model');
    const employee = await Employee.findById(employeeId)
      .populate('managerId', 'email firstName lastName')
      .lean();

    const leaveDetails = {
      type: data.leaveType,
      startDate: start.toLocaleDateString('en-IN'),
      endDate: end.toLocaleDateString('en-IN'),
      totalDays,
      reason: data.reason,
    };
    const employeeFullName = `${employee.firstName} ${employee.lastName}`;

    if (employee && employee.managerId && employee.managerId.email) {
      sendLeaveAppliedEmail(employee.managerId.email, employeeFullName, leaveDetails);
    } else {
      // No direct manager — notify HR/admin so the request doesn't go unnoticed
      const hrEmployee = await Employee.findOne(
        { role: { $in: ['hr', 'admin'] }, status: 'active' },
        'email firstName lastName'
      ).lean();
      if (hrEmployee && hrEmployee.email) {
        sendLeaveAppliedEmail(hrEmployee.email, employeeFullName, leaveDetails);
      }
    }

    // Real-time notification to manager or HR/admin
    try {
      const { emitToEmployee, emitToRoles } = require('../../config/socket');
      const msg = `${employeeFullName} applied for ${leaveDetails.totalDays} day(s) of ${leaveDetails.type} leave.`;
      if (employee && employee.managerId) {
        emitToEmployee(employee.managerId._id, 'leave:newRequest', { message: msg });
      } else {
        emitToRoles(['hr', 'admin'], 'leave:newRequest', { message: msg });
      }
    } catch (_) {}

    return leave;
  },

  // ─── Approve leave ──────────────────────────────────────────────────────────
  async approveLeave(leaveId, approverId, approverRole, comment) {
    const leave = await Leave.findById(leaveId).populate(
      'employeeId',
      'firstName lastName email'
    );
    if (!leave) throw new Error(errorCodes.NOT_FOUND);

    if (approverRole === 'manager') {
      if (leave.status !== 'pending') throw new Error(errorCodes.LEAVE_NOT_PENDING);

      leave.status = 'manager_approved';
      leave.managerAction = {
        actionBy: approverId,
        actionAt: new Date(),
        comment: comment || '',
      };
      await leave.save();

      // Notify HR/admin that manager has approved — final approval needed
      const Employee = require('../employee/employee.model');
      const emp = leave.employeeId;
      const hrEmployee = await Employee.findOne(
        { role: { $in: ['hr', 'admin'] }, status: 'active' },
        'email firstName lastName'
      ).lean();
      if (hrEmployee && hrEmployee.email) {
        sendLeaveAppliedEmail(hrEmployee.email, `${emp.firstName} ${emp.lastName}`, {
          type: leave.leaveType,
          startDate: new Date(leave.startDate).toLocaleDateString('en-IN'),
          endDate: new Date(leave.endDate).toLocaleDateString('en-IN'),
          totalDays: leave.totalDays,
          reason: `Manager approved. Pending HR final approval.`,
        });
      }

    } else if (approverRole === 'hr' || approverRole === 'admin') {
      if (!['pending', 'manager_approved'].includes(leave.status)) {
        throw new Error(errorCodes.LEAVE_NOT_PENDING);
      }

      leave.status = 'approved';
      leave.hrAction = {
        actionBy: approverId,
        actionAt: new Date(),
        comment: comment || '',
      };
      await leave.save();

      // Deduct from balance (skip for unpaid)
      if (leave.leaveType !== 'unpaid') {
        await LeaveBalance.findOneAndUpdate(
          { employeeId: leave.employeeId._id },
          {
            $inc: {
              [`${leave.leaveType}.used`]: leave.totalDays,
              [`${leave.leaveType}.remaining`]: -leave.totalDays,
            },
          }
        );
      }

      // Email employee (non-blocking)
      const emp = leave.employeeId;
      if (emp && emp.email) {
        await sendLeaveStatusEmail(
          emp.email,
          `${emp.firstName} ${emp.lastName}`,
          'approved',
          comment
        );
      }
    }

    // Real-time notification to the employee
    try {
      const { emitToEmployee, emitToRoles } = require('../../config/socket');
      const emp = leave.employeeId;
      if (approverRole === 'hr' || approverRole === 'admin') {
        emitToEmployee(emp._id, 'leave:update', {
          status: 'approved',
          message: `Your ${leave.leaveType} leave (${leave.totalDays} day${leave.totalDays > 1 ? 's' : ''}) has been approved.`,
        });
      } else if (approverRole === 'manager') {
        emitToEmployee(emp._id, 'leave:update', {
          status: 'manager_approved',
          message: `Your ${leave.leaveType} leave has been approved by your manager. Awaiting HR confirmation.`,
        });
        emitToRoles(['hr', 'admin'], 'leave:pendingAction', {
          message: `${emp.firstName} ${emp.lastName}'s leave is manager-approved and awaiting your final decision.`,
        });
      }
    } catch (_) {}

    return leave;
  },

  // ─── Reject leave ────────────────────────────────────────────────────────────
  async rejectLeave(leaveId, rejecterId, rejecterRole, comment) {
    const leave = await Leave.findById(leaveId).populate(
      'employeeId',
      'firstName lastName email'
    );
    if (!leave) throw new Error(errorCodes.NOT_FOUND);

    if (!['pending', 'manager_approved'].includes(leave.status)) {
      throw new Error(errorCodes.LEAVE_NOT_PENDING);
    }

    leave.status = 'rejected';

    const action = {
      actionBy: rejecterId,
      actionAt: new Date(),
      comment: comment || '',
    };

    if (rejecterRole === 'manager') {
      leave.managerAction = action;
    } else {
      leave.hrAction = action;
    }

    await leave.save();

    const emp = leave.employeeId;
    if (emp && emp.email) {
      await sendLeaveStatusEmail(
        emp.email,
        `${emp.firstName} ${emp.lastName}`,
        'rejected',
        comment
      );
    }

    // Real-time notification to the employee
    try {
      const { emitToEmployee } = require('../../config/socket');
      emitToEmployee(emp._id, 'leave:update', {
        status: 'rejected',
        message: `Your ${leave.leaveType} leave request has been rejected.${comment ? ' Reason: ' + comment : ''}`,
      });
    } catch (_) {}

    return leave;
  },

  // ─── Cancel leave ────────────────────────────────────────────────────────────
  async cancelLeave(leaveId, employeeId) {
    const leave = await Leave.findById(leaveId);
    if (!leave) throw new Error(errorCodes.NOT_FOUND);

    if (leave.employeeId.toString() !== employeeId.toString()) {
      throw new Error(errorCodes.UNAUTHORIZED);
    }

    if (leave.status === 'pending' || leave.status === 'manager_approved') {
      leave.status = 'cancelled';
      await leave.save();
      return leave;
    }

    if (leave.status === 'approved') {
      const today = toMidnight(new Date());
      const startDate = toMidnight(leave.startDate);

      if (startDate <= today) {
        throw new Error(errorCodes.CANNOT_CANCEL_APPROVED);
      }

      // Restore balance (skip for unpaid)
      if (leave.leaveType !== 'unpaid') {
        await LeaveBalance.findOneAndUpdate(
          { employeeId },
          {
            $inc: {
              [`${leave.leaveType}.used`]: -leave.totalDays,
              [`${leave.leaveType}.remaining`]: leave.totalDays,
            },
          }
        );
      }

      leave.status = 'cancelled';
      await leave.save();
      return leave;
    }

    throw new Error('This leave cannot be cancelled');
  },

  // ─── My leave history ────────────────────────────────────────────────────────
  async getMyLeaves(employeeId) {
    return await Leave.find({ employeeId })
      .populate('managerAction.actionBy', 'firstName lastName')
      .populate('hrAction.actionBy', 'firstName lastName')
      .sort({ appliedAt: -1 })
      .lean();
  },

  // ─── HR view: all leaves with filters ───────────────────────────────────────
  async getAllLeaves(filters) {
    const query = {};

    if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.status) query.status = filters.status;
    if (filters.leaveType) query.leaveType = filters.leaveType;

    if (filters.month && filters.year) {
      const startOfMonth = new Date(filters.year, filters.month - 1, 1);
      const endOfMonth = new Date(filters.year, filters.month, 0, 23, 59, 59);
      query.startDate = { $lte: endOfMonth };
      query.endDate = { $gte: startOfMonth };
    }

    return await Leave.find(query)
      .populate('employeeId', 'firstName lastName employeeCode')
      .populate('managerAction.actionBy', 'firstName lastName')
      .populate('hrAction.actionBy', 'firstName lastName')
      .sort({ appliedAt: -1 })
      .lean();
  },

  // ─── Pending approvals queue ─────────────────────────────────────────────────
  async getPendingApprovals(userId, role) {
    if (role === 'manager') {
      const Employee = require('../employee/employee.model');
      const teamMembers = await Employee.find({ managerId: userId }, '_id').lean();
      const teamIds = teamMembers.map((e) => e._id);

      return await Leave.find({
        employeeId: { $in: teamIds },
        status: 'pending',
      })
        .populate('employeeId', 'firstName lastName employeeCode designation')
        .sort({ appliedAt: 1 })
        .lean();
    }

    if (role === 'hr' || role === 'admin') {
      return await Leave.find({
        status: { $in: ['pending', 'manager_approved'] },
      })
        .populate('employeeId', 'firstName lastName employeeCode designation')
        .sort({ appliedAt: 1 })
        .lean();
    }

    return [];
  },

  // ─── Leave balance ────────────────────────────────────────────────────────────
  async getLeaveBalance(employeeId, year) {
    const targetYear = year || new Date().getFullYear();
    return await LeaveBalance.findOne({ employeeId, year: targetYear }).lean();
  },

  // ─── Count pending (for dashboard widget) ───────────────────────────────────
  async getPendingCount(employeeId, role) {
    if (!employeeId) return 0;

    if (role === 'manager') {
      const Employee = require('../employee/employee.model');
      const teamMembers = await Employee.find({ managerId: employeeId }, '_id').lean();
      const teamIds = teamMembers.map((e) => e._id);
      return await Leave.countDocuments({ employeeId: { $in: teamIds }, status: 'pending' });
    }

    if (role === 'hr' || role === 'admin') {
      return await Leave.countDocuments({
        status: { $in: ['pending', 'manager_approved'] },
      });
    }

    return 0;
  },
};

module.exports = leaveService;
