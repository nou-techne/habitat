# Sprint 123: $CLOUD Credit Integration Specification

**Sprint:** 123  
**Role:** Schema Architect (01) + Workflow Engineer (05)  
**Layer:** 1 (Identity) + 5 (Flow)  
**Type:** Specification  
**Status:** COMPLETE

---

## Overview

Integration specification for $CLOUD credit protocol into Habitat patronage accounting system. Defines balance tracking, resource primitive metering, Stripe mint mechanism, and Superfluid stream integration. Pulls together three existing specifications ([service-credits.md](spec/service-credits.md), [service-credit-integration.md](spec/service-credit-integration.md), [superfluid-mapping.md](spec/superfluid-mapping.md)) into unified implementation roadmap.

**Core principle:** $CLOUD credits are prepaid service instruments, not investment vehicles. Accounting treatment must reflect liability at issuance, revenue at redemption. This structure serves both accurate financial reporting and regulatory classification (avoiding securities designation under Howey test).

---

## 1. $CLOUD Credit Protocol Summary

### Definition

$CLOUD credit: prepaid unit of account, minted against USD held for service delivery, redeemable for defined quantities of four resource primitives.

**Conversion rate:** 1 CLOUD = 10 USDC (fixed)

**Four resource primitives:**

| Primitive | Unit | Examples |
|-----------|------|----------|
| **Compute** | compute-hours | API calls, rendering, model inference, database queries |
| **Transfer** | GB transferred | Page loads, file downloads, streaming, API responses |
| **Long-term memory (LTM)** | GB-months | File hosting, database records, backups, archives |
| **Short-term memory (STM)** | GB-hours | Session caches, CDN edge state, in-memory queues |

### Use Cases Within Techne

1. **Engage Techne for building tools** — project work paid in $CLOUD
2. **Primary invoice medium** — Techne project invoices denominated in $CLOUD
3. **Resource consumption** — member usage of compute/transfer/memory primitives

### Ecological Duality

Name carries intentional double meaning:
- **Technological:** Distributed computing infrastructure (AWS, GCP metaphor)
- **Natural:** Atmospheric commons, water cycle (clouds as ecological phenomenon)

Designed for adoption by any member-governed organization operating digital infrastructure. Credits from different issuers share accounting grammar, enabling interoperability without shared currency or central authority.

---

## 2. Infrastructure Layers

Three complementary systems orchestrated by cooperative:

### Layer 1: Payments (Stripe)

**Function:** Fiat on-ramp, invoicing, subscription billing

**Integration points:**
- Credit purchase checkout (member buys CLOUD credits with USD)
- Subscription billing for recurring credit purchases
- Invoice generation for Techne project work (denominated in CLOUD)
- Payment processing (card, ACH, wire)

### Layer 2: Banking (Mercury)

**Function:** Deposit accounts, treasury management, USD custody

**Integration points:**
- Receive fiat from Stripe
- Hold USD backing for minted CLOUD credits
- Operational treasury account
- Tax payment disbursements

### Layer 3: Identity & Ledger (Ethereum)

**Function:** Member identity (ENS subnames), accounting ledger, credit lifecycle tracking

**Integration points:**
- Member identity via habitat.eth ENS namespace
- $CLOUD balance tracking (each subname has balance)
- Credit transfer transactions (member-to-member)
- Event log for audit trail

**Architecture:** Custodial and orchestrated. Cooperative manages keys, members interact via Habitat UI. Not a permissionless protocol — cooperative controls minting, rate cards, and redemption rules.

---

## 3. Schema Extensions

### Layer 1: Identity

#### Member CLOUD Balance

Each member has associated $CLOUD balance tracked both on-chain (Ethereum) and off-chain (database).

**Database schema:**

```sql
CREATE TABLE member_cloud_balances (
  member_id UUID PRIMARY KEY REFERENCES members(id),
  balance NUMERIC(18, 8) NOT NULL DEFAULT 0,  -- CLOUD units (up to 8 decimals)
  usd_value NUMERIC(12, 2),  -- Cached USD value at 1:10 rate
  
  -- On-chain reconciliation
  onchain_balance NUMERIC(18, 8),  -- Last known on-chain balance
  onchain_synced_at TIMESTAMPTZ,
  onchain_address TEXT,  -- ENS subname or Ethereum address
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cloud_balance_member ON member_cloud_balances(member_id);
CREATE INDEX idx_cloud_balance_sync ON member_cloud_balances(onchain_synced_at);
```

**On-chain representation:**

```solidity
// Simplified conceptual interface
interface CloudCreditLedger {
  // Member ENS subname → balance
  mapping(bytes32 => uint256) public balances;
  
  // Mint event (cooperative issues credits)
  event Minted(bytes32 indexed member, uint256 amount, uint256 usdBacking);
  
  // Transfer event (member → member)
  event Transferred(bytes32 indexed from, bytes32 indexed to, uint256 amount);
  
  // Redemption event (member uses credits)
  event Redeemed(bytes32 indexed member, uint256 amount, string primitive);
}
```

#### Resource Primitive Metering

Track member usage of four primitives:

```sql
CREATE TABLE resource_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id),
  period_id UUID NOT NULL REFERENCES periods(id),
  
  -- Resource type
  primitive resource_primitive NOT NULL,  -- compute | transfer | ltm | stm
  
  -- Usage metrics
  quantity NUMERIC(12, 4) NOT NULL,  -- Units consumed
  unit TEXT NOT NULL,  -- compute-hours, GB, GB-months, GB-hours
  
  -- Credit cost
  cloud_credits_cost NUMERIC(12, 4) NOT NULL,  -- CLOUD credits consumed
  usd_value NUMERIC(12, 2) NOT NULL,  -- USD value at 1:10 rate
  
  -- Rate card at time of usage
  rate_card_version INT NOT NULL,
  credits_per_unit NUMERIC(12, 8) NOT NULL,  -- Rate applied
  
  -- Metering metadata
  service_name TEXT,  -- Which service metered this (API, storage, compute)
  metered_at TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE resource_primitive AS ENUM ('compute', 'transfer', 'ltm', 'stm');

CREATE INDEX idx_resource_usage_member_period ON resource_usage(member_id, period_id);
CREATE INDEX idx_resource_usage_primitive ON resource_usage(primitive);
CREATE INDEX idx_resource_usage_metered_at ON resource_usage(metered_at);
```

#### Rate Card Versioning

Rate card maps CLOUD credits → resource units. Adjusts periodically (recommended quarterly, 30-day notice).

```sql
CREATE TABLE cloud_rate_cards (
  version INT PRIMARY KEY,
  effective_date DATE NOT NULL,
  notice_date DATE NOT NULL,  -- When members were notified
  
  -- Rate per primitive (credits per unit)
  compute_rate NUMERIC(12, 8) NOT NULL,  -- CLOUD per compute-hour
  transfer_rate NUMERIC(12, 8) NOT NULL,  -- CLOUD per GB transferred
  ltm_rate NUMERIC(12, 8) NOT NULL,  -- CLOUD per GB-month
  stm_rate NUMERIC(12, 8) NOT NULL,  -- CLOUD per GB-hour
  
  -- Rate card metadata
  infrastructure_costs JSONB,  -- Breakdown of underlying costs
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rate_card_effective ON cloud_rate_cards(effective_date);
```

**Example rate card:**

```json
{
  "version": 1,
  "effective_date": "2026-04-01",
  "notice_date": "2026-03-01",
  "compute_rate": 1.0,       // 1 CLOUD per compute-hour
  "transfer_rate": 0.1,       // 0.1 CLOUD per GB transferred
  "ltm_rate": 0.05,           // 0.05 CLOUD per GB-month
  "stm_rate": 0.5,            // 0.5 CLOUD per GB-hour
  "infrastructure_costs": {
    "compute": { "provider": "AWS EC2", "cost_per_hour": 0.10 },
    "transfer": { "provider": "Cloudflare", "cost_per_gb": 0.01 },
    "ltm": { "provider": "S3", "cost_per_gb_month": 0.023 },
    "stm": { "provider": "Redis Cloud", "cost_per_gb_hour": 0.05 }
  },
  "notes": "Q2 2026 rate card. Compute rate increased due to GPU costs."
}
```

---

## 4. Credit Lifecycle Workflows

### Workflow 1: Credit Purchase (Mint)

**Trigger:** Member purchases CLOUD credits via Stripe checkout or Mercury deposit

**Actors:** Member, Stripe, Mercury, Habitat API, Ethereum ledger

**Steps:**

1. **Member initiates purchase**
   - Selects credit amount (e.g., 100 CLOUD = $1,000 USDC)
   - Chooses payment method (card, ACH, wire)

2. **Stripe processes payment**
   - Charge succeeds
   - Funds settle to Mercury account
   - Webhook sent to Habitat API

3. **Habitat API receives webhook**
   - Verifies payment (amount, member_id, status)
   - Checks Mercury balance (confirm USD received)

4. **Credits minted**
   - Database: Update `member_cloud_balances.balance` (+100 CLOUD)
   - Ethereum: Call `CloudCreditLedger.mint(member_ens, 100e18, 1000e6)`
   - Event published: `credit.issued`

5. **Member notified**
   - Email: "100 CLOUD credits added to your account"
   - UI: Balance updated in real-time

**Accounting entries:**

```
Event: credit.issued
{
  member_id: "member-abc",
  quantity: 100.0,
  amount_paid: 1000.00,
  payment_method: "stripe",
  stripe_charge_id: "ch_xyz",
  timestamp: "2026-02-10T14:30:00Z"
}
```

**Treasury transactions:**

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 1110 Operating Checking (Mercury) | $1,000.00 | |
| 2 | 2220 CLOUD Credits Outstanding | | $1,000.00 |

**Result:** Cash increases (USD held in Mercury). Liability increases (credits outstanding). No revenue yet — cooperative owes infrastructure services.

---

### Workflow 2: Resource Consumption (Redemption)

**Trigger:** Member uses infrastructure (API call, file upload, compute job, etc.)

**Actors:** Member, Service (API/storage/compute), Metering system, Habitat API

**Steps:**

1. **Member uses service**
   - Example: Runs compute job (2.5 compute-hours)

2. **Service meters usage**
   - Records resource consumption
   - Looks up current rate card (version 1: 1 CLOUD per compute-hour)
   - Calculates cost: 2.5 hours × 1 CLOUD/hour = 2.5 CLOUD

3. **Habitat API processes redemption**
   - Check member balance: 100 CLOUD available ✓
   - Deduct credits: 100 - 2.5 = 97.5 CLOUD
   - Record usage: `resource_usage` table
   - Publish event: `credit.redeemed`

4. **Accounting recognition**
   - Liability decreases: CLOUD Credits Outstanding -$25
   - Revenue recognized: Credit Redemption Revenue +$25

5. **Infrastructure cost recorded**
   - Actual AWS bill: $0.25 for 2.5 compute-hours
   - Expense: Compute Infrastructure +$0.25

**Metering event:**

```
Event: resource.metered
{
  member_id: "member-abc",
  primitive: "compute",
  quantity: 2.5,
  unit: "compute-hours",
  service_name: "habitat-api",
  metered_at: "2026-02-10T15:00:00Z"
}
```

**Redemption event:**

```
Event: credit.redeemed
{
  member_id: "member-abc",
  quantity: 2.5,
  primitive: "compute",
  resource_units: 2.5,
  credit_value: 25.00,
  rate_card_version: 1,
  timestamp: "2026-02-10T15:00:01Z"
}
```

**Treasury transactions:**

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 2220 CLOUD Credits Outstanding | $25.00 | |
| 2 | 4420 Credit Redemption Revenue | | $25.00 |

**Infrastructure expense:**

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 5510 Compute Infrastructure | $0.25 | |
| 2 | 1110 Operating Checking (or 2110 AP) | | $0.25 |

**Margin:** Revenue $25.00 - Cost $0.25 = **$24.75 gross margin** (99% margin reflects prepaid nature + infrastructure arbitrage)

---

### Workflow 3: Member-to-Member Transfer

**Trigger:** Member transfers CLOUD credits to another member

**Actors:** Sender, Recipient, Habitat API, Ethereum ledger

**Steps:**

1. **Sender initiates transfer**
   - UI: "Transfer 30 CLOUD to alice.habitat.eth"
   - Confirms transaction

2. **Habitat API validates**
   - Check sender balance: 97.5 CLOUD available ✓
   - Verify recipient exists: alice.habitat.eth ✓

3. **Transfer executed**
   - Database: Sender -30 CLOUD, Recipient +30 CLOUD
   - Ethereum: `CloudCreditLedger.transfer(sender_ens, recipient_ens, 30e18)`
   - Event published: `credit.transferred`

4. **Both parties notified**
   - Sender: "30 CLOUD transferred to Alice"
   - Recipient: "30 CLOUD received from Bob"

**Transfer event:**

```
Event: credit.transferred
{
  from_member_id: "member-abc",
  to_member_id: "member-xyz",
  quantity: 30.0,
  from_balance_after: 67.5,
  to_balance_after: 30.0,
  timestamp: "2026-02-10T16:00:00Z"
}
```

**Accounting:** No treasury impact. Credits move between member balances, but aggregate liability (2220 CLOUD Credits Outstanding) unchanged.

---

### Workflow 4: Techne Project Invoice (CLOUD-Denominated)

**Trigger:** Techne completes project work for member/venture

**Actors:** Techne (service provider), Member/Venture (client), Habitat API

**Steps:**

1. **Project completed**
   - Techne delivers software, design, strategy work
   - Invoice generated: "Project X - 500 CLOUD"

2. **Invoice sent via Habitat**
   - Member receives notification: "Invoice for 500 CLOUD"
   - Due date: Net 30

3. **Member pays invoice**
   - Option A: Pay from existing CLOUD balance (if sufficient)
   - Option B: Purchase additional CLOUD credits to cover invoice
   - Option C: Pay via fiat (Stripe), which mints CLOUD automatically and redeems immediately

4. **Payment processing**
   - If paying from balance: Deduct 500 CLOUD from member account
   - Credits transferred to techne.habitat.eth (Techne's treasury account)

5. **Accounting recognition**
   - For payer: No immediate accounting impact (prepaid asset consumed)
   - For Techne (recipient):
     - Revenue recognized: Professional Services Revenue +$5,000
     - CLOUD credits received: +500 CLOUD (can redeem for infrastructure or hold)

**Invoice event:**

```
Event: invoice.created
{
  invoice_id: "inv-123",
  from: "techne.habitat.eth",
  to: "member-abc",
  amount_cloud: 500.0,
  amount_usd: 5000.00,
  description: "Project X - Full stack development",
  due_date: "2026-03-12",
  created_at: "2026-02-10T17:00:00Z"
}
```

**Payment event:**

```
Event: invoice.paid
{
  invoice_id: "inv-123",
  payer: "member-abc",
  payee: "techne.habitat.eth",
  amount_cloud: 500.0,
  payment_method: "cloud_balance",
  paid_at: "2026-02-15T10:00:00Z"
}
```

**Treasury impact (for Techne):**

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 1130 CLOUD Credits (Asset) | $5,000.00 | |
| 2 | 4110 Professional Services Revenue | | $5,000.00 |

Note: CLOUD credits held as asset (not immediately redeemed). When Techne redeems credits for infrastructure, asset decreases and expense increases.

---

## 5. Superfluid Stream Integration

### Stream Use Cases

Superfluid enables continuous token streams. Habitat integrates streams for:

**Inbound streams (revenue):**
- Investor distributions (ETHx, SUP)
- Grant disbursements
- Venture revenue shares
- Future: CLOUD credit redemption as continuous stream

**Outbound streams (expense/distribution):**
- Member compensation (continuous salary)
- Patronage distributions (streamed instead of lump-sum)
- Service provider payments
- Infrastructure costs

### Sampling Model

**Challenge:** Streams flow continuously (tokens transfer every second). Accounting requires discrete entries.

**Solution:** Sample streams at configurable intervals, recording accumulated delta.

**Recommended default:** Daily sampling + mandatory period-end samples.

### Stream Configuration

```sql
CREATE TABLE superfluid_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stream identity
  stream_address TEXT NOT NULL UNIQUE,  -- On-chain stream contract address
  token TEXT NOT NULL,  -- ETHx, SUP, CELOx, etc.
  direction stream_direction NOT NULL,  -- inbound | outbound
  
  -- Counterparty
  counterparty_address TEXT NOT NULL,  -- Who's sending/receiving
  counterparty_name TEXT,
  
  -- Accounting mapping
  treasury_account_id UUID NOT NULL REFERENCES accounts(id),  -- Which account to debit/credit
  
  -- Sampling config
  sampling_interval sampling_interval NOT NULL DEFAULT 'daily',
  denomination currency_denomination NOT NULL DEFAULT 'usd',  -- usd | native
  
  -- Stream state
  active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  last_sampled_at TIMESTAMPTZ,
  last_sampled_balance NUMERIC(18, 8),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE stream_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE sampling_interval AS ENUM ('hourly', 'daily', 'weekly', 'period_end');
CREATE TYPE currency_denomination AS ENUM ('usd', 'native');

CREATE INDEX idx_superfluid_active ON superfluid_streams(active);
CREATE INDEX idx_superfluid_sample_due ON superfluid_streams(last_sampled_at) WHERE active = true;
```

### Stream Sampling Events

```sql
CREATE TABLE stream_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES superfluid_streams(id),
  
  -- Sample timing
  sampled_at TIMESTAMPTZ NOT NULL,
  period_id UUID NOT NULL REFERENCES periods(id),
  
  -- Accumulated delta since last sample
  token_amount NUMERIC(18, 8) NOT NULL,  -- Native token units
  usd_value NUMERIC(12, 2) NOT NULL,  -- Converted to USD
  
  -- Price data
  token_price_usd NUMERIC(12, 2) NOT NULL,
  price_source TEXT NOT NULL,  -- coinbase | chainlink | manual
  
  -- On-chain verification
  onchain_balance NUMERIC(18, 8),  -- Stream balance at sample time
  previous_balance NUMERIC(18, 8),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stream_samples_stream ON stream_samples(stream_id);
CREATE INDEX idx_stream_samples_period ON stream_samples(period_id);
CREATE INDEX idx_stream_samples_time ON stream_samples(sampled_at);
```

### Workflow 5: Daily Stream Sampling

**Trigger:** Cron job runs daily at 00:00 UTC

**Steps:**

1. **Query active streams**
   - Find all `superfluid_streams` where `active = true`

2. **For each stream:**
   - Query on-chain balance: `stream.getBalance()`
   - Calculate delta: `current_balance - last_sampled_balance`
   - Look up token price: CoinGecko API / Chainlink oracle
   - Convert to USD: `delta_tokens × token_price_usd`

3. **Record sample:**
   - Insert `stream_samples` row
   - Update `superfluid_streams.last_sampled_at` and `last_sampled_balance`

4. **Generate accounting entry:**
   - If inbound: Debit asset account, Credit revenue account
   - If outbound: Debit expense account, Credit liability account

5. **Publish event:**
   - `stream.sampled` event to event bus

**Example: Inbound ETHx stream**

Stream: 0.015 ETHx per month = 0.0005 ETHx per day

```
Event: stream.sampled
{
  stream_id: "stream-abc",
  sampled_at: "2026-02-11T00:00:00Z",
  token: "ETHx",
  token_amount: 0.0005,
  usd_value: 1.25,  // @ $2,500/ETH
  token_price_usd: 2500.00,
  price_source: "coinbase_24h_vwap",
  direction: "inbound",
  onchain_balance: 0.015
}
```

**Treasury transactions:**

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 1210 ETHx (Asset) | $1.25 | |
| 2 | 4310 Stream Revenue | | $1.25 |

**Period-end treatment:** Daily samples accumulate throughout period. At period close, total stream revenue flows into patronage allocation formula like any other revenue.

---

## 6. Member-Investor Staking

### Staking Mechanism

LCA member-investors can **stake $CLOUD credits** for investor-determined duration. Staking provides:
- Liquidity commitment to cooperative
- Revenue share based on lock duration (compounding curve)
- Capital access for Techne operations

**Not speculation** — commitment to operational capacity. Rewards patience and alignment.

### Staking Schema

```sql
CREATE TABLE cloud_staking_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id),
  
  -- Staked amount
  cloud_amount NUMERIC(12, 4) NOT NULL,
  usd_value NUMERIC(12, 2) NOT NULL,  -- At 1:10 rate
  
  -- Lock terms
  staked_at TIMESTAMPTZ NOT NULL,
  lock_duration_days INT NOT NULL,  -- 30, 90, 180, 365, etc.
  unlock_at TIMESTAMPTZ NOT NULL,
  
  -- Revenue share
  revenue_share_percent NUMERIC(5, 2) NOT NULL,  -- Calculated from curve
  
  -- State
  status staking_status NOT NULL DEFAULT 'active',
  unstaked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE staking_status AS ENUM ('active', 'unstaked', 'slashed');

CREATE INDEX idx_staking_member ON cloud_staking_positions(member_id);
CREATE INDEX idx_staking_unlock ON cloud_staking_positions(unlock_at) WHERE status = 'active';
```

### Compounding Curve

Longer lock → higher revenue share percentage:

| Lock Duration | Revenue Share % |
|---------------|-----------------|
| 30 days | 1% |
| 90 days | 3% |
| 180 days | 7% |
| 365 days | 15% |
| 730 days (2 years) | 30% |

**Formula:** Exponential curve, exact parameters TBD based on cooperative's capital needs and revenue projections.

### Workflow 6: Stake CLOUD Credits

**Trigger:** Member chooses to stake credits

**Steps:**

1. **Member selects stake parameters**
   - Amount: 1,000 CLOUD
   - Duration: 365 days
   - Revenue share: 15% (from curve)

2. **Lock credits**
   - Deduct from liquid balance: `member_cloud_balances.balance` -1,000
   - Create staking position: `cloud_staking_positions` row
   - On-chain: Optional lock contract (or off-chain only for V1)

3. **Revenue share accrual**
   - At period close, calculate revenue share:
     - Total period revenue: $10,000
     - Staker's share: $10,000 × 15% × (1,000 staked / total staked)
   - Credit to member's capital account or CLOUD balance

4. **Unlock**
   - After 365 days, credits become liquid again
   - Member can withdraw or restake

**Accounting treatment:**

Staking doesn't change liability (credits still outstanding). It's a commitment/lock mechanism, not a transfer.

Revenue share is expense:

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 6410 Staking Revenue Share | $X.XX | |
| 2 | 2230 Staking Payable | | $X.XX |

When paid: Debit 2230 Staking Payable, Credit 1110 Cash or increase member's CLOUD balance.

---

## 7. Integration Points Summary

### Stripe Integration

**Endpoints:**
- `POST /api/stripe/checkout` — Create credit purchase checkout session
- `POST /api/stripe/webhook` — Receive payment confirmation
- `GET /api/stripe/invoices` — List member invoices

**Events:**
- `payment_intent.succeeded` → Mint CLOUD credits
- `invoice.paid` → Process CLOUD-denominated invoice
- `charge.refunded` → Burn CLOUD credits (liability reduction)

### Mercury Integration

**Operations:**
- Query account balance (confirm USD backing)
- Receive ACH/wire deposits
- Disburse tax payments
- Treasury reporting

**Verification:**
- Daily reconciliation: Mercury balance ≥ CLOUD Credits Outstanding (at 1:10 rate)
- Alert if backing falls below 100%

### Ethereum Integration

**Smart contracts:**
- `CloudCreditLedger` — Member balances, mint/transfer/redeem events
- Optional: `CloudStakingVault` — Lock mechanism for staked credits

**ENS:**
- Member subnames: `{name}.habitat.eth`
- Techne treasury: `techne.habitat.eth`
- Pool/grant accounts: `pool.habitat.eth`, `watershed.habitat.eth`

**Event monitoring:**
- `Minted` — Credits issued
- `Transferred` — Member-to-member transfer
- `Redeemed` — Credits used for infrastructure
- `Staked` / `Unstaked` — Staking position changes

**Reconciliation:**
- Hourly: Poll on-chain balances for all members
- Compare to database `member_cloud_balances.balance`
- Alert if mismatch > 0.01 CLOUD

### Metering Integration

**Services that meter:**
- Habitat API (compute usage)
- File storage (LTM usage)
- CDN/transfer (transfer usage)
- Redis/cache (STM usage)

**Metering API:**

```typescript
interface MeteringEvent {
  memberId: string;
  primitive: 'compute' | 'transfer' | 'ltm' | 'stm';
  quantity: number;
  unit: string;
  serviceName: string;
  timestamp: Date;
}

// Submit metering event
POST /api/metering/record
{
  "memberId": "member-abc",
  "primitive": "compute",
  "quantity": 2.5,
  "unit": "compute-hours",
  "serviceName": "habitat-api",
  "timestamp": "2026-02-10T15:00:00Z"
}

// Response: Credit cost calculated
{
  "meterId": "meter-xyz",
  "cloudCost": 2.5,
  "usdValue": 25.00,
  "rateCardVersion": 1,
  "memberBalanceAfter": 97.5
}
```

---

## 8. Regulatory Compliance

### Howey Test Avoidance

$CLOUD credits designed to **not** be securities under Howey test:

**Howey factors:**
1. **Investment of money:** ✅ Yes (member pays USD)
2. **Common enterprise:** ✅ Yes (cooperative structure)
3. **Expectation of profits:** ❌ **No** — credits are prepaid services, not investments
4. **Efforts of others:** Partially (cooperative operates infrastructure)

**Key distinction:** Credits do not appreciate. Rate card can decrease credit purchasing power (variable redemption value). No inherent expectation of profit from holding credits.

### Accounting Treatment

**GAAP:** Deferred revenue (liability) at issuance, revenue recognition at redemption.

**Tax:** Credits are prepaid income for issuer, deductible expense for redeemer (when used).

### Member Consent

For 100% retained allocations (no cash distribution), members must consent per IRS Subchapter T requirements. $CLOUD credits provide alternative: instead of cash, members receive credits (still 20% rule satisfied if credits are immediately liquid/transferable).

---

## 9. Implementation Roadmap

### Phase 1: Core Credit System (Sprints 123-126)

- [x] Sprint 123: Integration specification (this document)
- [ ] Sprint 124: Superfluid stream sampling implementation
- [ ] Sprint 125: Stripe/Mercury integration (mint mechanism)
- [ ] Sprint 126: Balance tracking + redemption flows

**Deliverables:**
- Database schema deployed
- Stripe webhook handlers
- Credit purchase + redemption workflows operational
- Basic metering API

### Phase 2: Resource Metering (Sprints 127-129)

- [ ] Sprint 127: Compute metering integration
- [ ] Sprint 128: Transfer + LTM metering
- [ ] Sprint 129: STM metering + rate card management UI

**Deliverables:**
- Four primitive metering systems
- Rate card admin interface
- Member usage dashboard

### Phase 3: Advanced Features (Sprints 130-132)

- [ ] Sprint 130: Member-investor staking mechanism
- [ ] Sprint 131: CLOUD-denominated invoicing
- [ ] Sprint 132: On-chain reconciliation + audit tools

**Deliverables:**
- Staking UI and smart contracts
- Invoice generation in CLOUD
- Automated reconciliation dashboard

### Phase 4: Superfluid Deep Integration (Sprints 133-135)

- [ ] Sprint 133: CLOUD credit redemption as stream
- [ ] Sprint 134: Patronage distributions via streams
- [ ] Sprint 135: Stream-based compensation

**Deliverables:**
- Redemption converted to continuous outbound streams
- Allocations distributed as streams instead of lump-sum
- Real-time patronage flow visualization

---

## 10. Success Metrics

### System Health

- **Backing ratio:** Mercury USD balance ≥ 100% of CLOUD Credits Outstanding
- **Reconciliation:** On-chain balances match database within 0.01 CLOUD
- **Redemption rate:** % of issued credits redeemed within 90 days
- **Revenue margin:** (Redemption revenue - Infrastructure cost) / Redemption revenue

### Member Engagement

- **Credit purchases:** # of members purchasing credits per month
- **Usage diversity:** % of members using all four primitives
- **Transfer activity:** # of member-to-member transfers per period
- **Staking participation:** % of credits staked, average lock duration

### Financial

- **Total credits outstanding:** CLOUD units (and USD value)
- **Period redemption revenue:** USD recognized per period
- **Infrastructure margin:** Gross margin on resource provision
- **Staking revenue share:** USD distributed to stakers per period

---

## 11. Risk Analysis

### Risk 1: Securities Classification

**Risk:** Regulators classify $CLOUD credits as securities.

**Mitigation:**
- Clear prepaid service design (not investment vehicle)
- Rate card can decrease value (no appreciation guarantee)
- Legal opinion on Howey test factors
- Member education: credits are utility, not investment

### Risk 2: Backing Shortfall

**Risk:** Mercury USD balance < CLOUD Credits Outstanding.

**Mitigation:**
- Daily reconciliation monitoring
- Alert when backing < 105%
- Automatic credit purchase limits if backing falls
- Reserve requirement (10% buffer)

### Risk 3: Price Oracle Failure

**Risk:** Token price feed (for Superfluid streams) becomes unavailable or inaccurate.

**Mitigation:**
- Multiple price sources (Coinbase + Chainlink)
- Fallback to manual pricing
- Price staleness alerts (> 1 hour old)
- Conservative pricing (use lowest of multiple sources)

### Risk 4: On-Chain/Off-Chain Mismatch

**Risk:** Database balances diverge from Ethereum balances.

**Mitigation:**
- Hourly reconciliation
- Transaction replay capability
- Event log audit trail
- Member-initiated balance verification

---

## 12. Testing Strategy

### Unit Tests

- Credit mint calculation (USD → CLOUD conversion)
- Redemption cost calculation (resource units → CLOUD)
- Rate card application (correct version used)
- Balance validation (sufficient credits before redemption)

### Integration Tests

- Stripe webhook → credit mint flow
- Metering event → redemption → balance update
- Stream sampling → accounting entry
- On-chain transfer → database sync

### End-to-End Tests

- Full credit lifecycle: Purchase → Use → Redeem
- Invoice payment in CLOUD
- Staking: Lock → Revenue share → Unlock
- Superfluid sampling: Stream flow → Daily sample → Period accumulation

### Load Tests

- 1,000 concurrent credit purchases
- 10,000 metering events per minute
- 100 active Superfluid streams sampled daily

---

## 13. Documentation Requirements

### Member Documentation

- **Getting Started:** How to purchase and use CLOUD credits
- **Rate Card:** Current rates for four primitives
- **Invoicing:** How to pay Techne invoices in CLOUD
- **Staking:** How staking works, revenue share curve, lock periods

### Developer Documentation

- **Metering API:** How to submit usage events
- **Rate Card API:** How to query current rates
- **Webhook Integration:** For services that need real-time balance updates

### Admin Documentation

- **Rate Card Management:** How to propose and update rates
- **Reconciliation:** How to monitor backing ratio and on-chain sync
- **Staking Administration:** Approving lock periods, calculating revenue shares

---

## Acceptance Criteria

✅ **Specification complete and reviewed**
- All workflows documented (mint, redeem, transfer, stake, sample)
- Schema extensions defined (member balances, resource usage, streams, staking)
- Integration points identified (Stripe, Mercury, Ethereum, metering)

✅ **Technical feasibility validated**
- Stripe webhook handling: Standard pattern, proven in production
- Mercury balance queries: Mercury API supports programmatic access
- Ethereum ENS + balances: Standard ENS + ERC20-like pattern
- Superfluid sampling: Stream balance queries available

✅ **Accounting treatment specified**
- Issuance: Liability (2220 CLOUD Credits Outstanding)
- Redemption: Revenue (4420 Credit Redemption Revenue)
- Staking: Expense (6410 Staking Revenue Share)
- Streams: Revenue/expense (daily samples, period accumulation)

✅ **Regulatory considerations addressed**
- Howey test avoidance: Prepaid service character preserved
- Accounting: GAAP-compliant deferred revenue model
- Tax: Subchapter T compatible (credits can satisfy 20% cash requirement)

---

## Next Sprint

**Sprint 124:** Superfluid stream sampling implementation — build daily sampling cron, price oracle integration, accounting entry generation.

---

**Status:** COMPLETE — Comprehensive integration specification for $CLOUD credit system within Habitat patronage accounting, covering all four resource primitives, Stripe/Mercury/Ethereum orchestration, Superfluid stream sampling, and member-investor staking.

---

*References:*
- [service-credits.md](spec/service-credits.md) — Full $CLOUD credit protocol specification
- [service-credit-integration.md](spec/service-credit-integration.md) — Accounting lifecycle details
- [superfluid-mapping.md](spec/superfluid-mapping.md) — Stream sampling methodology
