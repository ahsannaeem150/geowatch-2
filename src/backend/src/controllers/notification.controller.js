import {
  listNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../services/notification.service.js';

export async function getNotificationsController(req, res) {
  const { limit, offset, unreadOnly } = req.query;
  const result = await listNotifications(req.user.id, {
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
    unreadOnly: unreadOnly === 'true' || unreadOnly === '1',
  });
  const unreadCount = await getUnreadNotificationCount(req.user.id);
  res.apiSuccess({ ...result, unreadCount });
}

export async function markNotificationReadController(req, res) {
  const notification = await markNotificationRead(req.user.id, req.params.id);
  if (!notification) {
    return res.apiError('Notification not found', 'NOT_FOUND', 404);
  }
  res.apiSuccess({ notification });
}

export async function markAllNotificationsReadController(req, res) {
  const ids = await markAllNotificationsRead(req.user.id);
  res.apiSuccess({ markedRead: ids.length });
}

export async function deleteNotificationController(req, res) {
  const removed = await deleteNotification(req.user.id, req.params.id);
  if (!removed) {
    return res.apiError('Notification not found', 'NOT_FOUND', 404);
  }
  res.apiSuccess({ deleted: true });
}
