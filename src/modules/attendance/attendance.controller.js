const attendanceService = require('./attendance.service');
const employeeService = require('../employee/employee.service');

const attendanceController = {
  // GET /attendance
  // HR/Admin → show all;  Employee → redirect to /attendance/my
  async index(req, res) {
    try {
      const role = req.session.user.role;
      if (!['admin', 'hr'].includes(role)) {
        return res.redirect('/attendance/my');
      }

      const filters = {
        employeeId: req.query.employeeId || '',
        month: req.query.month || new Date().getMonth() + 1,
        year: req.query.year || new Date().getFullYear(),
        status: req.query.status || '',
      };

      const [records, employees] = await Promise.all([
        attendanceService.getAllAttendance(filters),
        employeeService.getAllEmployees({ status: 'active' }),
      ]);

      res.render('pages/attendance/index', {
        title: 'Attendance – All Employees',
        records,
        employees,
        filters,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // GET /attendance/my
  async my(req, res) {
    try {
      const employeeId = req.session.user.employeeId;
      const month = parseInt(req.query.month) || new Date().getMonth() + 1;
      const year = parseInt(req.query.year) || new Date().getFullYear();

      const [records, todayAttendance] = await Promise.all([
        attendanceService.getMyAttendance(employeeId, month, year),
        attendanceService.getTodayAttendance(employeeId),
      ]);

      res.render('pages/attendance/my', {
        title: 'My Attendance',
        records,
        todayAttendance,
        selectedMonth: month,
        selectedYear: year,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // POST /attendance/checkin
  async checkIn(req, res) {
    try {
      const employeeId = req.session.user.employeeId;
      if (!employeeId) {
        req.flash('error', 'Employee record not linked to your account');
        return res.redirect('/attendance/my');
      }

      await attendanceService.checkIn(employeeId);
      req.flash('success', 'Checked in successfully');
      res.redirect('/attendance/my');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/attendance/my');
    }
  },

  // POST /attendance/checkout
  async checkOut(req, res) {
    try {
      const employeeId = req.session.user.employeeId;
      if (!employeeId) {
        req.flash('error', 'Employee record not linked to your account');
        return res.redirect('/attendance/my');
      }

      await attendanceService.checkOut(employeeId);
      req.flash('success', 'Checked out successfully');
      res.redirect('/attendance/my');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/attendance/my');
    }
  },

  // GET /attendance/report
  async report(req, res) {
    try {
      const role = req.session.user.role;
      if (!['admin', 'hr'].includes(role)) {
        req.flash('error', 'Access denied');
        return res.redirect('/attendance/my');
      }

      const employeeId = req.query.employeeId || '';
      const month = parseInt(req.query.month) || new Date().getMonth() + 1;
      const year = parseInt(req.query.year) || new Date().getFullYear();

      const employees = await employeeService.getAllEmployees({ status: 'active' });

      let reportData = null;
      let selectedEmployee = null;

      if (employeeId) {
        [reportData, selectedEmployee] = await Promise.all([
          attendanceService.getMonthlyReport(employeeId, month, year),
          employeeService.getEmployeeById(employeeId),
        ]);
      }

      res.render('pages/attendance/report', {
        title: 'Attendance Report',
        employees,
        reportData,
        selectedEmployee,
        selectedMonth: month,
        selectedYear: year,
        selectedEmployeeId: employeeId,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/attendance');
    }
  },

  // POST /attendance/mark  (HR/Admin manual mark)
  async markAttendance(req, res) {
    try {
      await attendanceService.markAttendance(req.body, req.session.user.role);
      req.flash('success', 'Attendance marked successfully');
      res.redirect('/attendance');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/attendance');
    }
  },
};

module.exports = attendanceController;
