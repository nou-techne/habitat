# Sprint 124: Superfluid Stream Integration Specification

**Sprint:** 124  
**Role:** Integration Engineer (03) + Event Systems Engineer (04)  
**Layer:** 3 (Relationship) + 4 (Event)  
**Type:** Specification  
**Status:** COMPLETE

---

## Overview

Specification for Superfluid stream integration into Habitat patronage accounting system. Defines the bridge between continuous on-chain token flows and discrete off-chain accounting entries. Addresses stream monitoring, patronage sampling methodology, and on-chain ↔ off-chain reconciliation patterns.

**Core challenge:** Superfluid streams flow continuously (tokens transfer every second). Patronage accounting requires discrete, period-assigned entries. This specification defines how to sample continuous flows into accountable events without losing accuracy or auditability.

---

## 1. Superfluid Fundamentals

### What is Superfluid?

**Superfluid** is a token streaming protocol on Ethereum (and EVM-compatible chains) that enables continuous, real-time token transfers without per-second transactions.

**Traditional payment:** "Send $100 on the 1st of each month" (12 transactions/year)

**Superfluid stream:** "$100/month" = tokens flow continuously, every second, proportionally (0 gas after setup)

### Stream Mechanics

**Flow rate:** Tokens per second (e.g., `1e18 wei/sec = 1 token/sec`)

**Balance calculation:** `balance = flow_rate × elapsed_seconds`

**No discrete transactions:** Stream setup is on-chain, but actual token transfers happen implicitly via balance queries.

**Example:**
```
Stream: 0.015 ETHx per month
Flow rate: 0.015 ÷ (30 × 24 × 60 × 60) = 0.0000000057870 ETHx/sec
After 1 day: 0.0000000057870 × 86,400 = 0.0005 ETHx
After 30 days: 0.015 ETHx
```

### Relevance to Habitat

Streams are ideal for:
- **Investor distributions** — Continuous patronage distributions instead of quarterly lump-sums
- **Member compensation** — Salary as continuous flow (paid every second)
- **Grant disbursements** — Foundation grants structured as streams
- **Revenue sharing** — Venture distributions to cooperative
- **Infrastructure costs** — Subscription services paid via streams

---

## 2. The Sampling Problem

### Continuous vs. Discrete

**On-chain reality:** Stream balance increases continuously, queryable at any moment.

**Accounting requirement:** Discrete ledger entries, assigned to specific periods, with USD valuations.

**Naive approach (wrong):** Query stream balance once per month → single accounting entry

**Problem with naive approach:**
1. **Lost granularity** — Can't see daily/weekly flows
2. **Price risk** — USD conversion at month-end may not reflect actual value
3. **Period misalignment** — If period ends mid-month, where does the value go?
4. **Auditability** — Hard to trace when value was actually received

### The Sampling Solution

**Approach:** Sample stream balance at regular intervals, recording the accumulated delta as discrete accounting entries.

**Benefits:**
1. **Granular tracking** — Daily or weekly entries capture flow patterns
2. **Better price accuracy** — USD conversion uses appropriate averaging (24h VWAP, period average)
3. **Period alignment** — Mandatory period-end samples ensure clean cutoffs
4. **Audit trail** — Each sample is a discrete event with timestamp, balance, and price

**Trade-off:** More accounting entries (30 daily samples vs. 1 monthly) but significantly better accuracy and auditability.

---

## 3. Stream Types and Directions

### Inbound Streams (Revenue)

Tokens flowing **into** cooperative wallet from external parties.

**Examples:**
- Investor ETHx distributions (e.g., Kevin's 0.015 ETHx/month)
- SUP token streams from Superfluid protocol
- Grant disbursements from foundations
- Revenue shares from ventures
- $CLOUD credit purchases converted to streams (future)

**Accounting treatment:** Revenue (credit), with corresponding asset increase (debit)

**Period assignment:** Revenue recognized in period when stream value accrues (sampled)

### Outbound Streams (Expense or Distribution)

Tokens flowing **out** of cooperative wallet to members or service providers.

**Examples:**
- Member salary as continuous stream
- Patronage distributions (alternative to lump-sum)
- Service provider payments
- Infrastructure subscription costs
- Pool/grant distributions to other cooperatives

**Accounting treatment:** 
- If payment for services: Expense (debit)
- If patronage distribution: Distribution (debit equity)
- Asset decrease in both cases (credit)

**Period assignment:** Expense/distribution recognized in period when stream value flows out (sampled)

---

## 4. Sampling Configuration

### Stream Registry

Each stream tracked by Habitat is registered with sampling configuration:

```sql
CREATE TABLE superfluid_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- On-chain identity
  stream_address TEXT NOT NULL UNIQUE,  -- Stream contract/ID on-chain
  token TEXT NOT NULL,  -- ETHx, SUP, CELOx, USDCx, etc.
  chain TEXT NOT NULL DEFAULT 'base',  -- base | celo | ethereum | optimism
  
  -- Direction and counterparty
  direction stream_direction NOT NULL,  -- inbound | outbound
  counterparty_address TEXT NOT NULL,  -- Sender (inbound) or recipient (outbound)
  counterparty_name TEXT,  -- Human-readable (e.g., "Kevin Owocki")
  counterparty_member_id UUID REFERENCES members(id),  -- If counterparty is member
  
  -- Accounting mapping
  treasury_account_id UUID NOT NULL REFERENCES accounts(id),  -- Which GL account
  expense_category TEXT,  -- If outbound expense: category for reporting
  
  -- Sampling configuration
  sampling_interval sampling_interval NOT NULL DEFAULT 'daily',
  price_source price_source NOT NULL DEFAULT 'chainlink',
  price_averaging price_averaging NOT NULL DEFAULT 'spot',
  denomination currency_denomination NOT NULL DEFAULT 'usd',
  
  -- Stream metadata
  description TEXT,
  expected_flow_rate NUMERIC(18, 8),  -- Expected tokens per second (for monitoring)
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  -- Sampling state
  active BOOLEAN NOT NULL DEFAULT true,
  last_sampled_at TIMESTAMPTZ,
  last_sampled_balance NUMERIC(18, 8),
  last_sampled_block BIGINT,
  
  -- Monitoring
  alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  alert_threshold_percent NUMERIC(5, 2) DEFAULT 10,  -- Alert if flow deviates >10%
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE stream_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE sampling_interval AS ENUM ('hourly', 'daily', 'weekly', 'period_end_only');
CREATE TYPE price_source AS ENUM ('chainlink', 'coinbase', 'coingecko', 'manual');
CREATE TYPE price_averaging AS ENUM ('spot', 'vwap_24h', 'vwap_7d', 'period_average');
CREATE TYPE currency_denomination AS ENUM ('usd', 'native');

CREATE INDEX idx_superfluid_active ON superfluid_streams(active) WHERE active = true;
CREATE INDEX idx_superfluid_next_sample ON superfluid_streams(last_sampled_at) WHERE active = true;
CREATE INDEX idx_superfluid_chain_token ON superfluid_streams(chain, token);
CREATE INDEX idx_superfluid_member ON superfluid_streams(counterparty_member_id);
```

### Configuration Parameters Explained

#### `sampling_interval`

How often to sample the stream:

- **`hourly`** — 24 samples/day (high-value streams, tight monitoring)
- **`daily`** — 1 sample/day (default, good balance)
- **`weekly`** — 1 sample/week (low-value streams, reduce overhead)
- **`period_end_only`** — Only sample at period close (minimum viable)

**Recommendation:** Daily sampling for most streams, hourly for high-value (>$10k/month), weekly for low-value (<$100/month).

#### `price_source`

Where to get token price:

- **`chainlink`** — Chainlink oracle (most reliable, on-chain)
- **`coinbase`** — Coinbase API (high liquidity, centralized)
- **`coingecko`** — CoinGecko API (broad coverage, free tier)
- **`manual`** — Admin inputs price (fallback, stablecoins)

#### `price_averaging`

How to calculate USD value:

- **`spot`** — Price at sample time (simplest, volatile)
- **`vwap_24h`** — 24-hour volume-weighted average price (smoother)
- **`vwap_7d`** — 7-day VWAP (very smooth, lagging)
- **`period_average`** — Average price over full accounting period (most stable)

**Recommendation:** `vwap_24h` for daily sampling (good balance of accuracy and smoothness).

#### `denomination`

How to record value:

- **`usd`** — Convert to USD at sample time (most common)
- **`native`** — Record in native token units, convert at period end (for volatile assets)

**Tax consideration:** IRS requires USD valuation at time of receipt. Use `usd` denomination for all streams unless specific reason to defer conversion.

---

## 5. Sampling Events

### Stream Sample Record

Each sample creates a discrete record:

```sql
CREATE TABLE stream_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES superfluid_streams(id) ON DELETE CASCADE,
  
  -- Sample timing
  sampled_at TIMESTAMPTZ NOT NULL,
  period_id UUID NOT NULL REFERENCES periods(id),
  
  -- On-chain data
  onchain_balance NUMERIC(18, 8) NOT NULL,  -- Total stream balance at sample time
  previous_balance NUMERIC(18, 8) NOT NULL,  -- Balance at last sample
  delta_tokens NUMERIC(18, 8) NOT NULL,  -- Difference (this is what we account)
  block_number BIGINT NOT NULL,  -- Block at which balance was queried
  
  -- Price and conversion
  token_price_usd NUMERIC(12, 2) NOT NULL,
  price_source price_source NOT NULL,
  price_timestamp TIMESTAMPTZ NOT NULL,
  delta_usd NUMERIC(12, 2) NOT NULL,  -- delta_tokens × token_price_usd
  
  -- Accounting entry reference
  transaction_id UUID REFERENCES transactions(id),  -- Generated GL transaction
  
  -- Quality metrics
  sample_duration_seconds BIGINT,  -- Time since last sample
  expected_delta NUMERIC(18, 8),  -- Based on flow rate × duration
  deviation_percent NUMERIC(5, 2),  -- (actual - expected) / expected × 100
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stream_samples_stream ON stream_samples(stream_id);
CREATE INDEX idx_stream_samples_period ON stream_samples(period_id);
CREATE INDEX idx_stream_samples_time ON stream_samples(sampled_at);
CREATE INDEX idx_stream_samples_transaction ON stream_samples(transaction_id);
```

### Sample Event Structure

```json
{
  "event": "stream.sampled",
  "stream_id": "stream-abc-123",
  "sampled_at": "2026-02-11T00:00:00Z",
  "period_id": "q1-2026",
  
  "onchain_balance": "0.0155",
  "previous_balance": "0.0150",
  "delta_tokens": "0.0005",
  "block_number": 12345678,
  
  "token": "ETHx",
  "token_price_usd": "2500.00",
  "price_source": "chainlink",
  "price_timestamp": "2026-02-10T23:59:55Z",
  "delta_usd": "1.25",
  
  "sample_duration_seconds": 86400,
  "expected_delta": "0.00050032",
  "deviation_percent": "-0.064"
}
```

---

## 6. Workflows

### Workflow 1: Daily Stream Sampling (Automated)

**Trigger:** Cron job runs daily at 00:00 UTC

**Actors:** Cron scheduler, Stream sampler worker, Blockchain RPC node, Price oracle, Accounting API

**Steps:**

1. **Query active streams**
   ```sql
   SELECT * FROM superfluid_streams 
   WHERE active = true 
     AND sampling_interval = 'daily'
     AND (last_sampled_at IS NULL OR last_sampled_at < NOW() - INTERVAL '23 hours')
   ORDER BY last_sampled_at ASC NULLS FIRST
   LIMIT 100;
   ```

2. **For each stream:**
   
   a. **Query on-chain balance**
   ```typescript
   const balance = await superfluidSDK.getBalance({
     token: stream.token,
     address: stream.stream_address,
     blockNumber: 'latest'
   });
   ```
   
   b. **Calculate delta**
   ```typescript
   const delta = balance - stream.last_sampled_balance;
   const durationSeconds = (now - stream.last_sampled_at) / 1000;
   ```
   
   c. **Get token price**
   ```typescript
   const price = await priceOracle.getPrice({
     token: stream.token,
     source: stream.price_source,
     averaging: stream.price_averaging
   });
   ```
   
   d. **Convert to USD**
   ```typescript
   const deltaUSD = delta * price;
   ```
   
   e. **Record sample**
   ```sql
   INSERT INTO stream_samples (
     stream_id, sampled_at, period_id,
     onchain_balance, previous_balance, delta_tokens,
     token_price_usd, delta_usd, ...
   ) VALUES (...);
   ```
   
   f. **Update stream state**
   ```sql
   UPDATE superfluid_streams 
   SET last_sampled_at = NOW(),
       last_sampled_balance = $1,
       last_sampled_block = $2
   WHERE id = $3;
   ```

3. **Generate accounting transaction**
   
   **Inbound stream example:**
   ```json
   {
     "date": "2026-02-11",
     "period_id": "q1-2026",
     "description": "ETHx stream from Kevin Owocki (daily sample)",
     "entries": [
       {
         "account_id": "1210",  // ETHx (Asset)
         "debit": 1.25,
         "credit": 0
       },
       {
         "account_id": "4310",  // Stream Revenue
         "debit": 0,
         "credit": 1.25
       }
     ],
     "metadata": {
       "stream_sample_id": "sample-xyz",
       "stream_id": "stream-abc-123",
       "token": "ETHx",
       "token_amount": 0.0005,
       "token_price": 2500.00
     }
   }
   ```

4. **Publish events**
   - `stream.sampled` → Event bus
   - `transaction.created` → Event bus

5. **Check deviation**
   ```typescript
   const expectedDelta = stream.expected_flow_rate * durationSeconds;
   const deviationPercent = ((delta - expectedDelta) / expectedDelta) * 100;
   
   if (Math.abs(deviationPercent) > stream.alert_threshold_percent) {
     await alerting.send({
       type: 'stream_deviation',
       stream_id: stream.id,
       deviation_percent: deviationPercent,
       message: `Stream ${stream.id} deviated ${deviationPercent.toFixed(2)}% from expected flow`
     });
   }
   ```

**Frequency:** Runs once per day, processes all active daily-sampled streams (~1-5 minutes total).

---

### Workflow 2: Period-End Sampling (Mandatory)

**Trigger:** Period close initiated (manual or automated)

**Purpose:** Ensure all streams have final sample at exact period boundary, regardless of regular sampling interval.

**Steps:**

1. **Query all active streams**
   ```sql
   SELECT * FROM superfluid_streams 
   WHERE active = true 
     AND (ended_at IS NULL OR ended_at > $1)  -- Period end date
   ```

2. **For each stream:**
   
   Sample using same process as Workflow 1, but:
   - Force sample even if last sample was recent
   - Use exact period end timestamp (not "now")
   - Record as `period_end_sample = true` flag

3. **Aggregate period totals**
   ```sql
   SELECT 
     stream_id,
     token,
     direction,
     SUM(delta_tokens) as total_tokens,
     SUM(delta_usd) as total_usd,
     COUNT(*) as sample_count
   FROM stream_samples
   WHERE period_id = $1
   GROUP BY stream_id, token, direction;
   ```

4. **Generate period summary report**
   ```markdown
   ## Q1 2026 Stream Summary
   
   **Inbound Streams (Revenue):**
   - Kevin Owocki ETHx: 0.0450 ETHx = $112.50 (90 daily samples)
   - Superfluid SUP grant: 100 SUP = $150.00 (90 daily samples)
   - **Total inbound:** $262.50
   
   **Outbound Streams (Expense):**
   - Member compensation: 0.012 ETHx = $30.00 (90 daily samples)
   - **Total outbound:** $30.00
   
   **Net stream impact:** +$232.50
   ```

**Importance:** Period-end sampling ensures clean cutoffs. Without it, revenue/expense could leak between periods.

---

### Workflow 3: Stream Registration (Manual)

**Trigger:** Admin or member initiates stream tracking

**UI Flow:**

1. **Admin navigates to "Streams" page**

2. **Click "Register New Stream"**

3. **Enter stream details:**
   - Chain: Base / Celo / Ethereum / Optimism
   - Token: ETHx / SUP / CELOx / USDCx
   - Stream address (contract or ID)
   - Direction: Inbound / Outbound
   - Counterparty address: `0x...` or ENS name
   - Counterparty name: "Kevin Owocki"

4. **Configure sampling:**
   - Interval: Daily (default) / Hourly / Weekly / Period-end only
   - Price source: Chainlink (default) / Coinbase / CoinGecko / Manual
   - Price averaging: 24h VWAP (default) / Spot / 7d VWAP
   - Denomination: USD (default) / Native

5. **Map to accounting:**
   - Treasury account: "4310 Stream Revenue" (for inbound) or "5610 Stream Expense" (for outbound)
   - Expense category (if outbound): "Compensation" / "Infrastructure" / "Services"

6. **Set monitoring:**
   - Expected flow rate: 0.0000000057870 tokens/sec (system calculates from monthly amount)
   - Alert threshold: 10% (alert if actual flow deviates by >10%)
   - Alert recipients: admin@habitat.example.com

7. **Initialize stream:**
   - Query current on-chain balance
   - Set as `last_sampled_balance`
   - Set `last_sampled_at` to now
   - Mark as `active = true`

8. **Confirmation:**
   - "Stream registered successfully"
   - "First sample scheduled for tomorrow 00:00 UTC"
   - "You will receive alerts if flow deviates by >10%"

---

### Workflow 4: Stream Reconciliation (Daily)

**Trigger:** Cron job runs daily at 01:00 UTC (1 hour after sampling)

**Purpose:** Detect and alert on discrepancies between expected and actual stream behavior.

**Steps:**

1. **Query yesterday's samples**
   ```sql
   SELECT * FROM stream_samples 
   WHERE sampled_at >= NOW() - INTERVAL '25 hours'
     AND sampled_at < NOW() - INTERVAL '1 hour';
   ```

2. **For each sample:**
   
   a. **Check deviation**
   ```typescript
   if (Math.abs(sample.deviation_percent) > stream.alert_threshold_percent) {
     alerts.push({
       type: 'deviation',
       stream_id: sample.stream_id,
       deviation: sample.deviation_percent,
       expected: sample.expected_delta,
       actual: sample.delta_tokens
     });
   }
   ```
   
   b. **Check price staleness**
   ```typescript
   const priceAge = sample.sampled_at - sample.price_timestamp;
   if (priceAge > 3600) {  // 1 hour
     alerts.push({
       type: 'stale_price',
       stream_id: sample.stream_id,
       price_age_seconds: priceAge
     });
   }
   ```
   
   c. **Check missing samples**
   ```sql
   SELECT s.id, s.sampling_interval, s.last_sampled_at
   FROM superfluid_streams s
   WHERE s.active = true
     AND s.sampling_interval = 'daily'
     AND s.last_sampled_at < NOW() - INTERVAL '26 hours';
   ```
   
   If found:
   ```typescript
   alerts.push({
     type: 'missing_sample',
     stream_id: stream.id,
     last_sampled_at: stream.last_sampled_at,
     hours_overdue: (now - stream.last_sampled_at) / 3600
   });
   ```

3. **Aggregate and send alert digest**
   
   Email to admins:
   ```
   Subject: Stream Reconciliation Alert - 3 issues detected
   
   Stream Monitoring Report - 2026-02-11
   
   **Deviations:**
   - Stream ABC (Kevin ETHx): -12.5% deviation (expected 0.0005 ETHx, got 0.0004375 ETHx)
   
   **Stale Prices:**
   - Stream XYZ (SUP grant): Price age 2.5 hours (Coinbase API slow)
   
   **Missing Samples:**
   - Stream DEF (Outbound compensation): Last sampled 28 hours ago
   
   Action required: Review streams at https://habitat.example.com/admin/streams
   ```

4. **Log reconciliation results**
   ```sql
   INSERT INTO stream_reconciliation_log (
     date, streams_checked, issues_found, alert_sent, ...
   ) VALUES (...);
   ```

---

## 7. On-Chain ↔ Off-Chain Reconciliation

### Reconciliation Challenge

**On-chain:** Superfluid stream balances (source of truth)

**Off-chain:** Database `stream_samples` records (accounting ledger)

**Risk:** Database and blockchain can drift due to:
- Missed samples (cron failures)
- Incorrect balance queries (RPC issues)
- Manual corrections without updating blockchain state
- Stream modifications on-chain not reflected in database

### Reconciliation Strategy

#### Daily Reconciliation Check

**Trigger:** Cron job runs daily at 02:00 UTC

**Steps:**

1. **For each active stream:**
   
   a. **Query current on-chain balance**
   ```typescript
   const onchainBalance = await superfluid.getBalance(stream.stream_address);
   ```
   
   b. **Calculate expected balance from samples**
   ```sql
   SELECT 
     s.last_sampled_balance + COALESCE(SUM(ss.delta_tokens), 0) as expected_balance
   FROM superfluid_streams s
   LEFT JOIN stream_samples ss 
     ON ss.stream_id = s.id 
     AND ss.sampled_at > s.last_sampled_at
   WHERE s.id = $1;
   ```
   
   c. **Compare**
   ```typescript
   const difference = Math.abs(onchainBalance - expectedBalance);
   const threshold = 0.0001;  // Acceptable drift (rounding, timing)
   
   if (difference > threshold) {
     reconciliationIssues.push({
       stream_id: stream.id,
       onchain_balance: onchainBalance,
       expected_balance: expectedBalance,
       difference: difference,
       difference_usd: difference * currentPrice
     });
   }
   ```

2. **Handle discrepancies:**
   
   **Option A (Conservative):** Alert admin, require manual review
   
   **Option B (Automated):** Create correcting sample entry
   ```typescript
   await createCorrectingSample({
     stream_id: stream.id,
     correction_amount: difference,
     reason: 'Reconciliation adjustment',
     approved_by: 'system'
   });
   ```

3. **Log reconciliation**
   ```sql
   INSERT INTO stream_reconciliation_log (
     date, stream_id, onchain_balance, expected_balance, 
     difference, action_taken, ...
   ) VALUES (...);
   ```

#### Weekly Deep Reconciliation

**Trigger:** Cron job runs weekly (Sunday 03:00 UTC)

**Steps:**

1. **Historical sample replay:**
   
   a. For each stream, sum all samples from inception:
   ```sql
   SELECT 
     stream_id,
     SUM(delta_tokens) as total_sampled,
     MIN(sampled_at) as first_sample,
     MAX(sampled_at) as last_sample,
     COUNT(*) as sample_count
   FROM stream_samples
   GROUP BY stream_id;
   ```
   
   b. Query on-chain balance at same timestamp as last sample
   
   c. Compare total: `onchain_balance_at_last_sample` should equal `initial_balance + total_sampled`

2. **Gap detection:**
   
   Identify missing samples:
   ```sql
   SELECT 
     s.id,
     generate_series(
       date_trunc('day', s.started_at),
       date_trunc('day', NOW()),
       '1 day'::interval
     ) as expected_sample_date
   FROM superfluid_streams s
   WHERE s.sampling_interval = 'daily'
   EXCEPT
   SELECT 
     ss.stream_id,
     date_trunc('day', ss.sampled_at)
   FROM stream_samples ss;
   ```
   
   If gaps found, attempt backfill (query historical on-chain data, create retroactive samples).

3. **Audit report:**
   
   Generate comprehensive PDF report:
   - All streams reconciled
   - Discrepancies found and resolved
   - Gap analysis
   - Price oracle reliability metrics
   - Sample timing accuracy

---

## 8. Price Oracle Integration

### Multi-Source Strategy

**Problem:** Single price source can fail (API downtime, rate limits, inaccurate data).

**Solution:** Multi-source waterfall with fallback hierarchy.

### Price Source Priority

1. **Chainlink** (most reliable, on-chain, decentralized)
2. **Coinbase** (high liquidity, centralized but trusted)
3. **CoinGecko** (broad coverage, free tier)
4. **Manual** (admin override, used for stablecoins or emergencies)

### Price Oracle Interface

```typescript
interface PriceOracle {
  getPrice(request: PriceRequest): Promise<PriceResponse>;
}

interface PriceRequest {
  token: string;           // "ETHx", "SUP", "CELOx"
  source: PriceSource;     // "chainlink" | "coinbase" | "coingecko" | "manual"
  averaging: PriceAveraging;  // "spot" | "vwap_24h" | "vwap_7d"
  timestamp?: Date;        // For historical prices (if available)
}

interface PriceResponse {
  token: string;
  price_usd: number;
  source: PriceSource;
  timestamp: Date;
  confidence: number;      // 0-100, based on source reliability
  data_age_seconds: number;
}
```

### Chainlink Integration

```typescript
class ChainlinkPriceOracle implements PriceOracle {
  async getPrice(request: PriceRequest): Promise<PriceResponse> {
    // Get Chainlink price feed address for token
    const feedAddress = CHAINLINK_FEEDS[request.token];
    if (!feedAddress) {
      throw new Error(`No Chainlink feed for ${request.token}`);
    }
    
    // Query on-chain price feed
    const aggregator = new ethers.Contract(feedAddress, AggregatorV3Interface, provider);
    const roundData = await aggregator.latestRoundData();
    
    const price = roundData.answer.toNumber() / 1e8;  // Chainlink uses 8 decimals
    const timestamp = new Date(roundData.updatedAt.toNumber() * 1000);
    const dataAge = (Date.now() - timestamp.getTime()) / 1000;
    
    return {
      token: request.token,
      price_usd: price,
      source: 'chainlink',
      timestamp: timestamp,
      confidence: 95,  // Chainlink is highly reliable
      data_age_seconds: dataAge
    };
  }
}
```

### Fallback Logic

```typescript
async function getPriceWithFallback(request: PriceRequest): Promise<PriceResponse> {
  const sources: PriceSource[] = ['chainlink', 'coinbase', 'coingecko'];
  
  for (const source of sources) {
    try {
      const oracle = getPriceOracle(source);
      const price = await oracle.getPrice({ ...request, source });
      
      // Validate price
      if (price.data_age_seconds < 3600 && price.confidence > 50) {
        return price;
      }
    } catch (error) {
      console.warn(`Price source ${source} failed:`, error);
      continue;  // Try next source
    }
  }
  
  // All sources failed, use last known price with staleness warning
  const lastKnownPrice = await getLastKnownPrice(request.token);
  return {
    ...lastKnownPrice,
    confidence: 20,  // Low confidence, stale data
    data_age_seconds: (Date.now() - lastKnownPrice.timestamp.getTime()) / 1000
  };
}
```

### Price Caching

```sql
CREATE TABLE price_cache (
  token TEXT NOT NULL,
  source price_source NOT NULL,
  price_usd NUMERIC(12, 2) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  confidence INT NOT NULL,
  data_age_seconds INT NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (token, source, timestamp)
);

CREATE INDEX idx_price_cache_latest ON price_cache(token, source, timestamp DESC);
```

**Cache TTL:** 5 minutes (balance between freshness and API rate limits)

---

## 9. Technical Feasibility Validation

### ✅ Superfluid SDK Compatibility

**Validation:** Superfluid SDK provides standard interface for querying stream balances.

```typescript
import { Framework } from "@superfluid-finance/sdk-core";

const sf = await Framework.create({
  chainId: 8453,  // Base
  provider: provider
});

// Get stream balance
const balance = await sf.cfaV1.getFlow({
  superToken: "0x...",  // ETHx address
  sender: "0x...",
  receiver: "0x...",
  providerOrSigner: provider
});

console.log(balance.flowRate);  // Tokens per second
```

**Result:** ✅ Feasible. Standard SDK available, well-documented.

### ✅ Daily Sampling Performance

**Validation:** Can 100 streams be sampled daily within reasonable time/cost?

**Estimated timing:**
- RPC call (get balance): ~200ms per stream
- Price oracle query: ~300ms per stream
- Database write: ~50ms per sample
- Total per stream: ~550ms
- 100 streams: ~55 seconds

**Gas cost:** Reading stream balance is free (view function).

**Result:** ✅ Feasible. Entire sampling job completes in <1 minute, zero gas cost.

### ✅ Price Oracle Reliability

**Validation:** Can Chainlink/Coinbase provide reliable prices for required tokens?

**Token coverage:**
- ETHx: ✅ Chainlink ETH/USD feed available
- SUP: ⚠️ No Chainlink feed, use CoinGecko API
- CELOx: ✅ Chainlink CELO/USD feed available
- USDCx: ✅ Always $1.00 (stablecoin)

**Result:** ✅ Feasible. Primary tokens covered, fallback for exotic tokens.

### ✅ On-Chain Reconciliation

**Validation:** Can historical balances be queried for reconciliation?

**Approach:** Query stream balance at specific block number:

```typescript
const historicalBalance = await sf.cfaV1.getFlow({
  superToken: tokenAddress,
  sender: senderAddress,
  receiver: receiverAddress,
  providerOrSigner: provider,
  blockTag: 12345678  // Historical block
});
```

**Limitation:** Archive nodes required for blocks >128 (standard node limit). Archive node RPC: Alchemy, Infura, or self-hosted.

**Result:** ✅ Feasible with archive node. Recommended: Alchemy (reliable, generous free tier).

### ✅ Database Performance

**Validation:** Can database handle 100 streams × 365 days = 36,500 samples/year?

**Storage:** ~1 KB per sample × 36,500 = ~36 MB/year (negligible)

**Query performance:** Indexes on `stream_id`, `period_id`, `sampled_at` ensure <10ms queries.

**Result:** ✅ Feasible. Database can easily handle expected load.

---

## 10. Integration Points

### Event Bus Integration

Stream sampling publishes events to existing event bus (RabbitMQ):

**Events published:**
- `stream.sampled` — Daily sample completed
- `stream.reconciliation_issue` — Discrepancy detected
- `stream.price_stale` — Price oracle data too old
- `stream.deviation` — Flow deviates from expected
- `stream.registered` — New stream added
- `stream.ended` — Stream stopped

**Consumers:**
- Treasury accounting (generates GL transactions)
- Notification system (alerts for issues)
- Analytics dashboard (real-time charts)

### GraphQL API Extension

```graphql
extend type Query {
  # Get all streams (admin) or member's streams
  streams(direction: StreamDirection, active: Boolean): [SuperfluidStream!]!
  
  # Get specific stream with samples
  stream(id: ID!): SuperfluidStream
  
  # Get samples for a period
  streamSamples(periodId: ID!, streamId: ID): [StreamSample!]!
  
  # Get stream summary for period
  streamPeriodSummary(periodId: ID!): StreamPeriodSummary!
}

type SuperfluidStream {
  id: ID!
  streamAddress: String!
  token: String!
  chain: String!
  direction: StreamDirection!
  counterpartyName: String
  description: String
  
  # Current state
  active: Boolean!
  lastSampledAt: String
  lastSampledBalance: Float!
  
  # Configuration
  samplingInterval: SamplingInterval!
  priceSource: PriceSource!
  
  # Samples
  samples(limit: Int): [StreamSample!]!
  
  # Totals
  totalSampledUsd: Float!
  sampleCount: Int!
}

type StreamSample {
  id: ID!
  sampledAt: String!
  period: Period!
  
  deltaTokens: Float!
  deltaUsd: Float!
  tokenPriceUsd: Float!
  
  deviationPercent: Float
}

type StreamPeriodSummary {
  periodId: ID!
  periodName: String!
  
  inboundStreams: Int!
  inboundTotalUsd: Float!
  
  outboundStreams: Int!
  outboundTotalUsd: Float!
  
  netImpactUsd: Float!
}
```

---

## 11. Member Experience

### For Members Receiving Streams

**Dashboard widget: "Your Streams"**

```
┌─────────────────────────────────────────┐
│ Your Continuous Income                  │
├─────────────────────────────────────────┤
│ Patronage Distribution                  │
│ 0.004 ETHx/month (~$10/month)           │
│ ████████████░░░░░░░░ 15 days elapsed    │
│ Claimable now: $5.00                    │
│                                         │
│ [View Details] [Claim Now]              │
└─────────────────────────────────────────┘
```

**Stream details page:**

```
Stream: Patronage Distribution Q1 2026
From: techne.habitat.eth
Token: ETHx (Base)
Rate: 0.004 ETHx/month

Recent Samples (last 7 days):
- Feb 11: +0.00013 ETHx = $0.33
- Feb 10: +0.00013 ETHx = $0.32
- Feb 09: +0.00013 ETHx = $0.33
...

Total Received: 0.0020 ETHx = $5.00 (15 days)
Expected at Month End: 0.004 ETHx = $10.00
```

### For Admins Monitoring Streams

**Admin dashboard: "Stream Health"**

```
┌─────────────────────────────────────────┐
│ Stream Monitoring                       │
├─────────────────────────────────────────┤
│ Active Streams: 12                      │
│ Healthy: 10 ✓                           │
│ Alerts: 2 ⚠                             │
│                                         │
│ Alerts:                                 │
│ • Kevin ETHx: -12% deviation           │
│ • SUP grant: Price 3h stale            │
│                                         │
│ Last Reconciliation: 2h ago ✓           │
│ Next Sample: 22h (daily at 00:00)      │
│                                         │
│ [View All Streams] [Reconcile Now]      │
└─────────────────────────────────────────┘
```

---

## 12. Acceptance Criteria

✅ **Specification complete**
- Stream types defined (inbound/outbound)
- Sampling intervals specified (hourly/daily/weekly/period-end)
- Database schema designed (streams, samples, reconciliation log)
- Workflows documented (daily sampling, period-end, registration, reconciliation)

✅ **Technical feasibility validated**
- Superfluid SDK compatibility confirmed
- Daily sampling performance acceptable (<1 min for 100 streams)
- Price oracle integration feasible (Chainlink primary, fallbacks available)
- On-chain reconciliation possible (requires archive node)
- Database can handle load (36,500 samples/year = trivial)

✅ **Integration points identified**
- Event bus: 6 new event types
- GraphQL API: 4 new queries, 2 new types
- Treasury accounting: Stream samples → GL transactions
- Notification system: Alerts for deviations and issues

✅ **Member experience designed**
- Dashboard widget for viewing streams
- Stream details page with sample history
- Admin monitoring dashboard

---

## Next Sprint

**Sprint 125:** (Future) Implement daily stream sampling workflow — build cron scheduler, RPC integration, price oracle client, sample recording logic.

---

**Status:** COMPLETE — Comprehensive specification for Superfluid stream integration into Habitat patronage accounting, validated for technical feasibility and ready for implementation.

---

*References:*
- [superfluid-mapping.md](spec/superfluid-mapping.md) — Original sampling methodology
- [CLOUD_CREDIT_INTEGRATION_SPRINT_123.md](CLOUD_CREDIT_INTEGRATION_SPRINT_123.md) — Related $CLOUD credit system
- Superfluid Protocol: https://docs.superfluid.finance/
