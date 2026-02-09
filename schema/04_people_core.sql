-- =====================================================
-- HABITAT PEOPLE SYSTEM - CORE SCHEMA
-- =====================================================
-- Members, Contributions, Approvals
-- PostgreSQL 14+, Supabase-compatible
-- Part of Habitat patronage accounting infrastructure
-- Sprint 46
-- =====================================================

-- =====================================================
-- EVENT STORE
-- =====================================================

CREATE TABLE people_events (
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
    
    CONSTRAINT people_events_sequence_unique UNIQUE (aggregate_type, aggregate_id, sequence_number)
);

CREATE INDEX idx_people_events_aggregate ON people_events (aggregate_type, aggregate_id, sequence_number);
CREATE INDEX idx_people_events_type ON people_events (event_type, occurred_at DESC);
CREATE INDEX idx_people_events_occurred ON people_events (occurred_at DESC);
CREATE INDEX idx_people_events_correlation ON people_events (correlation_id) WHERE correlation_id IS NOT NULL;

COMMENT ON TABLE people_events IS 'Event store for People bounded context - all state changes flow through events';
COMMENT ON COLUMN people_events.aggregate_type IS 'Entity type: Member, Contribution, Approval';
COMMENT ON COLUMN people_events.sequence_number IS 'Per-aggregate sequence ensuring ordered replay';
COMMENT ON COLUMN people_events.causation_id IS 'Event that directly caused this event';
COMMENT ON COLUMN people_events.correlation_id IS 'Process/workflow identifier grouping related events';

-- =====================================================
-- MEMBERS
-- =====================================================

CREATE TYPE member_status AS ENUM (
    'pending',      -- Application submitted, not yet approved
    'active',       -- Full membership rights
    'suspended',    -- Temporarily suspended (governance action)
    'inactive',     -- Voluntarily inactive (sabbatical, leave)
    'withdrawn',    -- Voluntarily withdrew from cooperative
    'expelled'      -- Involuntarily removed (governance action)
);

CREATE TYPE member_tier AS ENUM (
    'community',    -- Events, communications, basic participation
    'coworking',    -- Physical space access, operational benefits
    'cooperative'   -- Full governance, equity stake, voting authority
);

CREATE TABLE members (
    member_id TEXT PRIMARY KEY,
    legal_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    ens_name TEXT UNIQUE,
    
    status member_status NOT NULL DEFAULT 'pending',
    tier member_tier NOT NULL DEFAULT 'community',
    
    joined_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    
    hourly_rate_usd NUMERIC(10, 2),
    expertise_rate_usd NUMERIC(10, 2),
    
    voting_rights BOOLEAN NOT NULL DEFAULT false,
    board_eligible BOOLEAN NOT NULL DEFAULT false,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT members_hourly_rate_positive CHECK (hourly_rate_usd IS NULL OR hourly_rate_usd > 0),
    CONSTRAINT members_expertise_rate_positive CHECK (expertise_rate_usd IS NULL OR expertise_rate_usd > 0),
    CONSTRAINT members_tier_status_consistency CHECK (
        (tier = 'cooperative' AND status IN ('active', 'suspended', 'inactive', 'withdrawn', 'expelled'))
        OR tier IN ('community', 'coworking')
    )
);

CREATE INDEX idx_members_status ON members (status) WHERE status IN ('active', 'pending');
CREATE INDEX idx_members_tier ON members (tier);
CREATE INDEX idx_members_voting ON members (voting_rights) WHERE voting_rights = true;
CREATE INDEX idx_members_ens ON members (ens_name) WHERE ens_name IS NOT NULL;

COMMENT ON TABLE members IS 'Members of the cooperative across three tiers';
COMMENT ON COLUMN members.ens_name IS 'ENS subname from habitat.eth namespace (e.g., alice.habitat.eth)';
COMMENT ON COLUMN members.tier IS 'Membership tier: community (basic), coworking (space access), cooperative (full governance)';
COMMENT ON COLUMN members.hourly_rate_usd IS 'Standard hourly rate for labor patronage';
COMMENT ON COLUMN members.expertise_rate_usd IS 'Rate for specialized expertise contributions';

-- =====================================================
-- CONTRIBUTION TYPES
-- =====================================================

CREATE TYPE contribution_type AS ENUM (
    'labor',        -- Hours of work performed
    'expertise',    -- Specialized knowledge or professional services
    'capital',      -- Financial resources (cash, property, loans)
    'relationship'  -- Business relationships or revenue opportunities
);

CREATE TYPE contribution_status AS ENUM (
    'draft',        -- Being recorded, not yet submitted
    'submitted',    -- Submitted for approval
    'approved',     -- Approved and counted toward patronage
    'rejected',     -- Rejected (with reason)
    'disputed'      -- Under dispute resolution
);

-- =====================================================
-- CONTRIBUTIONS
-- =====================================================

CREATE TABLE contributions (
    contribution_id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES members(member_id),
    contribution_type contribution_type NOT NULL,
    status contribution_status NOT NULL DEFAULT 'draft',
    
    period_id TEXT NOT NULL,  -- References accounting_periods in Treasury
    
    -- Labor contributions
    hours_worked NUMERIC(10, 2),
    hourly_rate NUMERIC(10, 2),
    
    -- Expertise contributions
    expertise_description TEXT,
    expertise_value NUMERIC(12, 2),
    
    -- Capital contributions
    capital_type TEXT,  -- 'cash', 'property', 'loan', 'guarantee'
    capital_amount NUMERIC(12, 2),
    
    -- Relationship contributions
    relationship_description TEXT,
    relationship_value NUMERIC(12, 2),
    
    -- Common fields
    description TEXT NOT NULL,
    notes TEXT,
    evidence_urls TEXT[],
    
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by TEXT REFERENCES members(member_id),
    rejected_at TIMESTAMPTZ,
    rejected_by TEXT REFERENCES members(member_id),
    rejection_reason TEXT,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT contributions_labor_fields CHECK (
        (contribution_type = 'labor' AND hours_worked IS NOT NULL AND hourly_rate IS NOT NULL)
        OR contribution_type != 'labor'
    ),
    CONSTRAINT contributions_expertise_fields CHECK (
        (contribution_type = 'expertise' AND expertise_description IS NOT NULL AND expertise_value IS NOT NULL)
        OR contribution_type != 'expertise'
    ),
    CONSTRAINT contributions_capital_fields CHECK (
        (contribution_type = 'capital' AND capital_type IS NOT NULL AND capital_amount IS NOT NULL)
        OR contribution_type != 'capital'
    ),
    CONSTRAINT contributions_relationship_fields CHECK (
        (contribution_type = 'relationship' AND relationship_description IS NOT NULL AND relationship_value IS NOT NULL)
        OR contribution_type != 'relationship'
    ),
    CONSTRAINT contributions_positive_values CHECK (
        (hours_worked IS NULL OR hours_worked > 0) AND
        (hourly_rate IS NULL OR hourly_rate > 0) AND
        (expertise_value IS NULL OR expertise_value > 0) AND
        (capital_amount IS NULL OR capital_amount > 0) AND
        (relationship_value IS NULL OR relationship_value > 0)
    )
);

CREATE INDEX idx_contributions_member ON contributions (member_id, period_id);
CREATE INDEX idx_contributions_period ON contributions (period_id, status);
CREATE INDEX idx_contributions_status ON contributions (status) WHERE status IN ('submitted', 'approved');
CREATE INDEX idx_contributions_type ON contributions (contribution_type);
CREATE INDEX idx_contributions_approval ON contributions (approved_by, approved_at) WHERE approved_at IS NOT NULL;

COMMENT ON TABLE contributions IS 'Member contributions across four patronage types';
COMMENT ON COLUMN contributions.period_id IS 'Accounting period (references Treasury accounting_periods)';
COMMENT ON COLUMN contributions.evidence_urls IS 'Supporting documentation (timesheets, invoices, contracts, etc.)';

-- =====================================================
-- APPROVALS
-- =====================================================

CREATE TABLE approvals (
    approval_id TEXT PRIMARY KEY,
    contribution_id TEXT NOT NULL REFERENCES contributions(contribution_id),
    approver_id TEXT NOT NULL REFERENCES members(member_id),
    
    approved BOOLEAN NOT NULL,
    approval_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    comments TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT approvals_unique_per_contribution_approver UNIQUE (contribution_id, approver_id)
);

CREATE INDEX idx_approvals_contribution ON approvals (contribution_id);
CREATE INDEX idx_approvals_approver ON approvals (approver_id, approval_date DESC);
CREATE INDEX idx_approvals_pending ON approvals (approved, approval_date DESC) WHERE approved = false;

COMMENT ON TABLE approvals IS 'Approval workflow for contributions (may require multiple approvers)';

-- =====================================================
-- APPROVAL POLICIES
-- =====================================================

CREATE TABLE approval_policies (
    policy_id TEXT PRIMARY KEY,
    contribution_type contribution_type NOT NULL,
    member_tier member_tier NOT NULL,
    
    required_approvers INTEGER NOT NULL DEFAULT 1,
    approver_role TEXT,  -- 'board', 'treasurer', 'operations', 'any-cooperative-member'
    
    max_value_threshold NUMERIC(12, 2),
    
    active BOOLEAN NOT NULL DEFAULT true,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT approval_policies_positive_approvers CHECK (required_approvers > 0),
    CONSTRAINT approval_policies_positive_threshold CHECK (max_value_threshold IS NULL OR max_value_threshold > 0)
);

CREATE INDEX idx_approval_policies_type_tier ON approval_policies (contribution_type, member_tier) WHERE active = true;

COMMENT ON TABLE approval_policies IS 'Configurable approval requirements by contribution type and member tier';
COMMENT ON COLUMN approval_policies.max_value_threshold IS 'Contributions exceeding this value may require additional approval';

-- =====================================================
-- COMPUTED VALUE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION contribution_value(c contributions)
RETURNS NUMERIC AS $$
BEGIN
    RETURN CASE c.contribution_type
        WHEN 'labor' THEN c.hours_worked * c.hourly_rate
        WHEN 'expertise' THEN c.expertise_value
        WHEN 'capital' THEN c.capital_amount
        WHEN 'relationship' THEN c.relationship_value
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION contribution_value IS 'Computed value of a contribution based on type-specific fields';

-- =====================================================
-- MATERIALIZED VIEWS
-- =====================================================

-- Member patronage summary by period
CREATE MATERIALIZED VIEW member_patronage_summary AS
SELECT
    c.member_id,
    c.period_id,
    c.contribution_type,
    COUNT(*) as contribution_count,
    SUM(contribution_value(c)) as total_value,
    SUM(CASE WHEN c.contribution_type = 'labor' THEN c.hours_worked ELSE 0 END) as total_hours
FROM contributions c
WHERE c.status = 'approved'
GROUP BY c.member_id, c.period_id, c.contribution_type;

CREATE UNIQUE INDEX idx_member_patronage_summary ON member_patronage_summary (member_id, period_id, contribution_type);
CREATE INDEX idx_member_patronage_summary_period ON member_patronage_summary (period_id);

COMMENT ON MATERIALIZED VIEW member_patronage_summary IS 'Aggregated patronage contributions by member, period, and type';

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_member_patronage_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY member_patronage_summary;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- AUDIT TRAIL VIEW
-- =====================================================

CREATE VIEW people_audit_trail AS
SELECT
    event_id,
    event_type,
    aggregate_type,
    aggregate_id,
    occurred_at,
    CASE
        WHEN event_type = 'MemberJoined' THEN
            'Member ' || (payload->>'member_id') || ' joined as ' || (payload->>'tier')
        WHEN event_type = 'MemberStatusChanged' THEN
            'Member ' || aggregate_id || ' status: ' || (payload->>'old_status') || ' → ' || (payload->>'new_status')
        WHEN event_type = 'ContributionSubmitted' THEN
            'Contribution ' || aggregate_id || ' submitted by ' || (payload->>'member_id') || ' (' || (payload->>'contribution_type') || ')'
        WHEN event_type = 'ContributionApproved' THEN
            'Contribution ' || aggregate_id || ' approved by ' || (payload->>'approver_id')
        WHEN event_type = 'ContributionRejected' THEN
            'Contribution ' || aggregate_id || ' rejected: ' || (payload->>'reason')
        ELSE event_type
    END as description,
    payload,
    metadata
FROM people_events
ORDER BY occurred_at DESC;

COMMENT ON VIEW people_audit_trail IS 'Human-readable audit log of People events';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER contributions_updated_at BEFORE UPDATE ON contributions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER approval_policies_updated_at BEFORE UPDATE ON approval_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- SECURITY
-- =====================================================

-- Row-level security policies (examples - customize per deployment)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- Example: Members can view their own contributions
CREATE POLICY members_view_own_contributions ON contributions
    FOR SELECT
    USING (member_id = current_setting('app.current_member_id', true));

-- Example: Approvers can view contributions they're assigned to review
CREATE POLICY approvers_view_assigned ON contributions
    FOR SELECT
    USING (
        status = 'submitted' AND
        EXISTS (
            SELECT 1 FROM approval_policies ap
            WHERE ap.contribution_type = contributions.contribution_type
            AND ap.active = true
        )
    );

COMMENT ON POLICY members_view_own_contributions ON contributions IS 'Members can view their own contributions';
COMMENT ON POLICY approvers_view_assigned ON contributions IS 'Approvers can view contributions pending approval';

-- =====================================================
-- SAMPLE APPROVAL POLICIES
-- =====================================================

-- Default policies (customize per cooperative)
INSERT INTO approval_policies (policy_id, contribution_type, member_tier, required_approvers, approver_role) VALUES
    ('policy_labor_community', 'labor', 'community', 1, 'operations'),
    ('policy_labor_coworking', 'labor', 'coworking', 1, 'operations'),
    ('policy_labor_cooperative', 'labor', 'cooperative', 1, 'any-cooperative-member'),
    ('policy_expertise_all', 'expertise', 'cooperative', 1, 'treasurer'),
    ('policy_capital_all', 'capital', 'cooperative', 2, 'board'),
    ('policy_relationship_all', 'relationship', 'cooperative', 1, 'operations');

COMMENT ON TABLE approval_policies IS 'Seeded with default approval policies - customize per cooperative needs';

-- =====================================================
-- INTEGRATION NOTES
-- =====================================================

-- This schema integrates with:
-- - Treasury (schema/01_treasury_core.sql) via period_id references
-- - Habitat Identity (ENS namespace) via members.ens_name
-- - Event sourcing pattern (people_events as single source of truth)
-- - Patronage allocation (weighted contributions feed Treasury calculations)

-- Next steps:
-- - Sprint 47: Agreements database schema
-- - API layer to expose contributions, approvals, member management
-- - Event handlers to sync with Treasury when contributions are approved
-- - GraphQL resolvers for member patronage queries
