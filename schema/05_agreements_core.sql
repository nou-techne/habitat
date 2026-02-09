-- =====================================================
-- HABITAT AGREEMENTS SYSTEM - CORE SCHEMA
-- =====================================================
-- Allocation Agreements, Period Close, Distributions
-- PostgreSQL 14+, Supabase-compatible
-- Part of Habitat patronage accounting infrastructure
-- Sprint 47
-- =====================================================

-- =====================================================
-- EVENT STORE
-- =====================================================

CREATE TABLE agreements_events (
    event_id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload JSONB NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    sequence_number INTEGER NOT NULL,
    causation_id TEXT,
    correlation_id TEXT,
    
    CONSTRAINT agreements_events_sequence_unique UNIQUE (aggregate_type, aggregate_id, sequence_number)
);

CREATE INDEX idx_agreements_events_aggregate ON agreements_events (aggregate_type, aggregate_id, sequence_number);
CREATE INDEX idx_agreements_events_type ON agreements_events (event_type, occurred_at DESC);
CREATE INDEX idx_agreements_events_occurred ON agreements_events (occurred_at DESC);
CREATE INDEX idx_agreements_events_correlation ON agreements_events (correlation_id) WHERE correlation_id IS NOT NULL;

COMMENT ON TABLE agreements_events IS 'Event store for Agreements bounded context - period close, allocations, distributions';
COMMENT ON COLUMN agreements_events.aggregate_type IS 'Entity type: AllocationAgreement, PeriodClose, Distribution';
COMMENT ON COLUMN agreements_events.correlation_id IS 'Links related events (e.g., all allocations from one period close)';

-- =====================================================
-- PATRONAGE WEIGHTS
-- =====================================================

CREATE TABLE patronage_weights (
    weight_id TEXT PRIMARY KEY,
    period_id TEXT NOT NULL,  -- References accounting_periods in Treasury
    contribution_type TEXT NOT NULL,  -- 'labor', 'expertise', 'capital', 'relationship'
    
    weight NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
    
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT patronage_weights_unique_period_type UNIQUE (period_id, contribution_type),
    CONSTRAINT patronage_weights_positive CHECK (weight > 0)
);

CREATE INDEX idx_patronage_weights_period ON patronage_weights (period_id);

COMMENT ON TABLE patronage_weights IS 'Configurable weights for patronage types per accounting period';
COMMENT ON COLUMN patronage_weights.weight IS 'Multiplier applied to contribution value (default 1.0)';

-- =====================================================
-- ALLOCATION AGREEMENTS
-- =====================================================

CREATE TYPE allocation_status AS ENUM (
    'draft',        -- Being calculated, not yet proposed
    'proposed',     -- Presented to members for review
    'approved',     -- Approved by governance and locked
    'distributed',  -- Cash portion distributed, retained portion recorded
    'amended'       -- Corrected after approval (rare, requires governance action)
);

CREATE TABLE allocation_agreements (
    agreement_id TEXT PRIMARY KEY,
    period_id TEXT NOT NULL,  -- References accounting_periods in Treasury
    
    status allocation_status NOT NULL DEFAULT 'draft',
    
    -- Financial totals
    allocable_surplus NUMERIC(12, 2) NOT NULL,
    total_weighted_patronage NUMERIC(15, 2) NOT NULL,
    
    -- Distribution policy
    cash_distribution_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.20,  -- 20% default per IRC 1385
    retained_allocation_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.80,  -- 80% retained
    
    -- Governance
    proposed_at TIMESTAMPTZ,
    proposed_by TEXT,  -- References members in People
    approved_at TIMESTAMPTZ,
    approved_by TEXT,  -- Governance body/resolution reference
    
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT allocation_agreements_distribution_rates_sum CHECK (
        cash_distribution_rate + retained_allocation_rate = 1.0
    ),
    CONSTRAINT allocation_agreements_positive_surplus CHECK (allocable_surplus >= 0),
    CONSTRAINT allocation_agreements_positive_patronage CHECK (total_weighted_patronage > 0)
);

CREATE INDEX idx_allocation_agreements_period ON allocation_agreements (period_id);
CREATE INDEX idx_allocation_agreements_status ON allocation_agreements (status);
CREATE INDEX idx_allocation_agreements_approved ON allocation_agreements (approved_at DESC) WHERE status = 'approved';

COMMENT ON TABLE allocation_agreements IS 'Patronage allocation calculations for closed accounting periods';
COMMENT ON COLUMN allocation_agreements.allocable_surplus IS 'Net income after reserves and collective allocations';
COMMENT ON COLUMN allocation_agreements.cash_distribution_rate IS 'Percentage distributed in cash (IRC 1385 requires min 20%)';

-- =====================================================
-- MEMBER ALLOCATIONS
-- =====================================================

CREATE TABLE member_allocations (
    allocation_id TEXT PRIMARY KEY,
    agreement_id TEXT NOT NULL REFERENCES allocation_agreements(agreement_id),
    member_id TEXT NOT NULL,  -- References members in People
    
    -- Patronage calculation
    weighted_patronage NUMERIC(15, 2) NOT NULL,
    patronage_share NUMERIC(8, 6) NOT NULL,  -- Percentage of total (0.0 to 1.0)
    
    -- Allocation amounts
    total_allocation NUMERIC(12, 2) NOT NULL,
    cash_distribution NUMERIC(12, 2) NOT NULL,
    retained_allocation NUMERIC(12, 2) NOT NULL,
    
    -- Integration references
    treasury_transaction_id TEXT,  -- Links to transactions in Treasury
    capital_account_entry_id TEXT,  -- Links to capital account entries
    
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT member_allocations_unique_member_agreement UNIQUE (agreement_id, member_id),
    CONSTRAINT member_allocations_share_range CHECK (patronage_share >= 0 AND patronage_share <= 1),
    CONSTRAINT member_allocations_cash_retained_sum CHECK (
        ABS((cash_distribution + retained_allocation) - total_allocation) < 0.01
    ),
    CONSTRAINT member_allocations_positive_weighted_patronage CHECK (weighted_patronage >= 0)
);

CREATE INDEX idx_member_allocations_agreement ON member_allocations (agreement_id);
CREATE INDEX idx_member_allocations_member ON member_allocations (member_id);
CREATE INDEX idx_member_allocations_treasury_tx ON member_allocations (treasury_transaction_id) WHERE treasury_transaction_id IS NOT NULL;

COMMENT ON TABLE member_allocations IS 'Individual member allocations within an allocation agreement';
COMMENT ON COLUMN member_allocations.patronage_share IS 'Member weighted patronage / total weighted patronage';
COMMENT ON COLUMN member_allocations.treasury_transaction_id IS 'Links to Treasury transaction recording this allocation';

-- =====================================================
-- DISTRIBUTIONS
-- =====================================================

CREATE TYPE distribution_type AS ENUM (
    'patronage_cash',      -- Cash portion of patronage allocation (IRC 1385)
    'redemption',          -- Redemption of previously retained allocations
    'capital_return',      -- Return of contributed capital
    'liquidating'          -- Final distribution upon dissolution
);

CREATE TYPE distribution_status AS ENUM (
    'scheduled',    -- Approved but not yet paid
    'processing',   -- Payment in progress
    'completed',    -- Successfully paid
    'failed',       -- Payment failed (retry or investigate)
    'cancelled'     -- Cancelled before payment
);

CREATE TABLE distributions (
    distribution_id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,  -- References members in People
    distribution_type distribution_type NOT NULL,
    status distribution_status NOT NULL DEFAULT 'scheduled',
    
    amount NUMERIC(12, 2) NOT NULL,
    
    -- Source references
    allocation_id TEXT REFERENCES member_allocations(allocation_id),  -- For patronage_cash distributions
    period_id TEXT,  -- References accounting_periods for context
    
    -- Payment details
    scheduled_date DATE NOT NULL,
    payment_date DATE,
    payment_method TEXT,  -- 'ach', 'check', 'wire', 'crypto', etc.
    payment_reference TEXT,  -- Check number, tx hash, wire confirmation, etc.
    
    -- Tax reporting
    tax_year INTEGER NOT NULL,
    form_1099_required BOOLEAN DEFAULT false,
    
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT distributions_positive_amount CHECK (amount > 0),
    CONSTRAINT distributions_patronage_requires_allocation CHECK (
        (distribution_type = 'patronage_cash' AND allocation_id IS NOT NULL)
        OR distribution_type != 'patronage_cash'
    )
);

CREATE INDEX idx_distributions_member ON distributions (member_id, scheduled_date DESC);
CREATE INDEX idx_distributions_status ON distributions (status) WHERE status IN ('scheduled', 'processing');
CREATE INDEX idx_distributions_scheduled ON distributions (scheduled_date) WHERE status = 'scheduled';
CREATE INDEX idx_distributions_tax_year ON distributions (tax_year, member_id);
CREATE INDEX idx_distributions_allocation ON distributions (allocation_id) WHERE allocation_id IS NOT NULL;

COMMENT ON TABLE distributions IS 'Scheduled and completed cash distributions to members';
COMMENT ON COLUMN distributions.form_1099_required IS 'Whether this distribution requires IRS Form 1099-MISC reporting';

-- =====================================================
-- PERIOD CLOSE WORKFLOW
-- =====================================================

CREATE TYPE close_step_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'failed',
    'skipped'
);

CREATE TABLE period_close_steps (
    step_id TEXT PRIMARY KEY,
    period_id TEXT NOT NULL,  -- References accounting_periods in Treasury
    
    step_number INTEGER NOT NULL,
    step_name TEXT NOT NULL,
    step_description TEXT,
    
    status close_step_status NOT NULL DEFAULT 'pending',
    
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT period_close_steps_unique_period_step UNIQUE (period_id, step_number)
);

CREATE INDEX idx_period_close_steps_period ON period_close_steps (period_id, step_number);
CREATE INDEX idx_period_close_steps_status ON period_close_steps (status) WHERE status IN ('pending', 'in_progress', 'failed');

COMMENT ON TABLE period_close_steps IS 'Workflow tracking for accounting period close process';
COMMENT ON COLUMN period_close_steps.step_number IS 'Execution order (steps run sequentially)';

-- =====================================================
-- ALLOCATION DETAIL (DENORMALIZED FOR REPORTING)
-- =====================================================

CREATE TABLE allocation_detail (
    detail_id TEXT PRIMARY KEY,
    allocation_id TEXT NOT NULL REFERENCES member_allocations(allocation_id),
    member_id TEXT NOT NULL,
    period_id TEXT NOT NULL,
    
    contribution_type TEXT NOT NULL,  -- 'labor', 'expertise', 'capital', 'relationship'
    contribution_value NUMERIC(12, 2) NOT NULL,
    patronage_weight NUMERIC(5, 2) NOT NULL,
    weighted_value NUMERIC(15, 2) NOT NULL,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_allocation_detail_allocation ON allocation_detail (allocation_id);
CREATE INDEX idx_allocation_detail_member_period ON allocation_detail (member_id, period_id);
CREATE INDEX idx_allocation_detail_type ON allocation_detail (contribution_type);

COMMENT ON TABLE allocation_detail IS 'Denormalized allocation breakdown by contribution type (for reporting and audit)';
COMMENT ON COLUMN allocation_detail.weighted_value IS 'contribution_value × patronage_weight';

-- =====================================================
-- COMPUTED FUNCTIONS
-- =====================================================

-- Calculate member's total allocation
CREATE OR REPLACE FUNCTION calculate_member_allocation(
    p_member_weighted_patronage NUMERIC,
    p_total_weighted_patronage NUMERIC,
    p_allocable_surplus NUMERIC,
    p_cash_rate NUMERIC DEFAULT 0.20
)
RETURNS TABLE (
    total_allocation NUMERIC,
    cash_distribution NUMERIC,
    retained_allocation NUMERIC
) AS $$
DECLARE
    v_total NUMERIC;
    v_cash NUMERIC;
    v_retained NUMERIC;
BEGIN
    v_total := (p_member_weighted_patronage / p_total_weighted_patronage) * p_allocable_surplus;
    v_cash := v_total * p_cash_rate;
    v_retained := v_total * (1 - p_cash_rate);
    
    RETURN QUERY SELECT v_total, v_cash, v_retained;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_member_allocation IS 'Calculates member allocation using patronage formula';

-- =====================================================
-- MATERIALIZED VIEWS
-- =====================================================

-- Allocation summary by period
CREATE MATERIALIZED VIEW period_allocation_summary AS
SELECT
    aa.period_id,
    aa.agreement_id,
    aa.status,
    aa.allocable_surplus,
    aa.total_weighted_patronage,
    COUNT(ma.allocation_id) as member_count,
    SUM(ma.total_allocation) as total_allocated,
    SUM(ma.cash_distribution) as total_cash,
    SUM(ma.retained_allocation) as total_retained,
    aa.approved_at
FROM allocation_agreements aa
LEFT JOIN member_allocations ma ON ma.agreement_id = aa.agreement_id
GROUP BY aa.period_id, aa.agreement_id, aa.status, aa.allocable_surplus, 
         aa.total_weighted_patronage, aa.approved_at;

CREATE UNIQUE INDEX idx_period_allocation_summary ON period_allocation_summary (period_id);

COMMENT ON MATERIALIZED VIEW period_allocation_summary IS 'Summary of allocations per accounting period';

-- Member distribution history
CREATE MATERIALIZED VIEW member_distribution_history AS
SELECT
    d.member_id,
    d.tax_year,
    d.distribution_type,
    COUNT(*) as distribution_count,
    SUM(d.amount) as total_distributed,
    MIN(d.payment_date) as first_payment,
    MAX(d.payment_date) as last_payment
FROM distributions d
WHERE d.status = 'completed'
GROUP BY d.member_id, d.tax_year, d.distribution_type;

CREATE UNIQUE INDEX idx_member_distribution_history ON member_distribution_history (member_id, tax_year, distribution_type);

COMMENT ON MATERIALIZED VIEW member_distribution_history IS 'Aggregated distribution history by member and tax year';

-- Refresh functions
CREATE OR REPLACE FUNCTION refresh_agreements_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY period_allocation_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY member_distribution_history;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- AUDIT TRAIL VIEW
-- =====================================================

CREATE VIEW agreements_audit_trail AS
SELECT
    event_id,
    event_type,
    aggregate_type,
    aggregate_id,
    occurred_at,
    CASE
        WHEN event_type = 'AllocationProposed' THEN
            'Period ' || (payload->>'period_id') || ' allocation proposed: ' || (payload->>'allocable_surplus') || ' surplus'
        WHEN event_type = 'AllocationApproved' THEN
            'Allocation ' || aggregate_id || ' approved by ' || (payload->>'approved_by')
        WHEN event_type = 'DistributionScheduled' THEN
            'Distribution ' || aggregate_id || ' scheduled for ' || (payload->>'member_id') || ': ' || (payload->>'amount')
        WHEN event_type = 'DistributionCompleted' THEN
            'Distribution ' || aggregate_id || ' paid via ' || (payload->>'payment_method')
        WHEN event_type = 'PeriodCloseStarted' THEN
            'Period close started for ' || (payload->>'period_id')
        WHEN event_type = 'PeriodCloseCompleted' THEN
            'Period close completed for ' || (payload->>'period_id')
        ELSE event_type
    END as description,
    payload,
    metadata
FROM agreements_events
ORDER BY occurred_at DESC;

COMMENT ON VIEW agreements_audit_trail IS 'Human-readable audit log of Agreements events';

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patronage_weights_updated_at BEFORE UPDATE ON patronage_weights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER allocation_agreements_updated_at BEFORE UPDATE ON allocation_agreements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER distributions_updated_at BEFORE UPDATE ON distributions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER period_close_steps_updated_at BEFORE UPDATE ON period_close_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- SECURITY
-- =====================================================

ALTER TABLE allocation_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributions ENABLE ROW LEVEL SECURITY;

-- Members can view their own allocations and distributions
CREATE POLICY members_view_own_allocations ON member_allocations
    FOR SELECT
    USING (member_id = current_setting('app.current_member_id', true));

CREATE POLICY members_view_own_distributions ON distributions
    FOR SELECT
    USING (member_id = current_setting('app.current_member_id', true));

COMMENT ON POLICY members_view_own_allocations ON member_allocations IS 'Members can view their own allocation statements';
COMMENT ON POLICY members_view_own_distributions ON distributions IS 'Members can view their own distribution history';

-- =====================================================
-- INTEGRATION NOTES
-- =====================================================

-- This schema integrates with:
-- - Treasury (schema/01_treasury_core.sql) via period_id and transaction references
-- - People (schema/04_people_core.sql) via member_id and contribution summaries
-- - Event sourcing pattern (agreements_events as single source of truth)
-- - Patronage mechanics (operating-agreement-patronage-mechanics.md)
-- - Capital accounts (operating-agreement-capital-accounts.md)

-- Workflow: Period Close → Allocation Calculation → Distribution
-- 1. Period closes in Treasury (status: 'closed')
-- 2. Patronage weights configured in Agreements
-- 3. Member contributions aggregated from People
-- 4. Weighted patronage calculated
-- 5. Allocation agreement proposed
-- 6. Governance approves allocation
-- 7. Member allocations recorded
-- 8. Treasury transactions created (capital account updates)
-- 9. Cash distributions scheduled
-- 10. Distributions executed (ACH, check, wire, crypto)
-- 11. Tax reporting generated (Form 1099-MISC as needed)

-- Next steps:
-- - Sprint 48: REA event grammar specification
-- - Sprint 49: API specification (GraphQL)
-- - Sprint 50: Event bus specification
-- - Integration handlers between Treasury ↔ People ↔ Agreements
