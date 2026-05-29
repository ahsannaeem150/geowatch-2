import React, { useState, useMemo } from 'react';
import {
  Shield, Bomb, Crosshair, Flame, Swords, Waves, Factory, HeartPulse, Users, Landmark,
  Wifi, Anchor, TrendingDown, Leaf, Radiation, Plane, Eye, AlertTriangle, Skull, Zap,
  Target, Flag, MapPin, Mountain, Tornado, CloudLightning, Bug, Brain, Train, Car,
  Ship, Rocket, Satellite, Radio, Lock, Globe, Scale, Gavel, Handshake,
  Droplets, FileWarning, Fingerprint, Fuel, Gauge, HardHat, Home, Hospital,
  Key, Layers, Lightbulb, Magnet, Megaphone, Network, Package, Palette,
  Phone, Plug, Power, Puzzle, Search, Settings, Share2, Signal, Smartphone,
  Snowflake, Sparkles, Star, Stethoscope, Store, Sun, Sunset, Sword, Syringe, Tag,
  Terminal, Thermometer, Ticket, Timer, Hammer, TreeDeciduous, Trophy, Truck, Tv,
  Umbrella, Upload, Video, Wallet, Wand2, Watch, Webhook, Wind, Wrench,
} from 'lucide-react';

const ICONS = [
  { name: 'shield', icon: Shield, label: 'Shield' },
  { name: 'bomb', icon: Bomb, label: 'Bomb' },
  { name: 'crosshair', icon: Crosshair, label: 'Crosshair' },
  { name: 'flame', icon: Flame, label: 'Flame' },
  { name: 'swords', icon: Swords, label: 'Swords' },
  { name: 'waves', icon: Waves, label: 'Waves' },
  { name: 'factory', icon: Factory, label: 'Factory' },
  { name: 'heart-pulse', icon: HeartPulse, label: 'Heart Pulse' },
  { name: 'users', icon: Users, label: 'Users' },
  { name: 'landmark', icon: Landmark, label: 'Landmark' },
  { name: 'wifi', icon: Wifi, label: 'WiFi' },
  { name: 'anchor', icon: Anchor, label: 'Anchor' },
  { name: 'leaf', icon: Leaf, label: 'Leaf' },
  { name: 'radiation', icon: Radiation, label: 'Radiation' },
  { name: 'plane', icon: Plane, label: 'Plane' },
  { name: 'eye', icon: Eye, label: 'Eye' },
  { name: 'alert-triangle', icon: AlertTriangle, label: 'Alert' },
  { name: 'skull', icon: Skull, label: 'Skull' },
  { name: 'zap', icon: Zap, label: 'Zap' },
  { name: 'target', icon: Target, label: 'Target' },
  { name: 'flag', icon: Flag, label: 'Flag' },
  { name: 'map-pin', icon: MapPin, label: 'Map Pin' },
  { name: 'mountain', icon: Mountain, label: 'Mountain' },
  { name: 'tornado', icon: Tornado, label: 'Tornado' },
  { name: 'cloud-lightning', icon: CloudLightning, label: 'Lightning' },
  { name: 'bug', icon: Bug, label: 'Bug' },
  { name: 'brain', icon: Brain, label: 'Brain' },
  { name: 'train', icon: Train, label: 'Train' },
  { name: 'car', icon: Car, label: 'Car' },
  { name: 'ship', icon: Ship, label: 'Ship' },
  { name: 'rocket', icon: Rocket, label: 'Rocket' },
  { name: 'satellite', icon: Satellite, label: 'Satellite' },
  { name: 'radio', icon: Radio, label: 'Radio' },
  { name: 'lock', icon: Lock, label: 'Lock' },
  { name: 'globe', icon: Globe, label: 'Globe' },
  { name: 'scale', icon: Scale, label: 'Scale' },
  { name: 'gavel', icon: Gavel, label: 'Gavel' },
  { name: 'handshake', icon: Handshake, label: 'Handshake' },
  { name: 'droplets', icon: Droplets, label: 'Droplets' },
  { name: 'fuel', icon: Fuel, label: 'Fuel' },
  { name: 'gauge', icon: Gauge, label: 'Gauge' },
  { name: 'hard-hat', icon: HardHat, label: 'Hard Hat' },
  { name: 'home', icon: Home, label: 'Home' },
  { name: 'hospital', icon: Hospital, label: 'Hospital' },
  { name: 'key', icon: Key, label: 'Key' },
  { name: 'layers', icon: Layers, label: 'Layers' },
  { name: 'lightbulb', icon: Lightbulb, label: 'Lightbulb' },
  { name: 'magnet', icon: Magnet, label: 'Magnet' },
  { name: 'megaphone', icon: Megaphone, label: 'Megaphone' },
  { name: 'mountain', icon: Mountain, label: 'Mountain' },
  { name: 'network', icon: Network, label: 'Network' },
  { name: 'package', icon: Package, label: 'Package' },
  { name: 'palette', icon: Palette, label: 'Palette' },
  { name: 'phone', icon: Phone, label: 'Phone' },
  { name: 'plug', icon: Plug, label: 'Plug' },
  { name: 'power', icon: Power, label: 'Power' },
  { name: 'puzzle', icon: Puzzle, label: 'Puzzle' },
  { name: 'search', icon: Search, label: 'Search' },
  { name: 'settings', icon: Settings, label: 'Settings' },
  { name: 'signal', icon: Signal, label: 'Signal' },
  { name: 'smartphone', icon: Smartphone, label: 'Smartphone' },
  { name: 'snowflake', icon: Snowflake, label: 'Snowflake' },
  { name: 'sparkles', icon: Sparkles, label: 'Sparkles' },
  { name: 'star', icon: Star, label: 'Star' },
  { name: 'stethoscope', icon: Stethoscope, label: 'Stethoscope' },
  { name: 'store', icon: Store, label: 'Store' },
  { name: 'sun', icon: Sun, label: 'Sun' },
  { name: 'sunset', icon: Sunset, label: 'Sunset' },
  { name: 'sword', icon: Sword, label: 'Sword' },
  { name: 'syringe', icon: Syringe, label: 'Syringe' },
  { name: 'tag', icon: Tag, label: 'Tag' },
  { name: 'terminal', icon: Terminal, label: 'Terminal' },
  { name: 'thermometer', icon: Thermometer, label: 'Thermometer' },
  { name: 'ticket', icon: Ticket, label: 'Ticket' },
  { name: 'timer', icon: Timer, label: 'Timer' },
  { name: 'hammer', icon: Hammer, label: 'Hammer' },
  { name: 'tree-deciduous', icon: TreeDeciduous, label: 'Tree' },
  { name: 'trophy', icon: Trophy, label: 'Trophy' },
  { name: 'truck', icon: Truck, label: 'Truck' },
  { name: 'tv', icon: Tv, label: 'TV' },
  { name: 'umbrella', icon: Umbrella, label: 'Umbrella' },
  { name: 'upload', icon: Upload, label: 'Upload' },
  { name: 'video', icon: Video, label: 'Video' },
  { name: 'wallet', icon: Wallet, label: 'Wallet' },
  { name: 'wand-2', icon: Wand2, label: 'Wand' },
  { name: 'watch', icon: Watch, label: 'Watch' },
  { name: 'webhook', icon: Webhook, label: 'Webhook' },
  { name: 'wind', icon: Wind, label: 'Wind' },
  { name: 'wrench', icon: Wrench, label: 'Wrench' },
];

const ICON_MAP = Object.fromEntries(ICONS.map((i) => [i.name, i.icon]));

export function getIconComponent(name) {
  return ICON_MAP[name] || null;
}

export default function IconPicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return ICONS;
    const q = query.toLowerCase();
    return ICONS.filter(
      (i) => i.name.includes(q) || i.label.toLowerCase().includes(q)
    );
  }, [query]);

  const selectedIcon = ICON_MAP[value];

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: 'var(--bg-base)',
          border: '1px solid var(--border-default)',
          borderRadius: 8,
          color: 'var(--text-primary)',
          fontSize: 14,
          fontFamily: 'var(--font-sans)',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
        }}
      >
        {selectedIcon ? (
          <selectedIcon size={18} style={{ color: 'var(--navy-400)' }} />
        ) : (
          <div style={{ width: 18, height: 18, borderRadius: 4, background: 'var(--border-default)' }} />
        )}
        <span style={{ flex: 1 }}>{value || 'Select an icon…'}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>▼</span>
      </button>

      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 50 }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 60,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 10,
              boxShadow: 'var(--shadow-lg)',
              padding: 12,
              maxHeight: 320,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <input
              type="text"
              placeholder="Search icons…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 6,
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
                outline: 'none',
              }}
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 6,
                overflowY: 'auto',
                maxHeight: 220,
              }}
            >
              {filtered.map((item) => {
                const Icon = item.icon;
                const isActive = value === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    title={item.label}
                    onClick={() => {
                      onChange(item.name);
                      setIsOpen(false);
                      setQuery('');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 8,
                      borderRadius: 6,
                      border: isActive ? '1px solid var(--navy-500)' : '1px solid transparent',
                      background: isActive ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                      cursor: 'pointer',
                      color: isActive ? 'var(--navy-400)' : 'var(--text-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Icon size={18} />
                  </button>
                );
              })}
            </div>
            {filtered.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>
                No icons found
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
