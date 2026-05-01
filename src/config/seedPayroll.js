/**
 * Seed: Bank details → Salary structures → Payroll runs → Payslips
 * Run: node src/config/seedPayroll.js
 *
 * What this does (in order):
 *  1. Adds realistic bank details to every employee that has none
 *  2. Assigns a salary structure to every employee (role-based bands)
 *  3. Runs payroll for the last 6 complete months via the existing payrollService
 *     (payslips are auto-generated inside runPayroll, so no extra step needed)
 *
 * Safe to re-run — each step skips already-existing records.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Employee       = require('../modules/employee/employee.model');
const Salary         = require('../modules/salary/salary.model');
const Payroll        = require('../modules/payroll/payroll.model');
const payrollService = require('../modules/payroll/payroll.service');
const { calculatePF, calculateESI, calculateTax, roundToTwo } = require('../utils/helper.util');

// ─── 1. Bank data pool ────────────────────────────────────────────────────────

const BANKS = [
  { bankName: 'State Bank of India',        ifscPrefix: 'SBIN0' },
  { bankName: 'HDFC Bank',                  ifscPrefix: 'HDFC0' },
  { bankName: 'ICICI Bank',                 ifscPrefix: 'ICIC0' },
  { bankName: 'Axis Bank',                  ifscPrefix: 'UTIB0' },
  { bankName: 'Kotak Mahindra Bank',        ifscPrefix: 'KKBK0' },
  { bankName: 'Punjab National Bank',       ifscPrefix: 'PUNB0' },
  { bankName: 'Bank of Baroda',             ifscPrefix: 'BARB0' },
  { bankName: 'Canara Bank',                ifscPrefix: 'CNRB0' },
  { bankName: 'Union Bank of India',        ifscPrefix: 'UBIN0' },
  { bankName: 'IndusInd Bank',              ifscPrefix: 'INDB0' },
];

const rInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function randomBank() {
  const b = BANKS[rInt(0, BANKS.length - 1)];
  const branch = String(rInt(1000, 9999));
  return {
    bankName:      b.bankName,
    accountNumber: String(rInt(10000000000, 99999999999)),   // 11-digit
    ifscCode:      `${b.ifscPrefix}${branch}`,
  };
}

// ─── 2. Salary bands (monthly basic, INR) ────────────────────────────────────
// Role × Designation tier → basic salary range

const SALARY_BANDS = {
  admin:    { min: 130000, max: 160000 },   // System Admin
  hr: {
    'HR Manager':                    { min: 85000,  max: 105000 },
    default:                         { min: 45000,  max: 65000  },
  },
  finance: {
    'Finance Manager':               { min: 90000,  max: 110000 },
    'Financial Controller':          { min: 95000,  max: 120000 },
    default:                         { min: 50000,  max: 70000  },
  },
  manager: {
    default:                         { min: 80000,  max: 100000 },
  },
  employee: {
    'Tech Lead':                     { min: 90000,  max: 115000 },
    'Senior Software Engineer':      { min: 75000,  max: 95000  },
    'Backend Developer':             { min: 60000,  max: 80000  },
    'Frontend Developer':            { min: 55000,  max: 75000  },
    'Full Stack Developer':          { min: 65000,  max: 85000  },
    'DevOps Engineer':               { min: 65000,  max: 85000  },
    'Software Engineer':             { min: 45000,  max: 65000  },
    default:                         { min: 30000,  max: 50000  },
  },
};

function getSalaryBand(role, designation) {
  const roleBands = SALARY_BANDS[role];
  if (!roleBands) return { min: 30000, max: 50000 };
  if (typeof roleBands.min === 'number') return roleBands;   // flat band (admin)
  return roleBands[designation] || roleBands.default || { min: 30000, max: 50000 };
}

function buildSalaryPayload(basic) {
  const b = roundToTwo(basic);
  const hra               = roundToTwo(b * 0.40);
  const specialAllowance  = roundToTwo(b * 0.10);
  const transportAllowance = 1600;                           // standard fixed
  const medicalAllowance   = 1250;                           // standard fixed
  const otherAllowances    = 0;

  const grossSalary = roundToTwo(b + hra + specialAllowance + transportAllowance + medicalAllowance + otherAllowances);
  const pf          = calculatePF(b);
  const esi         = calculateESI(grossSalary);
  const tax         = calculateTax(grossSalary * 12);
  const totalDeductions = roundToTwo(pf + esi + tax);
  const netSalary   = roundToTwo(grossSalary - totalDeductions);

  return {
    earnings: { basicSalary: b, hra, specialAllowance, transportAllowance, medicalAllowance, otherAllowances },
    deductions: { pf, esi, tax, otherDeductions: 0 },
    grossSalary,
    netSalary,
    effectiveFrom: new Date('2024-04-01'),   // FY start
    isActive: true,
  };
}

// ─── 3. Months to process ─────────────────────────────────────────────────────

function getLastNCompleteMonths(n) {
  const months = [];
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);   // start from last complete month
  for (let i = 0; i < n; i++) {
    months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    d.setMonth(d.getMonth() - 1);
  }
  return months.reverse();        // oldest first
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected\n');

  const employees = await Employee.find({ status: 'active' })
    .select('_id firstName lastName employeeCode role designation bankDetails')
    .lean();

  console.log(`Found ${employees.length} active employees\n`);

  // ── Step 1: Bank details ────────────────────────────────────────────────────
  console.log('━━━ Step 1: Bank Details ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  let bankAdded = 0, bankSkipped = 0;

  for (const emp of employees) {
    const hasBankDetails = emp.bankDetails &&
      emp.bankDetails.accountNumber &&
      emp.bankDetails.accountNumber.trim() !== '';

    if (hasBankDetails) {
      bankSkipped++;
      continue;
    }

    const bank = randomBank();
    await Employee.updateOne({ _id: emp._id }, { $set: { bankDetails: bank } });
    console.log(`  ✓ ${emp.employeeCode}  ${emp.firstName} ${emp.lastName}  → ${bank.bankName} (${bank.ifscCode})`);
    bankAdded++;
  }
  console.log(`\n  Done → ${bankAdded} added, ${bankSkipped} skipped\n`);

  // ── Step 2: Salary structures ───────────────────────────────────────────────
  console.log('━━━ Step 2: Salary Structures ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  let salaryCreated = 0, salarySkipped = 0;

  // Get admin employee to use as "assignedBy"
  const adminEmp = await Employee.findOne({ role: 'admin' }).lean();

  for (const emp of employees) {
    const exists = await Salary.findOne({ employeeId: emp._id }).lean();
    if (exists) {
      salarySkipped++;
      continue;
    }

    const band  = getSalaryBand(emp.role, emp.designation);
    const basic = rInt(band.min, band.max);
    const payload = buildSalaryPayload(basic);

    await Salary.create({ employeeId: emp._id, ...payload });

    console.log(
      `  ✓ ${emp.employeeCode}  ${(emp.firstName + ' ' + emp.lastName).padEnd(22)}` +
      `  ${emp.role.padEnd(8)}  Basic: ₹${basic.toLocaleString('en-IN')}` +
      `  Gross: ₹${payload.grossSalary.toLocaleString('en-IN')}` +
      `  Net: ₹${payload.netSalary.toLocaleString('en-IN')}`
    );
    salaryCreated++;
  }
  console.log(`\n  Done → ${salaryCreated} created, ${salarySkipped} skipped\n`);

  // ── Step 3: Payroll runs ────────────────────────────────────────────────────
  console.log('━━━ Step 3: Payroll Runs ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const months = getLastNCompleteMonths(6);
  const MONTH_NAMES = ['', 'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  console.log(`  Processing months: ${months.map(m => `${MONTH_NAMES[m.month]} ${m.year}`).join(', ')}\n`);

  for (const { month, year } of months) {
    const label = `${MONTH_NAMES[month]} ${year}`;

    const existing = await Payroll.findOne({ month, year }).lean();
    if (existing) {
      console.log(`  SKIP  ${label}  (payroll already exists — status: ${existing.status})`);
      continue;
    }

    process.stdout.write(`  Running payroll for ${label}… `);
    try {
      const payroll = await payrollService.runPayroll(month, year, adminEmp?._id || null);
      console.log(
        `done  ` +
        `employees: ${payroll.totalEmployees}  ` +
        `gross: ₹${Number(payroll.totalGross).toLocaleString('en-IN')}  ` +
        `net: ₹${Number(payroll.totalNetPay).toLocaleString('en-IN')}`
      );

      // Mark as paid immediately (historical months)
      await Payroll.findByIdAndUpdate(payroll._id, { status: 'paid' });
      console.log(`         → Marked as PAID`);
    } catch (err) {
      console.log(`FAILED — ${err.message}`);
    }
  }

  // ── Final summary ───────────────────────────────────────────────────────────
  console.log('\n━━━ Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const [totalPayrolls, totalPayslips, totalSalaries] = await Promise.all([
    Payroll.countDocuments(),
    require('../modules/payslip/payslip.model').countDocuments(),
    Salary.countDocuments(),
  ]);
  console.log(`  Salary structures : ${totalSalaries}`);
  console.log(`  Payroll records   : ${totalPayrolls}`);
  console.log(`  Payslips generated: ${totalPayslips}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
  console.log('\nDone.');
}

seed().catch(err => {
  console.error('\nSeed failed:', err.message);
  console.error(err.stack);
  mongoose.disconnect();
  process.exit(1);
});
