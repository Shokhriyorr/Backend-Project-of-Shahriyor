import { getClientIp, toAuditJson } from '../utils/api.js'

export async function appendAuditLog(
  tx,
  { req, actorUserId = null, entityType, entityId, action, before = null, after = null },
) {
  return tx.auditLog.create({
    data: {
      actorUserId: actorUserId ? BigInt(actorUserId) : null,
      entityType,
      entityId: BigInt(entityId),
      action,
      beforeJson: toAuditJson(before),
      afterJson: toAuditJson(after),
      requestId: req?.requestId ?? null,
      ipAddress: req ? getClientIp(req) : null,
    },
  })
}
