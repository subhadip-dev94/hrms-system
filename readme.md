# HRMS – Project Information & Testing Guide

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Prerequisites](#3-prerequisites)
4. [Installation & Setup](#4-installation--setup)
5. [Environment Variables](#5-environment-variables)
6. [How to Run](#6-how-to-run)
7. [Default Credentials](#7-default-credentials)
8. [Application URLs – Phase 1](#8-application-urls--phase-1)
9. [Application URLs – Phase 2](#9-application-urls--phase-2)
10. [Feature Testing Checklist – Phase 2](#10-feature-testing-checklist--phase-2)
11. [Phase 2 Rules & Behaviours](#11-phase-2-rules--behaviours)
12. [Phase History](#12-phase-history)
6. [How to Run](#6-how-to-run)
7. [Default Credentials](#7-default-credentials)
8. [Application URLs](#8-application-urls)
9. [Feature Testing Checklist](#9-feature-testing-checklist)
10. [Folder Structure](#10-folder-structure)
11. [Database Schemas](#11-database-schemas)
12. [API / Route Reference](#12-api--route-reference)
13. [Known Rules & Behaviours](#13-known-rules--behaviours)
14. [Phase History](#14-phase-history)

---

## 1. Project Overview

A full-stack **Human Resource Management System (HRMS)** built with Node.js.
It allows HR teams to manage employees, departments, user accounts, and
view a summary dashboard — all behind a secure login.

---

## 2. Tech Stack

| Layer          | Technology                              |
|----------------|-----------------------------------------|
| Runtime        | Node.js                                 |
| Framework      | Express.js                              |
| Templating     | EJS + express-ejs-layouts               |
| Database       | MongoDB + Mongoose                      |
| UI Theme       | SB Admin 2 (Bootstrap 4) via CDN        |
| Authentication | JWT + express-session + connect-mongo   |
| File Uploads   | Multer                                  |
| Password Hash  | bcryptjs                                |
| Environment    | dotenv                                  |
| Logging        | morgan                                  |
| Flash Messages | connect-flash                           |

---

## 3. Prerequisites

Make sure these are installed before running the project:

- Node.js v18 or higher     → https://nodejs.org
- MongoDB v6 or higher      → https://www.mongodb.com/try/download/community
- npm (comes with Node.js)

Verify installations:

    node -v
    npm -v
    mongod --version

---

## 4. Installation & Setup

Step 1 – Clone or open the project folder:

    cd d:/finalProject/HRMS

Step 2 – Install dependencies:

    npm install

Step 3 – Make sure MongoDB is running:

    # Windows (run in a separate terminal)
    mongod

    # Or if installed as a service, it starts automatically.
    # Check: open MongoDB Compass and connect to localhost:27017

Step 4 – The .env file is already created. Edit if needed (see Section 5).

Step 5 – Start the server:

    node server.js

    # For development with auto-restart:
    npm run dev

---

## 5. Environment Variables

File: .env (located at project root)

    PORT=3000
    MONGO_URI=mongodb://localhost:27017/hrms
    SESSION_SECRET=hrms_super_secret_session_key_2024
    JWT_SECRET=hrms_super_secret_jwt_key_2024
    NODE_ENV=development

Change MONGO_URI if your MongoDB runs on a different host or port.
Change SESSION_SECRET and JWT_SECRET to strong random strings in production.

---

## 6. How to Run

    # Production mode
    node server.js

    # Development mode (auto-restarts on file change)
    npm run dev

Expected terminal output on success:

    MongoDB connected → localhost
    Seed → Admin created: admin@hrms.com / Admin@123   ← only on first run
    HRMS running → http://localhost:3000
    Environment  → development

Open your browser and go to: http://localhost:3000

---

## 7. Default Credentials

### Admin Account (seeded automatically on first run)

    Email    : admin@hrms.com
    Password : Admin@123
    Role     : admin

### New Employee Accounts (created when you add an employee)

    Password : hrms@1234
    Email    : (whatever email you entered for the employee)
    Role     : (whatever role you selected for the employee)

To change a password after login, that feature will be added in a future phase.

---

## 8. Application URLs

    Base URL : http://localhost:3000

| Page                  | URL                            | Method |
|-----------------------|--------------------------------|--------|
| Root (auto-redirect)  | /                              | GET    |
| Login                 | /auth/login                    | GET    |
| Login submit          | /auth/login                    | POST   |
| Logout                | /auth/logout                   | GET    |
| Dashboard             | /dashboard                     | GET    |
| Employee List         | /employees                     | GET    |
| Add Employee (form)   | /employees/create              | GET    |
| Add Employee (submit) | /employees/create              | POST   |
| Edit Employee (form)  | /employees/:id/edit            | GET    |
| Update Employee       | /employees/:id?_method=PUT     | POST   |
| Terminate Employee    | /employees/:id?_method=DELETE  | POST   |
| Department List       | /departments                   | GET    |
| Add Department (form) | /departments/create            | GET    |
| Add Department submit | /departments/create            | POST   |
| Edit Department form  | /departments/:id/edit          | GET    |
| Update Department     | /departments/:id?_method=PUT   | POST   |
| Delete Department     | /departments/:id?_method=DELETE| POST   |

---

## 9. Feature Testing Checklist

### Login / Logout
- [ ] Go to http://localhost:3000 → should redirect to /auth/login
- [ ] Login with wrong credentials → should show error flash message
- [ ] Login with admin@hrms.com / Admin@123 → should redirect to Dashboard
- [ ] Click user avatar (top-right) → Logout → should return to login page

### Dashboard
- [ ] Shows 4 stat cards: Total Employees, Active Employees, Departments, New This Month
- [ ] Shows Recent Employees table (last 5)
- [ ] Quick-link buttons: Add Employee, Add Department

### Department Module
- [ ] Navigate to Departments from sidebar
- [ ] Create a new department (e.g. Name: Engineering, Code: ENG)
- [ ] Edit the department
- [ ] Try to delete a department that has active employees → should be BLOCKED with error
- [ ] Delete a department with 0 employees → should succeed

### Employee Module
- [ ] Navigate to Employees from sidebar
- [ ] Create a new employee (fill all required fields)
      → Employee Code auto-generates (EMP002, EMP003, etc.)
      → A user account is also created with password: hrms@1234
- [ ] Upload a profile photo (JPEG/PNG, max 2MB)
- [ ] Edit an employee — change department, role, status
- [ ] Search employees by name / email / code
- [ ] Filter by Department
- [ ] Filter by Status (active / resigned / terminated)
- [ ] Click Terminate (red icon) → status becomes Terminated, login deactivated
- [ ] Verify terminated employee cannot login

### File Upload
- [ ] Profile photos stored in: public/uploads/profiles/
- [ ] Allowed: .jpg, .jpeg, .png, .gif, .webp
- [ ] Rejected: .pdf, .exe, etc.
- [ ] Max size: 2 MB — larger files should be rejected

### Session / Security
- [ ] Try accessing /dashboard without logging in → redirected to login
- [ ] Try accessing /employees without logging in → redirected to login
- [ ] Session expires after 24 hours

---

## 10. Folder Structure

    hrms/
    ├── src/
    │   ├── config/
    │   │   └── db.js               ← MongoDB connection + admin seed
    │   ├── modules/
    │   │   ├── auth/
    │   │   │   ├── user.model.js
    │   │   │   ├── auth.routes.js
    │   │   │   ├── auth.controller.js
    │   │   │   └── auth.service.js
    │   │   ├── employee/
    │   │   │   ├── employee.model.js
    │   │   │   ├── employee.routes.js
    │   │   │   ├── employee.controller.js
    │   │   │   └── employee.service.js
    │   │   ├── department/
    │   │   │   ├── department.model.js
    │   │   │   ├── department.routes.js
    │   │   │   ├── department.controller.js
    │   │   │   └── department.service.js
    │   │   └── dashboard/
    │   │       ├── dashboard.routes.js
    │   │       └── dashboard.controller.js
    │   ├── middlewares/
    │   │   ├── auth.middleware.js   ← protects all routes
    │   │   └── rbac.middleware.js   ← role-based access control
    │   └── utils/
    │       └── response.js         ← JSON response helpers
    ├── views/
    │   ├── layout.ejs              ← main authenticated layout
    │   ├── partials/
    │   │   ├── navbar.ejs
    │   │   └── sidebar.ejs
    │   └── pages/
    │       ├── auth/login.ejs
    │       ├── dashboard/index.ejs
    │       ├── employee/           ← index, create, edit
    │       ├── department/         ← index, create, edit
    │       └── errors/404.ejs
    ├── public/
    │   └── uploads/profiles/       ← uploaded profile photos (auto-created)
    ├── .env
    ├── .gitignore
    ├── package.json
    ├── server.js
    └── PROJECT_INFO.md             ← this file

---

## 11. Database Schemas

### User
    Field       : Type         : Notes
    employeeId  : ObjectId     : ref → Employee
    email       : String       : unique, lowercase
    password    : String       : bcrypt hashed
    role        : String       : admin | hr | manager | employee | finance
    isActive    : Boolean      : false = cannot login
    lastLogin   : Date
    timestamps  : true

### Employee
    Field         : Type     : Notes
    employeeCode  : String   : auto EMP001, EMP002...
    firstName     : String   : required
    lastName      : String   : required
    email         : String   : unique, required
    phone         : String
    gender        : String   : male | female | other
    dateOfBirth   : Date
    joiningDate   : Date
    departmentId  : ObjectId : ref → Department
    designation   : String
    managerId     : ObjectId : ref → Employee (self)
    role          : String   : admin | hr | manager | employee | finance
    status        : String   : active | resigned | terminated
    address       : String
    bankDetails   : Object   : { bankName, accountNumber, ifscCode }
    profilePhoto  : String   : path to uploaded image
    timestamps    : true

### Department
    Field      : Type     : Notes
    name       : String   : unique, required
    code       : String   : unique, uppercase, required
    description: String
    managerId  : ObjectId : ref → Employee
    isActive   : Boolean
    timestamps : true

---

## 12. API / Route Reference

### Auth Routes  (prefix: /auth)
    GET  /login    → show login page
    POST /login    → authenticate, create session
    GET  /logout   → destroy session

### Employee Routes  (prefix: /employees)  [requires login]
    GET    /                  → list all employees (supports ?search= ?departmentId= ?status=)
    GET    /create            → show add form
    POST   /create            → create employee + user account
    GET    /:id/edit          → show edit form
    POST   /:id?_method=PUT   → update employee
    POST   /:id?_method=DELETE→ soft delete (status = terminated)

### Department Routes  (prefix: /departments)  [requires login]
    GET    /                  → list all departments
    GET    /create            → show add form
    POST   /create            → create department
    GET    /:id/edit          → show edit form
    POST   /:id?_method=PUT   → update department
    POST   /:id?_method=DELETE→ delete (blocked if employees assigned)

### Dashboard Routes  (prefix: /dashboard)  [requires login]
    GET    /    → stats cards + recent employees table

---

## 13. Known Rules & Behaviours

1. EMPLOYEE CODES
   Auto-generated as EMP001, EMP002, EMP003...
   The system finds the highest existing number and increments it.
   Gaps in sequence (due to terminations) are handled safely.

2. USER ACCOUNT CREATION
   Every time you create an employee, a User login account is also
   created automatically with:
     Email    = employee's email
     Password = hrms@1234
     Role     = same as employee role

3. SOFT DELETE
   Terminating an employee does NOT delete the record from the database.
   It sets status = 'terminated' and sets isActive = false on the
   linked user account (they can no longer log in).

4. DEPARTMENT DELETE PROTECTION
   You cannot delete a department if it has 1 or more active/resigned
   employees assigned to it. Reassign or terminate them first.

5. PROFILE PHOTO
   Allowed formats: jpg, jpeg, png, gif, webp
   Maximum size: 2 MB
   Storage path: public/uploads/profiles/

6. ROLE SYNC
   If you change an employee's role in the edit form, their linked
   User account role is updated automatically.

7. SESSION DURATION
   Login sessions last 24 hours. After that the user is redirected
   to the login page.

8. METHOD OVERRIDE
   HTML forms only support GET and POST. DELETE and PUT actions
   in forms are handled via: action="/path?_method=DELETE"

---

## 9. Application URLs – Phase 2

    Base URL : http://localhost:3000

| Page                        | URL                                   | Method | Access          |
|-----------------------------|---------------------------------------|--------|-----------------|
| Holiday Calendar            | /holidays                             | GET    | All             |
| Add Holiday (form)          | /holidays/create                      | GET    | Admin / HR      |
| Add Holiday (submit)        | /holidays                             | POST   | Admin / HR      |
| Delete Holiday              | /holidays/:id?_method=DELETE          | POST   | Admin / HR      |
| My Attendance               | /attendance/my                        | GET    | All             |
| Check In                    | /attendance/checkin                   | POST   | All             |
| Check Out                   | /attendance/checkout                  | POST   | All             |
| All Attendance (HR view)    | /attendance                           | GET    | Admin / HR      |
| Manual Mark Attendance      | /attendance/mark                      | POST   | Admin / HR      |
| Monthly Report              | /attendance/report                    | GET    | Admin / HR      |
| My Leaves + Balance         | /leaves/my                            | GET    | All             |
| Apply Leave (form)          | /leaves/create                        | GET    | All             |
| Apply Leave (submit)        | /leaves                               | POST   | All             |
| Approval Queue              | /leaves/approvals                     | GET    | Manager/HR/Admin|
| Approve Leave               | /leaves/:id/approve?_method=PUT       | POST   | Manager/HR/Admin|
| Reject Leave                | /leaves/:id/reject?_method=PUT        | POST   | Manager/HR/Admin|
| Cancel Leave                | /leaves/:id/cancel?_method=PUT        | POST   | Own employee    |
| All Leaves (HR view)        | /leaves                               | GET    | Admin / HR      |

---

## 10. Feature Testing Checklist – Phase 2

### Holiday Module
- [ ] Login as Admin → Holidays in sidebar
- [ ] Add Holiday: Name = "Diwali", Date = any future date, Type = Public
- [ ] Holiday list shows the new entry with correct day of week
- [ ] Try adding a holiday on same date → error: "A holiday already exists"
- [ ] Delete a holiday → removed from list
- [ ] Year filter dropdown changes the displayed holidays

### Attendance Module
- [ ] Login as any employee → sidebar shows "My Attendance"
- [ ] Click Check In → success flash, button changes to Check Out
- [ ] Click Check Out → success flash, shows hours worked
- [ ] Try Check In again → error: "You have already checked in today"
- [ ] Try Check Out again → error: "You have already checked out today"
- [ ] Check In after 9:30 AM → status shows "Late" badge
- [ ] My Attendance page: change month/year filter → shows records table
- [ ] Summary cards (Present, Late, Absent, Total Hours) update correctly
- [ ] Login as HR/Admin → "All Attendance" shows all employees
- [ ] Use employee + month filter on All Attendance
- [ ] Expand "Manually Mark Attendance" → mark an employee as Absent
- [ ] Attendance Report: select employee + month → generates summary
- [ ] Dashboard (HR/Admin): shows Today's Office Summary card

### Leave Module
- [ ] Login as employee → My Leaves shows balance cards
      Casual: 12, Sick: 12, Earned: 15 (on first use)
- [ ] Apply Leave: select Casual, pick dates (Mon–Fri), add reason → submit
      Working day count shown live as you select dates
- [ ] My Leaves shows the new leave as "Pending"
- [ ] Try to apply overlapping leave → error: "You already have a leave"
- [ ] Try to apply on a holiday date → error: "Cannot apply leave on a holiday"
- [ ] Login as Manager → Approvals in sidebar shows the pending leave
- [ ] Manager clicks Approve → status becomes "Mgr Approved"
      (employee sees "Mgr Approved" badge on My Leaves)
- [ ] Login as HR/Admin → Approvals shows "Mgr Approved" leave
- [ ] HR clicks Approve → status becomes "Approved"
      Leave balance deducted automatically (check My Leaves balance)
- [ ] Test Reject: HR/Manager opens reject modal, enters reason → Rejected
      Employee sees "Rejected" status on My Leaves
- [ ] Employee cancels a Pending leave → cancelled, no balance change
- [ ] Employee cancels an Approved future leave → cancelled, balance restored
- [ ] Employee tries to cancel approved past leave → error message shown
- [ ] All Leaves (HR): filter by employee, type, status, month

### Dashboard (Phase 2 additions)
- [ ] Today's Attendance widget shows Check In / Check Out button
- [ ] After check-in: widget shows time and Check Out button
- [ ] After check-out: widget shows both times and hours worked
- [ ] Pending Approvals widget visible to manager/hr/admin with count
- [ ] Upcoming Holidays table shows next 3 holidays

---

## 11a. Application URLs – Phase 3

    Base URL : http://localhost:3000

| Page                          | URL                                    | Method | Access              |
|-------------------------------|----------------------------------------|--------|---------------------|
| Salary Structures list        | /salary                                | GET    | Admin / HR / Finance|
| Assign Salary (form)          | /salary/create                         | GET    | Admin / HR / Finance|
| Assign Salary (submit)        | /salary/create                         | POST   | Admin / HR / Finance|
| Edit Salary (form)            | /salary/:employeeId/edit               | GET    | Admin / HR / Finance|
| Update Salary                 | /salary/:employeeId?_method=PUT        | POST   | Admin / HR / Finance|
| Payroll List                  | /payroll                               | GET    | Admin / HR / Finance|
| Run Payroll (form)            | /payroll/run                           | GET    | Admin / HR / Finance|
| Run Payroll (submit)          | /payroll/run                           | POST   | Admin / HR / Finance|
| Payroll Detail + Payslips     | /payroll/:id                           | GET    | Admin / HR / Finance|
| Mark Payroll as Paid          | /payroll/:id/mark-paid                 | POST   | Admin / HR / Finance|
| My Payslips                   | /payslips/my                           | GET    | All roles           |
| View Payslip                  | /payslips/:id                          | GET    | Own or privileged   |
| Download PDF                  | /payslips/:id/download                 | GET    | Own or privileged   |
| Email Payslip                 | /payslips/:id/email                    | POST   | Admin / HR / Finance|

---

## 11b. Feature Testing Checklist – Phase 3

### Salary Module
- [ ] Login as Admin → sidebar shows "Salary Structures" under Payroll section
- [ ] Go to /salary → empty table initially
- [ ] Click "Assign Salary" → select an active employee, enter Basic Salary = 30000
      → HRA auto = 12000, PF auto = 3600, ESI auto = 0 (gross > 21000), Tax auto-calculated
- [ ] Submit → salary structure appears in list
- [ ] Click Edit on the salary → change Basic Salary → revision saved to history
- [ ] Edit page shows "Revision History" table for that employee
- [ ] Assign salary to a second employee

### Payroll Module
- [ ] Go to /payroll → empty table initially
- [ ] Click "Run Payroll" → select current month and year → confirm and submit
- [ ] Payroll record appears with status = "Processed"
- [ ] Click "View" → see summary cards (total employees, gross, deductions, net pay)
- [ ] Payslips table shows one row per salaried employee with present/absent days
- [ ] Try running payroll for same month again → error: "Payroll already processed"
- [ ] Try running for a future month → error: "Cannot process payroll for a future month"
- [ ] Click "Mark as Paid" → status changes to "Paid"
- [ ] Dashboard (HR/Admin/Finance) shows Latest Payroll widget with net pay and month

### Payslip Module
- [ ] From Payroll detail page, click View icon for a payslip → opens payslip view
- [ ] Payslip view shows: attendance summary, earnings breakdown, deductions, NET PAY
- [ ] Click "Download PDF" → PDF downloaded, status changes to "Downloaded"
- [ ] Click "Email to Employee" → console log shows email (stub), status changes to "Emailed"
- [ ] Employee (non-admin) logs in → sidebar shows "My Payslips"
- [ ] /payslips/my shows their payslips list
- [ ] Employee can view and download their own payslip
- [ ] Employee cannot access another employee's payslip → access denied

### Payroll Calculations (Verify)
- [ ] Basic = 30000 → HRA = 12000, Gross = 42000
- [ ] PF = 3600 (12% of 30000)
- [ ] ESI = 0 (Gross 42000 > 21000 threshold)
- [ ] If employee absent 2 days out of 22 working days: deduction = (42000/22) × 2 = 3818.18
- [ ] Overtime: if 5 extra hours logged → (30000/26/8) × 1.5 × 5

---

## 11. Phase 2 Rules & Behaviours

1. LATE CHECK-IN
   Check-in after 9:30 AM is automatically marked as "Late".
   The attendance status is set to 'late', not 'present'.
   (Both present and late count towards attendance in reports.)

2. WORK HOURS & OVERTIME
   workHours = (checkOut time - checkIn time) in decimal hours.
   overtime  = workHours - 8  (only if > 8 hours, else 0).
   Both are rounded to 2 decimal places.

3. LEAVE BALANCE INITIALISATION
   Every new employee automatically gets:
     Casual: 12 days, Sick: 12 days, Earned: 15 days
   This is done when the employee is created (Phase 1 flow).

4. LEAVE APPROVAL FLOW
   Step 1: Employee applies → status = 'pending'
   Step 2: Manager approves → status = 'manager_approved'
   Step 3: HR/Admin approves → status = 'approved'
            → leave balance is deducted at this point
   Either Manager or HR can reject at any step.
   Admin can bypass step 2 and directly approve (goes straight to 'approved').

5. LEAVE WORKING DAYS CALCULATION
   Only Mon–Fri, non-holiday days count.
   If the selected range is entirely weekends/holidays, the form is blocked.

6. CANCEL RULES
   pending / manager_approved → can always cancel (no balance change)
   approved + future start date → can cancel (balance restored)
   approved + start date already passed → BLOCKED

7. HOLIDAYS IN LEAVE
   The leave service fetches holidays in the requested date range and
   excludes them from working day count.

8. EMAIL NOTIFICATIONS
   All email functions log to console in development (stub mode).
   To wire up real email, replace the internals of src/utils/email.util.js
   with nodemailer/SendGrid etc.

9. RBAC IN SIDEBAR
   Sidebar links are conditionally shown based on currentUser.role:
     All roles        → My Attendance, My Leaves, Holiday Calendar
     Manager/HR/Admin → Approvals queue
     HR/Admin         → All Attendance, Report, All Leaves, Manage Holidays
     Employee/Manager → Apply Leave link in sidebar

---

## 12a. Phase 3 Rules & Behaviours

1. SALARY AUTO-CALCULATIONS
   When you enter a Basic Salary, the system auto-calculates:
     HRA              = 40% of Basic
     PF (deduction)   = 12% of Basic
     ESI (deduction)  = 0.75% of Gross, but ONLY if Gross ≤ ₹21,000; else 0
     Income Tax       = Indian new tax regime slabs, monthly equivalent
   All values stored in the salary document.

2. SALARY REVISION HISTORY
   When you edit an employee's salary structure, the current values are
   automatically archived into revisionHistory[] before the update is applied.
   The edit page shows the full revision history.

3. PAYROLL RUN LOGIC
   Payroll can only be run once per month/year (unique index enforces this).
   Only active employees with an active salary structure receive a payslip.
   Per-day salary = grossSalary / workingDaysInMonth
   Absent days    = workingDays - presentDays - approvedLeaveDays
   Absent deduction = perDaySalary × absentDays
   Overtime pay   = (basic / 26 / 8) × 1.5 × overtimeHours

4. PDF GENERATION
   On payroll run, a PDF payslip is generated for each employee.
   Files are saved to: public/payslips/[year]/[MM]/[employeeCode].pdf
   The pdfPath is stored in the Payslip document.
   PDF generation failure is non-fatal (logged, payslip record still saved).

5. PAYSLIP ACCESS CONTROL
   Employees can only view and download their own payslips (/payslips/my).
   Admin / HR / Finance can access any payslip via /payslips/:id.

6. WORKING DAYS IN PAYROLL
   Working days = total days in month, excluding weekends and public holidays.
   This matches the leave and attendance working-day calculation from Phase 2.

---

## 12. Phase History

### Phase 1  (Completed — April 2026)
  - Project setup (Express, MongoDB, EJS, SB Admin 2 UI)
  - Authentication: login, logout, session, JWT
  - Default admin seed on first run
  - Employee module: full CRUD + search + filter + photo upload
  - Department module: full CRUD + delete protection
  - Dashboard: stat cards + recent employees table
  - Auth middleware + RBAC middleware

### Phase 2  (Completed — April 2026)
  New utilities:
    - src/utils/errorCodes.util.js   ← centralised error messages
    - src/utils/validation.util.js   ← validateHoliday, validateAttendance, validateLeaveApplication
    - src/utils/email.util.js        ← stub email functions (non-blocking)
    - src/utils/helper.util.js       ← calculateWorkingDays, isWeekend, isHoliday, formatTime, etc.
  New modules:
    - Holiday:    CRUD, year filter, upcoming holidays on dashboard
    - Attendance: Check-in/out, late detection, work hours, overtime, HR manual mark, monthly report
    - Leave:      Multi-level approval (pending→manager_approved→approved), balance tracking,
                  cancel with balance restoration, overlap + holiday validation
  Phase 1 updates:
    - employee.service.js → initLeaveBalance called on every new employee
    - dashboard.controller.js → now fetches Phase 2 data
    - dashboard/index.ejs → check-in widget, pending approvals, upcoming holidays
    - sidebar.ejs → role-based Phase 2 nav items

### Phase 3  (Completed — April 2026)
  New packages:
    - pdfkit      ← PDF generation for payslips
    - fs-extra    ← ensureDir + pathExists helpers
  Utility additions:
    - errorCodes.util.js  → SALARY_NOT_ASSIGNED, PAYROLL_ALREADY_RUN, PAYROLL_NOT_FOUND,
                            PAYSLIP_NOT_FOUND, INVALID_MONTH, SALARY_REVISION_EXISTS, NO_ATTENDANCE_DATA
    - validation.util.js  → validateSalaryStructure, validatePayrollRun
    - email.util.js       → sendPayslipEmail, sendPayrollProcessedEmail
    - helper.util.js      → getMonthName, calculateTax, calculatePF, calculateESI, roundToTwo
  New modules:
    - Salary:   Assign/revise salary per employee; auto HRA (40%), PF (12%), ESI (0.75%), Tax slabs;
                revision history tracked
    - Payroll:  Run payroll for a month — generates payslips for all active-salary employees;
                per-day deduction for absences; overtime pay; mark as paid
    - Payslip:  Per-employee payslip with attendance breakdown; PDF saved to public/payslips/;
                download + email (stub); employee self-service view (/payslips/my)
  Phase 2 updates:
    - dashboard.controller.js → latestPayroll fetched for finance/hr/admin
    - dashboard/index.ejs     → payroll widgets (latest payroll card, gross expense, quick actions)
    - sidebar.ejs             → Payroll section (Salary Structures + Payroll) for finance/hr/admin;
                                My Payslips link for all roles

### Phase 4  (Planned)
    - Performance Reviews
    - Announcements / Notices
    - Reports & exports (PDF / Excel)
    - Admin settings panel
    - Change password functionality

---

_Last updated: Phase 3 complete_
