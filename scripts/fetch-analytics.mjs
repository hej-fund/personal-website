#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const GRAPHQL_ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';
const MAX_BACKFILL_DAYS = 365;

const QUERY = `query ($zoneTag: String!, $start: String!, $end: String!) {
  viewer {
    zones(filter: {zoneTag: $zoneTag}) {
      httpRequests1dGroups(
        orderBy: [date_ASC]
        limit: 10000
        filter: {date_geq: $start, date_leq: $end}
      ) {
        dimensions { date }
        sum { requests pageViews }
        uniq { uniques }
      }
    }
  }
}`;

function utcDateString(offsetDays = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const token = process.env.CLOUDFLARE_API_TOKEN;
const zoneId = process.env.CLOUDFLARE_ZONE_ID;
const siteName = process.env.SITE_NAME || 'rohanhejmadi.com';

if (!token || !zoneId) {
  process.stderr.write('ERROR: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID must be set.\n');
  process.exit(1);
}

const dataDir = join(process.cwd(), 'data');
const dataFile = join(dataDir, 'analytics.json');

let existing = null;
try {
  existing = JSON.parse(readFileSync(dataFile, 'utf8'));
} catch {
  // first run — no existing file
}

const todayStr = utcDateString(0);
let startStr;

if (existing?.days?.length > 0) {
  const latestDate = existing.days.at(-1).date;
  // Re-fetch one day before latest to catch partial days
  const d = new Date(latestDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  startStr = d.toISOString().slice(0, 10);
} else {
  startStr = utcDateString(-MAX_BACKFILL_DAYS);
}

console.log(`Fetching ${startStr} → ${todayStr} from Cloudflare...`);

let body;
try {
  const resp = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: QUERY,
      variables: { zoneTag: zoneId, start: startStr, end: todayStr },
    }),
  });
  body = await resp.json();
} catch (err) {
  process.stderr.write(`ERROR: Network error: ${err.message}\n`);
  process.exit(1);
}

if (body.errors) {
  process.stderr.write(`ERROR: GraphQL returned errors:\n${JSON.stringify(body.errors, null, 2)}\n`);
  process.exit(1);
}

const zones = body?.data?.viewer?.zones ?? [];
if (!zones.length) {
  process.stderr.write(
    'ERROR: No zones returned. Check CLOUDFLARE_ZONE_ID and token permissions (Analytics:Read).\n'
  );
  process.exit(1);
}

const fetched = (zones[0].httpRequests1dGroups ?? []).map(g => ({
  date: g.dimensions.date,
  uniques: g.uniq.uniques,
  page_views: g.sum.pageViews,
  requests: g.sum.requests,
}));

console.log(`Got ${fetched.length} rows from API.`);

// Merge by date (fetched wins on conflict to pick up updated values for partial days)
const byDate = new Map((existing?.days ?? []).map(r => [r.date, r]));
for (const row of fetched) byDate.set(row.date, row);
const merged = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

const output = {
  generated_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  site_name: siteName,
  days: merged,
};

mkdirSync(dataDir, { recursive: true });
writeFileSync(dataFile, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(`Wrote ${merged.length} days to data/analytics.json.`);
