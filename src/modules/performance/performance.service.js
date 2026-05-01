const KPI = require('./kpi.model');
const Review = require('./review.model');
const Employee = require('../employee/employee.model');
const {
  calculateKPIProgress,
  getPerformanceGrade,
  getQuarter,
  roundToTwo,
} = require('../../utils/helper.util');
const {
  sendKPIAssignedEmail,
  sendReviewSubmittedEmail,
} = require('../../utils/email.util');
const errors = require('../../utils/errorCodes.util');

// ─── Weighted KPI score (0–100) from an array of KPI docs ─────────────────
function computeKPIScore(kpis) {
  const active = kpis.filter((k) => k.status !== 'cancelled');
  if (active.length === 0) return 0;

  let totalWeight = 0;
  let weightedProgress = 0;
  active.forEach((kpi) => {
    const progress = calculateKPIProgress(kpi.currentValue, kpi.targetValue);
    const w = kpi.weightage || 10;
    weightedProgress += progress * w;
    totalWeight += w;
  });
  return totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;
}

// ─── Average of all non-null rating fields ─────────────────────────────────
function computeAverageRating(ratings) {
  const fields = ['productivity', 'quality', 'communication', 'teamwork', 'leadership', 'technical'];
  const values = fields
    .map((f) => (ratings[f] !== undefined && ratings[f] !== '' ? parseFloat(ratings[f]) : null))
    .filter((v) => v !== null && !isNaN(v));
  if (values.length === 0) return 0;
  return roundToTwo(values.reduce((a, b) => a + b, 0) / values.length);
}

const performanceService = {
  // ─── My KPIs + overall KPI score ─────────────────────────────────────────
  async getMyKPIs(employeeId) {
    const kpis = await KPI.find({ employeeId, status: { $ne: 'cancelled' } })
      .populate('assignedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    const kpiScore = computeKPIScore(kpis);

    const kpisWithProgress = kpis.map((k) => ({
      ...k,
      progress: calculateKPIProgress(k.currentValue, k.targetValue),
    }));

    return { kpis: kpisWithProgress, kpiScore };
  },

  // ─── KPI summary for dashboard ────────────────────────────────────────────
  async getMyKPISummary(employeeId) {
    if (!employeeId) return null;
    const kpis = await KPI.find({ employeeId, status: 'active' }).lean();
    if (kpis.length === 0) return null;
    const kpiScore = computeKPIScore(kpis);
    return { activeCount: kpis.length, kpiScore };
  },

  // ─── Latest review grade for dashboard ───────────────────────────────────
  async getLatestReviewGrade(employeeId) {
    if (!employeeId) return null;
    const review = await Review.findOne({ employeeId, status: { $ne: 'draft' } })
      .sort({ createdAt: -1 })
      .lean();
    return review ? { grade: review.grade, period: review.reviewPeriod } : null;
  },

  // ─── Assign a new KPI ─────────────────────────────────────────────────────
  async assignKPI(data, assignedBy) {
    const quarter = getQuarter(data.periodStart);
    const year = new Date(data.periodStart).getFullYear();

    const kpi = await KPI.create({
      employeeId: data.employeeId,
      assignedBy,
      title: data.title.trim(),
      description: data.description ? data.description.trim() : '',
      category: data.category || 'other',
      targetValue: parseFloat(data.targetValue),
      currentValue: parseFloat(data.currentValue) || 0,
      unit: data.unit,
      weightage: parseInt(data.weightage, 10) || 10,
      periodStart: new Date(data.periodStart),
      periodEnd: new Date(data.periodEnd),
      quarter,
      year,
      status: 'active',
    });

    // Email notification (non-blocking)
    const employee = await Employee.findById(data.employeeId).lean();
    if (employee) {
      sendKPIAssignedEmail(
        employee.email,
        `${employee.firstName} ${employee.lastName}`,
        kpi.title,
        new Date(kpi.periodStart).toLocaleDateString('en-IN'),
        new Date(kpi.periodEnd).toLocaleDateString('en-IN')
      );
    }

    return kpi;
  },

  // ─── Get single KPI ───────────────────────────────────────────────────────
  async getKPIById(id) {
    const kpi = await KPI.findById(id)
      .populate('employeeId', 'firstName lastName employeeCode')
      .populate('assignedBy', 'firstName lastName')
      .lean();
    if (!kpi) throw new Error(errors.KPI_NOT_FOUND);
    return kpi;
  },

  // ─── Update KPI ───────────────────────────────────────────────────────────
  async updateKPI(id, data) {
    const kpi = await KPI.findById(id);
    if (!kpi) throw new Error(errors.KPI_NOT_FOUND);

    if (data.periodStart && data.periodEnd) {
      if (new Date(data.periodEnd) <= new Date(data.periodStart)) {
        throw new Error(errors.KPI_PERIOD_INVALID);
      }
    }

    kpi.title = data.title ? data.title.trim() : kpi.title;
    kpi.description = data.description ? data.description.trim() : kpi.description;
    kpi.category = data.category || kpi.category;
    kpi.targetValue = data.targetValue ? parseFloat(data.targetValue) : kpi.targetValue;
    kpi.unit = data.unit || kpi.unit;
    kpi.weightage = data.weightage ? parseInt(data.weightage, 10) : kpi.weightage;
    if (data.periodStart) {
      kpi.periodStart = new Date(data.periodStart);
      kpi.quarter = getQuarter(data.periodStart);
      kpi.year = new Date(data.periodStart).getFullYear();
    }
    if (data.periodEnd) kpi.periodEnd = new Date(data.periodEnd);

    return await kpi.save();
  },

  // ─── Update KPI progress ──────────────────────────────────────────────────
  async updateKPIProgress(id, value, updatedBy, note) {
    const kpi = await KPI.findById(id);
    if (!kpi) throw new Error(errors.KPI_NOT_FOUND);

    kpi.currentValue = parseFloat(value);
    kpi.progressHistory.push({
      value: kpi.currentValue,
      updatedAt: new Date(),
      updatedBy,
      note: note || '',
    });

    // Auto-complete if target reached
    if (kpi.currentValue >= kpi.targetValue) {
      kpi.status = 'completed';
    }

    return await kpi.save();
  },

  // ─── Cancel KPI ───────────────────────────────────────────────────────────
  async cancelKPI(id) {
    const kpi = await KPI.findById(id);
    if (!kpi) throw new Error(errors.KPI_NOT_FOUND);
    kpi.status = 'cancelled';
    return await kpi.save();
  },

  // ─── Submit a performance review ─────────────────────────────────────────
  async submitReview(data, reviewerId) {
    if (String(data.employeeId) === String(reviewerId)) {
      throw new Error(errors.CANNOT_REVIEW_SELF);
    }

    // Block duplicate for same period
    const existing = await Review.findOne({
      employeeId: data.employeeId,
      reviewerId,
      reviewPeriod: data.reviewPeriod,
    });
    if (existing) throw new Error(errors.REVIEW_ALREADY_SUBMITTED);

    // Build ratings object — only include non-empty fields
    const ratingFields = ['productivity', 'quality', 'communication', 'teamwork', 'leadership', 'technical'];
    const ratings = {};
    ratingFields.forEach((f) => {
      if (data.ratings && data.ratings[f] !== undefined && data.ratings[f] !== '') {
        ratings[f] = parseFloat(data.ratings[f]);
      }
    });

    const averageRating = computeAverageRating(ratings);
    const grade = getPerformanceGrade(averageRating);

    // KPI score
    const kpis = await KPI.find({ employeeId: data.employeeId }).lean();
    const kpiScore = computeKPIScore(kpis);

    const review = await Review.create({
      employeeId: data.employeeId,
      reviewerId,
      reviewPeriod: data.reviewPeriod.trim(),
      reviewType: data.reviewType || 'quarterly',
      ratings,
      averageRating,
      grade,
      kpiScore,
      overallComment: data.overallComment.trim(),
      strengthAreas: data.strengthAreas ? data.strengthAreas.trim() : '',
      improvementAreas: data.improvementAreas ? data.improvementAreas.trim() : '',
      status: 'submitted',
    });

    // Email notification (non-blocking)
    const [employee, reviewer] = await Promise.all([
      Employee.findById(data.employeeId).lean(),
      Employee.findById(reviewerId).lean(),
    ]);
    if (employee && reviewer) {
      sendReviewSubmittedEmail(
        employee.email,
        `${employee.firstName} ${employee.lastName}`,
        `${reviewer.firstName} ${reviewer.lastName}`,
        data.reviewPeriod
      );
    }

    return review;
  },

  // ─── Get single review ────────────────────────────────────────────────────
  async getReviewById(id) {
    const review = await Review.findById(id)
      .populate('employeeId', 'firstName lastName employeeCode designation')
      .populate('reviewerId', 'firstName lastName')
      .lean();
    if (!review) throw new Error(errors.REVIEW_NOT_FOUND);
    return review;
  },

  // ─── Employee acknowledges review ─────────────────────────────────────────
  async acknowledgeReview(id, employeeId) {
    const review = await Review.findById(id);
    if (!review) throw new Error(errors.REVIEW_NOT_FOUND);
    if (String(review.employeeId) !== String(employeeId)) {
      throw new Error(errors.UNAUTHORIZED);
    }
    review.status = 'acknowledged';
    review.acknowledgedAt = new Date();
    return await review.save();
  },

  // ─── Employee's own reviews ────────────────────────────────────────────────
  async getMyReviews(employeeId) {
    return await Review.find({ employeeId, status: { $ne: 'draft' } })
      .populate('reviewerId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  },

  // ─── Manager: team overview ────────────────────────────────────────────────
  async getTeamPerformance(managerId) {
    const reports = await Employee.find({ managerId, status: 'active' })
      .populate('departmentId', 'name')
      .lean();

    const teamData = await Promise.all(
      reports.map(async (emp) => {
        const kpis = await KPI.find({ employeeId: emp._id, status: 'active' }).lean();
        const kpiScore = computeKPIScore(kpis);

        const latestReview = await Review.findOne({
          employeeId: emp._id,
          status: { $ne: 'draft' },
        })
          .sort({ createdAt: -1 })
          .lean();

        const pendingReviews = await Review.countDocuments({
          employeeId: emp._id,
          status: 'submitted',
        });

        return {
          employee: emp,
          activeKPIs: kpis.length,
          kpiScore,
          latestGrade: latestReview ? latestReview.grade : '—',
          latestPeriod: latestReview ? latestReview.reviewPeriod : '—',
          pendingAcknowledgements: pendingReviews,
        };
      })
    );

    return teamData;
  },
};

module.exports = performanceService;
