# Event Replay Runbook

## Overview

Procedures for replaying events in the Habitat patronage system, useful for fixing processing errors, reprocessing after bug fixes, or recovering from data inconsistencies.

## When to Use Event Replay

- **Processing Error:** Event handler failed due to bug
- **Data Fix:** Need to recalculate allocations after data correction
- **System Recovery:** Events lost due to queue failure
- **Feature Addition:** New handler needs historical events
- **Testing:** Replay production events in staging

## Event Sourcing Architecture

Habitat uses event sourcing for key workflows:

```
Event → Queue → Handler → Side Effects → Processed Events Table
```

All processed events are logged in `processed_events` table with idempotency keys.

## Prerequisites

- SSH access to server
- Database access
- Understanding of event types and handlers
- Backup before replay (recommended)

## Event Types

1. **Contribution Events:**
   - `contribution.submitted`
   - `contribution.approved`
   - `contribution.rejected`

2. **Period Events:**
   - `period.opened`
   - `period.closed`

3. **Allocation Events:**
   - `allocation.calculated`
   - `allocation.distributed`

4. **Payment Events:**
   - `payment.initiated`
   - `payment.completed`

## View Processed Events

### Query Recent Events

```sql
-- Last 100 events
SELECT 
  id,
  event_type,
  event_id,
  status,
  processed_at,
  error_message
FROM processed_events
ORDER BY processed_at DESC
LIMIT 100;
```

### Find Failed Events

```sql
-- Failed events in last 24 hours
SELECT 
  id,
  event_type,
  event_id,
  status,
  error_message,
  retry_count,
  processed_at
FROM processed_events
WHERE status = 'error'
  AND processed_at > NOW() - INTERVAL '24 hours'
ORDER BY processed_at DESC;
```

### Find Events for Specific Entity

```sql
-- All events for contribution ID
SELECT 
  event_type,
  payload,
  status,
  processed_at
FROM processed_events
WHERE payload->>'contribution_id' = '123e4567-e89b-12d3-a456-426614174000'
ORDER BY processed_at ASC;
```

## Replay Single Event

### Manual Replay via RabbitMQ

```bash
# SSH to server
ssh user@habitat-server
cd /path/to/habitat

# Publish event to queue
docker compose -f docker-compose.prod.yml exec rabbitmq \
  rabbitmqadmin publish \
    exchange=habitat-events \
    routing_key=contribution.submitted \
    payload='{"contribution_id":"123e4567-e89b-12d3-a456-426614174000","type":"labor","amount":100}'
```

### Replay via API (if exposed)

```bash
# POST to replay endpoint
curl -X POST https://habitat.example.com/api/admin/replay-event \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "evt_123456",
    "force": false
  }'
```

### Replay from Database

```sql
-- Mark event as pending for reprocessing
UPDATE processed_events
SET status = 'pending',
    retry_count = 0,
    error_message = NULL,
    processed_at = NULL
WHERE event_id = 'evt_123456';

-- Worker will pick it up automatically
```

## Replay Multiple Events

### Replay All Failed Events

```bash
#!/bin/bash
# replay-failed-events.sh

# Get failed event IDs
EVENT_IDS=$(docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U habitat -d habitat -t -c \
  "SELECT event_id FROM processed_events WHERE status = 'error' AND processed_at > NOW() - INTERVAL '24 hours';" \
  | tr -d ' ')

# Replay each event
for EVENT_ID in $EVENT_IDS; do
  echo "Replaying event: $EVENT_ID"
  
  # Reset event status
  docker compose -f docker-compose.prod.yml exec -T postgres \
    psql -U habitat -d habitat -c \
    "UPDATE processed_events SET status = 'pending', retry_count = 0, error_message = NULL WHERE event_id = '$EVENT_ID';"
  
  sleep 1  # Rate limiting
done

echo "Replay complete. Check worker logs for processing status."
```

### Replay Events for Date Range

```bash
#!/bin/bash
# replay-date-range.sh <start-date> <end-date> <event-type>

START_DATE=$1
END_DATE=$2
EVENT_TYPE=$3

echo "Replaying $EVENT_TYPE events from $START_DATE to $END_DATE"

# Reset events in range
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U habitat -d habitat -c \
  "UPDATE processed_events 
   SET status = 'pending', retry_count = 0, error_message = NULL
   WHERE event_type = '$EVENT_TYPE'
     AND processed_at BETWEEN '$START_DATE' AND '$END_DATE';"

# Monitor progress
watch -n 5 "docker compose -f docker-compose.prod.yml exec postgres psql -U habitat -d habitat -c \"SELECT status, COUNT(*) FROM processed_events WHERE event_type = '$EVENT_TYPE' AND processed_at BETWEEN '$START_DATE' AND '$END_DATE' GROUP BY status;\""
```

## Replay Specific Workflow

### Replay Period Close

When period close failed or needs recalculation:

```bash
# 1. Find the period
PERIOD_ID=$(docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U habitat -d habitat -t -c \
  "SELECT id FROM allocation_periods WHERE status = 'closed' ORDER BY end_date DESC LIMIT 1;" \
  | tr -d ' ')

echo "Replaying period close for period: $PERIOD_ID"

# 2. Mark allocations as pending
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c \
  "UPDATE allocations SET status = 'pending' WHERE period_id = '$PERIOD_ID';"

# 3. Reset period status to open
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c \
  "UPDATE allocation_periods SET status = 'open', closed_at = NULL WHERE id = '$PERIOD_ID';"

# 4. Trigger period close event
docker compose -f docker-compose.prod.yml exec rabbitmq \
  rabbitmqadmin publish \
    exchange=habitat-events \
    routing_key=period.close \
    payload="{\"period_id\":\"$PERIOD_ID\"}"

# 5. Monitor progress
docker compose -f docker-compose.prod.yml logs -f worker | grep "period.close"
```

### Replay Allocations for Member

When member's allocations need recalculation:

```bash
# 1. Find member contributions in period
MEMBER_ID="123e4567-e89b-12d3-a456-426614174000"
PERIOD_ID="period_uuid"

# 2. Mark contributions as pending
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c \
  "UPDATE contributions 
   SET status = 'pending' 
   WHERE member_id = '$MEMBER_ID' 
     AND period_id = '$PERIOD_ID';"

# 3. Delete existing allocations
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c \
  "DELETE FROM allocations 
   WHERE member_id = '$MEMBER_ID' 
     AND period_id = '$PERIOD_ID';"

# 4. Trigger allocation calculation
docker compose -f docker-compose.prod.yml exec rabbitmq \
  rabbitmqadmin publish \
    exchange=habitat-events \
    routing_key=allocation.calculate \
    payload="{\"member_id\":\"$MEMBER_ID\",\"period_id\":\"$PERIOD_ID\"}"
```

## Idempotency Considerations

### Check Idempotency Status

```sql
-- Check if event already processed
SELECT status, processed_at, error_message
FROM processed_events
WHERE event_id = 'evt_123456';
```

### Force Replay (Skip Idempotency)

```bash
# Delete idempotency record to allow reprocessing
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c \
  "DELETE FROM processed_events WHERE event_id = 'evt_123456';"

# Now replay event
# Event will be processed as new
```

⚠️ **Warning:** Forcing replay can cause duplicate side effects (emails, payments). Only use when you understand the consequences.

## Monitoring Replay Progress

### Watch Event Processing

```bash
# Real-time event processing log
docker compose -f docker-compose.prod.yml logs -f worker | grep "Event processed"
```

### Query Processing Stats

```sql
-- Processing status summary
SELECT 
  event_type,
  status,
  COUNT(*) as count,
  MAX(processed_at) as last_processed
FROM processed_events
WHERE processed_at > NOW() - INTERVAL '1 hour'
GROUP BY event_type, status
ORDER BY event_type, status;
```

### Monitor Queue Depth

```bash
# Check RabbitMQ queue depth
docker compose -f docker-compose.prod.yml exec rabbitmq \
  rabbitmqctl list_queues name messages messages_ready messages_unacknowledged
```

## Troubleshooting

### Event Stuck in Processing

**Symptom:** Event status is 'processing' for >5 minutes

**Cause:** Worker crashed or deadlocked

**Solution:**
```bash
# Reset stuck events
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c \
  "UPDATE processed_events 
   SET status = 'pending' 
   WHERE status = 'processing' 
     AND processed_at < NOW() - INTERVAL '5 minutes';"

# Restart worker
docker compose -f docker-compose.prod.yml restart worker
```

### Replay Causes Errors

**Symptom:** Replayed events fail with constraint violations

**Cause:** Side effects already applied (duplicate allocation, etc.)

**Solution:**
```bash
# 1. Rollback side effects first
# Delete allocations from failed replay
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c \
  "DELETE FROM allocations WHERE id IN (SELECT id FROM allocations WHERE created_at > NOW() - INTERVAL '1 hour');"

# 2. Reset processed_events status
# 3. Replay again
```

### Performance Degradation During Replay

**Symptom:** System slow while replaying many events

**Solution:**
```bash
# Rate limit replay - add delays between events
for EVENT_ID in $EVENT_IDS; do
  # Process event
  sleep 5  # 5 second delay
done

# Or reduce worker concurrency temporarily
docker compose -f docker-compose.prod.yml scale worker=1
```

## Best Practices

1. **Always backup before replay**
   ```bash
   docker compose -f docker-compose.prod.yml exec -T postgres \
     pg_dump -U habitat -Fc habitat > backups/pre-replay-$(date +%Y%m%d-%H%M%S).dump
   ```

2. **Test in staging first**
   - Restore production backup to staging
   - Replay events in staging
   - Verify results
   - Then apply to production

3. **Replay during low traffic**
   - Schedule for off-hours
   - Reduces impact on users
   - Easier to monitor

4. **Monitor closely**
   - Watch worker logs
   - Check error rates
   - Verify data integrity after

5. **Document replay reason**
   ```sql
   -- Add note to audit log
   INSERT INTO audit_log (action, details, performed_by)
   VALUES ('event_replay', 'Replayed failed allocations for period X', 'admin@habitat.eth');
   ```

6. **Verify results**
   ```sql
   -- Check allocation totals match
   SELECT SUM(amount) FROM allocations WHERE period_id = 'period_uuid';
   ```

## Safety Checks

Before replaying events, verify:

- [ ] Recent backup exists
- [ ] Staging test successful
- [ ] Idempotency implications understood
- [ ] Low traffic period scheduled
- [ ] Monitoring ready
- [ ] Rollback plan documented
- [ ] Stakeholders notified

## Emergency Stop

If replay goes wrong:

```bash
# 1. Stop worker immediately
docker compose -f docker-compose.prod.yml stop worker

# 2. Purge queue
docker compose -f docker-compose.prod.yml exec rabbitmq \
  rabbitmqctl purge_queue habitat-events

# 3. Restore from pre-replay backup
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U habitat -d habitat --clean < backups/pre-replay-*.dump

# 4. Investigate what went wrong
docker compose -f docker-compose.prod.yml logs worker > replay-failure.log
```
