const employeeService = require('../employee/employee.service');
const holidayService = require('../holiday/holiday.service');
const attendanceService = require('../attendance/attendance.service');
const leaveService = require('../leave/leave.service');
const payrollService = require('../payroll/payroll.service');
const timesheetService = require('../timesheet/timesheet.service');
const performanceService = require('../performance/performance.service');
const recruitmentService = require('../recruitment/recruitment.service');
const expenseService = require('../expense/expense.service');
const announcementService = require('../announcement/announcement.service');
const offboardingService = require('../offboarding/offboarding.service');
const reportsService = require('../reports/reports.service');
const documentService = require('../document/document.service');

const dashboardController = {
  async index(req, res) {
    try {
      const user = req.session.user;
      const employeeId = user ? user.employeeId : null;
      const role = user ? user.role : 'employee';

      const isAdminHr = ['admin', 'hr'].includes(role);
      const isAdminHrFinance = ['admin', 'hr', 'finance'].includes(role);
      const isAdminHrManager = ['admin', 'hr', 'manager'].includes(role);
      const isAdminHrFinanceManager = ['admin', 'hr', 'finance', 'manager'].includes(role);

      const [
        stats,
        upcomingHolidays,
        todayAttendance,
        pendingLeaveCount,
        todaySummary,
        latestPayroll,
        weeklySummary,
        kpiSummary,
        latestReviewGrade,
        pendingTimesheetCount,
        openJobsCount,
        pendingExpenseCount,
        myPendingExpenses,
        latestAnnouncements,
        offboardingInProgressCount,
        deptHeadcountChart,
        attendanceTrendChart,
        expiringDocCount,
      ] = await Promise.all([
        employeeService.getDashboardStats(),
        holidayService.getUpcomingHolidays(5),
        attendanceService.getTodayAttendance(employeeId),
        leaveService.getPendingCount(employeeId, role),
        isAdminHr ? attendanceService.getTodaySummary() : Promise.resolve(null),
        isAdminHrFinance ? payrollService.getLatestPayroll() : Promise.resolve(null),
        timesheetService.getWeeklySummary(employeeId),
        performanceService.getMyKPISummary(employeeId),
        performanceService.getLatestReviewGrade(employeeId),
        isAdminHrManager
          ? timesheetService.getPendingApprovalCount(employeeId)
          : Promise.resolve(0),
        isAdminHr ? recruitmentService.getOpenJobsCount() : Promise.resolve(null),
        isAdminHrFinanceManager
          ? expenseService.getPendingApprovalCount(employeeId, role)
          : Promise.resolve(null),
        expenseService.getMyPendingCount(employeeId),
        announcementService.getLatestForNavbar(employeeId, role, 3),
        isAdminHr ? offboardingService.getInProgressCount() : Promise.resolve(null),
        isAdminHr ? reportsService.getDeptHeadcountChart() : Promise.resolve(null),
        reportsService.getAttendanceTrendChart(),
        isAdminHr ? documentService.getExpiringCount(30) : Promise.resolve(null),
      ]);

      res.render('pages/dashboard/index', {
        title: 'Dashboard',
        stats,
        upcomingHolidays,
        todayAttendance,
        pendingLeaveCount,
        todaySummary,
        latestPayroll,
        weeklySummary,
        kpiSummary,
        latestReviewGrade,
        pendingTimesheetCount,
        openJobsCount,
        pendingExpenseCount,
        myPendingExpenses,
        latestAnnouncements,
        offboardingInProgressCount,
        deptHeadcountChartData: JSON.stringify(deptHeadcountChart || { labels: [], data: [] }),
        attendanceTrendChartData: JSON.stringify(attendanceTrendChart || { labels: [], data: [] }),
        expiringDocCount: expiringDocCount || 0,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.render('pages/dashboard/index', {
        title: 'Dashboard',
        stats: { total: 0, active: 0, departments: 0, newThisMonth: 0, recent: [] },
        upcomingHolidays: [],
        todayAttendance: null,
        pendingLeaveCount: 0,
        todaySummary: null,
        latestPayroll: null,
        weeklySummary: null,
        kpiSummary: null,
        latestReviewGrade: null,
        pendingTimesheetCount: 0,
        openJobsCount: null,
        pendingExpenseCount: null,
        myPendingExpenses: 0,
        latestAnnouncements: [],
        offboardingInProgressCount: null,
        deptHeadcountChartData: JSON.stringify({ labels: [], data: [] }),
        attendanceTrendChartData: JSON.stringify({ labels: [], data: [] }),
        expiringDocCount: 0,
      });
    }
  },
};

module.exports = dashboardController;
