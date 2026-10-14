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
  Check,
  ChevronDown,
  ChevronLeft,
  Filter,
  MapPin,
  RotateCcw,
  Search,
  X,
} from 'lucide-react-native';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import { useMap } from '../../context/MapContext';
import { useSelection } from '../../context/SelectionContext';
import { searchIncidents, searchZones } from '../../services/incidents.service';
import { listCategories, listZoneCategories } from '../../services/taxonomy.service';
import { DOMAINS, SEVERITIES, VERIFICATION_STATUSES, ZONE_OVERLAYS } from '../../constants';
import { locationLine, severityOf } from '../selection/PreviewCard';
import useSheetGesture from '../../hooks/useSheetGesture';

// Directory fullscreens (prototype #dir-screen-incidents / #dir-screen-zones;
// openDirectory/toggleDirFilters/setDirStatus/renderDirFiltersStatic/
// toggleDirSev/toggleDirCheck/toggleDirVerif/resetDirFilters/
// renderAppliedDirTags/dirClearTag/updateDirFilterCount/renderDirResults).
// Both kinds share one skeleton; `kind` switches copy, sections and the
// search call. Directories browse ALL time — dates are always sent as
// 1970-01-01/2099-12-31 (the backend defaults to "visible today" when dates
// are absent) and geometryType is pinned per kind (point queries must not
// pull polygon zones).

const ALL_TIME = { dateFrom: '1970-01-01', dateTo: '2099-12-31' };

const CONFIG = {
  incidents: {
    title: 'Incidents',
    subtitle: 'Browse every reported incident',
    placeholder: 'Search incidents by title or location…',
    noun: 'INCIDENT',
    kind: 'incident',
  },
  zones: {
    title: 'Zones',
    subtitle: 'Browse all mapped zones',
    placeholder: 'Search zones by title or location…',
    noun: 'ZONE',
    kind: 'zone',
  },
};

const SORTS = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'severity', label: 'Highest severity' },
];

const VERIF_META = {
  unverified: { label: 'Unverified', colorKey: 'textMuted' },
  verified: { label: 'Verified', colorKey: 'success' },
  disputed: { label: 'Disputed', colorKey: 'sev2' },
  debunked: { label: 'Debunked', colorKey: 'sev4' },
};

// Filters survive close/reopen of the fullscreen (prototype keeps dirState
// module-level); results always refetch on mount.
const stateCache = { incidents: null, zones: null };

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function dateVal(item) {
  const d = Date.parse(item.start_date || item.created_at || '');
  return Number.isFinite(d) ? d : 0;
}

// Dynamic on/off checkbox colors, hoisted out of JSX (no-inline-styles).
function checkboxState(theme, on) {
  return {
    borderColor: on ? theme.accentLight : theme.borderSubtle,
    backgroundColor: on ? theme.accentLight : 'transparent',
  };
}

export default function DirectoryScreen({ kind, overlay }) {
  const { theme } = useTheme();
  const { closeOverlay, showToast } = useOverlay();
  const { selectedId } = useMap();
  const { previewItemOnMap } = useSelection();
  const cfg = CONFIG[kind];
  const isZones = kind === 'zones';

  const cached = stateCache[kind];
  const [q, setQ] = useState(cached?.q || '');
  const [qDebounced, setQDebounced] = useState(cached?.q || '');
  const [status, setStatus] = useState(cached?.status || 'all');
  const [sevSel, setSevSel] = useState(cached?.sevSel || {}); // {n: bool}
  const [verifSel, setVerifSel] = useState(
    () => cached?.verifSel || new Set(VERIFICATION_STATUSES),
  );
  const [domainSel, setDomainSel] = useState(() => cached?.domainSel || new Set());
  const [zonecatSel, setZonecatSel] = useState(() => cached?.zonecatSel || new Set());
  const [sort, setSort] = useState(cached?.sort || 'newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [results, setResults] = useState([]);
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
  const domainRows = domains || DOMAINS.map((d) => ({ slug: d.slug, name: d.name }));
  const zonecatRows = zonecats || ZONE_OVERLAYS.map((z) => ({ id: null, name: z.name }));

  // Snapshot filters for the next mount (prototype dirState persistence).
  useEffect(() => {
    stateCache[kind] = { q, status, sevSel, verifSel, domainSel, zonecatSel, sort };
  }, [kind, q, status, sevSel, verifSel, domainSel, zonecatSel, sort]);

  // 300ms debounced search text (prototype oninput → renderDirResults).
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const fetchResults = useCallback(() => {
    const seq = ++fetchSeq.current;
    // Every verification state unchecked = match nothing (the param with an
    // empty value would be dropped by the query builder and return all).
    if (!isZones && verifSel.size === 0) {
      setResults([]);
      setLoading(false);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    const sevs = Object.keys(sevSel).filter((n) => sevSel[n]);
    const params = {
      ...ALL_TIME,
      limit: 100,
      ...(qDebounced ? { q: qDebounced } : {}),
      ...(status !== 'all' ? { status } : {}),
      ...(sevs.length ? { severities: sevs.join(',') } : {}),
    };
    if (!isZones) {
      if (verifSel.size < VERIFICATION_STATUSES.length) {
        params.verificationStatuses = [...verifSel].join(',');
      }
      if (domainSel.size) {
        params.domainSlugs = [...domainSel].join(',');
      }
    } else if (zonecatSel.size && zonecats) {
      // Fetched taxonomy: server-side filter by id. Constant fallback has no
      // ids — those selections filter client-side below.
      const ids = zonecats
        .filter((c) => zonecatSel.has(c.name))
        .map((c) => c.id)
        .filter(Boolean);
      if (ids.length) {
        params.zoneCategoryIds = ids.join(',');
      }
    }
    (isZones ? searchZones(params) : searchIncidents(params))
      .then((data) => {
        if (seq !== fetchSeq.current) return;
        setResults(data?.incidents || []);
      })
      .catch(() => {
        if (seq !== fetchSeq.current) return;
        setError(true);
        showToast(`Could not load ${isZones ? 'zones' : 'incidents'} — check the backend`);
      })
      .finally(() => {
        if (seq === fetchSeq.current) setLoading(false);
      });
  }, [isZones, qDebounced, status, sevSel, verifSel, domainSel, zonecatSel, zonecats, showToast]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Client-side zone-category fallback filter + sort.
  const visible = useMemo(() => {
    let arr = results;
    if (isZones && zonecatSel.size && !zonecats) {
      arr = arr.filter((z) => zonecatSel.has(z.zone_category_name));
    }
    const sorted = [...arr];
    if (sort === 'oldest') {
      sorted.sort((a, b) => dateVal(a) - dateVal(b));
    } else if (sort === 'severity') {
      sorted.sort((a, b) => severityOf(b) - severityOf(a) || dateVal(b) - dateVal(a));
    } else {
      sorted.sort((a, b) => dateVal(b) - dateVal(a));
    }
    return sorted;
  }, [results, isZones, zonecatSel, zonecats, sort]);

  // ─── Filter mutations (prototype toggleDirSev/toggleDirCheck/toggleDirVerif)
  const toggleSev = (n) => setSevSel((prev) => ({ ...prev, [n]: !prev[n] }));
  const toggleVerif = (v) =>
    setVerifSel((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
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
  const toggleAccordion = (key) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // resetDirFilters: q, status, severities, verifs (back to all), domains /
  // zonecats. Sort is left alone (prototype keeps it).
  const resetFilters = useCallback(() => {
    setQ('');
    setQDebounced('');
    setStatus('all');
    setSevSel({});
    setVerifSel(new Set(VERIFICATION_STATUSES));
    setDomainSel(new Set());
    setZonecatSel(new Set());
  }, []);

  // ─── Applied tags + count (prototype renderAppliedDirTags/updateDirFilterCount)
  const sevNums = useMemo(
    () =>
      Object.keys(sevSel)
        .filter((n) => sevSel[n])
        .map(Number)
        .sort((a, b) => a - b),
    [sevSel],
  );
  const tags = [];
  sevNums.forEach((n) =>
    tags.push({ key: `sev-${n}`, label: `S${n}`, clear: () => toggleSev(n) }),
  );
  if (!isZones && verifSel.size < VERIFICATION_STATUSES.length) {
    [...verifSel].forEach((v) =>
      tags.push({
        key: `ver-${v}`,
        label: VERIF_META[v]?.label || capitalize(v),
        clear: () => toggleVerif(v),
      }),
    );
  }
  [...domainSel].forEach((slug) =>
    tags.push({
      key: `dom-${slug}`,
      label: domainRows.find((d) => d.slug === slug)?.name || slug,
      clear: () => toggleDomain(slug),
    }),
  );
  [...zonecatSel].forEach((name) =>
    tags.push({ key: `zc-${name}`, label: `Z: ${name}`, clear: () => toggleZonecat(name) }),
  );
  const filterCount =
    sevNums.length +
    (!isZones && verifSel.size < VERIFICATION_STATUSES.length ? 1 : 0) +
    (domainSel.size ? 1 : 0) +
    (zonecatSel.size ? 1 : 0);

  const close = () => closeOverlay(overlay.id);
  const openPreview = (item) =>
    previewItemOnMap(cfg.kind, item, { type: 'fullscreen' });

  return (
    <View style={styles.root}>
      {/* header: back ‹ + title/subtitle + Reset (prototype .dir-head-row) */}
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
          <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontHead }]}>
            {cfg.title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {cfg.subtitle}
          </Text>
        </View>
        <Pressable
          onPress={resetFilters}
          style={({ pressed }) => [
            styles.resetBtn,
            {
              backgroundColor: pressed ? theme.bgHover : 'transparent',
              borderColor: theme.borderSubtle,
            },
          ]}>
          <RotateCcw size={11} color={theme.textSecondary} />
          <Text style={[styles.resetText, { color: theme.textSecondary, fontFamily: theme.fontMono }]}>
            Reset
          </Text>
        </Pressable>
      </View>

      {/* search row */}
      <View
        style={[
          styles.searchRow,
          { backgroundColor: theme.bgInput, borderColor: theme.borderSubtle },
        ]}>
        <Search size={15} color={theme.textMuted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={cfg.placeholder}
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={[styles.searchInput, { color: theme.textPrimary, fontFamily: theme.fontHead }]}
        />
        {q ? (
          <Pressable onPress={() => setQ('')} hitSlop={8}>
            <X size={14} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* filter chip row */}
      <View style={styles.chipRow}>
        <Pressable
          onPress={() => setFiltersOpen(true)}
          style={[
            styles.filterChip,
            {
              backgroundColor: theme.accentSubtleBg,
              borderColor: theme.accentLight,
            },
          ]}>
          <Filter size={11} color={theme.accentLight} />
          <Text style={[styles.filterChipText, { color: theme.accentLight, fontFamily: theme.fontMono }]}>
            Filters{filterCount ? ` (${filterCount})` : ''}
          </Text>
        </Pressable>
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
                { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
              ]}>
              <Text style={[styles.tagText, { color: theme.textSecondary, fontFamily: theme.fontMono }]}>
                {t.label}
              </Text>
              <X size={10} color={theme.textMuted} />
            </Pressable>
          ))
        ) : (
          <Text style={[styles.tagsEmpty, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
            No filters applied — all results shown
          </Text>
        )}
      </View>

      {/* results header + sort dropdown */}
      <View style={styles.resultsWrap}>
        <View
          style={[
            styles.resultsHead,
            { backgroundColor: theme.bgGlass, borderBottomColor: theme.borderSubtle },
          ]}>
          <Text style={[styles.resultsCount, { color: theme.accentLight, fontFamily: theme.fontMono }]}>
            {visible.length} {cfg.noun}
            {visible.length === 1 ? '' : 'S'}
          </Text>
          <Pressable
            onPress={() => setSortOpen((v) => !v)}
            hitSlop={6}
            style={styles.sortBtn}>
            <Text style={[styles.sortText, { color: theme.textSecondary, fontFamily: theme.fontMono }]}>
              {SORTS.find((s) => s.key === sort)?.label}
            </Text>
            <ChevronDown size={12} color={theme.textSecondary} />
          </Pressable>
        </View>
        {sortOpen ? (
          <>
            <Pressable style={styles.sortBackdrop} onPress={() => setSortOpen(false)} />
            <View
              style={[
                styles.sortMenu,
                { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
              ]}>
              {SORTS.map((s) => (
                <Pressable
                  key={s.key}
                  onPress={() => {
                    setSort(s.key);
                    setSortOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.sortOption,
                    { backgroundColor: pressed ? theme.bgHover : 'transparent' },
                    s.key === sort && { backgroundColor: theme.accentSubtleBg },
                  ]}>
                  <Text
                    style={[
                      styles.sortOptionText,
                      { fontFamily: theme.fontMono },
                      { color: s.key === sort ? theme.accentLight : theme.textSecondary },
                    ]}>
                    {s.label}
                  </Text>
                  {s.key === sort ? <Check size={12} color={theme.accentLight} /> : null}
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {/* results body */}
        {loading ? (
          <SkeletonRows theme={theme} />
        ) : error ? (
          <View style={styles.stateBox}>
            <Text style={[styles.stateText, { color: theme.textMuted }]}>
              Couldn’t load results.
            </Text>
            <Pressable
              onPress={fetchResults}
              style={[styles.retryBtn, { borderColor: theme.accentSubtleBorder, backgroundColor: theme.accentSubtleBg }]}>
              <Text style={[styles.retryText, { color: theme.accentLight, fontFamily: theme.fontMono }]}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listPad}
            keyboardShouldPersistTaps="handled">
            {visible.length ? (
              visible.map((item) => (
                <DirCard
                  key={item.id}
                  kind={cfg.kind}
                  item={item}
                  highlighted={selectedId === item.id}
                  onPress={() => openPreview(item)}
                />
              ))
            ) : (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No results match your filters.
              </Text>
            )}
          </ScrollView>
        )}
      </View>

      {/* filters bottom sheet (Google Maps pattern — drag/flick to dismiss) */}
      {filtersOpen ? (
        <FilterSheet
          kind={kind}
          theme={theme}
          filterCount={filterCount}
          total={visible.length}
          collapsed={collapsed}
          toggleAccordion={toggleAccordion}
          sevSel={sevSel}
          toggleSev={toggleSev}
          status={status}
          setStatus={setStatus}
          verifSel={verifSel}
          toggleVerif={toggleVerif}
          domains={domainRows}
          domainSel={domainSel}
          toggleDomain={toggleDomain}
          zonecats={zonecatRows}
          zonecatSel={zonecatSel}
          toggleZonecat={toggleZonecat}
          resetFilters={resetFilters}
          close={() => setFiltersOpen(false)}
        />
      ) : null}
    </View>
  );
}

// ─── Result card (prototype .dir-card) — shared with Power Search (P7) ───
export function DirCard({ kind, item, highlighted, onPress }) {
  const { theme } = useTheme();
  const isZone = kind === 'zone';
  const sev = severityOf(item);
  const sevColor = theme[`sev${sev}`];
  const sevName = SEVERITIES[sev - 1]?.name || 'Moderate';
  const color = isZone
    ? item.zone_category_color || theme.accentLight
    : item.domain_color || sevColor;
  const status = (item.status || 'active').toLowerCase();
  const active = status === 'active';
  const catLabel = isZone
    ? item.zone_category_name || 'Zone'
    : item.category_name || item.domain_name || 'Incident';
  const d = item.start_date ? parseISO(item.start_date) : null;
  const ago = d && isValid(d) ? `${formatDistanceToNow(d)} ago` : '';
  const areaKm2 = isZone && Number.isFinite(parseFloat(item.area_sq_m))
    ? `${(parseFloat(item.area_sq_m) / 1e6).toFixed(1)} km²`
    : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderBottomColor: theme.borderSubtle },
        highlighted && { backgroundColor: theme.accentSubtleBg },
        pressed && { backgroundColor: theme.bgHover },
      ]}>
      <View style={[styles.cardAccent, { backgroundColor: color }]} />
      <View style={styles.cardBody}>
        <Text
          style={[styles.cardTitle, { color: theme.textPrimary, fontFamily: theme.fontHead }]}>
          {item.title}
        </Text>
        <View style={styles.cardTagRow}>
          <View style={[styles.cardDot, { backgroundColor: color }]} />
          <Text style={[styles.cardCat, { color }]}>{catLabel}</Text>
        </View>
        <View style={styles.cardPillRow}>
          <View
            style={[
              styles.cardPill,
              { borderColor: `${sevColor}66` },
            ]}>
            <Text style={[styles.cardPillText, { color: sevColor, fontFamily: theme.fontMono }]}>
              {`S${sev} | ${sevName}`.toUpperCase()}
            </Text>
          </View>
          <View
            style={[
              styles.cardPill,
              {
                borderColor: active ? `${theme.success}66` : theme.borderSubtle,
              },
            ]}>
            <Text
              style={[
                styles.cardPillText,
                {
                  color: active ? theme.success : theme.textMuted,
                  fontFamily: theme.fontMono,
                },
              ]}>
              {active ? '● ACTIVE' : '○ RESOLVED'}
            </Text>
          </View>
          {areaKm2 ? (
            <View style={[styles.cardPill, { borderColor: theme.borderSubtle }]}>
              <Text style={[styles.cardPillText, { color: theme.textSecondary, fontFamily: theme.fontMono }]}>
                {areaKm2}
              </Text>
            </View>
          ) : null}
          {ago ? (
            <Text style={[styles.cardDate, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
              {ago}
            </Text>
          ) : null}
        </View>
        <View style={styles.cardLocRow}>
          <MapPin size={11} color={theme.textMuted} />
          <Text numberOfLines={1} style={[styles.cardLoc, { color: theme.textSecondary }]}>
            {locationLine(item)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Skeleton rows while loading ───
function SkeletonRows({ theme }) {
  return (
    <View style={styles.listPad}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[styles.skelRow, { borderBottomColor: theme.borderSubtle }]}>
          <View style={[styles.skelBar, { backgroundColor: theme.bgElevated }]} />
          <View style={styles.skelCol}>
            <View style={[styles.skelLine, styles.skelW72, { backgroundColor: theme.bgElevated }]} />
            <View style={[styles.skelLine, styles.skelW38, { backgroundColor: theme.bgElevated }]} />
            <View style={[styles.skelLine, styles.skelW54, { backgroundColor: theme.bgElevated }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Filters bottom sheet (Google Maps pattern; same gesture engine and
// head-drag model as the Power Search filter sheet) ───
function FilterSheet(props) {
  const { theme, close, filterCount, total } = props;
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetH = Math.round(windowHeight * 0.85);
  const pos = useRef(new Animated.Value(sheetH)).current;
  const heightRef = useRef(sheetH);
  heightRef.current = sheetH;
  const closeRef = useRef(close);
  closeRef.current = close;

  const { panResponder, springTo } = useSheetGesture({
    pos,
    getClamp: () => ({ top: 0, bottom: heightRef.current }),
    getRestTy: () => 0,
    chooseTarget: ({ dy, vyMs, projected }) => {
      const H = heightRef.current;
      const flickDown = vyMs > 1.0 && dy > 10;
      if (flickDown || projected > H * 0.35) {
        // Slide all the way off WITH the finger's velocity, then close.
        return { ty: H, onDone: () => closeRef.current() };
      }
      return { ty: 0 };
    },
  });

  useEffect(() => {
    springTo(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animateClose = () =>
    springTo(heightRef.current, 0, () => closeRef.current());

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={styles.sheetBackdrop} onPress={animateClose} />
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
          style={[styles.sheetHead, { borderBottomColor: theme.borderSubtle }]}>
          <View style={styles.grabberRow}>
            <View style={[styles.grabber, { backgroundColor: theme.borderSubtle }]} />
          </View>
          <View style={styles.sheetHeadRow}>
            <Text style={[styles.drawerTitle, { color: theme.textPrimary, fontFamily: theme.fontHead }]}>
              Filters
            </Text>
            {filterCount ? (
              <View style={[styles.drawerBadge, { backgroundColor: theme.accentSubtleBg, borderColor: theme.accentSubtleBorder }]}>
                <Text style={[styles.drawerBadgeText, { color: theme.accentLight, fontFamily: theme.fontMono }]}>
                  {filterCount}
                </Text>
              </View>
            ) : null}
            <View style={styles.flex1} />
            <Pressable onPress={animateClose} hitSlop={8} style={styles.drawerClose}>
              <X size={15} color={theme.textSecondary} />
            </Pressable>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.drawerBody}>
          <Accordion
            id="severity"
            title="Severity"
            badge={props.sevNums?.length ?? Object.keys(props.sevSel).filter((n) => props.sevSel[n]).length}
            {...props}
          >
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
                  <View
                    style={[
                      styles.checkbox,
                      checkboxState(theme, on),
                    ]}>
                    {on ? <Check size={11} color={theme.bgDeep} /> : null}
                  </View>
                  <View style={[styles.sevNum, { backgroundColor: `${color}22` }]}>
                    <Text style={[styles.sevNumText, { color, fontFamily: theme.fontMono }]}>
                      {s.n}
                    </Text>
                  </View>
                  <Text style={[styles.optLabel, { color: theme.textPrimary }]}>
                    {s.n} {s.name}
                  </Text>
                </Pressable>
              );
            })}
          </Accordion>

          <Accordion
            id="status"
            title="Status"
            badge={props.status !== 'all' ? 1 : 0}
            {...props}>
            <View style={styles.optRow}>
              {[
                { key: 'all', label: 'All' },
                { key: 'active', label: '● Active' },
                { key: 'resolved', label: '○ Resolved' },
              ].map((o) => {
                const on = props.status === o.key;
                return (
                  <Pressable
                    key={o.key}
                    onPress={() => props.setStatus(o.key)}
                    style={[
                      styles.optBtn,
                      {
                        borderColor: on ? theme.accentLight : theme.borderSubtle,
                        backgroundColor: on ? theme.accentSubtleBg : theme.bgElevated,
                      },
                    ]}>
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
          </Accordion>

          {props.kind === 'incidents' ? (
            <>
              <Accordion
                id="verification"
                title="Verification"
                badge={
                  props.verifSel.size < VERIFICATION_STATUSES.length ? 1 : 0
                }
                {...props}>
                <View style={styles.optRowWrap}>
                  {VERIFICATION_STATUSES.map((v) => {
                    const on = props.verifSel.has(v);
                    const dotColor = theme[VERIF_META[v].colorKey];
                    return (
                      <Pressable
                        key={v}
                        onPress={() => props.toggleVerif(v)}
                        style={[
                          styles.optBtn,
                          {
                            borderColor: on ? theme.accentLight : theme.borderSubtle,
                            backgroundColor: on ? theme.accentSubtleBg : theme.bgElevated,
                          },
                        ]}>
                        <View style={[styles.optDot, { backgroundColor: dotColor }]} />
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
              </Accordion>

              <Accordion
                id="domains"
                title="Domains & Categories"
                badge={props.domainSel.size}
                {...props}>
                {props.domains.map((d) => {
                  const on = props.domainSel.has(d.slug);
                  return (
                    <CheckRow
                      key={d.slug}
                      on={on}
                      label={d.name}
                      theme={theme}
                      onPress={() => props.toggleDomain(d.slug)}
                    />
                  );
                })}
              </Accordion>
            </>
          ) : (
            <Accordion
              id="zonecats"
              title="Zone Categories"
              badge={props.zonecatSel.size}
              {...props}>
              {props.zonecats.map((z) => {
                const on = props.zonecatSel.has(z.name);
                return (
                  <CheckRow
                    key={z.name}
                    on={on}
                    label={z.name}
                    theme={theme}
                    onPress={() => props.toggleZonecat(z.name)}
                  />
                );
              })}
            </Accordion>
          )}

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
            <Text style={[styles.resetAllText, { color: theme.textSecondary, fontFamily: theme.fontMono }]}>
              Reset all filters
            </Text>
          </Pressable>
        </ScrollView>
        <View style={[styles.sheetFooter, { borderTopColor: theme.borderSubtle }]}>
          <Pressable
            onPress={animateClose}
            style={({ pressed }) => [
              styles.showResultsBtn,
              { backgroundColor: theme.accentLight, opacity: pressed ? 0.85 : 1 },
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

function Accordion({ id, title, badge, collapsed, toggleAccordion, children }) {
  const { theme } = useTheme();
  const open = !collapsed.has(id);
  return (
    <View style={[styles.acc, { borderBottomColor: theme.borderSubtle }]}>
      <Pressable onPress={() => toggleAccordion(id)} style={styles.accHead}>
        <Text style={[styles.accTitle, { color: theme.textPrimary }]}>{title}</Text>
        {badge ? (
          <View
            style={[
              styles.accBadge,
              { backgroundColor: theme.accentSubtleBg, borderColor: theme.accentSubtleBorder },
            ]}>
            <Text style={[styles.accBadgeText, { color: theme.accentLight, fontFamily: theme.fontMono }]}>
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

function CheckRow({ on, label, theme, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.checkRow,
        { backgroundColor: pressed ? theme.bgHover : 'transparent' },
      ]}>
      <View
        style={[
          styles.checkbox,
          checkboxState(theme, on),
        ]}>
        {on ? <Check size={11} color={theme.bgDeep} /> : null}
      </View>
      <Text style={[styles.optLabel, { color: theme.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export function IncidentsDirectoryBody({ overlay }) {
  return <DirectoryScreen kind="incidents" overlay={overlay} />;
}

export function ZonesDirectoryBody({ overlay }) {
  return <DirectoryScreen kind="zones" overlay={overlay} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
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
  title: { fontSize: 17, fontWeight: '600', letterSpacing: -0.1 },
  subtitle: { fontSize: 10.5, marginTop: 1 },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetText: { fontSize: 10, letterSpacing: 0.4 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 13,
    marginHorizontal: 12,
    marginBottom: 9,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 11,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 10.5 },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 26,
    marginBottom: 4,
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
  resultsWrap: { flex: 1 },
  resultsHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultsCount: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.6 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sortText: { fontSize: 10 },
  sortBackdrop: { ...StyleSheet.absoluteFill, zIndex: 8 },
  sortMenu: {
    position: 'absolute',
    top: 38,
    right: 12,
    minWidth: 150,
    borderRadius: 10,
    borderWidth: 1,
    padding: 4,
    zIndex: 9,
    elevation: 9,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 7,
  },
  sortOptionText: { fontSize: 10.5 },
  listPad: { paddingBottom: 90 },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 44,
    paddingHorizontal: 20,
    fontSize: 12,
  },
  stateBox: { alignItems: 'center', paddingVertical: 44, gap: 12 },
  stateText: { fontSize: 12 },
  retryBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: { fontSize: 10.5, letterSpacing: 0.4 },
  card: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardAccent: { width: 3 },
  cardBody: { flex: 1, paddingVertical: 13, paddingRight: 16, paddingLeft: 13 },
  cardTitle: { fontSize: 14, fontWeight: '600', lineHeight: 19, marginBottom: 5 },
  cardTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  cardDot: { width: 6, height: 6, borderRadius: 3 },
  cardCat: { fontSize: 11, fontWeight: '600' },
  cardPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardPill: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  cardPillText: { fontSize: 8.5, fontWeight: '600', letterSpacing: 0.8 },
  cardDate: { fontSize: 9.5, marginLeft: 'auto' },
  cardLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 7,
  },
  cardLoc: { fontSize: 11, flexShrink: 1 },
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
  skelW54: { width: '54%' },
  sheetBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,.4)',
  },
  filterSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetHead: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  grabberRow: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 2,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  sheetFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  showResultsBtn: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  showResultsText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  drawerTitle: { fontSize: 14, fontWeight: '600' },
  drawerBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  drawerBadgeText: { fontSize: 9, fontWeight: '600' },
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
  accTitle: { flex: 1, fontSize: 12.5, fontWeight: '600' },
  accBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  accBadgeText: { fontSize: 9, fontWeight: '600' },
  accChevClosed: { transform: [{ rotate: '-90deg' }] },
  accBody: { paddingBottom: 10, paddingHorizontal: 15 },
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
  optRow: { flexDirection: 'row', gap: 7 },
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
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 7,
  },
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
