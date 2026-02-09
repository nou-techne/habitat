-- Habitat Treasury Migration Examples
-- PostgreSQL migration patterns for event-sourced accounting
-- These are templates - actual migrations depend on deployment tooling

-- =============================================================================
-- MIGRATION: Add 704(c) Layer Tracking to Capital Accounts
-- =============================================================================
-- Date: TBD
-- Purpose: Track reverse 704(c) layers for property revaluations
-- Depends on: 01_treasury_core.sql

BEGIN;

-- Add 704(c) layer tracking columns to accounts table
ALTER TABLE accounts 
  ADD COLUMN IF NOT EXISTS is_704c_property BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS initial_basis NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS current_fmv NUMERIC(15,2);

COMMENT ON COLUMN accounts.is_704c_property IS 'True if this account tracks property subject to IRC 704(c) allocations';
COMMENT ON COLUMN accounts.initial_basis IS 'Initial book basis for 704(c) property (at contribution or revaluation)';
COMMENT ON COLUMN accounts.current_fmv IS 'Current fair market value for 704(c) property';

-- Create 704(c) layers table
CREATE TABLE IF NOT EXISTS capital_account_704c_layers (
    layer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(account_id),
    layer_date DATE NOT NULL,
    layer_type VARCHAR(50) NOT NULL,  -- 'initial_contribution', 'revaluation', 'reverse_704c'
    book_value NUMERIC(15,2) NOT NULL,
    tax_value NUMERIC(15,2) NOT NULL,
    built_in_gain_loss NUMERIC(15,2) GENERATED ALWAYS AS (book_value - tax_value) STORED,
    remaining_gain_loss NUMERIC(15,2) NOT NULL,
    is_fully_allocated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT layer_type_valid CHECK (layer_type IN ('initial_contribution', 'revaluation', 'reverse_704c'))
);

CREATE INDEX idx_704c_layers_account ON capital_account_704c_layers(account_id);
CREATE INDEX idx_704c_layers_date ON capital_account_704c_layers(layer_date);
CREATE INDEX idx_704c_layers_remaining ON capital_account_704c_layers(remaining_gain_loss) WHERE NOT is_fully_allocated;

COMMENT ON TABLE capital_account_704c_layers IS 'IRC 704(c) layers tracking built-in gain/loss for property contributions and revaluations';
COMMENT ON COLUMN capital_account_704c_layers.built_in_gain_loss IS 'Book value - tax value at layer creation';
COMMENT ON COLUMN capital_account_704c_layers.remaining_gain_loss IS 'Unallocated gain/loss remaining in this layer';

COMMIT;


-- =============================================================================
-- MIGRATION: Add Minimum Gain Tracking
-- =============================================================================
-- Date: TBD
-- Purpose: Track partnership minimum gain for nonrecourse debt allocations
-- Depends on: 01_treasury_core.sql

BEGIN;

CREATE TABLE IF NOT EXISTS minimum_gain_tracking (
    tracking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES periods(period_id),
    property_account_id UUID NOT NULL REFERENCES accounts(account_id),
    nonrecourse_debt_balance NUMERIC(15,2) NOT NULL,
    adjusted_basis NUMERIC(15,2) NOT NULL,
    minimum_gain NUMERIC(15,2) GENERATED ALWAYS AS (
        CASE 
            WHEN nonrecourse_debt_balance > adjusted_basis 
            THEN nonrecourse_debt_balance - adjusted_basis 
            ELSE 0 
        END
    ) STORED,
    calculation_date DATE NOT NULL,
    notes TEXT,
    
    CONSTRAINT minimum_gain_nonnegative CHECK (minimum_gain >= 0)
);

CREATE INDEX idx_min_gain_period ON minimum_gain_tracking(period_id);
CREATE INDEX idx_min_gain_property ON minimum_gain_tracking(property_account_id);

COMMENT ON TABLE minimum_gain_tracking IS 'Partnership minimum gain tracking per IRC Reg 1.704-2(d)';
COMMENT ON COLUMN minimum_gain_tracking.minimum_gain IS 'Excess of nonrecourse debt over adjusted basis';

COMMIT;


-- =============================================================================
-- MIGRATION: Add QIO/DRO Tracking (Qualified Income Offset / Deficit Restoration)
-- =============================================================================
-- Date: TBD
-- Purpose: Track member-level QIO and DRO obligations per IRC 704(b)
-- Depends on: 01_treasury_core.sql, minimum_gain_tracking

BEGIN;

CREATE TABLE IF NOT EXISTS member_qio_dro (
    qio_dro_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL,
    period_id UUID NOT NULL REFERENCES periods(period_id),
    capital_account_balance NUMERIC(15,2) NOT NULL,
    deficit_balance NUMERIC(15,2) GENERATED ALWAYS AS (
        CASE WHEN capital_account_balance < 0 THEN ABS(capital_account_balance) ELSE 0 END
    ) STORED,
    share_of_minimum_gain NUMERIC(15,2) DEFAULT 0,
    qio_amount NUMERIC(15,2) DEFAULT 0,
    dro_obligation BOOLEAN DEFAULT FALSE,
    dro_amount NUMERIC(15,2),
    safe_harbor_met BOOLEAN DEFAULT FALSE,
    calculation_date DATE NOT NULL,
    notes TEXT,
    
    CONSTRAINT qio_dro_nonnegative CHECK (
        qio_amount >= 0 AND 
        (dro_amount IS NULL OR dro_amount >= 0)
    )
);

CREATE INDEX idx_qio_dro_member ON member_qio_dro(member_id);
CREATE INDEX idx_qio_dro_period ON member_qio_dro(period_id);
CREATE INDEX idx_qio_dro_deficit ON member_qio_dro(deficit_balance) WHERE deficit_balance > 0;

COMMENT ON TABLE member_qio_dro IS 'Qualified Income Offset and Deficit Restoration Obligation tracking per member per period';
COMMENT ON COLUMN member_qio_dro.qio_amount IS 'Qualified income required to offset deficit (IRC Reg 1.704-1(b)(2)(ii)(d))';
COMMENT ON COLUMN member_qio_dro.dro_obligation IS 'Whether member has deficit restoration obligation';
COMMENT ON COLUMN member_qio_dro.safe_harbor_met IS 'True if alternate economic effect safe harbor requirements met';

COMMIT;


-- =============================================================================
-- MIGRATION: Add Audit Log View
-- =============================================================================
-- Date: TBD
-- Purpose: Human-readable audit trail from event log
-- Depends on: 01_treasury_core.sql

BEGIN;

CREATE MATERIALIZED VIEW IF NOT EXISTS audit_trail AS
SELECT 
    e.event_id,
    e.aggregate_type,
    e.aggregate_id,
    e.event_type,
    e.occurred_at,
    e.metadata->>'user_id' AS user_id,
    e.metadata->>'correlation_id' AS correlation_id,
    CASE 
        WHEN e.event_type = 'TransactionRecorded' THEN 
            (e.event_data->>'memo')
        WHEN e.event_type = 'AccountCreated' THEN 
            'Created account: ' || (e.event_data->>'account_name')
        WHEN e.event_type = 'PeriodClosed' THEN 
            'Closed period: ' || (e.event_data->>'period_name')
        ELSE e.event_type
    END AS description,
    e.event_data
FROM events e
ORDER BY e.occurred_at DESC;

CREATE UNIQUE INDEX idx_audit_trail_pk ON audit_trail(event_id);
CREATE INDEX idx_audit_trail_occurred ON audit_trail(occurred_at DESC);
CREATE INDEX idx_audit_trail_user ON audit_trail(user_id) WHERE user_id IS NOT NULL;

COMMENT ON MATERIALIZED VIEW audit_trail IS 'Human-readable audit log. Refresh after event replay or daily.';

COMMIT;


-- =============================================================================
-- ROLLBACK TEMPLATE
-- =============================================================================
-- To rollback a migration, reverse the operations in reverse order

-- Example rollback for QIO/DRO tracking:
-- BEGIN;
-- DROP MATERIALIZED VIEW IF EXISTS audit_trail CASCADE;
-- DROP TABLE IF EXISTS member_qio_dro CASCADE;
-- DROP TABLE IF EXISTS minimum_gain_tracking CASCADE;
-- DROP TABLE IF EXISTS capital_account_704c_layers CASCADE;
-- ALTER TABLE accounts DROP COLUMN IF EXISTS is_704c_property;
-- ALTER TABLE accounts DROP COLUMN IF EXISTS initial_basis;
-- ALTER TABLE accounts DROP COLUMN IF EXISTS current_fmv;
-- COMMIT;


-- =============================================================================
-- EVENT REPLAY SCRIPT
-- =============================================================================
-- Rebuilds all materialized state from the event log
-- Use after major schema changes or data corruption

BEGIN;

-- Clear all materialized tables (except events)
TRUNCATE TABLE accounts CASCADE;
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE transaction_entries CASCADE;
TRUNCATE TABLE periods CASCADE;

-- Replay events in sequence order
-- This would be handled by application logic in production
-- The application reads events in sequence and applies them to rebuild state

-- After replay, refresh materialized views
REFRESH MATERIALIZED VIEW CONCURRENTLY account_balances;
REFRESH MATERIALIZED VIEW CONCURRENTLY period_account_balances;
REFRESH MATERIALIZED VIEW CONCURRENTLY audit_trail;

COMMIT;

-- Verify replay integrity
SELECT 
    'Events replayed' AS check,
    COUNT(*) AS event_count
FROM events;

SELECT 
    'Accounts rebuilt' AS check,
    COUNT(*) AS account_count
FROM accounts;

SELECT 
    'Transactions rebuilt' AS check,
    COUNT(*) AS transaction_count
FROM transactions;

SELECT 
    'Balance integrity' AS check,
    CASE 
        WHEN SUM(balance) = 0 THEN 'PASS: All accounts balance to zero'
        ELSE 'FAIL: Accounts do not balance'
    END AS result
FROM account_balances;
