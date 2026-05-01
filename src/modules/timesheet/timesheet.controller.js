const timesheetService = require('./timesheet.service');
const employeeService = require('../employee/employee.service');
const { validateTimesheetEntry } = require('../../utils/validation.util');
const { getWeekRange } = require('../../utils/helper.util');

const timesheetController = {
  // GET /timesheet — my weekly view
  async index(req, res) {
    try {
      const employeeId = req.session.user.employeeId;
      const weekParam = req.query.week; // ISO date string for any day of desired week
      const data = await timesheetService.getMyTimesheet(employeeId, weekParam || new Date());

      // Prev / next week navigation
      const prevWeekDate = new Date(data.weekStart);
      prevWeekDate.setDate(prevWeekDate.getDate() - 7);
      const nextWeekDate = new Date(data.weekStart);
      nextWeekDate.setDate(nextWeekDate.getDate() + 7);

      res.render('pages/timesheet/index', {
        title: 'My Timesheet',
        ...data,
        prevWeek: prevWeekDate.toISOString().split('T')[0],
        nextWeek: nextWeekDate.toISOString().split('T')[0],
        today: new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // GET /timesheet/log — log work form
  async logForm(req, res) {
    try {
      const today = req.query.date || new Date().toISOString().split('T')[0];
      res.render('pages/timesheet/log', {
        title: 'Log Work',
        defaultDate: today,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/timesheet');
    }
  },

  // POST /timesheet — save new entry
  async log(req, res) {
    try {
      const employeeId = req.session.user.employeeId;
      const payload = { ...req.body, employeeId };

      const validationErrors = validateTimesheetEntry(payload);
      if (validationErrors.length > 0) {
        return res.render('pages/timesheet/log', {
          title: 'Log Work',
          defaultDate: req.body.date || new Date().toISOString().split('T')[0],
          errors: validationErrors,
          old: req.body,
        });
      }

      await timesheetService.logWork(employeeId, req.body);
      req.flash('success', 'Work logged successfully');

      // Return to the week containing the logged date
      const { weekStart } = getWeekRange(req.body.date);
      res.redirect(`/timesheet?week=${weekStart.toISOString().split('T')[0]}`);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/timesheet/log');
    }
  },

  // GET /timesheet/:id/edit
  async editForm(req, res) {
    try {
      const entry = await timesheetService.getEntryById(req.params.id);
      const employeeId = req.session.user.employeeId;

      if (String(entry.employeeId._id) !== String(employeeId)) {
        req.flash('error', 'You can only edit your own entries');
        return res.redirect('/timesheet');
      }
      if (entry.status !== 'draft' || entry.isLocked) {
        req.flash('error', 'Only draft, unlocked entries can be edited');
        return res.redirect('/timesheet');
      }

      res.render('pages/timesheet/edit', { title: 'Edit Entry', entry });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/timesheet');
    }
  },

  // PUT /timesheet/:id
  async update(req, res) {
    try {
      const employeeId = req.session.user.employeeId;
      const payload = { ...req.body, employeeId, date: req.body.date };

      const validationErrors = validateTimesheetEntry(payload);
      if (validationErrors.length > 0) {
        const entry = await timesheetService.getEntryById(req.params.id);
        return res.render('pages/timesheet/edit', {
          title: 'Edit Entry',
          entry,
          errors: validationErrors,
          old: req.body,
        });
      }

      await timesheetService.updateEntry(req.params.id, employeeId, req.body);
      req.flash('success', 'Entry updated');
      res.redirect('/timesheet');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/timesheet');
    }
  },

  // DELETE /timesheet/:id
  async remove(req, res) {
    try {
      const employeeId = req.session.user.employeeId;
      await timesheetService.deleteEntry(req.params.id, employeeId);
      req.flash('success', 'Entry deleted');
      res.redirect('/timesheet');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/timesheet');
    }
  },

  // PUT /timesheet/:id/submit
  async submit(req, res) {
    try {
      const employeeId = req.session.user.employeeId;
      await timesheetService.submitEntry(req.params.id, employeeId);
      req.flash('success', 'Entry submitted for approval');
      res.redirect('/timesheet');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/timesheet');
    }
  },

  // GET /timesheet/report
  async report(req, res) {
    try {
      const employees = await employeeService.getAllEmployees({ status: 'active' });
      const filters = {
        employeeId: req.query.employeeId || '',
        projectName: req.query.projectName || '',
        workType: req.query.workType || '',
        status: req.query.status || '',
        dateFrom: req.query.dateFrom || '',
        dateTo: req.query.dateTo || '',
      };

      // Only fetch results if a filter was applied
      let result = null;
      if (Object.values(filters).some((v) => v !== '')) {
        result = await timesheetService.getTimesheetReport(filters);
      }

      res.render('pages/timesheet/report', {
        title: 'Timesheet Report',
        employees,
        filters,
        result,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // PUT /timesheet/:id/approve
  async approve(req, res) {
    try {
      const managerId = req.session.user.employeeId;
      await timesheetService.approveEntry(req.params.id, managerId);
      req.flash('success', 'Timesheet entry approved');
      res.redirect(req.get('Referer') || '/timesheet/report');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/timesheet/report');
    }
  },

  // PUT /timesheet/:id/reject
  async reject(req, res) {
    try {
      const managerId = req.session.user.employeeId;
      await timesheetService.rejectEntry(req.params.id, managerId, req.body.comment);
      req.flash('success', 'Timesheet entry rejected');
      res.redirect(req.get('Referer') || '/timesheet/report');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/timesheet/report');
    }
  },
};

module.exports = timesheetController;
