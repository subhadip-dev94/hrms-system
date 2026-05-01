const expenseService = require('./expense.service');
const { validateExpense } = require('../../utils/validation.util');
const { getExpenseCategories } = require('../../utils/helper.util');

const expenseController = {
  // GET /expense — my expenses
  async index(req, res) {
    try {
      const expenses = await expenseService.getMyExpenses(req.session.user.employeeId);
      const summary = await expenseService.getExpenseSummary(req.session.user.employeeId);
      res.render('pages/expense/index', {
        title: 'My Expenses',
        expenses,
        summary,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // GET /expense/create
  async createForm(req, res) {
    try {
      res.render('pages/expense/create', {
        title: 'Submit Expense',
        categories: getExpenseCategories(),
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/expense');
    }
  },

  // POST /expense
  async create(req, res) {
    try {
      const hasReceipt = !!req.file;
      const validationErrors = validateExpense({ ...req.body, hasReceipt });
      if (validationErrors.length > 0) {
        return res.render('pages/expense/create', {
          title: 'Submit Expense',
          categories: getExpenseCategories(),
          errors: validationErrors,
          old: req.body,
        });
      }
      await expenseService.createExpense(req.session.user.employeeId, req.body, req.file);
      req.flash('success', 'Expense created as draft');
      res.redirect('/expense');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/expense/create');
    }
  },

  // GET /expense/:id
  async detail(req, res) {
    try {
      const expense = await expenseService.getExpenseById(req.params.id);
      res.render('pages/expense/detail', {
        title: `Expense — ${expense.expenseCode}`,
        expense,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/expense');
    }
  },

  // GET /expense/:id/edit
  async editForm(req, res) {
    try {
      const expense = await expenseService.getExpenseById(req.params.id);
      if (String(expense.employeeId._id || expense.employeeId) !== String(req.session.user.employeeId)) {
        req.flash('error', 'Unauthorized');
        return res.redirect('/expense');
      }
      if (expense.status !== 'draft') {
        req.flash('error', 'Only draft expenses can be edited');
        return res.redirect(`/expense/${req.params.id}`);
      }
      res.render('pages/expense/edit', {
        title: 'Edit Expense',
        expense,
        categories: getExpenseCategories(),
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/expense');
    }
  },

  // PUT /expense/:id
  async update(req, res) {
    try {
      const hasReceipt = !!req.file;
      const validationErrors = validateExpense({ ...req.body, hasReceipt });
      if (validationErrors.length > 0) {
        const expense = await expenseService.getExpenseById(req.params.id);
        return res.render('pages/expense/edit', {
          title: 'Edit Expense',
          expense,
          categories: getExpenseCategories(),
          errors: validationErrors,
          old: req.body,
        });
      }
      await expenseService.updateExpense(req.params.id, req.session.user.employeeId, req.body, req.file);
      req.flash('success', 'Expense updated');
      res.redirect(`/expense/${req.params.id}`);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/expense/${req.params.id}/edit`);
    }
  },

  // DELETE /expense/:id
  async remove(req, res) {
    try {
      await expenseService.deleteExpense(req.params.id, req.session.user.employeeId);
      req.flash('success', 'Expense deleted');
      res.redirect('/expense');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/expense');
    }
  },

  // POST /expense/:id/submit
  async submit(req, res) {
    try {
      await expenseService.submitExpense(req.params.id, req.session.user.employeeId);
      req.flash('success', 'Expense submitted for approval');
      res.redirect(`/expense/${req.params.id}`);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/expense/${req.params.id}`);
    }
  },

  // GET /expense/approvals — pending approvals queue
  async approvals(req, res) {
    try {
      const expenses = await expenseService.getPendingApprovals(
        req.session.user.employeeId,
        req.session.user.role
      );
      res.render('pages/expense/approvals', {
        title: 'Expense Approvals',
        expenses,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // GET /expense/all — all expenses (finance/admin/hr)
  async all(req, res) {
    try {
      const filters = {
        employeeId: req.query.employeeId || '',
        category: req.query.category || '',
        status: req.query.status || '',
        dateFrom: req.query.dateFrom || '',
        dateTo: req.query.dateTo || '',
      };
      const expenses = await expenseService.getAllExpenses(filters);
      res.render('pages/expense/all', {
        title: 'All Expenses',
        expenses,
        filters,
        categories: getExpenseCategories(),
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // POST /expense/:id/approve
  async approve(req, res) {
    try {
      await expenseService.approveExpense(
        req.params.id,
        req.session.user.employeeId,
        req.session.user.role,
        req.body.comment
      );
      req.flash('success', 'Expense approved');
      res.redirect('/expense/approvals');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/expense/approvals');
    }
  },

  // POST /expense/:id/reject
  async reject(req, res) {
    try {
      await expenseService.rejectExpense(
        req.params.id,
        req.session.user.employeeId,
        req.body.comment
      );
      req.flash('success', 'Expense rejected');
      res.redirect('/expense/approvals');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/expense/approvals');
    }
  },

  // POST /expense/:id/pay
  async markPaid(req, res) {
    try {
      await expenseService.markAsPaid(req.params.id, req.body.paymentMode, req.session.user.employeeId);
      req.flash('success', 'Expense marked as paid');
      res.redirect(`/expense/${req.params.id}`);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/expense/${req.params.id}`);
    }
  },
};

module.exports = expenseController;
