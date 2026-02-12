#!/usr/bin/env node
/**
 * Solar Audit Cycle Calculator
 * 
 * Calculates sunrise and sunset times for Boulder, Colorado
 * and triggers patronage reconciliation at each transition.
 * 
 * Location: 40.0150° N, 105.2705° W, elevation 5,430 ft (1,655 m)
 * Timezone: America/Denver (MT)
 * 
 * Algorithm: NOAA Solar Calculator (simplified)
 * Reference: https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 */

const LATITUDE = 40.0150;   // Boulder, CO
const LONGITUDE = -105.2705;
const TIMEZONE_OFFSET = -7;  // MST (adjust for DST: -6)

/**
 * Calculate Julian Day Number from Date
 */
function toJulianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * Calculate solar noon, sunrise, and sunset for a given date
 * Returns times in hours (decimal, local time)
 */
function calculateSolarTimes(date) {
  const jd = toJulianDay(date);
  const jc = (jd - 2451545) / 36525; // Julian century

  // Solar geometry
  const geomMeanLongSun = (280.46646 + jc * (36000.76983 + 0.0003032 * jc)) % 360;
  const geomMeanAnomSun = 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
  const eccentEarthOrbit = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);

  const sunEqOfCenter =
    Math.sin(deg2rad(geomMeanAnomSun)) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) +
    Math.sin(deg2rad(2 * geomMeanAnomSun)) * (0.019993 - 0.000101 * jc) +
    Math.sin(deg2rad(3 * geomMeanAnomSun)) * 0.000289;

  const sunTrueLong = geomMeanLongSun + sunEqOfCenter;
  const sunAppLong = sunTrueLong - 0.00569 - 0.00478 * Math.sin(deg2rad(125.04 - 1934.136 * jc));

  const meanObliqEcliptic = 23 + (26 + ((21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813)))) / 60) / 60;
  const obliqCorr = meanObliqEcliptic + 0.00256 * Math.cos(deg2rad(125.04 - 1934.136 * jc));

  const sunDeclin = rad2deg(Math.asin(Math.sin(deg2rad(obliqCorr)) * Math.sin(deg2rad(sunAppLong))));

  const varY = Math.tan(deg2rad(obliqCorr / 2)) * Math.tan(deg2rad(obliqCorr / 2));
  const eqOfTime = 4 * rad2deg(
    varY * Math.sin(2 * deg2rad(geomMeanLongSun)) -
    2 * eccentEarthOrbit * Math.sin(deg2rad(geomMeanAnomSun)) +
    4 * eccentEarthOrbit * varY * Math.sin(deg2rad(geomMeanAnomSun)) * Math.cos(2 * deg2rad(geomMeanLongSun)) -
    0.5 * varY * varY * Math.sin(4 * deg2rad(geomMeanLongSun)) -
    1.25 * eccentEarthOrbit * eccentEarthOrbit * Math.sin(2 * deg2rad(geomMeanAnomSun))
  );

  // Hour angle at sunrise/sunset (accounting for atmospheric refraction)
  const zenith = 90.833; // Official zenith including refraction
  const haRaw = Math.acos(
    Math.cos(deg2rad(zenith)) / (Math.cos(deg2rad(LATITUDE)) * Math.cos(deg2rad(sunDeclin))) -
    Math.tan(deg2rad(LATITUDE)) * Math.tan(deg2rad(sunDeclin))
  );
  const haSunrise = rad2deg(haRaw);

  // Solar noon (minutes from midnight UTC)
  const solarNoonUTC = (720 - 4 * LONGITUDE - eqOfTime); // minutes
  const solarNoonLocal = solarNoonUTC + TIMEZONE_OFFSET * 60;

  // Sunrise and sunset (minutes from midnight local)
  const sunriseLocal = solarNoonLocal - haSunrise * 4;
  const sunsetLocal = solarNoonLocal + haSunrise * 4;

  return {
    sunrise: minutesToTime(sunriseLocal),
    solarNoon: minutesToTime(solarNoonLocal),
    sunset: minutesToTime(sunsetLocal),
    sunriseMinutes: sunriseLocal,
    sunsetMinutes: sunsetLocal,
    declination: sunDeclin,
    dayLengthHours: (haSunrise * 8) / 60
  };
}

/**
 * Determine if DST is active for a given date in America/Denver
 * (Second Sunday of March to First Sunday of November)
 */
function isDST(date) {
  const year = date.getUTCFullYear();
  // March: second Sunday
  const marchFirst = new Date(Date.UTC(year, 2, 1));
  const marchFirstDay = marchFirst.getUTCDay();
  const dstStart = new Date(Date.UTC(year, 2, 8 + (7 - marchFirstDay) % 7, 9)); // 2am MT = 9am UTC

  // November: first Sunday
  const novFirst = new Date(Date.UTC(year, 10, 1));
  const novFirstDay = novFirst.getUTCDay();
  const dstEnd = new Date(Date.UTC(year, 10, 1 + (7 - novFirstDay) % 7, 8)); // 2am MT = 8am UTC

  return date >= dstStart && date < dstEnd;
}

/**
 * Get today's solar audit schedule
 */
function getAuditSchedule(date = new Date()) {
  const dst = isDST(date);
  const tzOffset = dst ? -6 : -7;
  
  // Temporarily override for DST
  const savedOffset = TIMEZONE_OFFSET;
  // Note: we use the module-level constant, so we recalculate
  
  const solar = calculateSolarTimes(date);
  
  // Convert local times to UTC for cron scheduling
  const sunriseUTC = solar.sunriseMinutes - tzOffset * 60;
  const sunsetUTC = solar.sunsetMinutes - tzOffset * 60;

  return {
    date: date.toISOString().split('T')[0],
    timezone: dst ? 'MDT (UTC-6)' : 'MST (UTC-7)',
    sunrise: {
      local: solar.sunrise,
      utc: minutesToTime(sunriseUTC),
      utcMinutes: sunriseUTC,
      action: 'Close night cycle → reconcile overnight contributions → allocate to pool.habitat.eth → publish capital accounts → open day cycle'
    },
    sunset: {
      local: solar.sunset,
      utc: minutesToTime(sunsetUTC),
      utcMinutes: sunsetUTC,
      action: 'Close day cycle → reconcile daytime contributions → credit individual capital accounts → journal entry → open night cycle'
    },
    solarNoon: solar.solarNoon,
    dayLength: `${Math.floor(solar.dayLengthHours)}h ${Math.round((solar.dayLengthHours % 1) * 60)}m`,
    declination: `${solar.declination.toFixed(2)}°`
  };
}

/**
 * Generate reconciliation event payload
 */
function createReconciliationEvent(cycle, schedule) {
  const now = new Date();
  return {
    type: 'patronage.reconciliation',
    cycle: cycle, // 'sunrise' or 'sunset'
    timestamp: now.toISOString(),
    location: {
      name: 'Boulder, Colorado',
      latitude: LATITUDE,
      longitude: LONGITUDE,
      elevation_ft: 5430
    },
    schedule: cycle === 'sunrise' ? schedule.sunrise : schedule.sunset,
    allocations: cycle === 'sunrise'
      ? { target: 'pool.habitat.eth', type: 'collective', categories: ['infrastructure', 'maintenance'] }
      : { target: 'individual', type: 'patronage', weights: { labor: 0.40, revenue: 0.30, community: 0.20, infrastructure: 0.10 } }
  };
}

// --- Utility functions ---

function deg2rad(deg) { return deg * Math.PI / 180; }
function rad2deg(rad) { return rad * 180 / Math.PI; }

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  const s = Math.round((minutes % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// --- CLI interface ---

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'schedule';

  if (command === 'schedule') {
    const date = args[1] ? new Date(args[1]) : new Date();
    const schedule = getAuditSchedule(date);
    console.log('\n☀️  Solar Audit Schedule — Boulder, Colorado');
    console.log('━'.repeat(50));
    console.log(`Date:        ${schedule.date}`);
    console.log(`Timezone:    ${schedule.timezone}`);
    console.log(`Day length:  ${schedule.dayLength}`);
    console.log(`Declination: ${schedule.declination}`);
    console.log('');
    console.log(`🌅 Sunrise:   ${schedule.sunrise.local} local / ${schedule.sunrise.utc} UTC`);
    console.log(`   → ${schedule.sunrise.action}`);
    console.log('');
    console.log(`☀️  Solar noon: ${schedule.solarNoon} local`);
    console.log('');
    console.log(`🌇 Sunset:    ${schedule.sunset.local} local / ${schedule.sunset.utc} UTC`);
    console.log(`   → ${schedule.sunset.action}`);
    console.log('');
  } else if (command === 'event') {
    const cycle = args[1] || 'sunrise';
    const schedule = getAuditSchedule();
    const event = createReconciliationEvent(cycle, schedule);
    console.log(JSON.stringify(event, null, 2));
  } else if (command === 'cron') {
    // Output cron expressions for today's sunrise/sunset
    const schedule = getAuditSchedule();
    const sunriseH = Math.floor(schedule.sunrise.utcMinutes / 60);
    const sunriseM = Math.floor(schedule.sunrise.utcMinutes % 60);
    const sunsetH = Math.floor(schedule.sunset.utcMinutes / 60);
    const sunsetM = Math.floor(schedule.sunset.utcMinutes % 60);
    console.log('# Solar audit cron expressions (UTC)');
    console.log(`# Sunrise reconciliation: ${schedule.sunrise.utc} UTC`);
    console.log(`${sunriseM} ${sunriseH} * * * /path/to/solar-audit.js event sunrise`);
    console.log(`# Sunset reconciliation: ${schedule.sunset.utc} UTC`);
    console.log(`${sunsetM} ${sunsetH} * * * /path/to/solar-audit.js event sunset`);
  } else if (command === 'week') {
    // Show schedule for the next 7 days
    console.log('\n☀️  Solar Audit Schedule — Next 7 Days');
    console.log('━'.repeat(60));
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const schedule = getAuditSchedule(date);
      console.log(`${schedule.date}  🌅 ${schedule.sunrise.local}  🌇 ${schedule.sunset.local}  (${schedule.dayLength})`);
    }
    console.log('');
  } else {
    console.log('Usage: solar-audit.js <command> [args]');
    console.log('Commands:');
    console.log('  schedule [date]  — Show today\'s (or given date\'s) audit schedule');
    console.log('  event <cycle>    — Generate reconciliation event JSON (sunrise|sunset)');
    console.log('  cron             — Output cron expressions for today\'s cycles');
    console.log('  week             — Show schedule for next 7 days');
  }
}

module.exports = { calculateSolarTimes, getAuditSchedule, createReconciliationEvent, isDST };
