# Compliance Regression Test Suite

Comprehensive compliance verification for IRC 704(b), double-entry accounting, allocation formulas, and K-1 data assembly (Layer 6 - Constraint).

## Overview

These tests verify that all compliance checks pass and no regressions occur in:
- IRC 704(b) capital account maintenance
- Double-entry bookkeeping integrity
- Patronage allocation formulas
- K-1 tax reporting data
- IRC 1385 minimum cash requirements

## Test Files

### `regression.test.ts`

Comprehensive compliance test suite.

**Test Suites:**

1. **IRC 704(b) Capital Account Compliance**
   - Capital account validation
   - Balance mismatch detection
   - Negative capital detection
   - Distributions and allocations
   - Tax basis tracking

2. **Double-Entry Integrity**
   - Balanced transactions
   - Unbalanced detection
   - Rounding handling

3. **Allocation Formula Verification**
   - Patronage allocation correctness
   - Allocation sum validation
   - Weighted contribution formula
   - Patronage score summation

4. **K-1 Data Assembly**
   - Complete K-1 data
   - Beginning/ending balances
   - Current year transactions only
   - Patronage dividend calculation

5. **IRC 1385 Minimum Cash Requirement**
   - 20% minimum cash distribution
   - Below-minimum rejection
   - 100% cash allowed

6. **Compliance Regression Tests**
   - No negative capital accounts
   - Multi-period integrity
   - Consistent rounding

## Running Tests

```bash
# Run all compliance tests
pnpm test compliance

# Run specific suite
pnpm test regression

# Watch mode
pnpm test compliance --watch

# With coverage
pnpm test compliance --coverage
```

## IRC 704(b) Requirements

### Capital Account Maintenance

Capital accounts must reflect:
- Initial contributions
- Additional contributions
- Share of income/gain
- Share of loss/deduction
- Distributions

**Formula:**
```
Ending Capital = Beginning Capital 
               + Contributions 
               + Share of Income 
               - Share of Losses 
               - Distributions
```

### Tax Basis Tracking

- **Cash contributions:** Basis = Amount
- **Property contributions:** Basis = Adjusted basis of property (may differ from FMV)

### Negative Capital Accounts

Generally not allowed unless:
- Deficit restoration obligation exists
- Qualified income offset provisions apply

Tests verify no negative capital accounts unless explicitly allowed.

## Double-Entry Integrity

Every transaction must balance:

```
Debits = Credits
```

Example:
```
Date: 2026-01-01
Description: Member capital contribution

Dr. Cash                  $10,000
  Cr. Member Capital              $10,000
```

Tests verify:
- All entries balance
- Rounding handled correctly
- No unbalanced entries

## Allocation Formula

### Simple Allocation

```typescript
const patronageScore = memberContribution / totalContributions;
const allocationAmount = distributionAmount * patronageScore;
```

Example:
- Member A contributes $200
- Member B contributes $300
- Total: $500
- Distribution: $1,000

Allocations:
- Member A: $200/$500 × $1,000 = $400 (40%)
- Member B: $300/$500 × $1,000 = $600 (60%)

### Weighted Allocation

```typescript
const weightedContribution = 
  (laborAmount × laborWeight) + 
  (capitalAmount × capitalWeight) + 
  (propertyAmount × propertyWeight);

const patronageScore = weightedContribution / totalWeightedContributions;
```

Example weights:
- Labor: 1.0 (full value)
- Capital: 0.5 (half value)
- Property: 0.5 (half value)

Tests verify:
- Allocation amounts sum to distribution amount
- Patronage scores sum to 1.0
- Weighted formula applied correctly

## K-1 Data Requirements

IRS Schedule K-1 (Form 1065) requires:

- Tax year
- Member information (name, SSN/EIN, address)
- Beginning capital account balance
- Current year contributions
- Current year income/loss share
- Current year withdrawals/distributions
- Ending capital account balance
- Tax basis
- Patronage dividends (qualified/non-qualified)

Tests verify:
- All required fields present
- Amounts calculated correctly
- Only current year transactions included
- Beginning/ending balances reconcile

## IRC 1385 Minimum Cash

Cooperative patronage dividends must distribute:
- **At least 20% in cash**
- Remaining can be retained or distributed as qualified written notices

Example:
- Total patronage dividend: $10,000
- Minimum cash: $2,000 (20%)
- Retained patronage: $8,000 (80%)

Tests verify:
- 20% minimum enforced
- 100% cash allowed
- Below-minimum rejected

## Assertions

### Capital Account Validation

```typescript
it('should validate correct capital account', () => {
  const result = validate704bCapitalAccount(account, contributions, allocations);
  
  expect(result.valid).toBe(true);
  expect(result.errors).toHaveLength(0);
});
```

### Balance Mismatch Detection

```typescript
it('should detect balance mismatch', () => {
  const result = validate704bCapitalAccount(account, contributions, allocations);
  
  expect(result.valid).toBe(false);
  expect(result.errors).toContainEqual(
    expect.objectContaining({
      code: 'BALANCE_MISMATCH',
    })
  );
});
```

### Allocation Formula

```typescript
it('should verify correct patronage allocation', () => {
  const result = verifyAllocationFormula(contributions, allocations, distributionAmount);
  
  expect(result.valid).toBe(true);
  
  // Verify sum
  const sum = allocations.reduce((s, a) => s + parseFloat(a.amount), 0);
  expect(sum).toBe(distributionAmount);
  
  // Verify scores sum to 1.0
  const scoreSum = allocations.reduce((s, a) => s + parseFloat(a.patronage_score), 0);
  expect(scoreSum).toBeCloseTo(1.0, 10);
});
```

### K-1 Data

```typescript
it('should assemble complete K-1 data', () => {
  const k1Data = assembleK1Data(member, capitalAccount, contributions, allocations, taxYear);
  
  expect(k1Data.taxYear).toBe(2026);
  expect(k1Data.member.name).toBeTruthy();
  expect(k1Data.capitalAccount.beginningBalance).toBeDefined();
  expect(k1Data.capitalAccount.endingBalance).toBeDefined();
  expect(k1Data.patronageDividends).toBeDefined();
});
```

## When Tests Fail

### Balance Mismatch

```
Expected capital account balance to match contributions + allocations
```

**Check:**
- Are all contributions recorded?
- Are all allocations recorded?
- Is calculation logic correct?
- Check for rounding errors

### Allocation Sum Mismatch

```
Expected allocation sum to equal distribution amount
Received: 999.99, Expected: 1000.00
```

**Check:**
- Rounding strategy
- Are all members included?
- Is distribution amount correct?

### Negative Capital Account

```
Capital account balance is negative: -$1,000
```

**Check:**
- Did distributions exceed contributions + allocations?
- Is there a data entry error?
- Should this member have a deficit restoration obligation?

## Best Practices

1. **Test edge cases**
   - Zero contributions
   - Single member
   - Equal splits
   - Unequal splits
   - Rounding boundaries

2. **Test regulatory requirements**
   - IRC 704(b) rules
   - IRC 1385 minimums
   - Double-entry rules
   - K-1 completeness

3. **Test regression scenarios**
   - Multi-period integrity
   - Negative balances
   - Rounding consistency

4. **Verify formulas**
   - Manual calculation
   - Cross-check with spec
   - Test with known values

5. **Document assumptions**
   - Contribution weights
   - Distribution policies
   - Tax treatment

## Compliance Checklist

Before each release:

- [ ] All IRC 704(b) tests pass
- [ ] Double-entry integrity verified
- [ ] Allocation formulas correct
- [ ] K-1 data complete and accurate
- [ ] IRC 1385 minimum cash enforced
- [ ] No negative capital accounts
- [ ] Rounding handled consistently
- [ ] Tax basis tracking correct
- [ ] Multi-period integrity maintained

## References

- [IRC 704(b)](https://www.law.cornell.edu/uscode/text/26/704) - Partner's distributive share
- [IRC 1385](https://www.law.cornell.edu/uscode/text/26/1385) - Amount includible in patron's gross income
- [IRS Publication 541](https://www.irs.gov/publications/p541) - Partnerships
- [IRS Form 1065](https://www.irs.gov/forms-pubs/about-form-1065) - U.S. Return of Partnership Income
- [Schedule K-1](https://www.irs.gov/forms-pubs/about-schedule-k-1-form-1065) - Partner's Share of Income
