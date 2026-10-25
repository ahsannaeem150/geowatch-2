import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import DetentSheet from '../sheets/DetentSheet';
import HandoffScrollView from './HandoffScrollView';
import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Crosshair,
  FileText,
  MapPin,
  RotateCcw,
  Search,
  Shield,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react-native';
import { format, isValid, parseISO } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import { useMap } from '../../context/MapContext';
import { useSelection } from '../../context/SelectionContext';
import { useAuth } from '../../context/AuthContext';
import useSheetGesture from '../../hooks/useSheetGesture';
import useScrollEdge from '../../hooks/useScrollEdge';
import { severityOf, formatItemDate } from '../selection/PreviewCard';
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
import { zoneBBox, zoneCentroid } from '../../utils/zoneGeometry';
import MiniCalendar from '../../screens/map/components/MiniCalendar';
import { DirCard } from './DirectoryScreen';
import { DrawerBody } from '../selection/IncidentDrawer';
import { ZoneBody } from '../selection/ZoneSheet';
import { EvidenceBody } from '../selection/EvidencePanel';

// Power Search: a SOLID top block (back + search + filters button + a row of
// quick-filter chips and applied tags) over the live map, a two-detent
// results sheet (half ↔ full, down-flick dismisses to a floating "N Results"
// pill), and a bottom-sheet filter panel. The fullscreen container is
// transparent + pointerEvents box-none (meta.transparent in
// Placeholders.jsx), so the map pans/zooms under the screen. Results also
// render as map markers via MapContext's searchOverlay; tapping one previews
// it exactly like a card tap.
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

// Quick-filter chips in the top block — each opens the filter sheet with its
// accordion section pre-expanded.
const QUICK_FILTERS = [
  { key: 'type', label: 'Type' },
  { key: 'severity', label: 'Severity' },
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Date' },
  { key: 'domains', label: 'Domains' },
  { key: 'zonecats', label: 'Zone cats' },
];

// Header strip (grabber + results row) of the results sheet that always
// drags the sheet even when the list is scrolled — measured in canClaim via
// the touch's pageY against the sheet's absolute top edge (locationY is
// relative to the touched child and useless for this).

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

const SORTS = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'severity', label: 'Severity' },
];

function itemTime(item) {
  const raw = item.created_at || item.start_date || 0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

function sortItems(list, mode) {
  const arr = [...list];
  if (mode === 'oldest') {
    arr.sort((a, b) => itemTime(a) - itemTime(b));
  } else if (mode === 'severity') {
    arr.sort((a, b) => (b.severity || 0) - (a.severity || 0));
  } else {
    arr.sort((a, b) => itemTime(b) - itemTime(a));
  }
  return arr;
}

// Clean start: no forced type/status defaults — everything shown until the
// user picks filters. Reset returns here too.
const DEFAULTS = {
  typeSel: {},
  statusSel: {},
};

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
function validDate(s) {
  return ISO_RE.test(s) && isValid(parseISO(s)) ? s : null;
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'd MMM yyyy') : '';
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
  const insets = useSafeAreaInsets();
  const { closeOverlay, showToast } = useOverlay();
  const { selectedId, setSearchOverlay, selectItem, flyToSelection } = useMap();
  const { view: selectionView, closeEvidence } = useSelection();
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
  const [sortMode, setSortMode] = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterFocus, setFilterFocus] = useState(null);
  // All accordions start collapsed except Type (web PS drawer parity).
  const [collapsed, setCollapsed] = useState(
    () =>
      new Set([
        'date',
        'domains',
        'zonecats',
        'severity',
        'status',
        'verif',
        'source',
        'options',
      ]),
  );
  // Measured height of the solid top block — the results sheet's FULL detent
  // parks just below it so the query bar stays visible/editable.
  const [topH, setTopH] = useState(140);
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

  // Quick chip → open the filter sheet with that accordion pre-expanded and
  // scrolled into view.
  const openFilters = useCallback((sectionKey) => {
    if (sectionKey) {
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(sectionKey);
        return next;
      });
    }
    setFilterFocus(sectionKey || null);
    setFiltersOpen(true);
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
      label: `Date: ${fmtDate(dateFrom) || '…'} → ${fmtDate(dateTo) || '…'}`,
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
  const visibleZones = useMemo(
    () =>
      zonecatSel.size && !zonecats
        ? zoneResults.filter((z) => zonecatSel.has(z.zone_category_name))
        : zoneResults,
    [zoneResults, zonecatSel, zonecats],
  );
  const total = incResults.length + visibleZones.length;

  const sortedInc = useMemo(
    () => sortItems(incResults, sortMode),
    [incResults, sortMode],
  );
  const sortedZones = useMemo(
    () => sortItems(visibleZones, sortMode),
    [visibleZones, sortMode],
  );

  // Publish results as map markers while the screen is open; cleared on
  // unmount (close) so the base map returns to its date-range set. Tapping a
  // search marker routes through onOpen into the sheet's LOCAL detail view
  // (single-sheet pattern — the global PeekSheet stays out of the PS flow).
  const [detail, setDetail] = useState(null); // { kind, item } | null
  const openDetailRef = useRef(null);
  openDetailRef.current = (kind, item) => {
    setDetail({ kind, item });
    // Selection ring + card highlight still run through MapContext; the
    // SelectionContext state machine (peek/pill/preview) is NOT engaged.
    selectItem(item.id, kind);
    // Selection-camera parity with the old previewItemOnMap power-search
    // rule: pan-only flight with the half sheet's bottom padding.
    const { height: vh } = Dimensions.get('window');
    const padding = {
      top: 116,
      right: 24,
      left: 24,
      bottom: Math.round(vh * 0.52),
    };
    if (kind === 'zone') {
      const centroid = zoneCentroid(item.geometry);
      if (centroid) {
        flyToSelection({
          type: 'zone',
          source: 'power-search',
          lng: centroid[0],
          lat: centroid[1],
          bounds: zoneBBox(item.geometry),
          padding,
        });
      }
      return;
    }
    const lat = parseFloat(item.latitude);
    const lng = parseFloat(item.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      flyToSelection({ type: 'incident', source: 'power-search', lng, lat, padding });
    }
  };
  const psOpenItem = useCallback(
    (kind, item) => openDetailRef.current?.(kind, item),
    [],
  );
  useEffect(() => {
    setSearchOverlay({
      incidents: incResults,
      zones: visibleZones,
      onOpen: psOpenItem,
    });
  }, [incResults, visibleZones, setSearchOverlay, psOpenItem]);
  useEffect(() => () => setSearchOverlay(null), [setSearchOverlay]);

  const closeDetail = useCallback(() => setDetail(null), []);

  // Closing the detail also releases any in-sheet evidence sub-view (the
  // INSPECT flow runs on SelectionContext's evidence state with a null
  // global item, so the global PeekSheet/EvidencePanel never appear).
  useEffect(() => {
    if (!detail && selectionView === 'evidence') {
      closeEvidence();
    }
  }, [detail, selectionView, closeEvidence]);

  // Hardware back from the detail view returns to the list (it does NOT
  // close the PS screen); evidence back is left to MapScreen's chain, which
  // closes the evidence sub-view and lands back on this detail.
  useEffect(() => {
    if (!detail) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectionView === 'evidence') {
        return false; // MapScreen's selection chain handles evidence → detail
      }
      setDetail(null);
      return true;
    });
    return () => sub.remove();
  }, [detail, selectionView]);

  const close = () => closeOverlay(overlay.id);
  const openPreview = (kind, item) => psOpenItem(kind, item);

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Solid top block: covers the status bar and anchors the search row +
          quick-filter chips / applied tags to the screen top. */}
      <View
        onLayout={(e) => setTopH(e.nativeEvent.layout.height)}
        style={[
          styles.topBlock,
          {
            paddingTop: insets.top + 10,
            backgroundColor: theme.bgSurface,
            borderBottomColor: theme.borderSubtle,
          },
        ]}>
        <View style={styles.headRow}>
          <Pressable
            onPress={close}
            hitSlop={6}
            style={({ pressed }) => [
              styles.backBtn,
              {
                backgroundColor: pressed ? theme.bgElevated : theme.bgHover,
                borderColor: theme.borderSubtle,
              },
            ]}>
            <ChevronLeft size={17} color={theme.textPrimary} />
          </Pressable>
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
          <Pressable
            onPress={() => openFilters(null)}
            style={({ pressed }) => [
              styles.filtersBtn,
              {
                borderColor: filterCount
                  ? theme.accentSubtleBorder
                  : theme.borderSubtle,
                backgroundColor: pressed
                  ? theme.bgHover
                  : filterCount
                    ? theme.accentSubtleBg
                    : theme.bgSurface,
              },
            ]}>
            <SlidersHorizontal
              size={14}
              color={filterCount ? theme.accentLight : theme.textSecondary}
            />
            {filterCount ? (
              <View
                style={[
                  styles.filtersBadge,
                  { backgroundColor: theme.accentLight },
                ]}>
                <Text
                  style={[
                    styles.filtersBadgeText,
                    { color: theme.bgDeep, fontFamily: theme.fontMono },
                  ]}>
                  {filterCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
        {/* quick-filter shortcuts only — applied filters get their own strip
            below so the active state never hides in the scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chipsRow}>
          {QUICK_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => openFilters(f.key)}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderColor: theme.borderSubtle,
                  backgroundColor: pressed ? theme.bgHover : theme.bgElevated,
                },
              ]}>
              <Text
                style={[
                  styles.chipText,
                  { color: theme.textSecondary, fontFamily: theme.fontMono },
                ]}>
                {f.label}
              </Text>
              <ChevronDown size={11} color={theme.textMuted} />
            </Pressable>
          ))}
        </ScrollView>
        {/* Applied-filters strip (Airbnb/Zomato active-filter pattern): only
            rendered while any filter is on; count chip left, removable tag
            chips scroll in the middle, CLEAR pinned right. */}
        {tags.length ? (
          <View style={styles.stripRow}>
            <View
              style={[
                styles.stripCountChip,
                { backgroundColor: theme.accentLight },
              ]}>
              <Text
                style={[
                  styles.stripCountText,
                  { color: theme.bgDeep, fontFamily: theme.fontMono },
                ]}>
                {tags.length} ACTIVE
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.stripTags}>
              {tags.map((t) => (
                <Pressable
                  key={t.key}
                  onPress={t.clear}
                  style={[
                    styles.stripTag,
                    {
                      borderColor: theme.accentSubtleBorder,
                      backgroundColor: theme.accentSubtleBg,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.stripTagText,
                      { color: theme.accentLight, fontFamily: theme.fontMono },
                    ]}>
                    {t.label}
                  </Text>
                  <X size={11} color={theme.accentLight} />
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={resetFilters} hitSlop={6} style={styles.stripClearBtn}>
              <Text
                style={[
                  styles.stripClearText,
                  { color: theme.textMuted, fontFamily: theme.fontMono },
                ]}>
                CLEAR
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* two-detent results sheet + dismiss pill */}
      <ResultsSheet
        total={total}
        loading={loading}
        error={error}
        onRetry={fetchResults}
        onReset={resetFilters}
        incResults={sortedInc}
        zoneResults={sortedZones}
        selectedId={selectedId}
        onOpen={openPreview}
        sortMode={sortMode}
        onSortChange={setSortMode}
        topH={topH}
        detail={detail}
        onCloseDetail={closeDetail}
      />

      {/* filters bottom sheet */}
      {filtersOpen ? (
        <PsFilterSheet
          theme={theme}
          filterCount={filterCount}
          total={total}
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
          focusKey={filterFocus}
          close={() => setFiltersOpen(false)}
        />
      ) : null}
    </View>
  );
}

// ─── Two-detent results sheet + dismiss pill ───
// ONE sheet with internal list ↔ detail (↔ evidence) navigation — the PS
// screen never opens the global PeekSheet. Detents: half (~52%) and full
// (just below the solid top block). A down-flick from half dismisses the
// sheet fully off the bottom; a floating results/item pill restores it at
// half, preserving the current list/detail state. Detail/evidence cross-slide
// mirrors PeekSheet. Detent motion and scroll handoffs use the shared
// DetentSheet; the header's grabber/title row owns drags and pane ScrollViews
// stay natively scrollable at every detent.
function ResultsSheet({
  total,
  loading,
  error,
  onRetry,
  onReset,
  incResults,
  zoneResults,
  selectedId,
  onOpen,
  sortMode,
  onSortChange,
  topH,
  detail,
  onCloseDetail,
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { view: selectionView, evidenceUpdate, closeEvidence } = useSelection();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // The sheet is full-screen tall and slides under the top block; the
  // dismiss detent parks it fully below the screen (no tab bar anymore).
  const sheetH = windowHeight;
  const fullTy = Math.max(Math.round(topH) + 8, 72);
  const halfTy = Math.round(sheetH * 0.52);

  const [level, setLevel] = useState('half'); // 'half'|'full'|'dismissed'
  const [sortOpen, setSortOpen] = useState(false);
  const pos = useSharedValue(sheetH);
  const sheetController = useRef(null);
  const resizeMounted = useRef(false);
  const springTo = (...args) => sheetController.current?.(...args);
  const targetTy =
    level === 'full' ? fullTy : level === 'half' ? halfTy : sheetH;

  const inDetail = !!detail;
  const inEvidence = inDetail && selectionView === 'evidence' && !!evidenceUpdate;

  // Detail ↔ evidence cinematic cross-slide (PeekSheet parity): progress
  // 0 = list, 1 = detail; the list parallax-slides left + fades out while
  // the detail slides in from the right — back plays the exact reverse. The
  // list stays MOUNTED underneath (scroll position kept).
  const bodyAnim = useRef(new Animated.Value(inDetail ? 1 : 0)).current;
  const [showDetail, setShowDetail] = useState(inDetail);
  useEffect(() => {
    if (inDetail) {
      setShowDetail(true);
      setSortOpen(false);
      // A fresh selection (e.g. map marker tap) while dismissed re-opens the
      // sheet into the detail pane instead of leaving only the pill. The dep
      // on the item id matters: tapping a DIFFERENT marker while the pill is
      // showing keeps inDetail=true, so only the id change re-fires this.
      if (live.current.level === 'dismissed') {
        setLevel('half');
        springTo(live.current.halfTy);
      }
      Animated.timing(bodyAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (showDetail) {
      Animated.timing(bodyAnim, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setShowDetail(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inDetail, detail?.item?.id]);

  // Second layer of the same cross-slide for detail → evidence.
  const eviAnim = useRef(new Animated.Value(0)).current;
  const [showEvidence, setShowEvidence] = useState(false);
  useEffect(() => {
    if (inEvidence) {
      setShowEvidence(true);
      Animated.timing(eviAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (showEvidence) {
      Animated.timing(eviAnim, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setShowEvidence(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inEvidence]);

  // Safety net (PeekSheet parity): an interrupted reverse animation never
  // fires its completion callback, which can leave the cross-slide stuck —
  // list invisible under an EMPTY white evidence overlay. Whenever there is
  // no live evidence context, snap back to the detail pane unconditionally.
  useEffect(() => {
    if (!inEvidence && !evidenceUpdate) {
      eviAnim.stopAnimation();
      eviAnim.setValue(0);
      setShowEvidence(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inEvidence, evidenceUpdate, detail?.item?.id]);

  const live = useRef({});
  // Scroll-edge trackers (one per pane) for the nested-scroll handoff: the
  // body capture responder only steals a drag when the VISIBLE pane's
  // ScrollView is pinned at the edge the gesture would cross.
  const listEdge = useScrollEdge();
  const detailEdge = useScrollEdge();
  const eviEdge = useScrollEdge();
  // Refs to the panes' HandoffScrollViews — the shared handoff pans block
  // these natively so the scroll waits for the pan.
  const listScrollRef = useRef(null);
  const detailScrollRef = useRef(null);
  const eviScrollRef = useRef(null);
  live.current = {
    level,
    halfTy,
    fullTy,
    sheetH,
    inDetail,
    inEvidence,
    listEdge,
    detailEdge,
    eviEdge,
  };
  const detailId = detail?.item?.id;
  useEffect(() => {
    detailEdge.reset();
    eviEdge.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailId]);

  // The result list UNMOUNTS while a search loads (skeleton placeholder) and
  // remounts fresh (scroll offset 0) when results land. A fresh ScrollView
  // emits no onScroll at offset 0, so without this resync the edge tracker
  // keeps the pre-search offset and atTopNow stays stuck false (dead
  // down-drag handoff on a freshly-searched list).
  useEffect(() => {
    if (loading) listEdge.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // chooseTarget/getRestTy live behind a ref so both the capture engine and
  // its callbacks always read the current render's detent semantics.
  const getRestTyFn = () => {
    const s = live.current;
    return s.level === 'full'
      ? s.fullTy
      : s.level === 'half'
        ? s.halfTy
        : s.sheetH;
  };
  const chooseTargetFn = ({ dy, vyMs, projected }) => {
    const s = live.current;
    // A clear flick UP flies straight to full; a flick DOWN steps one
    // detent; a slow drag settles at the nearest detent. The down chain ends
    // in a full dismiss (→ floating pill) from BOTH list and detail — the
    // detail state is kept, so the pill re-opens straight back into it.
    const dismissThresh = s.halfTy + (s.sheetH - s.halfTy) * 0.45;
    let target;
    if (vyMs < -1.0 && dy < -10) {
      target = { lv: 'full', ty: s.fullTy };
    } else if (vyMs > 1.0 && dy > 10) {
      target =
        s.level === 'full'
          ? { lv: 'half', ty: s.halfTy }
          : { lv: 'dismissed', ty: s.sheetH };
    } else if (projected > dismissThresh) {
      target = { lv: 'dismissed', ty: s.sheetH };
    } else {
      target =
        Math.abs(s.fullTy - projected) < Math.abs(s.halfTy - projected)
          ? { lv: 'full', ty: s.fullTy }
          : { lv: 'half', ty: s.halfTy };
    }
    return {
      ty: target.ty,
      after: () => {
        if (target.lv !== s.level) {
          setLevel(target.lv);
          if (target.lv !== 'half') setSortOpen(false);
        }
      },
    };
  };
  const gestureFns = useRef({});
  gestureFns.current = { getRestTy: getRestTyFn, chooseTarget: chooseTargetFn };

  // Keyboard open/close resizes the window (adjustResize) and the top block
  // can re-measure: re-snap to the current level's detent so the sheet never
  // strands mid-screen.
  useEffect(() => {
    if (!resizeMounted.current) {
      resizeMounted.current = true;
      return;
    }
    const s = live.current;
    if (s.level === 'dismissed') return;
    springTo(s.level === 'full' ? s.fullTy : s.halfTy);
  }, [halfTy, fullTy, sheetH]);

  // Tap on the header toggles half ↔ full.
  const toggleLevel = () => {
    const next = level === 'full' ? 'half' : 'full';
    setLevel(next);
    springTo(next === 'full' ? fullTy : halfTy);
    setSortOpen(false);
  };

  const reopen = () => {
    setLevel('half');
    springTo(halfTy);
  };

  const sortLabel = SORTS.find((s) => s.key === sortMode)?.label || 'Newest';

  // The sheet is full-screen tall and slides via translateY, so each pane's
  // ScrollView extends below the screen edge by an amount that depends on the
  // CURRENT resting position — and fullTy itself shifts when the search header
  // re-measures (chips strip, keyboard, detail mode). Detent-based padding
  // therefore either trapped the last rows below the edge or over-shot and
  // left a dead gap. Measure the body container's real on-screen overflow
  // after each settle and pad by exactly that (+ nav-bar inset + margin).
  const bodyWrapRef = useRef(null);
  const [measuredPad, setMeasuredPad] = useState(null);
  const measureBodyPad = useCallback(() => {
    bodyWrapRef.current?.measureInWindow((x, y, w, h) => {
      // App window already ends at the nav bar — pad only the overflow.
      const overflow = y + h - windowHeight;
      setMeasuredPad(Math.max(0, Math.round(overflow)) + 12);
    });
  }, [windowHeight]);
  useEffect(() => {
    const first = setTimeout(measureBodyPad, 500);
    return () => clearTimeout(first);
  }, [measureBodyPad]);
  const bodyBottomPad =
    measuredPad ?? (level === 'half' ? halfTy : fullTy) + 12;
  // Off-screen tail = padding minus its small safety margin; scrolling into
  // the tail already feels like "the end", so the handoff fires there.
  listEdge.tailPad.current = Math.max(0, bodyBottomPad - 12);
  detailEdge.tailPad.current = Math.max(0, bodyBottomPad - 12);
  eviEdge.tailPad.current = Math.max(0, bodyBottomPad - 12);

  // Cross-slide interpolations (PeekSheet detail ↔ evidence parity).
  const listTranslate = bodyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -windowWidth * 0.35],
  });
  const listOpacity = bodyAnim.interpolate({
    inputRange: [0, 0.7],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const detailTranslate = bodyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [windowWidth, 0],
  });
  const detailOpacity = bodyAnim.interpolate({
    inputRange: [0.15, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const eviParallax = eviAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -windowWidth * 0.35],
  });
  const eviParOpacity = eviAnim.interpolate({
    inputRange: [0, 0.7],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const eviTranslate = eviAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [windowWidth, 0],
  });
  const eviOpacity = eviAnim.interpolate({
    inputRange: [0.15, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <>
      <DetentSheet
        active
        targetTy={targetTy}
        hiddenTy={sheetH}
        pos={pos}
        getClamp={() => ({ top: live.current.fullTy, bottom: live.current.sheetH })}
        getRestTy={() => gestureFns.current.getRestTy()}
        chooseTarget={(args) => gestureFns.current.chooseTarget(args)}
        dragDownEnabled={
          (level === 'full' || level === 'half') &&
          (inEvidence
            ? eviEdge.atTopNow
            : inDetail
              ? detailEdge.atTopNow
              : listEdge.atTopNow)
        }
        dragUpEnabled={
          level === 'half' &&
          (inEvidence
            ? eviEdge.atEndNow
            : inDetail
              ? detailEdge.atEndNow
              : listEdge.atEndNow)
        }
        scrollRefs={[listScrollRef, detailScrollRef, eviScrollRef]}
        handoffEpoch={`${inDetail}-${inEvidence}`}
        style={{
          height: sheetH,
          backgroundColor: theme.bgSurface,
          borderColor: theme.borderSubtle,
        }}
        bodyProps={{ ref: bodyWrapRef, collapsable: false }}
        controllerRef={sheetController}
        onMotionEnd={measureBodyPad}
        overlay={sortOpen ? (
          <View
            style={[
              styles.sortMenu,
              {
                backgroundColor: theme.bgElevated,
                borderColor: theme.borderSubtle,
              },
            ]}>
            {SORTS.map((s) => {
              const on = s.key === sortMode;
              return (
                <Pressable
                  key={s.key}
                  onPress={() => {
                    onSortChange(s.key);
                    setSortOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.sortItem,
                    pressed && { backgroundColor: theme.bgHover },
                  ]}>
                  <Text
                    style={[
                      styles.sortItemText,
                      { color: on ? theme.accentLight : theme.textSecondary },
                      on && styles.sortItemOn,
                    ]}>
                    {s.label}
                  </Text>
                  {on ? <Check size={13} color={theme.accentLight} /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
        renderHeader={() => (
          <View style={styles.sheetHead}>
          <View style={styles.grabberRow}>
            <View
              style={[styles.grabber, { backgroundColor: theme.borderSubtle }]}
            />
          </View>
          {inDetail ? (
            <View style={styles.detailHeadRow}>
              <Pressable
                onPress={inEvidence ? closeEvidence : onCloseDetail}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.detailBackBtn,
                  { backgroundColor: pressed ? theme.bgHover : theme.bgElevated },
                ]}>
                <ChevronLeft size={16} color={theme.textSecondary} />
              </Pressable>
              <Text
                numberOfLines={1}
                style={[
                  styles.detailHeadTitle,
                  { color: theme.textMuted, fontFamily: theme.fontMono },
                ]}>
                {inEvidence
                  ? 'UPDATE EVIDENCE'
                  : detail.kind === 'zone'
                    ? (detail.item.zone_category_name || 'ZONE').toUpperCase()
                    : (
                        detail.item.category_name ||
                        detail.item.domain_name ||
                        'INCIDENT'
                      ).toUpperCase()}
              </Text>
              <View style={styles.detailBackBtn} />
            </View>
          ) : (
            <View style={styles.sheetHeadRow}>
              <Pressable
                onPress={toggleLevel}
                hitSlop={6}
                style={styles.sheetHeadLeft}>
                <Text
                  style={[
                    styles.stripCount,
                    { color: theme.accentLight, fontFamily: theme.fontMono },
                  ]}>
                  {loading ? 'SEARCHING…' : `${total} RESULTS`}
                </Text>
                {level === 'full' ? (
                  <ChevronDown size={14} color={theme.textMuted} />
                ) : (
                  <ChevronUp size={14} color={theme.textMuted} />
                )}
              </Pressable>
              <Pressable
                onPress={() => setSortOpen((v) => !v)}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.sortBtn,
                  {
                    borderColor: theme.borderSubtle,
                    backgroundColor: pressed ? theme.bgHover : theme.bgElevated,
                  },
                ]}>
                <Text
                  style={[
                    styles.sortBtnText,
                    { color: theme.textSecondary, fontFamily: theme.fontMono },
                  ]}>
                  {sortLabel}
                </Text>
                <ChevronDown
                  size={11}
                  color={theme.textMuted}
                  style={sortOpen ? styles.chevOpen : undefined}
                />
              </Pressable>
            </View>
          )}
        </View>
        )}>

          <Animated.View
            pointerEvents={inDetail ? 'none' : 'auto'}
            style={[
              styles.bodyFill,
              {
                transform: [{ translateX: listTranslate }],
                opacity: listOpacity,
              },
            ]}>
            {loading ? (
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
                  onPress={onRetry}
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
              <HandoffScrollView
                ref={listScrollRef}
                style={styles.stripList}
                contentContainerStyle={[
                  styles.stripPad,
                  { paddingBottom: bodyBottomPad },
                ]}
                keyboardShouldPersistTaps="handled"
                overScrollMode="never"
                scrollEnabled={listEdge.scrollableNow}
                scrollEventThrottle={16}
                onScroll={listEdge.onScroll}
                onScrollEndDrag={listEdge.onScrollEndDrag}
                onMomentumScrollBegin={listEdge.onMomentumScrollBegin}
                onMomentumScrollEnd={listEdge.onMomentumScrollEnd}
                onLayout={listEdge.onLayout}
                onContentSizeChange={listEdge.onContentSizeChange}>
                {total === 0 ? (
                  <View style={styles.stateBox}>
                    <Text style={[styles.stateText, { color: theme.textMuted }]}>
                      No results match your filters.
                    </Text>
                    <Pressable onPress={onReset} hitSlop={6}>
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
                            onPress={() => onOpen('incident', item)}
                          />
                        ))}
                      </>
                    ) : null}
                    {zoneResults.length ? (
                      <>
                        <Text
                          style={[
                            styles.secLabel,
                            {
                              color: theme.textMuted,
                              fontFamily: theme.fontMono,
                            },
                          ]}>
                          Zones ({zoneResults.length})
                        </Text>
                        {zoneResults.map((item) => (
                          <DirCard
                            key={item.id}
                            kind="zone"
                            item={item}
                            highlighted={selectedId === item.id}
                            onPress={() => onOpen('zone', item)}
                          />
                        ))}
                      </>
                    ) : null}
                  </>
                )}
              </HandoffScrollView>
            )}
          </Animated.View>

          {showDetail && detail ? (
            <Animated.View
              pointerEvents={inDetail ? 'auto' : 'none'}
              style={[
                styles.bodyOverlay,
                {
                  backgroundColor: theme.bgSurface,
                  transform: [{ translateX: detailTranslate }],
                  opacity: detailOpacity,
                },
              ]}>
              <Animated.View
                style={[
                  styles.bodyFill,
                  {
                    transform: [{ translateX: eviParallax }],
                    opacity: eviParOpacity,
                  },
                ]}>
                <HandoffScrollView
                  ref={detailScrollRef}
                  style={styles.stripList}
                  contentContainerStyle={[
                    styles.detailPad,
                    { paddingBottom: bodyBottomPad },
                  ]}
                  keyboardShouldPersistTaps="handled"
                  overScrollMode="never"
                  scrollEnabled={detailEdge.scrollableNow}
                  scrollEventThrottle={16}
                  onScroll={detailEdge.onScroll}
                  onScrollEndDrag={detailEdge.onScrollEndDrag}
                  onMomentumScrollBegin={detailEdge.onMomentumScrollBegin}
                  onMomentumScrollEnd={detailEdge.onMomentumScrollEnd}
                  onLayout={detailEdge.onLayout}
                  onContentSizeChange={detailEdge.onContentSizeChange}>
                  {detail.kind === 'zone' ? (
                    <ZoneBody key={detail.item.id} item={detail.item} />
                  ) : (
                    <DrawerBody key={detail.item.id} item={detail.item} />
                  )}
                </HandoffScrollView>
              </Animated.View>
              {showEvidence && evidenceUpdate ? (
                <Animated.View
                  pointerEvents={inEvidence ? 'auto' : 'none'}
                  style={[
                    styles.bodyOverlay,
                    {
                      backgroundColor: theme.bgSurface,
                      transform: [{ translateX: eviTranslate }],
                      opacity: eviOpacity,
                    },
                  ]}>
                  <EvidenceBody
                    key={evidenceUpdate?.id}
                    bottomPad={bodyBottomPad}
                    scrollRef={eviScrollRef}
                    scrollHandlers={{
                      scrollEnabled: eviEdge.scrollableNow,
                      onScroll: eviEdge.onScroll,
                      onScrollEndDrag: eviEdge.onScrollEndDrag,
                      onMomentumScrollBegin: eviEdge.onMomentumScrollBegin,
                      onMomentumScrollEnd: eviEdge.onMomentumScrollEnd,
                      onLayout: eviEdge.onLayout,
                      onContentSizeChange: eviEdge.onContentSizeChange,
                    }}
                  />
                </Animated.View>
              ) : null}
            </Animated.View>
          ) : null}
      </DetentSheet>

      {/* Dismissed → floating pill re-opens the sheet at half. Two pill
          faces: the LIST pill (results count) or, when the sheet was
          dismissed from a detail pane, an INCIDENT pill carrying the
          selection's identity. */}
      {level === 'dismissed' ? (
        inDetail ? (
          (() => {
            const it = detail.item;
            const isZone = detail.kind === 'zone';
            const pillColor = isZone
              ? it.zone_category_color || theme.accentLight
              : theme[`sev${severityOf(it)}`];
            const pillCat = (
              (isZone
                ? it.zone_category_name
                : it.category_name || it.domain_name) || '—'
            ).toUpperCase();
            return (
              <Pressable
                onPress={reopen}
                style={({ pressed }) => [
                  styles.itemPill,
                  {
                    bottom: insets.bottom + 16,
                    backgroundColor: pressed
                      ? theme.bgElevated
                      : theme.bgSurface,
                    borderColor: theme.borderSubtle,
                  },
                ]}>
                <View
                  style={[styles.itemPillAccent, { backgroundColor: pillColor }]}
                />
                <View style={styles.itemPillBody}>
                  <Text
                    numberOfLines={1}
                    style={[styles.itemPillTitle, { color: theme.textPrimary }]}>
                    {it.title}
                  </Text>
                  <View style={styles.itemPillMetaRow}>
                    <View
                      style={[styles.itemPillDot, { backgroundColor: pillColor }]}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.itemPillMeta,
                        { color: theme.textMuted, fontFamily: theme.fontMono },
                      ]}>
                      {pillCat}
                      {it.start_date
                        ? ` · ${formatItemDate(it.start_date)}`
                        : ''}
                    </Text>
                  </View>
                </View>
                <View
                  style={[styles.itemPillUp, { backgroundColor: theme.bgHover }]}>
                  <ChevronUp size={13} color={theme.textSecondary} />
                </View>
              </Pressable>
            );
          })()
        ) : (
          <Pressable
            onPress={reopen}
            style={({ pressed }) => [
              styles.itemPill,
              {
                bottom: insets.bottom + 16,
                backgroundColor: pressed ? theme.bgElevated : theme.bgSurface,
                borderColor: theme.borderSubtle,
              },
            ]}>
            <View
              style={[
                styles.resultsPillChip,
                {
                  backgroundColor: theme.accentSubtleBg,
                  borderColor: theme.accentSubtleBorder,
                },
              ]}>
              <Search size={15} color={theme.accentLight} />
            </View>
            <View style={styles.itemPillBody}>
              <Text
                numberOfLines={1}
                style={[styles.itemPillTitle, { color: theme.textPrimary }]}>
                {total} Result{total === 1 ? '' : 's'}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.itemPillMeta,
                  { color: theme.textMuted, fontFamily: theme.fontMono },
                ]}>
                TAP TO EXPAND
              </Text>
            </View>
            <View
              style={[styles.itemPillUp, { backgroundColor: theme.bgHover }]}>
              <ChevronUp size={13} color={theme.textSecondary} />
            </View>
          </Pressable>
        )
      ) : null}
    </>
  );
}

// ─── Filters bottom sheet (sections/state identical to the old drawer) ───
// Slides up over the PS screen at ~85% height on the shared gesture engine;
// drag/flick-down from the header dismisses with momentum, the inner
// ScrollView never fights the sheet (head mode). Filters apply live; the
// footer's "Show N results" button just closes the sheet.
function PsFilterSheet(props) {
  const { theme, close, filterCount, total, focusKey } = props;
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetH = Math.round(windowHeight * 0.85);
  const pos = useRef(new Animated.Value(sheetH)).current;
  const heightRef = useRef(sheetH);
  heightRef.current = sheetH;
  const closeRef = useRef(close);
  closeRef.current = close;
  // Which date field's calendar is open inside the Date Range accordion
  // (null = neither; tapping a field opens its picker — no auto-chaining).
  const [calField, setCalField] = useState(null);
  // Quick-chip handoff: the pre-expanded section scrolls into view once the
  // entry slide settles (layout positions recorded per accordion).
  const scrollRef = useRef(null);
  const sectionY = useRef({});
  const recordSectionY = (id, y) => {
    sectionY.current[id] = y;
  };
  useEffect(() => {
    if (!focusKey) return undefined;
    const t = setTimeout(() => {
      const y = sectionY.current[focusKey];
      if (y != null) {
        scrollRef.current?.scrollTo({ y: Math.max(y - 8, 0), animated: false });
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const edge = useScrollEdge();
  const { panResponder, handoffGesture, springTo } = useSheetGesture({
    pos,
    getClamp: () => ({ top: 0, bottom: heightRef.current }),
    getRestTy: () => 0,
    chooseTarget: ({ dy, vyMs, projected }) => {
      const H = heightRef.current;
      const flickDown = vyMs > 1.0 && dy > 10;
      if (flickDown || projected > H * 0.35) {
        // Slide all the way off WITH the finger's velocity, then close —
        // the user sees the full exit motion instead of a timing-cut.
        return { ty: H, onDone: () => closeRef.current() };
      }
      return { ty: 0 };
    },
    // Scroll-edge handoff: filter list pinned at its top + drag down on the
    // body pulls the sheet closed; otherwise the list scrolls natively.
    handoff: {
      dragDownEnabled: edge.atTopNow,
      scrollRefs: [scrollRef],
    },
  });

  useEffect(() => {
    springTo(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animateClose = () =>
    springTo(heightRef.current, 0, () => closeRef.current());

  // Hardware back closes just this sheet (selections are already applied
  // live) — it must NOT fall through and close the whole Power Search screen.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      animateClose();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accProps = { ...props, onSectionLayout: recordSectionY };

  const pickDate = (iso) => {
    if (calField === 'from') props.setDateFrom(iso);
    else if (calField === 'to') props.setDateTo(iso);
    setCalField(null);
  };

  return (
    <View style={styles.filterWrap} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.filterSheet,
          {
            height: sheetH,
            paddingBottom: insets.bottom,
            backgroundColor: theme.bgSurface,
            borderColor: theme.borderSubtle,
            transform: [{ translateY: pos }],
          },
        ]}>
        <View
          {...panResponder.panHandlers}
          style={[
            styles.filterHead,
            { borderBottomColor: theme.borderSubtle },
          ]}>
          <View style={styles.grabberRow}>
            <View
              style={[styles.grabber, { backgroundColor: theme.borderSubtle }]}
            />
          </View>
          <View style={styles.filterHeadRow}>
            <Text
              style={[
                styles.filterTitle,
                { color: theme.textPrimary, fontFamily: theme.fontHead },
              ]}>
              Filters
            </Text>
            {filterCount ? (
              <View
                style={[
                  styles.filterBadge,
                  { backgroundColor: theme.accentLight },
                ]}>
                <Text
                  style={[
                    styles.filterBadgeText,
                    { color: theme.bgDeep, fontFamily: theme.fontMono },
                  ]}>
                  {filterCount}
                </Text>
              </View>
            ) : null}
            <Pressable
              onPress={props.resetFilters}
              hitSlop={6}
              style={({ pressed }) => [
                styles.filterReset,
                pressed && { opacity: 0.7 },
              ]}>
              <RotateCcw size={11} color={theme.textSecondary} />
              <Text
                style={[
                  styles.filterResetText,
                  { color: theme.textSecondary, fontFamily: theme.fontMono },
                ]}>
                RESET
              </Text>
            </Pressable>
            <View style={styles.flex1} />
            <Pressable
              onPress={animateClose}
              hitSlop={8}
              style={({ pressed }) => [
                styles.filterClose,
                { backgroundColor: pressed ? theme.bgHover : 'transparent' },
              ]}>
              <X size={16} color={theme.textSecondary} />
            </Pressable>
          </View>
        </View>
        <GestureDetector gesture={handoffGesture}>
          <View style={styles.flex1}>
          <HandoffScrollView
            ref={scrollRef}
            style={styles.flex1}
            contentContainerStyle={styles.filterBody}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={edge.scrollableNow}
            scrollEventThrottle={16}
            onScroll={edge.onScroll}
            onScrollEndDrag={edge.onScrollEndDrag}
            onMomentumScrollBegin={edge.onMomentumScrollBegin}
            onMomentumScrollEnd={edge.onMomentumScrollEnd}
            onLayout={edge.onLayout}
            onContentSizeChange={edge.onContentSizeChange}>
          <PsAccordion
            id="type"
            title="Type"
            icon={MapPin}
            badge={0}
            {...accProps}>
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
            badge={props.dateFrom || props.dateTo ? 1 : 0}
            {...accProps}>
            <View style={styles.dateRangeRow}>
              {[
                { field: 'from', value: props.dateFrom, hint: 'From' },
                { field: 'to', value: props.dateTo, hint: 'To' },
              ].map((f, i) => (
                <React.Fragment key={f.field}>
                  {i === 1 ? (
                    <ArrowRight size={13} color={theme.textMuted} />
                  ) : null}
                  <Pressable
                    onPress={() =>
                      setCalField((cur) => (cur === f.field ? null : f.field))
                    }
                    style={({ pressed }) => [
                      styles.dateField,
                      {
                        backgroundColor: theme.bgInput,
                        borderColor:
                          calField === f.field
                            ? theme.accentSubtleBorder
                            : theme.borderSubtle,
                      },
                      pressed && { opacity: 0.7 },
                    ]}>
                    <Text
                      style={[
                        styles.dateFieldText,
                        {
                          color: f.value ? theme.textPrimary : theme.textMuted,
                          fontFamily: theme.fontMono,
                        },
                      ]}
                      numberOfLines={1}>
                      {fmtDate(f.value) || f.hint}
                    </Text>
                    <Calendar size={13} color={theme.textMuted} />
                  </Pressable>
                </React.Fragment>
              ))}
            </View>
            {calField ? (
              <View style={styles.dateCalWrap}>
                <MiniCalendar
                  key={calField}
                  mode="single"
                  single={calField === 'from' ? props.dateFrom : props.dateTo}
                  onPickSingle={pickDate}
                />
              </View>
            ) : null}
          </PsAccordion>

          <PsAccordion
            id="domains"
            title="Domains & Categories"
            icon={Shield}
            badge={props.domainSel.size}
            {...accProps}>
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
            {...accProps}>
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
            {...accProps}>
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
            {...accProps}>
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
            {...accProps}>
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
            {...accProps}>
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
            {...accProps}>
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
          </HandoffScrollView>
          </View>
        </GestureDetector>
        <View
          style={[
            styles.filterFooter,
            { borderTopColor: theme.borderSubtle },
          ]}>
          <Pressable
            onPress={animateClose}
            style={({ pressed }) => [
              styles.showResultsBtn,
              {
                backgroundColor: theme.accentLight,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <Text
              style={[
                styles.showResultsText,
                { color: theme.bgDeep, fontFamily: theme.fontMono },
              ]}>
              SHOW {total} RESULTS
            </Text>
          </Pressable>
        </View>
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
  onSectionLayout,
  children,
}) {
  const { theme } = useTheme();
  const open = !collapsed.has(id);
  return (
    <View
      onLayout={
        onSectionLayout
          ? (e) => onSectionLayout(id, e.nativeEvent.layout.y)
          : undefined
      }
      style={[styles.acc, { borderBottomColor: theme.borderSubtle }]}>
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
  // ─── solid top block ───
  topBlock: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 13,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  filtersBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filtersBadgeText: { fontSize: 9, fontWeight: '700' },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    paddingRight: 12,
  },
  stripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 9,
  },
  stripCountChip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stripCountText: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 1,
  },
  stripTags: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 4,
  },
  stripTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  stripTagText: {
    fontSize: 9.5,
    letterSpacing: 0.4,
  },
  stripClearBtn: {
    paddingVertical: 4,
    paddingLeft: 2,
  },
  stripClearText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: { fontSize: 11, letterSpacing: 0.3 },
  // ─── results sheet ───
  sheetHead: {
    paddingBottom: 4,
  },
  grabberRow: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  sheetHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sheetHeadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  detailHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  detailBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeadTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  stripCount: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 7,
    borderWidth: 1,
  },
  sortBtnText: { fontSize: 9.5, letterSpacing: 0.4 },
  chevOpen: { transform: [{ rotate: '180deg' }] },
  sortMenu: {
    position: 'absolute',
    top: 74,
    right: 14,
    minWidth: 150,
    borderRadius: 10,
    borderWidth: 1,
    padding: 4,
    zIndex: 10,
    elevation: 6,
  },
  sortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 7,
  },
  sortItemText: { fontSize: 12.5 },
  sortItemOn: { fontWeight: '600' },
  sheetBody: { flex: 1 },
  bodyWrap: { flex: 1 },
  bodyFill: { flex: 1 },
  bodyOverlay: {
    ...StyleSheet.absoluteFill,
  },
  detailPad: { paddingHorizontal: 2 },
  stripList: { flex: 1 },
  stripPad: { paddingBottom: 20 },
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
  resultsPillChip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemPill: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  itemPillAccent: { width: 3.5, height: 32, borderRadius: 2 },
  itemPillBody: { flex: 1, minWidth: 0 },
  itemPillTitle: { fontSize: 12.5, fontWeight: '600' },
  itemPillMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  itemPillDot: { width: 5, height: 5, borderRadius: 3 },
  itemPillMeta: { fontSize: 9, letterSpacing: 0.3 },
  itemPillUp: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ─── filters bottom sheet ───
  filterWrap: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  filterSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterHead: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 12,
  },
  filterTitle: { fontSize: 16, fontWeight: '600' },
  filterBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  filterBadgeText: { fontSize: 10, fontWeight: '700' },
  filterReset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  filterResetText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.8 },
  flex1: { flex: 1 },
  filterClose: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBody: { paddingBottom: 16 },
  filterFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  showResultsBtn: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showResultsText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 1 },
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
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  dateField: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingHorizontal: 11,
  },
  dateFieldText: { fontSize: 11.5, flexShrink: 1 },
  dateCalWrap: { paddingTop: 8 },
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
});

export default PowerSearchBody;
