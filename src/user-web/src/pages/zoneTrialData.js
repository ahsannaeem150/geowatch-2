/**
 * Mock polygon zone data for user-web UI trials.
 * This data mimics the shape returned by mapIncidentForShared().
 */

const start = new Date();
start.setHours(start.getHours() - 4);

const end = new Date(start);
end.setDate(end.getDate() + 3);

// A NOTAM-style polygon over Karachi airspace
export const MOCK_ZONE = {
  id: 'zone-trial-001',
  title: 'NOTAM: Karachi Airspace Restricted',
  description:
    'Temporary flight restriction zone is in effect around Jinnah International Airport due to a VIP movement and heightened security posture. All general aviation and drone operations within the defined polygon are prohibited until the end date unless explicitly authorized by CAA Pakistan.',
  status: 'active',
  severity: 4,
  verification: 'verified',
  startDate: start.toISOString(),
  endDate: end.toISOString(),
  locationContext: 'Karachi, Sindh · Jinnah International Airport vicinity',
  heroImageUrl: '',
  geometryType: 'polygon',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [67.005, 24.82],
        [67.095, 24.82],
        [67.12, 24.875],
        [67.085, 24.92],
        [67.03, 24.935],
        [66.98, 24.895],
        [66.965, 24.85],
        [67.005, 24.82],
      ],
    ],
  },
  areaSqM: 48_650_000,
  perimeterM: 31_400,
  zoneCategoryName: 'NOTAM',
  zoneCategoryColor: '#6366f1',
  zoneCategoryIcon: 'plane',
};

// A curfew-style zone with no defined end time
export const MOCK_ZONE_NO_END = {
  id: 'zone-trial-002',
  title: 'Curfew: Kathmandu Ring Road Area',
  description:
    'A district administration curfew order is in effect within the Kathmandu Metropolitan City Ring Road area. Movement, gathering, protest, assembly, and meeting restrictions apply until further notice.',
  status: 'active',
  severity: 3,
  verification: 'verified',
  startDate: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  endDate: null,
  locationContext: 'Kathmandu, Bagmati · Ring Road area',
  heroImageUrl: '',
  geometryType: 'polygon',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [85.28, 27.66],
        [85.35, 27.66],
        [85.38, 27.70],
        [85.36, 27.74],
        [85.30, 27.75],
        [85.24, 27.72],
        [85.23, 27.68],
        [85.28, 27.66],
      ],
    ],
  },
  areaSqM: 92_100_000,
  perimeterM: 48_200,
  zoneCategoryName: 'Curfew',
  zoneCategoryColor: '#7c3aed',
  zoneCategoryIcon: 'lock',
};

function buildSource(type, overrides = {}) {
  const base = {
    id: `${type}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    timestamp: start.toISOString(),
  };

  if (type === 'official') {
    return {
      ...base,
      title: overrides.title || 'Official NOTAM A1234/25',
      publisher: overrides.publisher || 'CAA Pakistan',
      url: overrides.url || 'https://example.com/notam-a1234',
      description: overrides.description || 'Temporary flight restriction issued for Karachi airspace.',
    };
  }

  if (type === 'news_article') {
    return {
      ...base,
      title: overrides.title || 'CAA issues NOTAM for Karachi airspace',
      publisher: overrides.publisher || 'Dawn News',
      url: overrides.url || 'https://example.com/dawn-notam',
      description: overrides.description || 'Officials confirmed the restriction will remain in place through the weekend.',
    };
  }

  if (type === 'x_post') {
    return {
      ...base,
      author: overrides.author || 'CAA Pakistan',
      handle: overrides.handle || '@PakistanCAA',
      text: overrides.text || 'NOTAM A1234/25 extended by 24 hours. Pilots are advised to review coordinates before filing flight plans.',
      tweetUrl: overrides.tweetUrl || 'https://x.com/jack/status/20',
      avatarUrl: overrides.avatarUrl,
    };
  }

  if (type === 'admin_note') {
    return {
      ...base,
      author: overrides.author || 'Admin',
      text: overrides.text || 'Restriction verified through direct coordination with airport operations.',
    };
  }

  if (type === 'media') {
    return {
      ...base,
      url: overrides.url || 'https://images.unsplash.com/photo-1500320821405-8fc1732209ca?w=800&q=80',
      thumbnailUrl: overrides.thumbnailUrl || 'https://images.unsplash.com/photo-1500320821405-8fc1732209ca?w=400&q=60',
      caption: overrides.caption || 'Aerial view of the restricted zone',
      fileType: overrides.fileType || 'image',
    };
  }

  return base;
}

export const MOCK_TIMELINE = [
  {
    id: 'initial',
    summary: 'Initial NOTAM issued',
    details:
      'Pakistan Civil Aviation Authority published NOTAM A1234/25, establishing a temporary restricted area with effect from the reported start time.',
    type: 'initial',
    verificationStatus: 'verified',
    updateDate: start.toISOString(),
    createdByName: 'CAA Pakistan',
    sources: [
      buildSource('official', {
        title: 'NOTAM A1234/25',
        publisher: 'CAA Pakistan',
        description: 'Temporary flight restriction for Karachi FIR.',
      }),
      buildSource('news_article', {
        title: 'CAA issues NOTAM for Karachi airspace',
        publisher: 'Dawn News',
      }),
      buildSource('x_post', {
        author: 'CAA Pakistan',
        handle: '@PakistanCAA',
        text: 'NOTAM A1234/25 is now active for Karachi FIR. Pilots should review the full coordinates before filing.',
        tweetUrl: 'https://x.com/War_Analysts/status/2068052573756559571',
      }),
      buildSource('media', {
        url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&q=60',
        caption: 'Aircraft on approach to Karachi',
      }),
      buildSource('admin_note', {
        author: 'Ops Desk',
        text: 'Restriction verified through direct coordination with airport operations.',
      }),
    ],
  },
  {
    id: 'update-1',
    summary: 'Restriction extended by 24 hours',
    details:
      'The original window was extended due to continued operational requirements. Pilots are advised to re-check NOTAM details before flight planning.',
    type: 'update',
    verificationStatus: 'verified',
    updateDate: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
    createdByName: 'Admin',
    sources: [
      buildSource('official', {
        title: 'Amended NOTAM A1234/25',
        publisher: 'CAA Pakistan',
        description: 'Effective window extended through 19 June 2026.',
      }),
      buildSource('x_post', {
        author: 'CAA Pakistan',
        handle: '@PakistanCAA',
        text: 'NOTAM A1234/25 extended by 24 hours. Pilots are advised to review coordinates before filing flight plans.',
        tweetUrl: 'https://x.com/War_Analysts/status/2068052573756559571',
      }),
      buildSource('admin_note', {
        author: 'Ops Desk',
        text: 'Extension confirmed via AIS hotline at 11:30 local.',
      }),
      buildSource('media', {
        url: 'https://images.unsplash.com/photo-1500320821405-8fc1732209ca?w=1200&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1500320821405-8fc1732209ca?w=400&q=60',
        caption: 'Aerial view of the restricted zone',
      }),
    ],
  },
  {
    id: 'update-2',
    summary: 'Media monitoring added',
    details:
      'Local news outlets reported increased security presence around the airport perimeter.',
    type: 'update',
    verificationStatus: 'unverified',
    updateDate: new Date(start.getTime() + 3 * 60 * 60 * 1000).toISOString(),
    createdByName: 'Monitoring Team',
    sources: [
      buildSource('news_article', {
        title: 'Security tightened near Jinnah Terminal',
        publisher: 'Geo News',
      }),
      buildSource('media', {
        url: 'https://images.unsplash.com/photo-1590073242678-cfea53343f1e?w=1200&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1590073242678-cfea53343f1e?w=400&q=60',
        caption: 'Security checkpoint near airport approach',
      }),
    ],
  },
];

export const MOCK_TIMELINE_NO_END = [
  {
    id: 'curfew-initial',
    summary: 'Curfew order issued',
    details:
      'District Administration Office, Kathmandu announced a curfew order restricting movement, gathering, protest, assembly, and meetings within the Ring Road area.',
    type: 'initial',
    verificationStatus: 'verified',
    updateDate: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    createdByName: 'District Administration Office',
    sources: [
      buildSource('official', {
        title: 'Curfew Order 09/2025',
        publisher: 'District Administration Office, Kathmandu',
        description: 'Movement restrictions within Kathmandu Ring Road area.',
      }),
      buildSource('news_article', {
        title: 'Curfew imposed in Kathmandu valley',
        publisher: 'The Kathmandu Post',
      }),
    ],
  },
  {
    id: 'curfew-update-1',
    summary: 'Curfew extended until further notice',
    details:
      'Officials announced the curfew will remain in effect until the situation normalizes. Residents are advised to follow local media for updates.',
    type: 'update',
    verificationStatus: 'verified',
    updateDate: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    createdByName: 'Admin',
    sources: [
      buildSource('official', {
        title: 'Curfew Extension Notice',
        publisher: 'District Administration Office, Kathmandu',
        description: 'Curfew remains in effect until further notice.',
      }),
      buildSource('x_post', {
        author: 'Nepal Police',
        handle: '@NepalPoliceHQ',
        text: 'Curfew in Kathmandu Ring Road area remains in effect. Please cooperate with security personnel.',
      }),
      buildSource('media', {
        caption: 'Security personnel at a checkpoint in Kathmandu',
      }),
    ],
  },
];
