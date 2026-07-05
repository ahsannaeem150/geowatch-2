export const DOMAINS = [
  {
    id: 1,
    name: 'Conflict',
    slug: 'conflict',
    color: '#ef4444',
    lightColor: '#b91c1c',
    icon: 'shield',
    description: 'State-on-state warfare, civil war, and direct military clashes.',
    categories: [
      'Air Strike', 'Drone Strike', 'Artillery', 'Ground Assault', 'Blockade',
      'Border Skirmish', 'Ceasefire Violation', 'Military Buildup', 'Prisoner of War',
      'Aircraft Downing', 'Political Assassination', 'Unclassified Conflict',
    ],
  },
  {
    id: 2,
    name: 'Terrorism & Asymmetric',
    slug: 'terrorism-asymmetric',
    color: '#b91c1c',
    lightColor: '#7f1d1d',
    icon: 'bomb',
    description: 'Non-state ideological violence, insurgency, and asymmetric attacks.',
    categories: [
      'Suicide Bombing', 'Vehicle-Borne IED (VBIED)', 'Remote IED', 'Targeted Killing',
      'Hostage Taking', 'Execution', 'Armed Raid', 'Improvised Rocket Attack',
      'Cyber Terrorism', 'Recruitment Network', 'Unclassified Terrorism',
    ],
  },
  {
    id: 3,
    name: 'Counter-Terrorism & Security Ops',
    slug: 'counter-terrorism',
    color: '#3b82f6',
    lightColor: '#1d4ed8',
    icon: 'crosshair',
    description: 'State operations against terrorist, insurgent, and criminal networks.',
    categories: [
      'Intelligence-Based Operation (IBO)', 'Security Raid', 'Security Operation',
      'Cell Discovery / Arrest', 'Border Security Operation', 'Counter-Insurgency Sweep',
    ],
  },
  {
    id: 4,
    name: 'Civil Unrest',
    slug: 'civil-unrest',
    color: '#f59e0b',
    lightColor: '#b45309',
    icon: 'flame',
    description: 'Popular mobilization, protests, riots, and sectarian violence.',
    categories: [
      'Peaceful Protest', 'Violent Protest', 'Security Crackdown', 'Sectarian Riot',
      'Ethnic Clash', 'Labor Strike', 'Election-Related Violence', 'Youth Uprising',
      'Unclassified Civil Unrest',
    ],
  },
  {
    id: 5,
    name: 'Military Posture & Movement',
    slug: 'military-posture',
    color: '#64748b',
    lightColor: '#475569',
    icon: 'swords',
    description: 'Troop movements, drills, and posture changes without direct combat.',
    categories: [
      'Military Exercise / Joint Drill', 'Troop Mobilization / Deployment', 'Naval Task Force Movement',
      'Air Patrol / Intercept', 'Weapon Acquisition', 'Weapon Testing', 'Border Fortification',
      'Base Establishment / Expansion', 'Weapons System Deployment', 'Strategic Asset Repositioning',
      'Snap Readiness Drill', 'Violation of Airspace', 'Signing of MOU',
    ],
  },
  {
    id: 6,
    name: 'Natural Hazard',
    slug: 'natural-hazard',
    color: '#0ea5e9',
    lightColor: '#0369a1',
    icon: 'waves',
    description: 'Geophysical, meteorological, and hydrological disasters.',
    categories: [
      'Earthquake', 'Tsunami', 'Flood / Flash Flood', 'Monsoon / Heavy Rain', 'Drought',
      'Wildfire', 'Landslide', 'Avalanche', 'Sand / Dust Storm', 'Heatwave', 'Cold Wave',
      'Volcanic Eruption', 'Unclassified Natural Hazard',
    ],
  },
  {
    id: 7,
    name: 'Infrastructure & Industrial',
    slug: 'infrastructure',
    color: '#8b5cf6',
    lightColor: '#5b21b6',
    icon: 'factory',
    description: 'Failure, collapse, or accident in the built environment.',
    categories: [
      'Building Collapse', 'Dam Failure', 'Bridge / Road Collapse', 'Industrial Explosion',
      'Industrial / Structural Fire', 'Mine Accident', 'Pipeline Rupture', 'Power Grid Failure',
      'Telecommunications Outage',
    ],
  },
  {
    id: 8,
    name: 'Health Emergency',
    slug: 'health-emergency',
    color: '#10b981',
    lightColor: '#047857',
    icon: 'heart-pulse',
    description: 'Disease outbreak and medical system crisis.',
    categories: [
      'Disease Outbreak', 'Pandemic Response', 'Hospital Overload / Collapse',
      'Food Contamination', 'Mass Poisoning', 'Medical Supply Shortage', 'Epidemic',
    ],
  },
  {
    id: 9,
    name: 'Humanitarian & Migration',
    slug: 'humanitarian',
    color: '#eab308',
    lightColor: '#a16207',
    icon: 'users',
    description: 'Displacement, aid, protection, and population movement.',
    categories: [
      'Refugee / IDP Influx', 'Ethnic Cleansing', 'Camp Establishment', 'Camp Overcrowding',
      'Food Security Crisis', 'Water Scarcity', 'Mass Evacuation', 'Search & Rescue Operation',
      'Human Trafficking', 'Child Soldier Recruitment', 'School Attack', 'Mass Abduction',
      'Unclassified Humanitarian',
    ],
  },
  {
    id: 10,
    name: 'Political & Governance',
    slug: 'political',
    color: '#94a3b8',
    lightColor: '#475569',
    icon: 'landmark',
    description: 'State behavior, institutional breakdown, and political crises.',
    categories: [
      'Election Violence / Rigging', 'Coup d\'État', 'Constitutional Crisis', 'Martial Law',
      'Diplomatic Crisis', 'Sanctions', 'Corruption', 'Governance Failure', 'Judicial Crisis',
      'Press Freedom Violation', 'Unclassified Political Event', 'Other',
    ],
  },
  {
    id: 11,
    name: 'Cyber & Information',
    slug: 'cyber',
    color: '#06b6d4',
    lightColor: '#0e7490',
    icon: 'wifi',
    description: 'Digital domain attacks, information warfare, and network disruptions.',
    categories: [
      'Internet Shutdown', 'Cyberattack', 'Data Breach', 'Espionage', 'Disinformation Campaign',
      'GPS / Comms Jamming', 'Social Media Platform Ban', 'Electronic Surveillance',
      'Deepfake Campaign', 'Satellite Interference',
    ],
  },
  {
    id: 12,
    name: 'Maritime',
    slug: 'maritime',
    color: '#0369a1',
    lightColor: '#0c4a6e',
    icon: 'anchor',
    description: 'Naval, piracy, port, and coastal incidents.',
    categories: [
      'Naval Blockade', 'Naval Engagement', 'Piracy / Maritime Crime', 'Port Blockade',
      'Port Closure / Congestion', 'Ship Sinking', 'Maritime Refugee Crisis', 'Illegal Fishing',
      'Oil Spill',
    ],
  },
  {
    id: 13,
    name: 'Economic Shock',
    slug: 'economic',
    color: '#84cc16',
    lightColor: '#4d7c0f',
    icon: 'trending-down',
    description: 'Market, currency, supply chain, and resource shocks.',
    categories: [
      'Currency Collapse', 'Currency Devaluation', 'Fuel Shortage', 'Market Disruption',
      'Banking Crisis', 'Supply Chain Breakdown', 'Black Market Surge', 'Trade Route Closure',
      'Bank Run',
    ],
  },
  {
    id: 14,
    name: 'Environmental',
    slug: 'environmental',
    color: '#22c55e',
    lightColor: '#15803d',
    icon: 'leaf',
    description: 'Pollution, ecological damage, and resource degradation.',
    categories: [
      'Oil Spill', 'Chemical / Toxic Leak', 'Air Quality Crisis', 'Water Pollution',
      'Soil Contamination', 'Deforestation', 'Coastal Erosion / Damage', 'Desertification',
    ],
  },
  {
    id: 15,
    name: 'CBRN & WMD',
    slug: 'cbrn-wmd',
    color: '#7f1d1d',
    lightColor: '#450a0a',
    icon: 'radiation',
    description: 'Chemical, biological, radiological, nuclear, and WMD events.',
    categories: [
      'Chemical Weapons Use', 'Chemical Agent Leak', 'Radiological Incident', 'Nuclear Facility Alert',
      'Biological Agent Release', 'Nuclear Threat',
    ],
  },
  {
    id: 16,
    name: 'Transport & Aviation',
    slug: 'transport',
    color: '#a855f7',
    lightColor: '#6b21a8',
    icon: 'plane',
    description: 'Accidents in air, rail, road, and maritime transport.',
    categories: [
      'Aviation Accident', 'Rail Accident', 'Road Mass Casualty', 'Maritime Accident',
      'Pipeline Explosion',
    ],
  },
  {
    id: 17,
    name: 'Intelligence',
    slug: 'intelligence',
    color: '#6366f1',
    lightColor: '#3730a3',
    icon: 'eye',
    description: 'Discovered or reported intelligence findings.',
    categories: [
      'Intelligence Report / Assessment', 'Satellite Imagery Finding', 'Signals Intelligence (SIGINT)',
      'Human Intelligence (HUMINT)', 'Open Source Intelligence (OSINT)', 'Tactical Intelligence',
      'Strategic Warning', 'Counter-Intelligence Operation', 'Threat Assessment', 'Surveillance Detection',
    ],
  },
];

export const ZONE_CATEGORIES = [
  { id: 1, name: 'NOTAM', slug: 'notam', color: '#6366f1', lightColor: '#4338ca', icon: 'plane', description: 'Notice to Airmen — temporary or permanent airspace restrictions.' },
  { id: 2, name: 'NOTMAR', slug: 'notmar', color: '#0ea5e9', lightColor: '#0369a1', icon: 'anchor', description: 'Notice to Mariners — maritime hazard or restriction warnings.' },
  { id: 3, name: 'Curfew', slug: 'curfew', color: '#7c3aed', lightColor: '#5b21b6', icon: 'lock', description: 'Movement restriction during specified hours.' },
  { id: 4, name: 'No-Fly Zone', slug: 'no-fly-zone', color: '#ef4444', lightColor: '#b91c1c', icon: 'alert-triangle', description: 'Prohibited airspace for all or selected aircraft.' },
  { id: 5, name: 'Maritime Exclusion Zone', slug: 'maritime-exclusion-zone', color: '#06b6d4', lightColor: '#0e7490', icon: 'ship', description: 'Area off-limits to maritime traffic.' },
  { id: 6, name: 'Protest Area', slug: 'protest-area', color: '#eab308', lightColor: '#a16207', icon: 'megaphone', description: 'Designated or observed public assembly area.' },
  { id: 7, name: 'Evacuation Zone', slug: 'evacuation-zone', color: '#22c55e', lightColor: '#15803d', icon: 'flag', description: 'Area from which people should evacuate.' },
  { id: 8, name: 'Shelter-in-Place', slug: 'shelter-in-place', color: '#3b82f6', lightColor: '#1d4ed8', icon: 'home', description: 'Area where people should remain indoors.' },
];

export const DOMAIN_BY_NAME = Object.fromEntries(DOMAINS.map((d) => [d.name, d]));
export const DOMAIN_BY_SLUG = Object.fromEntries(DOMAINS.map((d) => [d.slug, d]));
export const DOMAIN_BY_CATEGORY_NAME = Object.fromEntries(
  DOMAINS.flatMap((d) => d.categories.map((c) => [c, d]))
);

export const VERIFICATION_STATUSES = [
  { value: 'unverified', label: 'Unverified', color: '#9ca3af' },
  { value: 'verified', label: 'Verified', color: '#22c55e' },
  { value: 'disputed', label: 'Disputed', color: '#f59e0b' },
  { value: 'debunked', label: 'Debunked', color: '#ef4444' },
];

export const SOURCE_TYPES = [
  { value: 'x_post', label: 'X Post' },
  { value: 'news_article', label: 'News Article' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'admin_note', label: 'Admin Note' },
];

export const GEOMETRY_TYPES = [
  { value: 'point', label: 'Point' },
  { value: 'polygon', label: 'Polygon / Zone' },
];

export function getRandomDomain() {
  return DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
}

export function getRandomCategory(domain) {
  const cats = domain.categories;
  return cats[Math.floor(Math.random() * cats.length)];
}
