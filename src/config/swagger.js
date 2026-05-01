const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// ─── Swagger definition ───────────────────────────────────────────────────────
const definition = {
  openapi: '3.0.0',
  info: {
    title: 'HRMS API',
    version: '1.0.0',
    description: 'Complete HRMS REST API Documentation — Phases 1 through 6',
  },
  servers: [
    { url: 'http://localhost:3000/api/v1', description: 'Development server' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      // ── Common ──
      PaginationMeta: {
        type: 'object',
        properties: {
          total:      { type: 'integer' },
          page:       { type: 'integer' },
          limit:      { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data:    { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          code:    { type: 'string' },
        },
      },
      // ── Employee ──
      Employee: {
        type: 'object',
        properties: {
          _id:          { type: 'string' },
          employeeCode: { type: 'string', example: 'EMP001' },
          firstName:    { type: 'string' },
          lastName:     { type: 'string' },
          email:        { type: 'string', format: 'email' },
          phone:        { type: 'string' },
          role:         { type: 'string', enum: ['admin','hr','manager','employee','finance'] },
          status:       { type: 'string', enum: ['active','resigned','terminated'] },
          designation:  { type: 'string' },
          profilePhoto: { type: 'string' },
          joiningDate:  { type: 'string', format: 'date' },
          departmentId: { type: 'string' },
          managerId:    { type: 'string' },
        },
      },
      // ── Department ──
      Department: {
        type: 'object',
        properties: {
          _id:         { type: 'string' },
          name:        { type: 'string' },
          code:        { type: 'string' },
          description: { type: 'string' },
          managerId:   { type: 'string' },
          isActive:    { type: 'boolean' },
        },
      },
      // ── Holiday ──
      Holiday: {
        type: 'object',
        properties: {
          _id:  { type: 'string' },
          name: { type: 'string' },
          date: { type: 'string', format: 'date' },
          type: { type: 'string', enum: ['public','optional'] },
          year: { type: 'integer' },
        },
      },
      // ── Attendance ──
      Attendance: {
        type: 'object',
        properties: {
          _id:        { type: 'string' },
          employeeId: { type: 'string' },
          date:       { type: 'string', format: 'date' },
          checkIn:    { type: 'string', format: 'date-time' },
          checkOut:   { type: 'string', format: 'date-time' },
          workHours:  { type: 'number' },
          status:     { type: 'string', enum: ['present','absent','late','half-day','on-leave'] },
        },
      },
      // ── Leave ──
      Leave: {
        type: 'object',
        properties: {
          _id:       { type: 'string' },
          employeeId:{ type: 'string' },
          leaveType: { type: 'string' },
          startDate: { type: 'string', format: 'date' },
          endDate:   { type: 'string', format: 'date' },
          totalDays: { type: 'number' },
          reason:    { type: 'string' },
          status:    { type: 'string', enum: ['pending','approved','rejected','cancelled'] },
        },
      },
      LeaveBalance: {
        type: 'object',
        properties: {
          employeeId:   { type: 'string' },
          annual:       { type: 'number' },
          sick:         { type: 'number' },
          casual:       { type: 'number' },
          maternity:    { type: 'number' },
          paternity:    { type: 'number' },
          unpaid:       { type: 'number' },
        },
      },
      // ── Salary ──
      Salary: {
        type: 'object',
        properties: {
          _id:        { type: 'string' },
          employeeId: { type: 'string' },
          basicSalary:{ type: 'number' },
          hra:        { type: 'number' },
          ta:         { type: 'number' },
          grossSalary:{ type: 'number' },
          netSalary:  { type: 'number' },
          effectiveFrom:{ type: 'string', format: 'date' },
        },
      },
      // ── Payroll ──
      Payroll: {
        type: 'object',
        properties: {
          _id:            { type: 'string' },
          month:          { type: 'integer' },
          year:           { type: 'integer' },
          totalEmployees: { type: 'integer' },
          totalGross:     { type: 'number' },
          totalNetPay:    { type: 'number' },
          status:         { type: 'string', enum: ['processed','paid'] },
        },
      },
      // ── Payslip ──
      Payslip: {
        type: 'object',
        properties: {
          _id:       { type: 'string' },
          payrollId: { type: 'string' },
          employeeId:{ type: 'string' },
          month:     { type: 'integer' },
          year:      { type: 'integer' },
          grossPay:  { type: 'number' },
          netPay:    { type: 'number' },
          pdfPath:   { type: 'string' },
        },
      },
      // ── Timesheet ──
      Timesheet: {
        type: 'object',
        properties: {
          _id:            { type: 'string' },
          employeeId:     { type: 'string' },
          date:           { type: 'string', format: 'date' },
          projectName:    { type: 'string' },
          taskDescription:{ type: 'string' },
          hours:          { type: 'number' },
          workType:       { type: 'string', enum: ['billable','non-billable','internal'] },
          status:         { type: 'string', enum: ['draft','submitted','approved','rejected'] },
        },
      },
      // ── Performance ──
      KPI: {
        type: 'object',
        properties: {
          _id:         { type: 'string' },
          employeeId:  { type: 'string' },
          title:       { type: 'string' },
          target:      { type: 'number' },
          currentValue:{ type: 'number' },
          unit:        { type: 'string' },
          status:      { type: 'string' },
        },
      },
      Review: {
        type: 'object',
        properties: {
          _id:        { type: 'string' },
          employeeId: { type: 'string' },
          reviewerId: { type: 'string' },
          period:     { type: 'string' },
          rating:     { type: 'number' },
          grade:      { type: 'string' },
          comments:   { type: 'string' },
        },
      },
      // ── Recruitment ──
      Job: {
        type: 'object',
        properties: {
          _id:          { type: 'string' },
          jobCode:      { type: 'string' },
          title:        { type: 'string' },
          department:   { type: 'string' },
          status:       { type: 'string', enum: ['open','closed','on-hold'] },
          openings:     { type: 'integer' },
          postedDate:   { type: 'string', format: 'date' },
        },
      },
      Candidate: {
        type: 'object',
        properties: {
          _id:          { type: 'string' },
          jobId:        { type: 'string' },
          name:         { type: 'string' },
          email:        { type: 'string' },
          phone:        { type: 'string' },
          currentStage: { type: 'string' },
          resumeUrl:    { type: 'string' },
        },
      },
      // ── Expense ──
      Expense: {
        type: 'object',
        properties: {
          _id:        { type: 'string' },
          expenseCode:{ type: 'string' },
          employeeId: { type: 'string' },
          title:      { type: 'string' },
          amount:     { type: 'number' },
          category:   { type: 'string' },
          status:     { type: 'string', enum: ['draft','submitted','approved','rejected','paid'] },
          receiptUrl: { type: 'string' },
        },
      },
      // ── Announcement ──
      Announcement: {
        type: 'object',
        properties: {
          _id:         { type: 'string' },
          title:       { type: 'string' },
          body:        { type: 'string' },
          targetRoles: { type: 'array', items: { type: 'string' } },
          isPinned:    { type: 'boolean' },
          isActive:    { type: 'boolean' },
          createdAt:   { type: 'string', format: 'date-time' },
        },
      },
      // ── Document ──
      Document: {
        type: 'object',
        properties: {
          _id:                 { type: 'string' },
          employeeId:          { type: 'string' },
          documentType:        { type: 'string' },
          title:               { type: 'string' },
          fileUrl:             { type: 'string' },
          fileType:            { type: 'string' },
          fileSize:            { type: 'number' },
          isVisibleToEmployee: { type: 'boolean' },
          expiryDate:          { type: 'string', format: 'date' },
        },
      },
      // ── Offboarding ──
      Offboarding: {
        type: 'object',
        properties: {
          _id:            { type: 'string' },
          employeeId:     { type: 'string' },
          exitType:       { type: 'string' },
          lastWorkingDay: { type: 'string', format: 'date' },
          reason:         { type: 'string' },
          status:         { type: 'string', enum: ['initiated','in-progress','completed','cancelled'] },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

const options = {
  definition,
  apis: ['./src/api/v1/*.api.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec, swaggerUi };
