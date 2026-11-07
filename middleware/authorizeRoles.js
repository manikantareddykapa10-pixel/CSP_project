const { getDb } = require('../config/db');

const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  try {
    const user = getDb()
      .prepare('SELECT role FROM users WHERE _id = ?')
      .get(req.body.userId);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found' });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have access to this feature' });
    }

    req.userRole = user.role;
    return next();
  } catch (error) {
    console.error('Role authorization failed:', error);
    return res.status(500).json({ success: false, message: 'Could not verify access permissions' });
  }
};

module.exports = authorizeRoles;
