const jwt = require('jsonwebtoken');

const authMiddleware = {
  isAuthenticated(req, res, next) {
    if (!req.session.user || !req.session.token) {
      req.flash('error', 'Please login to continue');
      return res.redirect('/auth/login');
    }

    try {
      const decoded = jwt.verify(req.session.token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      req.session.destroy(() => {});
      req.flash('error', 'Session expired. Please login again.');
      res.redirect('/auth/login');
    }
  },
};

module.exports = authMiddleware;
