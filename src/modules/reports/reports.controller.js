const reportsService = require('./reports.service');
const departmentService = require('../department/department.service');
const employeeService = require('../employee/employee.service');
const { getMonthName, generateReportFilename } = require('../../utils/helper.util');
const PDFDocument = require('pdfkit');
const fs = require('fs-extra');
const path = require('path');

// ─── Helper: build common filter vars ────────────────────────────────────────
function buildFilters(query) {
  return {
    month: query.month || String(new Date().getMonth() + 1),
    year: query.year || String(new Date().getFullYear()),
    departmentId: query.departmentId || '',
    employeeId: query.employeeId || '',
    leaveType: query.leaveType || '',
    status: query.status || '',
    dateFrom: query.dateFrom || '',
    dateTo: query.dateTo || '',
    quarter: query.quarter || '',
  };
}

// ─── Helper: generate a simple PDF and stream it ─────────────────────────────
async function generatePDF(res, reportType, title, headers, rows, summary, filters) {
  const filename = generateReportFilename(reportType, filters);
  const dir = path.join(__dirname, '../../../public/reports', reportType);
  await fs.ensureDir(dir);
  const filePath = path.join(dir, filename);

  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // ── Header ─────────────────────────────────────────────────────────────────
  doc.fontSize(18).font('Helvetica-Bold').text('HRMS — ' + title, { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica').text(
    `Generated: ${new Date().toLocaleDateString('en-IN')}   |   Filters: ${Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ') || 'None'}`,
    { align: 'center' }
  );
  doc.moveDown(0.5);
  doc.moveTo(40, doc.y).lineTo(800, doc.y).stroke();
  doc.moveDown(0.5);

  // ── Table header ───────────────────────────────────────────────────────────
  const colWidth = Math.floor(740 / headers.length);
  doc.font('Helvetica-Bold').fontSize(9);
  let x = 40;
  headers.forEach(h => {
    doc.text(h, x, doc.y, { width: colWidth, lineBreak: false });
    x += colWidth;
  });
  doc.moveDown(0.4);
  doc.moveTo(40, doc.y).lineTo(800, doc.y).stroke();
  doc.moveDown(0.3);

  // ── Rows ───────────────────────────────────────────────────────────────────
  doc.font('Helvetica').fontSize(8);
  rows.forEach((row, idx) => {
    if (doc.y > 520) {
      doc.addPage();
      doc.y = 40;
    }
    x = 40;
    const rowY = doc.y;
    row.forEach(cell => {
      doc.text(String(cell ?? '—'), x, rowY, { width: colWidth, lineBreak: false });
      x += colWidth;
    });
    doc.moveDown(0.5);
    if (idx % 2 === 0) {
      doc.rect(40, rowY - 2, 760, 14).fillOpacity(0.05).fill('#000').fillOpacity(1);
    }
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  doc.moveDown(1);
  doc.moveTo(40, doc.y).lineTo(800, doc.y).stroke();
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(10).text('Summary', 40);
  doc.font('Helvetica').fontSize(9);
  Object.entries(summary).forEach(([k, v]) => {
    if (typeof v !== 'object') {
      doc.text(`${k}: ${v}`, 40);
    }
  });

  // ── Footer ─────────────────────────────────────────────────────────────────
  const pages = doc.bufferedPageRange ? doc.bufferedPageRange() : { count: 1 };
  doc.fontSize(8).font('Helvetica').text(
    'Confidential — For Internal Use Only',
    40, 570, { align: 'center', width: 760 }
  );

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  res.download(filePath, filename);
}

const reportsController = {
  // GET /reports
  async index(req, res) {
    try {
      const now = new Date();
      res.render('pages/reports/index', {
        title: 'Reports & Analytics',
        currentMonth: now.getMonth() + 1,
        currentYear: now.getFullYear(),
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // GET /reports/attendance
  async attendance(req, res) {
    try {
      const filters = buildFilters(req.query);
      const { rows, summary } = await reportsService.getAttendanceReport(filters);
      const departments = await departmentService.getAllDepartments();
      const employees = await employeeService.getAllEmployees({ status: 'active' });
      res.render('pages/reports/attendance', {
        title: 'Attendance Report',
        rows, summary, filters, departments, employees,
        getMonthName,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/reports');
    }
  },

  // GET /reports/attendance/export
  async attendanceExport(req, res) {
    try {
      const filters = buildFilters(req.query);
      const { rows, summary } = await reportsService.getAttendanceReport(filters);
      const headers = ['Name', 'Code', 'Dept', 'Present', 'Absent', 'Late', 'On Leave', 'Half Day', 'Hours', 'Att%'];
      const tableRows = rows.map(r => [r.name, r.code, r.department, r.present, r.absent, r.late, r.onLeave, r.halfDay, r.totalHours, r.attendancePct + '%']);
      await generatePDF(res, 'attendance', 'Attendance Report', headers, tableRows, summary, filters);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/reports/attendance');
    }
  },

  // GET /reports/leave
  async leave(req, res) {
    try {
      const filters = buildFilters(req.query);
      const { rows, summary } = await reportsService.getLeaveReport(filters);
      const departments = await departmentService.getAllDepartments();
      const employees = await employeeService.getAllEmployees({ status: 'active' });
      res.render('pages/reports/leave', {
        title: 'Leave Report',
        rows, summary, filters, departments, employees,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/reports');
    }
  },

  // GET /reports/leave/export
  async leaveExport(req, res) {
    try {
      const filters = buildFilters(req.query);
      const { rows, summary } = await reportsService.getLeaveReport(filters);
      const headers = ['Name', 'Code', 'Dept', 'Casual', 'Sick', 'Earned', 'Unpaid', 'Total', 'Pending'];
      const tableRows = rows.map(r => [r.name, r.code, r.department, r.casual, r.sick, r.earned, r.unpaid, r.total, r.pending]);
      await generatePDF(res, 'leave', 'Leave Report', headers, tableRows, summary, filters);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/reports/leave');
    }
  },

  // GET /reports/payroll
  async payroll(req, res) {
    try {
      const filters = buildFilters(req.query);
      const { rows, summary } = await reportsService.getPayrollReport(filters);
      const departments = await departmentService.getAllDepartments();
      res.render('pages/reports/payroll', {
        title: 'Payroll Report',
        rows, summary, filters, departments,
        getMonthName,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/reports');
    }
  },

  // GET /reports/payroll/export
  async payrollExport(req, res) {
    try {
      const filters = buildFilters(req.query);
      const { rows, summary } = await reportsService.getPayrollReport(filters);
      const headers = ['Name', 'Code', 'Dept', 'Designation', 'Basic', 'Gross', 'PF', 'ESI', 'Tax', 'Deductions', 'Net Pay'];
      const tableRows = rows.map(r => [r.name, r.code, r.department, r.designation, r.basic, r.gross, r.pf, r.esi, r.tax, r.deductions, r.netPay]);
      await generatePDF(res, 'payroll', 'Payroll Report', headers, tableRows, summary, filters);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/reports/payroll');
    }
  },

  // GET /reports/performance
  async performance(req, res) {
    try {
      const filters = buildFilters(req.query);
      const { rows, summary } = await reportsService.getPerformanceReport(filters);
      const departments = await departmentService.getAllDepartments();
      const employees = await employeeService.getAllEmployees({ status: 'active' });
      res.render('pages/reports/performance', {
        title: 'Performance Report',
        rows, summary, filters, departments, employees,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/reports');
    }
  },

  // GET /reports/headcount
  async headcount(req, res) {
    try {
      const filters = buildFilters(req.query);
      const { summary } = await reportsService.getHeadcountReport(filters);
      const departments = await departmentService.getAllDepartments();
      res.render('pages/reports/headcount', {
        title: 'Headcount & Turnover Report',
        summary, filters, departments,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/reports');
    }
  },

  // GET /reports/headcount/export
  async headcountExport(req, res) {
    try {
      const filters = buildFilters(req.query);
      const { summary } = await reportsService.getHeadcountReport(filters);
      const headers = ['Metric', 'Value'];
      const tableRows = [
        ['Total Headcount', summary.totalHeadcount],
        ['Active Headcount', summary.activeHeadcount],
        ['New Joinings', summary.newJoinings],
        ['Exits', summary.exits],
        ['Turnover Rate', summary.turnoverRate + '%'],
        ['Avg Tenure (yrs)', summary.avgTenure],
      ];
      summary.deptBreakdown.forEach(d => tableRows.push([`Dept: ${d.dept}`, d.count]));
      await generatePDF(res, 'headcount', 'Headcount & Turnover Report', headers, tableRows, summary, filters);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/reports/headcount');
    }
  },
};

module.exports = reportsController;
