const Expense = require('./expense.model');
const Employee = require('../employee/employee.model');
const { generateExpenseCode } = require('../../utils/helper.util');
const { sendExpenseStatusEmail } = require('../../utils/email.util');
const errors = require('../../utils/errorCodes.util');

const expenseService = {
  // ─── My expenses ───────────────────────────────────────────────────────────
  async getMyExpenses(employeeId) {
    return await Expense.find({ employeeId })
      .sort({ createdAt: -1 })
      .lean();
  },

  // ─── All expenses (HR/finance/admin) with optional filters ────────────────
  async getAllExpenses(filters = {}) {
    const query = {};
    if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.category) query.category = filters.category;
    if (filters.status) query.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
      query.expenseDate = {};
      if (filters.dateFrom) query.expenseDate.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        query.expenseDate.$lte = end;
      }
    }

    return await Expense.find(query)
      .populate('employeeId', 'firstName lastName employeeCode departmentId')
      .populate('managerAction.actionBy', 'firstName lastName')
      .populate('financeAction.actionBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  },

  // ─── Get single expense ────────────────────────────────────────────────────
  async getExpenseById(id) {
    const expense = await Expense.findById(id)
      .populate('employeeId', 'firstName lastName employeeCode email departmentId')
      .populate('managerAction.actionBy', 'firstName lastName')
      .populate('financeAction.actionBy', 'firstName lastName')
      .lean();
    if (!expense) throw new Error(errors.EXPENSE_NOT_FOUND);
    return expense;
  },

  // ─── Create expense (draft) ────────────────────────────────────────────────
  async createExpense(employeeId, data, receiptFile) {
    const amount = parseFloat(data.amount);

    // Receipt required for > 500
    if (amount > 500 && !receiptFile) {
      throw new Error(errors.RECEIPT_REQUIRED);
    }

    const expenseCode = await generateExpenseCode(Expense);

    return await Expense.create({
      expenseCode,
      employeeId,
      category: data.category,
      title: data.title.trim(),
      description: data.description ? data.description.trim() : '',
      amount,
      expenseDate: new Date(data.expenseDate),
      receiptUrl: receiptFile ? receiptFile.path     : '',
      receiptId:  receiptFile ? receiptFile.filename : '',
      status: 'draft',
    });
  },

  // ─── Update expense (draft only) ─────────────────────────────────────────
  async updateExpense(id, employeeId, data, receiptFile) {
    const expense = await Expense.findById(id);
    if (!expense) throw new Error(errors.EXPENSE_NOT_FOUND);
    if (String(expense.employeeId) !== String(employeeId)) {
      throw new Error(errors.UNAUTHORIZED);
    }
    if (expense.status !== 'draft') throw new Error(errors.CANNOT_EDIT_EXPENSE);

    const amount = parseFloat(data.amount);
    if (amount > 500 && !receiptFile && !expense.receiptUrl) {
      throw new Error(errors.RECEIPT_REQUIRED);
    }

    expense.category = data.category;
    expense.title = data.title.trim();
    expense.description = data.description ? data.description.trim() : '';
    expense.amount = amount;
    expense.expenseDate = new Date(data.expenseDate);
    if (receiptFile) {
      expense.receiptUrl = receiptFile.path;
      expense.receiptId  = receiptFile.filename;
    }

    return await expense.save();
  },

  // ─── Delete expense (draft only) ─────────────────────────────────────────
  async deleteExpense(id, employeeId) {
    const expense = await Expense.findById(id);
    if (!expense) throw new Error(errors.EXPENSE_NOT_FOUND);
    if (String(expense.employeeId) !== String(employeeId)) {
      throw new Error(errors.UNAUTHORIZED);
    }
    if (expense.status !== 'draft') throw new Error(errors.CANNOT_EDIT_EXPENSE);
    await Expense.findByIdAndDelete(id);
  },

  // ─── Submit expense for approval ──────────────────────────────────────────
  async submitExpense(id, employeeId) {
    const expense = await Expense.findById(id);
    if (!expense) throw new Error(errors.EXPENSE_NOT_FOUND);
    if (String(expense.employeeId) !== String(employeeId)) {
      throw new Error(errors.UNAUTHORIZED);
    }
    if (expense.status !== 'draft') throw new Error(errors.EXPENSE_NOT_PENDING);

    expense.status = 'submitted';
    return await expense.save();
  },

  // ─── Approve expense ──────────────────────────────────────────────────────
  async approveExpense(id, approverId, role, comment) {
    const expense = await Expense.findById(id)
      .populate('employeeId', 'firstName lastName email')
      .lean();
    if (!expense) throw new Error(errors.EXPENSE_NOT_FOUND);

    let newStatus;
    const updateData = {};

    if (role === 'manager') {
      if (expense.status !== 'submitted') throw new Error(errors.EXPENSE_NOT_PENDING);
      newStatus = 'manager_approved';
      updateData.managerAction = { actionBy: approverId, actionAt: new Date(), comment: comment || '' };
    } else {
      // finance / admin / hr
      if (!['submitted', 'manager_approved'].includes(expense.status)) {
        throw new Error(errors.EXPENSE_NOT_PENDING);
      }
      newStatus = 'approved';
      updateData.financeAction = { actionBy: approverId, actionAt: new Date(), comment: comment || '' };
    }

    updateData.status = newStatus;
    await Expense.findByIdAndUpdate(id, updateData);

    const emp = expense.employeeId;
    sendExpenseStatusEmail(
      emp.email,
      `${emp.firstName} ${emp.lastName}`,
      expense.title,
      newStatus,
      comment
    );
  },

  // ─── Reject expense ───────────────────────────────────────────────────────
  async rejectExpense(id, rejecterId, comment) {
    const expense = await Expense.findById(id)
      .populate('employeeId', 'firstName lastName email')
      .lean();
    if (!expense) throw new Error(errors.EXPENSE_NOT_FOUND);
    if (!['submitted', 'manager_approved'].includes(expense.status)) {
      throw new Error(errors.EXPENSE_NOT_PENDING);
    }

    await Expense.findByIdAndUpdate(id, {
      status: 'rejected',
      financeAction: { actionBy: rejecterId, actionAt: new Date(), comment: comment || '' },
    });

    const emp = expense.employeeId;
    sendExpenseStatusEmail(
      emp.email,
      `${emp.firstName} ${emp.lastName}`,
      expense.title,
      'rejected',
      comment
    );
  },

  // ─── Mark as paid ─────────────────────────────────────────────────────────
  async markAsPaid(id, paymentMode, approverId) {
    const expense = await Expense.findById(id);
    if (!expense) throw new Error(errors.EXPENSE_NOT_FOUND);
    if (expense.status !== 'approved') throw new Error(errors.EXPENSE_NOT_PENDING);

    expense.status = 'paid';
    expense.paidAt = new Date();
    expense.paymentMode = paymentMode || 'bank-transfer';
    return await expense.save();
  },

  // ─── Expense summary for employee ─────────────────────────────────────────
  async getExpenseSummary(employeeId) {
    const expenses = await Expense.find({ employeeId }).lean();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let total = 0, pending = 0, approved = 0, paid = 0, rejected = 0;
    expenses.forEach((e) => {
      total += e.amount;
      if (['submitted', 'manager_approved'].includes(e.status)) pending++;
      if (e.status === 'approved') approved++;
      if (e.status === 'paid') paid++;
      if (e.status === 'rejected') rejected++;
    });
    return { total, pending, approved, paid, rejected };
  },

  // ─── Pending approvals queue ──────────────────────────────────────────────
  async getPendingApprovals(userId, role) {
    if (role === 'manager') {
      // Find direct reports
      const reports = await Employee.find({ managerId: userId, status: 'active' }, '_id').lean();
      const ids = reports.map((e) => e._id);
      return await Expense.find({ employeeId: { $in: ids }, status: 'submitted' })
        .populate('employeeId', 'firstName lastName employeeCode')
        .sort({ createdAt: 1 })
        .lean();
    }
    // finance / hr / admin: see manager_approved + submitted
    return await Expense.find({ status: { $in: ['submitted', 'manager_approved'] } })
      .populate('employeeId', 'firstName lastName employeeCode departmentId')
      .populate('managerAction.actionBy', 'firstName lastName')
      .sort({ createdAt: 1 })
      .lean();
  },

  // ─── Dashboard: pending count for employee ────────────────────────────────
  async getMyPendingCount(employeeId) {
    if (!employeeId) return 0;
    return await Expense.countDocuments({
      employeeId,
      status: { $in: ['submitted', 'manager_approved'] },
    });
  },

  // ─── Dashboard: pending approval count for manager/finance ───────────────
  async getPendingApprovalCount(userId, role) {
    if (!userId) return 0;
    if (role === 'manager') {
      const reports = await Employee.find({ managerId: userId, status: 'active' }, '_id').lean();
      const ids = reports.map((e) => e._id);
      return await Expense.countDocuments({ employeeId: { $in: ids }, status: 'submitted' });
    }
    return await Expense.countDocuments({ status: { $in: ['submitted', 'manager_approved'] } });
  },
};

module.exports = expenseService;
