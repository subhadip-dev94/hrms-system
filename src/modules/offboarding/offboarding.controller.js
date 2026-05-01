const offboardingService = require('./offboarding.service');
const employeeService = require('../employee/employee.service');
const { validateOffboarding } = require('../../utils/validation.util');

const EXIT_TYPES = ['resignation', 'termination', 'retirement', 'contract-end', 'absconding', 'other'];

const offboardingController = {
  // GET /offboarding
  async index(req, res) {
    try {
      const filters = {
        status: req.query.status || '',
        exitType: req.query.exitType || '',
        dateFrom: req.query.dateFrom || '',
        dateTo: req.query.dateTo || '',
      };
      const offboardings = await offboardingService.getAllOffboarding(filters);
      res.render('pages/offboarding/index', {
        title: 'Offboarding',
        offboardings,
        filters,
        exitTypes: EXIT_TYPES,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // GET /offboarding/create
  async createForm(req, res) {
    try {
      const employees = await employeeService.getAllEmployees({ status: 'active' });
      res.render('pages/offboarding/create', {
        title: 'Initiate Offboarding',
        employees,
        exitTypes: EXIT_TYPES,
        preselected: req.query.employeeId || '',
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/offboarding');
    }
  },

  // POST /offboarding
  async create(req, res) {
    try {
      const validationErrors = validateOffboarding(req.body);
      if (validationErrors.length > 0) {
        const employees = await employeeService.getAllEmployees({ status: 'active' });
        return res.render('pages/offboarding/create', {
          title: 'Initiate Offboarding',
          employees,
          exitTypes: EXIT_TYPES,
          preselected: req.body.employeeId || '',
          errors: validationErrors,
          old: req.body,
        });
      }
      const offboarding = await offboardingService.initiateOffboarding(
        req.body,
        req.session.user.employeeId
      );
      req.flash('success', 'Offboarding initiated successfully');
      res.redirect(`/offboarding/${offboarding._id}`);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/offboarding/create');
    }
  },

  // GET /offboarding/:id
  async detail(req, res) {
    try {
      const offboarding = await offboardingService.getOffboardingById(req.params.id);
      const employees = await employeeService.getAllEmployees({ status: 'active' });
      const completedCount = offboarding.checklist.filter(c => c.isCompleted).length;
      res.render('pages/offboarding/detail', {
        title: `Offboarding — ${offboarding.employeeId ? offboarding.employeeId.firstName : ''}`,
        offboarding,
        employees,
        completedCount,
        totalItems: offboarding.checklist.length,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/offboarding');
    }
  },

  // PUT /offboarding/:id/checklist/:itemIndex
  async markChecklist(req, res) {
    try {
      await offboardingService.markChecklistItem(
        req.params.id,
        parseInt(req.params.itemIndex, 10),
        req.session.user.employeeId,
        req.body.notes
      );
      res.redirect(`/offboarding/${req.params.id}`);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/offboarding/${req.params.id}`);
    }
  },

  // PUT /offboarding/:id/checklist/:itemIndex/unmark
  async unmarkChecklist(req, res) {
    try {
      await offboardingService.unmarkChecklistItem(
        req.params.id,
        parseInt(req.params.itemIndex, 10)
      );
      res.redirect(`/offboarding/${req.params.id}`);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/offboarding/${req.params.id}`);
    }
  },

  // PUT /offboarding/:id/interview
  async saveInterview(req, res) {
    try {
      await offboardingService.saveExitInterview(req.params.id, req.body);
      req.flash('success', 'Exit interview saved');
      res.redirect(`/offboarding/${req.params.id}`);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/offboarding/${req.params.id}`);
    }
  },

  // PUT /offboarding/:id/settlement
  async saveSettlement(req, res) {
    try {
      await offboardingService.saveSettlement(
        req.params.id,
        req.body,
        req.session.user.employeeId
      );
      req.flash('success', 'Settlement details saved');
      res.redirect(`/offboarding/${req.params.id}`);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/offboarding/${req.params.id}`);
    }
  },

  // PUT /offboarding/:id/complete
  async complete(req, res) {
    try {
      await offboardingService.completeOffboarding(req.params.id, req.session.user.employeeId);
      req.flash('success', 'Offboarding completed. Employee account has been deactivated.');
      res.redirect('/offboarding');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/offboarding/${req.params.id}`);
    }
  },

  // PUT /offboarding/:id/cancel
  async cancel(req, res) {
    try {
      await offboardingService.cancelOffboarding(req.params.id);
      req.flash('success', 'Offboarding cancelled. Employee status reverted to active.');
      res.redirect('/offboarding');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/offboarding/${req.params.id}`);
    }
  },
};

module.exports = offboardingController;
