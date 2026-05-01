require('dotenv').config();
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.local' });
}
const http = require('http');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const morgan = require('morgan');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const connectDB = require('./src/config/db');
const { swaggerSpec, swaggerUi } = require('./src/config/swagger');
const { initSocket } = require('./src/config/socket');
// Cloudinary initialised on require (no return value needed)
require('./src/config/cloudinary');

const app = express();

// ─── Database ─────────────────────────────────────────────────────────────────
connectDB();

// Trust Railway's reverse proxy so secure cookies and req.ip work correctly
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // disabled to allow CDN scripts (Chart.js, Bootstrap)
}));

// ─── CORS (API routes only) ───────────────────────────────────────────────────
app.use('/api', cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── View Engine ──────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ─── Method Override (PUT/DELETE via forms) ───────────────────────────────────
app.use(methodOverride('_method'));

// ─── HTTP Logging ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Session ──────────────────────────────────────────────────────────────────
// Extracted to variable so socket.io can share the same session store
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    touchAfter: 24 * 3600,
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && process.env.APP_URL?.startsWith('https'),
    sameSite: 'lax',
  },
});

app.use(sessionMiddleware);

// ─── Flash Messages ───────────────────────────────────────────────────────────
app.use(flash());

// ─── Global Template Locals ───────────────────────────────────────────────────
const navCache = require('./src/utils/cache.util');

app.use(async (req, res, next) => {
  res.locals.success = req.flash('success')[0] || null;
  res.locals.error = req.flash('error')[0] || null;
  res.locals.currentUser = req.session.user || null;
  res.locals.user = req.session.user || null;
  res.locals.currentPath = req.path;
  res.locals.unreadAnnouncementCount = 0;
  res.locals.navbarAnnouncements = [];
  res.locals.expiringDocCount = 0;
  res.locals.pendingLeaveCount = 0;

  if (req.session.user && req.session.user.employeeId) {
    const uid  = String(req.session.user.employeeId);
    const role = req.session.user.role;

    // ── Announcement badge + dropdown (30 s TTL per user) ─────────────────
    try {
      const annKey = `nav:ann:${uid}:${role}`;
      let annData  = navCache.get(annKey);
      if (annData === undefined) {
        const announcementService = require('./src/modules/announcement/announcement.service');
        const [count, latest] = await Promise.all([
          announcementService.getUnreadCount(req.session.user.employeeId, role),
          announcementService.getLatestForNavbar(req.session.user.employeeId, role, 5),
        ]);
        annData = { count, latest };
        navCache.set(annKey, annData, 30);
      }
      res.locals.unreadAnnouncementCount = annData.count;
      res.locals.navbarAnnouncements     = annData.latest;
    } catch (_) {}

    // ── Pending leave count (30 s TTL per user) ────────────────────────────
    if (['admin', 'hr', 'manager'].includes(role)) {
      try {
        const leaveKey = `nav:leave:${uid}:${role}`;
        let pending    = navCache.get(leaveKey);
        if (pending === undefined) {
          const leaveService = require('./src/modules/leave/leave.service');
          pending = await leaveService.getPendingCount(req.session.user.employeeId, role);
          navCache.set(leaveKey, pending, 30);
        }
        res.locals.pendingLeaveCount = pending;
      } catch (_) {}
    }

    // ── Expiring documents count (60 s TTL shared across hr/admin) ────────
    if (['admin', 'hr'].includes(role)) {
      try {
        const docKey  = `nav:doc:${role}`;
        let docCount  = navCache.get(docKey);
        if (docCount === undefined) {
          const documentService = require('./src/modules/document/document.service');
          docCount = await documentService.getExpiringCount(30);
          navCache.set(docKey, docCount, 60);
        }
        res.locals.expiringDocCount = docCount;
      } catch (_) {}
    }
  }
  next();
});

// ─── Swagger API Docs ─────────────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customSiteTitle: 'HRMS API Docs',
}));

// ─── REST API v1 ──────────────────────────────────────────────────────────────
app.use('/api/v1', require('./src/api/v1/index'));

// ─── Static file serving for local PDF outputs ────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/payslips', express.static(path.join(__dirname, 'public/payslips')));
app.use('/reports',  express.static(path.join(__dirname, 'public/reports')));

// ─── Routes ───────────────────────────────────────────────────────────────────
// Phase 1
app.use('/auth',    require('./src/modules/auth/auth.routes'));
app.use('/profile', require('./src/modules/auth/profile.routes'));
app.use('/dashboard', require('./src/modules/dashboard/dashboard.routes'));
app.use('/employees', require('./src/modules/employee/employee.routes'));
app.use('/departments', require('./src/modules/department/department.routes'));

// Phase 2
app.use('/holidays', require('./src/modules/holiday/holiday.routes'));
app.use('/attendance', require('./src/modules/attendance/attendance.routes'));
app.use('/leaves', require('./src/modules/leave/leave.routes'));

// Phase 3
app.use('/salary', require('./src/modules/salary/salary.routes'));
app.use('/payroll', require('./src/modules/payroll/payroll.routes'));
app.use('/payslips', require('./src/modules/payslip/payslip.routes'));

// Phase 4
app.use('/timesheet', require('./src/modules/timesheet/timesheet.routes'));
app.use('/performance', require('./src/modules/performance/performance.routes'));

// Phase 5
app.use('/recruitment', require('./src/modules/recruitment/recruitment.routes'));
app.use('/expense', require('./src/modules/expense/expense.routes'));
app.use('/announcements', require('./src/modules/announcement/announcement.routes'));

// Phase 6
app.use('/reports', require('./src/modules/reports/reports.routes'));
app.use('/documents', require('./src/modules/document/document.routes'));
app.use('/offboarding', require('./src/modules/offboarding/offboarding.routes'));

// Health check (Railway probes this to confirm the app is running)
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Root redirect
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.redirect('/auth/login');
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Route not found', code: 'NOT_FOUND' });
  }
  res.status(404).render('pages/errors/404', { layout: false, title: 'Page Not Found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ success: false, message: 'An unexpected error occurred', code: 'SERVER_ERROR' });
  }
  req.flash('error', 'Something went wrong. Please try again.');
  res.redirect('back');
});

// ─── HTTP Server + Socket.io ──────────────────────────────────────────────────
const httpServer = http.createServer(app);
initSocket(httpServer, sessionMiddleware);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`HRMS running → http://localhost:${PORT}`);
  console.log(`Environment  → ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
