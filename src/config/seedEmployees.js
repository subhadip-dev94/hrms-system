/**
 * Seed 50 employees across all departments.
 * Run: node src/config/seedEmployees.js
 *
 * - Skips employees whose email already exists.
 * - Uses EMP002+ codes (EMP001 is the seeded admin).
 * - Default password: Hrms@2025 (all accounts).
 * - Initialises leave balance for every new employee.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Employee     = require('../modules/employee/employee.model');
const User         = require('../modules/auth/user.model');
const Department   = require('../modules/department/department.model');
const LeaveBalance = require('../modules/leave/leaveBalance.model');

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_PASSWORD = 'Hrms@2025';

// dept code → role/designation pool
const DEPT_CONFIG = {
  HR:  {
    role: 'hr',
    designations: ['HR Manager', 'HR Executive', 'Talent Acquisition Specialist', 'HR Business Partner', 'Payroll Specialist'],
  },
  ENG: {
    role: 'employee',
    designations: ['Software Engineer', 'Senior Software Engineer', 'Tech Lead', 'Backend Developer', 'Frontend Developer', 'Full Stack Developer', 'DevOps Engineer'],
  },
  FIN: {
    role: 'finance',
    designations: ['Finance Analyst', 'Senior Accountant', 'Finance Manager', 'Accounts Executive', 'Financial Controller'],
  },
  MKT: {
    role: 'employee',
    designations: ['Marketing Executive', 'Digital Marketing Specialist', 'Content Strategist', 'SEO Analyst', 'Brand Manager'],
  },
  SAL: {
    role: 'employee',
    designations: ['Sales Executive', 'Senior Sales Executive', 'Account Manager', 'Business Development Executive', 'Sales Manager'],
  },
  CS:  {
    role: 'employee',
    designations: ['Support Executive', 'Customer Success Manager', 'Technical Support Specialist', 'Support Lead'],
  },
  IT:  {
    role: 'employee',
    designations: ['IT Support Engineer', 'Systems Administrator', 'Network Engineer', 'IT Analyst', 'Infrastructure Lead'],
  },
  OPS: {
    role: 'employee',
    designations: ['Operations Executive', 'Operations Manager', 'Process Analyst', 'Logistics Coordinator'],
  },
  LEG: {
    role: 'employee',
    designations: ['Legal Associate', 'Compliance Officer', 'Contract Specialist', 'Legal Counsel'],
  },
  ADM: {
    role: 'employee',
    designations: ['Administrative Executive', 'Office Manager', 'Executive Assistant', 'Facilities Coordinator'],
  },
};

// 50 realistic Indian employees — 5 per dept (10 depts)
const RAW_EMPLOYEES = [
  // ── Human Resources ──────────────────────────────────────────────────────
  { firstName:'Ananya',   lastName:'Sharma',     email:'ananya.sharma@hrms.com',     phone:'9810001001', gender:'female', dob:'1990-03-15', joined:'2019-06-01', dept:'HR',  manager:true  },
  { firstName:'Deepika',  lastName:'Joshi',      email:'deepika.joshi@hrms.com',      phone:'9810001002', gender:'female', dob:'1993-07-22', joined:'2020-02-10', dept:'HR'  },
  { firstName:'Manish',   lastName:'Patel',      email:'manish.patel@hrms.com',       phone:'9810001003', gender:'male',   dob:'1991-11-05', joined:'2020-08-15', dept:'HR'  },
  { firstName:'Sunita',   lastName:'Yadav',      email:'sunita.yadav@hrms.com',       phone:'9810001004', gender:'female', dob:'1994-04-30', joined:'2021-04-01', dept:'HR'  },
  { firstName:'Rajesh',   lastName:'Kumar',      email:'rajesh.kumar@hrms.com',       phone:'9810001005', gender:'male',   dob:'1988-09-12', joined:'2018-11-01', dept:'HR'  },

  // ── Engineering ──────────────────────────────────────────────────────────
  { firstName:'Rahul',    lastName:'Verma',      email:'rahul.verma@hrms.com',        phone:'9820002001', gender:'male',   dob:'1989-05-20', joined:'2018-04-01', dept:'ENG', manager:true },
  { firstName:'Aditya',   lastName:'Nair',       email:'aditya.nair@hrms.com',        phone:'9820002002', gender:'male',   dob:'1992-08-14', joined:'2019-09-01', dept:'ENG' },
  { firstName:'Pooja',    lastName:'Iyer',       email:'pooja.iyer@hrms.com',         phone:'9820002003', gender:'female', dob:'1995-02-18', joined:'2021-01-15', dept:'ENG' },
  { firstName:'Saurabh',  lastName:'Tiwari',     email:'saurabh.tiwari@hrms.com',     phone:'9820002004', gender:'male',   dob:'1993-12-03', joined:'2020-06-01', dept:'ENG' },
  { firstName:'Nisha',    lastName:'Reddy',      email:'nisha.reddy@hrms.com',        phone:'9820002005', gender:'female', dob:'1996-06-25', joined:'2022-03-01', dept:'ENG' },
  { firstName:'Karan',    lastName:'Malhotra',   email:'karan.malhotra@hrms.com',     phone:'9820002006', gender:'male',   dob:'1991-10-10', joined:'2019-11-01', dept:'ENG' },
  { firstName:'Ishaan',   lastName:'Saxena',     email:'ishaan.saxena@hrms.com',      phone:'9820002007', gender:'male',   dob:'1997-03-07', joined:'2022-07-01', dept:'ENG' },

  // ── Finance ───────────────────────────────────────────────────────────────
  { firstName:'Amit',     lastName:'Gupta',      email:'amit.gupta@hrms.com',         phone:'9830003001', gender:'male',   dob:'1987-01-28', joined:'2017-08-01', dept:'FIN', manager:true },
  { firstName:'Ritu',     lastName:'Agarwal',    email:'ritu.agarwal@hrms.com',       phone:'9830003002', gender:'female', dob:'1992-09-16', joined:'2020-01-10', dept:'FIN' },
  { firstName:'Prakash',  lastName:'Mehta',      email:'prakash.mehta@hrms.com',      phone:'9830003003', gender:'male',   dob:'1990-04-22', joined:'2019-05-01', dept:'FIN' },
  { firstName:'Seema',    lastName:'Bose',       email:'seema.bose@hrms.com',         phone:'9830003004', gender:'female', dob:'1994-11-08', joined:'2021-09-01', dept:'FIN' },
  { firstName:'Vivek',    lastName:'Pillai',     email:'vivek.pillai@hrms.com',       phone:'9830003005', gender:'male',   dob:'1989-07-31', joined:'2018-03-01', dept:'FIN' },

  // ── Marketing ─────────────────────────────────────────────────────────────
  { firstName:'Priya',    lastName:'Das',        email:'priya.das@hrms.com',          phone:'9840004001', gender:'female', dob:'1991-06-13', joined:'2019-02-01', dept:'MKT', manager:true },
  { firstName:'Akash',    lastName:'Banerjee',   email:'akash.banerjee@hrms.com',     phone:'9840004002', gender:'male',   dob:'1994-03-05', joined:'2020-10-01', dept:'MKT' },
  { firstName:'Divya',    lastName:'Sinha',      email:'divya.sinha@hrms.com',        phone:'9840004003', gender:'female', dob:'1996-08-19', joined:'2021-06-01', dept:'MKT' },
  { firstName:'Mohit',    lastName:'Chauhan',    email:'mohit.chauhan@hrms.com',      phone:'9840004004', gender:'male',   dob:'1993-01-27', joined:'2020-04-01', dept:'MKT' },
  { firstName:'Shruti',   lastName:'Mishra',     email:'shruti.mishra@hrms.com',      phone:'9840004005', gender:'female', dob:'1995-10-11', joined:'2021-12-01', dept:'MKT' },

  // ── Sales ─────────────────────────────────────────────────────────────────
  { firstName:'Vikram',   lastName:'Singh',      email:'vikram.singh@hrms.com',       phone:'9850005001', gender:'male',   dob:'1988-11-23', joined:'2018-07-01', dept:'SAL', manager:true },
  { firstName:'Neha',     lastName:'Chandra',    email:'neha.chandra@hrms.com',       phone:'9850005002', gender:'female', dob:'1993-05-17', joined:'2020-03-15', dept:'SAL' },
  { firstName:'Rohit',    lastName:'Pandey',     email:'rohit.pandey@hrms.com',       phone:'9850005003', gender:'male',   dob:'1992-02-09', joined:'2019-08-01', dept:'SAL' },
  { firstName:'Anjali',   lastName:'Thakur',     email:'anjali.thakur@hrms.com',      phone:'9850005004', gender:'female', dob:'1995-07-04', joined:'2021-02-01', dept:'SAL' },
  { firstName:'Sumit',    lastName:'Dubey',      email:'sumit.dubey@hrms.com',        phone:'9850005005', gender:'male',   dob:'1990-12-15', joined:'2019-01-01', dept:'SAL' },

  // ── Customer Support ──────────────────────────────────────────────────────
  { firstName:'Sneha',    lastName:'Roy',        email:'sneha.roy@hrms.com',          phone:'9860006001', gender:'female', dob:'1992-04-08', joined:'2019-10-01', dept:'CS',  manager:true },
  { firstName:'Tarun',    lastName:'Biswas',     email:'tarun.biswas@hrms.com',       phone:'9860006002', gender:'male',   dob:'1994-09-21', joined:'2020-07-01', dept:'CS'  },
  { firstName:'Pallavi',  lastName:'Ghosh',      email:'pallavi.ghosh@hrms.com',      phone:'9860006003', gender:'female', dob:'1996-01-14', joined:'2021-11-01', dept:'CS'  },
  { firstName:'Dinesh',   lastName:'Tripathi',   email:'dinesh.tripathi@hrms.com',    phone:'9860006004', gender:'male',   dob:'1991-06-30', joined:'2019-04-01', dept:'CS'  },
  { firstName:'Kajal',    lastName:'Mukherjee',  email:'kajal.mukherjee@hrms.com',    phone:'9860006005', gender:'female', dob:'1997-11-25', joined:'2022-05-01', dept:'CS'  },

  // ── IT Support ────────────────────────────────────────────────────────────
  { firstName:'Arjun',    lastName:'Mehta',      email:'arjun.mehta@hrms.com',        phone:'9870007001', gender:'male',   dob:'1990-08-07', joined:'2018-09-01', dept:'IT',  manager:true },
  { firstName:'Preeti',   lastName:'Rajan',      email:'preeti.rajan@hrms.com',       phone:'9870007002', gender:'female', dob:'1993-03-12', joined:'2020-05-01', dept:'IT'  },
  { firstName:'Gaurav',   lastName:'Shukla',     email:'gaurav.shukla@hrms.com',      phone:'9870007003', gender:'male',   dob:'1995-10-28', joined:'2021-08-01', dept:'IT'  },
  { firstName:'Ankita',   lastName:'Jain',       email:'ankita.jain@hrms.com',        phone:'9870007004', gender:'female', dob:'1994-07-16', joined:'2021-03-01', dept:'IT'  },
  { firstName:'Nikhil',   lastName:'Srivastava', email:'nikhil.srivastava@hrms.com',  phone:'9870007005', gender:'male',   dob:'1992-12-04', joined:'2020-09-01', dept:'IT'  },

  // ── Operations ────────────────────────────────────────────────────────────
  { firstName:'Neha',     lastName:'Kapoor',     email:'neha.kapoor@hrms.com',        phone:'9880008001', gender:'female', dob:'1991-02-19', joined:'2019-03-01', dept:'OPS', manager:true },
  { firstName:'Sandeep',  lastName:'Rawat',      email:'sandeep.rawat@hrms.com',      phone:'9880008002', gender:'male',   dob:'1988-06-10', joined:'2018-06-01', dept:'OPS' },
  { firstName:'Meena',    lastName:'Vishwakarma',email:'meena.vishwakarma@hrms.com',  phone:'9880008003', gender:'female', dob:'1994-09-03', joined:'2020-11-01', dept:'OPS' },
  { firstName:'Suresh',   lastName:'Yadav',      email:'suresh.yadav@hrms.com',       phone:'9880008004', gender:'male',   dob:'1989-04-25', joined:'2018-12-01', dept:'OPS' },
  { firstName:'Geeta',    lastName:'Pande',      email:'geeta.pande@hrms.com',        phone:'9880008005', gender:'female', dob:'1996-12-20', joined:'2022-01-15', dept:'OPS' },

  // ── Legal ─────────────────────────────────────────────────────────────────
  { firstName:'Rohan',    lastName:'Chatterjee', email:'rohan.chatterjee@hrms.com',   phone:'9890009001', gender:'male',   dob:'1987-10-14', joined:'2017-04-01', dept:'LEG', manager:true },
  { firstName:'Smita',    lastName:'Kulkarni',   email:'smita.kulkarni@hrms.com',     phone:'9890009002', gender:'female', dob:'1992-01-29', joined:'2019-07-01', dept:'LEG' },
  { firstName:'Abhishek', lastName:'Rao',        email:'abhishek.rao@hrms.com',       phone:'9890009003', gender:'male',   dob:'1993-08-06', joined:'2020-02-01', dept:'LEG' },
  { firstName:'Tanvi',    lastName:'Menon',      email:'tanvi.menon@hrms.com',        phone:'9890009004', gender:'female', dob:'1995-05-22', joined:'2021-10-01', dept:'LEG' },
  { firstName:'Harish',   lastName:'Nambiar',    email:'harish.nambiar@hrms.com',     phone:'9890009005', gender:'male',   dob:'1990-11-17', joined:'2019-06-01', dept:'LEG' },

  // ── Administration ────────────────────────────────────────────────────────
  { firstName:'Kavita',   lastName:'Nair',       email:'kavita.nair@hrms.com',        phone:'9800010001', gender:'female', dob:'1989-03-08', joined:'2018-01-15', dept:'ADM', manager:true },
  { firstName:'Ramesh',   lastName:'Pillai',     email:'ramesh.pillai@hrms.com',      phone:'9800010002', gender:'male',   dob:'1986-07-23', joined:'2016-06-01', dept:'ADM' },
  { firstName:'Lalita',   lastName:'Sharma',     email:'lalita.sharma@hrms.com',      phone:'9800010003', gender:'female', dob:'1993-10-11', joined:'2020-09-01', dept:'ADM' },
  { firstName:'Bhaskar',  lastName:'Mishra',     email:'bhaskar.mishra@hrms.com',     phone:'9800010004', gender:'male',   dob:'1991-01-16', joined:'2019-03-01', dept:'ADM' },
  { firstName:'Varsha',   lastName:'Garg',       email:'varsha.garg@hrms.com',        phone:'9800010005', gender:'female', dob:'1995-06-09', joined:'2021-07-01', dept:'ADM' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pickDesignation(deptCode, isManager) {
  const cfg = DEPT_CONFIG[deptCode];
  if (!cfg) return 'Executive';
  if (isManager) return cfg.designations[0];
  const rest = cfg.designations.slice(1);
  return rest[Math.floor(Math.random() * rest.length)] || cfg.designations[0];
}

function getRole(deptCode, isManager) {
  if (isManager) {
    return deptCode === 'HR' ? 'hr' : deptCode === 'FIN' ? 'finance' : 'manager';
  }
  return DEPT_CONFIG[deptCode]?.role || 'employee';
}

async function getNextEmpCode() {
  const employees = await Employee.find({}, 'employeeCode').lean();
  let maxNum = 0;
  employees.forEach(e => {
    const match = e.employeeCode && e.employeeCode.match(/^EMP(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  });
  return maxNum + 1; // returns next available number
}

// ─── Main seed ────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  // Build dept code → ObjectId map
  const departments = await Department.find({}).lean();
  if (departments.length === 0) {
    console.error('No departments found. Please add departments first.');
    process.exit(1);
  }
  const deptMap = {};
  departments.forEach(d => { deptMap[d.code] = d._id; });

  const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 12);

  let empCodeCounter = await getNextEmpCode();
  let created = 0;
  let skipped = 0;

  for (const raw of RAW_EMPLOYEES) {
    // Skip if email already exists
    const exists = await Employee.findOne({ email: raw.email }).lean();
    if (exists) {
      console.log(`  SKIP (exists): ${raw.email}`);
      skipped++;
      continue;
    }

    const deptId = deptMap[raw.dept];
    if (!deptId) {
      console.warn(`  WARN: dept code "${raw.dept}" not found in DB — skipping ${raw.email}`);
      skipped++;
      continue;
    }

    const empCode = `EMP${String(empCodeCounter).padStart(3, '0')}`;
    empCodeCounter++;

    const role = getRole(raw.dept, !!raw.manager);
    const designation = pickDesignation(raw.dept, !!raw.manager);

    const employee = await Employee.create({
      employeeCode: empCode,
      firstName:    raw.firstName,
      lastName:     raw.lastName,
      email:        raw.email,
      phone:        raw.phone,
      gender:       raw.gender,
      dateOfBirth:  new Date(raw.dob),
      joiningDate:  new Date(raw.joined),
      departmentId: deptId,
      designation,
      role,
      status: 'active',
      address: 'India',
    });

    await User.create({
      employeeId: employee._id,
      email:      employee.email,
      password:   hashedPassword,
      role:       employee.role,
      isActive:   true,
    });

    // Initialise leave balance
    const existingBalance = await LeaveBalance.findOne({ employeeId: employee._id });
    if (!existingBalance) {
      const year = new Date().getFullYear();
      await LeaveBalance.create({
        employeeId: employee._id,
        year,
        casual: { total: 12, used: 0, remaining: 12 },
        sick:   { total: 12, used: 0, remaining: 12 },
        earned: { total: 15, used: 0, remaining: 15 },
      });
    }

    console.log(`  ✓ ${empCode}  ${raw.firstName} ${raw.lastName} (${raw.dept} / ${role}) — ${raw.email}`);
    created++;
  }

  console.log(`\nDone — ${created} created, ${skipped} skipped.`);
  console.log(`Default password for all new accounts: ${SEED_PASSWORD}`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
