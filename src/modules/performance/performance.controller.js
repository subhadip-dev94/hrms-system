const performanceService = require('./performance.service');
const employeeService = require('../employee/employee.service');
const { validateKPI, validatePerformanceReview } = require('../../utils/validation.util');

const performanceController = {
  // GET /performance — my KPIs + latest review
  async index(req, res) {
    try {
      const employeeId = req.session.user.employeeId;
      const { kpis, kpiScore } = await performanceService.getMyKPIs(employeeId);
      const latestGrade = await performanceService.getLatestReviewGrade(employeeId);

      res.render('pages/performance/index', {
        title: 'My KPIs',
        kpis,
        kpiScore,
        latestGrade,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // GET /performance/create — assign KPI form
  async createForm(req, res) {
    try {
      const employees = await employeeService.getAllEmployees({ status: 'active' });
      res.render('pages/performance/create', {
        title: 'Assign KPI',
        employees,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/performance');
    }
  },

  // POST /performance — create KPI
  async create(req, res) {
    try {
      const validationErrors = validateKPI(req.body);
      if (validationErrors.length > 0) {
        const employees = await employeeService.getAllEmployees({ status: 'active' });
        return res.render('pages/performance/create', {
          title: 'Assign KPI',
          employees,
          errors: validationErrors,
          old: req.body,
        });
      }

      const assignedBy = req.session.user.employeeId;
      await performanceService.assignKPI(req.body, assignedBy);
      req.flash('success', 'KPI assigned successfully');
      res.redirect('/performance/team');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/performance/create');
    }
  },

  // GET /performance/:id/edit
  async editForm(req, res) {
    try {
      const kpi = await performanceService.getKPIById(req.params.id);
      const employees = await employeeService.getAllEmployees({ status: 'active' });
      res.render('pages/performance/edit', {
        title: 'Edit KPI',
        kpi,
        employees,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/performance/team');
    }
  },

  // PUT /performance/:id
  async update(req, res) {
    try {
      const validationErrors = validateKPI({
        ...req.body,
        employeeId: req.body.employeeId || 'placeholder', // id already set
      });
      if (validationErrors.length > 0) {
        const kpi = await performanceService.getKPIById(req.params.id);
        const employees = await employeeService.getAllEmployees({ status: 'active' });
        return res.render('pages/performance/edit', {
          title: 'Edit KPI',
          kpi,
          employees,
          errors: validationErrors,
          old: req.body,
        });
      }

      await performanceService.updateKPI(req.params.id, req.body);
      req.flash('success', 'KPI updated');
      res.redirect('/performance/team');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/performance/team');
    }
  },

  // PUT /performance/:id/progress — update progress value
  async updateProgress(req, res) {
    try {
      const updatedBy = req.session.user.employeeId;
      await performanceService.updateKPIProgress(
        req.params.id,
        req.body.currentValue,
        updatedBy,
        req.body.note
      );
      req.flash('success', 'KPI progress updated');
      res.redirect(req.get('Referer') || '/performance');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/performance');
    }
  },

  // DELETE /performance/:id — cancel KPI
  async cancel(req, res) {
    try {
      await performanceService.cancelKPI(req.params.id);
      req.flash('success', 'KPI cancelled');
      res.redirect('/performance/team');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/performance/team');
    }
  },

  // GET /performance/review/new — submit review form
  async reviewForm(req, res) {
    try {
      const managerId = req.session.user.employeeId;
      // Managers see only their team; hr/admin see all
      const role = req.session.user.role;
      let employees;
      if (role === 'admin' || role === 'hr') {
        employees = await employeeService.getAllEmployees({ status: 'active' });
      } else {
        employees = await employeeService.getAllEmployees({ status: 'active' });
        // Filter to direct reports — managerId matches logged-in user's employeeId
        const Employee = require('../employee/employee.model');
        const directReports = await Employee.find({ managerId, status: 'active' }).lean();
        const drIds = new Set(directReports.map((e) => String(e._id)));
        employees = employees.filter((e) => drIds.has(String(e._id)));
      }

      res.render('pages/performance/review', {
        title: 'Submit Performance Review',
        employees,
        prefillEmployeeId: req.query.employeeId || '',
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/performance/team');
    }
  },

  // POST /performance/review — submit review
  async submitReview(req, res) {
    try {
      // Rebuild nested ratings from flat form fields
      const ratings = {
        productivity: req.body['ratings[productivity]'] || req.body.productivity,
        quality: req.body['ratings[quality]'] || req.body.quality,
        communication: req.body['ratings[communication]'] || req.body.communication,
        teamwork: req.body['ratings[teamwork]'] || req.body.teamwork,
        leadership: req.body['ratings[leadership]'] || req.body.leadership,
        technical: req.body['ratings[technical]'] || req.body.technical,
      };

      const payload = { ...req.body, ratings };
      const validationErrors = validatePerformanceReview(payload);

      if (validationErrors.length > 0) {
        const employees = await employeeService.getAllEmployees({ status: 'active' });
        return res.render('pages/performance/review', {
          title: 'Submit Performance Review',
          employees,
          errors: validationErrors,
          old: req.body,
          prefillEmployeeId: req.body.employeeId || '',
        });
      }

      const reviewerId = req.session.user.employeeId;
      await performanceService.submitReview(payload, reviewerId);
      req.flash('success', 'Performance review submitted');
      res.redirect('/performance/team');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/performance/review/new');
    }
  },

  // GET /performance/review/:id
  async viewReview(req, res) {
    try {
      const review = await performanceService.getReviewById(req.params.id);
      res.render('pages/performance/my-reviews', {
        title: `Review — ${review.reviewPeriod}`,
        reviews: [review],
        singleView: true,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/performance/my-reviews');
    }
  },

  // PUT /performance/review/:id/acknowledge
  async acknowledgeReview(req, res) {
    try {
      const employeeId = req.session.user.employeeId;
      await performanceService.acknowledgeReview(req.params.id, employeeId);
      req.flash('success', 'Review acknowledged');
      res.redirect('/performance/my-reviews');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/performance/my-reviews');
    }
  },

  // GET /performance/my-reviews
  async myReviews(req, res) {
    try {
      const employeeId = req.session.user.employeeId;
      const reviews = await performanceService.getMyReviews(employeeId);
      res.render('pages/performance/my-reviews', {
        title: 'My Reviews',
        reviews,
        singleView: false,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // GET /performance/team — manager team overview
  async team(req, res) {
    try {
      const managerId = req.session.user.employeeId;
      const teamData = await performanceService.getTeamPerformance(managerId);
      res.render('pages/performance/team', {
        title: 'Team Performance',
        teamData,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/performance');
    }
  },
};

module.exports = performanceController;
