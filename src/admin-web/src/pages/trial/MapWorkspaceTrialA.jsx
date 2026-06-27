import React, { useState } from 'react';
import {
  Layers,
  List,
  Activity,
  Bookmark,
  Settings,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  AlertCircle,
} from 'lucide-react';
import MapHudBar from '../../components/MapWorkspaceTrial/MapHudBar.jsx';
import MapCanvas from '../../components/MapWorkspaceTrial/MapCanvas.jsx';
import BottomAmbientBar from '../../components/MapWorkspaceTrial/BottomAmbientBar.jsx';


const railItems = [
  { id: 'layers', icon: Layers, label: 'Layers' },
  { id: 'list', icon: List, label: 'Incidents' },
  { id: 'activity', icon: Activity, label: 'Activity' },
  { id: 'saved', icon: Bookmark, label: 'Saved' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

const dummyIncidents = [
  { id: 1, title: 'Air strike reported near Kabul', category: 'Conflict', severity: 4, time: '12m ago' },
  { id: 2, title: 'Fuel shortage in Eastern Province', category: 'Infrastructure', severity: 3, time: '32m ago' },
  { id: 3, title: 'Civil unrest in Damascus', category: 'Civil Unrest', severity: 2, time: '1h ago' },
  { id: 4, title: 'Maritime alert: Red Sea corridor', category: 'Maritime', severity: 5, time: '1h 12m ago' },
  { id: 5, title: 'Cyber attack on government portal', category: 'Cyber', severity: 3, time: '2h ago' },
  { id: 6, title: 'Border closure announced', category: 'Political', severity: 2, time: '3h ago' },
];

const dummyLayers = [
  { id: 'conflict', name: 'Conflict', color: '#ef4444', active: true },
  { id: 'civil', name: 'Civil Unrest', color: '#f97316', active: true },
  { id: 'infra', name: 'Infrastructure', color: '#eab308', active: false },
  { id: 'maritime', name: 'Maritime', color: '#3b82f6', active: true },
  { id: 'cyber', name: 'Cyber', color: '#a855f7', active: false },
  { id: 'zones', name: 'Zones', color: '#22c55e', active: true },
];

export default function MapWorkspaceTrialA() {
  const [activeDrawer, setActiveDrawer] = useState('list');
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [layers, setLayers] = useState(dummyLayers);

  const toggleLayer = (id) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, active: !l.active } : l))
    );
  };

  const toggleDrawer = (id) => {
    setActiveDrawer((prev) => (prev === id ? null : id));
  };

  const renderDrawerContent = () => {
    switch (activeDrawer) {
      case 'list':
        return (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'var(--text-muted)',
                marginBottom: '12px',
              }}
            >
              Incidents List
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {dummyIncidents.map((incident) => (
                <div
                  key={incident.id}
                  onClick={() => setRightPanelOpen(true)}
                  style={{
                    padding: '12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-light)';
                    e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.background = 'var(--bg-input)';
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {incident.title}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '8px',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>{incident.category}</span>
                    <span>SEV {incident.severity}</span>
                    <span>{incident.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'layers':
        return (
          <div style={{ padding: '16px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'var(--text-muted)',
                marginBottom: '12px',
              }}
            >
              Map Layers
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {layers.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => toggleLayer(layer.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: layer.active ? 'var(--bg-input)' : 'transparent',
                    border: `1px solid ${layer.active ? 'var(--accent-light)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-sm)',
                    color: layer.active ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: layer.color,
                      opacity: layer.active ? 1 : 0.3,
                    }}
                  />
                  <span style={{ flex: 1, fontSize: '13px' }}>{layer.name}</span>
                  {layer.active && (
                    <span style={{ fontSize: '11px', color: 'var(--accent-light)' }}>On</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      case 'activity':
        return (
          <div style={{ padding: '16px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'var(--text-muted)',
                marginBottom: '12px',
              }}
            >
              Live Activity
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
              <Activity size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div>Live feed appears here</div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <MapHudBar
        layoutLabel="Layout A · Rail + Drawer"
        onToggleFocusMode={() => setFocusMode((p) => !p)}
        isFocusMode={focusMode}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Left icon rail */}
        {!focusMode && (
          <div
            style={{
              width: '64px',
              background: 'var(--bg-surface)',
              borderRight: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '12px 0',
              gap: '8px',
              zIndex: 50,
            }}
          >
            {railItems.map((item) => {
              const Icon = item.icon;
              const active = activeDrawer === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => toggleDrawer(item.id)}
                  title={item.label}
                  style={{
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: active ? 'var(--accent-subtle-bg)' : 'transparent',
                    color: active ? 'var(--accent-light)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }
                  }}
                >
                  <Icon size={20} />
                </button>
              );
            })}
          </div>
        )}

        {/* Drawer panel overlay */}
        {!focusMode && activeDrawer && (
          <div
            style={{
              position: 'absolute',
              left: '64px',
              top: 0,
              bottom: 0,
              width: '280px',
              background: 'var(--bg-surface)',
              borderRight: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 40,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                height: '48px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 12px',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {railItems.find((i) => i.id === activeDrawer)?.label}
              </span>
              <button
                onClick={() => setActiveDrawer(null)}
                style={{
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <ChevronLeft size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>{renderDrawerContent()}</div>
          </div>
        )}

        {/* Map canvas */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <MapCanvas label="Layout A: Rail + Drawer" hint="Left rail opens drawers over the map" />

          {/* Floating right panel toggle */}
          {!focusMode && (
            <button
              onClick={() => setRightPanelOpen((p) => !p)}
              style={{
                position: 'absolute',
                top: '12px',
                right: rightPanelOpen ? '642px' : '12px',
                zIndex: 30,
                padding: '8px 12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'right 0.25s ease',
              }}
            >
              {rightPanelOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              {rightPanelOpen ? 'Hide Detail' : 'Show Detail'}
            </button>
          )}
        </div>

        {/* Right detail panel */}
        {!focusMode && rightPanelOpen && (
          <div
            style={{
              width: '630px',
              flexShrink: 0,
              background: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 50,
            }}
          >
            <div
              style={{
                height: '48px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Detail / Form Panel
              </span>
              <button
                onClick={() => setRightPanelOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div style={{ flex: 1, padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <AlertCircle size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <div>Right panel placeholder</div>
                <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
                  This is where incident detail or creation forms will appear.
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ height: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', width: '70%' }} />
                <div style={{ height: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', width: '90%' }} />
                <div style={{ height: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', width: '60%' }} />
                <div style={{ height: '120px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginTop: '12px' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomAmbientBar />
    </div>
  );
}
