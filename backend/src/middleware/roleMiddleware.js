export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    console.log('=== AUTHORIZATION CHECK ===');
    console.log('User role:', req.user?.role);
    console.log('Allowed roles:', allowedRoles);
    console.log('Has access:', allowedRoles.includes(req.user?.role));
    
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      console.log('❌ ACCESS DENIED');
      return res.status(403).json({ 
        message: "Access denied",
        userRole: req.user?.role,
        allowedRoles: allowedRoles
      });
    }
    console.log('✅ ACCESS GRANTED');
    next();
  };
};
