const Offboarding = require('./offboarding.model');
const Employee = require('../employee/employee.model');
const User = require('../auth/user.model');
const { getDefaultChecklist } = require('../../utils/helper.util');
const {
  sendOffboardingInitiatedEmail,
  sendOffboardingCompletedEmail,
} = require('../../utils/email.util');
const errors = require('../../utils/errorCodes.util');

const offboardingService = {
  // ─── Get all offboarding cases ────────────────────────────────────────────
  async getAllOffboarding(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.exitType) query.exitType = filters.exitType;
    if (filters.dateFrom || filters.dateTo) {
      query.lastWorkingDay = {};
      if (filters.dateFrom) query.lastWorkingDay.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.lastWorkingDay.$lte = new Date(filters.dateTo);
    }

    return await Offboarding.find(query)
      .populate('employeeId', 'firstName lastName employeeCode departmentId designation')
      .populate('initiatedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  },

  // ─── Get single offboarding ───────────────────────────────────────────────
  async getOffboardingById(id) {
    const offboarding = await Offboarding.findById(id)
      .populate('employeeId', 'firstName lastName employeeCode departmentId designation email joiningDate')
      .populate('initiatedBy', 'firstName lastName')
      .populate('checklist.completedBy', 'firstName lastName')
      .populate('exitInterview.conductedBy', 'firstName lastName')
      .populate('finalSettlement.processedBy', 'firstName lastName')
      .lean();
    if (!offboarding) throw new Error(errors.OFFBOARDING_NOT_FOUND);
    return offboarding;
  },

  // ─── Get offboarding by employee ID ──────────────────────────────────────
  async getByEmployeeId(employeeId) {
    return await Offboarding.findOne({ employeeId }).lean();
  },

  // ─── Initiate offboarding ─────────────────────────────────────────────────
  async initiateOffboarding(data, initiatedByEmployeeId) {
    const employee = await Employee.findById(data.employeeId)
      .select('firstName lastName email role status employeeCode')
      .lean();
    if (!employee) throw new Error('Employee not found');
    if (employee.role === 'admin') throw new Error(errors.CANNOT_OFFBOARD_ADMIN);
    if (['terminated', 'resigned'].includes(employee.status)) {
      throw new Error(errors.EMPLOYEE_ALREADY_INACTIVE);
    }

    const existing = await Offboarding.findOne({ employeeId: data.employeeId });
    if (existing && ['initiated', 'in-progress'].includes(existing.status)) {
      throw new Error(errors.OFFBOARDING_EXISTS);
    }

    // Calculate notice period in days
    let noticePeriod = 0;
    if (data.resignationDate && data.lastWorkingDay) {
      const diff = new Date(data.lastWorkingDay) - new Date(data.resignationDate);
      noticePeriod = Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
    }

    // Load default checklist
    const checklist = getDefaultChecklist().map(item => ({ item, isCompleted: false }));

    const offboarding = await Offboarding.create({
      employeeId: data.employeeId,
      exitType: data.exitType,
      resignationDate: data.resignationDate ? new Date(data.resignationDate) : undefined,
      lastWorkingDay: new Date(data.lastWorkingDay),
      noticePeriod,
      reason: data.reason.trim(),
      checklist,
      initiatedBy: initiatedByEmployeeId,
    });

    // Update employee status
    const newStatus = data.exitType === 'termination' ? 'terminated' : 'resigned';
    await Employee.findByIdAndUpdate(data.employeeId, { status: newStatus });

    // Non-blocking email
    const initiatedBy = await Employee.findById(initiatedByEmployeeId).select('firstName lastName').lean();
    sendOffboardingInitiatedEmail(
      employee.email,
      `${employee.firstName} ${employee.lastName}`,
      new Date(data.lastWorkingDay).toLocaleDateString('en-IN'),
      initiatedBy ? `${initiatedBy.firstName} ${initiatedBy.lastName}` : 'HR'
    );

    return offboarding;
  },

  // ─── Mark checklist item done ─────────────────────────────────────────────
  async markChecklistItem(offboardingId, itemIndex, completedByEmployeeId, notes) {
    const offboarding = await Offboarding.findById(offboardingId);
    if (!offboarding) throw new Error(errors.OFFBOARDING_NOT_FOUND);
    if (!offboarding.checklist[itemIndex]) throw new Error(errors.CHECKLIST_ITEM_NOT_FOUND);

    offboarding.checklist[itemIndex].isCompleted = true;
    offboarding.checklist[itemIndex].completedBy = completedByEmployeeId;
    offboarding.checklist[itemIndex].completedAt = new Date();
    offboarding.checklist[itemIndex].notes = notes || '';

    // Auto-progress status
    const allDone = offboarding.checklist.every(c => c.isCompleted);
    if (offboarding.status === 'initiated') offboarding.status = 'in-progress';

    await offboarding.save();
    return { allChecklistDone: allDone };
  },

  // ─── Unmark checklist item ────────────────────────────────────────────────
  async unmarkChecklistItem(offboardingId, itemIndex) {
    const offboarding = await Offboarding.findById(offboardingId);
    if (!offboarding) throw new Error(errors.OFFBOARDING_NOT_FOUND);
    if (!offboarding.checklist[itemIndex]) throw new Error(errors.CHECKLIST_ITEM_NOT_FOUND);

    offboarding.checklist[itemIndex].isCompleted = false;
    offboarding.checklist[itemIndex].completedBy = undefined;
    offboarding.checklist[itemIndex].completedAt = undefined;
    offboarding.checklist[itemIndex].notes = '';
    return await offboarding.save();
  },

  // ─── Save exit interview ──────────────────────────────────────────────────
  async saveExitInterview(offboardingId, interviewData) {
    const offboarding = await Offboarding.findById(offboardingId);
    if (!offboarding) throw new Error(errors.OFFBOARDING_NOT_FOUND);

    offboarding.exitInterview = {
      scheduledAt: interviewData.scheduledAt ? new Date(interviewData.scheduledAt) : undefined,
      conductedBy: interviewData.conductedBy || undefined,
      feedback: interviewData.feedback || '',
      rating: interviewData.rating ? parseInt(interviewData.rating, 10) : undefined,
      isCompleted: interviewData.isCompleted === 'true' || interviewData.isCompleted === true,
    };

    return await offboarding.save();
  },

  // ─── Save final settlement ────────────────────────────────────────────────
  async saveSettlement(offboardingId, settlementData, processedByEmployeeId) {
    const offboarding = await Offboarding.findById(offboardingId);
    if (!offboarding) throw new Error(errors.OFFBOARDING_NOT_FOUND);

    const basic = parseFloat(settlementData.basicSalary) || 0;
    const leaveEncashment = parseFloat(settlementData.leaveEncashment) || 0;
    const bonus = parseFloat(settlementData.bonus) || 0;
    const deductions = parseFloat(settlementData.deductions) || 0;
    const netPayable = basic + leaveEncashment + bonus - deductions;

    offboarding.finalSettlement = {
      basicSalary: basic,
      leaveEncashment,
      bonus,
      deductions,
      netPayable,
      processedAt: new Date(),
      processedBy: processedByEmployeeId,
    };

    return await offboarding.save();
  },

  // ─── Complete offboarding ─────────────────────────────────────────────────
  async completeOffboarding(offboardingId, completedByEmployeeId) {
    const offboarding = await Offboarding.findById(offboardingId)
      .populate('employeeId', 'firstName lastName email')
      .lean();
    if (!offboarding) throw new Error(errors.OFFBOARDING_NOT_FOUND);

    const allChecklist = offboarding.checklist.every(c => c.isCompleted);
    if (!allChecklist) throw new Error('All checklist items must be completed first');
    if (!offboarding.exitInterview || !offboarding.exitInterview.isCompleted) {
      throw new Error('Exit interview must be completed first');
    }
    if (!offboarding.finalSettlement || !offboarding.finalSettlement.processedAt) {
      throw new Error('Final settlement must be processed first');
    }

    await Offboarding.findByIdAndUpdate(offboardingId, {
      status: 'completed',
      completedAt: new Date(),
    });

    // Terminate employee + revoke user account
    await Employee.findByIdAndUpdate(offboarding.employeeId._id, { status: 'terminated' });
    await User.findOneAndUpdate(
      { employeeId: offboarding.employeeId._id },
      { isActive: false }
    );

    const emp = offboarding.employeeId;
    sendOffboardingCompletedEmail(
      emp.email,
      `${emp.firstName} ${emp.lastName}`,
      offboarding.exitType,
      new Date(offboarding.lastWorkingDay).toLocaleDateString('en-IN')
    );
  },

  // ─── Cancel offboarding ───────────────────────────────────────────────────
  async cancelOffboarding(offboardingId) {
    const offboarding = await Offboarding.findById(offboardingId).lean();
    if (!offboarding) throw new Error(errors.OFFBOARDING_NOT_FOUND);

    await Offboarding.findByIdAndUpdate(offboardingId, { status: 'cancelled' });
    // Revert employee status to active
    await Employee.findByIdAndUpdate(offboarding.employeeId, { status: 'active' });
  },

  // ─── Dashboard: in-progress count ────────────────────────────────────────
  async getInProgressCount() {
    return await Offboarding.countDocuments({ status: { $in: ['initiated', 'in-progress'] } });
  },
};

module.exports = offboardingService;
