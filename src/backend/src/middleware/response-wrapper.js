import { successResponse, errorResponse } from '../utils/api-response.js';

/**
 * Adds res.apiSuccess() and res.apiError() helpers to every response object.
 */
export function responseWrapper(req, res, next) {
  res.apiSuccess = (data, message) => {
    return res.json(successResponse(data, message));
  };

  res.apiError = (message, errorCode = 'SERVER_ERROR', statusCode = 500, data = null) => {
    return res.status(statusCode).json(errorResponse(message, errorCode, data));
  };

  next();
}
