import { listAuditLogs, getAuditSummary } from '../services/audit.service.js';

export async function listAuditController(req, res) {
  const filters = {
    action: req.query.action,
    userId: req.query.userId,
    targetType: req.query.targetType,
    targetId: req.query.targetId,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    realm: req.query.realm,
    actorType: req.query.actorType,
    page: req.query.page,
    limit: req.query.limit,
  };

  const result = await listAuditLogs(filters);
  res.apiSuccess(result);
}

export async function getAuditSummaryController(req, res) {
  const filters = {
    realm: req.query.realm,
    actorType: req.query.actorType,
  };
  const summary = await getAuditSummary(filters);
  res.apiSuccess(summary);
}
