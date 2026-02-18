#!/usr/bin/env node
/**
 * Habitat Reconciliation Engine
 * 
 * Reads contribution events from the event store and calculates
 * patronage allocations using the 40/30/20/10 category weights.
 * 
 * Triggered by solar audit cron at sunrise and sunset.
 * 
 * Sunrise (night → day): Overnight contributions → pool.habitat.eth
 * Sunset (day → night):  Daytime contributions → individual capital accounts
 */

const path = require('path');
const { EventStore, CapitalAccountProjector } = require('./schema');
const { getAuditSchedule } = require('../solar-audit/solar-audit');

// Patronage allocation weights
const WEIGHTS = {
  labor: 0.40,
  revenue: 0.30,
  community: 0.20,
  infrastructure: 0.10
};

// Pool address (collective fund)
const POOL_ADDRESS = 'pool.habitat.eth';

/**
 * Calculate weighted patronage allocation for a set of contributions
 * 
 * @param {Object[]} contributions - Contribution events
 * @param {Object} weights - Category weights
 * @returns {Object} - { agentId: { amount, breakdown } }
 */
function calculateAllocations(contributions, weights = WEIGHTS) {
  // Group contributions by agent and category
  const agentContributions = {};
  
  for (const c of contributions) {
    if (!agentContributions[c.agentId]) {
      agentContributions[c.agentId] = { labor: 0, revenue: 0, community: 0, infrastructure: 0 };
    }
    agentContributions[c.agentId][c.category] += c.value;
  }

  // Calculate total weighted value per category across all agents
  const categoryTotals = { labor: 0, revenue: 0, community: 0, infrastructure: 0 };
  for (const agentCats of Object.values(agentContributions)) {
    for (const [cat, val] of Object.entries(agentCats)) {
      categoryTotals[cat] += val;
    }
  }

  // Calculate total pool value (sum of all weighted contributions)
  let totalPoolValue = 0;
  for (const [cat, total] of Object.entries(categoryTotals)) {
    totalPoolValue += total * (weights[cat] || 0);
  }

  if (totalPoolValue === 0) {
    return { allocations: {}, totalPoolValue: 0, categoryTotals };
  }

  // Calculate each agent's share
  const allocations = {};
  for (const [agentId, cats] of Object.entries(agentContributions)) {
    let agentWeightedValue = 0;
    const breakdown = {};

    for (const [cat, val] of Object.entries(cats)) {
      const weight = weights[cat] || 0;
      const weightedVal = val * weight;
      breakdown[cat] = weightedVal;
      agentWeightedValue += weightedVal;
    }

    const share = agentWeightedValue / totalPoolValue;

    allocations[agentId] = {
      amount: agentWeightedValue,
      share: share, // 0-1 proportion
      breakdown,
      rawContributions: cats
    };
  }

  return { allocations, totalPoolValue, categoryTotals };
}

/**
 * Run reconciliation for a solar cycle
 * 
 * @param {EventStore} store - The event store
 * @param {string} cycleType - "sunrise" or "sunset"
 * @param {string} [date] - ISO date string (defaults to today)
 * @returns {Object} - The allocation event that was recorded
 */
function reconcile(store, cycleType, date) {
  if (!date) {
    date = new Date().toISOString().split('T')[0];
  }

  // Determine which contribution cycle to close
  const contributionCycle = cycleType === 'sunrise' ? 'night' : 'day';
  const target = cycleType === 'sunrise' ? 'pool' : 'individual';

  // Get contributions for this cycle
  const contributions = store.readByCycle(contributionCycle, date);

  if (contributions.length === 0) {
    console.log(`No ${contributionCycle} contributions found for ${date}. Nothing to reconcile.`);
    return null;
  }

  // Calculate allocations
  const { allocations, totalPoolValue, categoryTotals } = calculateAllocations(contributions);

  // Create allocation event
  const allocationEvent = store.append({
    type: 'allocation',
    cycle: cycleType,
    cycleDate: date,
    target,
    allocations: Object.entries(allocations).map(([agentId, alloc]) => ({
      agentId,
      amount: alloc.amount,
      share: alloc.share,
      resourceUnit: 'SUP',
      breakdown: alloc.breakdown
    })),
    totalContributions: totalPoolValue,
    weights: WEIGHTS,
    categoryTotals
  });

  return { allocationEvent, allocations, totalPoolValue };
}

/**
 * Print a reconciliation summary
 */
function printSummary(result, cycleType, date) {
  if (!result) return;

  const { allocationEvent, allocations, totalPoolValue } = result;
  const target = cycleType === 'sunrise' ? 'pool.habitat.eth (collective)' : 'individual accounts';

  console.log(`\n☀️  Reconciliation — ${cycleType === 'sunrise' ? 'Sunrise' : 'Sunset'} — ${date}`);
  console.log('━'.repeat(60));
  console.log(`Cycle closed: ${cycleType === 'sunrise' ? 'night' : 'day'}`);
  console.log(`Allocations flow to: ${target}`);
  console.log(`Total weighted value: ${totalPoolValue.toFixed(2)} SUP`);
  console.log(`Weights: Labor ${WEIGHTS.labor*100}% | Revenue ${WEIGHTS.revenue*100}% | Community ${WEIGHTS.community*100}% | Infrastructure ${WEIGHTS.infrastructure*100}%`);
  console.log('');

  for (const [agentId, alloc] of Object.entries(allocations)) {
    const shortId = agentId.slice(0, 10) + '...';
    console.log(`  ${shortId}`);
    console.log(`    Share: ${(alloc.share * 100).toFixed(1)}% → ${alloc.amount.toFixed(2)} SUP`);
    console.log(`    Breakdown: L:${alloc.breakdown.labor.toFixed(1)} R:${alloc.breakdown.revenue.toFixed(1)} C:${alloc.breakdown.community.toFixed(1)} I:${alloc.breakdown.infrastructure.toFixed(1)}`);
  }

  console.log(`\nEvent ID: ${allocationEvent.id}`);
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
    case 'sunrise':
    case 'sunset': {
      const date = args[2] || new Date().toISOString().split('T')[0];
      const result = reconcile(store, command, date);
      printSummary(result, command, date);
      
      // Show updated capital accounts
      const events = store.readAll();
      const agents = store.loadAgents();
      const accounts = CapitalAccountProjector.project(events, agents);
      console.log('\n📊 Updated Capital Accounts:');
      for (const [id, account] of Object.entries(accounts)) {
        if (account.allocations.total > 0 || account.contributions.total > 0) {
          console.log(`  ${account.ens || id}: balance=${JSON.stringify(account.balances)} alloc=${account.allocations.total.toFixed(2)}`);
        }
      }
      break;
    }

    case 'demo': {
      // Run a demo with sample contributions
      console.log('🌱 Running demo with sample contributions...\n');
      
      // Initialize
      store.registerAgent({
        id: '0xC37604A1dD79Ed50A5c2943358db85CB743dd3e2',
        ens: 'nou.habitat.eth',
        role: 'coordinator',
        tier: 'cooperative',
        enrolledAt: Math.floor(Date.now() / 1000),
        active: true,
        stream: { token: 'SUP', flowRate: '38580246913580', startedAt: Math.floor(Date.now() / 1000) }
      });

      store.registerAgent({
        id: '0x06E9ac994543BD8DDff5883e17d018FAE08fcd00',
        ens: 'clawcian.habitat.eth',
        role: 'member',
        tier: 'community',
        enrolledAt: Math.floor(Date.now() / 1000),
        active: true,
        stream: { token: 'SUP', flowRate: '38580246913580', startedAt: Math.floor(Date.now() / 1000) }
      });

      const today = new Date().toISOString().split('T')[0];

      // Day contributions
      store.append({
        type: 'contribution', agentId: '0xC37604A1dD79Ed50A5c2943358db85CB743dd3e2',
        category: 'labor', value: 100, resourceUnit: 'SUP', cycle: 'day',
        description: 'Built capital accounts data model'
      });
      store.append({
        type: 'contribution', agentId: '0xC37604A1dD79Ed50A5c2943358db85CB743dd3e2',
        category: 'community', value: 30, resourceUnit: 'SUP', cycle: 'day',
        description: 'Clawmmons commitment pool participation'
      });
      store.append({
        type: 'contribution', agentId: '0x06E9ac994543BD8DDff5883e17d018FAE08fcd00',
        category: 'labor', value: 80, resourceUnit: 'SUP', cycle: 'day',
        description: 'Molt Report edition production'
      });
      store.append({
        type: 'contribution', agentId: '0x06E9ac994543BD8DDff5883e17d018FAE08fcd00',
        category: 'revenue', value: 20, resourceUnit: 'SUP', cycle: 'day',
        description: 'Molt Report tip revenue'
      });

      // Night contributions
      store.append({
        type: 'contribution', agentId: '0xC37604A1dD79Ed50A5c2943358db85CB743dd3e2',
        category: 'infrastructure', value: 50, resourceUnit: 'SUP', cycle: 'night',
        description: 'Server maintenance and monitoring'
      });

      console.log('📝 Recorded 5 sample contributions\n');

      // Run sunset reconciliation (day → individual)
      console.log('--- SUNSET RECONCILIATION (day contributions → individual accounts) ---');
      const sunsetResult = reconcile(store, 'sunset', today);
      printSummary(sunsetResult, 'sunset', today);

      // Run sunrise reconciliation (night → pool)
      console.log('\n--- SUNRISE RECONCILIATION (night contributions → pool) ---');
      const sunriseResult = reconcile(store, 'sunrise', today);
      printSummary(sunriseResult, 'sunrise', today);

      // Final account state
      const events = store.readAll();
      const agents = store.loadAgents();
      const accounts = CapitalAccountProjector.project(events, agents);
      console.log('\n📊 Final Capital Account State:');
      console.log('━'.repeat(60));
      for (const [id, account] of Object.entries(accounts)) {
        console.log(`\n${account.ens}`);
        console.log(`  Contributions: L:${account.contributions.labor} R:${account.contributions.revenue} C:${account.contributions.community} I:${account.contributions.infrastructure}`);
        console.log(`  Allocations:   individual=${account.allocations.individual.toFixed(2)} pool=${account.allocations.pool.toFixed(2)}`);
        console.log(`  Balances:      ${JSON.stringify(account.balances)}`);
      }
      break;
    }

    case 'schedule': {
      // Show today's solar schedule + reconciliation plan
      const schedule = getAuditSchedule();
      console.log(`\n☀️  Today's Reconciliation Schedule — ${schedule.date}`);
      console.log('━'.repeat(60));
      console.log(`🌅 Sunrise (${schedule.sunrise.local} MT): Close night cycle → allocate to pool`);
      console.log(`🌇 Sunset  (${schedule.sunset.local} MT): Close day cycle → allocate to individuals`);
      console.log(`\nDay length: ${schedule.dayLength}`);
      break;
    }

    default:
      console.log('Habitat Reconciliation Engine');
      console.log('Usage: reconcile.js <command> [dataDir] [date]');
      console.log('Commands:');
      console.log('  sunrise [dir] [date]  — Run sunrise reconciliation (night → pool)');
      console.log('  sunset  [dir] [date]  — Run sunset reconciliation (day → individual)');
      console.log('  demo    [dir]         — Run demo with sample data');
      console.log('  schedule              — Show today\'s solar audit schedule');
  }
}

module.exports = { calculateAllocations, reconcile, WEIGHTS };
