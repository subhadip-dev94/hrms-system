/**
 * Seed timesheet data for all active employees.
 * Covers the same 6-month window as attendance (Oct 2025 – Mar 2026).
 * Run: node src/config/seedTimesheets.js
 *
 * Rules:
 *  - Only working days where attendance status is 'present' or 'late'
 *  - 1–3 timesheet entries per working day (split across projects)
 *  - Total hours per day matches attendance workHours (± 0.5 h)
 *  - Each dept has a realistic project pool
 *  - Older weeks: status = 'approved' | 'submitted'
 *  - Current / recent weeks: status = 'submitted' | 'draft'
 *  - weekStart = Monday of that week (required by model)
 *  - Safe to re-run — skips employees who already have timesheets
 */

require('dotenv').config();
const mongoose  = require('mongoose');
const Employee   = require('../modules/employee/employee.model');
const Department = require('../modules/department/department.model');
const Attendance = require('../modules/attendance/attendance.model');
const Timesheet  = require('../modules/timesheet/timesheet.model');

// ─── Project pools per department code ───────────────────────────────────────

const DEPT_PROJECTS = {
  HR: [
    { name: 'Recruitment Drive Q4',     tasks: ['Screening resumes', 'Scheduling interviews', 'Conducting HR round', 'Onboarding new hires', 'Updating job descriptions'] },
    { name: 'HR Policy Review',          tasks: ['Reviewing leave policy', 'Updating appraisal process', 'Compliance audit', 'Employee handbook update'] },
    { name: 'Payroll Processing',        tasks: ['Verifying attendance data', 'Processing salary', 'PF & ESI filing', 'Generating payslips', 'Resolving payroll queries'] },
    { name: 'Employee Engagement',       tasks: ['Planning team event', 'Preparing engagement survey', 'Analysing feedback', 'Organising training session'] },
  ],
  ENG: [
    { name: 'HRMS Platform Development', tasks: ['Implementing attendance module', 'API development', 'Code review', 'Unit testing', 'Bug fixes', 'Database optimisation', 'Frontend UI development'] },
    { name: 'Mobile App v2.0',           tasks: ['Flutter UI implementation', 'REST API integration', 'Push notification setup', 'Performance profiling', 'QA testing'] },
    { name: 'DevOps & Infrastructure',   tasks: ['CI/CD pipeline setup', 'Docker containerisation', 'AWS deployment', 'Monitoring setup', 'Security patching'] },
    { name: 'Tech Debt Reduction',       tasks: ['Refactoring legacy code', 'Upgrading dependencies', 'Writing unit tests', 'Documentation update'] },
    { name: 'Internal Tools',            tasks: ['Building admin dashboard', 'Automating deployment scripts', 'Log aggregation setup'] },
  ],
  FIN: [
    { name: 'Monthly Financial Close',   tasks: ['Reconciling accounts', 'Preparing P&L report', 'Invoice processing', 'Vendor payment run', 'Auditing expense claims'] },
    { name: 'Budget Planning FY26',      tasks: ['Collecting department budgets', 'Variance analysis', 'Forecasting', 'Presenting to management'] },
    { name: 'Tax Compliance',            tasks: ['TDS calculation', 'GST filing', 'Income tax returns', 'Audit preparation'] },
    { name: 'Financial Reporting',       tasks: ['Preparing MIS report', 'Cash flow analysis', 'Balance sheet review', 'Stakeholder presentation'] },
  ],
  MKT: [
    { name: 'Q4 Marketing Campaign',     tasks: ['Content creation', 'Social media scheduling', 'Email campaign setup', 'Performance analytics', 'A/B testing'] },
    { name: 'Brand Refresh 2025',        tasks: ['Logo redesign review', 'Brand guideline update', 'Website copy review', 'Photography shoot coordination'] },
    { name: 'SEO & Digital Growth',      tasks: ['Keyword research', 'On-page optimisation', 'Backlink building', 'Analytics reporting', 'Blog writing'] },
    { name: 'Product Launch',            tasks: ['Go-to-market strategy', 'Press release drafting', 'Influencer outreach', 'Launch event planning'] },
  ],
  SAL: [
    { name: 'Enterprise Sales Q4',       tasks: ['Client prospecting', 'Demo presentation', 'Proposal writing', 'Negotiation follow-up', 'Contract closure', 'CRM updates'] },
    { name: 'SMB Outreach',              tasks: ['Cold outreach emails', 'LinkedIn prospecting', 'Discovery calls', 'Quote generation'] },
    { name: 'Account Management',        tasks: ['Quarterly business review', 'Upsell opportunity analysis', 'Client relationship management', 'Renewal negotiations'] },
    { name: 'Sales Training',            tasks: ['Product knowledge session', 'Objection handling workshop', 'Sales playbook update'] },
  ],
  CS: [
    { name: 'Customer Support Operations', tasks: ['Responding to tickets', 'Escalation handling', 'SLA monitoring', 'Knowledge base update', 'Customer call follow-up'] },
    { name: 'Support Process Improvement', tasks: ['Workflow automation setup', 'FAQ update', 'Training junior agents', 'Reporting dashboard setup'] },
    { name: 'Client Onboarding',           tasks: ['Welcome call with new client', 'Setup walkthrough', 'Configuration assistance', 'Training session'] },
  ],
  IT: [
    { name: 'IT Infrastructure Mgmt',   tasks: ['Network monitoring', 'Server maintenance', 'Patch management', 'Backup verification', 'Hardware procurement'] },
    { name: 'Helpdesk Support',          tasks: ['Resolving IT tickets', 'Software installation', 'VPN setup', 'User account management', 'Printer troubleshooting'] },
    { name: 'Security Hardening',        tasks: ['Firewall rule review', 'Vulnerability scanning', 'Security awareness training', 'Access control audit'] },
    { name: 'Cloud Migration',           tasks: ['Assessment of on-prem workloads', 'AWS/GCP setup', 'Data migration', 'Post-migration testing'] },
  ],
  OPS: [
    { name: 'Operations Management',     tasks: ['Process audit', 'SOP documentation', 'Vendor coordination', 'Resource allocation', 'KPI tracking'] },
    { name: 'Supply Chain Optimisation', tasks: ['Vendor evaluation', 'Procurement planning', 'Inventory audit', 'Cost reduction analysis'] },
    { name: 'Facilities Management',     tasks: ['Office maintenance coordination', 'Seat allocation', 'AMC renewal', 'Security roster review'] },
    { name: 'Compliance & Audit',        tasks: ['Internal audit preparation', 'Policy compliance check', 'Incident reporting', 'Risk assessment'] },
  ],
  LEG: [
    { name: 'Contract Management',       tasks: ['Drafting vendor agreement', 'NDA review', 'Contract negotiation support', 'Clause analysis', 'Filing signed contracts'] },
    { name: 'Regulatory Compliance',     tasks: ['Compliance calendar update', 'Labour law review', 'GDPR assessment', 'Filing regulatory returns'] },
    { name: 'Litigation Support',        tasks: ['Case research', 'Preparing legal briefs', 'Court date coordination', 'Deposition preparation'] },
    { name: 'IP Management',             tasks: ['Trademark filing', 'Patent research', 'IP audit', 'Licensing agreement review'] },
  ],
  ADM: [
    { name: 'Office Administration',     tasks: ['Managing office supplies', 'Vendor invoice processing', 'Meeting room coordination', 'Travel booking', 'Asset register update'] },
    { name: 'Facilities & Housekeeping', tasks: ['Maintenance scheduling', 'Housekeeping supervision', 'Safety inspection', 'Canteen coordination'] },
    { name: 'Executive Support',         tasks: ['Calendar management', 'Preparing meeting minutes', 'Travel itinerary planning', 'Correspondence handling'] },
    { name: 'Events & Logistics',        tasks: ['Town hall coordination', 'Annual day planning', 'Offsite logistics', 'Guest management'] },
  ],
  default: [
    { name: 'General Operations',        tasks: ['Daily tasks', 'Team meetings', 'Documentation', 'Internal coordination', 'Process improvement'] },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const rInt   = (min, max)  => Math.floor(Math.random() * (max - min + 1)) + min;
const pick   = (arr)       => arr[Math.floor(Math.random() * arr.length)];
const round2 = (n)         => Math.round(n * 100) / 100;

/** Monday of the week containing date */
function weekMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Split totalHours into 1–3 chunks that sum to totalHours */
function splitHours(totalHours) {
  const total = round2(totalHours);
  if (total <= 4) return [total];

  const numEntries = total >= 7 ? rInt(2, 3) : rInt(1, 2);
  if (numEntries === 1) return [total];

  const chunks = [];
  let remaining = total;
  for (let i = 0; i < numEntries - 1; i++) {
    const min = 1, max = remaining - (numEntries - i - 1);
    const chunk = round2(Math.max(min, Math.min(max, round2(Math.random() * (max - min) + min))));
    // Round to nearest 0.5
    const rounded = Math.round(chunk * 2) / 2;
    chunks.push(rounded);
    remaining = round2(remaining - rounded);
  }
  chunks.push(round2(Math.max(0.5, remaining)));
  return chunks.filter(h => h >= 0.5);
}

/** Determine timesheet status based on how old the week is */
function getStatus(date) {
  const now = new Date();
  const monday = weekMonday(date);
  const weekAge = (now - monday) / (1000 * 60 * 60 * 24 * 7); // weeks ago

  if (weekAge > 6)  return 'approved';
  if (weekAge > 3)  return 'submitted';
  if (weekAge > 1)  return 'submitted';
  return 'draft';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected\n');

  // Load employees with dept info
  const employees = await Employee.find({ status: 'active' })
    .populate('departmentId', 'code name')
    .lean();

  // Load their managers (for approvedBy)
  const managers = await Employee.find({
    role: { $in: ['manager', 'hr', 'admin'] },
    status: 'active',
  }, '_id departmentId').lean();

  // dept ObjectId → manager employee _id
  const deptManagerMap = {};
  managers.forEach(m => {
    if (m.departmentId) deptManagerMap[String(m.departmentId)] = m._id;
  });

  console.log(`Employees : ${employees.length}`);

  // Date range: Oct 1, 2025 → Mar 31, 2026
  const startDate = new Date('2025-10-01'); startDate.setHours(0,0,0,0);
  const endDate   = new Date('2026-03-31'); endDate.setHours(23,59,59,999);

  let totalInserted = 0;
  let totalSkipped  = 0;

  for (const emp of employees) {
    const deptCode = emp.departmentId?.code || 'default';
    const projects = DEPT_PROJECTS[deptCode] || DEPT_PROJECTS.default;

    // Check if this employee already has timesheets in range
    const existingCount = await Timesheet.countDocuments({
      employeeId: emp._id,
      date: { $gte: startDate, $lte: endDate },
    });
    if (existingCount > 0) {
      console.log(`  SKIP  ${emp.employeeCode}  ${emp.firstName} ${emp.lastName}  (${existingCount} entries already exist)`);
      totalSkipped++;
      continue;
    }

    // Fetch attendance for this employee: only present + late days
    const presentDays = await Attendance.find({
      employeeId: emp._id,
      date: { $gte: startDate, $lte: endDate },
      status: { $in: ['present', 'late'] },
    }, 'date workHours status').lean();

    const managerId = emp.departmentId
      ? deptManagerMap[String(emp.departmentId._id)] || null
      : null;

    const batch = [];

    for (const att of presentDays) {
      const date       = new Date(att.date);
      const totalHours = Math.max(4, att.workHours || rInt(7, 9));
      const hourChunks = splitHours(totalHours);
      const status     = getStatus(date);
      const weekStart  = weekMonday(date);

      // Pick projects for today — no repeats within same day
      const shuffled  = [...projects].sort(() => Math.random() - 0.5);
      const dayProjects = shuffled.slice(0, hourChunks.length);

      hourChunks.forEach((hrs, idx) => {
        const proj    = dayProjects[idx] || dayProjects[0];
        const task    = pick(proj.tasks);
        const wType   = Math.random() < 0.75 ? 'billable' : 'non-billable';

        const entry = {
          employeeId:      emp._id,
          date,
          projectName:     proj.name,
          taskDescription: task,
          hours:           hrs,
          workType:        wType,
          status,
          weekStart,
          isLocked:        status === 'approved',
        };

        if (status === 'approved' && managerId) {
          entry.approvedBy = managerId;
          entry.approvedAt = new Date(date.getTime() + rInt(1, 5) * 24 * 60 * 60 * 1000);
          entry.managerComment = pick(['Good work', 'Approved', 'Well documented', 'Looks good', '']);
        }

        batch.push(entry);
      });
    }

    if (batch.length > 0) {
      await Timesheet.insertMany(batch, { ordered: false });
      totalInserted += batch.length;
      console.log(`  ✓  ${emp.employeeCode}  ${(emp.firstName + ' ' + emp.lastName).padEnd(22)}  dept: ${(deptCode).padEnd(4)}  entries: ${batch.length}`);
    }
  }

  // ── Final stats ──────────────────────────────────────────────────────────
  const statusBreakdown = await Timesheet.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort:  { count: -1 } },
  ]);

  console.log('\n━━━ Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Total inserted : ${totalInserted.toLocaleString()} entries`);
  console.log(`  Employees skipped: ${totalSkipped}`);
  console.log('\n  Status breakdown:');
  statusBreakdown.forEach(s => console.log(`    ${s._id.padEnd(12)} ${s.count.toLocaleString()}`));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
  console.log('\nDone.');
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
