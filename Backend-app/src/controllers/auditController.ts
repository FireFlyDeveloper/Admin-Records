import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../utils/db';
import { ForbiddenError, ValidationError } from '../utils/errors';

function getUserContext(req: AuthRequest) {
  const user = req.user;
  if (!user) throw new ForbiddenError();
  const isAdmin = user.roles.includes('admin');
  return { userId: user.id, isAdmin };
}

const unifiedAuditActivityCte = `
  WITH unified_audit_activity AS (
    SELECT
      al.id::text,
      'audit' AS source,
      al.actor_id,
      al.action,
      al.entity_type,
      al.entity_id::text AS entity_id,
      COALESCE(al.after_state, al.before_state) AS metadata,
      al.created_at
    FROM audit_logs al
    UNION ALL
    SELECT
      dal.id::text,
      'document' AS source,
      dal.actor_id,
      dal.action,
      'document' AS entity_type,
      dal.document_id::text AS entity_id,
      dal.metadata,
      dal.created_at
    FROM document_activity_logs dal
    UNION ALL
    SELECT
      ct.id::text,
      'checkout' AS source,
      ct.checked_out_by AS actor_id,
      'checkout' AS action,
      'checkout_transaction' AS entity_type,
      ct.id::text AS entity_id,
      jsonb_build_object('status', ct.status, 'notes', ct.notes) AS metadata,
      ct.created_at
    FROM checkout_transactions ct
  )
`;

function addDateRangeFilter(
  conditions: string[],
  values: any[],
  column: string,
  dateFrom?: string,
  dateTo?: string
): void {
  if (dateFrom) {
    conditions.push(`${column} >= $${values.length + 1}::date`);
    values.push(dateFrom);
  }
  if (dateTo) {
    conditions.push(`${column} < ($${values.length + 1}::date + INTERVAL '1 day')`);
    values.push(dateTo);
  }
}

export async function getAuditLogs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    if (!ctx.isAdmin) {
      throw new ForbiddenError('Audit log access requires admin role');
    }

    // Accept both camelCase (frontend) and snake_case (direct API)
    const {
      entity_type,
      entityType,
      entity_id,
      entityId,
      actor_id,
      actorId,
      action,
      date_from,
      startDate,
      date_to,
      endDate,
      page,
      limit,
    } = req.query;

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const et = entity_type || entityType;
    const ei = entity_id || entityId;
    const ai = actor_id || actorId;
    const df = date_from || startDate;
    const dt = date_to || endDate;

    if (et) {
      conditions.push(`entity_type = $${idx++}`);
      values.push(et as string);
    }
    if (ei) {
      conditions.push(`entity_id = $${idx++}`);
      values.push(ei as string);
    }
    if (ai) {
      conditions.push(`actor_id = $${idx++}`);
      values.push(ai as string);
    }
    if (action) {
      // If user searches for 'request', also include 'checkout' (conversion mapping)
      if (action === 'request') {
        conditions.push(`(action = $${idx++} OR action = 'checkout')`);
        values.push('request');
      } else {
        conditions.push(`action = $${idx++}`);
        values.push(action as string);
      }
    }
    addDateRangeFilter(conditions, values, 'created_at', df as string | undefined, dt as string | undefined);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 50;
    if (pageNum < 1) throw new ValidationError('page must be >= 1');
    if (limitNum < 1 || limitNum > 200) throw new ValidationError('limit must be between 1 and 200');
    const offset = (pageNum - 1) * limitNum;

    const countResult = await query<{ count: string }>(
      `${unifiedAuditActivityCte}
       SELECT COUNT(*)::text as count
       FROM unified_audit_activity
       ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query(
      `${unifiedAuditActivityCte}
       SELECT ua.*, u.display_name as actor_display_name
       FROM (
         SELECT *
         FROM unified_audit_activity
         ${whereClause}
       ) ua
       LEFT JOIN users u ON u.id = ua.actor_id
       ORDER BY ua.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limitNum, offset]
    );

    // Map to frontend expected shape
    const logs = result.rows.map((r) => ({
      id: r.id,
      entityType: r.entity_type === 'checkout_transaction' ? 'lot' : r.entity_type,
      action: r.action === 'checkout' ? 'request' : r.action,
      actorId: r.actor_id,
      actorName: r.actor_display_name || (r.actor_id ? r.actor_id.slice(0, 8) + '...' : 'System'),
      entityId: r.entity_id,
      metadata: r.metadata,
      createdAt: r.created_at,
    }));

    res.json({
      logs,
      total,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAuditSummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    if (!ctx.isAdmin) {
      throw new ForbiddenError('Audit log access requires admin role');
    }

    // Accept both camelCase and snake_case
    const groupBy = req.query.group_by || req.query.groupBy;
    const groupField = groupBy === 'action' ? 'action' : 'entity_type';

    const result = await query<{ field: string; count: string }>(
      `${unifiedAuditActivityCte}
       SELECT ${groupField} as field, COUNT(*)::text as count
       FROM unified_audit_activity
       GROUP BY ${groupField}
       ORDER BY count DESC`
    );

    const summary = result.rows.map((r) => ({
      [groupField]: r.field,
      count: parseInt(r.count, 10),
    }));

    res.json({
      summary,
    });
  } catch (err) {
    next(err);
  }
}
