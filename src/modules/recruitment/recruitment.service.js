const Job = require('./job.model');
const Candidate = require('./candidate.model');
const { generateJobCode, canTransitionStage } = require('../../utils/helper.util');
const {
  sendJobApplicationEmail,
  sendInterviewScheduledEmail,
  sendOfferLetterEmail,
} = require('../../utils/email.util');
const errors = require('../../utils/errorCodes.util');

const recruitmentService = {
  // ─── List all jobs ─────────────────────────────────────────────────────────
  async getAllJobs(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.departmentId) query.departmentId = filters.departmentId;

    const jobs = await Job.find(query)
      .populate('departmentId', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    // Attach candidate counts
    const jobIds = jobs.map((j) => j._id);
    const counts = await Candidate.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      { $group: { _id: '$jobId', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach((c) => { countMap[String(c._id)] = c.count; });
    return jobs.map((j) => ({ ...j, candidateCount: countMap[String(j._id)] || 0 }));
  },

  // ─── Get job by id ─────────────────────────────────────────────────────────
  async getJobById(id) {
    const job = await Job.findById(id)
      .populate('departmentId', 'name')
      .populate('createdBy', 'firstName lastName')
      .lean();
    if (!job) throw new Error(errors.JOB_NOT_FOUND);
    return job;
  },

  // ─── Get job with its candidates ──────────────────────────────────────────
  async getJobDetail(id) {
    const job = await recruitmentService.getJobById(id);
    const candidates = await Candidate.find({ jobId: id })
      .sort({ createdAt: -1 })
      .lean();
    return { job, candidates };
  },

  // ─── Create job posting ────────────────────────────────────────────────────
  async createJob(data, createdBy) {
    const jobCode = await generateJobCode(Job);
    if (!data.departmentId) delete data.departmentId;

    return await Job.create({
      jobCode,
      title: data.title.trim(),
      departmentId: data.departmentId || undefined,
      jobType: data.jobType,
      experienceMin: parseFloat(data.experienceMin) || 0,
      experienceMax: parseFloat(data.experienceMax) || 0,
      salaryMin: data.salaryMin ? parseFloat(data.salaryMin) : undefined,
      salaryMax: data.salaryMax ? parseFloat(data.salaryMax) : undefined,
      location: data.location ? data.location.trim() : '',
      description: data.description.trim(),
      requirements: data.requirements ? data.requirements.trim() : '',
      applicationDeadline: data.applicationDeadline ? new Date(data.applicationDeadline) : undefined,
      totalPositions: parseInt(data.totalPositions, 10) || 1,
      status: 'draft',
      createdBy,
    });
  },

  // ─── Update job ────────────────────────────────────────────────────────────
  async updateJob(id, data) {
    if (!data.departmentId) data.departmentId = null;
    const job = await Job.findByIdAndUpdate(
      id,
      {
        title: data.title,
        departmentId: data.departmentId || undefined,
        jobType: data.jobType,
        experienceMin: parseFloat(data.experienceMin) || 0,
        experienceMax: parseFloat(data.experienceMax) || 0,
        salaryMin: data.salaryMin ? parseFloat(data.salaryMin) : undefined,
        salaryMax: data.salaryMax ? parseFloat(data.salaryMax) : undefined,
        location: data.location,
        description: data.description,
        requirements: data.requirements,
        applicationDeadline: data.applicationDeadline ? new Date(data.applicationDeadline) : undefined,
        totalPositions: parseInt(data.totalPositions, 10) || 1,
      },
      { new: true, runValidators: true }
    );
    if (!job) throw new Error(errors.JOB_NOT_FOUND);
    return job;
  },

  // ─── Update job status ─────────────────────────────────────────────────────
  async updateJobStatus(id, status) {
    const job = await Job.findByIdAndUpdate(id, { status }, { new: true });
    if (!job) throw new Error(errors.JOB_NOT_FOUND);
    return job;
  },

  // ─── Add candidate ─────────────────────────────────────────────────────────
  async addCandidate(jobId, data, resumeFile) {
    const job = await Job.findById(jobId).lean();
    if (!job) throw new Error(errors.JOB_NOT_FOUND);
    if (job.status !== 'open') throw new Error(errors.JOB_CLOSED);

    // Duplicate check
    const existing = await Candidate.findOne({ jobId, email: data.email.toLowerCase() });
    if (existing) throw new Error(errors.CANDIDATE_ALREADY_EXISTS);

    const candidate = await Candidate.create({
      jobId,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      totalExperience: parseFloat(data.totalExperience) || 0,
      currentCompany: data.currentCompany ? data.currentCompany.trim() : '',
      currentSalary: data.currentSalary ? parseFloat(data.currentSalary) : undefined,
      expectedSalary: data.expectedSalary ? parseFloat(data.expectedSalary) : undefined,
      noticePeriod: parseInt(data.noticePeriod, 10) || 0,
      resumeUrl:  resumeFile ? resumeFile.path     : '',
      resumeId:   resumeFile ? resumeFile.filename : '',
      source: data.source || 'direct',
      stage: 'applied',
      stageHistory: [{
        stage: 'applied',
        changedAt: new Date(),
        note: 'Application received',
      }],
    });

    // Email confirmation (non-blocking)
    sendJobApplicationEmail(
      data.email,
      `${data.firstName} ${data.lastName}`,
      job.title
    );

    return candidate;
  },

  // ─── Get candidate by id ──────────────────────────────────────────────────
  async getCandidateById(id) {
    const candidate = await Candidate.findById(id)
      .populate('jobId', 'title jobCode')
      .populate('stageHistory.changedBy', 'firstName lastName')
      .populate('convertedEmployeeId', 'firstName lastName employeeCode')
      .lean();
    if (!candidate) throw new Error(errors.CANDIDATE_NOT_FOUND);
    return candidate;
  },

  // ─── Move candidate to a new stage ────────────────────────────────────────
  async moveCandidateStage(candidateId, newStage, changedBy, note) {
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) throw new Error(errors.CANDIDATE_NOT_FOUND);

    if (!canTransitionStage(candidate.stage, newStage)) {
      throw new Error(errors.INVALID_STAGE);
    }

    candidate.stage = newStage;
    candidate.stageHistory.push({
      stage: newStage,
      changedAt: new Date(),
      changedBy,
      note: note || '',
    });

    return await candidate.save();
  },

  // ─── Schedule interview ────────────────────────────────────────────────────
  async scheduleInterview(candidateId, interviewData, changedBy) {
    const candidate = await Candidate.findById(candidateId)
      .populate('jobId', 'title')
      .lean();
    if (!candidate) throw new Error(errors.CANDIDATE_NOT_FOUND);

    await Candidate.findByIdAndUpdate(candidateId, {
      $push: {
        interviews: {
          scheduledAt: new Date(interviewData.scheduledAt),
          mode: interviewData.mode,
          interviewers: interviewData.interviewers
            ? [].concat(interviewData.interviewers)
            : [],
          feedback: '',
          result: null,
        },
      },
    });

    // Send email (non-blocking)
    sendInterviewScheduledEmail(
      candidate.email,
      `${candidate.firstName} ${candidate.lastName}`,
      candidate.jobId ? candidate.jobId.title : '',
      interviewData.scheduledAt,
      interviewData.mode
    );

    return true;
  },

  // ─── Send offer ────────────────────────────────────────────────────────────
  async sendOffer(candidateId, offerData, changedBy) {
    const candidate = await Candidate.findById(candidateId)
      .populate('jobId', 'title')
      .lean();
    if (!candidate) throw new Error(errors.CANDIDATE_NOT_FOUND);

    await Candidate.findByIdAndUpdate(candidateId, {
      stage: 'offer',
      offerDetails: {
        offeredSalary: parseFloat(offerData.offeredSalary) || 0,
        joiningDate: offerData.joiningDate ? new Date(offerData.joiningDate) : undefined,
        offerSentAt: new Date(),
      },
      $push: {
        stageHistory: {
          stage: 'offer',
          changedAt: new Date(),
          changedBy,
          note: 'Offer sent',
        },
      },
    });

    // Send offer letter email (non-blocking)
    sendOfferLetterEmail(
      candidate.email,
      `${candidate.firstName} ${candidate.lastName}`,
      candidate.jobId ? candidate.jobId.title : '',
      offerData.offeredSalary,
      offerData.joiningDate
    );

    return true;
  },

  // ─── Convert candidate to employee ────────────────────────────────────────
  async convertToEmployee(candidateId, employeeData, changedBy) {
    const candidate = await Candidate.findById(candidateId)
      .populate('jobId', 'title totalPositions filledPositions')
      .lean();
    if (!candidate) throw new Error(errors.CANDIDATE_NOT_FOUND);
    if (candidate.stage !== 'offer-accepted') {
      throw new Error(errors.CONVERT_NOT_ELIGIBLE);
    }

    // Use employee service to create record + user + leave balance
    const employeeService = require('../employee/employee.service');
    const newEmployee = await employeeService.createEmployee({
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
      joiningDate: candidate.offerDetails && candidate.offerDetails.joiningDate
        ? candidate.offerDetails.joiningDate
        : new Date(),
      role: employeeData.role || 'employee',
      designation: employeeData.designation || (candidate.jobId ? candidate.jobId.title : ''),
      departmentId: employeeData.departmentId || undefined,
      status: 'active',
      ...employeeData,
    }, null);

    // Update candidate record
    await Candidate.findByIdAndUpdate(candidateId, {
      stage: 'joined',
      isConverted: true,
      convertedEmployeeId: newEmployee._id,
      $push: {
        stageHistory: {
          stage: 'joined',
          changedAt: new Date(),
          changedBy,
          note: 'Converted to employee',
        },
      },
    });

    // Increment filledPositions on the job
    const job = await Job.findById(candidate.jobId._id || candidate.jobId);
    if (job) {
      job.filledPositions = (job.filledPositions || 0) + 1;
      if (job.filledPositions >= job.totalPositions) {
        job.status = 'closed';
      }
      await job.save();
    }

    return newEmployee;
  },

  // ─── Dashboard: open jobs count ───────────────────────────────────────────
  async getOpenJobsCount() {
    return await Job.countDocuments({ status: 'open' });
  },
};

module.exports = recruitmentService;
