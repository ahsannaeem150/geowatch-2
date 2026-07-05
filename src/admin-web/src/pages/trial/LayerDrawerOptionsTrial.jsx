import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Check, X } from 'lucide-react';
import { useTheme } from '@shared/useTheme.js';
import { getDomainColor } from '@shared/utils/themeColors.js';
import { DOMAINS, ZONE_CATEGORIES } from './taxonomyData.js';
import { getLayerIcon } from './layerIcons.js';

const DRAWER_WIDTH = 360;
const DRAWER_HEIGHT = 520;

const ALL_ITEMS = [
  ...DOMAINS.map((d) => ({ ...d, type: 'domain' })),
  ...ZONE_CATEGORIES.map((z) => ({ ...z, type: 'zone' })),
];

function useToggleSet(initial) {
  const [set, update] = useState(new Set(initial));
  const toggle = (id) => {
    update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const setValue = (ids) => update(new Set(ids));
  return { set, toggle, setValue };
}

function DrawerChrome({ title, children, width = DRAWER_WIDTH }) {
  return (
    <div
      style={{
        width,
        height: DRAWER_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          height: '46px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          borderBottom: '1px solid var(--border-default)',
          background: 'var(--bg-surface)',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>25 items</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }} className="pw-filter-scroll">
        {children}
      </div>
    </div>
  );
}

function Option1IconGrid({ active, toggle }) {
  const { theme } = useTheme();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
      {ALL_ITEMS.map((item) => {
        const isActive = active.has(item.slug);
        const tint = getDomainColor(item, theme);
        const Icon = getLayerIcon(item.icon);
        return (
          <button
            key={item.slug}
            title={`${item.name} (${item.type})`}
            onClick={() => toggle(item.slug)}
            style={{
              aspectRatio: '1 / 1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
              background: tint,
              color: 'var(--text-on-accent)',
              border: 'none',
              cursor: 'pointer',
              opacity: isActive ? 1 : 0.35,
              boxShadow: isActive ? `0 0 0 2px var(--bg-input), 0 0 0 4px var(--accent-light)` : 'none',
              transition: 'all 0.15s ease',
              position: 'relative',
            }}
          >
            <Icon size={18} strokeWidth={2} />
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  top: '3px',
                  right: '3px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: 'var(--text-on-accent)',
                  color: tint,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={8} strokeWidth={4} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Option2ChipGrid({ active, toggle }) {
  const { theme } = useTheme();
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {ALL_ITEMS.map((item) => {
        const isActive = active.has(item.slug);
        const tint = getDomainColor(item, theme);
        const Icon = getLayerIcon(item.icon);
        return (
          <button
            key={item.slug}
            onClick={() => toggle(item.slug)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 9px',
              borderRadius: 'var(--radius-pill)',
              background: isActive ? 'var(--accent-subtle-bg)' : 'var(--bg-input)',
              border: `1px solid ${isActive ? 'var(--accent-light)' : 'var(--border-default)'}`,
              color: isActive ? 'var(--accent-light)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.15s ease',
            }}
          >
            <Icon size={12} color={tint} />
            <span style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Option3CompactRows({ active, toggle }) {
  const { theme } = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {ALL_ITEMS.map((item) => {
        const isActive = active.has(item.slug);
        const tint = getDomainColor(item, theme);
        const Icon = getLayerIcon(item.icon);
        return (
          <button
            key={item.slug}
            onClick={() => toggle(item.slug)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-input)',
              border: `1px solid ${isActive ? 'var(--accent-light)' : 'var(--border-default)'}`,
              cursor: 'pointer',
              textAlign: 'left',
              boxShadow: 'var(--shadow-sm)',
              opacity: isActive ? 1 : 0.75,
              transition: 'all 0.15s ease',
            }}
          >
            <span
              style={{
                width: '16px',
                height: '16px',
                borderRadius: 'var(--radius-sm)',
                background: tint,
                color: 'var(--text-on-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={10} strokeWidth={2} />
            </span>
            <span style={{ flex: 1, fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.name}
            </span>
            <span style={{ color: isActive ? 'var(--accent-light)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              {isActive ? <Eye size={14} /> : <EyeOff size={14} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Option4WideGrid({ active, toggle }) {
  const { theme } = useTheme();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
      {ALL_ITEMS.map((item) => {
        const isActive = active.has(item.slug);
        const tint = getDomainColor(item, theme);
        const Icon = getLayerIcon(item.icon);
        return (
          <button
            key={item.slug}
            onClick={() => toggle(item.slug)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 6px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              border: `1px solid ${isActive ? 'var(--accent-light)' : 'var(--border-default)'}`,
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
              textAlign: 'center',
              opacity: isActive ? 1 : 0.7,
              transition: 'all 0.15s ease',
            }}
          >
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                background: tint,
                color: 'var(--text-on-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isActive ? `0 0 8px ${tint}50` : 'none',
              }}
            >
              <Icon size={16} strokeWidth={2} />
            </span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{item.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function Option5ActivePicker({ active, toggle }) {
  const { theme } = useTheme();
  const activeItems = useMemo(() => ALL_ITEMS.filter((i) => active.has(i.slug)), [active]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          minHeight: '38px',
          padding: '8px',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          alignItems: 'center',
        }}
      >
        {activeItems.length === 0 && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No layers active</span>}
        {activeItems.map((item) => {
          const tint = getDomainColor(item, theme);
          const Icon = getLayerIcon(item.icon);
          return (
            <span
              key={item.slug}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 7px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--accent-subtle-bg)',
                color: 'var(--accent-light)',
                fontSize: '10px',
                fontWeight: 700,
              }}
            >
              <Icon size={10} color={tint} />
              {item.name}
              <button
                onClick={() => toggle(item.slug)}
                style={{ display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
              >
                <X size={10} />
              </button>
            </span>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
        {ALL_ITEMS.map((item) => {
          const isActive = active.has(item.slug);
          const tint = getDomainColor(item, theme);
          const Icon = getLayerIcon(item.icon);
          return (
            <button
              key={item.slug}
              title={item.name}
              onClick={() => toggle(item.slug)}
              style={{
                aspectRatio: '1 / 1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-md)',
                background: isActive ? tint : 'var(--bg-input)',
                color: isActive ? 'var(--text-on-accent)' : 'var(--text-muted)',
                border: `1px solid ${isActive ? tint : 'var(--border-default)'}`,
                cursor: 'pointer',
                opacity: isActive ? 1 : 0.6,
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={18} strokeWidth={2} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function LayerDrawerOptionsTrial() {
  const navigate = useNavigate();
  const option1 = useToggleSet(ALL_ITEMS.slice(0, 6).map((i) => i.slug));
  const option2 = useToggleSet(ALL_ITEMS.slice(0, 6).map((i) => i.slug));
  const option3 = useToggleSet(ALL_ITEMS.slice(0, 6).map((i) => i.slug));
  const option4 = useToggleSet(ALL_ITEMS.slice(0, 6).map((i) => i.slug));
  const option5 = useToggleSet(ALL_ITEMS.slice(0, 6).map((i) => i.slug));

  const previews = [
    { id: '1', title: '1. Icon-only grid', Component: Option1IconGrid, state: option1, width: DRAWER_WIDTH },
    { id: '2', title: '2. Compact labeled chips', Component: Option2ChipGrid, state: option2, width: DRAWER_WIDTH },
    { id: '3', title: '3. Compact horizontal rows', Component: Option3CompactRows, state: option3, width: DRAWER_WIDTH },
    { id: '4', title: '4. Wider 3-column grid', Component: Option4WideGrid, state: option4, width: 480 },
    { id: '5', title: '5. Active bar + picker', Component: Option5ActivePicker, state: option5, width: DRAWER_WIDTH },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-primary)', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/trial/map-workspace-a')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Layer drawer layout options</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            All 17 incident domains + 8 zone categories. Each drawer is fixed at 520px tall so you can see scroll behavior.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
        {previews.map(({ id, title, Component, state, width }) => (
          <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>{title}</span>
            <DrawerChrome title="Map Layers" width={width}>
              <Component active={state.set} toggle={state.toggle} />
            </DrawerChrome>
          </div>
        ))}
      </div>
    </div>
  );
}
