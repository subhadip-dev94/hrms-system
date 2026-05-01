const rbacMiddleware = {
  // Usage: router.use(rbac.hasRole('admin', 'hr'))
  hasRole(...roles) {
    return (req, res, next) => {
      if (!req.session.user) {
        req.flash('error', 'Please login to continue');
        return res.redirect('/auth/login');
      }

      if (!roles.includes(req.session.user.role)) {
        req.flash('error', 'You do not have permission to perform this action');
        return res.redirect('/dashboard');
      }

      next();
    };
  },

  isAdmin(req, res, next) {
    return rbacMiddleware.hasRole('admin')(req, res, next);
  },

  isHRorAdmin(req, res, next) {
    return rbacMiddleware.hasRole('admin', 'hr')(req, res, next);
  },

  isManagerOrAbove(req, res, next) {
    return rbacMiddleware.hasRole('admin', 'hr', 'manager')(req, res, next);
  },
};

module.exports = rbacMiddleware;
