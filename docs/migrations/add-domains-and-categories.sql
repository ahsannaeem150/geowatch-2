-- ============================================
-- GeoWatch: Add Domains & Categories Taxonomy
-- ============================================
-- Run this as: geowatch_user
-- Creates the domains and categories tables and seeds all data.
--
-- NOTE: Run AFTER the rename-events-to-incidents migration.
-- NOTE: A separate script (add-category-id-to-incidents.sql) must be run
--       as the postgres superuser to add category_id to existing tables.

-- ============================================
-- DOMAINS
-- ============================================
CREATE TABLE IF NOT EXISTS domains (
    id SERIAL PRIMARY KEY,
    name VARCHAR(60) NOT NULL,
    slug VARCHAR(60) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL DEFAULT '#6b7280',
    icon VARCHAR(40),
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    domain_id INT NOT NULL REFERENCES domains(id) ON DELETE RESTRICT,
    name VARCHAR(60) NOT NULL,
    slug VARCHAR(60) NOT NULL,
    description TEXT,
    severity_schema JSONB NOT NULL DEFAULT '{"type":"scale","levels":[]}',
    default_severity VARCHAR(20),
    requires_location BOOLEAN NOT NULL DEFAULT true,
    requires_casualties BOOLEAN NOT NULL DEFAULT false,
    requires_property_damage BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(domain_id, slug)
);

-- ============================================
-- SEED DOMAINS
-- ============================================
INSERT INTO domains (name, slug, description, color, icon, sort_order)
VALUES
    ('Conflict', 'conflict', 'State-on-state warfare, civil war, and direct military violence.', '#ef4444', 'shield', 1),
    ('Terrorism & Asymmetric', 'terrorism-asymmetric', 'Non-state ideological violence, insurgent operations, and militant attacks.', '#b91c1c', 'bomb', 2),
    ('Counter-Terrorism & Security Ops', 'counter-terrorism', 'State operations against terrorist, insurgent, or criminal networks.', '#3b82f6', 'crosshair', 3),
    ('Civil Unrest', 'civil-unrest', 'Popular mobilization, protests, riots, and inter-communal violence.', '#f59e0b', 'flame', 4),
    ('Military Posture & Movement', 'military-posture', 'No shots fired, but forces are active or repositioning.', '#64748b', 'swords', 5),
    ('Natural Hazard', 'natural-hazard', 'Geophysical, meteorological, and hydrological events.', '#0ea5e9', 'waves', 6),
    ('Infrastructure & Industrial', 'infrastructure', 'Failure, collapse, or accident in the built environment.', '#8b5cf6', 'factory', 7),
    ('Health Emergency', 'health-emergency', 'Disease outbreak and medical system crises.', '#10b981', 'heart-pulse', 8),
    ('Humanitarian & Migration', 'humanitarian', 'Displacement, aid, protection, and population movement.', '#eab308', 'users', 9),
    ('Political & Governance', 'political', 'State behavior, institutional breakdown, and policy crises.', '#94a3b8', 'landmark', 10),
    ('Cyber & Information', 'cyber', 'Digital domain attacks, information warfare, and network disruption.', '#06b6d4', 'wifi', 11),
    ('Maritime', 'maritime', 'Naval, piracy, port, and coastal incidents.', '#0369a1', 'anchor', 12),
    ('Economic Shock', 'economic', 'Market, currency, supply chain, and resource crises.', '#84cc16', 'trending-down', 13),
    ('Environmental', 'environmental', 'Pollution, ecological damage, and resource degradation.', '#22c55e', 'leaf', 14),
    ('CBRN & WMD', 'cbrn-wmd', 'Chemical, biological, radiological, nuclear, and high-yield explosive threats.', '#7f1d1d', 'radiation', 15),
    ('Transport & Aviation', 'transport', 'Accidents and incidents in air, rail, and road transport.', '#a855f7', 'plane', 16),
    ('Intelligence', 'intelligence', 'Discovered or reported intelligence findings that indicate emerging threats.', '#6366f1', 'eye', 17)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SEED CATEGORIES: CONFLICT
-- ============================================
INSERT INTO categories (domain_id, name, slug, description, sort_order)
SELECT d.id, v.name, v.slug, v.description, v.sort_order
FROM domains d
CROSS JOIN (
    VALUES
        ('Air Strike', 'air-strike', 'Manned aircraft attack on ground targets', 1),
        ('Drone Strike', 'drone-strike', 'UAV / UCAV attack', 2),
        ('Artillery', 'artillery', 'Cannon, rocket artillery, or mortar fire', 3),
        ('Ground Assault', 'ground-assault', 'Infantry or armored ground offensive', 4),
        ('Blockade', 'blockade', 'Siege or supply blockade of territory', 5),
        ('Border Skirmish', 'border-skirmish', 'Small-scale exchange of fire across borders', 6),
        ('Ceasefire Violation', 'ceasefire-violation', 'Breach of declared truce or armistice', 7),
        ('Military Buildup', 'military-buildup', 'Large-scale concentration of forces', 8),
        ('Prisoner of War', 'prisoner-of-war', 'Capture or exchange of POWs', 9),
        ('Aircraft Downing', 'aircraft-downing', 'Hostile shoot-down of plane, helicopter, or drone', 10),
        ('Political Assassination', 'political-assassination', 'Killing of political figure by state or state-affiliated actor', 11),
        ('Unclassified Conflict', 'unclassified-conflict', 'Legacy incident — needs reclassification', 99)
) AS v(name, slug, description, sort_order)
WHERE d.slug = 'conflict'
ON CONFLICT (domain_id, slug) DO NOTHING;

-- ============================================
-- SEED CATEGORIES: TERRORISM & ASYMMETRIC
-- ============================================
INSERT INTO categories (domain_id, name, slug, description, sort_order)
SELECT d.id, v.name, v.slug, v.description, v.sort_order
FROM domains d
CROSS JOIN (
    VALUES
        ('Suicide Bombing', 'suicide-bombing', 'Self-detonated explosive attack', 1),
        ('Vehicle-Borne IED (VBIED)', 'vbied', 'Car, truck, or boat bomb', 2),
        ('Remote IED', 'remote-ied', 'Roadside or planted explosive', 3),
        ('Targeted Killing', 'targeted-killing', 'Assassination of specific individual by non-state actor', 4),
        ('Hostage Taking', 'hostage-taking', 'Abduction for leverage or propaganda', 5),
        ('Execution', 'execution', 'Extrajudicial killing of captives', 6),
        ('Armed Raid', 'armed-raid', 'Coordinated militant assault on facility or convoy', 7),
        ('Improvised Rocket Attack', 'improvised-rocket', 'Unguided rocket or mortar fire by non-state group', 8),
        ('Cyber Terrorism', 'cyber-terrorism', 'Digital attack by terror group causing physical harm', 9),
        ('Recruitment Network', 'recruitment-network', 'Discovery or disruption of militant recruitment cell', 10),
        ('Unclassified Terrorism', 'unclassified-terrorism', 'Legacy incident — needs reclassification', 99)
) AS v(name, slug, description, sort_order)
WHERE d.slug = 'terrorism-asymmetric'
ON CONFLICT (domain_id, slug) DO NOTHING;

-- ============================================
-- SEED CATEGORIES: COUNTER-TERRORISM & SECURITY OPS
-- ============================================
INSERT INTO categories (domain_id, name, slug, description, sort_order)
SELECT d.id, v.name, v.slug, v.description, v.sort_order
FROM domains d
CROSS JOIN (
    VALUES
        ('Intelligence-Based Operation (IBO)', 'ibo', 'Preemptive strike based on intelligence', 1),
        ('Security Raid', 'security-raid', 'Rapid entry and search operation', 2),
        ('Security Operation', 'security-operation', 'Coordinated area-clearance or sweep', 3),
        ('Cell Discovery / Arrest', 'cell-discovery', 'Identification and apprehension of militant cell', 4),
        ('Border Security Operation', 'border-security-op', 'Counter-infiltration or border-area operation', 5),
        ('Counter-Insurgency Sweep', 'counter-insurgency', 'Large-scale area denial operation against insurgents', 6)
) AS v(name, slug, description, sort_order)
WHERE d.slug = 'counter-terrorism'
ON CONFLICT (domain_id, slug) DO NOTHING;

-- ============================================
-- SEED CATEGORIES: CIVIL UNREST
-- ============================================
INSERT INTO categories (domain_id, name, slug, description, sort_order)
SELECT d.id, v.name, v.slug, v.description, v.sort_order
FROM domains d
CROSS JOIN (
    VALUES
        ('Peaceful Protest', 'peaceful-protest', 'Large non-violent demonstration', 1),
        ('Violent Protest', 'violent-protest', 'Demonstration with property damage or clashes', 2),
        ('Security Crackdown', 'security-crackdown', 'Forceful dispersal of protesters by authorities', 3),
        ('Sectarian Riot', 'sectarian-riot', 'Communal violence along religious lines', 4),
        ('Ethnic Clash', 'ethnic-clash', 'Inter-ethnic violence or pogrom', 5),
        ('Labor Strike', 'labor-strike', 'Work stoppage affecting critical infrastructure', 6),
        ('Election-Related Violence', 'election-violence', 'Pre-, during, or post-election violence', 7),
        ('Youth Uprising', 'youth-uprising', 'Student or youth-led mass mobilization', 8),
        ('Unclassified Civil Unrest', 'unclassified-civil-unrest', 'Legacy incident — needs reclassification', 99)
) AS v(name, slug, description, sort_order)
WHERE d.slug = 'civil-unrest'
ON CONFLICT (domain_id, slug) DO NOTHING;

-- ============================================
-- SEED CATEGORIES: MILITARY POSTURE & MOVEMENT
-- ============================================
INSERT INTO categories (domain_id, name, slug, description, sort_order)
SELECT d.id, v.name, v.slug, v.description, v.sort_order
FROM domains d
CROSS JOIN (
    VALUES
        ('Military Exercise / Joint Drill', 'military-exercise', 'Scheduled training or multinational exercise', 1),
        ('Troop Mobilization / Deployment', 'troop-mobilization', 'Movement of units to forward positions', 2),
        ('Naval Task Force Movement', 'naval-movement', 'Fleet or task force repositioning', 3),
        ('Air Patrol / Intercept', 'air-patrol', 'Routine or provocative air activity', 4),
        ('Weapon Acquisition', 'weapon-acquisition', 'Major arms purchase or transfer', 5),
        ('Weapon Testing', 'weapon-testing', 'Missile test, nuclear test, or weapons demonstration', 6),
        ('Border Fortification', 'border-fortification', 'Construction of defensive structures on border', 7),
        ('Base Establishment / Expansion', 'base-establishment', 'New military facility or expansion of existing', 8),
        ('Weapons System Deployment', 'weapons-deployment', 'Installation of missile defense, radars, etc.', 9),
        ('Strategic Asset Repositioning', 'strategic-repositioning', 'Movement of nuclear, air defense, or strategic units', 10),
        ('Snap Readiness Drill', 'snap-drill', 'Unannounced alert or readiness test', 11),
        ('Violation of Airspace', 'airspace-violation', 'Unauthorized military aircraft incursion', 12),
        ('Signing of MOU', 'signing-mou', 'Defense cooperation agreement', 13)
) AS v(name, slug, description, sort_order)
WHERE d.slug = 'military-posture'
ON CONFLICT (domain_id, slug) DO NOTHING;

-- ============================================
-- SEED CATEGORIES: NATURAL HAZARD
-- ============================================
INSERT INTO categories (domain_id, name, slug, description, sort_order)
SELECT d.id, v.name, v.slug, v.description, v.sort_order
FROM domains d
CROSS JOIN (
    VALUES
        ('Earthquake', 'earthquake', 'Seismic event', 1),
        ('Tsunami', 'tsunami', 'Tidal wave triggered by seismic or landslide event', 2),
        ('Flood / Flash Flood', 'flood', 'Riverine or flash flooding', 3),
        ('Monsoon / Heavy Rain', 'monsoon', 'Seasonal extreme rainfall event', 4),
        ('Drought', 'drought', 'Prolonged rainfall deficit', 5),
        ('Wildfire', 'wildfire', 'Uncontrolled vegetation fire', 6),
        ('Landslide', 'landslide', 'Slope failure', 7),
        ('Avalanche', 'avalanche', 'Snow or ice slide', 8),
        ('Sand / Dust Storm', 'sand-storm', 'Severe atmospheric particulate event', 9),
        ('Heatwave', 'heatwave', 'Extended period of extreme heat', 10),
        ('Cold Wave', 'cold-wave', 'Extended period of extreme cold', 11),
        ('Volcanic Eruption', 'volcanic-eruption', 'Ash, lava, or gas emission', 12),
        ('Unclassified Natural Hazard', 'unclassified-natural-hazard', 'Legacy incident — needs reclassification', 99)
) AS v(name, slug, description, sort_order)
WHERE d.slug = 'natural-hazard'
ON CONFLICT (domain_id, slug) DO NOTHING;

-- ============================================
-- SEED CATEGORIES: INFRASTRUCTURE & INDUSTRIAL
-- ============================================
INSERT INTO categories (domain_id, name, slug, description, sort_order)
SELECT d.id, v.name, v.slug, v.description, v.sort_order
FROM domains d
CROSS JOIN (
    VALUES
        ('Building Collapse', 'building-collapse', 'Structural failure of building or tower', 1),
        ('Dam Failure', 'dam-failure', 'Breach or catastrophic release', 2),
        ('Bridge / Road Collapse', 'bridge-collapse', 'Transportation infrastructure failure', 3),
        ('Industrial Explosion', 'industrial-explosion', 'Factory, plant, or refinery blast', 4),
        ('Industrial / Structural Fire', 'industrial-fire', 'Major fire in built environment', 5),
        ('Mine Accident', 'mine-accident', 'Tunnel collapse, flooding, or explosion', 6),
        ('Pipeline Rupture', 'pipeline-rupture', 'Oil, gas, or water pipeline breach', 7),
        ('Power Grid Failure', 'power-failure', 'Large-scale blackout or grid collapse', 8),
        ('Telecommunications Outage', 'telecom-outage', 'Cellular, internet, or broadcast system failure', 9)
) AS v(name, slug, description, sort_order)
WHERE d.slug = 'infrastructure'
ON CONFLICT (domain_id, slug) DO NOTHING;

-- ============================================
-- SEED CATEGORIES: HEALTH EMERGENCY
-- ============================================
INSERT INTO categories (domain_id, name, slug, description, sort_order)
SELECT d.id, v.name, v.slug, v.description, v.sort_order
FROM domains d
CROSS JOIN (
    VALUES
        ('Disease Outbreak', 'disease-outbreak', 'Cholera, dengue, malaria, etc.', 1),
        ('Pandemic Response', 'pandemic-response', 'Major public health emergency response', 2),
        ('Hospital Overload / Collapse', 'hospital-overload', 'Medical system capacity breach', 3),
        ('Food Contamination', 'food-contamination', 'Mass poisoning via food supply', 4),
        ('Mass Poisoning', 'mass-poisoning', 'Chemical or toxin exposure at scale', 5),
        ('Medical Supply Shortage', 'medical-shortage', 'Critical shortage of medicine, oxygen, or equipment', 6),
        ('Epidemic', 'epidemic', 'Widespread infectious disease (natural origin)', 7)
) AS v(name, slug, description, sort_order)
WHERE d.slug = 'health-emergency'
ON CONFLICT (domain_id, slug) DO NOTHING;

-- ============================================
-- SEED CATEGORIES: HUMANITARIAN & MIGRATION
-- ============================================
INSERT INTO categories (domain_id, name, slug, description, sort_order)
SELECT d.id, v.name, v.slug, v.description, v.sort_order
FROM domains d
CROSS JOIN (
    VALUES
        ('Refugee / IDP Influx', 'refugee-idp-influx', 'Large-scale arrival of displaced persons', 1),
        ('Ethnic Cleansing', 'ethnic-cleansing', 'Systematic forced removal or extermination of ethnic group', 2),
        ('Camp Establishment', 'camp-establishment', 'Creation of new refugee or IDP camp', 3),
        ('Camp Overcrowding', 'camp-overcrowding', 'Camp population exceeding safe capacity', 4),
        ('Food Security Crisis', 'food-security-crisis', 'Acute food shortage or famine', 5),
        ('Water Scarcity', 'water-scarcity', 'Critical lack of potable water', 6),
        ('Mass Evacuation', 'mass-evacuation', 'Ordered or spontaneous large-scale evacuation', 7),
        ('Search & Rescue Operation', 'search-rescue', 'Post-disaster or post-attack rescue mission', 8),
        ('Human Trafficking', 'human-trafficking', 'Discovery of trafficking network or mass smuggling', 9),
        ('Child Soldier Recruitment', 'child-soldier', 'Armed group recruitment of minors', 10),
        ('School Attack', 'school-attack', 'Targeted attack on educational institution', 11),
        ('Mass Abduction', 'mass-abduction', 'Large-scale kidnapping', 12),
        ('Unclassified Humanitarian', 'unclassified-humanitarian', 'Legacy incident — needs reclassification', 99)
) AS v(name, slug, description, sort_order)
WHERE d.slug = 'humanitarian'
ON CONFLICT (domain_id, slug) DO NOTHING;

-- ============================================
-- SEED CATEGORIES: POLITICAL & GOVERNANCE
-- ============================================
INSERT INTO categories (domain_id, name, slug, description, sort_order)
SELECT d.id, v.name, v.slug, v.description, v.sort_order
FROM domains d
CROSS JOIN (
    VALUES
        ('Election Violence / Rigging', 'election-violence', 'Coercion, fraud, or violence during electoral process', 1),
        ('Coup d''État', 'coup', 'Extra-constitutional seizure of power', 2),
        ('Constitutional Crisis', 'constitutional-crisis', 'Breakdown of constitutional order', 3),
        ('Martial Law', 'martial-law', 'Imposition of military rule', 4),
        ('Diplomatic Crisis', 'diplomatic-crisis', 'Severance of relations, expulsion of diplomats', 5),
        ('Sanctions', 'sanctions', 'Imposition of economic or trade sanctions', 6),
        ('Corruption', 'corruption', 'Major graft scandal or exposure', 7),
        ('Governance Failure', 'governance-failure', 'Collapse of state service delivery', 8),
        ('Judicial Crisis', 'judicial-crisis', 'Attack on judiciary or rule of law', 9),
        ('Press Freedom Violation', 'press-violation', 'Targeting of journalists or media outlets', 10),
        ('Unclassified Political Event', 'unclassified-political', 'Legacy incident — needs reclassification', 99),
        ('Other', 'other', 'Miscellaneous political or governance event', 100)
) AS v(name, slug, description, sort_order)
WHERE d.slug = 'political'
ON CONFLICT (domain_id, slug) DO NOTHING;

-- ============================================
-- SEED CATEGORIES: CYBER & INFORMATION
-- ============================================
INSERT INTO categories (domain_id, name, slug, description, sort_order)
SELECT d.id, v.name, v.slug, v.description, v.sort_order
FROM domains d
CROSS JOIN (
    VALUES
        ('Internet Shutdown', 'internet-shutdown', 'Deliberate disconnection of internet service', 1),
        ('Cyberattack', 'cyberattack', 'Hacking, ransomware, or network intrusion', 2),
        ('Data Breach', 'data-breach', 'Unauthorized access to sensitive data', 3),
        ('Espionage', 'espionage', 'State or corporate cyber-espionage', 4),
        ('Disinformation Campaign', 'disinformation', 'Coordinated false information operation', 5),
        ('GPS / Comms Jamming', 'gps-jamming', 'Electronic interference with navigation or communication', 6),
        ('Social Media Platform Ban', 'social-media-ban', 'Government-ordered platform restriction', 7),
        ('Electronic Surveillance', 'electronic-surveillance', 'Mass surveillance program exposed or deployed', 8),
        ('Deepfake Campaign', 'deepfake', 'Synthetic media disinformation at scale', 9),
        ('Satellite Interference', 'satellite-interference', 'Jamming or spoofing of satellite signals', 10)
) AS v(name, slug, description, sort_order)
WHERE d.slug = 'cyber'
ON CONFLICT (domain_id, slug) DO NOTHING;

-- ============================================
-- SEED CATEGORIES: MARITIME
-- ============================================
INSERT INTO categories (domain_id, name, slug, description, sort_order)
SELECT d.id, v.name, v.slug, v.description, v.sort_order
FROM domains d
CROSS JOIN (
    VALUES
        ('Naval Blockade', 'naval-blockade', 'Maritime exclusion zone or blockade', 1),
        ('Naval Engagement', 'naval-engagement', 'Open combat between naval forces', 2),
        ('Piracy / Maritime Crime', 'piracy', 'Armed robbery or hijacking at sea', 3),
        ('Port Blockade', 'port-blockade', 'Closure or restriction of port access', 4),
        ('Port Closure / Congestion', 'port-closure', 'Operational shutdown or severe bottleneck', 5),
        ('Ship Sinking', 'ship-sinking', 'Vessel loss by accident or attack', 6),
        ('Maritime Refugee Crisis', 'maritime-refugee', 'Mass movement by sea', 7),
        ('Illegal Fishing', 'illegal-fishing', 'Large-scale unauthorized fishing operation', 8),
        ('Oil Spill', 'oil-spill', 'Marine petroleum or chemical release', 9)
) AS v(name, slug, description, sort_order)
WHERE d.slug = 'maritime'
ON CONFLICT (domain_id, slug) DO NOTHING;

-- ============================================
-- SEED CATEGORIES: ECONOMIC SHOCK
-- ============================================
INSERT INTO categories (domain_id, name, slug, description, sort_order)
SELECT d.id, v.name, v.slug, v.description, v.sort_order
FROM domains d
CROSS JOIN (
    VALUES
        ('Currency Collapse', 'currency-collapse', 'Rapid devaluation or hyperinflation event', 1),
        ('Currency Devaluation', 'currency-devaluation', 'Significant official devaluation', 2),
        ('Fuel Shortage', 'fuel-shortage', 'Critical petroleum or gas supply deficit', 3),
        ('Market Disruption', 'market-disruption', 'Stock exchange collapse or major market halt', 4),
        ('Banking Crisis', 'banking-crisis', 'Bank run, failure, or sector collapse', 5),
        ('Supply Chain Breakdown', 'supply-chain-breakdown', 'Critical goods transport failure', 6),
        ('Black Market Surge', 'black-market-surge', 'Rapid expansion of illicit trade', 7),
        ('Trade Route Closure', 'trade-route-closure', 'Strategic corridor blocked', 8),
        ('Bank Run', 'bank-run', 'Mass withdrawal from financial institutions', 9)
) AS v(name, slug, description, sort_order)
WHERE d.slug = 'economic'
ON CONFLICT (domain_id, slug) DO NOTHING;

-- ============================================
-- SEED CATEGORIES: ENVIRONMENTAL
-- ============================================
INSERT INTO categories (domain_id, name, slug, description, sort_order)
SELECT d.id, v.name, v.slug, v.description, v.sort_order
FROM domains d
CROSS JOIN (
    VALUES
        ('Oil Spill', 'oil-spill', 'Terrestrial or marine petroleum release', 1),
        ('Chemical / Toxic Leak', 'chemical-leak', 'Industrial or accidental chemical release', 2),
        ('Air Quality Crisis', 'air-quality-crisis', 'Hazardous air pollution event', 3),
        ('Water Pollution', 'water-pollution', 'Contamination of freshwater source', 4),
        ('Soil Contamination', 'soil-contamination', 'Agricultural or industrial soil poisoning', 5),
        ('Deforestation', 'deforestation', 'Large-scale illegal or state-sanctioned clearing', 6),
        ('Coastal Erosion / Damage', 'coastal-erosion', 'Severe shoreline degradation', 7),
        ('Desertification', 'desertification', 'Accelerated land degradation', 8)
) AS v(name, slug, description, sort_order)
WHERE d.slug = 'environmental'
ON CONFLICT (domain_id, slug) DO NOTHING;

-- ============================================
-- SEED CATEGORIES: CBRN & WMD
-- ============================================
INSERT INTO categories (domain_id, name, slug, description, sort_order)
SELECT d.id, v.name, v.slug, v.description, v.sort_order
FROM domains d
CROSS JOIN (
    VALUES
        ('Chemical Weapons Use', 'chemical-weapons', 'Deployment of chemical warfare agents', 1),
        ('Chemical Agent Leak', 'chemical-agent-leak', 'Industrial or military chemical release', 2),
        ('Radiological Incident', 'radiological', 'Exposure to radioactive material', 3),
        ('Nuclear Facility Alert', 'nuclear-facility', 'Accident or threat at nuclear installation', 4),
        ('Biological Agent Release', 'biological-agent', 'Deliberate or accidental biological exposure', 5),
        ('Nuclear Threat', 'nuclear-threat', 'State or non-state nuclear threat or test', 6)
) AS v(name, slug, description, sort_order)
WHERE d.slug = 'cbrn-wmd'
ON CONFLICT (domain_id, slug) DO NOTHING;

-- ============================================
-- SEED CATEGORIES: TRANSPORT & AVIATION
-- ============================================
INSERT INTO categories (domain_id, name, slug, description, sort_order)
SELECT d.id, v.name, v.slug, v.description, v.sort_order
FROM domains d
CROSS JOIN (
    VALUES
        ('Aviation Accident', 'aviation-accident', 'Civilian aircraft crash or emergency', 1),
        ('Rail Accident', 'rail-accident', 'Train derailment or collision', 2),
        ('Road Mass Casualty', 'road-mass-casualty', 'Major bus or vehicle pile-up', 3),
        ('Maritime Accident', 'maritime-accident', 'Non-combatant ship collision or grounding', 4),
        ('Pipeline Explosion', 'pipeline-explosion', 'Fuel or gas line detonation', 5)
) AS v(name, slug, description, sort_order)
WHERE d.slug = 'transport'
ON CONFLICT (domain_id, slug) DO NOTHING;

-- ============================================
-- SEED CATEGORIES: INTELLIGENCE
-- ============================================
INSERT INTO categories (domain_id, name, slug, description, sort_order)
SELECT d.id, v.name, v.slug, v.description, v.sort_order
FROM domains d
CROSS JOIN (
    VALUES
        ('Intelligence Report / Assessment', 'intel-report', 'Compiled analysis from classified or official sources', 1),
        ('Satellite Imagery Finding', 'satellite-imagery', 'Detection via commercial or military satellite imagery', 2),
        ('Signals Intelligence (SIGINT)', 'sigint', 'Intercepted communications or electronic signals', 3),
        ('Human Intelligence (HUMINT)', 'humint', 'Information from human sources or informants', 4),
        ('Open Source Intelligence (OSINT)', 'osint', 'Analysis of publicly available data and media', 5),
        ('Tactical Intelligence', 'tactical-intel', 'Short-term, operationally actionable intelligence', 6),
        ('Strategic Warning', 'strategic-warning', 'Long-term threat assessment or early warning', 7),
        ('Counter-Intelligence Operation', 'counter-intel', 'Operation to detect or neutralize hostile intelligence', 8),
        ('Threat Assessment', 'threat-assessment', 'Evaluated risk of imminent hostile action', 9),
        ('Surveillance Detection', 'surveillance-detection', 'Confirmed observation or monitoring activity', 10)
) AS v(name, slug, description, sort_order)
WHERE d.slug = 'intelligence'
ON CONFLICT (domain_id, slug) DO NOTHING;

-- ============================================
-- VERIFY SEED
-- ============================================
SELECT 'Domains created:' AS check_item, COUNT(*) AS count FROM domains
UNION ALL
SELECT 'Categories created:', COUNT(*) FROM categories;
