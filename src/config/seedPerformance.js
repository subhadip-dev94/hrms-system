/**
 * Seed performance data: KPIs + Reviews (Quarterly & Annual)
 * Run: node src/config/seedPerformance.js
 *
 * Coverage:
 *  KPIs  → Q3 2025 (completed), Q4 2025 (completed), Q1 2026 (active)
 *          3–5 KPIs per employee per quarter, role/dept appropriate
 *          Progress history with 2–3 updates per KPI
 *
 *  Reviews → Q3 2025 (acknowledged), Q4 2025 (acknowledged),
 *             Q1 2026 (submitted), Annual 2025 (acknowledged)
 *             Manager reviews each of their direct reports
 *             HR/admin reviews managers
 *
 * Safe to re-run — skips employees that already have KPIs.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Employee   = require('../modules/employee/employee.model');
const Department = require('../modules/department/department.model');
const KPI        = require('../modules/performance/kpi.model');
const Review     = require('../modules/performance/review.model');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const rInt   = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const rFloat = (min, max, dp = 1) => parseFloat((Math.random() * (max - min) + min).toFixed(dp));
const pick   = arr => arr[Math.floor(Math.random() * arr.length)];
const round2 = n  => Math.round(n * 100) / 100;

function quarter(date) {
  const m = date.getMonth() + 1;
  if (m <= 3) return 'Q1';
  if (m <= 6) return 'Q2';
  if (m <= 9) return 'Q3';
  return 'Q4';
}

function computeAvgRating(ratings) {
  const vals = Object.values(ratings).filter(v => v != null);
  if (!vals.length) return 0;
  return round2(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function grade(avg) {
  if (avg >= 4.5) return 'Outstanding';
  if (avg >= 4.0) return 'Exceeds Expectations';
  if (avg >= 3.0) return 'Meets Expectations';
  if (avg >= 2.0) return 'Needs Improvement';
  return 'Unsatisfactory';
}

// ─── KPI templates per dept code ─────────────────────────────────────────────
// Each entry: { title, description, category, unit, targetValue, weightage }

const KPI_TEMPLATES = {
  HR: [
    { title: 'Reduce Time-to-Hire',          desc: 'Reduce average days to fill open positions',        category: 'productivity', unit: 'number',   target: 30,   weight: 25 },
    { title: 'Employee Retention Rate',       desc: 'Maintain retention of active employees',            category: 'quality',      unit: '%',        target: 92,   weight: 25 },
    { title: 'Onboarding Completion Rate',    desc: 'Ensure all new hires complete onboarding program',  category: 'quality',      unit: '%',        target: 100,  weight: 20 },
    { title: 'Training Hours Delivered',      desc: 'Total training hours facilitated per quarter',      category: 'productivity', unit: 'number',   target: 80,   weight: 15 },
    { title: 'HR Query Resolution Time',      desc: 'Avg days to resolve employee HR queries',           category: 'communication',unit: 'number',   target: 2,    weight: 15 },
  ],
  ENG: [
    { title: 'Sprint Velocity',               desc: 'Story points completed per sprint',                 category: 'productivity', unit: 'number',   target: 40,   weight: 25 },
    { title: 'Code Review Coverage',          desc: 'Percentage of PRs reviewed within 24 hrs',         category: 'quality',      unit: '%',        target: 95,   weight: 20 },
    { title: 'Bug Escape Rate',               desc: 'Defects found in production vs QA',                category: 'quality',      unit: '%',        target: 5,    weight: 20 },
    { title: 'On-Time Feature Delivery',      desc: 'Features delivered within sprint commitment',      category: 'productivity', unit: '%',        target: 90,   weight: 20 },
    { title: 'Test Coverage',                 desc: 'Unit test coverage across codebase',               category: 'technical',    unit: '%',        target: 80,   weight: 15 },
  ],
  FIN: [
    { title: 'Financial Close Accuracy',      desc: 'Monthly close with zero material errors',          category: 'quality',      unit: '%',        target: 100,  weight: 30 },
    { title: 'Invoice Processing TAT',        desc: 'Average days to process vendor invoices',          category: 'productivity', unit: 'number',   target: 3,    weight: 20 },
    { title: 'Budget Variance',               desc: 'Keep actual spend within budget variance',         category: 'productivity', unit: '%',        target: 5,    weight: 25 },
    { title: 'Compliance Filing Timeliness',  desc: 'Statutory filings submitted on or before due date',category: 'quality',      unit: '%',        target: 100,  weight: 25 },
  ],
  MKT: [
    { title: 'Lead Generation Target',        desc: 'Marketing qualified leads generated per quarter', category: 'productivity', unit: 'number',   target: 500,  weight: 30 },
    { title: 'Campaign ROI',                  desc: 'Return on marketing spend',                       category: 'productivity', unit: '%',        target: 150,  weight: 25 },
    { title: 'Website Traffic Growth',        desc: 'Organic traffic increase quarter-on-quarter',     category: 'technical',    unit: '%',        target: 20,   weight: 20 },
    { title: 'Content Published',             desc: 'Number of blog / content pieces published',       category: 'productivity', unit: 'number',   target: 12,   weight: 15 },
    { title: 'Social Media Engagement Rate',  desc: 'Average engagement rate across channels',         category: 'communication',unit: '%',        target: 4,    weight: 10 },
  ],
  SAL: [
    { title: 'Revenue Target Achievement',    desc: 'Achieve quarterly sales revenue target',          category: 'productivity', unit: '%',        target: 100,  weight: 35 },
    { title: 'New Accounts Won',              desc: 'New logos / customers acquired',                  category: 'productivity', unit: 'number',   target: 8,    weight: 25 },
    { title: 'Pipeline Coverage',             desc: 'Sales pipeline as multiple of quota',             category: 'productivity', unit: 'number',   target: 3,    weight: 20 },
    { title: 'Average Deal Size',             desc: 'Average deal value closed in the quarter',        category: 'productivity', unit: 'currency', target: 500000, weight: 20 },
  ],
  CS: [
    { title: 'Customer Satisfaction Score',   desc: 'CSAT score from post-resolution surveys',         category: 'quality',      unit: '%',        target: 90,   weight: 30 },
    { title: 'First Response Time',           desc: 'Average hours to first response on tickets',      category: 'productivity', unit: 'number',   target: 4,    weight: 25 },
    { title: 'Ticket Resolution Rate',        desc: 'Percentage of tickets resolved within SLA',       category: 'productivity', unit: '%',        target: 95,   weight: 25 },
    { title: 'Escalation Rate',               desc: 'Percentage of tickets escalated to L2/L3',       category: 'quality',      unit: '%',        target: 10,   weight: 20 },
  ],
  IT: [
    { title: 'System Uptime',                 desc: 'Ensure production systems meet uptime SLA',       category: 'technical',    unit: '%',        target: 99.5, weight: 30 },
    { title: 'Ticket Resolution TAT',         desc: 'Average hours to resolve IT helpdesk tickets',   category: 'productivity', unit: 'number',   target: 8,    weight: 25 },
    { title: 'Security Patch Compliance',     desc: 'Percentage of systems patched within schedule',  category: 'technical',    unit: '%',        target: 100,  weight: 25 },
    { title: 'Infrastructure Cost Savings',   desc: 'Cloud cost optimisation achieved',               category: 'productivity', unit: 'currency', target: 100000, weight: 20 },
  ],
  OPS: [
    { title: 'Process Efficiency Improvement',desc: 'Reduction in process cycle time',                category: 'productivity', unit: '%',        target: 15,   weight: 30 },
    { title: 'Vendor SLA Compliance',         desc: 'Percentage of vendors meeting SLA',              category: 'quality',      unit: '%',        target: 95,   weight: 25 },
    { title: 'Cost Reduction Initiative',     desc: 'Operational cost savings vs budget',             category: 'productivity', unit: 'currency', target: 200000, weight: 25 },
    { title: 'Audit Finding Closure Rate',    desc: 'Audit observations closed within due date',      category: 'quality',      unit: '%',        target: 100,  weight: 20 },
  ],
  LEG: [
    { title: 'Contract Turnaround Time',      desc: 'Average days to review and return contracts',    category: 'productivity', unit: 'number',   target: 5,    weight: 30 },
    { title: 'Compliance Calendar Adherence', desc: 'Regulatory filings on time',                     category: 'quality',      unit: '%',        target: 100,  weight: 30 },
    { title: 'Legal Risk Incidents',          desc: 'Number of compliance violations / incidents',    category: 'quality',      unit: 'number',   target: 1,    weight: 25 },
    { title: 'Contract Database Accuracy',    desc: 'Contracts indexed and filed correctly',          category: 'technical',    unit: '%',        target: 100,  weight: 15 },
  ],
  ADM: [
    { title: 'Office Supplies Cost Savings',  desc: 'Cost reduction on office procurement',           category: 'productivity', unit: '%',        target: 10,   weight: 25 },
    { title: 'Meeting Room Utilisation',      desc: 'Percentage utilisation of meeting rooms',        category: 'productivity', unit: '%',        target: 75,   weight: 20 },
    { title: 'Vendor Payment TAT',            desc: 'Average days to process vendor payments',        category: 'productivity', unit: 'number',   target: 7,    weight: 25 },
    { title: 'Facility Complaint Resolution', desc: 'Facilities complaints resolved within 24h',      category: 'quality',      unit: '%',        target: 95,   weight: 30 },
  ],
  default: [
    { title: 'Goal Achievement Rate',         desc: 'Percentage of quarterly goals achieved',         category: 'productivity', unit: '%',        target: 85,   weight: 40 },
    { title: 'Attendance & Punctuality',      desc: 'Attendance rate for the quarter',                category: 'productivity', unit: '%',        target: 95,   weight: 30 },
    { title: 'Skill Development',             desc: 'Training hours completed',                       category: 'technical',    unit: 'number',   target: 20,   weight: 30 },
  ],
};

// ─── Review comment banks ─────────────────────────────────────────────────────

const STRENGTHS = [
  'Consistently delivers high-quality work on time.',
  'Excellent team player with strong collaborative skills.',
  'Demonstrates solid technical expertise and quick learning ability.',
  'Proactive in identifying issues and proposing solutions.',
  'Strong communication skills and stakeholder management.',
  'Shows great ownership and accountability in all tasks.',
  'Innovative thinking with ability to simplify complex problems.',
  'Reliable and consistent performer across all projects.',
  'Natural mentor who helps juniors grow effectively.',
  'Data-driven decision maker with strong analytical skills.',
];

const IMPROVEMENTS = [
  'Can improve documentation practices for better knowledge transfer.',
  'Should focus on prioritisation when managing multiple deliverables.',
  'Would benefit from cross-functional exposure beyond current domain.',
  'Can strengthen presentation skills for senior stakeholder interactions.',
  'Should proactively communicate blockers earlier in the process.',
  'Can work on improving estimation accuracy for project timelines.',
  'Would benefit from deeper technical certifications in the domain.',
  'Should delegate more effectively to build team capability.',
  'Can improve stakeholder update frequency on ongoing projects.',
  'Should work on strategic thinking beyond immediate deliverables.',
];

const OVERALL_COMMENTS = [
  'Strong quarter — met all key objectives with minimal supervision.',
  'Solid contributor to the team with consistent output quality.',
  'Good progress across most goals; one area needs improvement next quarter.',
  'Exceptional performance — exceeded most KPIs significantly.',
  'Meets expectations consistently; ready to take on more responsibility.',
  'Dependable team member who delivers reliably under pressure.',
  'Above average quarter with noticeable growth in technical skills.',
  'Good quarter overall; leadership and communication have improved notably.',
  'Consistently high performer who sets a strong example for the team.',
  'Growing well in the role; trajectory is positive for the next review cycle.',
];

// ─── Quarter definitions ──────────────────────────────────────────────────────

const QUARTERS = [
  { label: 'Q3 2025', start: new Date('2025-07-01'), end: new Date('2025-09-30'), year: 2025, q: 'Q3', status: 'completed', reviewStatus: 'acknowledged' },
  { label: 'Q4 2025', start: new Date('2025-10-01'), end: new Date('2025-12-31'), year: 2025, q: 'Q4', status: 'completed', reviewStatus: 'acknowledged' },
  { label: 'Q1 2026', start: new Date('2026-01-01'), end: new Date('2026-03-31'), year: 2026, q: 'Q1', status: 'active',    reviewStatus: 'submitted'    },
];

const ANNUAL = { label: 'Annual 2025', year: 2025, reviewType: 'annual', reviewStatus: 'acknowledged' };

// ─── KPI progress simulation ──────────────────────────────────────────────────

function simulateProgress(target, unit, kpiStatus, quarter) {
  // How well did the employee do? Skew towards 70–110% achievement
  const achievementPct = rFloat(60, 115, 1);
  const current = round2((achievementPct / 100) * target);

  // 2–3 intermediate progress updates
  const updates = [];
  const updateCount = rInt(2, 3);
  for (let i = 0; i < updateCount; i++) {
    const pct = rFloat(20 + i * 25, 30 + i * 30, 1);
    updates.push({
      value:     round2((pct / 100) * target),
      updatedAt: new Date(quarter.start.getTime() + rInt(7, 70) * 86400000),
      note: pick(['Mid-quarter check-in', 'Weekly update', 'Manager review', 'Self-reported progress', '']),
    });
  }
  // Final update = current value
  updates.push({ value: current, updatedAt: new Date(quarter.end.getTime() - rInt(1, 5) * 86400000), note: 'Quarter-end update' });

  return { current, updates };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected\n');

  // Load all active employees with dept
  const employees = await Employee.find({ status: 'active' })
    .populate('departmentId', 'code name')
    .lean();

  // Build dept → manager map (first manager/hr in dept)
  const managers = await Employee.find({
    role: { $in: ['manager', 'hr', 'admin', 'finance'] },
    status: 'active',
  }).lean();

  const deptManagerMap = {};   // deptId → manager Employee doc
  const adminEmp = employees.find(e => e.role === 'admin');

  managers.forEach(m => {
    const key = m.departmentId ? String(m.departmentId) : 'admin';
    if (!deptManagerMap[key]) deptManagerMap[key] = m;
  });

  // Check if KPIs already exist
  const existingKPICount = await KPI.countDocuments();
  if (existingKPICount > 0) {
    console.log(`KPIs already exist (${existingKPICount} records). Skipping KPI creation.\n`);
  }

  // Check if Reviews already exist
  const existingReviewCount = await Review.countDocuments();
  if (existingReviewCount > 0) {
    console.log(`Reviews already exist (${existingReviewCount} records). Skipping review creation.\n`);
  }

  if (existingKPICount > 0 && existingReviewCount > 0) {
    console.log('All data already seeded. Run with --force to re-seed.');
    await mongoose.disconnect();
    return;
  }

  let kpiTotal = 0, reviewTotal = 0;

  // ── KPIs ─────────────────────────────────────────────────────────────────
  if (existingKPICount === 0) {
    console.log('━━━ KPIs ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const emp of employees) {
      const deptCode  = emp.departmentId?.code || 'default';
      const deptId    = emp.departmentId ? String(emp.departmentId._id) : 'admin';
      const manager   = deptManagerMap[deptId] || adminEmp;
      const assignedBy = manager?._id || emp._id;
      const templates = KPI_TEMPLATES[deptCode] || KPI_TEMPLATES.default;

      let empKPIs = 0;

      for (const qtr of QUARTERS) {
        // Pick 3–5 KPIs from templates (shuffle and slice)
        const shuffled = [...templates].sort(() => Math.random() - 0.5);
        const count    = rInt(3, Math.min(5, templates.length));
        const chosen   = shuffled.slice(0, count);

        for (const tpl of chosen) {
          const isCompleted = qtr.status === 'completed';
          const { current, updates } = simulateProgress(tpl.target, tpl.unit, qtr.status, qtr);

          const kpiDoc = {
            employeeId:      emp._id,
            assignedBy,
            title:           tpl.title,
            description:     tpl.desc,
            category:        tpl.category,
            targetValue:     tpl.target,
            currentValue:    isCompleted ? current : round2(current * rFloat(0.4, 0.85, 2)),
            unit:            tpl.unit,
            weightage:       tpl.weight,
            periodStart:     qtr.start,
            periodEnd:       qtr.end,
            quarter:         qtr.q,
            year:            qtr.year,
            status:          isCompleted ? 'completed' : 'active',
            progressHistory: updates,
          };

          await KPI.create(kpiDoc);
          kpiTotal++;
          empKPIs++;
        }
      }
      console.log(`  ✓  ${emp.employeeCode}  ${(emp.firstName + ' ' + emp.lastName).padEnd(22)}  ${deptCode.padEnd(4)}  KPIs: ${empKPIs}`);
    }
    console.log(`\n  Total KPIs created: ${kpiTotal}\n`);
  }

  // ── Reviews ───────────────────────────────────────────────────────────────
  if (existingReviewCount === 0) {
    console.log('━━━ Performance Reviews ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Build reviewer map: for each employee, who reviews them?
    // Rule: manager reviews their dept employees; admin reviews managers; HR reviews everyone else
    const hrEmp    = employees.find(e => e.role === 'hr') || adminEmp;
    const adminDoc = adminEmp || employees[0];

    function getReviewer(emp) {
      if (emp.role === 'admin') return null;   // admin not reviewed
      const deptId  = emp.departmentId ? String(emp.departmentId._id) : null;
      const mgr     = deptId ? deptManagerMap[deptId] : null;

      if (['manager', 'hr', 'finance'].includes(emp.role)) {
        return adminDoc;   // managers reviewed by admin
      }
      return mgr || hrEmp;   // employees reviewed by their dept manager
    }

    const reviewableEmployees = employees.filter(e => e.role !== 'admin');

    for (const emp of reviewableEmployees) {
      const reviewer = getReviewer(emp);
      if (!reviewer || String(reviewer._id) === String(emp._id)) continue;

      let empReviews = 0;

      // Quarterly reviews: Q3 2025, Q4 2025, Q1 2026
      for (const qtr of QUARTERS) {
        const isAcknowledged = qtr.reviewStatus === 'acknowledged';

        // Slightly randomise ratings based on "performance profile"
        // Give each employee a consistent base talent score so ratings are coherent
        const talent = rFloat(2.5, 5.0, 1);   // consistent per-employee base
        const ratingFor = (base, variance = 0.8) =>
          Math.min(5, Math.max(1, round2(base + rFloat(-variance, variance, 1))));

        const ratings = {
          productivity:  ratingFor(talent),
          quality:       ratingFor(talent),
          communication: ratingFor(talent, 1.0),
          teamwork:      ratingFor(talent, 0.6),
          leadership:    emp.role === 'manager' ? ratingFor(talent, 0.4) : ratingFor(talent - 0.5, 0.8),
          technical:     ratingFor(talent, 0.8),
        };

        const avg   = computeAvgRating(ratings);
        const gr    = grade(avg);

        // KPI score: compute from this employee's KPIs for this quarter
        const empKPIs = await KPI.find({ employeeId: emp._id, quarter: qtr.q, year: qtr.year }).lean();
        let kpiScore = 0;
        if (empKPIs.length > 0) {
          let tw = 0, ws = 0;
          empKPIs.forEach(k => {
            const prog = Math.min(100, Math.round((k.currentValue / k.targetValue) * 100));
            ws += prog * (k.weightage || 10);
            tw += (k.weightage || 10);
          });
          kpiScore = tw > 0 ? Math.round(ws / tw) : 0;
        }

        try {
          await Review.create({
            employeeId:       emp._id,
            reviewerId:       reviewer._id,
            reviewPeriod:     qtr.label,
            reviewType:       'quarterly',
            ratings,
            averageRating:    avg,
            grade:            gr,
            kpiScore,
            overallComment:   pick(OVERALL_COMMENTS),
            strengthAreas:    pick(STRENGTHS),
            improvementAreas: pick(IMPROVEMENTS),
            status:           qtr.reviewStatus,
            acknowledgedAt:   isAcknowledged ? new Date(qtr.end.getTime() + rInt(3, 14) * 86400000) : undefined,
          });
          reviewTotal++;
          empReviews++;
        } catch (err) {
          if (!err.message.includes('duplicate')) console.warn(`  WARN review: ${err.message}`);
        }
      }

      // Annual 2025 review
      try {
        const annualRatings = {
          productivity:  rFloat(2.5, 5.0, 1),
          quality:       rFloat(2.5, 5.0, 1),
          communication: rFloat(2.5, 5.0, 1),
          teamwork:      rFloat(2.5, 5.0, 1),
          leadership:    emp.role === 'manager' ? rFloat(3.0, 5.0, 1) : rFloat(2.0, 4.5, 1),
          technical:     rFloat(2.5, 5.0, 1),
        };
        const annAvg = computeAvgRating(annualRatings);

        await Review.create({
          employeeId:       emp._id,
          reviewerId:       reviewer._id,
          reviewPeriod:     ANNUAL.label,
          reviewType:       'annual',
          ratings:          annualRatings,
          averageRating:    annAvg,
          grade:            grade(annAvg),
          kpiScore:         rInt(65, 98),
          overallComment:   pick(OVERALL_COMMENTS),
          strengthAreas:    pick(STRENGTHS),
          improvementAreas: pick(IMPROVEMENTS),
          status:           'acknowledged',
          acknowledgedAt:   new Date('2026-01-20'),
        });
        reviewTotal++;
        empReviews++;
      } catch (err) {
        if (!err.message.includes('duplicate')) console.warn(`  WARN annual: ${err.message}`);
      }

      console.log(`  ✓  ${emp.employeeCode}  ${(emp.firstName + ' ' + emp.lastName).padEnd(22)}  reviews: ${empReviews}`);
    }
    console.log(`\n  Total reviews created: ${reviewTotal}\n`);
  }

  // ── Final Summary ──────────────────────────────────────────────────────────
  const [kpiByStatus, kpiByQtr, reviewByPeriod, reviewByGrade] = await Promise.all([
    KPI.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    KPI.aggregate([{ $group: { _id: { q: '$quarter', y: '$year' }, count: { $sum: 1 } } }, { $sort: { '_id.y': 1, '_id.q': 1 } }]),
    Review.aggregate([{ $group: { _id: '$reviewPeriod', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Review.aggregate([{ $group: { _id: '$grade', count: { $sum: 1 }, avgRating: { $avg: '$averageRating' } } }, { $sort: { avgRating: -1 } }]),
  ]);

  console.log('━━━ Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n  KPI Status:`);
  kpiByStatus.forEach(r => console.log(`    ${r._id.padEnd(12)} ${r.count}`));
  console.log(`\n  KPIs by Quarter:`);
  kpiByQtr.forEach(r => console.log(`    ${r._id.q} ${r._id.y}  →  ${r.count}`));
  console.log(`\n  Reviews by Period:`);
  reviewByPeriod.forEach(r => console.log(`    ${r._id.padEnd(16)} ${r.count}`));
  console.log(`\n  Reviews by Grade:`);
  reviewByGrade.forEach(r => console.log(`    ${(r._id || 'N/A').padEnd(24)} ${r.count}  avg rating: ${round2(r.avgRating)}`));
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
  console.log('\nDone.');
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  console.error(err.stack);
  mongoose.disconnect();
  process.exit(1);
});
