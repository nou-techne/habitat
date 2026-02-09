-- Habitat Treasury Seed Data
-- Sample data for development and testing
-- Run after 01_treasury_core.sql

-- =============================================================================
-- SEED: Accounting Periods
-- =============================================================================

INSERT INTO periods (period_id, period_name, period_type, start_date, end_date, status) VALUES
    (gen_random_uuid(), 'Q1 2026', 'quarter', '2026-01-01', '2026-03-31', 'open'),
    (gen_random_uuid(), 'Q2 2026', 'quarter', '2026-04-01', '2026-06-30', 'open'),
    (gen_random_uuid(), 'Jan 2026', 'month', '2026-01-01', '2026-01-31', 'closed'),
    (gen_random_uuid(), 'Feb 2026', 'month', '2026-02-01', '2026-02-29', 'closed');


-- =============================================================================
-- SEED: Chart of Accounts (Book Ledger)
-- =============================================================================

-- Assets
INSERT INTO accounts (account_id, account_number, account_name, account_type, ledger, is_active) VALUES
    (gen_random_uuid(), '1010', 'Cash - Operating', 'asset', 'book', true),
    (gen_random_uuid(), '1020', 'Cash - Reserves', 'asset', 'book', true),
    (gen_random_uuid(), '1100', 'Accounts Receivable', 'asset', 'book', true),
    (gen_random_uuid(), '1500', 'Equipment', 'asset', 'book', true),
    (gen_random_uuid(), '1510', 'Accumulated Depreciation - Equipment', 'asset', 'book', true);

-- Liabilities
INSERT INTO accounts (account_id, account_number, account_name, account_type, ledger, is_active) VALUES
    (gen_random_uuid(), '2010', 'Accounts Payable', 'liability', 'book', true),
    (gen_random_uuid(), '2100', 'Deferred Revenue', 'liability', 'book', true),
    (gen_random_uuid(), '2500', 'Long-term Debt', 'liability', 'book', true);

-- Equity - Member Capital Accounts (book basis)
INSERT INTO accounts (account_id, account_number, account_name, account_type, ledger, is_member_capital, member_id, is_active) VALUES
    (gen_random_uuid(), '3100', 'Capital - Alice (Book)', 'equity', 'book', true, 'member-alice-uuid', true),
    (gen_random_uuid(), '3110', 'Capital - Bob (Book)', 'equity', 'book', true, 'member-bob-uuid', true),
    (gen_random_uuid(), '3120', 'Capital - Carol (Book)', 'equity', 'book', true, 'member-carol-uuid', true),
    (gen_random_uuid(), '3130', 'Capital - David (Book)', 'equity', 'book', true, 'member-david-uuid', true);

-- Equity - Retained Earnings
INSERT INTO accounts (account_id, account_number, account_name, account_type, ledger, is_active) VALUES
    (gen_random_uuid(), '3900', 'Retained Earnings', 'equity', 'book', true),
    (gen_random_uuid(), '3910', 'Current Year Net Income', 'equity', 'book', true);

-- Revenue
INSERT INTO accounts (account_id, account_number, account_name, account_type, ledger, is_active) VALUES
    (gen_random_uuid(), '4010', 'Space Revenue', 'revenue', 'book', true),
    (gen_random_uuid(), '4020', 'Service Revenue', 'revenue', 'book', true),
    (gen_random_uuid(), '4030', 'Venture Revenue Share', 'revenue', 'book', true),
    (gen_random_uuid(), '4100', '$CLOUD Credit Sales', 'revenue', 'book', true);

-- Expenses
INSERT INTO accounts (account_id, account_number, account_name, account_type, ledger, is_active) VALUES
    (gen_random_uuid(), '5010', 'Rent Expense', 'expense', 'book', true),
    (gen_random_uuid(), '5020', 'Utilities', 'expense', 'book', true),
    (gen_random_uuid(), '5100', 'Salaries & Wages', 'expense', 'book', true),
    (gen_random_uuid(), '5200', 'Professional Services', 'expense', 'book', true),
    (gen_random_uuid(), '5300', 'Insurance', 'expense', 'book', true),
    (gen_random_uuid(), '5400', 'Infrastructure Hosting', 'expense', 'book', true),
    (gen_random_uuid(), '5500', 'Depreciation Expense', 'expense', 'book', true);


-- =============================================================================
-- SEED: Chart of Accounts (Tax Ledger)
-- =============================================================================

-- Tax basis capital accounts (may differ from book due to 704(c) allocations)
INSERT INTO accounts (account_id, account_number, account_name, account_type, ledger, is_member_capital, member_id, is_active) VALUES
    (gen_random_uuid(), '3100', 'Capital - Alice (Tax)', 'equity', 'tax', true, 'member-alice-uuid', true),
    (gen_random_uuid(), '3110', 'Capital - Bob (Tax)', 'equity', 'tax', true, 'member-bob-uuid', true),
    (gen_random_uuid(), '3120', 'Capital - Carol (Tax)', 'equity', 'tax', true, 'member-carol-uuid', true),
    (gen_random_uuid(), '3130', 'Capital - David (Tax)', 'equity', 'tax', true, 'member-david-uuid', true);

-- Other tax accounts mirror book ledger structure (not shown for brevity)
-- In production, both ledgers would have complete charts of accounts


-- =============================================================================
-- SEED: Sample Transactions
-- =============================================================================

-- Get period ID for Q1 2026
DO $$
DECLARE
    q1_period_id UUID;
    cash_operating_id UUID;
    capital_alice_book_id UUID;
    capital_bob_book_id UUID;
    space_revenue_id UUID;
    cloud_revenue_id UUID;
    rent_expense_id UUID;
    trans_id UUID;
BEGIN
    SELECT period_id INTO q1_period_id FROM periods WHERE period_name = 'Q1 2026';
    SELECT account_id INTO cash_operating_id FROM accounts WHERE account_number = '1010' AND ledger = 'book';
    SELECT account_id INTO capital_alice_book_id FROM accounts WHERE account_number = '3100' AND ledger = 'book';
    SELECT account_id INTO capital_bob_book_id FROM accounts WHERE account_number = '3110' AND ledger = 'book';
    SELECT account_id INTO space_revenue_id FROM accounts WHERE account_number = '4010';
    SELECT account_id INTO cloud_revenue_id FROM accounts WHERE account_number = '4100';
    SELECT account_id INTO rent_expense_id FROM accounts WHERE account_number = '5010';

    -- Transaction 1: Alice initial cash contribution
    INSERT INTO events (aggregate_type, aggregate_id, event_type, event_data, metadata, occurred_at) VALUES (
        'transaction',
        gen_random_uuid(),
        'TransactionRecorded',
        jsonb_build_object(
            'transaction_date', '2026-01-15',
            'ledger', 'book',
            'transaction_type', 'contribution',
            'memo', 'Initial cash contribution - Alice'
        ),
        jsonb_build_object('user_id', 'member-alice-uuid'),
        '2026-01-15 10:00:00-07'::timestamptz
    );

    trans_id := gen_random_uuid();
    INSERT INTO transactions (transaction_id, transaction_date, transaction_type, transaction_status, ledger, period_id, memo, recorded_at) VALUES
        (trans_id, '2026-01-15', 'contribution', 'recorded', 'book', q1_period_id, 'Initial cash contribution - Alice', '2026-01-15 10:00:00-07');

    INSERT INTO transaction_entries (transaction_id, account_id, amount, direction, memo, entry_order) VALUES
        (trans_id, cash_operating_id, 5000.00, 'debit', 'Cash received', 1),
        (trans_id, capital_alice_book_id, 5000.00, 'credit', 'Capital account increase', 2);

    -- Transaction 2: Bob initial cash contribution
    trans_id := gen_random_uuid();
    INSERT INTO transactions (transaction_id, transaction_date, transaction_type, transaction_status, ledger, period_id, memo, recorded_at) VALUES
        (trans_id, '2026-01-20', 'contribution', 'recorded', 'book', q1_period_id, 'Initial cash contribution - Bob', '2026-01-20 14:30:00-07');

    INSERT INTO transaction_entries (transaction_id, account_id, amount, direction, memo, entry_order) VALUES
        (trans_id, cash_operating_id, 8000.00, 'debit', 'Cash received', 1),
        (trans_id, capital_bob_book_id, 8000.00, 'credit', 'Capital account increase', 2);

    -- Transaction 3: Space revenue collected
    trans_id := gen_random_uuid();
    INSERT INTO transactions (transaction_id, transaction_date, transaction_type, transaction_status, ledger, period_id, memo, recorded_at) VALUES
        (trans_id, '2026-02-01', 'revenue', 'recorded', 'book', q1_period_id, 'February co-working space fees', '2026-02-01 09:00:00-07');

    INSERT INTO transaction_entries (transaction_id, account_id, amount, direction, memo, entry_order) VALUES
        (trans_id, cash_operating_id, 3500.00, 'debit', 'Cash received', 1),
        (trans_id, space_revenue_id, 3500.00, 'credit', 'Revenue earned', 2);

    -- Transaction 4: $CLOUD credit sale
    trans_id := gen_random_uuid();
    INSERT INTO transactions (transaction_id, transaction_date, transaction_type, transaction_status, ledger, period_id, memo, recorded_at) VALUES
        (trans_id, '2026-02-10', 'revenue', 'recorded', 'book', q1_period_id, '$CLOUD credit purchase - 100 CLOUD', '2026-02-10 11:15:00-07');

    INSERT INTO transaction_entries (transaction_id, account_id, amount, direction, memo, entry_order) VALUES
        (trans_id, cash_operating_id, 1000.00, 'debit', 'USD received (100 CLOUD × $10)', 1),
        (trans_id, cloud_revenue_id, 1000.00, 'credit', '$CLOUD credit sale', 2);

    -- Transaction 5: Rent expense payment
    trans_id := gen_random_uuid();
    INSERT INTO transactions (transaction_id, transaction_date, transaction_type, transaction_status, ledger, period_id, memo, recorded_at) VALUES
        (trans_id, '2026-02-05', 'expense', 'recorded', 'book', q1_period_id, 'February rent payment', '2026-02-05 16:00:00-07');

    INSERT INTO transaction_entries (transaction_id, account_id, amount, direction, memo, entry_order) VALUES
        (trans_id, rent_expense_id, 4200.00, 'debit', 'Rent expense', 1),
        (trans_id, cash_operating_id, 4200.00, 'credit', 'Cash paid', 2);

END $$;


-- =============================================================================
-- REFRESH MATERIALIZED VIEWS
-- =============================================================================

REFRESH MATERIALIZED VIEW account_balances;
REFRESH MATERIALIZED VIEW period_account_balances;


-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify double-entry accounting: all entries should balance to zero
SELECT 
    'Double-entry balance check' AS test,
    SUM(CASE WHEN direction = 'debit' THEN amount ELSE -amount END) AS net_balance,
    CASE 
        WHEN SUM(CASE WHEN direction = 'debit' THEN amount ELSE -amount END) = 0 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END AS result
FROM transaction_entries te
JOIN transactions t ON te.transaction_id = t.transaction_id
WHERE t.transaction_status = 'recorded';

-- Show account balances
SELECT 
    account_number,
    account_name,
    account_type,
    ledger,
    balance,
    transaction_count
FROM account_balances
ORDER BY account_number, ledger;

-- Show member capital account balances (book basis)
SELECT 
    account_name,
    balance AS book_balance
FROM account_balances
WHERE account_type = 'equity' 
  AND is_member_capital = true
  AND ledger = 'book'
ORDER BY account_name;

-- Show cash position
SELECT 
    account_name,
    balance
FROM account_balances
WHERE account_number LIKE '10%'  -- Cash accounts
ORDER BY account_number;
