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
