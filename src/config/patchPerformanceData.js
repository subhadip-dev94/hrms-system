/**
 * Patch script — fixes two issues from the initial seed:
 *  1. Sets managerId on all employees (links team members to their dept manager)
 *  2. Seeds reviews for employees who have 0 reviews (e.g. admin)
 *
 * Run: node src/config/patchPerformanceData.js
 * Safe to re-run — skips employees that already have reviews.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Employee   = require('../modules/employee/employee.model');
const Department = require('../modules/department/department.model');
const KPI        = require('../modules/performance/kpi.model');
const Review     = require('../modules/performance/review.model');

const rFloat = (min, max, dp = 1) => parseFloat((Math.random() * (max - min) + min).toFixed(dp));
const pick   = arr => arr[Math.floor(Math.random() * arr.length)];
const round2 = n  => Math.round(n * 100) / 100;

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

const OVERALL_COMMENTS = [
  'Strong quarter — met all key objectives with minimal supervision.',
  'Solid contributor to the team with consistent output quality.',
  'Good progress across most goals; one area needs improvement next quarter.',
  'Exceptional performance — exceeded most KPIs significantly.',
  'Meets expectations consistently; ready to take on more responsibility.',
];

const STRENGTHS = [
  'Consistently delivers high-quality work on time.',
  'Excellent team player with strong collaborative skills.',
  'Proactive in identifying issues and proposing solutions.',
  'Demonstrates solid technical expertise and quick learning ability.',
];

const IMPROVEMENTS = [
  'Can improve documentation practices for better knowledge transfer.',
  'Should focus on prioritisation when managing multiple deliverables.',
  'Should proactively communicate blockers earlier in the process.',
  'Can work on improving estimation accuracy for project timelines.',
];

const QUARTERS = [
  { label: 'Q3 2025', q: 'Q3', year: 2025, reviewStatus: 'acknowledged', end: new Date('2025-09-30') },
  { label: 'Q4 2025', q: 'Q4', year: 2025, reviewStatus: 'acknowledged', end: new Date('2025-12-31') },
  { label: 'Q1 2026', q: 'Q1', year: 2026, reviewStatus: 'submitted',    end: new Date('2026-03-31') },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected\n');

  const employees = await Employee.find({ status: 'active' })
    .populate('departmentId', 'code name')
    .lean();

  // ── Step 1: Set managerId on all employees ─────────────────────────────────
  console.log('━━━ Step 1: Setting managerId on employees ━━━━━━━━━━━━━━━━━━━━━');

  // Group by department
  const deptGroups = {};
  employees.forEach(emp => {
    const deptId = emp.departmentId ? String(emp.departmentId._id) : 'none';
    if (!deptGroups[deptId]) deptGroups[deptId] = [];
    deptGroups[deptId].push(emp);
  });

  let managerUpdates = 0;

  for (const [deptId, members] of Object.entries(deptGroups)) {
    // Find the manager in this dept (role = manager/hr/finance/admin)
    const mgr = members.find(e => ['manager', 'hr', 'finance', 'admin'].includes(e.role));
    if (!mgr) continue;

    // Set managerId on all non-manager members in this dept
    for (const emp of members) {
      if (String(emp._id) === String(mgr._id)) continue; // skip the manager themselves
      if (emp.managerId && String(emp.managerId) === String(mgr._id)) continue; // already set

      await Employee.updateOne({ _id: emp._id }, { $set: { managerId: mgr._id } });
      managerUpdates++;
    }
  }

  console.log(`  → Updated managerId on ${managerUpdates} employees\n`);

  // ── Step 2: Seed reviews for employees with 0 reviews ──────────────────────
  console.log('━━━ Step 2: Seeding missing reviews ━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Re-load employees (now with managerId set)
  const allEmps = await Employee.find({ status: 'active' }).lean();

  // Build reviewer map: who reviews each employee?
  // - admin reviews managers/hr/finance
  // - dept manager reviews regular employees
  // - for employees without a manager, HR emp reviews them
  const adminEmp = allEmps.find(e => e.role === 'admin');
  const hrEmp    = allEmps.find(e => e.role === 'hr') || adminEmp;

  // dept → manager map
  const deptMgrMap = {};
  allEmps.forEach(e => {
    if (['manager', 'hr', 'finance', 'admin'].includes(e.role) && e.departmentId) {
      const key = String(e.departmentId);
      if (!deptMgrMap[key]) deptMgrMap[key] = e;
    }
  });

  function getReviewer(emp) {
    if (['manager', 'hr', 'finance'].includes(emp.role)) return adminEmp;
    if (emp.role === 'admin') {
      // admin is reviewed by themselves (self-review) or by the hr manager
      return hrEmp && String(hrEmp._id) !== String(emp._id) ? hrEmp : null;
    }
    const deptKey = emp.departmentId ? String(emp.departmentId) : null;
    return deptKey ? (deptMgrMap[deptKey] || hrEmp) : hrEmp;
  }

  let reviewsCreated = 0;

  for (const emp of allEmps) {
    const existingCount = await Review.countDocuments({ employeeId: emp._id });
    if (existingCount > 0) continue; // already has reviews

    const reviewer = getReviewer(emp);
    if (!reviewer || String(reviewer._id) === String(emp._id)) continue;

    for (const qtr of QUARTERS) {
      const talent = rFloat(2.8, 5.0, 1);
      const ratingFor = (base, v = 0.8) =>
        Math.min(5, Math.max(1, round2(base + rFloat(-v, v, 1))));

      const ratings = {
        productivity:  ratingFor(talent),
        quality:       ratingFor(talent),
        communication: ratingFor(talent, 1.0),
        teamwork:      ratingFor(talent, 0.6),
        leadership:    ['manager','hr','finance','admin'].includes(emp.role) ? ratingFor(talent, 0.4) : ratingFor(talent - 0.3, 0.8),
        technical:     ratingFor(talent, 0.8),
      };

      const avg = computeAvgRating(ratings);
      const gr  = grade(avg);

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
          acknowledgedAt:   qtr.reviewStatus === 'acknowledged'
            ? new Date(qtr.end.getTime() + (Math.floor(Math.random() * 10) + 3) * 86400000)
            : undefined,
        });
        reviewsCreated++;
      } catch (err) {
        if (!err.message.includes('duplicate')) console.warn(`  WARN: ${err.message}`);
      }
    }

    // Annual 2025
    try {
      const annRatings = {
        productivity:  rFloat(2.5, 5.0, 1),
        quality:       rFloat(2.5, 5.0, 1),
        communication: rFloat(2.5, 5.0, 1),
        teamwork:      rFloat(2.5, 5.0, 1),
        leadership:    ['manager','hr','finance','admin'].includes(emp.role) ? rFloat(3.0, 5.0, 1) : rFloat(2.0, 4.5, 1),
        technical:     rFloat(2.5, 5.0, 1),
      };
      const annAvg = computeAvgRating(annRatings);

      await Review.create({
        employeeId:       emp._id,
        reviewerId:       reviewer._id,
        reviewPeriod:     'Annual 2025',
        reviewType:       'annual',
        ratings:          annRatings,
        averageRating:    annAvg,
        grade:            grade(annAvg),
        overallComment:   pick(OVERALL_COMMENTS),
        strengthAreas:    pick(STRENGTHS),
        improvementAreas: pick(IMPROVEMENTS),
        status:           'acknowledged',
        acknowledgedAt:   new Date('2026-01-20'),
      });
      reviewsCreated++;
    } catch (err) {
      if (!err.message.includes('duplicate')) console.warn(`  WARN annual: ${err.message}`);
    }

    console.log(`  ✓  ${emp.employeeCode}  ${emp.firstName} ${emp.lastName}  → 4 reviews added`);
  }

  console.log(`\n  → Reviews created: ${reviewsCreated}`);

  // ── Summary ────────────────────────────────────────────────────────────────
  const totalReviews  = await Review.countDocuments();
  const withManager   = await Employee.countDocuments({ managerId: { $exists: true, $ne: null } });
  const totalEmps     = await Employee.countDocuments();

  console.log('\n━━━ Done ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Total reviews in DB : ${totalReviews}`);
  console.log(`  Employees with mgr  : ${withManager} / ${totalEmps}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
  console.log('\nDone.');
}

seed().catch(err => {
  console.error('Patch failed:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
