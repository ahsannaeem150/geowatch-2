/**
 * GeoWatch Standard API Response Format
 * { success: boolean, data: any, message: string|null, error: string|null }
 */

export function createResponse({ success = true, data = null, message = null, error = null }) {
  return { success, data, message, error };
}

export function successResponse(data, message = null) {
  return createResponse({ success: true, data, message, error: null });
}

export function errorResponse(message, errorCode = 'SERVER_ERROR', data = null) {
  return createResponse({ success: false, data, message, error: errorCode });
}
