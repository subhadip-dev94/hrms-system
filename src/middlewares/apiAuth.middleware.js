const jwt = require('jsonwebtoken');

// ─── Verify Bearer token ───────────────────────────────────────────────────────
function verifyApiToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token required',
      code: 'UNAUTHORIZED',
    });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.apiUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
      code: 'UNAUTHORIZED',
    });
  }
}

// ─── Role-based access control factory ────────────────────────────────────────
function apiAuthorize(...roles) {
  return (req, res, next) => {
    if (!req.apiUser) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }
    if (!roles.includes(req.apiUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
        code: 'FORBIDDEN',
      });
    }
    next();
  };
}

module.exports = { verifyApiToken, apiAuthorize };
