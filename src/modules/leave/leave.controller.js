const leaveService = require('./leave.service');
const employeeService = require('../employee/employee.service');
const holidayService = require('../holiday/holiday.service');
const { validateLeaveApplication } = require('../../utils/validation.util');

const leaveController = {
  // GET /leaves
  // HR/Admin → all leaves;  others → redirect to /leaves/my
  async index(req, res) {
    try {
      const role = req.session.user.role;
      if (!['admin', 'hr'].includes(role)) {
        return res.redirect('/leaves/my');
      }

      const filters = {
        employeeId: req.query.employeeId || '',
        status: req.query.status || '',
        leaveType: req.query.leaveType || '',
        month: req.query.month || '',
        year: req.query.year || '',
      };

      const [leaves, employees] = await Promise.all([
        leaveService.getAllLeaves(filters),
        employeeService.getAllEmployees({ status: 'active' }),
      ]);

      res.render('pages/leave/index', {
        title: 'All Leaves',
        leaves,
        employees,
        filters,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // GET /leaves/my
  async my(req, res) {
    try {
      const employeeId = req.session.user.employeeId;

      const [leaves, balance] = await Promise.all([
        leaveService.getMyLeaves(employeeId),
        leaveService.getLeaveBalance(employeeId),
      ]);

      res.render('pages/leave/my', {
        title: 'My Leaves',
        leaves,
        balance,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // GET /leaves/create
  async getCreate(req, res) {
    try {
      const employeeId = req.session.user.employeeId;
      const [balance, upcomingHolidays] = await Promise.all([
        leaveService.getLeaveBalance(employeeId),
        holidayService.getUpcomingHolidays(10),
      ]);

      res.render('pages/leave/create', {
        title: 'Apply Leave',
        balance,
        upcomingHolidays,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/leaves/my');
    }
  },

  // POST /leaves
  async postCreate(req, res) {
    try {
      const errors = validateLeaveApplication(req.body);
      if (errors.length) {
        req.flash('error', errors.join(', '));
        return res.redirect('/leaves/create');
      }

      const employeeId = req.session.user.employeeId;
      await leaveService.applyLeave(employeeId, req.body);
      req.flash('success', 'Leave application submitted successfully');
      res.redirect('/leaves/my');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/leaves/create');
    }
  },

  // GET /leaves/approvals
  async approvals(req, res) {
    try {
      const role = req.session.user.role;
      if (!['admin', 'hr', 'manager'].includes(role)) {
        req.flash('error', 'Access denied');
        return res.redirect('/leaves/my');
      }

      const leaves = await leaveService.getPendingApprovals(
        req.session.user.employeeId,
        role
      );

      res.render('pages/leave/approvals', {
        title: 'Leave Approvals',
        leaves,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // PUT /leaves/:id/approve
  async approve(req, res) {
    try {
      const role = req.session.user.role;
      const employeeId = req.session.user.employeeId;
      const comment = req.body.comment || '';

      await leaveService.approveLeave(req.params.id, employeeId, role, comment);
      req.flash('success', 'Leave approved successfully');
      res.redirect('/leaves/approvals');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/leaves/approvals');
    }
  },

  // PUT /leaves/:id/reject
  async reject(req, res) {
    try {
      const role = req.session.user.role;
      const employeeId = req.session.user.employeeId;
      const comment = req.body.comment || '';

      await leaveService.rejectLeave(req.params.id, employeeId, role, comment);
      req.flash('success', 'Leave rejected');
      res.redirect('/leaves/approvals');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/leaves/approvals');
    }
  },

  // PUT /leaves/:id/cancel
  async cancel(req, res) {
    try {
      const employeeId = req.session.user.employeeId;
      await leaveService.cancelLeave(req.params.id, employeeId);
      req.flash('success', 'Leave cancelled successfully');
      res.redirect('/leaves/my');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/leaves/my');
    }
  },
};

module.exports = leaveController;
