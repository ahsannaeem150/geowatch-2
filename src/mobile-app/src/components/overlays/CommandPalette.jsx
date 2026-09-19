import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Search } from 'lucide-react-native';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import { useMap } from '../../context/MapContext';
import { useSelection } from '../../context/SelectionContext';
import {
  searchIncidents,
  searchZones,
} from '../../services/incidents.service';
import { api } from '../../services/api';
import { locationLine, severityOf } from '../selection/PreviewCard';

// Command palette topPanel (prototype #cmd-panel; openCmdPalette/
// closeCmdPalette/setCmdTab/renderCmdResults). Drops from the top over the
// map; hardware back closes it via the overlay stack (prototype ESC key).
//
// Data: incidents/zones via /incidents/search (all-time bounds so the
// palette is not scoped to the map's current date range), locations via
// /geocode/search (backend zod schema enforces min 2 chars — don't fire
// below that). Empty query lists everything, mirroring the prototype's
// substring filter over the full dummy set.

const ALL_TIME = { dateFrom: '1970-01-01', dateTo: '2099-12-31' };

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'zones', label: 'Zones' },
  { key: 'locations', label: 'Locations' },
];

function tabState(theme, on) {
  return {
    backgroundColor: on ? theme.accentSubtleBg : 'transparent',
    borderColor: on ? theme.accentLight : theme.borderSubtle,
  };
}

function ago(item) {
  const d = item.start_date ? parseISO(item.start_date) : null;
  return d && isValid(d) ? `${formatDistanceToNow(d)} ago` : '';
}

function areaLabel(item) {
  const m2 = parseFloat(item.area_sq_m);
  return Number.isFinite(m2) ? `${(m2 / 1e6).toFixed(1)} km²` : '';
}

function pointCenter(item) {
  const lat = parseFloat(item.latitude);
  const lon = parseFloat(item.longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) ? [lon, lat] : null;
}

// Zones carry no lat/lon columns — average the GeoJSON ring for a centroid.
function zoneCenter(item) {
  const ring = item?.geometry?.coordinates?.[0];
  if (!Array.isArray(ring) || !ring.length) return null;
  let sx = 0;
  let sy = 0;
  ring.forEach((pair) => {
    sx += Number(pair[0]);
    sy += Number(pair[1]);
  });
  const lon = sx / ring.length;
  const lat = sy / ring.length;
  return Number.isFinite(lat) && Number.isFinite(lon) ? [lon, lat] : null;
}

export function CommandPaletteBody({ overlay }) {
  const { theme } = useTheme();
  const { closeOverlay, openOverlay } = useOverlay();
  const { flyTo } = useMap();
  const { selectFromMap } = useSelection();

  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [tab, setTab] = useState('all');
  const [inc, setInc] = useState({ rows: [], count: 0 });
  const [zon, setZon] = useState({ rows: [], count: 0 });
  const [loc, setLoc] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fetchSeq = useRef(0);

  // 300ms debounce (prototype oninput → renderCmdResults).
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const seq = ++fetchSeq.current;
    const wantInc = tab === 'all' || tab === 'incidents';
    const wantZone = tab === 'all' || tab === 'zones';
    const wantLoc = tab === 'all' || tab === 'locations';
    const lim = tab === 'all' ? 4 : 10;
    const query = qDebounced ? { q: qDebounced } : {};
    setLoading(true);
    setError(false);
    Promise.all([
      wantInc
        ? searchIncidents({ ...ALL_TIME, limit: lim, ...query })
        : Promise.resolve(null),
      wantZone
        ? searchZones({ ...ALL_TIME, limit: lim, ...query })
        : Promise.resolve(null),
      // Geocode enforces min 2 chars server-side.
      wantLoc && qDebounced.length >= 2
        ? api.get('/geocode/search', { params: { q: qDebounced } })
        : Promise.resolve(null),
    ])
      .then(([incRes, zoneRes, locRes]) => {
        if (seq !== fetchSeq.current) return;
        setInc({
          rows: incRes?.incidents || [],
          count: incRes?.count ?? 0,
        });
        setZon({
          rows: zoneRes?.incidents || [],
          count: zoneRes?.count ?? 0,
        });
        setLoc(Array.isArray(locRes) ? locRes.slice(0, lim) : []);
      })
      .catch(() => {
        if (seq !== fetchSeq.current) return;
        setInc({ rows: [], count: 0 });
        setZon({ rows: [], count: 0 });
        setLoc([]);
        setError(true);
      })
      .finally(() => {
        if (seq === fetchSeq.current) setLoading(false);
      });
  }, [qDebounced, tab]);

  const close = () => {
    Keyboard.dismiss();
    closeOverlay(overlay.id);
  };

  const openItem = (kind, item) => {
    Keyboard.dismiss();
    // selectFromMap closes all overlays itself and runs the marker-tap
    // selection flow; item is passed as fallback data because palette
    // results come from all-time search, not the map's fetched range.
    selectFromMap(item.id, kind, item);
    const center = kind === 'zone' ? zoneCenter(item) : pointCenter(item);
    if (center) flyTo(center, 8);
  };

  const openLocation = (item) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    close();
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      flyTo([lon, lat], 8);
    }
  };

  const openPowerSearch = () => {
    close();
    openOverlay({
      id: 'powerSearch',
      type: 'fullscreen',
      props: q ? { initialQ: q } : undefined,
    });
  };

  const showSecLabels = tab === 'all';
  const empty =
    !loading && !error && !inc.rows.length && !zon.rows.length && !loc.length;

  return (
    // No flex:1 here — the topPanel's height is content-driven, and a
    // flex-grown root gets clamped to the container's minHeight instead
    // of growing it (content then overflows and clips).
    <View style={styles.root}>
      {/* input row */}
      <View
        style={[
          styles.inputRow,
          { backgroundColor: theme.bgInput, borderColor: theme.borderSubtle },
        ]}>
        <Search size={16} color={theme.textMuted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search incidents, zones, locations…"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          returnKeyType="search"
          style={[
            styles.input,
            { color: theme.textPrimary, fontFamily: theme.fontHead },
          ]}
        />
        <Pressable
          onPress={close}
          hitSlop={6}
          style={[
            styles.escChip,
            { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
          ]}>
          <Text
            style={[
              styles.escText,
              { color: theme.textMuted, fontFamily: theme.fontMono },
            ]}>
            ESC
          </Text>
        </Pressable>
      </View>

      {/* tabs */}
      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tab, tabState(theme, on)]}>
              <Text
                style={[
                  styles.tabText,
                  { fontFamily: theme.fontMono },
                  { color: on ? theme.accentLight : theme.textSecondary },
                ]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* results — capped so the panel never grows past the screen */}
      <ScrollView
        style={styles.results}
        contentContainerStyle={styles.resultsPad}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled">
        {loading ? (
          <Text
            style={[
              styles.hintText,
              { color: theme.textMuted, fontFamily: theme.fontMono },
            ]}>
            Searching…
          </Text>
        ) : error ? (
          <Text
            style={[
              styles.hintText,
              { color: theme.textMuted, fontFamily: theme.fontMono },
            ]}>
            Search unavailable — check the backend
          </Text>
        ) : empty ? (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              No results for “{q || '…'}”
            </Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Try a different term or use Power Search.
            </Text>
          </View>
        ) : (
          <>
            {inc.rows.length ? (
              <>
                {showSecLabels ? (
                  <SecLabel label={`Incidents (${inc.count})`} />
                ) : null}
                {inc.rows.map((item) => (
                  <CmdRow
                    key={item.id}
                    dotColor={theme[`sev${severityOf(item)}`]}
                    title={item.title}
                    sub={[locationLine(item), ago(item)]
                      .filter(Boolean)
                      .join(' · ')}
                    kind="Incident"
                    onPress={() => openItem('incident', item)}
                  />
                ))}
              </>
            ) : null}
            {zon.rows.length ? (
              <>
                {showSecLabels ? (
                  <SecLabel label={`Zones (${zon.count})`} />
                ) : null}
                {zon.rows.map((item) => (
                  <CmdRow
                    key={item.id}
                    dotColor={item.zone_category_color || theme.accentLight}
                    square
                    title={item.title}
                    sub={[locationLine(item), areaLabel(item)]
                      .filter(Boolean)
                      .join(' · ')}
                    kind="Zone"
                    onPress={() => openItem('zone', item)}
                  />
                ))}
              </>
            ) : null}
            {loc.length ? (
              <>
                {showSecLabels ? (
                  <SecLabel label={`Locations (${loc.length})`} />
                ) : null}
                {loc.map((item, i) => (
                  <CmdRow
                    key={`${item.lat}-${item.lon}-${i}`}
                    dotColor={theme.textMuted}
                    teardrop
                    title={item.name || item.display_name?.split(',')[0] || 'Location'}
                    sub={
                      [item.addresstype, item.type]
                        .filter(Boolean)
                        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                        .join(' · ') || item.display_name || ''
                    }
                    kind="Location"
                    onPress={() => openLocation(item)}
                  />
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* footer */}
      <View
        style={[styles.footer, { borderTopColor: theme.borderSubtle }]}>
        <View style={styles.navHint}>
          <Text
            style={[
              styles.navHintText,
              { color: theme.textMuted, fontFamily: theme.fontMono },
            ]}>
            ↑↓ Navigate
          </Text>
          <Text
            style={[
              styles.navHintText,
              { color: theme.textMuted, fontFamily: theme.fontMono },
            ]}>
            ↵ Select
          </Text>
        </View>
        <Pressable onPress={openPowerSearch} hitSlop={6}>
          <Text
            style={[
              styles.powerLink,
              { color: theme.accentLight, fontFamily: theme.fontMono },
            ]}>
            Open Power Search →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function SecLabel({ label }) {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        styles.secLabel,
        { color: theme.textMuted, fontFamily: theme.fontMono },
      ]}>
      {label}
    </Text>
  );
}

function CmdRow({ dotColor, square, teardrop, title, sub, kind, onPress }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.bgHover : 'transparent' },
      ]}>
      <View
        style={[
          styles.dot,
          { backgroundColor: dotColor },
          square && styles.dotSquare,
          teardrop && styles.dotTeardrop,
        ]}
      />
      <View style={styles.rowBody}>
        <Text
          numberOfLines={1}
          style={[
            styles.rowTitle,
            { color: theme.textPrimary, fontFamily: theme.fontHead },
          ]}>
          {title}
        </Text>
        {sub ? (
          <Text
            numberOfLines={1}
            style={[styles.rowSub, { color: theme.textSecondary }]}>
            {sub}
          </Text>
        ) : null}
      </View>
      <Text
        style={[
          styles.rowKind,
          { color: theme.textMuted, fontFamily: theme.fontMono },
        ]}>
        {kind}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 14, paddingBottom: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  input: { flex: 1, fontSize: 13.5, padding: 0 },
  escChip: {
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  escText: { fontSize: 8.5, fontWeight: '600', letterSpacing: 0.6 },
  tabRow: { flexDirection: 'row', gap: 7, marginTop: 10, marginBottom: 2 },
  tab: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  tabText: { fontSize: 10, letterSpacing: 0.4 },
  results: { maxHeight: 300 },
  resultsPad: { paddingBottom: 6 },
  hintText: {
    textAlign: 'center',
    fontSize: 10.5,
    paddingVertical: 28,
  },
  emptyBox: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  emptyText: { fontSize: 12 },
  secLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotSquare: { borderRadius: 2 },
  dotTeardrop: {
    borderRadius: 4,
    borderBottomRightRadius: 0,
    transform: [{ rotate: '45deg' }],
  },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 13, fontWeight: '600' },
  rowSub: { fontSize: 10.5, marginTop: 1 },
  rowKind: { fontSize: 8.5, letterSpacing: 0.6, textTransform: 'uppercase' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 2,
  },
  navHint: { flexDirection: 'row', gap: 12 },
  navHintText: { fontSize: 9 },
  powerLink: { fontSize: 10, letterSpacing: 0.4 },
});

export default CommandPaletteBody;
