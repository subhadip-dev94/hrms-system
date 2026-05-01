// ─── API response helpers ─────────────────────────────────────────────────────

function apiSuccess(res, message, data, pagination) {
  const body = { success: true, message: message || 'Operation successful' };
  if (data !== undefined) body.data = data;
  if (pagination) body.pagination = pagination;
  return res.status(200).json(body);
}

function apiCreated(res, message, data) {
  return res.status(201).json({ success: true, message: message || 'Created successfully', data });
}

function apiError(res, statusCode, message, code, errors) {
  const body = {
    success: false,
    message: message || 'An error occurred',
    code: code || 'ERROR',
  };
  if (errors) body.errors = errors;
  return res.status(statusCode || 500).json(body);
}

function apiBadRequest(res, message, errors) {
  return apiError(res, 400, message || 'Bad request', 'BAD_REQUEST', errors);
}

function apiNotFound(res, message) {
  return apiError(res, 404, message || 'Resource not found', 'NOT_FOUND');
}

function apiForbidden(res, message) {
  return apiError(res, 403, message || 'Forbidden', 'FORBIDDEN');
}

function apiServerError(res, message) {
  return apiError(res, 500, message || 'Internal server error', 'SERVER_ERROR');
}

// ─── Pagination helper ────────────────────────────────────────────────────────
function apiPaginate(query, page, limit) {
  return { skip: (page - 1) * limit, limit, page };
}

module.exports = {
  apiSuccess,
  apiCreated,
  apiError,
  apiBadRequest,
  apiNotFound,
  apiForbidden,
  apiServerError,
  apiPaginate,
};
