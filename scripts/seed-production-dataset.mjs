#!/usr/bin/env node
/**
 * GeoWatch — production-grade demo dataset seeder.
 *
 * Seeds 10 point incidents + 5 polygon zones (Middle East / Pakistan focus)
 * through the REAL API with staff JWTs. All entities are fictional but
 * plausible. Media is sourced from Wikimedia Commons and uploaded through
 * the real media endpoint.
 *
 * Rate-limit strategy:
 *  - Login ONCE per account (authLimiter 10/15min).
 *  - adminWriteLimiter = 50 writes/15min per user → work is split across
 *    the admin and superadmin accounts; any HTTP 429 is handled with a
 *    60s sleep + retry (max 6 attempts).
 *  - Incident create embeds beat-1 sources (same request = no extra writes).
 *
 * After the run, apply /tmp/geowatch_backdate.sql to align created_at
 * columns with the narrative dates (the only direct DB touch).
 *
 * Usage: node scripts/seed-production-dataset.mjs
 */

import { writeFile, readFile, mkdir } from 'fs/promises';

const API = 'http://localhost:3100/api/v1';
const TMP_DIR = '/tmp/geowatch-seed';
const COMMONS_UA = 'GeoWatchDevSeed/1.0 (local dev seeding; contact: admin@geowatch.local)';

const ACCOUNTS = {
  admin: { email: 'editor@geowatch.local', password: 'EditorPass123!' },
  superadmin: { email: 'admin@geowatch.local', password: 'AdminPass123!' },
};

const NOW = Date.now();
const H = 3600_000;
const D = 24 * H;
const iso = (ms) => new Date(ms).toISOString();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── HTTP helpers ───

const stats = { writes: { admin: 0, superadmin: 0 }, retries429: 0, errors: [] };

async function request(account, method, path, body, { counted = true } = {}) {
  const token = TOKENS[account];
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      stats.retries429++;
      console.log(`  ⏳ 429 rate-limited (${method} ${path}, ${account}) — sleeping 60s (attempt ${attempt}/6)`);
      await sleep(60_000);
      continue;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      throw new Error(`${method} ${path} → HTTP ${res.status}: ${json.message || JSON.stringify(json).slice(0, 300)}`);
    }
    if (counted) stats.writes[account]++;
    return json.data;
  }
  throw new Error(`${method} ${path} → still 429 after 6 attempts`);
}

async function login(account) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ACCOUNTS[account]),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.data?.token) {
    throw new Error(`Login failed for ${account}: HTTP ${res.status} ${json.message || ''}`);
  }
  return json.data.token;
}

// ─── Wikimedia helpers ───
// NOTE: commons.wikimedia.org is TLS-reset from this network (SNI filtering),
// so we search en.wikipedia.org article lead images instead — they are served
// from upload.wikimedia.org (reachable) and are almost always Commons files.

async function commonsSearch(term) {
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&generator=search' +
    `&gsrsearch=${encodeURIComponent(term)}&gsrnamespace=0&gsrlimit=6` +
    '&prop=pageimages&pithumbsize=1600&format=json';
  const res = await fetch(url, { headers: { 'User-Agent': COMMONS_UA } });
  if (!res.ok) return null;
  const json = await res.json();
  const pages = Object.values(json.query?.pages || {}).sort(
    (a, b) => (a.index || 99) - (b.index || 99)
  );
  for (const p of pages) {
    if (!p.thumbnail?.source) continue;
    const w = p.thumbnail.width || 0;
    const h = p.thumbnail.height || 0;
    if (w < 600 && h < 600) continue; // skip icons/tiny thumbs
    const isPng = /\.png$/i.test(p.thumbnail.source);
    return { pageId: p.pageid, title: p.title, url: p.thumbnail.source, mime: isPng ? 'image/png' : 'image/jpeg' };
  }
  return null;
}

async function downloadBuffer(url) {
  const res = await fetch(url, { headers: { 'User-Agent': COMMONS_UA } });
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadImage(account, incidentId, buffer, filename, mime, caption, updateId) {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mime }), filename);
  form.append('caption', caption);
  if (updateId) form.append('updateId', updateId);
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(`${API}/incidents/${incidentId}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKENS[account]}` },
      body: form,
    });
    if (res.status === 429) {
      stats.retries429++;
      console.log(`  ⏳ 429 on media upload — sleeping 60s (attempt ${attempt}/4)`);
      await sleep(60_000);
      continue;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      throw new Error(`media upload → HTTP ${res.status}: ${json.message || 'unknown'}`);
    }
    return json.data.media;
  }
  throw new Error('media upload → still 429 after 4 attempts');
}

async function fetchImageForTerms(terms) {
  for (const term of terms) {
    try {
      const hit = await commonsSearch(term);
      if (!hit) continue;
      const buffer = await downloadBuffer(hit.url);
      if (buffer.length < 10_000) continue; // skip tiny/broken files
      return { ...hit, buffer };
    } catch (err) {
      console.log(`  ⚠ commons fetch failed for "${term}": ${err.message}`);
    }
    await sleep(400);
  }
  return null;
}

// ─── Dataset ───
// update offsets are hours after start. `vstatus` = update verificationStatus.
// Sources listed under an update attach to that beat; incident-level `sources`
// are embedded in the create request (attached to the auto initial report).

const ITEMS = [
  // ── 1. Tanker seized, Strait of Hormuz ──
  {
    account: 'admin',
    key: 'tanker-hormuz',
    incident: {
      title: 'IRGC Seizes Marshall-Islands-Flagged Tanker in Strait of Hormuz',
      description:
        'Iranian Revolutionary Guard Corps Navy personnel boarded and seized a Marshall-Islands-flagged product tanker transiting the Strait of Hormuz approximately 12 nautical miles northeast of Bandar Abbas. The vessel was diverted toward Iranian anchorage under escort by two IRGCN fast-attack craft. The seizure follows a pattern of tit-for-tat maritime interdictions linked to sanctions enforcement and raises immediate insurance and transits-risk concerns for the world’s most critical oil chokepoint.',
      latitude: 26.6,
      longitude: 56.3,
      categoryId: 118, // piracy
      severity: 4,
      startDate: iso(NOW - 12 * D),
      locationContext: 'Strait of Hormuz, near Bandar Abbas, Iran',
      verificationStatus: 'verified',
      sources: [
        {
          sourceType: 'news_article',
          sourceUrl: 'https://www.reuters.com/world/middle-east/iran-seizes-tanker-strait-hormuz-2026-07-23/',
          description: 'Wire report: IRGC boards Marshall-Islands-flagged tanker near Bandar Abbas anchorage.',
        },
        {
          sourceType: 'x_post',
          sourceUrl: 'https://x.com/MaritimeOSINT/status/1818384902112366521',
          description: 'OSINT thread with AIS track showing the vessel’s diversion toward Iranian waters.',
        },
      ],
    },
    updates: [
      {
        afterHours: 26,
        summary: 'Crew of 23 confirmed safe; vessel anchored off Bandar Abbas',
        details:
          'The vessel’s manager confirmed satellite contact with the master. All 23 crew members — Indian, Filipino and Georgian nationals — are reported safe and remain aboard. IRGC personnel control the bridge; the crew has limited communications access through the ship’s owner.',
        vstatus: 'verified',
        sources: [
          {
            sourceType: 'admin_note',
            description: 'Analyst note: Crew welfare confirmed via owner channels; no consular access granted yet.',
          },
        ],
      },
      {
        afterHours: 74,
        summary: 'Shipowner issues statement demanding release; insurers raise Gulf war-risk premiums',
        details:
          'The registered owner condemned the seizure as unlawful and called for the immediate release of vessel and crew. London market underwriters raised war-risk premiums for Hormuz transits by an estimated 40%, and two majors announced temporary rerouting reviews.',
        vstatus: 'verified',
      },
      {
        afterHours: 150,
        summary: 'US State Department and EU condemn seizure; back-channel talks reported',
        details:
          'Washington and Brussels issued coordinated statements calling the seizure a violation of international maritime law and demanding the tanker’s release. Regional diplomats report Omani-mediated back-channel contacts, with Tehran signaling the vessel is held pending a “judicial review” of alleged pollution violations — a familiar pretext in prior cases.',
        vstatus: 'verified',
      },
    ],
    images: [
      { terms: ['Strait of Hormuz', 'Strait of Hormuz ship'], caption: 'Tanker traffic transiting the Strait of Hormuz. Photo: Wikimedia Commons' },
      { terms: ['oil tanker', 'crude oil tanker'], caption: 'File photo of a product tanker similar to the seized vessel. Photo: Wikimedia Commons' },
      { terms: ['Bandar Abbas', 'Bandar Abbas port'], caption: 'Bandar Abbas anchorage area, where the vessel is held. Photo: Wikimedia Commons' },
    ],
  },

  // ── 2. Khuzdar IED ──
  {
    account: 'admin',
    key: 'khuzdar-ied',
    incident: {
      title: 'IED Blast Targets Police Patrol in Khuzdar, Balochistan',
      description:
        'A remotely detonated improvised explosive device struck a police mobile patrol on the outskirts of Khuzdar, killing at least two personnel and injuring five others according to initial hospital figures. The attack fits the recurring pattern of Baloch separatist violence against security forces along the RCD highway corridor. No group has claimed responsibility, though officials suspect the Baloch Liberation Army.',
      latitude: 27.8,
      longitude: 66.6,
      categoryId: 15, // remote-ied
      severity: 3,
      startDate: iso(NOW - 6 * D),
      locationContext: 'Khuzdar, Balochistan, Pakistan',
      verificationStatus: 'unverified',
      sources: [
        {
          sourceType: 'news_article',
          sourceUrl: 'https://www.dawn.com/news/1873421/khuzdar-blast-police-patrol',
          description: 'Local reporting on casualties and the condition of the injured at DHQ Khuzdar.',
        },
        {
          sourceType: 'x_post',
          sourceUrl: 'https://x.com/BalochistanWatch/status/1820063412987654321',
          description: 'Video purportedly showing the blast aftermath and ambulances at the scene.',
        },
      ],
    },
    updates: [
      {
        afterHours: 9,
        summary: 'Death toll revised to three; area cordoned for forensic sweep',
        details:
          'District health officials confirmed a third officer died of wounds overnight. Counter-terrorism department teams began a forensic sweep of the blast site; investigators describe a command-detonated device of roughly 8–10 kg buried at the roadside.',
        vstatus: 'unverified',
        sources: [
          {
            sourceType: 'admin_note',
            description: 'Analyst note: casualty figures still fluid; treat toll as provisional pending official CTD briefing.',
          },
        ],
      },
      {
        afterHours: 30,
        summary: 'CTD confirms remote-IED findings; incident verified',
        details:
          'The Counter-Terrorism Department confirmed the device was remotely triggered and registered a case under anti-terrorism provisions. Official casualty figures match hospital records. Based on the official confirmation and corroborating imagery, the incident is marked verified.',
        vstatus: 'verified',
      },
    ],
    images: [
      { terms: ['Khuzdar', 'Khuzdar Balochistan'], caption: 'Khuzdar area, Balochistan. Photo: Wikimedia Commons' },
      { terms: ['Balochistan police', 'Pakistan police'], caption: 'Police presence in Balochistan (file). Photo: Wikimedia Commons' },
    ],
  },

  // ── 3. Houthi missile attack, Bab el-Mandeb (RESOLVED) ──
  {
    account: 'admin',
    key: 'bab-elmandeb-missile',
    incident: {
      title: 'Houthi Anti-Ship Missile Attack on Bulk Carrier in Bab el-Mandeb',
      description:
        'A Liberia-flagged bulk carrier transiting the Bab el-Mandeb strait was struck by what coalition naval forces assess to be a Houthi anti-ship ballistic missile. The strike caused a fire in the forward hold and minor flooding but no casualties among the 21 crew. The attack is the most serious Red Sea corridor incident this month and temporarily halted northbound convoy scheduling.',
      latitude: 12.6,
        longitude: 43.4,
      categoryId: 117, // naval-engagement
      severity: 4,
      startDate: iso(NOW - 20 * D),
      endDate: iso(NOW - 17 * D),
      locationContext: 'Bab el-Mandeb Strait, Red Sea',
      verificationStatus: 'verified',
      sources: [
        {
          sourceType: 'news_article',
          sourceUrl: 'https://apnews.com/article/red-sea-houthi-missile-bulk-carrier-2026',
          description: 'Wire report: bulk carrier hit by missile in Bab el-Mandeb; crew safe.',
        },
        {
          sourceType: 'x_post',
          sourceUrl: 'https://x.com/RedSeaShipping/status/1816234567890123456',
          description: 'Maritime tracking account post with the vessel’s last AIS position before the strike.',
        },
      ],
    },
    updates: [
      {
        afterHours: 7,
        summary: 'Fire contained; crew unharmed, vessel under tow assessment',
        details:
          'The crew contained the hold fire using onboard systems. A coalition frigate provided overwatch while salvage assessors evaluated hull damage. The vessel remained under its own power at reduced speed.',
        vstatus: 'verified',
        sources: [
          {
            sourceType: 'admin_note',
            description: 'Analyst note: imagery of scorch damage consistent with ASBM fragment impact, not an internal explosion.',
          },
        ],
      },
      {
        afterHours: 72,
        summary: 'Vessel reaches safe port in Djibouti; incident resolved',
        details:
          'The bulk carrier berthed in Djibouti for damage inspection and crew repatriation. Transit schedules through the corridor resumed under heightened escort posture. Marked resolved with the vessel safe in port.',
        vstatus: 'verified',
      },
    ],
    resolvedAt: iso(NOW - 17 * D),
    images: [
      { terms: ['Bab el-Mandeb', 'Bab el Mandeb strait'], caption: 'Bab el-Mandeb strait, the chokepoint where the attack occurred. Photo: Wikimedia Commons' },
      { terms: ['bulk carrier ship', 'bulk carrier'], caption: 'Bulk carrier underway (file photo of vessel class). Photo: Wikimedia Commons' },
      { terms: ['Red Sea cargo ship', 'Red Sea ship'], caption: 'Commercial shipping in the Red Sea corridor. Photo: Wikimedia Commons' },
    ],
  },

  // ── 4. Port Qasim strike ──
  {
    account: 'admin',
    key: 'port-qasim-strike',
    incident: {
      title: 'Dockworkers Strike Disrupts Operations at Port Qasim, Karachi',
      description:
        'Several hundred dockworkers at Port Qasim began an indefinite strike over unpaid overtime and contractor hiring practices, slowing container handling at Pakistan’s second-busiest port. Terminal operators report vessel turnaround delays of 12–24 hours. The stoppage adds pressure to already strained export logistics ahead of the fiscal quarter close.',
      latitude: 24.8,
      longitude: 67.3,
      categoryId: 35, // labor-strike
      severity: 2,
      startDate: iso(NOW - 4 * D),
      locationContext: 'Port Qasim, Karachi, Pakistan',
      verificationStatus: 'unverified',
      sources: [
        {
          sourceType: 'news_article',
          sourceUrl: 'https://tribune.com.pk/story/2534567/port-qasim-workers-strike',
          description: 'Business daily coverage of the strike demands and terminal delays.',
        },
        {
          sourceType: 'x_post',
          sourceUrl: 'https://x.com/KarachiPortWatch/status/1821123456789012345',
          description: 'Photos of picket lines at the main terminal gate.',
        },
      ],
    },
    updates: [
      {
        afterHours: 40,
        summary: 'Negotiations open with port authority; partial work resumption at one terminal',
        details:
          'Union representatives met the Port Qasim Authority after the provincial labor department intervened. One terminal resumed partial operations under an interim overtime-payment arrangement; talks on contractor regularization continue.',
        vstatus: 'unverified',
      },
    ],
    images: [
      { terms: ['Port Qasim', 'Port Qasim Karachi'], caption: 'Port Qasim container terminal. Photo: Wikimedia Commons' },
      { terms: ['Karachi port', 'Karachi harbour'], caption: 'Karachi harbour cargo operations (file). Photo: Wikimedia Commons' },
    ],
  },

  // ── 5. Miranshah drone strike (DISPUTED) ──
  {
    account: 'admin',
    key: 'miranshah-drone',
    incident: {
      title: 'Suspected Drone Strike Hits Compound in Miranshah, North Waziristan',
      description:
        'Local residents report a drone strike destroyed a compound in the Hamzoni area of Miranshah late Tuesday, with casualty claims ranging from four militants killed to a family of civilians. Conflicting narratives from security officials and local elders — and the absence of independent access — leave the target and toll disputed. The strike comes amid renewed cross-border militancy pressure in the tribal districts.',
      latitude: 33.0,
      longitude: 70.1,
      categoryId: 2, // drone-strike
      severity: 3,
      startDate: iso(NOW - 8 * D),
      locationContext: 'Miranshah, North Waziristan, Pakistan',
      verificationStatus: 'disputed',
      sources: [
        {
          sourceType: 'news_article',
          sourceUrl: 'https://www.dawn.com/news/1875555/miranshah-drone-strike-claims',
          description: 'Report compiling the competing official and local accounts of the strike.',
        },
        {
          sourceType: 'x_post',
          sourceUrl: 'https://x.com/WaziristanLens/status/1819001234567890123',
          description: 'Geolocated imagery of the destroyed compound; attribution contested in replies.',
        },
      ],
    },
    updates: [
      {
        afterHours: 12,
        summary: 'Security sources claim four TTP militants killed',
        details:
          'Officials speaking on background claim the strike targeted a Tehreek-e-Taliban Pakistan facilitation house, killing four including a mid-level commander. They attribute the operation to “own assets.” No formal statement has been issued.',
        vstatus: 'disputed',
        sources: [
          {
            sourceType: 'admin_note',
            description: 'Analyst note: claim conflicts with hospital intake logs showing civilian casualties; hold at disputed.',
          },
        ],
      },
      {
        afterHours: 36,
        summary: 'Local elders dispute militant claim, say family of six killed; jirga demands inquiry',
        details:
          'A tribal jirga in Miranshah rejected the official account, stating the compound belonged to a local trader and that six family members were killed. Elders demanded an independent inquiry and compensation. Journalists remain unable to access the site, and no verifiable casualty list has emerged.',
        vstatus: 'disputed',
      },
    ],
    images: [
      { terms: ['Miranshah', 'Miramshah'], caption: 'Miranshah area, North Waziristan. Photo: Wikimedia Commons' },
      { terms: ['North Waziristan', 'Waziristan mountains'], caption: 'North Waziristan terrain. Photo: Wikimedia Commons' },
    ],
  },

  // ── 6. Rafah airstrikes (sev 5) ──
  {
    account: 'superadmin',
    key: 'rafah-airstrikes',
    incident: {
      title: 'Heavy Airstrikes Near Rafah Crossing on Gaza–Egypt Border',
      description:
        'A sustained wave of airstrikes hit areas adjacent to the Rafah crossing between Gaza and Egypt, with reports of multiple impact sites within a kilometer of the border terminal. The strikes, the heaviest near the crossing in months, forced the suspension of humanitarian transit and raised alarm in Cairo over border security. Casualty figures remain unconfirmed but local health officials speak of dozens killed or wounded.',
      latitude: 31.3,
      longitude: 34.2,
      categoryId: 1, // air-strike
      severity: 5,
      startDate: iso(NOW - 15 * D),
      locationContext: 'Rafah Crossing, Gaza–Egypt border',
      verificationStatus: 'verified',
      sources: [
        {
          sourceType: 'news_article',
          sourceUrl: 'https://www.aljazeera.com/news/2026/7/20/strikes-hit-near-rafah-crossing',
          description: 'Live coverage of the strike wave and the crossing suspension.',
        },
        {
          sourceType: 'news_article',
          sourceUrl: 'https://www.reuters.com/world/middle-east/rafah-crossing-strikes-2026-07-20/',
          description: 'Wire report with Egyptian security reaction and casualty estimates.',
        },
      ],
    },
    updates: [
      {
        afterHours: 5,
        summary: 'Crossing suspended; Egypt deploys additional border units',
        details:
          'Authorities halted all movement through the Rafah terminal as a precaution. Egyptian media report additional army units moving to the border line, and Cairo summoned diplomats to protest strikes so close to the frontier.',
        vstatus: 'verified',
        sources: [
          {
            sourceType: 'x_post',
            sourceUrl: 'https://x.com/GazaLiveFeed/status/1815009876543210987',
            description: 'Night video of successive impacts lighting up the Rafah skyline.',
          },
        ],
      },
      {
        afterHours: 30,
        summary: 'Humanitarian agencies warn of stockpile crisis as aid trucks idle',
        details:
          'UN and NGO logistics coordinators warn that suspended transit has stranded hundreds of aid trucks in Al-Arish, with fuel and medical stocks inside Gaza critically low. Negotiations over a humanitarian window are underway.',
        vstatus: 'verified',
      },
      {
        afterHours: 96,
        summary: 'Limited humanitarian window opens under Egyptian escort; strikes continue south of corridor',
        details:
          'A daily four-hour window for vetted aid convoys began under Egyptian security escort. Strikes persisted in zones south of the agreed corridor, and agencies describe the flow as far below requirements.',
        vstatus: 'verified',
        sources: [
          {
            sourceType: 'admin_note',
            description: 'Analyst note: corridor geometry on the map reflects the agreed humanitarian window boundaries.',
          },
        ],
      },
    ],
    images: [
      { terms: ['Rafah crossing', 'Rafah border crossing'], caption: 'Rafah border crossing area. Photo: Wikimedia Commons' },
      { terms: ['Rafah', 'Rafah Gaza'], caption: 'Rafah cityscape. Photo: Wikimedia Commons' },
      { terms: ['Gaza smoke', 'Gaza city smoke'], caption: 'Smoke over southern Gaza (file). Photo: Wikimedia Commons' },
    ],
  },

  // ── 7. Bandar Abbas oil depot fire (RESOLVED) ──
  {
    account: 'superadmin',
    key: 'bandar-abbas-fire',
    incident: {
      title: 'Major Fire at Oil Storage Depot in Bandar Abbas',
      description:
        'A fire erupted at a petroleum storage depot in Bandar Abbas, sending a dense smoke column over the port city and prompting evacuation of adjacent industrial plots. Preliminary official statements attribute the blaze to an electrical fault during transfer operations; sabotage has not been indicated. No fatalities were reported, though several firefighters were treated for smoke inhalation.',
      latitude: 27.2,
      longitude: 56.3,
      categoryId: 69, // industrial-fire
      severity: 2,
      startDate: iso(NOW - 9 * D),
      endDate: iso(NOW - 8 * D),
      locationContext: 'Bandar Abbas, Hormozgan Province, Iran',
      verificationStatus: 'verified',
      sources: [
        {
          sourceType: 'news_article',
          sourceUrl: 'https://www.tasnimnews.com/en/news/2026/07/26/bandar-abbas-depot-fire',
          description: 'State-linked report citing the electrical-fault preliminary finding.',
        },
        {
          sourceType: 'x_post',
          sourceUrl: 'https://x.com/GulfIncidentFeed/status/1817002345678901234',
          description: 'Resident video of the smoke column over the depot.',
        },
      ],
    },
    updates: [
      {
        afterHours: 20,
        summary: 'Fire contained to two tanks; port operations resume, incident resolved',
        details:
          'Firefighting teams contained the blaze to two storage tanks and prevented spread to the main manifold area. Port operations resumed under normal safety protocols, and the provincial crisis office stood down its emergency posture.',
        vstatus: 'verified',
      },
    ],
    resolvedAt: iso(NOW - 8 * D),
    images: [
      { terms: ['oil depot fire', 'oil storage fire'], caption: 'Fire at an oil storage facility (file). Photo: Wikimedia Commons' },
      { terms: ['oil storage tanks', 'oil tank farm'], caption: 'Storage tank farm similar to the affected depot. Photo: Wikimedia Commons' },
    ],
  },

  // ── 8. Chaman shelling ──
  {
    account: 'superadmin',
    key: 'chaman-shelling',
    incident: {
      title: 'Cross-Border Shelling Exchanged at Chaman, Pak–Afghan Frontier',
      description:
        'Pakistani and Afghan border forces exchanged artillery and mortar fire across the Chaman crossing after a dispute over fence construction escalated into a two-hour engagement. Several mortars landed near civilian settlements on the Pakistani side, wounding at least six residents and displacing dozens of families. The crossing — a vital trade artery — was closed pending flag-meeting talks.',
      latitude: 30.9,
      longitude: 66.5,
      categoryId: 3, // artillery
      severity: 3,
      startDate: iso(NOW - 5 * D),
      locationContext: 'Chaman, Pak–Afghan border, Balochistan',
      verificationStatus: 'verified',
      sources: [
        {
          sourceType: 'news_article',
          sourceUrl: 'https://www.dawn.com/news/1877777/chaman-border-shelling',
          description: 'Report on the engagement, civilian impact and crossing closure.',
        },
        {
          sourceType: 'x_post',
          sourceUrl: 'https://x.com/BorderWatchPK/status/1819555444333222111',
          description: 'Audio/video of outgoing fire from positions near Chaman.',
        },
      ],
    },
    updates: [
      {
        afterHours: 8,
        summary: 'Flag meeting ends without agreement; sporadic fire continues overnight',
        details:
          'A first flag meeting between border commanders ended without a ceasefire framework. Sporadic mortar fire continued overnight, and district authorities opened two temporary shelters for displaced families in Chaman town.',
        vstatus: 'verified',
        sources: [
          {
            sourceType: 'admin_note',
            description: 'Analyst note: escalation ladder consistent with prior fence-line disputes; watch for reinforcement indicators.',
          },
        ],
      },
      {
        afterHours: 34,
        summary: 'Ceasefire announced after second flag meeting; crossing partially reopens',
        details:
          'Both sides announced a ceasefire following a second round of talks, with joint verification of the disputed fence segment. The Chaman crossing partially reopened to pedestrian and medical traffic; full cargo operations remain suspended.',
        vstatus: 'verified',
      },
    ],
    images: [
      { terms: ['Chaman', 'Chaman border'], caption: 'Chaman border crossing area. Photo: Wikimedia Commons' },
      { terms: ['Pakistan Afghanistan border', 'Durand Line'], caption: 'Pak–Afghan frontier region (file). Photo: Wikimedia Commons' },
    ],
  },

  // ── 9. Lahore smog ──
  {
    account: 'superadmin',
    key: 'lahore-smog',
    incident: {
      title: 'Hazardous Smog Episode Blankets Lahore',
      description:
        'Air quality in Lahore deteriorated to hazardous levels as a seasonal inversion trapped crop-burning and vehicular emissions over the city, with AQI readings exceeding 450 in several districts. Authorities closed schools for two days and advised against outdoor activity. Hospitals report a sharp rise in respiratory presentations, and the episode has renewed scrutiny of enforcement against stubble burning.',
      latitude: 31.55,
      longitude: 74.35,
      categoryId: 136, // air-quality-crisis
      severity: 2,
      startDate: iso(NOW - 3 * D),
      locationContext: 'Lahore, Punjab, Pakistan',
      verificationStatus: 'unverified',
      sources: [
        {
          sourceType: 'news_article',
          sourceUrl: 'https://tribune.com.pk/story/2536789/lahore-smog-hazardous',
          description: 'Coverage of AQI readings, school closures and hospital load.',
        },
        {
          sourceType: 'admin_note',
          description: 'Analyst note: episode severity in line with early-November seasonal patterns; monitoring EPD enforcement actions.',
        },
      ],
    },
    updates: [
      {
        afterHours: 28,
        summary: 'Marginal improvement after wind shift; schools to reopen but restrictions continue',
        details:
          'A wind shift brought modest relief, with AQI easing into the very-unhealthy band. The provincial government announced school reopening while keeping restrictions on brick kilns and heavy-vehicle entry during peak hours.',
        vstatus: 'unverified',
      },
    ],
    images: [
      { terms: ['Lahore smog', 'smog Lahore'], caption: 'Smog over Lahore. Photo: Wikimedia Commons' },
      { terms: ['Lahore skyline', 'Lahore city'], caption: 'Lahore skyline in haze conditions. Photo: Wikimedia Commons' },
    ],
  },

  // ── 10. Damascus interceptions (RESOLVED, ~30d ago, outside default visibility) ──
  {
    account: 'superadmin',
    key: 'damascus-interceptions',
    incident: {
      title: 'Air Defenses Intercept Missiles Over Damascus Airport Area',
      description:
        'Syrian air defenses engaged multiple incoming projectiles over the Damascus International Airport area in a late-night exchange attributed to an Israeli strike package. State media claimed most missiles were intercepted, while regional observers reported at least two impacts near logistics facilities south of the runway. Flights were briefly suspended before resuming by morning.',
      latitude: 33.4,
      longitude: 36.5,
      categoryId: 12, // unclassified-conflict
      severity: 3,
      startDate: iso(NOW - 30 * D),
      endDate: iso(NOW - 30 * D + 5 * H),
      locationContext: 'Damascus International Airport area, Syria',
      verificationStatus: 'disputed',
      sources: [
        {
          sourceType: 'news_article',
          sourceUrl: 'https://www.reuters.com/world/middle-east/damascus-airport-interceptions-2026-07-05/',
          description: 'Wire report on the interception claims and reported impacts.',
        },
        {
          sourceType: 'x_post',
          sourceUrl: 'https://x.com/LevantOSINT/status/1809001112223334445',
          description: 'Night-sky video of interceptor launches south of Damascus.',
        },
      ],
    },
    updates: [
      {
        afterHours: 6,
        summary: 'Flights resume; damage assessments conflict, incident resolved same day',
        details:
          'Airport operations resumed after daylight inspections. State media maintained that all damage was from debris falls, while satellite-tasked observers identified two fresh impact scars near a logistics compound. With the exchange concluded, the incident is closed as resolved; the impact dispute is preserved in the record.',
        vstatus: 'disputed',
      },
    ],
    resolvedAt: iso(NOW - 30 * D + 5 * H),
    images: [],
  },

  // ── Z1. Hormuz Naval Exclusion Zone ──
  {
    account: 'admin',
    key: 'zone-hormuz-exclusion',
    incident: {
      title: 'Hormuz Naval Exclusion Zone Declared Around Seizure Anchorage',
      description:
        'Iranian authorities broadcast a NOTMAR-style warning declaring a temporary naval exclusion area covering the seizure anchorage and adjacent exercise boxes in the Strait of Hormuz. The declared area overlaps the inbound traffic separation scheme, forcing commercial traffic to compress into the outbound lane under coalition escort advisories. The zone formalizes the elevated interdiction risk tied to the ongoing tanker standoff.',
      geometryType: 'polygon',
      geometry: {
        type: 'Polygon',
        coordinates: [[[55.5, 25.5], [57.5, 25.5], [57.5, 27.5], [55.5, 27.5], [55.5, 25.5]]],
      },
      zoneCategoryId: 5, // maritime-exclusion-zone
      severity: 4,
      startDate: iso(NOW - 12 * D),
      locationContext: 'Strait of Hormuz',
      verificationStatus: 'verified',
      sources: [
        {
          sourceType: 'news_article',
          sourceUrl: 'https://www.reuters.com/world/middle-east/iran-naval-warning-hormuz-2026-07-23/',
          description: 'Report on the navigational warning and its overlap with traffic lanes.',
        },
        {
          sourceType: 'x_post',
          sourceUrl: 'https://x.com/MaritimeOSINT/status/1818400000111222333',
          description: 'Annotated chart showing the exclusion box against the TSS lanes.',
        },
      ],
    },
    updates: [
      {
        afterHours: 48,
        summary: 'Coalition issues escort advisory; two carriers announce surcharges',
        details:
          'The multinational maritime construct advised member-flagged vessels to accept escort scheduling when transiting the compressed outbound lane. Two major carriers announced emergency surcharges for Gulf loadings citing the exclusion area.',
        vstatus: 'verified',
      },
      {
        afterHours: 144,
        summary: 'Zone remains in effect; no live-fire activity observed in declared boxes',
        details:
          'The warning remains in force but monitoring shows no live-fire activity within the declared exercise boxes, suggesting the zone functions primarily as leverage in the tanker dispute rather than a genuine exercise area.',
        vstatus: 'verified',
      },
    ],
    images: [
      { terms: ['Strait of Hormuz naval', 'Hormuz warship'], caption: 'Naval presence in the Strait of Hormuz. Photo: Wikimedia Commons' },
      { terms: ['Hormuz island', 'Hormuz coast'], caption: 'Hormuz area coastline. Photo: Wikimedia Commons' },
    ],
  },

  // ── Z2. Rafah Buffer Corridor ──
  {
    account: 'admin',
    key: 'zone-rafah-corridor',
    incident: {
      title: 'Rafah Buffer Corridor Established Along Gaza–Egypt Border',
      description:
        'A declared buffer corridor now runs along the Gaza side of the Egyptian border, consolidating earlier evacuation directives into a single mapped zone adjacent to the Rafah crossing. The corridor channels humanitarian convoy movement during the daily window and formally separates crossing operations from active strike zones. Aid agencies use the corridor geometry as the reference for convoy routing.',
      geometryType: 'polygon',
      geometry: {
        type: 'Polygon',
        coordinates: [[[34.15, 31.25], [34.3, 31.25], [34.3, 31.35], [34.15, 31.35], [34.15, 31.25]]],
      },
      zoneCategoryId: 7, // evacuation-zone
      severity: 5,
      startDate: iso(NOW - 15 * D),
      locationContext: 'Rafah, Gaza–Egypt border',
      verificationStatus: 'verified',
      sources: [
        {
          sourceType: 'news_article',
          sourceUrl: 'https://www.aljazeera.com/news/2026/7/20/rafah-buffer-corridor-aid-window',
          description: 'Coverage of the corridor declaration and the aid-window mechanics.',
        },
        {
          sourceType: 'admin_note',
          description: 'Analyst note: polygon reflects the published corridor boundaries; review weekly against convoy logs.',
        },
      ],
    },
    updates: [
      {
        afterHours: 96,
        summary: 'First escorted convoys transit corridor without incident',
        details:
          'The first vetted aid convoys moved through the corridor under Egyptian escort during the humanitarian window. Agencies report no security incidents inside the corridor, though throughput remains well below pre-closure levels.',
        vstatus: 'verified',
      },
    ],
    images: [
      { terms: ['Rafah border crossing', 'Rafah crossing'], caption: 'Rafah crossing perimeter. Photo: Wikimedia Commons' },
    ],
  },

  // ── Z3. North Waziristan Operation Area ──
  {
    account: 'superadmin',
    key: 'zone-waziristan-op',
    incident: {
      title: 'Counter-Militancy Operation Area Declared in North Waziristan',
      description:
        'Security forces notified a counter-militancy operation area covering the Hamzoni and Esha plains of North Waziristan following the disputed drone strike and a series of IED finds. Movement after dusk requires clearance, and check posts on the Miranshah–Bannu road have been reinforced. Local reporting on the operation’s scope varies, keeping the situation disputed.',
      geometryType: 'polygon',
      geometry: {
        type: 'Polygon',
        coordinates: [[[69.9, 32.8], [70.3, 32.8], [70.3, 33.2], [69.9, 33.2], [69.9, 32.8]]],
      },
      zoneCategoryId: 3, // curfew
      severity: 3,
      startDate: iso(NOW - 8 * D),
      locationContext: 'North Waziristan, Pakistan',
      verificationStatus: 'disputed',
      sources: [
        {
          sourceType: 'news_article',
          sourceUrl: 'https://www.dawn.com/news/1875600/north-waziristan-operation-area',
          description: 'Report on the notified operation area and movement restrictions.',
        },
        {
          sourceType: 'x_post',
          sourceUrl: 'https://x.com/WaziristanLens/status/1819109998888777666',
          description: 'Checkpoint queue imagery on the Miranshah–Bannu road.',
        },
      ],
    },
    updates: [
      {
        afterHours: 60,
        summary: 'Two IEDs defused at road sites; restrictions extended',
        details:
          'Bomb disposal teams defused two roadside devices inside the operation area, and authorities extended dusk movement restrictions for another week. Trade union transporters report mounting delays on the Bannu route.',
        vstatus: 'disputed',
      },
    ],
    images: [
      { terms: ['Waziristan', 'Waziristan hills'], caption: 'Waziristan hill country. Photo: Wikimedia Commons' },
    ],
  },

  // ── Z4. Bab el-Mandeb High-Risk Transit Corridor ──
  {
    account: 'superadmin',
    key: 'zone-bab-elmandeb-corridor',
    incident: {
      title: 'High-Risk Transit Corridor Designated for Bab el-Mandeb',
      description:
        'Maritime security authorities designated a high-risk transit corridor through the Bab el-Mandeb following the missile strike on a bulk carrier, formalizing recommended routing, convoy windows and reporting requirements for transiting vessels. The corridor compresses traffic into escorted groups and has become the reference geometry for war-risk insurance assessments in the southern Red Sea.',
      geometryType: 'polygon',
      geometry: {
        type: 'Polygon',
        coordinates: [[[42.8, 11.8], [43.8, 11.8], [43.8, 13.2], [42.8, 13.2], [42.8, 11.8]]],
      },
      zoneCategoryId: 2, // notmar
      severity: 4,
      startDate: iso(NOW - 18 * D),
      locationContext: 'Bab el-Mandeb Strait',
      verificationStatus: 'verified',
      sources: [
        {
          sourceType: 'news_article',
          sourceUrl: 'https://apnews.com/article/bab-el-mandeb-high-risk-corridor-2026',
          description: 'Report on the corridor designation and convoy scheduling.',
        },
        {
          sourceType: 'x_post',
          sourceUrl: 'https://x.com/RedSeaShipping/status/1816500000999888777',
          description: 'Chart overlay of the corridor against recent attack positions.',
        },
      ],
    },
    updates: [
      {
        afterHours: 120,
        summary: 'First escorted convoy groups complete transit; attack tempo unchanged',
        details:
          'Initial convoy groups transited the corridor under escort without incident. Intercepts of one-way attack drones continue in the wider southern Red Sea, indicating the threat driving the corridor designation has not abated.',
        vstatus: 'verified',
      },
    ],
    images: [
      { terms: ['Bab el-Mandeb strait', 'Bab el Mandeb'], caption: 'Bab el-Mandeb chokepoint. Photo: Wikimedia Commons' },
    ],
  },

  // ── Z5. Quetta Blast Investigation Cordon (RESOLVED, grace period) ──
  {
    account: 'superadmin',
    key: 'zone-quetta-cordon',
    incident: {
      title: 'Quetta Blast Investigation Cordon Lifted After Forensic Sweep',
      description:
        'Police maintained a security cordon around the site of a market bombing in Quetta for the duration of the forensic investigation, closing several streets to traffic and restricting entry to residents and investigators. The cordon has now been lifted after evidence collection concluded, with the case handed to counter-terrorism prosecutors. Streets inside the former cordon have reopened.',
      geometryType: 'polygon',
      geometry: {
        type: 'Polygon',
        coordinates: [[[66.97, 30.16], [67.01, 30.16], [67.01, 30.2], [66.97, 30.2], [66.97, 30.16]]],
      },
      zoneCategoryId: 3, // curfew
      severity: 2,
      startDate: iso(NOW - 14 * D),
      endDate: iso(NOW - 1 * D),
      locationContext: 'Quetta, Balochistan, Pakistan',
      verificationStatus: 'verified',
      sources: [
        {
          sourceType: 'news_article',
          sourceUrl: 'https://www.dawn.com/news/1874999/quetta-cordon-lifted',
          description: 'Report on the cordon being lifted and the case moving to prosecutors.',
        },
        {
          sourceType: 'admin_note',
          description: 'Analyst note: retained for reference; cordon geometry matches street closures listed in the police order.',
        },
      ],
    },
    updates: [
      {
        afterHours: 300,
        summary: 'Forensic sweep complete; cordon lifted, streets reopened',
        details:
          'Investigators completed evidence collection at the blast site, including device-fragment recovery consistent with a bicycle-borne IED. The cordon was lifted and affected streets reopened to residents and traffic.',
        vstatus: 'verified',
      },
    ],
    resolvedAt: iso(NOW - 1 * D),
    images: [],
  },
];

// ─── Execution ───

const TOKENS = {};
const output = { items: [], errors: [] };
const backdateSql = [];
const MEDIA_ONLY = process.argv.includes('--media-only');

// Images: Wikimedia search → real media endpoint, then hero patch.
// Shared by the full seed and --media-only catch-up mode.
async function seedMedia(item, res, timeline) {
  const { account } = item;
  const incidentId = res.incidentId;
  const uploaded = [];
  const seenPages = new Set();
  for (let i = 0; i < (item.images || []).length; i++) {
    const img = item.images[i];
    const hit = await fetchImageForTerms(img.terms);
    if (!hit) {
      console.log(`  ⚠ no Wikimedia image for: ${img.terms[0]}`);
      output.errors.push({ key: item.key, stage: 'image-search', error: img.terms[0] });
      continue;
    }
    if (seenPages.has(hit.pageId)) {
      console.log(`  ⚠ duplicate lead image skipped (${hit.title})`);
      continue;
    }
    seenPages.add(hit.pageId);
    try {
      const filename = `wikipedia-${hit.pageId}.${hit.mime === 'image/png' ? 'png' : 'jpg'}`;
      const attachTo = timeline.length ? timeline[Math.min(i + 1, timeline.length - 1)].id : undefined;
      const media = await uploadImage(account, incidentId, hit.buffer, filename, hit.mime, img.caption, attachTo);
      uploaded.push(media);
      console.log(`  ✓ media ${media.id} (${(hit.buffer.length / 1024).toFixed(0)} KB from "${hit.title}")`);
    } catch (err) {
      console.log(`  ✗ media upload failed: ${err.message}`);
      output.errors.push({ key: item.key, stage: 'media-upload', error: err.message });
    }
    await sleep(400);
  }
  res.mediaCount = uploaded.length;
  res.media = uploaded.map((m) => ({ id: m.id, fileUrl: m.file_url, thumbUrl: m.thumbnail_url }));

  // Hero image = first uploaded image
  if (uploaded.length > 0) {
    try {
      await request(account, 'PATCH', `/incidents/${incidentId}`, { heroImageUrl: uploaded[0].file_url });
      console.log('  ✓ hero image set');
    } catch (err) {
      console.log(`  ✗ hero patch failed: ${err.message}`);
      output.errors.push({ key: item.key, stage: 'hero', error: err.message });
    }
    await sleep(250);
  }
}

async function seedItem(item) {
  const { account, key } = item;
  const spec = item.incident;
  console.log(`\n▶ [${account}] ${spec.title}`);
  const res = { key, account, title: spec.title };

  // 1. Create incident (beat-1 sources embedded in the same request)
  let created;
  try {
    created = await request(account, 'POST', '/incidents', spec);
  } catch (err) {
    console.log(`  ✗ create failed: ${err.message}`);
    output.errors.push({ key, stage: 'create', error: err.message });
    return;
  }
  const incidentId = created.incident.id;
  res.incidentId = incidentId;
  console.log(`  ✓ incident ${incidentId}`);

  // 2. Remaining timeline updates (the auto initial report is beat 1)
  const createdUpdates = [];
  for (const u of item.updates || []) {
    const payload = {
      summary: u.summary,
      details: u.details,
      updateDate: iso(new Date(spec.startDate).getTime() + u.afterHours * H),
      type: 'update',
      ...(u.vstatus ? { verificationStatus: u.vstatus } : {}),
    };
    try {
      const data = await request(account, 'POST', `/incidents/${incidentId}/timeline`, payload);
      createdUpdates.push({ id: data.update.id, sources: u.sources || [] });
      console.log(`  ✓ update ${data.update.id}`);
    } catch (err) {
      console.log(`  ✗ update failed: ${err.message}`);
      output.errors.push({ key, stage: 'update', error: err.message });
    }
    await sleep(250);
  }
  res.updateCount = 1 + createdUpdates.length;

  // 3. Extra sources attached to their beat updates
  let sourceCount = (spec.sources || []).length;
  for (const cu of createdUpdates) {
    for (const s of cu.sources) {
      try {
        await request(account, 'POST', `/incidents/${incidentId}/sources`, {
          updateId: cu.id,
          sourceType: s.sourceType,
          sourceUrl: s.sourceUrl,
          description: s.description,
        });
        sourceCount++;
        console.log(`  ✓ source (${s.sourceType})`);
      } catch (err) {
        console.log(`  ✗ source failed: ${err.message}`);
        output.errors.push({ key, stage: 'source', error: err.message });
      }
      await sleep(250);
    }
  }
  res.sourceCount = sourceCount;

  // 4. Fetch the incident to map all timeline ids (for media attachment + SQL)
  let timeline = [];
  try {
    const detail = await request(account, 'GET', `/incidents/${incidentId}`, null, { counted: false });
    timeline = detail.timeline || [];
  } catch (err) {
    console.log(`  ⚠ detail fetch failed: ${err.message}`);
  }

  // 5-6. Images via Wikimedia + hero image
  await seedMedia(item, res, timeline);

  // 7. Resolve (carries resolvedAt → end_date + resolved_at in one call)
  if (item.resolvedAt) {
    try {
      await request(account, 'POST', `/incidents/${incidentId}/resolve`, { resolvedAt: item.resolvedAt });
      console.log('  ✓ resolved');
    } catch (err) {
      console.log(`  ✗ resolve failed: ${err.message}`);
      output.errors.push({ key, stage: 'resolve', error: err.message });
    }
    await sleep(250);
  }

  // 8. Backdating SQL: created_at ≈ narrative dates (created_at of updates
  //    = update_date + 25min so timeline ordering reads naturally)
  const startMs = new Date(spec.startDate).getTime();
  backdateSql.push(
    `UPDATE incidents SET created_at = '${iso(startMs + H)}'::timestamptz WHERE id = '${incidentId}';`
  );
  for (const row of timeline) {
    const updMs = new Date(row.update_date).getTime() + 25 * 60_000;
    backdateSql.push(
      `UPDATE incident_updates SET created_at = '${iso(updMs)}'::timestamptz WHERE id = '${row.id}';`
    );
  }

  output.items.push(res);
}

async function main() {
  await mkdir(TMP_DIR, { recursive: true });
  console.log('Logging in (once per account)…');
  TOKENS.admin = await login('admin');
  TOKENS.superadmin = await login('superadmin');
  console.log('✓ tokens acquired');

  if (MEDIA_ONLY) {
    // Catch-up mode: attach images + heroes to incidents already created by a
    // previous run (ids read from output.json). No incidents are recreated.
    const prev = JSON.parse(await readFile(`${TMP_DIR}/output.json`, 'utf8'));
    output.errors = prev.errors || [];
    for (const res of prev.items) {
      const item = ITEMS.find((it) => it.key === res.key);
      output.items.push(res);
      if (!item || !(item.images || []).length) continue;
      console.log(`\n▶ [media-only][${item.account}] ${item.incident.title}`);
      let timeline = [];
      try {
        const detail = await request(item.account, 'GET', `/incidents/${res.incidentId}`, null, { counted: false });
        timeline = detail.timeline || [];
      } catch (err) {
        console.log(`  ⚠ detail fetch failed: ${err.message}`);
      }
      await seedMedia(item, res, timeline);
      await sleep(400);
    }
    await writeFile(`${TMP_DIR}/output.json`, JSON.stringify(output, null, 2));
    console.log('\n═══ MEDIA-ONLY SUMMARY ═══');
    for (const r of output.items) console.log(`${r.key}: id=${r.incidentId} media=${r.mediaCount || 0}`);
    console.log(`429 retries: ${stats.retries429} | cumulative errors: ${output.errors.length}`);
    return;
  }

  for (const item of ITEMS) {
    await seedItem(item);
    await sleep(500);
  }

  backdateSql.unshift('-- GeoWatch seed backdating pass — apply with psql -d geowatch_dev -f');
  await writeFile(`${TMP_DIR}/backdate.sql`, backdateSql.join('\n') + '\n');
  await writeFile(`${TMP_DIR}/output.json`, JSON.stringify(output, null, 2));

  console.log('\n═══ SUMMARY ═══');
  for (const r of output.items) {
    console.log(
      `${r.key}: id=${r.incidentId} updates=${r.updateCount} sources=${r.sourceCount} media=${r.mediaCount}`
    );
  }
  console.log(`writes per account: ${JSON.stringify(stats.writes)} | 429 retries: ${stats.retries429}`);
  console.log(`errors: ${output.errors.length}`);
  if (output.errors.length) console.log(JSON.stringify(output.errors, null, 2));
  console.log(`\nBackdate SQL: ${TMP_DIR}/backdate.sql`);
  console.log(`Output JSON:  ${TMP_DIR}/output.json`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
