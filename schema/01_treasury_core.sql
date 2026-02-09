-- Habitat Treasury Database Schema
-- Core tables: events, accounts, transactions, entries
-- PostgreSQL 14+
-- Event-sourced with materialized views for performance

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- EVENT STORE
-- =============================================================================

-- Core event log - immutable source of truth
CREATE TABLE events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(50) NOT NULL,      -- 'account', 'transaction', 'member', 'period'
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,         -- 'AccountCreated', 'TransactionRecorded', etc.
    event_version INTEGER NOT NULL DEFAULT 1,
    event_data JSONB NOT NULL,                -- Full event payload
    metadata JSONB DEFAULT '{}'::jsonb,       -- Correlation IDs, user context, causation
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sequence_number BIGSERIAL UNIQUE,
    
    CONSTRAINT event_data_not_empty CHECK (jsonb_typeof(event_data) = 'object')
);

CREATE INDEX idx_events_aggregate ON events(aggregate_type, aggregate_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_occurred ON events(occurred_at DESC);
CREATE INDEX idx_events_sequence ON events(sequence_number);

COMMENT ON TABLE events IS 'Immutable event log. All state changes recorded here. Source of truth for Treasury state.';
COMMENT ON COLUMN events.aggregate_type IS 'Entity type this event affects (account, transaction, member, period)';
COMMENT ON COLUMN events.aggregate_id IS 'ID of the specific entity instance';
COMMENT ON COLUMN events.event_type IS 'Specific event that occurred (AccountCreated, TransactionRecorded, PeriodClosed, etc.)';
COMMENT ON COLUMN events.event_data IS 'Complete event payload as JSON';
COMMENT ON COLUMN events.metadata IS 'Context: correlation_id, causation_id, user_id, timestamp';
COMMENT ON COLUMN events.sequence_number IS 'Global sequence for event ordering';


-- =============================================================================
-- CHART OF ACCOUNTS
-- =============================================================================

CREATE TYPE account_type AS ENUM (
    'asset',
    'liability', 
    'equity',
    'revenue',
    'expense'
);

CREATE TYPE ledger_type AS ENUM (
    'book',     -- Book accounting (GAAP)
    'tax'       -- Tax accounting (IRC 704(b))
);

-- Accounts - materialized from events
CREATE TABLE accounts (
    account_id UUID PRIMARY KEY,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(200) NOT NULL,
    account_type account_type NOT NULL,
    parent_account_id UUID REFERENCES accounts(account_id),
    is_member_capital BOOLEAN DEFAULT FALSE,
    member_id UUID,                           -- If member capital account
    ledger ledger_type NOT NULL DEFAULT 'book',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    
    CONSTRAINT account_hierarchy_no_self_parent CHECK (account_id != parent_account_id),
    CONSTRAINT member_capital_requires_member CHECK (
        (is_member_capital = TRUE AND member_id IS NOT NULL) OR
        (is_member_capital = FALSE)
    )
);

CREATE INDEX idx_accounts_type ON accounts(account_type);
CREATE INDEX idx_accounts_parent ON accounts(parent_account_id);
CREATE INDEX idx_accounts_member ON accounts(member_id) WHERE member_id IS NOT NULL;
CREATE INDEX idx_accounts_ledger ON accounts(ledger);
CREATE INDEX idx_accounts_active ON accounts(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE accounts IS 'Chart of accounts. Materialized from events. Separate book and tax ledgers.';
COMMENT ON COLUMN accounts.is_member_capital IS 'True for member capital accounts (equity tracking per member)';
COMMENT ON COLUMN accounts.member_id IS 'Reference to member if this is a capital account';
COMMENT ON COLUMN accounts.ledger IS 'Book (GAAP) or Tax (IRC 704(b)) ledger';


-- =============================================================================
-- TRANSACTIONS & ENTRIES
-- =============================================================================

CREATE TYPE transaction_type AS ENUM (
    'contribution',
    'distribution',
    'allocation',
    'expense',
    'revenue',
    'transfer',
    'adjustment',
    'revaluation'
);

CREATE TYPE transaction_status AS ENUM (
    'draft',
    'pending',
    'recorded',
    'voided'
);

-- Transactions - materialized from events
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY,
    transaction_date DATE NOT NULL,
    transaction_type transaction_type NOT NULL,
    transaction_status transaction_status NOT NULL DEFAULT 'recorded',
    ledger ledger_type NOT NULL DEFAULT 'book',
    period_id UUID,                           -- Accounting period (nullable for adjustments)
    memo TEXT,
    source_event_id UUID REFERENCES events(event_id),
    recorded_at TIMESTAMPTZ NOT NULL,
    voided_at TIMESTAMPTZ,
    void_reason TEXT,
    
    CONSTRAINT transaction_void_requires_reason CHECK (
        (transaction_status = 'voided' AND voided_at IS NOT NULL AND void_reason IS NOT NULL) OR
        (transaction_status != 'voided')
    )
);

CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_status ON transactions(transaction_status);
CREATE INDEX idx_transactions_period ON transactions(period_id);
CREATE INDEX idx_transactions_ledger ON transactions(ledger);
CREATE INDEX idx_transactions_source ON transactions(source_event_id);

COMMENT ON TABLE transactions IS 'Double-entry transactions. Materialized from events.';
COMMENT ON COLUMN transactions.period_id IS 'Accounting period (quarter/year) for period-close reporting';
COMMENT ON COLUMN transactions.source_event_id IS 'Event that caused this transaction';


-- Transaction entries (debits and credits)
CREATE TYPE entry_direction AS ENUM ('debit', 'credit');

CREATE TABLE transaction_entries (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(account_id),
    amount NUMERIC(15,2) NOT NULL,
    direction entry_direction NOT NULL,
    memo TEXT,
    entry_order INTEGER NOT NULL,             -- Order within transaction
    
    CONSTRAINT entry_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_entries_transaction ON transaction_entries(transaction_id);
CREATE INDEX idx_entries_account ON transaction_entries(account_id);
CREATE INDEX idx_entries_direction ON transaction_entries(direction);

COMMENT ON TABLE transaction_entries IS 'Individual debit/credit entries within a transaction';
COMMENT ON COLUMN transaction_entries.entry_order IS 'Order of entry within transaction for readability';


-- =============================================================================
-- DOUBLE-ENTRY CONSTRAINT
-- =============================================================================

-- Function to verify transaction balances
CREATE OR REPLACE FUNCTION verify_transaction_balance()
RETURNS TRIGGER AS $$
DECLARE
    debit_sum NUMERIC(15,2);
    credit_sum NUMERIC(15,2);
BEGIN
    -- Calculate sum of debits and credits for this transaction
    SELECT 
        COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END), 0)
    INTO debit_sum, credit_sum
    FROM transaction_entries
    WHERE transaction_id = NEW.transaction_id;
    
    -- Verify balance
    IF debit_sum != credit_sum THEN
        RAISE EXCEPTION 'Transaction % does not balance: debits=%, credits=%', 
            NEW.transaction_id, debit_sum, credit_sum;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce double-entry balance
CREATE CONSTRAINT TRIGGER check_transaction_balance
    AFTER INSERT OR UPDATE ON transaction_entries
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION verify_transaction_balance();

COMMENT ON FUNCTION verify_transaction_balance IS 'Enforces double-entry accounting: debits must equal credits';


-- =============================================================================
-- ACCOUNTING PERIODS
-- =============================================================================

CREATE TYPE period_type AS ENUM ('month', 'quarter', 'year', 'custom');
CREATE TYPE period_status AS ENUM ('open', 'closing', 'closed', 'reopened');

CREATE TABLE periods (
    period_id UUID PRIMARY KEY,
    period_name VARCHAR(100) NOT NULL,
    period_type period_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status period_status NOT NULL DEFAULT 'open',
    closed_at TIMESTAMPTZ,
    closed_by_user_id UUID,
    
    CONSTRAINT period_dates_valid CHECK (end_date > start_date),
    CONSTRAINT period_closed_requires_timestamp CHECK (
        (status = 'closed' AND closed_at IS NOT NULL) OR
        (status != 'closed')
    )
);

CREATE INDEX idx_periods_dates ON periods(start_date, end_date);
CREATE INDEX idx_periods_status ON periods(status);

COMMENT ON TABLE periods IS 'Accounting periods for closing, allocation, and reporting';
COMMENT ON COLUMN periods.status IS 'open (active), closing (in progress), closed (locked), reopened (unlocked for adjustment)';


-- =============================================================================
-- MATERIALIZED VIEWS
-- =============================================================================

-- Account balances (current snapshot)
CREATE MATERIALIZED VIEW account_balances AS
SELECT 
    a.account_id,
    a.account_number,
    a.account_name,
    a.account_type,
    a.ledger,
    COALESCE(SUM(
        CASE 
            WHEN te.direction = 'debit' THEN te.amount
            WHEN te.direction = 'credit' THEN -te.amount
        END
    ), 0) AS balance,
    MAX(t.transaction_date) AS last_transaction_date,
    COUNT(DISTINCT t.transaction_id) AS transaction_count
FROM accounts a
LEFT JOIN transaction_entries te ON a.account_id = te.account_id
LEFT JOIN transactions t ON te.transaction_id = t.transaction_id AND t.transaction_status = 'recorded'
WHERE a.is_active = TRUE
GROUP BY a.account_id, a.account_number, a.account_name, a.account_type, a.ledger;

CREATE UNIQUE INDEX idx_account_balances_pk ON account_balances(account_id);
CREATE INDEX idx_account_balances_type ON account_balances(account_type);
CREATE INDEX idx_account_balances_ledger ON account_balances(ledger);

COMMENT ON MATERIALIZED VIEW account_balances IS 'Current balance for each account. Refresh after posting transactions.';


-- Period balances (snapshot per period)
CREATE MATERIALIZED VIEW period_account_balances AS
SELECT 
    p.period_id,
    a.account_id,
    a.account_number,
    a.account_name,
    a.account_type,
    a.ledger,
    COALESCE(SUM(
        CASE 
            WHEN te.direction = 'debit' THEN te.amount
            WHEN te.direction = 'credit' THEN -te.amount
        END
    ), 0) AS period_balance,
    COUNT(DISTINCT t.transaction_id) AS transaction_count
FROM periods p
CROSS JOIN accounts a
LEFT JOIN transactions t ON t.period_id = p.period_id AND t.transaction_status = 'recorded'
LEFT JOIN transaction_entries te ON te.transaction_id = t.transaction_id AND te.account_id = a.account_id
WHERE a.is_active = TRUE
GROUP BY p.period_id, a.account_id, a.account_number, a.account_name, a.account_type, a.ledger;

CREATE UNIQUE INDEX idx_period_balances_pk ON period_account_balances(period_id, account_id);
CREATE INDEX idx_period_balances_period ON period_account_balances(period_id);

COMMENT ON MATERIALIZED VIEW period_account_balances IS 'Account balances per period for period close reporting';


-- =============================================================================
-- REFRESH FUNCTIONS
-- =============================================================================

-- Refresh all materialized views (call after event replay or batch posting)
CREATE OR REPLACE FUNCTION refresh_treasury_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY account_balances;
    REFRESH MATERIALIZED VIEW CONCURRENTLY period_account_balances;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_treasury_views IS 'Refresh all Treasury materialized views. Call after event replay or batch transaction posting.';
