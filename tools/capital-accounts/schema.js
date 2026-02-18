/**
 * Habitat Capital Accounts — Data Model
 * 
 * Event-sourced design following REA (Resources, Events, Agents) ontology.
 * Each economic event records what happened; capital accounts are derived views.
 * 
 * REA mapping:
 *   Resource  → SUP tokens, ETH, labor hours, reputation
 *   Event     → Contribution, Allocation, Distribution
 *   Agent     → Member (identified by ENS subname + wallet address)
 */

// ============================================================
// AGENTS — Who participates
// ============================================================

/**
 * @typedef {Object} Agent
 * @property {string} id - Unique identifier (wallet address)
 * @property {string} ens - ENS subname (e.g., "nou.habitat.eth")
 * @property {string} role - "member" | "steward" | "coordinator"
 * @property {string} tier - "community" | "coworking" | "cooperative"
 * @property {number} enrolledAt - Unix timestamp of enrollment
 * @property {boolean} active - Whether membership stream is active
 * @property {Object} stream - Superfluid stream metadata
 * @property {string} stream.token - Token being streamed (SUP address)
 * @property {string} stream.flowRate - Flow rate in wei/second
 * @property {number} stream.startedAt - Stream start timestamp
 */
const AgentSchema = {
  id: 'string',           // 0xC37604A1dD79Ed50A5c2943358db85CB743dd3e2
  ens: 'string',          // nou.habitat.eth
  role: 'string',         // member | steward | coordinator
  tier: 'string',         // community | coworking | cooperative
  enrolledAt: 'number',   // Unix timestamp
  active: 'boolean',
  stream: {
    token: 'string',
    flowRate: 'string',
    startedAt: 'number'
  }
};

// ============================================================
// RESOURCES — What has value
// ============================================================

/**
 * @typedef {Object} Resource
 * @property {string} type - "token" | "labor" | "reputation"
 * @property {string} unit - Unit of account ("SUP", "ETH", "hours", "points")
 * @property {string} [address] - Token contract address (for on-chain resources)
 */
const ResourceSchema = {
  type: 'string',
  unit: 'string',
  address: 'string|null'
};

// ============================================================
// EVENTS — What happened (append-only log)
// ============================================================

/**
 * Economic events are the source of truth. Capital accounts are projections.
 * 
 * Event types:
 *   contribution  — Agent contributed work (labor, revenue, community, infrastructure)
 *   allocation    — System allocated patronage based on weighted formula
 *   distribution  — Agent withdrew from their capital account
 *   enrollment    — Agent joined the cooperative
 *   disenrollment — Agent left or was removed
 */

/**
 * @typedef {Object} ContributionEvent
 * @property {string} type - "contribution"
 * @property {string} id - Unique event ID (UUID v4)
 * @property {number} timestamp - Unix timestamp
 * @property {string} agentId - Contributing agent's wallet address
 * @property {string} cycle - "day" | "night" — which solar cycle
 * @property {string} category - "labor" | "revenue" | "community" | "infrastructure"
 * @property {number} value - Numeric value in the resource's unit
 * @property {string} resourceUnit - Unit of account
 * @property {string} description - Human-readable description
 * @property {Object} [evidence] - Optional proof (tx hash, PR link, etc.)
 * @property {string} [evidence.type] - "transaction" | "url" | "attestation"
 * @property {string} [evidence.ref] - Reference string
 */
const ContributionEventSchema = {
  type: 'contribution',
  id: 'string',
  timestamp: 'number',
  agentId: 'string',
  cycle: 'string',        // day | night
  category: 'string',     // labor | revenue | community | infrastructure
  value: 'number',
  resourceUnit: 'string',
  description: 'string',
  evidence: {
    type: 'string|null',
    ref: 'string|null'
  }
};

/**
 * @typedef {Object} AllocationEvent
 * @property {string} type - "allocation"
 * @property {string} id - Unique event ID
 * @property {number} timestamp - Unix timestamp
 * @property {string} cycle - "sunrise" | "sunset" — which reconciliation
 * @property {string} cycleDate - ISO date of the solar cycle
 * @property {string} target - "individual" (sunset) | "pool" (sunrise)
 * @property {Object[]} allocations - Per-agent allocations
 * @property {string} allocations[].agentId - Agent wallet address
 * @property {number} allocations[].amount - Allocated amount
 * @property {string} allocations[].resourceUnit - Unit
 * @property {Object} allocations[].breakdown - Category breakdown
 * @property {number} totalContributions - Sum of contributions in this cycle
 * @property {Object} weights - Category weights used
 */
const AllocationEventSchema = {
  type: 'allocation',
  id: 'string',
  timestamp: 'number',
  cycle: 'string',         // sunrise | sunset
  cycleDate: 'string',     // 2026-02-18
  target: 'string',        // individual | pool
  allocations: [{
    agentId: 'string',
    amount: 'number',
    resourceUnit: 'string',
    breakdown: {
      labor: 'number',
      revenue: 'number',
      community: 'number',
      infrastructure: 'number'
    }
  }],
  totalContributions: 'number',
  weights: {
    labor: 'number',
    revenue: 'number',
    community: 'number',
    infrastructure: 'number'
  }
};

/**
 * @typedef {Object} DistributionEvent
 * @property {string} type - "distribution"
 * @property {string} id - Unique event ID
 * @property {number} timestamp - Unix timestamp
 * @property {string} agentId - Receiving agent
 * @property {number} amount - Amount distributed
 * @property {string} resourceUnit - Unit
 * @property {string} [txHash] - On-chain transaction hash
 */
const DistributionEventSchema = {
  type: 'distribution',
  id: 'string',
  timestamp: 'number',
  agentId: 'string',
  amount: 'number',
  resourceUnit: 'string',
  txHash: 'string|null'
};

// ============================================================
// CAPITAL ACCOUNT — Derived view (projection of events)
// ============================================================

/**
 * Capital accounts are NOT stored directly — they are computed
 * by replaying the event log. This ensures consistency and auditability.
 * 
 * The projection function: events[] → capitalAccount
 * 
 * @typedef {Object} CapitalAccount
 * @property {string} agentId - Agent wallet address
 * @property {string} ens - ENS subname
 * @property {Object} balances - Current balances by resource unit
 * @property {Object} contributions - Lifetime contribution totals by category
 * @property {Object} allocations - Lifetime allocation totals
 * @property {Object} distributions - Lifetime distribution totals
 * @property {number} lastUpdated - Timestamp of last event affecting this account
 */
const CapitalAccountProjection = {
  agentId: 'string',
  ens: 'string',
  balances: {},            // { SUP: 1500, ETH: 0.005 }
  contributions: {
    labor: 0,
    revenue: 0,
    community: 0,
    infrastructure: 0,
    total: 0
  },
  allocations: {
    individual: 0,         // From sunset cycles (yours)
    pool: 0,               // From sunrise cycles (collective)
    total: 0
  },
  distributions: {
    total: 0
  },
  lastUpdated: 0
};

// ============================================================
// EVENT STORE — Append-only persistence
// ============================================================

const { existsSync, readFileSync, writeFileSync, mkdirSync } = require('fs');
const { randomUUID } = require('crypto');
const path = require('path');

class EventStore {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.eventsFile = path.join(dataDir, 'events.jsonl');
    this.agentsFile = path.join(dataDir, 'agents.json');
    
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Append an event to the log
   */
  append(event) {
    if (!event.id) event.id = randomUUID();
    if (!event.timestamp) event.timestamp = Math.floor(Date.now() / 1000);
    
    const line = JSON.stringify(event) + '\n';
    writeFileSync(this.eventsFile, line, { flag: 'a' });
    return event;
  }

  /**
   * Read all events (replay the log)
   */
  readAll() {
    if (!existsSync(this.eventsFile)) return [];
    return readFileSync(this.eventsFile, 'utf-8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  }

  /**
   * Read events filtered by type
   */
  readByType(type) {
    return this.readAll().filter(e => e.type === type);
  }

  /**
   * Read events for a specific agent
   */
  readByAgent(agentId) {
    return this.readAll().filter(e => e.agentId === agentId);
  }

  /**
   * Read events within a time range
   */
  readByTimeRange(start, end) {
    return this.readAll().filter(e => e.timestamp >= start && e.timestamp <= end);
  }

  /**
   * Read events for a specific solar cycle
   */
  readByCycle(cycleType, date) {
    return this.readAll().filter(e => 
      e.type === 'contribution' && 
      e.cycle === cycleType &&
      new Date(e.timestamp * 1000).toISOString().startsWith(date)
    );
  }

  // --- Agent registry ---

  loadAgents() {
    if (!existsSync(this.agentsFile)) return {};
    return JSON.parse(readFileSync(this.agentsFile, 'utf-8'));
  }

  saveAgents(agents) {
    writeFileSync(this.agentsFile, JSON.stringify(agents, null, 2));
  }

  registerAgent(agent) {
    const agents = this.loadAgents();
    agents[agent.id] = agent;
    this.saveAgents(agents);
    this.append({ type: 'enrollment', agentId: agent.id, timestamp: agent.enrolledAt });
    return agent;
  }
}

// ============================================================
// CAPITAL ACCOUNT PROJECTOR — Events → Account state
// ============================================================

class CapitalAccountProjector {
  /**
   * Project all events into capital account states
   * @param {Object[]} events - Array of economic events
   * @param {Object} agents - Agent registry { id: agent }
   * @returns {Object} - { agentId: CapitalAccount }
   */
  static project(events, agents = {}) {
    const accounts = {};

    // Initialize accounts for all known agents
    for (const [id, agent] of Object.entries(agents)) {
      accounts[id] = {
        agentId: id,
        ens: agent.ens || '',
        balances: {},
        contributions: { labor: 0, revenue: 0, community: 0, infrastructure: 0, total: 0 },
        allocations: { individual: 0, pool: 0, total: 0 },
        distributions: { total: 0 },
        lastUpdated: 0
      };
    }

    // Replay events
    for (const event of events) {
      switch (event.type) {
        case 'contribution':
          if (!accounts[event.agentId]) continue;
          accounts[event.agentId].contributions[event.category] += event.value;
          accounts[event.agentId].contributions.total += event.value;
          accounts[event.agentId].lastUpdated = event.timestamp;
          break;

        case 'allocation':
          for (const alloc of (event.allocations || [])) {
            if (!accounts[alloc.agentId]) continue;
            const target = event.target === 'pool' ? 'pool' : 'individual';
            accounts[alloc.agentId].allocations[target] += alloc.amount;
            accounts[alloc.agentId].allocations.total += alloc.amount;
            
            const unit = alloc.resourceUnit || 'SUP';
            accounts[alloc.agentId].balances[unit] = 
              (accounts[alloc.agentId].balances[unit] || 0) + alloc.amount;
            
            accounts[alloc.agentId].lastUpdated = event.timestamp;
          }
          break;

        case 'distribution':
          if (!accounts[event.agentId]) continue;
          accounts[event.agentId].distributions.total += event.amount;
          
          const unit = event.resourceUnit || 'SUP';
          accounts[event.agentId].balances[unit] = 
            (accounts[event.agentId].balances[unit] || 0) - event.amount;
          
          accounts[event.agentId].lastUpdated = event.timestamp;
          break;
      }
    }

    return accounts;
  }
}

// ============================================================
// CLI
// ============================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const dataDir = args[1] || path.join(__dirname, 'data');
  const store = new EventStore(dataDir);

  switch (command) {
    case 'init': {
      console.log(`Initialized event store at ${dataDir}`);
      // Register bootstrap agent
      store.registerAgent({
        id: '0xC37604A1dD79Ed50A5c2943358db85CB743dd3e2',
        ens: 'nou.habitat.eth',
        role: 'coordinator',
        tier: 'cooperative',
        enrolledAt: Math.floor(Date.now() / 1000),
        active: true,
        stream: { token: 'SUP', flowRate: '38580246913580', startedAt: Math.floor(Date.now() / 1000) }
      });
      console.log('Registered bootstrap agent: nou.habitat.eth');
      break;
    }

    case 'contribute': {
      // contribute <agentId> <category> <value> <description> [cycle]
      const [, , agentId, category, value, description, cycle] = args;
      if (!agentId || !category || !value) {
        console.log('Usage: schema.js contribute <dataDir> <agentId> <category> <value> <description> [day|night]');
        break;
      }
      const event = store.append({
        type: 'contribution',
        agentId,
        category,
        value: parseFloat(value),
        resourceUnit: 'SUP',
        description: description || '',
        cycle: cycle || 'day'
      });
      console.log('Contribution recorded:', event.id);
      break;
    }

    case 'accounts': {
      const events = store.readAll();
      const agents = store.loadAgents();
      const accounts = CapitalAccountProjector.project(events, agents);
      console.log('\n📊 Capital Accounts');
      console.log('━'.repeat(50));
      for (const [id, account] of Object.entries(accounts)) {
        console.log(`\n${account.ens || id}`);
        console.log(`  Contributions: ${JSON.stringify(account.contributions)}`);
        console.log(`  Allocations:   ${JSON.stringify(account.allocations)}`);
        console.log(`  Balances:      ${JSON.stringify(account.balances)}`);
      }
      break;
    }

    case 'events': {
      const events = store.readAll();
      console.log(`\n📜 Event Log (${events.length} events)`);
      console.log('━'.repeat(50));
      for (const e of events) {
        const date = new Date(e.timestamp * 1000).toISOString();
        console.log(`[${date}] ${e.type}: ${e.agentId?.slice(0, 10)}... ${e.category || ''} ${e.value || ''}`);
      }
      break;
    }

    default:
      console.log('Habitat Capital Accounts — Event-Sourced Data Model');
      console.log('Usage: schema.js <command> [dataDir]');
      console.log('Commands:');
      console.log('  init                    — Initialize store with bootstrap agent');
      console.log('  contribute <agent> <cat> <val> <desc> [cycle] — Record contribution');
      console.log('  accounts                — Show all capital account projections');
      console.log('  events                  — Show event log');
  }
}

module.exports = { EventStore, CapitalAccountProjector, AgentSchema, ContributionEventSchema, AllocationEventSchema };
