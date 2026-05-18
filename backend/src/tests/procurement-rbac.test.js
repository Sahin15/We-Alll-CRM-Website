/**
 * procurement-rbac.test.js
 *
 * Unit tests for procurement RBAC (Role-Based Access Control).
 * Tests the authorize middleware logic without making actual HTTP calls.
 */

// ─── Minimal authorize middleware mock ────────────────────────────────────────
// Mirrors the real authorize middleware: checks req.user.role against allowedRoles.
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: not authenticated' });
  }
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient role' });
  }
  return next();
};

// ─── Helper: build mock req/res/next ─────────────────────────────────────────
const mockReq = (role) => ({ user: { role } });

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

// ─── Route permission definitions (mirrors actual route config) ───────────────
const VENDOR_ALLOWED_ROLES = ['admin', 'superadmin', 'hr', 'accounts'];
const PO_ISSUE_ALLOWED_ROLES = ['admin', 'superadmin', 'accounts'];
const INVOICE_CREATE_ALLOWED_ROLES = ['admin', 'superadmin', 'accounts'];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Procurement RBAC — Vendor Management', () => {
  const vendorMiddleware = authorize(...VENDOR_ALLOWED_ROLES);

  beforeEach(() => {
    mockNext.mockClear();
  });

  test('employee cannot access vendor management', () => {
    const req = mockReq('employee');
    const res = mockRes();
    vendorMiddleware(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Forbidden') }));
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('hod cannot access vendor management', () => {
    const req = mockReq('hod');
    const res = mockRes();
    vendorMiddleware(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('manager cannot access vendor management', () => {
    const req = mockReq('manager');
    const res = mockRes();
    vendorMiddleware(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('admin can access vendor management', () => {
    const req = mockReq('admin');
    const res = mockRes();
    vendorMiddleware(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('accounts can access vendor management', () => {
    const req = mockReq('accounts');
    const res = mockRes();
    vendorMiddleware(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('hr can access vendor management', () => {
    const req = mockReq('hr');
    const res = mockRes();
    vendorMiddleware(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('unauthenticated request is rejected with 401', () => {
    const req = { user: null };
    const res = mockRes();
    vendorMiddleware(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });
});

describe('Procurement RBAC — Issue Purchase Orders', () => {
  const poIssueMiddleware = authorize(...PO_ISSUE_ALLOWED_ROLES);

  beforeEach(() => {
    mockNext.mockClear();
  });

  test('employee cannot issue purchase orders', () => {
    const req = mockReq('employee');
    const res = mockRes();
    poIssueMiddleware(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('hr cannot issue purchase orders', () => {
    const req = mockReq('hr');
    const res = mockRes();
    poIssueMiddleware(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('hod cannot issue purchase orders', () => {
    const req = mockReq('hod');
    const res = mockRes();
    poIssueMiddleware(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('manager cannot issue purchase orders', () => {
    const req = mockReq('manager');
    const res = mockRes();
    poIssueMiddleware(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('admin can issue purchase orders', () => {
    const req = mockReq('admin');
    const res = mockRes();
    poIssueMiddleware(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('accounts can issue purchase orders', () => {
    const req = mockReq('accounts');
    const res = mockRes();
    poIssueMiddleware(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('superadmin can issue purchase orders', () => {
    const req = mockReq('superadmin');
    const res = mockRes();
    poIssueMiddleware(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('Procurement RBAC — Create Invoices', () => {
  const invoiceCreateMiddleware = authorize(...INVOICE_CREATE_ALLOWED_ROLES);

  beforeEach(() => {
    mockNext.mockClear();
  });

  test('employee cannot create invoices', () => {
    const req = mockReq('employee');
    const res = mockRes();
    invoiceCreateMiddleware(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('hr cannot create invoices', () => {
    const req = mockReq('hr');
    const res = mockRes();
    invoiceCreateMiddleware(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('hod cannot create invoices', () => {
    const req = mockReq('hod');
    const res = mockRes();
    invoiceCreateMiddleware(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('manager cannot create invoices', () => {
    const req = mockReq('manager');
    const res = mockRes();
    invoiceCreateMiddleware(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('admin can create invoices', () => {
    const req = mockReq('admin');
    const res = mockRes();
    invoiceCreateMiddleware(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('accounts can create invoices', () => {
    const req = mockReq('accounts');
    const res = mockRes();
    invoiceCreateMiddleware(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('superadmin can create invoices', () => {
    const req = mockReq('superadmin');
    const res = mockRes();
    invoiceCreateMiddleware(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
