import { listAuditLogs, getAuditSummary } from '../services/audit.service.js';

export async function listAuditController(req, res) {
  const filters = {
    action: req.query.action,
    userId: req.query.userId,
    targetType: req.query.targetType,
    targetId: req.query.targetId,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    page: req.query.page,
    limit: req.query.limit,
  };

  const result = await listAuditLogs(filters);
  res.apiSuccess(result);
}

export async function getAuditSummaryController(req, res) {
  const summary = await getAuditSummary();
  res.apiSuccess(summary);
}
