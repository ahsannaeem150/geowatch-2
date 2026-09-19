import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock,
  Crosshair,
  FileText,
  Filter,
  MapPin,
  RotateCcw,
  Search,
  Shield,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react-native';
import { isValid, parseISO } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import { useMap } from '../../context/MapContext';
import { useSelection } from '../../context/SelectionContext';
import { useAuth } from '../../context/AuthContext';
import {
  searchIncidents,
  searchZones,
} from '../../services/incidents.service';
import {
  listCategories,
  listZoneCategories,
} from '../../services/taxonomy.service';
import {
  DOMAINS,
  SEVERITIES,
  VERIFICATION_STATUSES,
  ZONE_OVERLAYS,
} from '../../constants';
import { DirCard } from './DirectoryScreen';

// Power Search fullscreen (prototype #ps-screen; openPowerSearch/
// closePowerSearch/togglePsFilters/toggleAcc/toggleStrip/collapseStrip/
// toggleMulti/renderPsFiltersStatic/togglePsfSev/togglePsfCheck/
// countActiveFilters/renderAppliedTags/psClearTag/resetPsFilters/
// renderPsResults).
//
// The fullscreen container is transparent (meta.transparent in
// Placeholders.jsx) so the map shows through the middle; the top controls
// and the bottom results strip float over it, matching the prototype.
//
// Backend mapping (GET /api/v1/incidents/search):
//   type → which call runs (point → searchIncidents, polygon → searchZones)
//   dates → dateFrom/dateTo (all-time bounds when unset — the backend
//           defaults to "visible today" when dates are absent)
//   severity → severities, status → statuses, verification →
//   verificationStatuses, source type → sourceTypes (incidents only — zones
//   carry no source rows), domains → domainSlugs (incidents only), zone
//   categories → zoneCategoryIds (zones only), saved only → savedOnly=true.

const ALL_TIME = { dateFrom: '1970-01-01', dateTo: '2099-12-31' };

const SOURCE_TYPES = [
  { key: 'x_post', label: 'X Post', pill: '𝕏 X Posts' },
  { key: 'news_article', label: 'News', pill: '📰 News' },
  { key: 'image', label: 'Image', pill: '📷 Images' },
  { key: 'video', label: 'Video', pill: '🎬 Videos' },
];

const VERIF_META = {
  unverified: { label: 'Unverified', colorKey: 'textMuted' },
  verified: { label: 'Verified', colorKey: 'success' },
  disputed: { label: 'Disputed', colorKey: 'sev2' },
  debunked: { label: 'Debunked', colorKey: 'sev4' },
};

// resetPsFilters() defaults: type Point + status Active on, everything
// else off/cleared.
const DEFAULTS = {
  typeSel: { point: true, polygon: false },
  statusSel: { active: true, resolved: false },
};

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
function validDate(s) {
  return ISO_RE.test(s) && isValid(parseISO(s)) ? s : null;
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function onKeys(obj) {
  return Object.keys(obj).filter((k) => obj[k]);
}

// Dynamic on/off checkbox colors, hoisted out of JSX (no-inline-styles).
function checkboxState(theme, on) {
  return {
    borderColor: on ? theme.accentLight : theme.borderSubtle,
    backgroundColor: on ? theme.accentLight : 'transparent',
  };
}

function pillState(theme, on) {
  return {
    borderColor: on ? theme.accentLight : theme.borderSubtle,
    backgroundColor: on ? theme.accentSubtleBg : theme.bgElevated,
  };
}

export function PowerSearchBody({ overlay }) {
  const { theme } = useTheme();
  const { closeOverlay, showToast } = useOverlay();
  const { selectedId } = useMap();
  const { previewItemOnMap } = useSelection();
  const { signedIn, requireSignIn } = useAuth();

  const [q, setQ] = useState(overlay.props?.initialQ || '');
  const [qDebounced, setQDebounced] = useState(overlay.props?.initialQ || '');
  const [typeSel, setTypeSel] = useState(DEFAULTS.typeSel);
  const [statusSel, setStatusSel] = useState(DEFAULTS.statusSel);
  const [verifSel, setVerifSel] = useState({});
  const [sourceSel, setSourceSel] = useState({});
  const [sevSel, setSevSel] = useState({});
  const [domainSel, setDomainSel] = useState(() => new Set());
  const [zonecatSel, setZonecatSel] = useState(() => new Set());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [stripOpen, setStripOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(
    () => new Set(['domains', 'zonecats', 'source']),
  );
  const [incResults, setIncResults] = useState([]);
  const [zoneResults, setZoneResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fetchSeq = useRef(0);

  // Taxonomy: real domain list (17) + zone categories with ids; constants
  // are the offline fallback.
  const [domains, setDomains] = useState(null);
  const [zonecats, setZonecats] = useState(null);
  useEffect(() => {
    let cancelled = false;
    listCategories()
      .then((data) => {
        if (cancelled) return;
        const seen = new Map();
        (data?.categories || []).forEach((c) => {
          if (c.domain_slug && !seen.has(c.domain_slug)) {
            seen.set(c.domain_slug, {
              slug: c.domain_slug,
              name: c.domain_name,
            });
          }
        });
        if (seen.size) setDomains([...seen.values()]);
      })
      .catch(() => {});
    listZoneCategories()
      .then((data) => {
        if (cancelled) return;
        const cats = (data?.categories || []).map((c) => ({
          id: c.id,
          name: c.name,
        }));
        if (cats.length) setZonecats(cats);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const domainRows =
    domains || DOMAINS.map((d) => ({ slug: d.slug, name: d.name }));
  const zonecatRows =
    zonecats || ZONE_OVERLAYS.map((z) => ({ id: null, name: z.name }));

  // 300ms debounced search text.
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const fetchResults = useCallback(() => {
    const seq = ++fetchSeq.current;
    // Both type toggles off = no type filter (prototype groupVals empty).
    const wantPoints = typeSel.point || (!typeSel.point && !typeSel.polygon);
    const wantZones = typeSel.polygon || (!typeSel.point && !typeSel.polygon);
    const sevs = onKeys(sevSel);
    const stats = onKeys(statusSel);
    const verifs = onKeys(verifSel);
    const srcs = onKeys(sourceSel);
    setLoading(true);
    setError(false);
    const base = {
      dateFrom: validDate(dateFrom) || ALL_TIME.dateFrom,
      dateTo: validDate(dateTo) || ALL_TIME.dateTo,
      limit: 100,
      ...(qDebounced ? { q: qDebounced } : {}),
      ...(sevs.length ? { severities: sevs.join(',') } : {}),
      ...(stats.length ? { statuses: stats.join(',') } : {}),
      ...(savedOnly ? { savedOnly: 'true' } : {}),
    };
    const calls = [];
    if (wantPoints) {
      calls.push(
        searchIncidents({
          ...base,
          ...(verifs.length ? { verificationStatuses: verifs.join(',') } : {}),
          // Source types live on incident_sources rows — incidents only.
          ...(srcs.length ? { sourceTypes: srcs.join(',') } : {}),
          ...(domainSel.size ? { domainSlugs: [...domainSel].join(',') } : {}),
        }),
      );
    } else {
      calls.push(Promise.resolve(null));
    }
    if (wantZones) {
      const zparams = { ...base };
      if (zonecatSel.size && zonecats) {
        // Fetched taxonomy: server-side filter by id. Constant fallback has
        // no ids — those selections filter client-side below.
        const ids = zonecats
          .filter((c) => zonecatSel.has(c.name))
          .map((c) => c.id)
          .filter(Boolean);
        if (ids.length) {
          zparams.zoneCategoryIds = ids.join(',');
        }
      }
      calls.push(searchZones(zparams));
    } else {
      calls.push(Promise.resolve(null));
    }
    Promise.all(calls)
      .then(([incRes, zoneRes]) => {
        if (seq !== fetchSeq.current) return;
        setIncResults(incRes?.incidents || []);
        setZoneResults(zoneRes?.incidents || []);
      })
      .catch(() => {
        if (seq !== fetchSeq.current) return;
        setError(true);
        showToast('Search failed — check the backend');
      })
      .finally(() => {
        if (seq === fetchSeq.current) setLoading(false);
      });
  }, [
    qDebounced,
    typeSel,
    statusSel,
    verifSel,
    sourceSel,
    sevSel,
    domainSel,
    zonecatSel,
    dateFrom,
    dateTo,
    savedOnly,
    zonecats,
    showToast,
  ]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // ─── Filter mutations (prototype toggleMulti/togglePsfSev/togglePsfCheck)
  const toggleType = (k) => setTypeSel((p) => ({ ...p, [k]: !p[k] }));
  const toggleStatus = (k) => setStatusSel((p) => ({ ...p, [k]: !p[k] }));
  const toggleVerif = (k) => setVerifSel((p) => ({ ...p, [k]: !p[k] }));
  const toggleSource = (k) => setSourceSel((p) => ({ ...p, [k]: !p[k] }));
  const toggleSev = (n) => setSevSel((p) => ({ ...p, [n]: !p[n] }));
  const toggleDomain = (slug) =>
    setDomainSel((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  const toggleZonecat = (name) =>
    setZonecatSel((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  const toggleSavedOnly = () => {
    if (!savedOnly && !requireSignIn('use saved filters')) {
      return; // signed out — sign-in sheet opened, toggle stays off
    }
    setSavedOnly((v) => !v);
  };
  const toggleAccordion = (key) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const resetFilters = useCallback(() => {
    setQ('');
    setQDebounced('');
    setTypeSel(DEFAULTS.typeSel);
    setStatusSel(DEFAULTS.statusSel);
    setVerifSel({});
    setSourceSel({});
    setSevSel({});
    setDomainSel(new Set());
    setZonecatSel(new Set());
    setDateFrom('');
    setDateTo('');
    setSavedOnly(false);
  }, []);

  // ─── Applied tags + counts (renderAppliedTags/countActiveFilters) ───
  const sevNums = onKeys(sevSel)
    .map(Number)
    .sort((a, b) => a - b);
  const tags = [];
  if (typeSel.point) {
    tags.push({ key: 'type-point', label: '● Point', clear: () => toggleType('point') });
  }
  if (typeSel.polygon) {
    tags.push({ key: 'type-poly', label: '● Polygon / Zone', clear: () => toggleType('polygon') });
  }
  onKeys(statusSel).forEach((s) =>
    tags.push({
      key: `status-${s}`,
      label: `Status: ${capitalize(s)}`,
      clear: () => toggleStatus(s),
    }),
  );
  onKeys(verifSel).forEach((v) =>
    tags.push({
      key: `verif-${v}`,
      label: VERIF_META[v]?.label || capitalize(v),
      clear: () => toggleVerif(v),
    }),
  );
  onKeys(sourceSel).forEach((s) =>
    tags.push({
      key: `src-${s}`,
      label: `Src: ${SOURCE_TYPES.find((t) => t.key === s)?.label || s}`,
      clear: () => toggleSource(s),
    }),
  );
  sevNums.forEach((n) =>
    tags.push({ key: `sev-${n}`, label: `S${n}`, clear: () => toggleSev(n) }),
  );
  [...domainSel].forEach((slug) =>
    tags.push({
      key: `dom-${slug}`,
      label: domainRows.find((d) => d.slug === slug)?.name || slug,
      clear: () => toggleDomain(slug),
    }),
  );
  [...zonecatSel].forEach((name) =>
    tags.push({
      key: `zc-${name}`,
      label: `Z: ${name}`,
      clear: () => toggleZonecat(name),
    }),
  );
  if (dateFrom || dateTo) {
    tags.push({
      key: 'date',
      label: `Date: ${dateFrom || '…'} → ${dateTo || '…'}`,
      clear: () => {
        setDateFrom('');
        setDateTo('');
      },
    });
  }
  const filterCount =
    onKeys(typeSel).length +
    onKeys(statusSel).length +
    onKeys(verifSel).length +
    onKeys(sourceSel).length +
    sevNums.length +
    domainSel.size +
    zonecatSel.size +
    (dateFrom || dateTo ? 1 : 0);

  // Client-side zone-category fallback filter (constant fallback has no ids
  // to send server-side).
  const visibleZones =
    zonecatSel.size && !zonecats
      ? zoneResults.filter((z) => zonecatSel.has(z.zone_category_name))
      : zoneResults;
  const total = incResults.length + visibleZones.length;

  const close = () => closeOverlay(overlay.id);
  const openPreview = (kind, item) =>
    previewItemOnMap(kind, item, { type: 'fullscreen' });

  return (
    <View style={styles.root}>
      {/* top controls over the map (prototype .ps-top) */}
      <View
        style={[
          styles.top,
          {
            backgroundColor: theme.bgGlass,
            borderBottomColor: theme.borderSubtle,
          },
        ]}>
        <View style={styles.headRow}>
          <Pressable
            onPress={close}
            hitSlop={6}
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: pressed ? theme.bgElevated : theme.bgHover },
            ]}>
            <ChevronLeft size={17} color={theme.textPrimary} />
          </Pressable>
          <View style={styles.headTitles}>
            <Text
              style={[
                styles.title,
                { color: theme.textPrimary, fontFamily: theme.fontHead },
              ]}>
              Power Search
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: theme.textMuted, fontFamily: theme.fontMono },
              ]}>
              EXPLORE EVERYTHING
            </Text>
          </View>
          <Pressable
            onPress={() => setFiltersOpen(true)}
            style={({ pressed }) => [
              styles.miniBtn,
              {
                borderColor: theme.borderSubtle,
                backgroundColor: pressed ? theme.bgHover : theme.bgSurface,
              },
            ]}>
            <Filter size={11} color={theme.textSecondary} />
            <Text
              style={[
                styles.miniBtnText,
                { color: theme.textSecondary, fontFamily: theme.fontMono },
              ]}>
              Filters
            </Text>
          </Pressable>
          <Pressable
            onPress={resetFilters}
            style={({ pressed }) => [
              styles.miniBtn,
              {
                borderColor: theme.borderSubtle,
                backgroundColor: pressed ? theme.bgHover : theme.bgSurface,
              },
            ]}>
            <Text
              style={[
                styles.miniBtnText,
                { color: theme.textSecondary, fontFamily: theme.fontMono },
              ]}>
              Reset
            </Text>
          </Pressable>
        </View>
        <View
          style={[
            styles.searchRow,
            { backgroundColor: theme.bgInput, borderColor: theme.borderSubtle },
          ]}>
          <Search size={15} color={theme.textMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search incidents, zones…"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={[
              styles.searchInput,
              { color: theme.textPrimary, fontFamily: theme.fontHead },
            ]}
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <X size={14} color={theme.textMuted} />
            </Pressable>
          ) : null}
        </View>
        {/* applied tags */}
        <View style={styles.tagsRow}>
          {tags.length ? (
            tags.map((t) => (
              <Pressable
                key={t.key}
                onPress={t.clear}
                style={[
                  styles.tag,
                  {
                    backgroundColor: theme.bgElevated,
                    borderColor: theme.borderSubtle,
                  },
                ]}>
                <Text
                  style={[
                    styles.tagText,
                    { color: theme.textSecondary, fontFamily: theme.fontMono },
                  ]}>
                  {t.label}
                </Text>
                <X size={10} color={theme.textMuted} />
              </Pressable>
            ))
          ) : (
            <Text
              style={[
                styles.tagsEmpty,
                { color: theme.textMuted, fontFamily: theme.fontMono },
              ]}>
              No filters applied — all results shown
            </Text>
          )}
        </View>
      </View>

      {/* transparent middle — map visible, touches swallowed (prototype
          .ps-screen covers the map without handling clicks) */}
      <Pressable style={styles.middle} onPress={() => {}} />

      {/* results strip (prototype .ps-results-strip) */}
      <View
        style={[
          styles.strip,
          {
            backgroundColor: theme.bgGlass,
            borderTopColor: theme.borderSubtle,
          },
          stripOpen && styles.stripOpen,
        ]}>
        <View style={styles.stripHead}>
          <Pressable onPress={() => setStripOpen((v) => !v)} hitSlop={6}>
            <Text
              style={[
                styles.stripCount,
                { color: theme.accentLight, fontFamily: theme.fontMono },
              ]}>
              {total} RESULTS
            </Text>
          </Pressable>
          <View style={styles.stripActions}>
            <Pressable
              onPress={() => setStripOpen((v) => !v)}
              style={({ pressed }) => [
                styles.miniBtn,
                {
                  borderColor: theme.borderSubtle,
                  backgroundColor: pressed ? theme.bgHover : theme.bgSurface,
                },
              ]}>
              <Text
                style={[
                  styles.miniBtnText,
                  { color: theme.textSecondary, fontFamily: theme.fontMono },
                ]}>
                ▾ List
              </Text>
            </Pressable>
            <Pressable
              onPress={close}
              style={({ pressed }) => [
                styles.miniBtn,
                {
                  borderColor: theme.borderSubtle,
                  backgroundColor: pressed ? theme.bgHover : theme.bgSurface,
                },
              ]}>
              <Text
                style={[
                  styles.miniBtnText,
                  { color: theme.textSecondary, fontFamily: theme.fontMono },
                ]}>
                ✕ Close
              </Text>
            </Pressable>
          </View>
        </View>
        {stripOpen ? (
          loading ? (
            <View style={styles.stripPad}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.skelRow,
                    { borderBottomColor: theme.borderSubtle },
                  ]}>
                  <View
                    style={[
                      styles.skelBar,
                      { backgroundColor: theme.bgElevated },
                    ]}
                  />
                  <View style={styles.skelCol}>
                    <View
                      style={[
                        styles.skelLine,
                        styles.skelW72,
                        { backgroundColor: theme.bgElevated },
                      ]}
                    />
                    <View
                      style={[
                        styles.skelLine,
                        styles.skelW38,
                        { backgroundColor: theme.bgElevated },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : error ? (
            <View style={styles.stateBox}>
              <Text style={[styles.stateText, { color: theme.textMuted }]}>
                Couldn’t load results.
              </Text>
              <Pressable
                onPress={fetchResults}
                style={[
                  styles.retryBtn,
                  {
                    borderColor: theme.accentSubtleBorder,
                    backgroundColor: theme.accentSubtleBg,
                  },
                ]}>
                <Text
                  style={[
                    styles.retryText,
                    { color: theme.accentLight, fontFamily: theme.fontMono },
                  ]}>
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              style={styles.stripList}
              contentContainerStyle={styles.stripPad}
              keyboardShouldPersistTaps="handled">
              {total === 0 ? (
                <View style={styles.stateBox}>
                  <Text style={[styles.stateText, { color: theme.textMuted }]}>
                    No results match your filters.
                  </Text>
                  <Pressable onPress={resetFilters} hitSlop={6}>
                    <Text
                      style={[
                        styles.resetLink,
                        { color: theme.accentLight },
                      ]}>
                      Reset all filters
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {incResults.length ? (
                    <>
                      <Text
                        style={[
                          styles.secLabel,
                          {
                            color: theme.textMuted,
                            fontFamily: theme.fontMono,
                          },
                        ]}>
                        Incidents ({incResults.length})
                      </Text>
                      {incResults.map((item) => (
                        <DirCard
                          key={item.id}
                          kind="incident"
                          item={item}
                          highlighted={selectedId === item.id}
                          onPress={() => openPreview('incident', item)}
                        />
                      ))}
                    </>
                  ) : null}
                  {visibleZones.length ? (
                    <>
                      <Text
                        style={[
                          styles.secLabel,
                          {
                            color: theme.textMuted,
                            fontFamily: theme.fontMono,
                          },
                        ]}>
                        Zones ({visibleZones.length})
                      </Text>
                      {visibleZones.map((item) => (
                        <DirCard
                          key={item.id}
                          kind="zone"
                          item={item}
                          highlighted={selectedId === item.id}
                          onPress={() => openPreview('zone', item)}
                        />
                      ))}
                    </>
                  ) : null}
                </>
              )}
            </ScrollView>
          )
        ) : null}
      </View>

      {/* filters drawer (prototype .ps-filters) */}
      {filtersOpen ? (
        <PsFilterDrawer
          theme={theme}
          filterCount={filterCount}
          collapsed={collapsed}
          toggleAccordion={toggleAccordion}
          typeSel={typeSel}
          toggleType={toggleType}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          domains={domainRows}
          domainSel={domainSel}
          toggleDomain={toggleDomain}
          zonecats={zonecatRows}
          zonecatSel={zonecatSel}
          toggleZonecat={toggleZonecat}
          sevSel={sevSel}
          toggleSev={toggleSev}
          statusSel={statusSel}
          toggleStatus={toggleStatus}
          verifSel={verifSel}
          toggleVerif={toggleVerif}
          sourceSel={sourceSel}
          toggleSource={toggleSource}
          savedOnly={savedOnly}
          toggleSavedOnly={toggleSavedOnly}
          signedIn={signedIn}
          resetFilters={resetFilters}
          close={() => setFiltersOpen(false)}
        />
      ) : null}
    </View>
  );
}

// ─── Filters drawer (prototype .ps-filters + .psf-acc accordion) ───
function PsFilterDrawer(props) {
  const { theme, close, filterCount } = props;
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(slide, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [slide]);
  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [-340, 0],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={styles.drawerBackdrop} onPress={close} />
      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: theme.bgSurface,
            borderRightColor: theme.borderSubtle,
            transform: [{ translateX }],
          },
        ]}>
        <View
          style={[styles.drawerHead, { borderBottomColor: theme.borderSubtle }]}>
          <Text
            style={[
              styles.drawerTitle,
              { color: theme.textPrimary, fontFamily: theme.fontHead },
            ]}>
            Filters
          </Text>
          {filterCount ? (
            <View
              style={[
                styles.drawerBadge,
                { backgroundColor: theme.accentLight },
              ]}>
              <Text
                style={[
                  styles.drawerBadgeText,
                  { color: theme.bgDeep, fontFamily: theme.fontMono },
                ]}>
                {filterCount}
              </Text>
            </View>
          ) : null}
          <View style={styles.flex1} />
          <Pressable onPress={close} hitSlop={8} style={styles.drawerClose}>
            <X size={15} color={theme.textSecondary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.drawerBody}>
          <PsAccordion
            id="type"
            title="Type"
            icon={MapPin}
            badge={0}
            {...props}>
            <View style={styles.optRowWrap}>
              {[
                { key: 'point', label: '◉ Point' },
                { key: 'polygon', label: '⬡ Polygon / Zone' },
              ].map((o) => {
                const on = !!props.typeSel[o.key];
                return (
                  <Pressable
                    key={o.key}
                    onPress={() => props.toggleType(o.key)}
                    style={[styles.optBtn, pillState(theme, on)]}>
                    <Text
                      style={[
                        styles.optBtnText,
                        { fontFamily: theme.fontMono },
                        { color: on ? theme.accentLight : theme.textSecondary },
                      ]}>
                      {o.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </PsAccordion>

          <PsAccordion
            id="date"
            title="Date Range"
            icon={Calendar}
            badge={0}
            {...props}>
            <View style={styles.dateRow}>
              <TextInput
                value={props.dateFrom}
                onChangeText={props.setDateFrom}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: theme.bgInput,
                    borderColor: theme.borderSubtle,
                    color: theme.textPrimary,
                    fontFamily: theme.fontMono,
                  },
                ]}
              />
              <Text style={[styles.dateArrow, { color: theme.textMuted }]}>
                →
              </Text>
              <TextInput
                value={props.dateTo}
                onChangeText={props.setDateTo}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: theme.bgInput,
                    borderColor: theme.borderSubtle,
                    color: theme.textPrimary,
                    fontFamily: theme.fontMono,
                  },
                ]}
              />
            </View>
          </PsAccordion>

          <PsAccordion
            id="domains"
            title="Domains & Categories"
            icon={Shield}
            badge={props.domainSel.size}
            {...props}>
            {props.domains.map((d) => {
              const on = props.domainSel.has(d.slug);
              return (
                <PsCheckRow
                  key={d.slug}
                  on={on}
                  label={d.name}
                  theme={theme}
                  onPress={() => props.toggleDomain(d.slug)}
                />
              );
            })}
          </PsAccordion>

          <PsAccordion
            id="zonecats"
            title="Zone Categories"
            icon={Crosshair}
            badge={props.zonecatSel.size}
            {...props}>
            {props.zonecats.map((z) => {
              const on = props.zonecatSel.has(z.name);
              return (
                <PsCheckRow
                  key={z.name}
                  on={on}
                  label={z.name}
                  theme={theme}
                  onPress={() => props.toggleZonecat(z.name)}
                />
              );
            })}
          </PsAccordion>

          <Text
            style={[
              styles.secDivider,
              { color: theme.textMuted, fontFamily: theme.fontMono },
            ]}>
            STATE
          </Text>

          <PsAccordion
            id="severity"
            title="Severity"
            icon={Star}
            badge={onKeys(props.sevSel).length}
            {...props}>
            {SEVERITIES.map((s) => {
              const on = !!props.sevSel[s.n];
              const color = theme[`sev${s.n}`];
              return (
                <Pressable
                  key={s.n}
                  onPress={() => props.toggleSev(s.n)}
                  style={({ pressed }) => [
                    styles.sevRow,
                    { backgroundColor: pressed ? theme.bgHover : 'transparent' },
                  ]}>
                  <View style={[styles.checkbox, checkboxState(theme, on)]}>
                    {on ? <Check size={11} color={theme.bgDeep} /> : null}
                  </View>
                  <View
                    style={[styles.sevNum, { backgroundColor: `${color}22` }]}>
                    <Text
                      style={[
                        styles.sevNumText,
                        { color, fontFamily: theme.fontMono },
                      ]}>
                      {s.n}
                    </Text>
                  </View>
                  <Text style={[styles.optLabel, { color: theme.textPrimary }]}>
                    {s.n} {s.name}
                  </Text>
                </Pressable>
              );
            })}
          </PsAccordion>

          <PsAccordion
            id="status"
            title="Status"
            icon={Clock}
            badge={onKeys(props.statusSel).length}
            {...props}>
            <View style={styles.optRowWrap}>
              {[
                { key: 'active', label: '● Active' },
                { key: 'resolved', label: '○ Resolved' },
              ].map((o) => {
                const on = !!props.statusSel[o.key];
                return (
                  <Pressable
                    key={o.key}
                    onPress={() => props.toggleStatus(o.key)}
                    style={[styles.optBtn, pillState(theme, on)]}>
                    <Text
                      style={[
                        styles.optBtnText,
                        { fontFamily: theme.fontMono },
                        { color: on ? theme.accentLight : theme.textSecondary },
                      ]}>
                      {o.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </PsAccordion>

          <PsAccordion
            id="verif"
            title="Verification"
            icon={CheckCircle2}
            badge={onKeys(props.verifSel).length}
            {...props}>
            <View style={styles.optRowWrap}>
              {VERIFICATION_STATUSES.map((v) => {
                const on = !!props.verifSel[v];
                const dotColor = theme[VERIF_META[v].colorKey];
                return (
                  <Pressable
                    key={v}
                    onPress={() => props.toggleVerif(v)}
                    style={[styles.optBtn, pillState(theme, on)]}>
                    <View
                      style={[styles.optDot, { backgroundColor: dotColor }]}
                    />
                    <Text
                      style={[
                        styles.optBtnText,
                        { fontFamily: theme.fontMono },
                        { color: on ? theme.accentLight : theme.textSecondary },
                      ]}>
                      {VERIF_META[v].label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </PsAccordion>

          <PsAccordion
            id="source"
            title="Source Type"
            icon={FileText}
            badge={onKeys(props.sourceSel).length}
            {...props}>
            <View style={styles.optRowWrap}>
              {SOURCE_TYPES.map((s) => {
                const on = !!props.sourceSel[s.key];
                return (
                  <Pressable
                    key={s.key}
                    onPress={() => props.toggleSource(s.key)}
                    style={[styles.optBtn, pillState(theme, on)]}>
                    <Text
                      style={[
                        styles.optBtnText,
                        { fontFamily: theme.fontMono },
                        { color: on ? theme.accentLight : theme.textSecondary },
                      ]}>
                      {s.pill}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </PsAccordion>

          <PsAccordion
            id="options"
            title="Options"
            icon={SlidersHorizontal}
            badge={0}
            {...props}>
            <Pressable onPress={props.toggleSavedOnly} style={styles.toggleRow}>
              <Text
                style={[styles.toggleLabel, { color: theme.textPrimary }]}>
                Saved only
              </Text>
              <View
                style={[
                  styles.toggle,
                  {
                    backgroundColor: props.savedOnly
                      ? theme.accentLight
                      : theme.bgElevated,
                    borderColor: theme.borderSubtle,
                  },
                ]}>
                <View
                  style={[
                    styles.toggleKnob,
                    { backgroundColor: theme.bgDeep },
                    props.savedOnly && styles.toggleKnobOn,
                  ]}
                />
              </View>
            </Pressable>
            {props.signedIn ? null : (
              <Text
                style={[
                  styles.toggleNote,
                  { color: theme.textMuted, fontFamily: theme.fontMono },
                ]}>
                Sign in to use saved filters.
              </Text>
            )}
          </PsAccordion>

          <Pressable
            onPress={props.resetFilters}
            style={({ pressed }) => [
              styles.resetAll,
              {
                borderColor: theme.borderSubtle,
                backgroundColor: pressed ? theme.bgHover : 'transparent',
              },
            ]}>
            <RotateCcw size={12} color={theme.textSecondary} />
            <Text
              style={[
                styles.resetAllText,
                { color: theme.textSecondary, fontFamily: theme.fontMono },
              ]}>
              Reset all filters
            </Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function PsAccordion({
  id,
  title,
  icon: Icon,
  badge,
  collapsed,
  toggleAccordion,
  children,
}) {
  const { theme } = useTheme();
  const open = !collapsed.has(id);
  return (
    <View style={[styles.acc, { borderBottomColor: theme.borderSubtle }]}>
      <Pressable onPress={() => toggleAccordion(id)} style={styles.accHead}>
        <Icon size={14} color={theme.textSecondary} />
        <Text
          style={[
            styles.accTitle,
            { color: theme.textSecondary, fontFamily: theme.fontMono },
          ]}>
          {title}
        </Text>
        {badge ? (
          <View
            style={[
              styles.accBadge,
              {
                backgroundColor: theme.accentSubtleBg,
                borderColor: theme.accentSubtleBorder,
              },
            ]}>
            <Text
              style={[
                styles.accBadgeText,
                { color: theme.accentLight, fontFamily: theme.fontMono },
              ]}>
              {badge}
            </Text>
          </View>
        ) : null}
        <ChevronDown
          size={13}
          color={theme.textMuted}
          style={open ? undefined : styles.accChevClosed}
        />
      </Pressable>
      {open ? <View style={styles.accBody}>{children}</View> : null}
    </View>
  );
}

function PsCheckRow({ on, label, theme, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.checkRow,
        { backgroundColor: pressed ? theme.bgHover : 'transparent' },
      ]}>
      <View style={[styles.checkbox, checkboxState(theme, on)]}>
        {on ? <Check size={11} color={theme.bgDeep} /> : null}
      </View>
      <Text style={[styles.optLabel, { color: theme.textPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headTitles: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', letterSpacing: -0.1 },
  subtitle: { fontSize: 9.5, letterSpacing: 0.8, marginTop: 1 },
  miniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 7,
    borderWidth: 1,
  },
  miniBtnText: { fontSize: 9, letterSpacing: 0.4 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 13,
    marginBottom: 9,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    minHeight: 24,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: { fontSize: 9.5, letterSpacing: 0.4 },
  tagsEmpty: { fontSize: 9.5, letterSpacing: 0.4 },
  middle: { flex: 1 },
  strip: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    // Prototype bottom:76px — the strip floats above the tab bar.
    marginBottom: 62,
  },
  stripOpen: { maxHeight: '42%' },
  stripHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stripCount: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.6 },
  stripActions: { flexDirection: 'row', gap: 8 },
  stripList: { flexShrink: 1 },
  stripPad: { paddingBottom: 12 },
  secLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  stateBox: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    gap: 12,
  },
  stateText: { fontSize: 12, textAlign: 'center' },
  resetLink: { fontSize: 12 },
  retryBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: { fontSize: 10.5, letterSpacing: 0.4 },
  skelRow: {
    flexDirection: 'row',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  skelBar: { width: 3, borderRadius: 2 },
  skelCol: { flex: 1, gap: 8 },
  skelLine: { height: 10, borderRadius: 4 },
  skelW72: { width: '72%' },
  skelW38: { width: '38%' },
  drawerBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,.4)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '80%',
    borderRightWidth: 1,
  },
  drawerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  drawerTitle: { fontSize: 15, fontWeight: '600' },
  drawerBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerBadgeText: { fontSize: 10, fontWeight: '600' },
  flex1: { flex: 1 },
  drawerClose: { padding: 4 },
  drawerBody: { paddingBottom: 30 },
  acc: { borderBottomWidth: StyleSheet.hairlineWidth },
  accHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  accTitle: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  accBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  accBadgeText: { fontSize: 9, fontWeight: '600' },
  accChevClosed: { transform: [{ rotate: '-90deg' }] },
  accBody: { paddingBottom: 10, paddingHorizontal: 15 },
  optRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  optBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  optBtnText: { fontSize: 10.5 },
  optDot: { width: 6, height: 6, borderRadius: 3 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 },
  dateInput: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 11,
  },
  dateArrow: { fontSize: 12 },
  secDivider: {
    fontSize: 9,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 4,
  },
  sevRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 7,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sevNum: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sevNumText: { fontSize: 10.5, fontWeight: '700' },
  optLabel: { fontSize: 12.5 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 7,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  toggleLabel: { fontSize: 12.5 },
  toggle: {
    width: 34,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleKnob: { width: 14, height: 14, borderRadius: 7 },
  toggleKnobOn: { alignSelf: 'flex-end' },
  toggleNote: { fontSize: 10.5, marginTop: 2 },
  resetAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 9,
    marginHorizontal: 15,
    marginTop: 14,
    paddingVertical: 11,
  },
  resetAllText: { fontSize: 10.5, letterSpacing: 0.4 },
});

export default PowerSearchBody;
