const recruitmentService = require('./recruitment.service');
const departmentService = require('../department/department.service');
const employeeService = require('../employee/employee.service');
const { validateJobPosting, validateCandidate } = require('../../utils/validation.util');
const { getRecruitmentStages } = require('../../utils/helper.util');

const recruitmentController = {
  // GET /recruitment
  async index(req, res) {
    try {
      const filters = {
        status: req.query.status || '',
        departmentId: req.query.departmentId || '',
      };
      const jobs = await recruitmentService.getAllJobs(filters);
      const departments = await departmentService.getAllDepartments();
      res.render('pages/recruitment/index', {
        title: 'Job Postings',
        jobs,
        departments,
        filters,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // GET /recruitment/create
  async createForm(req, res) {
    try {
      const departments = await departmentService.getAllDepartments();
      res.render('pages/recruitment/create', { title: 'Create Job Posting', departments });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/recruitment');
    }
  },

  // POST /recruitment
  async create(req, res) {
    try {
      const validationErrors = validateJobPosting(req.body);
      if (validationErrors.length > 0) {
        const departments = await departmentService.getAllDepartments();
        return res.render('pages/recruitment/create', {
          title: 'Create Job Posting',
          departments,
          errors: validationErrors,
          old: req.body,
        });
      }
      const createdBy = req.session.user.employeeId;
      const job = await recruitmentService.createJob(req.body, createdBy);
      req.flash('success', `Job posting ${job.jobCode} created`);
      res.redirect('/recruitment');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/recruitment/create');
    }
  },

  // GET /recruitment/:id
  async detail(req, res) {
    try {
      const { job, candidates } = await recruitmentService.getJobDetail(req.params.id);
      const stages = getRecruitmentStages();
      res.render('pages/recruitment/detail', {
        title: `${job.jobCode} — ${job.title}`,
        job,
        candidates,
        stages,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/recruitment');
    }
  },

  // GET /recruitment/:id/edit
  async editForm(req, res) {
    try {
      const job = await recruitmentService.getJobById(req.params.id);
      const departments = await departmentService.getAllDepartments();
      res.render('pages/recruitment/edit', { title: 'Edit Job Posting', job, departments });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/recruitment');
    }
  },

  // PUT /recruitment/:id
  async update(req, res) {
    try {
      const validationErrors = validateJobPosting(req.body);
      if (validationErrors.length > 0) {
        const job = await recruitmentService.getJobById(req.params.id);
        const departments = await departmentService.getAllDepartments();
        return res.render('pages/recruitment/edit', {
          title: 'Edit Job Posting',
          job,
          departments,
          errors: validationErrors,
          old: req.body,
        });
      }
      await recruitmentService.updateJob(req.params.id, req.body);
      req.flash('success', 'Job posting updated');
      res.redirect(`/recruitment/${req.params.id}`);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/recruitment/${req.params.id}/edit`);
    }
  },

  // PUT /recruitment/:id/status
  async updateStatus(req, res) {
    try {
      await recruitmentService.updateJobStatus(req.params.id, req.body.status);
      req.flash('success', `Job status updated to ${req.body.status}`);
      res.redirect(`/recruitment/${req.params.id}`);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/recruitment');
    }
  },

  // POST /recruitment/:id/candidate
  async addCandidate(req, res) {
    try {
      const payload = { ...req.body, jobId: req.params.id };
      const validationErrors = validateCandidate(payload);
      if (validationErrors.length > 0) {
        const { job, candidates } = await recruitmentService.getJobDetail(req.params.id);
        return res.render('pages/recruitment/detail', {
          title: `${job.jobCode} — ${job.title}`,
          job,
          candidates,
          stages: getRecruitmentStages(),
          errors: validationErrors,
          oldCandidate: req.body,
        });
      }
      await recruitmentService.addCandidate(req.params.id, req.body, req.file);
      req.flash('success', 'Candidate added successfully');
      res.redirect(`/recruitment/${req.params.id}`);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/recruitment/${req.params.id}`);
    }
  },

  // GET /recruitment/candidate/:id
  async candidateDetail(req, res) {
    try {
      const candidate = await recruitmentService.getCandidateById(req.params.id);
      const stages = getRecruitmentStages();
      const employees = await employeeService.getAllEmployees({ status: 'active' });
      res.render('pages/recruitment/candidate', {
        title: `${candidate.firstName} ${candidate.lastName}`,
        candidate,
        stages,
        employees,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/recruitment');
    }
  },

  // PUT /recruitment/candidate/:id/stage
  async moveStage(req, res) {
    try {
      const changedBy = req.session.user.employeeId;
      await recruitmentService.moveCandidateStage(
        req.params.id,
        req.body.stage,
        changedBy,
        req.body.note
      );
      req.flash('success', `Stage updated to ${req.body.stage}`);
      res.redirect(`/recruitment/candidate/${req.params.id}`);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/recruitment/candidate/${req.params.id}`);
    }
  },

  // POST /recruitment/candidate/:id/interview
  async scheduleInterview(req, res) {
    try {
      const changedBy = req.session.user.employeeId;
      await recruitmentService.scheduleInterview(req.params.id, req.body, changedBy);
      req.flash('success', 'Interview scheduled');
      res.redirect(`/recruitment/candidate/${req.params.id}`);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/recruitment/candidate/${req.params.id}`);
    }
  },

  // PUT /recruitment/candidate/:id/offer
  async sendOffer(req, res) {
    try {
      const changedBy = req.session.user.employeeId;
      await recruitmentService.sendOffer(req.params.id, req.body, changedBy);
      req.flash('success', 'Offer details sent');
      res.redirect(`/recruitment/candidate/${req.params.id}`);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/recruitment/candidate/${req.params.id}`);
    }
  },

  // GET /recruitment/candidate/:id/convert
  async convertForm(req, res) {
    try {
      const candidate = await recruitmentService.getCandidateById(req.params.id);
      const departments = await departmentService.getAllDepartments();
      const employees = await employeeService.getAllEmployees({ status: 'active' });
      res.render('pages/recruitment/convert', {
        title: 'Convert to Employee',
        candidate,
        departments,
        employees,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/recruitment/candidate/${req.params.id}`);
    }
  },

  // POST /recruitment/candidate/:id/convert
  async convert(req, res) {
    try {
      const changedBy = req.session.user.employeeId;
      const employee = await recruitmentService.convertToEmployee(
        req.params.id,
        req.body,
        changedBy
      );
      req.flash('success', `Candidate converted to employee ${employee.employeeCode}`);
      res.redirect('/recruitment');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect(`/recruitment/candidate/${req.params.id}`);
    }
  },
};

module.exports = recruitmentController;
