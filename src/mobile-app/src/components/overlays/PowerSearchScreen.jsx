import React, {
  useCallback,
  useEffect,
  useMemo,
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
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import MiniCalendar from '../../screens/map/components/MiniCalendar';
import { DirCard } from './DirectoryScreen';

// Power Search (prototype #ps-screen): a FLOATING glass search bar over the
// live map + a multi-detent results sheet (collapsed ↔ full, grabber drag —
// same spring/velocity model as the selection PeekSheet). The fullscreen
// container is transparent + pointerEvents box-none (meta.transparent in
// Placeholders.jsx), so the map pans/zooms under the screen and the tab bar
// stays tappable. Results also render as map markers via MapContext's
// searchOverlay; tapping one previews it exactly like a card tap.
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

// Tab bar overlaps the bottom 62px of the overlay body — the sheet floats
// above it so the tabs stay visible and tappable.
const TAB_CLEAR = 62;
const COLLAPSED_VISIBLE = 128;
// Full detent stops just below the floating search card so the query bar
// stays visible/editable even with the sheet fully raised.
const FULL_TY = 88;

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
  const { closeOverlay, showToast } = useOverlay();
  const { selectedId, setSearchOverlay } = useMap();
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
  const [sortMode, setSortMode] = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  // unmount (close) so the base map returns to its date-range set.
  useEffect(() => {
    setSearchOverlay({ incidents: incResults, zones: visibleZones });
  }, [incResults, visibleZones, setSearchOverlay]);
  useEffect(() => () => setSearchOverlay(null), [setSearchOverlay]);

  const close = () => closeOverlay(overlay.id);
  const openPreview = (kind, item) =>
    previewItemOnMap(kind, item, { type: 'fullscreen', id: 'powerSearch' }, 'power-search');

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* floating search bar (prototype .ps-top → floating card) */}
      <View
        style={[
          styles.topCard,
          {
            backgroundColor: theme.bgGlass,
            borderColor: theme.borderSubtle,
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
              autoFocus
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
            onPress={() => setFiltersOpen(true)}
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
        {/* applied tags */}
        {tags.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.tagsRow}>
            {tags.map((t) => (
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
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* multi-detent results sheet */}
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
      />

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

// ─── Multi-detent results sheet ───
// Three detents: collapsed (grabber + "N RESULTS" + sort), half (~52%) and
// full (just below the floating search card). Grabber drag uses the
// PeekSheet model: extractOffset relative dragging for zero-latency finger
// tracking, and the release spring inherits the fling velocity so motion
// never visibly stops and re-accelerates.
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
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  // The fullscreen container already pads top (insets.top + 8) and bottom
  // (insets.bottom); the sheet fills the remaining body minus the tab bar.
  const sheetH = Math.round(windowHeight - insets.top - 8 - insets.bottom - TAB_CLEAR);
  const collapsedTy = sheetH - COLLAPSED_VISIBLE;
  const halfTy = Math.round(sheetH * 0.52);

  const [level, setLevel] = useState('collapsed'); // 'collapsed'|'half'|'full'
  const [sortOpen, setSortOpen] = useState(false);
  const pos = useRef(new Animated.Value(sheetH)).current; // mounts hidden

  const live = useRef({});
  live.current = { level, collapsedTy, halfTy };

  // Whole-sheet drag (Google Maps style), sharing the map PeekSheet's gesture
  // engine (src/hooks/useSheetGesture.js) so this sheet drags/flicks/settles
  // identically. Capture mode: the responder CAPTURES vertical gestures
  // before the results ScrollView can claim them — drag up anywhere raises
  // the sheet (until full), drag down lowers it only when the list is
  // scrolled to its top, otherwise the list scrolls.
  const listScrollY = useRef(0);
  const { panResponder, springTo } = useSheetGesture({
    pos,
    mode: 'capture',
    canClaim: (g) => {
      const s = live.current;
      if (g.dy < 0) {
        return s.level !== 'full'; // up: raise unless already full
      }
      return listScrollY.current <= 0 && s.level !== 'collapsed';
    },
    getClamp: () => ({ top: FULL_TY, bottom: live.current.collapsedTy }),
    getRestTy: () => {
      const s = live.current;
      return s.level === 'full'
        ? FULL_TY
        : s.level === 'half'
          ? s.halfTy
          : s.collapsedTy;
    },
    chooseTarget: ({ dy, vyMs, projected }) => {
      const s = live.current;
      // Detents ascending by translateY: full < half < collapsed. Mirrors
      // the selection PeekSheet: a clear flick UP flies straight to full
      // (never parks at half), a flick DOWN steps one detent, and a slow
      // drag settles at the detent nearest the projected resting point.
      const detents = [
        { lv: 'full', ty: FULL_TY },
        { lv: 'half', ty: s.halfTy },
        { lv: 'collapsed', ty: s.collapsedTy },
      ];
      let target;
      if (vyMs < -1.0 && dy < -10) {
        target = detents[0];
      } else if (vyMs > 1.0 && dy > 10) {
        const idx = detents.findIndex((d) => d.lv === s.level);
        target = detents[Math.min(idx + 1, detents.length - 1)];
      } else {
        target = detents.reduce((best, d) =>
          Math.abs(d.ty - projected) < Math.abs(best.ty - projected)
            ? d
            : best,
        );
      }
      return {
        ty: target.ty,
        after: () => {
          if (target.lv !== s.level) setLevel(target.lv);
        },
      };
    },
  });

  // Slide-in on mount.
  useEffect(() => {
    Animated.spring(pos, {
      toValue: collapsedTy,
      damping: 24,
      stiffness: 220,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard open/close resizes the window (adjustResize): re-snap to the
  // current level's detent so the sheet never strands mid-screen.
  useEffect(() => {
    const s = live.current;
    springTo(
      s.level === 'full' ? FULL_TY : s.level === 'half' ? s.halfTy : collapsedTy,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsedTy]);

  // Tap on the header walks the detents upward, then back to collapsed.
  const toggleLevel = () => {
    const next =
      level === 'collapsed' ? 'half' : level === 'half' ? 'full' : 'collapsed';
    setLevel(next);
    springTo(
      next === 'full' ? FULL_TY : next === 'half' ? halfTy : collapsedTy,
    );
    if (next === 'collapsed') setSortOpen(false);
  };

  const sortLabel = SORTS.find((s) => s.key === sortMode)?.label || 'Newest';

  return (
    <View style={styles.sheetWrap} pointerEvents="box-none">
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.sheet,
          {
            height: sheetH,
            backgroundColor: theme.bgSurface,
            borderColor: theme.borderSubtle,
            transform: [{ translateY: pos }],
          },
        ]}>
        <View style={styles.sheetHead}>
          <View style={styles.grabberRow}>
            <View
              style={[styles.grabber, { backgroundColor: theme.borderSubtle }]}
            />
          </View>
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
        </View>

        {sortOpen ? (
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

        <View style={styles.sheetBody}>
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
            <ScrollView
              style={styles.stripList}
              contentContainerStyle={styles.stripPad}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={level === 'full'}
              scrollEventThrottle={16}
              onScroll={(e) => {
                listScrollY.current = e.nativeEvent.contentOffset.y;
              }}>
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
            </ScrollView>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Filters drawer (prototype .ps-filters + .psf-acc accordion) ───
function PsFilterDrawer(props) {
  const { theme, close, filterCount } = props;
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;
  // Which date field's calendar is open inside the Date Range accordion
  // (null = neither; tapping a field opens its picker — no auto-chaining).
  const [calField, setCalField] = useState(null);
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

  const pickDate = (iso) => {
    if (calField === 'from') props.setDateFrom(iso);
    else if (calField === 'to') props.setDateTo(iso);
    setCalField(null);
  };

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
            // Start below the transparent status bar, not underneath it.
            top: insets.top,
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
        <ScrollView
          contentContainerStyle={styles.drawerBody}
          keyboardShouldPersistTaps="handled">
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
            badge={props.dateFrom || props.dateTo ? 1 : 0}
            {...props}>
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
  topCard: {
    marginHorizontal: 12,
    marginTop: 4,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
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
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 9,
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
  // ─── results sheet ───
  sheetWrap: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    paddingBottom: TAB_CLEAR,
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
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
  // ─── filters drawer ───
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
