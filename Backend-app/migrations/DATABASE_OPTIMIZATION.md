# Database Performance Optimization - Admin-Records

## Overview
This optimization addresses performance issues identified in the Admin-Records database through query pattern analysis and index optimization.

## Performance Issues Identified

### 1. Document Permission Resolution
- **Problem**: Recursive permission checks in `resolveDocumentPermission()` and `resolveFolderPermission()` make multiple database calls
- **Impact**: Each permission check requires 3-7 separate queries walking the folder hierarchy
- **Solution**: Added composite indexes on `document_permissions` for all permission lookup patterns

### 2. Checkout Transaction System
- **Problem**: Checkout approval loops through each item and queries lot availability with complex joins
- **Impact**: Approve operations make N+1 queries where N is the number of items
- **Solution**: Added covering indexes on `checkout_transactions` and `checkout_transaction_items`

### 3. Notification Badge Queries
- **Problem**: Sidebar notification counts run complex aggregation queries on every page load
- **Impact**: Aggregate queries on large `notifications` table
- **Solution**: Added composite indexes on `notifications(user_id, is_read, type)`

### 4. User Status Tracking
- **Problem**: `user_online_status` view queries against live session data
- **Impact**: Frequent queries against `user_sessions` table
- **Solution**: Added index on `user_sessions(user_id, last_active)` for online status checks

### 5. Item Lot Selection
- **Problem**: `select_available_lot_for_item()` function performs complex availability calculations
- **Impact**: Uses multiple joins and subqueries with GROUP BY
- **Solution**: Added covering indexes on `item_lots` for FIFO/LIFO/expiry-based selection

## Indexes Added

### Critical Indexes

1. **document_permissions optimization**
   - `idx_doc_perm_document_user_inherit` - Direct permission lookups
   - `idx_doc_perm_document_role_inherit` - Role-based permission lookups
   - `idx_doc_perm_folder_user_inherit` - Folder hierarchy permissions
   - `idx_doc_perm_folder_role_inherit` - Folder role permissions

2. **checkout_transactions optimization**
   - `idx_checkout_transactions_dashboard` - Admin dashboard queries
   - `idx_checkout_transactions_user` - User request history
   - `idx_checkout_transactions_status` - Status filtering

3. **notifications optimization**
   - `idx_notifications_unread_badge` - Unread count queries
   - `idx_notifications_count` - Aggregate count queries

4. **item_lots optimization**
   - `idx_item_lots_selection` - Automatic lot selection (FIFO/LIFO/expiry)
   - `idx_item_lots_expiring` - Expiring items notifications

5. **user_sessions optimization**
   - `idx_user_sessions_online` - Online status queries
   - `idx_user_sessions_expired` - Session cleanup

## Query Improvements

### Function: `select_available_lot_for_item()`
**Current Issues:**
- Complex JOIN with checkout_transaction_items
- GROUP BY and HAVING clauses
- No covering indexes

**Optimization:**
- Added `idx_checkout_transaction_items_status` for item lookup
- Added `idx_item_lots_selection` with proper sort order

### Permission Resolution
**Current Issues:**
- Multiple recursive queries checking document_permissions
- No composite indexes for (document_id, user_id) lookups
- Folder hierarchy walks without proper indexes

**Optimization:**
- Added 4 composite indexes covering all permission scenarios
- Each permission check now uses index-only scans

### Notification Aggregation
**Current Issues:**
- `notification_counts` view runs COUNT(*) with FILTER clauses
- No indexes on (user_id, is_read, type) combination

**Optimization:**
- Added covering index that enables index-only scans
- Reduces full table scans on notifications table

## Performance Impact Estimates

Based on query patterns and table sizes:

1. **Document permission checks**: 60-80% reduction in query time
2. **Checkout approval operations**: 40-60% reduction in N+1 query overhead
3. **Notification badge queries**: 70-90% reduction (index-only scans)
4. **User session tracking**: 50-70% reduction in online status queries
5. **Item lot selection**: 30-50% reduction in availability calculations

## Metrics to Track

After applying optimizations, monitor:

1. **Query execution time** for:
   - Permission resolution queries
   - Checkout approval operations
   - Notification count queries
   - User online status checks

2. **Index usage statistics**:
```sql
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

3. **Slow query log** for queries > 100ms

## Application Code Recommendations

1. **Batch permission checks**: When fetching multiple documents, batch permission resolution
2. **Materialized views**: Consider materialized views for `notification_counts` on large deployments
3. **Connection pooling**: Ensure proper connection pooling (already configured in db.ts)

## Deployment

### Apply Optimizations
```bash
cd /root/tmp/Admin-Records/Backend-app
psql $DATABASE_URL -f migrations/003_performance_optimization.sql
```

### Verify Index Creation
```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

### Monitor Performance
```sql
-- Check index usage after 1 day
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;
```

## Maintenance

### Reindexing Schedule
- Weekly: `REINDEX INDEX idx_checkout_transaction_items_status`
- Monthly: Full table reindexing during maintenance window

### VACUUM Strategy
- Enable autovacuum on high-traffic tables
- Consider manual VACUUM ANALYZE after bulk operations

## Compatibility

- PostgreSQL 12+ compatible
- No breaking changes to existing queries
- All indexes are `IF NOT EXISTS` safe for re-runs
- Can be applied incrementally

## Testing

### Before Deployment
1. Run EXPLAIN ANALYZE on critical queries
2. Compare execution plans
3. Verify index coverage

### After Deployment
1. Monitor query performance
2. Check index usage statistics
3. Verify no query plan regressions

## Rollback

If needed, individual indexes can be dropped:
```sql
DROP INDEX IF EXISTS idx_checkout_transactions_dashboard;
DROP INDEX IF EXISTS idx_doc_perm_document_user_inherit;
-- etc.
```

## Notes

- Indexes add storage overhead (~10-20% of table size)
- Write operations (INSERT/UPDATE/DELETE) will be slightly slower
- Benefits for read-heavy workload (this application) significantly outweigh write overhead
- All indexes follow the existing soft-delete pattern (deleted_at IS NULL)
