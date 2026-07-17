---
Purpose: Define backend API standards, request/response formats, error codes, and server policies.
Scope: API interface architecture.
Owner: Lead Backend Engineer
Update Trigger: Modification of Express server configs or middleware conventions.
Dependencies: docs/CORE/PROJECT_ARCHITECTURE.md
Related Documents: docs/CORE/CODING_STANDARDS.md
Status: Active
Version: v1.0.0
Last Updated: 2026-07-17
---

# API Standards: We Alll Office

This document specifies the formatting, protocol, and middleware standards for all API endpoints in the We Alll Office server.

---

## 1. Request / Response Standards

All API responses must follow a consistent JSON envelope layout to ensure predictable client-side handling:

### 1.1 Success Response Envelope
```json
{
  "success": true,
  "data": {
    // Array or Object containing requested data
  },
  "message": "Optional feedback message"
}
```

### 1.2 Error Response Envelope
All HTTP errors must return a unified format to make it easy for Axios interceptors to parse messages:
```json
{
  "success": false,
  "message": "Human-readable description of what failed",
  "errors": [
    {
      "field": "Optional field name where validation failed",
      "msg": "Specific validation detail"
    }
  ]
}
```

---

## 2. HTTP Methods & Route Conventions

Endpoints must utilize RESTful HTTP verbs to represent database actions:

* **`GET /api/<resource>`**: Retrieve lists of items. Query params support filters and pagination (e.g. `?limit=10&page=1`).
* **`GET /api/<resource>/:id`**: Retrieve a single item by unique ID.
* **`POST /api/<resource>`**: Create a new record. Payload passes in the request body.
* **`PUT /api/<resource>/:id`**: Replace an entire record.
* **`PATCH /api/<resource>/:id`**: Partially update specific fields on a record (e.g. updating work item progress state).
* **`DELETE /api/<resource>/:id`**: Perform soft-delete operations (setting `isDeleted: true` flag in Mongoose schemas rather than purging records).

---

## 3. Server Middlewares & Traffic Policies

The backend server registers several middleware filters globally inside `backend/src/server.js`:

### 3.1 Rate Limiting (`express-rate-limit`)
To prevent Denial of Service (DoS) and API abuse, endpoints are protected using a rate-limiting middleware:
* **Global Rate Limit:** 100 requests per 15 minutes per IP.
* **Auth Rate Limit (login, verification):** Restricted to 15 requests per 15 minutes per IP.

### 3.2 CORS Policies
CORS blocks cross-origin requests unless they match allowed domains:
```javascript
// Server config
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));
```

### 3.3 Data Compression (`compression`)
Gzip compression middleware is mounted globally on Express to shrink JSON output sizes, speeding up network transit speeds for large tables (like raw calling queues and month-long attendance matrices).
