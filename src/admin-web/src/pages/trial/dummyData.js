import { AlertCircle, RefreshCw, CheckCircle2, Hexagon } from 'lucide-react';
import {
  DOMAINS,
  DOMAIN_BY_NAME,
  DOMAIN_BY_CATEGORY_NAME,
  VERIFICATION_STATUSES,
  SOURCE_TYPES,
  getRandomDomain,
  getRandomCategory,
} from './taxonomyData.js';

export const LAST_LOGOUT_HOURS_AGO = 8;

export const DOMAIN_COLORS = {
  Conflict: '#ef4444',
  'Civil Unrest': '#f97316',
  Infrastructure: '#eab308',
  Maritime: '#3b82f6',
  Cyber: '#a855f7',
  Political: '#22c55e',
  Zones: '#22c55e',
};

export const SEVERITY_LABEL = { 1: 'Minimal', 2: 'Low', 3: 'Moderate', 4: 'Severe', 5: 'Critical' };

export function timeAgo(dateMs, nowMs) {
  const diffMin = Math.floor((nowMs - dateMs) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

export function makeId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function matchCategory(title, domain) {
  const t = title.toLowerCase();
  return (
    domain.categories.find((cat) => t.includes(cat.toLowerCase())) ||
    domain.categories[Math.floor(Math.random() * domain.categories.length)]
  );
}

export function enrichIncident(inc) {
  const domain =
    DOMAIN_BY_CATEGORY_NAME[inc.category] ||
    DOMAIN_BY_NAME[inc.category] ||
    getRandomDomain();
  const categoryName = inc.category || matchCategory(inc.title, domain);
  const verificationStatus = VERIFICATION_STATUSES[Math.floor(Math.random() * VERIFICATION_STATUSES.length)].value;
  const sourceCount = Math.floor(Math.random() * 3) + 1;
  const sourceTypes = shuffle(SOURCE_TYPES)
    .slice(0, sourceCount)
    .map((s) => s.value);
  const geometryType = Math.random() > 0.85 ? 'polygon' : 'point';
  return {
    ...inc,
    domain: domain.name,
    domainSlug: domain.slug,
    domainColor: domain.color,
    categoryName,
    verificationStatus,
    sourceTypes,
    geometryType,
  };
}

export function generateInitialData(now) {
  const lastLogout = now - LAST_LOGOUT_HOURS_AGO * 60 * 60 * 1000;

  const rawIncidents = [
    {
      id: 'i1',
      title: 'Air strike reported near Kabul',
      category: 'Air Strike',
      severity: 4,
      lat: 34.52,
      lng: 69.18,
      status: 'active',
      createdAt: now - 10 * 60 * 60 * 1000,
      updatedAt: now - 10 * 60 * 60 * 1000,
      location: 'Kabul, Afghanistan',
      description: 'Confirmed airstrike in a residential district on the outskirts of Kabul.',
    },
    {
      id: 'i2',
      title: 'Fuel shortage in Eastern Province',
      category: 'Pipeline Rupture',
      severity: 3,
      lat: 30.05,
      lng: 47.95,
      status: 'active',
      createdAt: now - 5 * 60 * 60 * 1000,
      updatedAt: now - 25 * 60 * 1000,
      location: 'Eastern Province, Iraq',
      description: 'Long queues reported at fuel stations across the province.',
    },
    {
      id: 'i3',
      title: 'Civil unrest in Damascus',
      category: 'Peaceful Protest',
      severity: 2,
      lat: 33.51,
      lng: 36.28,
      status: 'active',
      createdAt: now - 2 * 60 * 60 * 1000,
      updatedAt: now - 2 * 60 * 60 * 1000,
      location: 'Damascus, Syria',
      description: 'Protests reported in central Damascus following policy changes.',
    },
    {
      id: 'i4',
      title: 'Maritime alert: Red Sea corridor',
      category: 'Naval Task Force Movement',
      severity: 5,
      lat: 20.35,
      lng: 38.5,
      status: 'active',
      createdAt: now - 45 * 60 * 1000,
      updatedAt: now - 45 * 60 * 1000,
      location: 'Red Sea corridor',
      description: 'Commercial vessels advised to exercise caution in the southern Red Sea.',
    },
    {
      id: 'i5',
      title: 'Cyber attack on government portal',
      category: 'Threat Assessment',
      severity: 3,
      lat: 35.7,
      lng: 51.4,
      status: 'resolved',
      createdAt: now - 3 * 60 * 60 * 1000,
      updatedAt: now - 20 * 60 * 1000,
      location: 'Tehran, Iran',
      description: 'Distributed denial-of-service attack disrupted public services portal.',
    },
    {
      id: 'i6',
      title: 'Border closure announced',
      category: 'Border Fortification',
      severity: 2,
      lat: 31.95,
      lng: 44.35,
      status: 'active',
      createdAt: now - 6 * 60 * 60 * 1000,
      updatedAt: now - 6 * 60 * 60 * 1000,
      location: 'Najaf, Iraq',
      description: 'Authorities announce temporary closure of selected border crossings.',
    },
  ];

  const cities = [
    'Kabul', 'Herat', 'Kandahar', 'Mazar-i-Sharif', 'Jalalabad',
    'Baghdad', 'Basra', 'Mosul', 'Erbil', 'Najaf', 'Fallujah',
    'Damascus', 'Aleppo', 'Homs', 'Hama', 'Daraa', 'Latakia',
    'Tehran', 'Mashhad', 'Isfahan', 'Shiraz', 'Tabriz',
    'Beirut', 'Tripoli', 'Sidon',
    'Jerusalem', 'Gaza City', 'Ramallah', 'Nablus',
    'Riyadh', 'Jeddah', 'Dammam', 'Mecca', 'Medina',
    'Doha', 'Dubai', 'Abu Dhabi', 'Muscat', 'Manama',
    'Sanaa', 'Aden', 'Hodeidah',
    'Cairo', 'Alexandria', 'Luxor',
    'Amman', 'Irbid', 'Zarqa',
    'Kuwait City', 'Tripoli', 'Benghazi', 'Misrata',
  ];
  for (let i = 0; i < 80; i++) {
    const domain = getRandomDomain();
    const category = getRandomCategory(domain);
    const city = cities[Math.floor(Math.random() * cities.length)];
    rawIncidents.push({
      id: `g${i}`,
      title: `${category} in ${city}`,
      category,
      severity: Math.floor(Math.random() * 5) + 1,
      lat: 20 + Math.random() * 22,
      lng: 30 + Math.random() * 40,
      status: Math.random() > 0.85 ? 'resolved' : 'active',
      createdAt: now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
      updatedAt: now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
      location: `${city}, Region ${Math.floor(Math.random() * 900) + 100}`,
      description: `Generated trial incident for ${category} in the ${domain.name} domain.`,
    });
  }

  const incidents = rawIncidents.map(enrichIncident);

  const viewedIds = new Set(['i2', 'i5']);
  const savedIds = new Set(['i1', 'i4']);

  const feed = [];
  incidents.forEach((inc) => {
    if (inc.createdAt > lastLogout) {
      feed.push({
        id: makeId('evt'),
        type: 'new',
        message: `New incident: ${inc.title}`,
        incidentId: inc.id,
        severity: inc.severity,
        createdAt: inc.createdAt,
      });
    }
    if (inc.updatedAt > inc.createdAt && inc.updatedAt > lastLogout) {
      feed.push({
        id: makeId('evt'),
        type: 'update',
        message: `Update on ${inc.title}`,
        incidentId: inc.id,
        severity: inc.severity,
        createdAt: inc.updatedAt,
      });
    }
  });
  feed.push(
    { id: makeId('evt'), type: 'zone', message: 'Zone "Eastern Border" perimeter expanded', createdAt: now - 32 * 60 * 1000 },
    { id: makeId('evt'), type: 'resolved', message: 'Maritime incident near Suez marked resolved', createdAt: now - 58 * 60 * 1000 },
    { id: makeId('evt'), type: 'zone', message: 'New zone created in Red Sea corridor', createdAt: now - 95 * 60 * 1000 }
  );
  feed.sort((a, b) => b.createdAt - a.createdAt);

  const notifications = [];
  incidents.forEach((inc) => {
    if (inc.createdAt > lastLogout && inc.severity >= 4) {
      notifications.push({
        id: makeId('ntf'),
        type: 'new_incident',
        title: 'New severe incident',
        message: inc.title,
        incidentId: inc.id,
        read: false,
        createdAt: inc.createdAt,
      });
    }
    if (viewedIds.has(inc.id) && inc.updatedAt > inc.createdAt && inc.updatedAt > lastLogout) {
      notifications.push({
        id: makeId('ntf'),
        type: 'incident_update',
        title: 'Incident updated',
        message: inc.title,
        incidentId: inc.id,
        read: false,
        createdAt: inc.updatedAt,
      });
    }
  });
  notifications.sort((a, b) => b.createdAt - a.createdAt);

  return { now, lastLogout, incidents, feed, notifications, viewedIds, savedIds };
}

export const EVENT_META = {
  new: { icon: AlertCircle, color: 'var(--danger)', bg: 'var(--badge-red-bg)', label: 'New incident' },
  update: { icon: RefreshCw, color: 'var(--warning)', bg: 'var(--badge-amber-bg)', label: 'Update' },
  resolved: { icon: CheckCircle2, color: 'var(--success)', bg: 'var(--badge-green-bg)', label: 'Resolved' },
  zone: { icon: Hexagon, color: 'var(--accent-light)', bg: 'var(--badge-blue-bg)', label: 'Zone' },
};
