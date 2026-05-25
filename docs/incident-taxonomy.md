# GeoWatch Incident Taxonomy

> **Status:** Draft — pending review before implementation.
> 
> This taxonomy is designed to be fully configurable by a superadmin panel in the future. All domains and categories are stored in relational tables, not hardcoded.

---

## 1. Design Principles

1. **Events, not situations.** Every category describes something that happened at a specific time and place. Ongoing situations ("sanctions regime," "military buildup lasting weeks") are tracked as incidents only at their trigger moments (declaration, troop arrival, etc.).
2. **Two-tier hierarchy.** A **Domain** (top-level) groups related categories. A **Category** is the specific incident type. This keeps filters clean while preserving precision.
3. **Regional specificity.** The taxonomy is built for coverage between 25°E–105°E and 5°N–43°N (Middle East, Central Asia, South Asia, Southeast Asia).
4. **Superadmin-configurable.** Domains, categories, colors, severity schemas, and sort order are all database-driven and editable via admin panel.

---

## 2. Color Palette

Colors are chosen for high visibility on dark MapLibre backgrounds and in the Crimson Seal admin theme. Each domain gets a primary badge/marker color.

| Domain | Color | Hex |
|---|---|---|
| Conflict | Crimson | `#ef4444` |
| Terrorism & Asymmetric | Blood red | `#b91c1c` |
| Counter-Terrorism & Security Ops | Authority blue | `#3b82f6` |
| Civil Unrest | Warning amber | `#f59e0b` |
| Military Posture & Movement | Slate grey | `#64748b` |
| Natural Hazard | Sky blue | `#0ea5e9` |
| Infrastructure & Industrial | Violet | `#8b5cf6` |
| Health Emergency | Medical teal | `#10b981` |
| Humanitarian & Migration | Aid gold | `#eab308` |
| Political & Governance | Bureaucrat grey | `#94a3b8` |
| Cyber & Information | Digital cyan | `#06b6d4` |
| Maritime | Deep ocean | `#0369a1` |
| Economic Shock | Market olive | `#84cc16` |
| Environmental | Eco green | `#22c55e` |
| CBRN & WMD | Dark wine | `#7f1d1d` |
| Transport & Aviation | Aviation purple | `#a855f7` |
| Intelligence | Indigo | `#6366f1` |

---

## 3. Domains & Categories

### 🛡️ CONFLICT
*State-on-state warfare, civil war, and direct military violence.*

| Category | Description |
|---|---|
| Air Strike | Manned aircraft attack on ground targets |
| Drone Strike | UAV / UCAV attack |
| Artillery | Cannon, rocket artillery, or mortar fire |
| Ground Assault | Infantry or armored ground offensive |
| Blockade | Siege or supply blockade of territory |
| Border Skirmish | Small-scale exchange of fire across borders |
| Ceasefire Violation | Breach of declared truce or armistice |
| Military Buildup | Large-scale concentration of forces (recorded as incident at detection) |
| Prisoner of War | Capture or exchange of POWs |
| Aircraft Downing | Hostile shoot-down of plane, helicopter, or drone |
| Political Assassination | Killing of political figure by state or state-affiliated actor |

**Severity schema:** Casualty-based scale.
```json
{
  "type": "scale",
  "levels": [
    {"value": "minimal", "label": "Minimal", "description": "0 casualties"},
    {"value": "low", "label": "Low", "description": "1–5 casualties"},
    {"value": "moderate", "label": "Moderate", "description": "6–25 casualties"},
    {"value": "severe", "label": "Severe", "description": "26–100 casualties"},
    {"value": "critical", "label": "Critical", "description": "100+ casualties"}
  ]
}
```

---

### 💣 TERRORISM & ASYMMETRIC
*Non-state ideological violence, insurgent operations, and militant attacks.*

| Category | Description |
|---|---|
| Suicide Bombing | Self-detonated explosive attack |
| Vehicle-Borne IED (VBIED) | Car, truck, or boat bomb |
| Remote IED | Roadside or planted explosive |
| Targeted Killing | Assassination of specific individual by non-state actor |
| Hostage Taking | Abduction for leverage or propaganda |
| Execution | Extrajudicial killing of captives |
| Armed Raid | Coordinated militant assault on facility or convoy |
| Improvised Rocket Attack | Unguided rocket or mortar fire by non-state group |
| Cyber Terrorism | Digital attack by terror group causing physical harm |
| Recruitment Network | Discovery or disruption of militant recruitment cell |

**Severity schema:** Same casualty-based scale as Conflict.

---

### 🎯 COUNTER-TERRORISM & SECURITY OPS
*State operations against terrorist, insurgent, or criminal networks.*

| Category | Description |
|---|---|
| Intelligence-Based Operation (IBO) | Preemptive strike based on intelligence |
| Security Raid | Rapid entry and search operation |
| Security Operation | Coordinated area-clearance or sweep |
| Cell Discovery / Arrest | Identification and apprehension of militant cell |
| Border Security Operation | Counter-infiltration or border-area operation |
| Counter-Insurgency Sweep | Large-scale area denial operation against insurgents |

**Severity schema:** Casualty-based scale.

---

### 🔥 CIVIL UNREST
*Popular mobilization, protests, riots, and inter-communal violence.*

| Category | Description |
|---|---|
| Peaceful Protest | Large non-violent demonstration |
| Violent Protest | Demonstration with property damage or clashes |
| Security Crackdown | Forceful dispersal of protesters by authorities |
| Sectarian Riot | Communal violence along religious lines |
| Ethnic Clash | Inter-ethnic violence or pogrom |
| Labor Strike | Work stoppage affecting critical infrastructure |
| Election-Related Violence | Pre-, during, or post-election violence |
| Youth Uprising | Student or youth-led mass mobilization |

**Severity schema:** Disruption-based scale.
```json
{
  "type": "scale",
  "levels": [
    {"value": "minimal", "label": "Minimal", "description": "Localized, <100 participants"},
    {"value": "low", "label": "Low", "description": "District-level, 100–1,000 participants"},
    {"value": "moderate", "label": "Moderate", "description": "Provincial, 1,000–10,000 participants"},
    {"value": "severe", "label": "Severe", "description": "National, 10,000–100,000 participants"},
    {"value": "critical", "label": "Critical", "description": "Mass uprising, 100,000+ participants"}
  ]
}
```

---

### ⚔️ MILITARY POSTURE & MOVEMENT
*No shots fired, but forces are active or repositioning.*

| Category | Description |
|---|---|
| Military Exercise / Joint Drill | Scheduled training or multinational exercise |
| Troop Mobilization / Deployment | Movement of units to forward positions |
| Naval Task Force Movement | Fleet or task force repositioning |
| Air Patrol / Intercept | Routine or provocative air activity |
| Weapon Acquisition | Major arms purchase or transfer (recorded at announcement) |
| Weapon Testing | Missile test, nuclear test, or weapons demonstration |
| Border Fortification | Construction of defensive structures on border |
| Base Establishment / Expansion | New military facility or expansion of existing |
| Weapons System Deployment | Installation of missile defense, radars, etc. |
| Strategic Asset Repositioning | Movement of nuclear, air defense, or strategic units |
| Snap Readiness Drill | Unannounced alert or readiness test |
| Violation of Airspace | Unauthorized military aircraft incursion |
| Signing of MOU | Defense cooperation agreement (recorded at signing) |

**Severity schema:** Threat-level scale.
```json
{
  "type": "scale",
  "levels": [
    {"value": "minimal", "label": "Minimal", "description": "Routine, scheduled, announced"},
    {"value": "low", "label": "Low", "description": "Elevated but expected activity"},
    {"value": "moderate", "label": "Moderate", "description": "Unusual timing or scale"},
    {"value": "severe", "label": "Severe", "description": "Provocative or destabilizing"},
    {"value": "critical", "label": "Critical", "description": "Direct threat of imminent conflict"}
  ]
}
```

---

### 🌊 NATURAL HAZARD
*Geophysical, meteorological, and hydrological events.*

| Category | Description |
|---|---|
| Earthquake | Seismic event |
| Tsunami | Tidal wave triggered by seismic or landslide event |
| Flood / Flash Flood | Riverine or flash flooding |
| Monsoon / Heavy Rain | Seasonal extreme rainfall event |
| Drought | Prolonged rainfall deficit |
| Wildfire | Uncontrolled vegetation fire |
| Landslide | Slope failure |
| Avalanche | Snow or ice slide |
| Sand / Dust Storm | Severe atmospheric particulate event |
| Heatwave | Extended period of extreme heat |
| Cold Wave | Extended period of extreme cold |
| Volcanic Eruption | Ash, lava, or gas emission |

**Severity schema:** Impact-based scale (can also use scientific metrics like Richter scale for earthquakes, MMI, etc.).
```json
{
  "type": "scale",
  "levels": [
    {"value": "minimal", "label": "Minimal", "description": "Localized impact, no casualties"},
    {"value": "low", "label": "Low", "description": "District-level impact"},
    {"value": "moderate", "label": "Moderate", "description": "Provincial-level impact"},
    {"value": "severe", "label": "Severe", "description": "National-level impact"},
    {"value": "critical", "label": "Critical", "description": "Catastrophic, regional impact"}
  ]
}
```

---

### 🏭 INFRASTRUCTURE & INDUSTRIAL
*Failure, collapse, or accident in the built environment.*

| Category | Description |
|---|---|
| Building Collapse | Structural failure of building or tower |
| Dam Failure | Breach or catastrophic release |
| Bridge / Road Collapse | Transportation infrastructure failure |
| Industrial Explosion | Factory, plant, or refinery blast |
| Industrial / Structural Fire | Major fire in built environment |
| Mine Accident | Tunnel collapse, flooding, or explosion |
| Pipeline Rupture | Oil, gas, or water pipeline breach |
| Power Grid Failure | Large-scale blackout or grid collapse |
| Telecommunications Outage | Cellular, internet, or broadcast system failure |

**Severity schema:** Disruption + casualty scale.

---

### 🦠 HEALTH EMERGENCY
*Disease outbreak and medical system crises.*

| Category | Description |
|---|---|
| Disease Outbreak | Cholera, dengue, malaria, etc. |
| Pandemic Response | Major public health emergency response |
| Hospital Overload / Collapse | Medical system capacity breach |
| Food Contamination | Mass poisoning via food supply |
| Mass Poisoning | Chemical or toxin exposure at scale |
| Medical Supply Shortage | Critical shortage of medicine, oxygen, or equipment |
| Epidemic | Widespread infectious disease (natural origin) |

**Severity schema:** Scale-based (cases / mortality rate).

---

### 🚶 HUMANITARIAN & MIGRATION
*Displacement, aid, protection, and population movement.*

| Category | Description |
|---|---|
| Refugee / IDP Influx | Large-scale arrival of displaced persons |
| Ethnic Cleansing | Systematic forced removal or extermination of ethnic group |
| Camp Establishment | Creation of new refugee or IDP camp |
| Camp Overcrowding | Camp population exceeding safe capacity |
| Food Security Crisis | Acute food shortage or famine |
| Water Scarcity | Critical lack of potable water |
| Mass Evacuation | Ordered or spontaneous large-scale evacuation |
| Search & Rescue Operation | Post-disaster or post-attack rescue mission |
| Human Trafficking | Discovery of trafficking network or mass smuggling |
| Child Soldier Recruitment | Armed group recruitment of minors |
| School Attack | Targeted attack on educational institution |
| Mass Abduction | Large-scale kidnapping (e.g., Chibok, Peshawar-style) |

**Severity schema:** Population-affected scale.
```json
{
  "type": "scale",
  "levels": [
    {"value": "minimal", "label": "Minimal", "description": "<100 people affected"},
    {"value": "low", "label": "Low", "description": "100–1,000 people affected"},
    {"value": "moderate", "label": "Moderate", "description": "1,000–10,000 people affected"},
    {"value": "severe", "label": "Severe", "description": "10,000–100,000 people affected"},
    {"value": "critical", "label": "Critical", "description": "100,000+ people affected"}
  ]
}
```

---

### 🏛️ POLITICAL & GOVERNANCE
*State behavior, institutional breakdown, and policy crises.*

| Category | Description |
|---|---|
| Election Violence / Rigging | Coercion, fraud, or violence during electoral process |
| Coup d'État | Extra-constitutional seizure of power |
| Constitutional Crisis | Breakdown of constitutional order |
| Martial Law | Imposition of military rule |
| Diplomatic Crisis | Severance of relations, expulsion of diplomats |
| Sanctions | Imposition of economic or trade sanctions |
| Corruption | Major graft scandal or exposure |
| Governance Failure | Collapse of state service delivery |
| Judicial Crisis | Attack on judiciary or rule of law |
| Press Freedom Violation | Targeting of journalists or media outlets |

**Severity schema:** Governance-impact scale.

---

### 🌐 CYBER & INFORMATION
*Digital domain attacks, information warfare, and network disruption.*

| Category | Description |
|---|---|
| Internet Shutdown | Deliberate disconnection of internet service |
| Cyberattack | Hacking, ransomware, or network intrusion |
| Data Breach | Unauthorized access to sensitive data |
| Espionage | State or corporate cyber-espionage |
| Disinformation Campaign | Coordinated false information operation |
| GPS / Comms Jamming | Electronic interference with navigation or communication |
| Social Media Platform Ban | Government-ordered platform restriction |
| Electronic Surveillance | Mass surveillance program exposed or deployed |
| Deepfake Campaign | Synthetic media disinformation at scale |
| Satellite Interference | Jamming or spoofing of satellite signals |

**Severity schema:** Scope-based scale.

---

### ⚓ MARITIME
*Naval, piracy, port, and coastal incidents.*

| Category | Description |
|---|---|
| Naval Blockade | Maritime exclusion zone or blockade |
| Naval Engagement | Open combat between naval forces |
| Piracy / Maritime Crime | Armed robbery or hijacking at sea |
| Port Blockade | Closure or restriction of port access |
| Port Closure / Congestion | Operational shutdown or severe bottleneck |
| Ship Sinking | Vessel loss by accident or attack |
| Maritime Refugee Crisis | Mass movement by sea |
| Illegal Fishing | Large-scale unauthorized fishing operation |
| Oil Spill | Marine petroleum or chemical release |

**Severity schema:** Casualty + economic impact scale.

---

### 💰 ECONOMIC SHOCK
*Market, currency, supply chain, and resource crises.*

| Category | Description |
|---|---|
| Currency Collapse | Rapid devaluation or hyperinflation event |
| Currency Devaluation | Significant official devaluation |
| Fuel Shortage | Critical petroleum or gas supply deficit |
| Market Disruption | Stock exchange collapse or major market halt |
| Banking Crisis | Bank run, failure, or sector collapse |
| Supply Chain Breakdown | Critical goods transport failure |
| Black Market Surge | Rapid expansion of illicit trade |
| Trade Route Closure | Strategic corridor blocked |

**Severity schema:** Economic-impact scale.

---

### 🌿 ENVIRONMENTAL
*Pollution, ecological damage, and resource degradation.*

| Category | Description |
|---|---|
| Oil Spill | Terrestrial or marine petroleum release |
| Chemical / Toxic Leak | Industrial or accidental chemical release |
| Air Quality Crisis | Hazardous air pollution event |
| Water Pollution | Contamination of freshwater source |
| Soil Contamination | Agricultural or industrial soil poisoning |
| Deforestation | Large-scale illegal or state-sanctioned clearing |
| Coastal Erosion / Damage | Severe shoreline degradation |
| Desertification | Accelerated land degradation |

**Severity schema:** Environmental-impact scale.

---

### ☢️ CBRN & WMD
*Chemical, biological, radiological, nuclear, and high-yield explosive threats.*

| Category | Description |
|---|---|
| Chemical Weapons Use | Deployment of chemical warfare agents |
| Chemical Agent Leak | Industrial or military chemical release |
| Radiological Incident | Exposure to radioactive material |
| Nuclear Facility Alert | Accident or threat at nuclear installation |
| Biological Agent Release | Deliberate or accidental biological exposure |
| Nuclear Threat | State or non-state nuclear threat or test |

**Severity schema:** Threat-level scale (always starts at "Severe" minimum).
```json
{
  "type": "scale",
  "levels": [
    {"value": "severe", "label": "Severe", "description": "Localized CBRN release"},
    {"value": "critical", "label": "Critical", "description": "Widespread or weaponized CBRN event"}
  ]
}
```

---

### ✈️ TRANSPORT & AVIATION
*Accidents and incidents in air, rail, and road transport.*

| Category | Description |
|---|---|
| Aviation Accident | Civilian aircraft crash or emergency |
| Rail Accident | Train derailment or collision |
| Road Mass Casualty | Major bus or vehicle pile-up |
| Maritime Accident | Non-combatant ship collision or grounding |
| Pipeline Explosion | Fuel or gas line detonation |

**Severity schema:** Casualty-based scale.

---

### 🔍 INTELLIGENCE
*Discovered or reported intelligence findings that indicate emerging threats or activities.*

| Category | Description |
|---|---|
| Intelligence Report / Assessment | Compiled analysis from classified or official sources |
| Satellite Imagery Finding | Detection via commercial or military satellite imagery |
| Signals Intelligence (SIGINT) | Intercepted communications or electronic signals |
| Human Intelligence (HUMINT) | Information from human sources or informants |
| Open Source Intelligence (OSINT) | Analysis of publicly available data and media |
| Tactical Intelligence | Short-term, operationally actionable intelligence |
| Strategic Warning | Long-term threat assessment or early warning |
| Counter-Intelligence Operation | Operation to detect or neutralize hostile intelligence |
| Threat Assessment | Evaluated risk of imminent hostile action |
| Surveillance Detection | Confirmed observation or monitoring activity |

**Severity schema:** Confidence + urgency scale.
```json
{
  "type": "scale",
  "levels": [
    {"value": "minimal", "label": "Minimal", "description": "Low confidence, no immediate threat"},
    {"value": "low", "label": "Low", "description": "Moderate confidence, monitoring warranted"},
    {"value": "moderate", "label": "Moderate", "description": "Credible report, potential threat"},
    {"value": "severe", "label": "Severe", "description": "High confidence, threat likely"},
    {"value": "critical", "label": "Critical", "description": "Confirmed, imminent threat"}
  ]
}
```

---

## 4. Database Schema

Designed for superadmin configurability. All domains, categories, colors, and severity schemas are editable at runtime.

### 4.1 Domains Table
```sql
CREATE TABLE domains (
    id SERIAL PRIMARY KEY,
    name VARCHAR(60) NOT NULL,              -- e.g. "Conflict"
    slug VARCHAR(60) UNIQUE NOT NULL,       -- URL-safe identifier
    description TEXT,
    color VARCHAR(7) NOT NULL,              -- Hex color for badges/markers
    icon VARCHAR(40),                       -- Lucide icon name or SVG path
    sort_order INT DEFAULT 0,               -- Display order in UI
    is_active BOOLEAN DEFAULT true,         -- Soft-delete / disable
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Categories Table
```sql
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    domain_id INT NOT NULL REFERENCES domains(id) ON DELETE RESTRICT,
    name VARCHAR(60) NOT NULL,              -- e.g. "Airstrike"
    slug VARCHAR(60) NOT NULL,              -- URL-safe identifier
    description TEXT,
    severity_schema JSONB NOT NULL,         -- See examples below
    default_severity VARCHAR(20),           -- Pre-selected severity on creation
    requires_location BOOLEAN DEFAULT true, -- Can this category exist without lat/lng?
    requires_casualties BOOLEAN DEFAULT false,
    requires_property_damage BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,         -- Soft-delete / disable
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(domain_id, slug)
);
```

### 4.3 Severity Schema Format (JSONB)

Each category defines its own severity schema. The superadmin can edit this via a JSON editor in the admin panel.

**Standard 5-tier casualty scale (default for most categories):**
```json
{
  "type": "scale",
  "levels": [
    {"value": "minimal", "label": "Minimal", "color": "#22c55e"},
    {"value": "low", "label": "Low", "color": "#84cc16"},
    {"value": "moderate", "label": "Moderate", "color": "#eab308"},
    {"value": "severe", "label": "Severe", "color": "#f97316"},
    {"value": "critical", "label": "Critical", "color": "#dc2626"}
  ]
}
```

**Magnitude scale (for earthquakes):**
```json
{
  "type": "magnitude",
  "unit": "MMI",
  "levels": [
    {"value": "ii-iii", "label": "Weak", "color": "#84cc16"},
    {"value": "iv-v", "label": "Light", "color": "#eab308"},
    {"value": "vi-vii", "label": "Strong", "color": "#f97316"},
    {"value": "viii-ix", "label": "Severe", "color": "#dc2626"},
    {"value": "x+", "label": "Extreme", "color": "#7f1d1d"}
  ]
}
```

**CBRN minimum-severity override:**
```json
{
  "type": "scale",
  "min_level": 4,
  "levels": [
    {"value": "severe", "label": "Severe", "color": "#f97316"},
    {"value": "critical", "label": "Critical", "color": "#dc2626"}
  ]
}
```

### 4.4 Incidents Table (updated)
```sql
CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES categories(id),
    
    -- Location
    title VARCHAR(255) NOT NULL,
    description TEXT,
    geom GEOGRAPHY(POINT, 4326) NOT NULL,
    location_name VARCHAR(255),
    
    -- Classification
    severity VARCHAR(20) NOT NULL,          -- Must match a value in category.severity_schema
    status VARCHAR(20) DEFAULT 'active',    -- active, resolved, verified, disputed
    
    -- Casualties & impact (nullable, category-dependent)
    confirmed_dead INT,
    confirmed_injured INT,
    estimated_affected INT,
    property_damage_usd BIGINT,
    
    -- Timeline
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,                   -- NULL if ongoing
    
    -- Source & verification
    source_url TEXT,
    source_name VARCHAR(100),
    verified_by VARCHAR(100),
    
    -- Meta
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.5 Indexing
```sql
-- Fast spatial queries
CREATE INDEX idx_incidents_geom ON incidents USING GIST(geom);

-- Fast category + severity filtering
CREATE INDEX idx_incidents_category_severity ON incidents(category_id, severity);

-- Fast date range queries
CREATE INDEX idx_incidents_start_date ON incidents(start_date);

-- Full-text search
CREATE INDEX idx_incidents_search ON incidents USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
```

---

## 5. Superadmin Panel Operations

The schema supports the following superadmin operations without code changes:

| Operation | Supported |
|---|---|
| Add new domain | ✅ Insert into `domains` |
| Edit domain name/color/icon | ✅ Update `domains` row |
| Disable domain (hide from UI) | ✅ Set `is_active = false` |
| Reorder domains | ✅ Update `sort_order` |
| Add new category | ✅ Insert into `categories` |
| Edit category severity schema | ✅ Update `severity_schema` JSONB |
| Move category to different domain | ✅ Update `domain_id` |
| Disable category | ✅ Set `is_active = false` |
| Change category default severity | ✅ Update `default_severity` |
| Reorder categories within domain | ✅ Update `sort_order` |

**Note:** Disabling a domain or category does not delete historical incidents. Old incidents retain their `category_id` reference and continue to display with their original classification.

---

## 6. Open Questions (Resolved)

| # | Question | Decision |
|---|---|---|
| 1 | Should Military Posture incidents have an `end_date`? | **Yes.** All incidents are treated the same — they have `start_date`, `end_date`, and are handled exactly like current incidents. |
| 2 | Should MOU and Weapon Acquisition have `requires_location = false`? | **No.** Admin will place a marker on the map at an appropriate location. Treated exactly as standard incidents. |
| 3 | Do we need a `sub_category` or `tags` field? | **Not for now.** Will be added later if needed. |
| 4 | Should CBRN always auto-alert? | **No.** |
| 5 | Should Transport & Aviation merge into Infrastructure? | **No.** Leave as separate domain. |
| 6 | Should Intelligence findings be a separate domain? | **Yes.** New **🔍 Intelligence** domain added with 10 categories. |

---

## 7. Changelog (from original draft)

| Change | Detail |
|---|---|
| **Split Terrorism** | Terrorist acts (💣) and counter-terror ops (🎯) are now separate domains with distinct colors |
| **Added Environmental** | New domain: Oil spill, chemical leak, deforestation, etc. |
| **Added CBRN & WMD** | New domain: Chemical, biological, radiological, nuclear incidents |
| **Added Transport & Aviation** | New domain: Civilian aviation, rail, and road accidents |
| **Merged Famine** | Removed from Natural Hazard; merged into Humanitarian as "Food Security Crisis" |
| **Moved Epidemic** | Removed from Natural Hazard; kept in Health Emergency only |
| **Moved Political Assassination** | From Political to Conflict (state actor) |
| **Moved Coastal Erosion** | From Maritime to Environmental |
| **Merged Religious Violence** | Into Sectarian Riot (Civil Unrest) |
| **Removed** | Price Control, Vaccine Campaign |
| **Renamed** | "Fire" → "Industrial / Structural Fire", "Search Operation" → "Search & Rescue Operation", "Refugee" → "Refugee / IDP Influx", "Plane Shot down" → "Aircraft Downing" |
| **Added** | Recruitment Network (to Terrorism), Oil Spill (to Maritime + Environmental), Port Closure / Congestion, Naval Engagement, Telecom Outage, Transport Accidents, Child Protection categories |

---

*Review this document and mark any changes you want. Once finalized, I will generate the seed SQL and update the frontend components.*
