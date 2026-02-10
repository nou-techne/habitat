-- Processed Events Table
-- Tracks which events have been processed for idempotency

CREATE TABLE IF NOT EXISTS processed_events (
    event_id UUID PRIMARY KEY,
    event_type TEXT NOT NULL,
    handler_name TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_processed_events_type ON processed_events (event_type);
CREATE INDEX idx_processed_events_handler ON processed_events (handler_name);
CREATE INDEX idx_processed_events_processed_at ON processed_events (processed_at DESC);

COMMENT ON TABLE processed_events IS 'Idempotency tracking for event handlers';
COMMENT ON COLUMN processed_events.event_id IS 'Unique event identifier from event envelope';
COMMENT ON COLUMN processed_events.handler_name IS 'Name of handler that processed this event';
